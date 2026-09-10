"""Historical crash stress tester.

Implements a holding-level stress test engine that:
- Computes a benchmark return over the historical scenario window
- Applies asset-class-aware return proxies to each holding
- Reports UNAVAILABLE / ESTIMATED confidence per holding
- Never fabricates numbers silently
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
import logging
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.holding import AssetType, Holding
from app.models.market_data import BenchmarkPrice, FundScheme, FundNAVHistory
from app.services.amfi.provider import CanonicalSchemeResolver
from app.services.market_data.seed_data import seed_market_baseline

logger = logging.getLogger(__name__)


# ============================================================
# Scenario definitions (historical)
# ============================================================

@dataclass(frozen=True)
class Scenario:
    id: str
    name: str
    description: str
    start_date: date
    end_date: date
    benchmark_id: str
    methodology: str
    data_source: str


SCENARIOS: dict[str, Scenario] = {
    "CRISIS_2008": Scenario(
        id="CRISIS_2008",
        name="2008 Global Financial Crisis",
        description=(
            "Major drawdown following the 2008 global credit crisis. "
            "Indian benchmarks lost roughly half their value from Oct 2007 to Mar 2009."
        ),
        start_date=date(2007, 10, 1),
        end_date=date(2009, 3, 9),
        benchmark_id="NIFTY_50",
        methodology=(
            "Holding-level stress computed from the NIFTY 50 benchmark return over "
            "the scenario window, scaled per asset class. Stocks use a 1.15x beta "
            "proxy; mutual funds use a category-relative proxy; cash/debt is 0%."
        ),
        data_source="Seeded NIFTY 50 daily prices (deterministic baseline)",
    ),
    "COVID_2020": Scenario(
        id="COVID_2020",
        name="2020 COVID Crash",
        description=(
            "Rapid global market drawdown triggered by the COVID-19 pandemic. "
            "Indian benchmarks fell ~38% between Jan-Mar 2020."
        ),
        start_date=date(2020, 1, 15),
        end_date=date(2020, 3, 23),
        benchmark_id="NIFTY_50",
        methodology=(
            "Holding-level stress computed from the NIFTY 50 benchmark return over "
            "the scenario window, scaled per asset class. Stocks use a 1.10x beta "
            "proxy; mutual funds use a category-relative proxy; cash/debt is 0%."
        ),
        data_source="Seeded NIFTY 50 daily prices (deterministic baseline)",
    ),
    "BEAR_2022": Scenario(
        id="BEAR_2022",
        name="2022 Bear Market",
        description=(
            "Inflation/rate-hike driven drawdown. Indian benchmarks fell roughly 16% "
            "from Oct 2021 to Jun 2022."
        ),
        start_date=date(2021, 10, 18),
        end_date=date(2022, 6, 17),
        benchmark_id="NIFTY_50",
        methodology=(
            "Holding-level stress computed from the NIFTY 50 benchmark return over "
            "the scenario window, scaled per asset class. Stocks use a 1.05x beta "
            "proxy; mutual funds use a category-relative proxy; cash/debt is 0%."
        ),
        data_source="Seeded NIFTY 50 daily prices (deterministic baseline)",
    ),
}


# ============================================================
# Asset-class impact proxies
# ============================================================

# Per-scenario stock beta proxy (since we don't have per-stock history)
STOCK_BETA: dict[str, float] = {
    "CRISIS_2008": 1.15,
    "COVID_2020": 1.10,
    "BEAR_2022": 1.05,
}


def _category_multiplier(scheme_category: str | None) -> float:
    """Maps scheme category to a relative volatility multiplier.

    These are documented proxies (NOT actual historical fund returns).
    """
    if not scheme_category:
        return 1.0
    cat = scheme_category.lower()
    if "small" in cat:
        return 1.25
    if "mid" in cat:
        return 1.15
    if "flexi" in cat or "multi" in cat or "balanced" in cat or "hybrid" in cat:
        return 0.95
    if "large" in cat or "bluechip" in cat or "index" in cat:
        return 1.00
    if "debt" in cat or "bond" in cat or "liquid" in cat or "gilt" in cat:
        return 0.10
    return 1.0


# ============================================================
# NAV-based mutual fund impact (when NAV history exists)
# ============================================================

def _mf_impact_from_nav(
    db: Session,
    holding: Holding,
    scheme: FundScheme | None,
    scenario: Scenario,
) -> tuple[float | None, str]:
    """Try to compute a scenario return from actual NAV history.

    Returns (return_fraction, confidence) where confidence is one of:
    - "ACTUAL_NAV"  : we have NAV history covering the scenario window
    - "ESTIMATED"   : we used a category proxy
    - "UNAVAILABLE" : no usable data
    """
    if scheme is None:
        return None, "UNAVAILABLE"

    history = (
        db.query(FundNAVHistory)
        .filter(FundNAVHistory.scheme_id == scheme.id)
        .order_by(FundNAVHistory.nav_date.asc())
        .all()
    )
    if not history:
        return None, "UNAVAILABLE"

    # Find NAVs that bracket the scenario window.
    points_in_window = [
        (p.nav_date, Decimal(p.nav)) for p in history
        if scenario.start_date <= p.nav_date <= scenario.end_date
    ]
    if len(points_in_window) >= 2:
        start_nav = points_in_window[0][1]
        end_nav = points_in_window[-1][1]
        if start_nav > 0:
            return float((end_nav - start_nav) / start_nav), "ACTUAL_NAV"

    # No NAV in the historical window — fall back to category proxy.
    return None, "ESTIMATED"


# ============================================================
# Main entry point
# ============================================================

@dataclass
class HoldingImpact:
    holding_id: str
    name: str
    asset_type: str
    current_value: float
    scenario_return: float  # negative means loss
    scenario_value: float
    impact: float  # negative means loss
    confidence: str  # ACTUAL_NAV / ESTIMATED / UNAVAILABLE
    methodology: str


def _benchmark_return(db: Session, scenario: Scenario) -> tuple[float | None, str]:
    start = (
        db.query(BenchmarkPrice)
        .filter(
            BenchmarkPrice.benchmark_id == scenario.benchmark_id,
            BenchmarkPrice.price_date >= scenario.start_date,
        )
        .order_by(BenchmarkPrice.price_date.asc())
        .first()
    )
    end = (
        db.query(BenchmarkPrice)
        .filter(
            BenchmarkPrice.benchmark_id == scenario.benchmark_id,
            BenchmarkPrice.price_date <= scenario.end_date,
        )
        .order_by(BenchmarkPrice.price_date.desc())
        .first()
    )
    if not start or not end or Decimal(start.value) <= 0:
        return None, "UNAVAILABLE"
    return float((Decimal(end.value) - Decimal(start.value)) / Decimal(start.value)), "ACTUAL_NAV"


def run_stress_test(
    db: Session,
    holdings: Iterable[Holding],
    scenario_id: str,
    auto_seed: bool = False,
) -> dict:
    """Runs historical crash stress test at the holding level.

    Returns a JSON-serializable dict with portfolio-level and per-holding impact.
    """
    scenario = SCENARIOS.get(scenario_id) or SCENARIOS["COVID_2020"]
    logger.info("Running stress test for scenario %s", scenario.id)

    # Ensure baseline market benchmark & scheme data is seeded if requested
    if auto_seed:
        seed_market_baseline(db)

    holdings_list = list(holdings)
    total_value = sum((Decimal(str(h.current_value)) for h in holdings_list), Decimal("0"))

    bench_return, bench_conf = _benchmark_return(db, scenario)
    if bench_return is None:
        logger.warning(
            "Stress test benchmark unavailable: scenario=%s benchmark=%s window=%s..%s",
            scenario.id,
            scenario.benchmark_id,
            scenario.start_date,
            scenario.end_date,
        )
    stock_beta = STOCK_BETA.get(scenario.id, 1.0)

    impacts: list[HoldingImpact] = []
    covered_value = Decimal("0")
    simulated_loss = Decimal("0")
    missing_assets: list[str] = []
    used_estimates = 0
    used_actuals = 0
    used_unavailable = 0

    for h in holdings_list:
        value = Decimal(str(h.current_value))
        if value <= 0:
            logger.warning("Skipping non-positive holding in stress test: id=%s name=%s value=%s", h.id, h.name, value)
            continue

        isin_clean = (h.isin or "").strip().upper()
        raw_type = str(h.asset_type.value if hasattr(h.asset_type, "value") else h.asset_type).upper()
        name_upper = (h.name or "").upper()

        is_stock = (
            h.asset_type in (AssetType.STOCK, AssetType.ETF)
            or isin_clean.startswith("INE")
            or "EQUITY" in raw_type
            or "SHARE" in raw_type
        )
        is_mf = (
            h.asset_type == AssetType.MUTUAL_FUND
            or isin_clean.startswith("INF")
            or "MUTUAL" in raw_type
            or "FUND" in name_upper
        )

        return_pct = 0.0
        confidence = "ESTIMATED"
        methodology = "No scenario impact for this asset class."

        if is_stock and not is_mf:
            if bench_return is None:
                confidence = "UNAVAILABLE"
                methodology = "Benchmark price data missing for this scenario."
                missing_assets.append(h.name)
                used_unavailable += 1
            else:
                return_pct = bench_return * stock_beta
                confidence = "ESTIMATED"
                methodology = (
                    f"Proxy: NIFTY 50 scenario return ({bench_return * 100:.1f}%) "
                    f"scaled by {stock_beta:.2f}x stock beta. "
                    f"Per-stock history not available."
                )
                covered_value += value
                simulated_loss += value * Decimal(str(-return_pct)) if return_pct < 0 else Decimal("0")
                used_estimates += 1

        elif is_mf:
            scheme = CanonicalSchemeResolver.resolve_scheme(
                db,
                scheme_isin=h.isin,
                scheme_name=h.name,
            )
            actual_return, conf = _mf_impact_from_nav(db, h, scheme, scenario)

            if conf == "ACTUAL_NAV" and actual_return is not None:
                return_pct = actual_return
                methodology = f"Historical NAV available for {scheme.scheme_name if scheme else h.name} over scenario window."
                confidence = "ACTUAL_NAV"
                used_actuals += 1
                covered_value += value
                simulated_loss += value * Decimal(str(-return_pct)) if return_pct < 0 else Decimal("0")
            elif bench_return is not None:
                category = scheme.category if (scheme and scheme.category) else None
                if not category and h.name:
                    name_lower = h.name.lower()
                    if "small" in name_lower:
                        category = "Small Cap"
                    elif "mid" in name_lower:
                        category = "Mid Cap"
                    elif "flexi" in name_lower or "multi" in name_lower:
                        category = "Flexi Cap"
                    elif "large" in name_lower or "bluechip" in name_lower or "nifty" in name_lower or "index" in name_lower:
                        category = "Large Cap"
                    elif "debt" in name_lower or "bond" in name_lower or "liquid" in name_lower or "gilt" in name_lower:
                        category = "Debt"

                multiplier = _category_multiplier(category)
                return_pct = bench_return * multiplier
                methodology = (
                    f"Proxy: NIFTY 50 scenario return ({bench_return * 100:.1f}%) "
                    f"scaled by {multiplier:.2f}x for category "
                    f"'{category or 'General Equity'}'. "
                    f"Exact fund NAV history not available for this period."
                )
                confidence = "ESTIMATED"
                used_estimates += 1
                covered_value += value
                simulated_loss += value * Decimal(str(-return_pct)) if return_pct < 0 else Decimal("0")
            else:
                confidence = "UNAVAILABLE"
                methodology = "No benchmark data and no fund NAV history."
                missing_assets.append(h.name)
                used_unavailable += 1

        elif h.asset_type in (AssetType.CASH, AssetType.BOND):
            return_pct = 0.0
            confidence = "ACTUAL_NAV"
            methodology = "Cash/debt holdings are not affected by equity crash scenarios."
            covered_value += value
            used_actuals += 1

        else:
            return_pct = 0.0
            confidence = "UNAVAILABLE"
            methodology = f"Asset class '{h.asset_type.value if hasattr(h.asset_type, 'value') else h.asset_type}' not supported by this scenario."
            missing_assets.append(h.name)
            used_unavailable += 1

        scenario_value = value * (Decimal("1") + Decimal(str(return_pct)))
        impact = value * Decimal(str(return_pct))

        impacts.append(HoldingImpact(
            holding_id=str(h.id),
            name=h.name,
            asset_type=h.asset_type.value,
            current_value=float(value),
            scenario_return=return_pct,
            scenario_value=float(scenario_value),
            impact=float(impact),
            confidence=confidence,
            methodology=methodology,
        ))

    coverage = float(covered_value / total_value) if total_value > 0 else 0.0
    loss_pct = float(simulated_loss / total_value) if total_value > 0 else 0.0
    ending_value = total_value - simulated_loss

    # Sort impacts by absolute impact (largest losses first)
    impacts.sort(key=lambda x: x.impact)

    return {
        "scenario": scenario.id,
        "scenario_name": scenario.name,
        "description": scenario.description,
        "scenario_window": {
            "start": scenario.start_date.isoformat(),
            "end": scenario.end_date.isoformat(),
        },
        "methodology": scenario.methodology,
        "data_source": scenario.data_source,
        "starting_value": round(float(total_value), 2),
        "estimated_loss": round(float(simulated_loss), 2),
        "loss_percent": round(loss_pct, 2),
        "ending_value": round(float(ending_value), 2),
        "data_coverage": round(coverage, 2),
        "missing_assets": missing_assets,
        "confidence_summary": {
            "actuals": used_actuals,
            "estimates": used_estimates,
            "unavailable": used_unavailable,
        },
        "benchmark_return": bench_return,
        "holdings": [
            {
                "holding_id": imp.holding_id,
                "name": imp.name,
                "asset_type": imp.asset_type,
                "current_value": round(imp.current_value, 2),
                "scenario_return": round(imp.scenario_return, 4),
                "scenario_value": round(imp.scenario_value, 2),
                "impact": round(imp.impact, 2),
                "confidence": imp.confidence,
                "methodology": imp.methodology,
            }
            for imp in impacts
        ],
        "disclaimer": (
            "Historical scenario analysis is for educational purposes only and is "
            "not a prediction of future returns. Proxy estimates are clearly "
            "labelled and should not be treated as exact historical performance."
        ),
    }

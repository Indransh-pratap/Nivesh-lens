from decimal import Decimal
from typing import Any
from sqlalchemy.orm import Session

from app.models.holding import Holding, AssetType
from app.services.diagnostics.concentration import calculate_hhi


AVAILABLE_BENCHMARKS: dict[str, dict[str, Any]] = {
    "RETAIL_BASELINE": {
        "id": "RETAIL_BASELINE",
        "name": "Indian Retail Investor Baseline (NIFTY 500 & AMFI Multi-Asset)",
        "description": "Standard multi-asset reference baseline for Indian retail investors holding a mix of equity and debt.",
        "sample_size": "Aggregated across AMFI retail mutual fund disclosures and top 500 NSE securities",
        "methodology": "Composite multi-asset retail investor baseline combining NIFTY 500 index weight distribution with typical retail asset allocation.",
        "as_of_date": "2026-03-31",
        "reference_hhi": 0.108,
        "reference_largest_company": 0.075,
        "reference_equity_concentration": 0.70,
        "reference_debt_concentration": 0.20,
        "reference_cash_concentration": 0.10,
        "reference_holdings_count": 15,
        "coverage_source": "Reference Benchmark (NIFTY 500 Index & Retail Peer Baseline)",
    },
    "AGGRESSIVE_GROWTH": {
        "id": "AGGRESSIVE_GROWTH",
        "name": "Aggressive Equity Baseline (NIFTY 50 & Midcap 150)",
        "description": "Pure equity-oriented reference baseline for aggressive long-term wealth creation portfolios.",
        "sample_size": "AMFI pure equity portfolio aggregates and NIFTY 50 / Midcap 150 index constituents",
        "methodology": "Equity-focused benchmark calibrated against broad-market indices and active equity mutual funds.",
        "as_of_date": "2026-03-31",
        "reference_hhi": 0.085,
        "reference_largest_company": 0.095,
        "reference_equity_concentration": 0.90,
        "reference_debt_concentration": 0.05,
        "reference_cash_concentration": 0.05,
        "reference_holdings_count": 25,
        "coverage_source": "Aggressive Equity Reference (NIFTY 500 Broad Market)",
    },
    "CONSERVATIVE_HYBRID": {
        "id": "CONSERVATIVE_HYBRID",
        "name": "Conservative Hybrid Baseline (CRISIL Hybrid 65:35)",
        "description": "Balanced and capital preservation reference baseline with higher fixed income allocation.",
        "sample_size": "CRISIL Hybrid Index constituents and AMFI conservative hybrid fund disclosures",
        "methodology": "Multi-asset debt-biased reference portfolio calibrated against conservative mutual fund portfolios.",
        "as_of_date": "2026-03-31",
        "reference_hhi": 0.145,
        "reference_largest_company": 0.055,
        "reference_equity_concentration": 0.40,
        "reference_debt_concentration": 0.50,
        "reference_cash_concentration": 0.10,
        "reference_holdings_count": 12,
        "coverage_source": "Conservative Multi-Asset Reference (CRISIL / AMFI)",
    },
}


def calculate_portfolio_benchmark(
    db: Session | None,
    holdings: list[Holding],
    benchmark_id: str = "RETAIL_BASELINE",
) -> dict:
    """
    Evaluates portfolio concentration and asset metrics against available reference benchmark datasets.
    Provides transparent methodology, neutral comparative language, and explicit diversification deltas.
    """
    bm_config = AVAILABLE_BENCHMARKS.get(benchmark_id, AVAILABLE_BENCHMARKS["RETAIL_BASELINE"])

    benchmarks_list = [
        {
            "id": b["id"],
            "name": b["name"],
            "description": b["description"],
            "sample_size": b["sample_size"],
            "methodology": b["methodology"],
            "as_of_date": b["as_of_date"],
        }
        for b in AVAILABLE_BENCHMARKS.values()
    ]

    total_val = sum((Decimal(str(h.current_value)) for h in holdings if h.current_value is not None and Decimal(str(h.current_value)) > Decimal("0")), Decimal("0"))

    if total_val <= Decimal("0"):
        return {
            "portfolio_hhi": 0.0,
            "reference_hhi": bm_config["reference_hhi"],
            "relative_position": "WELL_DIVERSIFIED",
            "largest_company_exposure": 0.0,
            "reference_largest_company": bm_config["reference_largest_company"],
            "equity_concentration": 0.0,
            "reference_equity_concentration": bm_config["reference_equity_concentration"],
            "holdings_count": 0,
            "reference_holdings_count": bm_config["reference_holdings_count"],
            "coverage_source": bm_config["coverage_source"],
            "benchmark_id": bm_config["id"],
            "benchmark_name": bm_config["name"],
            "methodology": bm_config["methodology"],
            "sample_size": bm_config["sample_size"],
            "as_of_date": bm_config["as_of_date"],
            "asset_allocation": {
                "portfolio_equity": 0.0,
                "benchmark_equity": bm_config["reference_equity_concentration"],
                "portfolio_debt": 0.0,
                "benchmark_debt": bm_config["reference_debt_concentration"],
                "portfolio_cash": 0.0,
                "benchmark_cash": bm_config["reference_cash_concentration"],
            },
            "diversification_assessment": "No holdings found in portfolio. Allocation is at baseline zero.",
            "available_benchmarks": benchmarks_list,
            "disclaimer": "Comparative benchmarks are for informational purposes only and do not constitute investment advice.",
        }

    # Calculate HHI directly from holding weights
    hhi = float(sum(
        ((Decimal(str(h.current_value)) / total_val) ** 2 for h in holdings if h.current_value is not None and Decimal(str(h.current_value)) > Decimal("0")),
        Decimal("0"),
    ))
    holdings_count = len(holdings)

    # Largest company exposure
    largest_holding_val = max(
        (Decimal(str(h.current_value)) for h in holdings if h.current_value is not None),
        default=Decimal("0"),
    )
    largest_company_exp = float(largest_holding_val / total_val) if total_val > Decimal("0") else 0.0

    # Asset class breakdown
    equity_val = Decimal("0")
    debt_val = Decimal("0")
    cash_val = Decimal("0")

    for h in holdings:
        if h.current_value is None:
            continue
        v = Decimal(str(h.current_value))
        at = str(h.asset_type).upper()
        if h.asset_type in (AssetType.STOCK, AssetType.MUTUAL_FUND) or "STOCK" in at or "EQUITY" in at or "MUTUAL" in at:
            equity_val += v
        elif h.asset_type == AssetType.BOND or "BOND" in at or "DEBT" in at or "FD" in at:
            debt_val += v
        elif h.asset_type == AssetType.CASH or "CASH" in at or "LIQUID" in at:
            cash_val += v
        else:
            equity_val += v

    equity_conc = float(equity_val / total_val) if total_val > Decimal("0") else 0.0
    debt_conc = float(debt_val / total_val) if total_val > Decimal("0") else 0.0
    cash_conc = float(cash_val / total_val) if total_val > Decimal("0") else 0.0

    ref_hhi = bm_config["reference_hhi"]

    # Factual, neutral relative position classification
    if hhi > 0.20:
        position = "MORE_CONCENTRATED"
        diversification_assessment = (
            f"Portfolio HHI ({hhi:.3f}) is higher than the reference baseline ({ref_hhi:.3f}), "
            "indicating higher concentration across fewer positions."
        )
    elif hhi > 0.12:
        position = "MODERATELY_CONCENTRATED"
        diversification_assessment = (
            f"Portfolio concentration ({hhi:.3f}) is moderately above the reference baseline ({ref_hhi:.3f})."
        )
    else:
        position = "WELL_DIVERSIFIED"
        diversification_assessment = (
            f"Portfolio concentration ({hhi:.3f}) is within or below standard reference baseline limits ({ref_hhi:.3f})."
        )

    return {
        "portfolio_hhi": round(hhi, 4),
        "reference_hhi": ref_hhi,
        "relative_position": position,
        "largest_company_exposure": round(largest_company_exp, 4),
        "reference_largest_company": bm_config["reference_largest_company"],
        "equity_concentration": round(equity_conc, 4),
        "reference_equity_concentration": bm_config["reference_equity_concentration"],
        "reference_debt_concentration": bm_config["reference_debt_concentration"],
        "reference_cash_concentration": bm_config["reference_cash_concentration"],
        "holdings_count": holdings_count,
        "reference_holdings_count": bm_config["reference_holdings_count"],
        "coverage_source": bm_config["coverage_source"],
        "benchmark_id": bm_config["id"],
        "benchmark_name": bm_config["name"],
        "methodology": bm_config["methodology"],
        "sample_size": bm_config["sample_size"],
        "as_of_date": bm_config["as_of_date"],
        "asset_allocation": {
            "portfolio_equity": round(equity_conc, 4),
            "benchmark_equity": bm_config["reference_equity_concentration"],
            "portfolio_debt": round(debt_conc, 4),
            "benchmark_debt": bm_config["reference_debt_concentration"],
            "portfolio_cash": round(cash_conc, 4),
            "benchmark_cash": bm_config["reference_cash_concentration"],
        },
        "diversification_assessment": diversification_assessment,
        "available_benchmarks": benchmarks_list,
        "disclaimer": "Comparative benchmarks are for informational purposes only and do not constitute investment advice.",
    }

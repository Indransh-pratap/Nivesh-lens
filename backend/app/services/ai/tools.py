import uuid
from decimal import Decimal
from typing import Any
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.holding import AssetType
from app.models.market_data import FundNAVHistory, FundScheme
from app.services import portfolio_service
from app.services.benchmarking.engine import calculate_portfolio_benchmark
from app.services.diagnostics.service import build_diagnostics
from app.services.exposure.company_exposure import calculate_company_exposure
from app.services.groups.exposure import calculate_group_exposure
from app.services.phase2.fund_swap import simulate_fund_swap
from app.services.phase2.stress_test import run_stress_test
from app.services.sip.health import calculate_sip_health
from app.services.market_data.seed_data import seed_market_baseline


def _ensure_portfolio(portfolio_id: str | uuid.UUID, db: Session) -> Portfolio | None:
    if isinstance(portfolio_id, str):
        try:
            portfolio_id = uuid.UUID(portfolio_id)
        except ValueError:
            return None
    return db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()


# ============================================================================
# Mandated 10 Read-Only Tools (Section 5)
# ============================================================================

def get_portfolio_summary(portfolio_id: str | uuid.UUID, db: Session) -> dict[str, Any]:
    """Retrieve top-level portfolio value, holdings count, and asset breakdown."""
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}

    holdings_count = len(portfolio.holdings)
    total_val = float(portfolio.total_value or Decimal("0"))
    asset_types = {}
    for h in portfolio.holdings:
        atype = str(h.asset_type.value if hasattr(h.asset_type, "value") else h.asset_type)
        asset_types[atype] = asset_types.get(atype, 0.0) + float(h.current_value or 0)

    return {
        "portfolio_id": str(portfolio.id),
        "name": portfolio.name,
        "total_value": total_val,
        "holdings_count": holdings_count,
        "asset_allocation": asset_types,
        "available": True,
    }


def get_company_exposure(portfolio_id: str | uuid.UUID, db: Session, company_name: str | None = None) -> dict[str, Any]:
    """Retrieve true company exposure (direct demat + indirect mutual fund look-through)."""
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}

    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    top_exposures = diagnostics.get("top_company_exposures", [])

    if company_name:
        query_norm = company_name.strip().upper()
        matching = [
            item for item in top_exposures
            if query_norm in str(item.get("company", "")).upper()
        ]
        return {
            "requested_company": company_name,
            "matches": matching,
            "found": len(matching) > 0,
            "available": True,
        }

    return {
        "top_company_exposures": top_exposures,
        "count": len(top_exposures),
        "available": True,
    }


def get_fund_overlap(portfolio_id: str | uuid.UUID, db: Session) -> dict[str, Any]:
    """Retrieve mutual fund overlap percentage and top overlapping portfolio companies."""
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}

    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    fee_data = diagnostics.get("fee_analysis") or {}

    return {
        "overlap_percentage": fee_data.get("overlap_percentage", 0.0),
        "overlapping_companies_count": fee_data.get("overlapping_companies_count", 0),
        "top_overlapping_companies": fee_data.get("top_overlapping_companies", []),
        "estimated_duplicate_cost": fee_data.get("estimated_potential_duplicate_cost", 0.0),
        "available": True,
    }


def get_mutual_fund_context(portfolio_id: str | uuid.UUID, db: Session) -> dict[str, Any]:
    """Return only the fund facts needed for fund-analysis/recommendation queries."""
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}
    seed_market_baseline(db)

    total = sum((Decimal(str(h.current_value or 0)) for h in portfolio.holdings), Decimal("0"))
    current: list[dict[str, Any]] = []
    for holding in portfolio.holdings:
        raw_type = str(getattr(holding.asset_type, "value", holding.asset_type)).upper()
        if holding.asset_type != AssetType.MUTUAL_FUND and "MUTUAL" not in raw_type and not (holding.isin or "").upper().startswith("INF"):
            continue
        scheme = None
        if holding.isin:
            scheme = db.query(FundScheme).filter(FundScheme.isin == holding.isin.strip().upper()).first()
        if scheme is None and holding.name:
            scheme = db.query(FundScheme).filter(FundScheme.scheme_name.ilike(f"%{holding.name[:20]}%" )).first()
        value = Decimal(str(holding.current_value or 0))
        current.append({
            "holding_name": holding.name,
            "isin": holding.isin,
            "current_value": float(value),
            "allocation_pct": round(float(value / total * Decimal("100")), 2) if total > 0 else 0.0,
            "category": scheme.category if scheme else None,
            "expense_ratio": float(scheme.expense_ratio) if scheme and scheme.expense_ratio is not None else None,
            "benchmark": scheme.benchmark_id if scheme else None,
            "scheme_code": scheme.scheme_code if scheme else None,
        })

    available: list[dict[str, Any]] = []
    for scheme in db.query(FundScheme).order_by(FundScheme.scheme_name.asc()).limit(50).all():
        latest_nav = db.query(FundNAVHistory.nav).filter(FundNAVHistory.scheme_id == scheme.id).order_by(FundNAVHistory.nav_date.desc()).first()
        available.append({
            "scheme_name": scheme.scheme_name,
            "scheme_code": scheme.scheme_code,
            "isin": scheme.isin,
            "category": scheme.category,
            "amc_name": scheme.amc_name,
            "expense_ratio": float(scheme.expense_ratio) if scheme.expense_ratio is not None else None,
            "latest_nav": float(latest_nav[0]) if latest_nav and latest_nav[0] is not None else None,
        })
    return {"current_funds": current, "available_funds": available, "available": True}


def get_hhi(portfolio_id: str | uuid.UUID, db: Session) -> dict[str, Any]:
    """Retrieve deterministic Herfindahl-Hirschman Index (0-10,000 scale) and concentration classification."""
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}

    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    concentration = diagnostics.get("concentration") or {}

    return {
        "hhi_score": concentration.get("hhi_score"),
        "classification": concentration.get("classification"),
        "top_contributor": concentration.get("top_contributor"),
        "top_contributor_weight": concentration.get("top_contributor_weight"),
        "effective_constituent_count": concentration.get("effective_constituent_count"),
        "available": True,
    }


def get_diagnostic_bundle(portfolio_id: str | uuid.UUID, db: Session) -> dict[str, Any]:
    """Compute the shared diagnostics once for a chat turn.

    Several assistant intents need overlap, health, HHI and exposure. Reusing
    this bundle avoids rebuilding the same expensive look-through calculation
    multiple times in one request.
    """
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}
    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    return {
        "overlap": diagnostics.get("fee_analysis", {}).get("overlap_percentage", 0.0),
        "overlapping_companies": diagnostics.get("fee_analysis", {}).get("overlapping_companies_count", 0),
        "health": diagnostics.get("diversification_score", {}),
        "concentration": diagnostics.get("concentration", {}),
        "top_company_exposures": diagnostics.get("top_company_exposures", []),
        "available": True,
    }


def get_health_score(portfolio_id: str | uuid.UUID, db: Session) -> dict[str, Any]:
    """Retrieve proprietary Portfolio Health Score (300-900) with 4 explainable sub-pillars."""
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}

    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    health = diagnostics.get("diversification_score") or {}

    return {
        "score": health.get("score"),
        "rating": health.get("rating"),
        "percentile_rank": health.get("percentile_rank"),
        "sub_pillars": health.get("sub_pillars", []),
        "reasons": health.get("reasons", []),
        "available": True,
    }


def get_nominee_audit(portfolio_id: str | uuid.UUID, db: Session) -> dict[str, Any]:
    """Retrieve compliance status of nominee registrations across all holdings."""
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}

    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    nominee = diagnostics.get("nominee_audit") or {}

    return {
        "accounts_checked": nominee.get("accounts_checked", 0),
        "accounts_confirmed": nominee.get("accounts_confirmed", 0),
        "accounts_missing": nominee.get("accounts_missing", 0),
        "compliance_percentage": nominee.get("compliance_percentage", 0.0),
        "is_fully_compliant": nominee.get("is_fully_compliant", False),
        "red_flags": nominee.get("red_flags", []),
        "available": True,
    }


def get_group_exposure(portfolio_id: str | uuid.UUID, db: Session) -> dict[str, Any]:
    """Retrieve conglomerate/corporate group exposures (e.g. Tata, Reliance, Adani)."""
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}

    res = calculate_group_exposure(db, portfolio.holdings)
    return {
        "groups": res.get("groups", []),
        "highest_group": res.get("highest_group"),
        "total_group_exposure_pct": res.get("total_group_exposure_pct"),
        "available": True,
    }


def get_sip_health(portfolio_id: str | uuid.UUID, db: Session) -> dict[str, Any]:
    """Retrieve deterministic SIP health grades and review status."""
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}

    res = calculate_sip_health(db, portfolio.holdings, portfolio.transactions)
    return {
        "active_sips_count": res.get("active_sips_count", 0),
        "monthly_sip_outflow": res.get("monthly_sip_outflow", 0.0),
        "sips": res.get("sips", []),
        "portfolio_sip_grade": res.get("portfolio_sip_grade"),
        "review_needed_count": res.get("review_needed_count", 0),
        "available": True,
    }


def get_stress_test(portfolio_id: str | uuid.UUID, db: Session, scenario_id: str = "COVID_2020") -> dict[str, Any]:
    """Retrieve deterministic historical stress test drawdown simulation."""
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}

    res = run_stress_test(db, portfolio.holdings, scenario_id)
    return {
        "scenario": res.get("scenario"),
        "scenario_name": res.get("scenario_name"),
        "starting_value": res.get("starting_value"),
        "estimated_loss": res.get("estimated_loss"),
        "loss_percent": res.get("loss_percent"),
        "ending_value": res.get("ending_value"),
        "data_coverage": res.get("data_coverage"),
        "available": True,
    }


def get_fund_simulation(
    portfolio_id: str | uuid.UUID,
    db: Session,
    target_holding_id: str,
    replacement_scheme_code: str,
) -> dict[str, Any]:
    """Simulate swapping a fund and view deterministic before/after changes."""
    portfolio = _ensure_portfolio(portfolio_id, db)
    if not portfolio:
        return {"error": "Portfolio not found", "available": False}

    res = simulate_fund_swap(db, portfolio.holdings, target_holding_id, replacement_scheme_code)
    return {
        "before": res.get("before"),
        "after": res.get("after"),
        "delta": res.get("delta"),
        "disclaimer": res.get("disclaimer"),
        "available": True,
    }

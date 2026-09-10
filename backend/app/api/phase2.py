"""Phase 2 API routes (additive — does not modify Phase 1 endpoints).

Endpoints:
- GET  /api/portfolios/{id}/phase2/stress-test?scenario=...
- POST /api/portfolios/{id}/phase2/stress-test
- GET  /api/portfolios/{id}/phase2/fund-swap/candidates
- POST /api/portfolios/{id}/phase2/fund-swap
- GET  /api/portfolios/{id}/phase2/correlation?lookback=...

These are exposed alongside the legacy /stress-tests, /fund-swap, /correlation
routes which currently exist in portfolio.py and are kept for backward compat.
"""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import get_current_user_id
from app.db.dependencies import get_db
from app.services import portfolio_service
from app.services.phase2.correlation import (
    LOOKBACK_WINDOWS,
    calculate_nav_correlation_matrix,
)
from app.services.phase2.fund_swap import (
    list_replacement_candidates,
    simulate_fund_swap,
)
from app.services.phase2.stress_test import SCENARIOS, run_stress_test
from app.services.benchmarking.engine import calculate_portfolio_benchmark
from app.services.groups.exposure import calculate_group_exposure
from app.services.market_data.seed_data import seed_market_baseline
from app.services.sip.health import calculate_sip_health, simulate_sip_switch
from app.schemas.phase2 import (
    BenchmarkResponse,
    GroupExposureResponse,
    SIPHealthResponse,
    SIPSwitchSimulationRequest,
    SIPSwitchSimulationResponse,
)


router = APIRouter(prefix="/portfolios")


# ============================================================
# Schemas
# ============================================================

class StressTestRequest(BaseModel):
    scenario_id: str = Field(default="COVID_2020")


class FundSwapRequest(BaseModel):
    target_holding_id: str
    replacement_scheme_code: str


# ============================================================
# Helpers
# ============================================================

def _not_found() -> None:
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Portfolio not found")


def _get_portfolio(db: Session, user_id: str, portfolio_id: uuid.UUID):
    try:
        return portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        _not_found()


# ============================================================
# Stress test
# ============================================================

@router.get("/{portfolio_id}/phase2/stress-test")
def get_phase2_stress_test(
    portfolio_id: uuid.UUID,
    scenario: str = Query(default="COVID_2020", description="Scenario id"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    seed_market_baseline(db)
    portfolio = _get_portfolio(db, user_id, portfolio_id)
    return {
        "available_scenarios": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "window": {
                    "start": s.start_date.isoformat(),
                    "end": s.end_date.isoformat(),
                },
            }
            for s in SCENARIOS.values()
        ],
        "result": run_stress_test(db, portfolio.holdings, scenario),
    }


@router.post("/{portfolio_id}/phase2/stress-test")
def post_phase2_stress_test(
    portfolio_id: uuid.UUID,
    payload: StressTestRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    seed_market_baseline(db)
    portfolio = _get_portfolio(db, user_id, portfolio_id)
    return run_stress_test(db, portfolio.holdings, payload.scenario_id)


# ============================================================
# Fund swap
# ============================================================

@router.get("/{portfolio_id}/phase2/fund-swap/candidates")
def get_phase2_fund_swap_candidates(
    portfolio_id: uuid.UUID,
    target_holding_id: str = Query(..., description="Holding id or name to be replaced"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    portfolio = _get_portfolio(db, user_id, portfolio_id)
    target = next(
        (
            h for h in portfolio.holdings
            if str(h.id) == target_holding_id
            or (h.name and h.name.lower() == target_holding_id.lower())
        ),
        None,
    )
    if target is None:
        return {"candidates": [], "error": "Target holding not found."}
    return {
        "target_holding": {
            "id": str(target.id),
            "name": target.name,
            "isin": target.isin,
            "asset_type": target.asset_type.value,
            "current_value": float(target.current_value or 0),
        },
        "candidates": list_replacement_candidates(db, target),
    }


@router.post("/{portfolio_id}/phase2/fund-swap")
def post_phase2_fund_swap(
    portfolio_id: uuid.UUID,
    payload: FundSwapRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    portfolio = _get_portfolio(db, user_id, portfolio_id)
    return simulate_fund_swap(
        db,
        portfolio.holdings,
        payload.target_holding_id,
        payload.replacement_scheme_code,
    )


# ============================================================
# Correlation
# ============================================================

LookbackLiteral = Literal["3M", "6M", "1Y", "3Y"]


@router.get("/{portfolio_id}/phase2/correlation")
def get_phase2_correlation(
    portfolio_id: uuid.UUID,
    lookback: LookbackLiteral = Query(default="1Y"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    portfolio = _get_portfolio(db, user_id, portfolio_id)
    return {
        "available_lookbacks": list(LOOKBACK_WINDOWS.keys()),
        "result": calculate_nav_correlation_matrix(db, portfolio.holdings, lookback=lookback),
    }


# ============================================================
# Feature 4: Peer Baseline Benchmarking
# ============================================================

@router.get("/{portfolio_id}/phase2/benchmark", response_model=BenchmarkResponse)
def get_phase2_benchmark(
    portfolio_id: uuid.UUID,
    benchmark_id: str = Query(default="RETAIL_BASELINE", description="Reference benchmark ID"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    portfolio = _get_portfolio(db, user_id, portfolio_id)
    return calculate_portfolio_benchmark(db, portfolio.holdings, benchmark_id=benchmark_id)


# ============================================================
# Feature 5: Parent Conglomerate & Group Exposure Alert
# ============================================================

@router.get("/{portfolio_id}/phase2/group-exposure", response_model=GroupExposureResponse)
def get_phase2_group_exposure(
    portfolio_id: uuid.UUID,
    threshold_moderate: float = Query(default=15.0, description="Moderate exposure alert threshold %"),
    threshold_high: float = Query(default=25.0, description="High exposure alert threshold %"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    portfolio = _get_portfolio(db, user_id, portfolio_id)
    return calculate_group_exposure(
        db,
        portfolio.holdings,
        threshold_moderate=threshold_moderate,
        threshold_high=threshold_high,
    )


# ============================================================
# Feature 6: Smart SIP Health Check & Auto-Switch
# ============================================================

@router.get("/{portfolio_id}/phase2/sip-health", response_model=SIPHealthResponse)
def get_phase2_sip_health(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    portfolio = _get_portfolio(db, user_id, portfolio_id)
    return calculate_sip_health(db, portfolio.holdings, portfolio.transactions)


@router.post("/{portfolio_id}/phase2/sip-health/simulate-switch", response_model=SIPSwitchSimulationResponse)
def post_phase2_sip_switch_simulation(
    portfolio_id: uuid.UUID,
    payload: SIPSwitchSimulationRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    portfolio = _get_portfolio(db, user_id, portfolio_id)
    result = simulate_sip_switch(
        db,
        portfolio.holdings,
        portfolio.transactions,
        payload.target_holding_id,
        payload.replacement_scheme_code,
    )
    if "error" in result:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=result["error"])
    return result


import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user_id
from app.db.dependencies import get_db
from app.schemas.portfolio import PortfolioCreate, PortfolioResponse
from app.schemas.diagnostics import DiagnosticResponse
from app.schemas.phase2 import (
    StressTestRunRequest,
    StressTestResponse,
    FundSwapRequest,
    FundSwapResponse,
    CorrelationResponse,
    BenchmarkResponse,
    GroupExposureResponse,
    SIPHealthResponse,
)
from app.schemas.exposure import CompanyExposureResponse
from app.schemas.lookthrough import LookThroughResponse
from app.services import portfolio_service
from app.services.diagnostics.service import build_diagnostics
from app.services.stress.simulator import run_stress_test
from app.services.simulator.fund_swap import simulate_fund_swap
from app.services.correlation.engine import calculate_nav_correlation_matrix
from app.services.benchmarking.engine import calculate_portfolio_benchmark
from app.services.groups.exposure import calculate_group_exposure
from app.services.sip.health import calculate_sip_health
from app.services.exposure.company_exposure import calculate_company_exposure
from app.services.exposure.lookthrough_service import calculate_portfolio_lookthrough
from app.services.reports.pdf_generator import generate_portfolio_diagnostic_pdf

router = APIRouter(prefix="/portfolios")


def not_found() -> None:
    from fastapi import HTTPException

    raise HTTPException(status_code=404, detail="Portfolio not found")


@router.get("", response_model=list[PortfolioResponse])
def get_portfolios(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> list[PortfolioResponse]:
    return portfolio_service.list_portfolios(db, user_id)


@router.post("", response_model=PortfolioResponse, status_code=status.HTTP_201_CREATED)
def post_portfolio(payload: PortfolioCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> PortfolioResponse:
    return portfolio_service.create_portfolio(db, user_id, payload)


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
def get_portfolio(portfolio_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> PortfolioResponse:
    try:
        return portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()


@router.get("/{portfolio_id}/diagnostics", response_model=DiagnosticResponse)
def get_diagnostics(portfolio_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> dict:
    try:
        portfolio = portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return build_diagnostics(
    str(portfolio.id),
    portfolio.holdings,
    portfolio.total_value,
    db,
    )


# --- PHASE 2 ENDPOINTS ---

@router.get("/{portfolio_id}/stress-tests", response_model=StressTestResponse)
def get_stress_test(
    portfolio_id: uuid.UUID,
    scenario: str = "COVID_2020",
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    try:
        portfolio = portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return run_stress_test(db, portfolio.holdings, scenario)


@router.post("/{portfolio_id}/stress-tests/run", response_model=StressTestResponse)
def run_stress_test_endpoint(
    portfolio_id: uuid.UUID,
    payload: StressTestRunRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    try:
        portfolio = portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return run_stress_test(db, portfolio.holdings, payload.scenario_id)


@router.get("/{portfolio_id}/correlation", response_model=CorrelationResponse)
def get_correlation(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    try:
        portfolio = portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return calculate_nav_correlation_matrix(db, portfolio.holdings)


@router.post("/{portfolio_id}/fund-swap", response_model=FundSwapResponse)
def post_fund_swap(
    portfolio_id: uuid.UUID,
    payload: FundSwapRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    try:
        portfolio = portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return simulate_fund_swap(db, portfolio.holdings, payload.target_holding_id, payload.replacement_scheme_code)


@router.get("/{portfolio_id}/benchmark", response_model=BenchmarkResponse)
def get_benchmark(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    try:
        portfolio = portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return calculate_portfolio_benchmark(db, portfolio.holdings)


@router.get("/{portfolio_id}/group-exposure", response_model=GroupExposureResponse)
def get_group_exposure(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    try:
        portfolio = portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return calculate_group_exposure(db, portfolio.holdings)


@router.get("/{portfolio_id}/company-exposure", response_model=CompanyExposureResponse)
def get_company_exposure(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> CompanyExposureResponse:
    try:
        portfolio = portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return calculate_company_exposure(portfolio_id=portfolio.id, holdings=portfolio.holdings, db=db)


@router.get("/{portfolio_id}/lookthrough", response_model=LookThroughResponse)
def get_lookthrough(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> LookThroughResponse:
    try:
        portfolio = portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return calculate_portfolio_lookthrough(portfolio_id=portfolio.id, holdings=portfolio.holdings, db=db)


@router.get("/{portfolio_id}/sip-health", response_model=SIPHealthResponse)
def get_sip_health(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    try:
        portfolio = portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return calculate_sip_health(db, portfolio.holdings, portfolio.transactions)


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_portfolio(portfolio_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> Response:
    try:
        portfolio_service.delete_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{portfolio_id}/pdf")
def get_portfolio_pdf_report(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> Response:
    try:
        portfolio = portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        not_found()

    diagnostics_data = build_diagnostics(
        str(portfolio.id),
        portfolio.holdings,
        portfolio.total_value,
        db,
    )
    pdf_bytes = generate_portfolio_diagnostic_pdf(
        portfolio_name=portfolio.name,
        diagnostics=diagnostics_data,
        client_name=f"User {user_id[:8]}",
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="nivesh_lens_audit_{portfolio.id}.pdf"',
        },
    )


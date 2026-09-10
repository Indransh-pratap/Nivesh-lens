import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import get_current_user_id
from app.db.dependencies import get_db
from app.models.portfolio import Portfolio
from app.schemas.ai import (
    AdvisorReport,
    DividendIntelligenceResponse,
    DriftSignalResponse,
    IPOAnalysisResponse,
    PanicGuardResponse,
    PortfolioAnswer,
    PortfolioExplanation,
    RiskExplanation,
    TaxRebalanceProposal,
    WhatsAppMessageRequest,
    WhatsAppMessageResponse,
)
from app.services import portfolio_service
from app.services.ai import (
    advisor_copilot,
    ask_portfolio,
    cas_fallback,
    dividend_ai,
    ipo_nfo_ai,
    news_intelligence,
    panic_guard,
    portfolio_analyst,
    promoter_intelligence,
    style_drift,
    tax_ai,
    whatsapp_adapter,
)
from app.services.ai.agent import rebalance_agent
from app.services.ai.phase2_explanations import (
    explain_benchmark,
    explain_correlation,
    explain_fund_swap,
    explain_group_exposure,
    explain_sip_health,
    explain_stress_test,
)
from app.services.benchmarking.engine import calculate_portfolio_benchmark
from app.services.correlation.engine import calculate_nav_correlation_matrix
from app.services.groups.exposure import calculate_group_exposure
from app.services.phase2.fund_swap import simulate_fund_swap
from app.services.phase2.stress_test import run_stress_test
from app.services.sip.health import calculate_sip_health

router = APIRouter(tags=["AI"])


def _get_owned_portfolio(portfolio_id: uuid.UUID, user_id: str, db: Session) -> Portfolio:
    try:
        return portfolio_service.get_owned_portfolio(db, user_id, portfolio_id)
    except portfolio_service.PortfolioNotFoundError:
        raise HTTPException(status_code=404, detail="Portfolio not found")


class ChatQueryRequest(BaseModel):
    question: str
    conversation: list[dict[str, str]] = Field(default_factory=list)


class FundSwapExplainRequest(BaseModel):
    target_holding_id: str
    replacement_scheme_code: str


class CasAiFallbackRequest(BaseModel):
    raw_text: str
    portfolio_name: str = "Imported Portfolio (AI Fallback)"


# ============================================================================
# Portfolio AI Analyst & Ask My Portfolio
# ============================================================================

@router.get("/portfolios/{portfolio_id}/ai/analyst", response_model=PortfolioExplanation)
def get_portfolio_analyst_explanation(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> PortfolioExplanation:
    """Generate high-level AI narrative from verified deterministic portfolio facts."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    return portfolio_analyst.generate_portfolio_explanation(portfolio, db)


@router.post("/portfolios/{portfolio_id}/ai/chat", response_model=PortfolioAnswer)
def post_ask_my_portfolio(
    portfolio_id: uuid.UUID,
    payload: ChatQueryRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> PortfolioAnswer:
    """Natural-language portfolio Q&A powered by deterministic read-only tools and Gemini."""
    _get_owned_portfolio(portfolio_id, user_id, db)
    return ask_portfolio.ask_my_portfolio(portfolio_id, payload.question, db, conversation=payload.conversation)


# ============================================================================
# Phase 2 Explanations
# ============================================================================

@router.get("/portfolios/{portfolio_id}/ai/explain/stress-test", response_model=RiskExplanation)
def get_explain_stress_test(
    portfolio_id: uuid.UUID,
    scenario: str = Query(default="COVID_2020"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> RiskExplanation:
    """Explain deterministic historical stress test results."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    det_res = run_stress_test(db, portfolio.holdings, scenario)
    return explain_stress_test(det_res)


@router.post("/portfolios/{portfolio_id}/ai/explain/fund-swap")
def post_explain_fund_swap(
    portfolio_id: uuid.UUID,
    payload: FundSwapExplainRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """Explain deterministic what-if fund replacement results."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    det_res = simulate_fund_swap(db, portfolio.holdings, payload.target_holding_id, payload.replacement_scheme_code)
    return explain_fund_swap(det_res)


@router.get("/portfolios/{portfolio_id}/ai/explain/correlation")
def get_explain_correlation(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """Explain NAV co-movement patterns among portfolio mutual funds."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    det_res = calculate_nav_correlation_matrix(db, portfolio.holdings)
    return explain_correlation(det_res)


@router.get("/portfolios/{portfolio_id}/ai/explain/benchmark")
def get_explain_benchmark(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """Explain portfolio concentration relative to the retail investor baseline."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    det_res = calculate_portfolio_benchmark(db, portfolio.holdings)
    return explain_benchmark(det_res)


@router.get("/portfolios/{portfolio_id}/ai/explain/group-exposure")
def get_explain_group_exposure(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """Explain conglomerate / corporate group concentration risk."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    det_res = calculate_group_exposure(db, portfolio.holdings)
    return explain_group_exposure(det_res)


@router.get("/portfolios/{portfolio_id}/ai/explain/sip-health")
def get_explain_sip_health(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """Explain SIP ratings and review flags."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    det_res = calculate_sip_health(db, portfolio.holdings, portfolio.transactions)
    return explain_sip_health(det_res)


# ============================================================================
# Advanced AI & Specialized Analytics
# ============================================================================

@router.get("/portfolios/{portfolio_id}/ai/tax-implications")
def get_portfolio_tax_implications(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """Calculate deterministic capital gains and synthesize with official tax rules."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    return tax_ai.explain_portfolio_tax_implications(portfolio, db)


@router.post("/portfolios/{portfolio_id}/ai/tax-rebalance", response_model=TaxRebalanceProposal)
def post_tax_aware_rebalance_agent(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> TaxRebalanceProposal:
    """Multi-tool agent synthesizing tax-optimized rebalancing proposal (strictly read-only)."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    return rebalance_agent.run_tax_aware_rebalance_agent(portfolio, db)


@router.get("/portfolios/{portfolio_id}/ai/ipo-nfo", response_model=IPOAnalysisResponse)
def get_ipo_nfo_analysis(
    portfolio_id: uuid.UUID,
    entity_name: str = Query(..., description="Company or NFO scheme name"),
    issue_type: str = Query(default="IPO"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> IPOAnalysisResponse:
    """Assess existing portfolio overlap with upcoming IPO or NFO."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    return ipo_nfo_ai.analyze_ipo_nfo_overlap(portfolio, entity_name, issue_type, db)


@router.get("/portfolios/{portfolio_id}/ai/promoter-intelligence")
def get_promoter_intelligence(
    portfolio_id: uuid.UUID,
    company: str = Query(..., description="Company name to audit"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """Synthesize promoter group and supply chain vulnerabilities from official filings."""
    _get_owned_portfolio(portfolio_id, user_id, db)
    return promoter_intelligence.analyze_promoter_and_supply_chain(company).model_dump()


@router.get("/portfolios/{portfolio_id}/ai/style-drift", response_model=list[DriftSignalResponse])
def get_style_drift_signals(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> list[DriftSignalResponse]:
    """Detect stealth concentration drift where fund buying overlaps direct equity holdings."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    return style_drift.detect_style_and_fomo_drift(portfolio, db)


@router.get("/portfolios/{portfolio_id}/ai/panic-guard", response_model=PanicGuardResponse | None)
def get_panic_guard_evaluation(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> PanicGuardResponse | None:
    """Detect extreme drawdown or concentration triggers and generate non-manipulative nudges."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    return panic_guard.evaluate_panic_guard(portfolio, db)


@router.get("/portfolios/{portfolio_id}/ai/news")
def get_holding_news(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> list[dict[str, Any]]:
    """Surface material news announcements weighted by actual portfolio exposure %."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    summaries = news_intelligence.get_portfolio_news_intelligence(portfolio, db)
    return [s.model_dump() for s in summaries]


@router.get("/portfolios/{portfolio_id}/ai/dividends", response_model=DividendIntelligenceResponse)
def get_dividend_intelligence(
    portfolio_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> DividendIntelligenceResponse:
    """Deterministic cash flow schedule explained with seasonal dividend concentration."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    return dividend_ai.calculate_and_explain_dividends(portfolio, db)


@router.get("/portfolios/{portfolio_id}/ai/advisor-report", response_model=AdvisorReport)
def get_advisor_report(
    portfolio_id: uuid.UUID,
    client_name: str = Query(default="Valued Client"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> AdvisorReport:
    """Generate professional advisor narrative sections from validated portfolio diagnostics."""
    portfolio = _get_owned_portfolio(portfolio_id, user_id, db)
    return advisor_copilot.generate_advisor_copilot_report(portfolio, client_name, db)


# ============================================================================
# WhatsApp Integration & CAS AI Fallback
# ============================================================================

@router.post("/ai/whatsapp", response_model=WhatsAppMessageResponse)
def post_whatsapp_webhook(
    payload: WhatsAppMessageRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> WhatsAppMessageResponse:
    """Inbound WhatsApp webhook adapter; authenticated, read-only, PII-sanitized."""
    return whatsapp_adapter.process_whatsapp_query(payload, user_id, db)


@router.post("/imports/cas-ai-fallback", status_code=status.HTTP_201_CREATED)
def post_cas_ai_fallback_import(
    payload: CasAiFallbackRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """Auxiliary CAS fallback: Gemini extraction + strict deterministic reconciliation."""
    return cas_fallback.process_cas_ai_fallback(
        cas_text_or_ocr=payload.raw_text,
        user_id=user_id,
        db=db,
        portfolio_name=payload.portfolio_name,
    )

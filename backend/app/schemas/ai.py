from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from pydantic import BaseModel, Field


# ============================================================================
# Core Schemas (Mandated by Section 2)
# ============================================================================

class PortfolioExplanation(BaseModel):
    headline: str = Field(..., description="A concise 1-sentence executive summary of portfolio health")
    summary: str = Field(..., description="High-level narrative explaining overall structure and posture")
    top_risk_factor: str = Field(..., description="Primary risk factor identified (e.g. single stock concentration)")
    concentration_explanation: str = Field(..., description="Detailed explanation of direct and look-through company concentration")
    diversification_assessment: str = Field(..., description="Assessment of diversification across asset classes and market caps")
    fee_insights: list[str] = Field(default_factory=list, description="Actionable insights on regular commission bleed and high TER funds")
    actionable_observations: list[str] = Field(default_factory=list, description="Concrete observations for portfolio review")
    disclaimer: str = Field(
        default="AI-generated financial explanation based strictly on deterministic analytics. Not SEBI-registered investment advice.",
        description="Mandatory compliance disclaimer",
    )


class PortfolioAnswer(BaseModel):
    question: str = Field(..., description="Original user natural-language query")
    answer: str = Field(..., description="Truthful, grounded answer synthesized from tool results")
    intent: str = Field(default="GENERAL_FINANCE")
    summary: str = Field(default="")
    reasoning: list[str] = Field(default_factory=list)
    portfolio_insights: list[str] = Field(default_factory=list)
    recommendations: list[dict[str, Any]] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    supporting_facts: list[str] = Field(default_factory=list, description="Key deterministic facts used to answer")
    tools_consulted: list[str] = Field(default_factory=list, description="List of read-only tools invoked")
    web_sources: list[dict[str, str | None]] = Field(
        default_factory=list,
        description="Source links used for time-sensitive external context",
    )
    sources: list[dict[str, str | None]] = Field(default_factory=list)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence in the factual grounding")
    confidence_level: Literal["high", "medium", "low"] = "medium"
    disclaimer: str = Field(
        default="AI portfolio response grounded strictly in verified backend metrics.",
        description="Compliance disclaimer",
    )


class ExtractedHolding(BaseModel):
    isin: str = Field(..., description="12-character ISIN code (e.g. INF209K01157 or INE002A01018)")
    folio_number: str | None = Field(default=None, description="Folio or demat account number")
    scheme_or_stock_name: str = Field(..., description="Name of the security or mutual fund scheme")
    units: float = Field(..., gt=0, description="Quantity or units held")
    nav_or_price: float = Field(..., gt=0, description="NAV or latest market price per unit")
    current_value: float = Field(..., gt=0, description="Current market value in INR")
    asset_type: Literal["MUTUAL_FUND", "STOCK", "ETF", "BOND", "CASH", "OTHER"] = "MUTUAL_FUND"


class ExtractedTransaction(BaseModel):
    date: str = Field(..., description="ISO 8601 transaction date (YYYY-MM-DD)")
    isin: str | None = None
    scheme_or_stock_name: str
    transaction_type: str = Field(..., description="PURCHASE, REDEMPTION, SIP, DIVIDEND_PAYOUT, etc.")
    amount: float = Field(..., gt=0)
    units: float = Field(..., gt=0)
    nav: float = Field(..., gt=0)


class DocumentExtraction(BaseModel):
    investor_name: str | None = None
    pan: str | None = None
    statement_date: str | None = None
    holdings: list[ExtractedHolding] = Field(default_factory=list)
    transactions: list[ExtractedTransaction] = Field(default_factory=list)
    total_valuation: float | None = None
    confidence_score: float = Field(default=0.8, ge=0.0, le=1.0)
    requires_review: bool = False
    review_reasons: list[str] = Field(default_factory=list)


class Insight(BaseModel):
    category: str = Field(..., description="CONCENTRATION, FEES, NOMINEE, SIP, PERFORMANCE, DIVERSIFICATION")
    title: str = Field(..., description="Short title")
    observation: str = Field(..., description="Detailed observation")
    deterministic_basis: str = Field(..., description="Underlying calculation or metric value")
    priority: Literal["HIGH", "MEDIUM", "LOW"] = "MEDIUM"


class RecommendationExplanation(BaseModel):
    title: str
    context: str
    rationale: str
    tradeoffs: list[str] = Field(default_factory=list)
    tax_implication_summary: str | None = None
    disclaimer: str = "Informational analysis only. Consult a registered investment advisor before acting."


class NewsSummary(BaseModel):
    company_name: str
    portfolio_exposure_pct: float
    headline: str
    summary: str
    potential_relevance: str
    source: str
    published_date: str


class RiskExplanation(BaseModel):
    scenario_or_risk_type: str
    deterministic_metric_value: float
    explanation: str
    primary_drivers: list[str] = Field(default_factory=list)
    historical_context: str
    limitations: str


# ============================================================================
# Additional Specialized Schemas
# ============================================================================

class AdvisorReport(BaseModel):
    client_identifier: str
    portfolio_id: str
    generated_at: str
    executive_summary: str
    concentration_analysis: str
    diversification_analysis: str
    fee_audit_summary: str
    nominee_review: str
    sip_review: str
    key_risks: list[str]
    suggested_areas_for_review: list[str]
    disclaimer: str


class TaxRebalanceItem(BaseModel):
    holding_id: str
    holding_name: str
    asset_type: str
    action_type: Literal["REDUCE", "SWITCH", "HOLD", "ADD"]
    suggested_amount: float
    holding_period_category: Literal["LTCG", "STCG"]
    estimated_unrealized_gain: float
    estimated_tax_impact: float
    rationale: str


class TaxRebalanceProposal(BaseModel):
    portfolio_id: str
    total_rebalance_amount: float
    estimated_gross_tax_liability: float
    items: list[TaxRebalanceItem] = Field(default_factory=list)
    tax_optimization_note: str
    execution_disclaimer: str = (
        "STRICTLY NON-EXECUTABLE ADVICE. This system cannot trade or move funds. "
        "Tax calculations reflect prevailing rules (Budget 2024 amendments) and require independent tax counsel verification."
    )


class WhatsAppMessageRequest(BaseModel):
    sender_phone: str = Field(..., description="E.164 phone number of user")
    message: str = Field(..., description="User message text")
    portfolio_id: str | None = Field(default=None, description="Optional portfolio ID context")


class WhatsAppMessageResponse(BaseModel):
    sender_phone: str
    reply_text: str
    tools_used: list[str] = Field(default_factory=list)
    timestamp: str


class IPOAnalysisResponse(BaseModel):
    company_or_scheme_name: str
    issue_type: Literal["IPO", "NFO"]
    existing_portfolio_exposure_value: float
    existing_portfolio_exposure_pct: float
    exposure_breakdown: list[dict[str, Any]] = Field(default_factory=list)
    analysis_narrative: str
    official_sources: list[str] = Field(default_factory=list)


class DriftSignalResponse(BaseModel):
    signal_type: Literal["FOMO_BUYING", "STEALTH_CONCENTRATION_DRIFT", "STYLE_DRIFT"]
    affected_entity: str
    direct_holding_value: float
    indirect_holding_value: float
    combined_exposure_pct: float
    narrative: str
    detected_at: str


class PanicGuardResponse(BaseModel):
    trigger_type: Literal["MARKET_DRAWDOWN", "EXTREME_CONCENTRATION", "HIGH_VOLATILITY", "RAPID_PORTFOLIO_TURNOVER"]
    observed_metric: float
    benchmark_metric: float | None = None
    nudge_narrative: str
    historical_cycles_reference: str
    disclaimer: str = "Historical drawdowns and recovery durations do not guarantee future performance."


class DividendIntelligenceResponse(BaseModel):
    portfolio_id: str
    trailing_12m_dividend_total: float
    estimated_next_12m_dividend_yield: float
    seasonal_peak_months: list[str]
    monthly_projections: dict[str, float]
    summary_narrative: str

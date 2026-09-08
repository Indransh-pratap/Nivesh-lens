from decimal import Decimal
from typing import Any
from sqlalchemy.orm import Session

from app.models.holding import AssetType
from app.models.portfolio import Portfolio
from app.schemas.ai import DividendIntelligenceResponse
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.security import wrap_untrusted_input


def calculate_and_explain_dividends(portfolio: Portfolio, db: Session) -> DividendIntelligenceResponse:
    """
    1. Deterministic Dividend Calculation: Estimates annualized yield and monthly cash flow
       based on holding values and typical historical Indian equity dividend yields (1.2% - 1.5%).
    2. Gemini explains seasonal cash-flow concentration.
       Rule: Gemini does NOT calculate dividend amounts.
    """
    total_val = float(portfolio.total_value or Decimal("0"))
    equity_val = sum(
        float(h.current_value or 0)
        for h in portfolio.holdings
        if h.asset_type in (AssetType.STOCK, AssetType.MUTUAL_FUND)
    )

    # Deterministic calculation of trailing dividend estimate (~1.35% for Indian equities)
    trailing_12m_dividend = round(equity_val * 0.0135, 2)
    est_next_12m_yield = 1.35

    # Seasonality in Indian markets: peak corporate dividends occur post Q4 (May-July) and post Q2 (November)
    monthly_weights = {
        "January": 0.04,
        "February": 0.08,
        "March": 0.06,
        "April": 0.03,
        "May": 0.16,
        "June": 0.20,
        "July": 0.18,
        "August": 0.08,
        "September": 0.04,
        "October": 0.03,
        "November": 0.07,
        "December": 0.03,
    }

    monthly_projections = {
        month: round(trailing_12m_dividend * weight, 2)
        for month, weight in monthly_weights.items()
    }

    peak_months = ["May", "June", "July"]

    prompt = (
        f"DETERMINISTIC CASH FLOW METRICS:\n"
        f"- Portfolio Total Value: ₹{total_val:,.2f}\n"
        f"- Trailing 12M Dividend Estimate: ₹{trailing_12m_dividend:,.2f}\n"
        f"- Estimated Next 12M Dividend Yield: {est_next_12m_yield}%\n"
        f"- Peak Seasonal Months: {peak_months}\n"
        f"- Monthly Cash Flow Breakdown: {monthly_projections}\n\n"
        f"Summarize the seasonality and predictability of this expected passive cash flow."
    )

    system_instruction = (
        "You are a personal wealth cash-flow analyst. "
        "Summarize the seasonal concentration of the investor's dividend cash flow. "
        "Do not modify or recalculate the dividend numbers provided."
    )

    provider = get_llm_provider()
    try:
        summary = provider.generate_text(
            prompt=wrap_untrusted_input(prompt, source_label="dividend_schedule"),
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="fast",
        )
    except Exception:
        summary = (
            f"Your portfolio generates an estimated annual dividend cash flow of ₹{trailing_12m_dividend:,.2f} "
            f"(approx. {est_next_12m_yield}% yield on equity holdings). Cash flow is seasonally concentrated "
            f"in {', '.join(peak_months)}, which typically account for over 50% of annual distributions."
        )

    return DividendIntelligenceResponse(
        portfolio_id=str(portfolio.id),
        trailing_12m_dividend_total=trailing_12m_dividend,
        estimated_next_12m_dividend_yield=est_next_12m_yield,
        seasonal_peak_months=peak_months,
        monthly_projections=monthly_projections,
        summary_narrative=summary.strip(),
    )

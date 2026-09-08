import json
import logging
from decimal import Decimal
from typing import Any
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.schemas.ai import PortfolioExplanation
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.security import wrap_untrusted_input
from app.services.diagnostics.service import build_diagnostics
from app.services.groups.exposure import calculate_group_exposure
from app.services.sip.health import calculate_sip_health

logger = logging.getLogger(__name__)


def generate_portfolio_explanation(portfolio: Portfolio, db: Session) -> PortfolioExplanation:
    """
    Generate an AI narrative explanation of a portfolio from verified deterministic facts.
    Strictly follows Core Rule: Gemini does NOT calculate metrics; it only explains backend facts.
    """
    # 1. Gather deterministic facts
    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    group_data = calculate_group_exposure(db, portfolio.holdings)
    sip_data = calculate_sip_health(db, portfolio.holdings, portfolio.transactions)

    top_exposures = diagnostics.get("top_company_exposures", [])
    top_company = top_exposures[0] if top_exposures else {}
    top_comp_name = top_company.get("company", "None")
    top_comp_pct = round(float(top_company.get("exposure_percent", 0.0)), 2)

    fee_analysis = diagnostics.get("fee_analysis") or {}
    nominee_audit = diagnostics.get("nominee_audit") or {}
    concentration = diagnostics.get("concentration") or {}
    health = diagnostics.get("diversification_score") or {}

    facts = {
        "portfolio_name": portfolio.name,
        "total_value": float(portfolio.total_value or Decimal("0")),
        "holdings_count": len(portfolio.holdings),
        "health_score": health.get("score"),
        "health_rating": health.get("rating"),
        "hhi_score": concentration.get("hhi_score"),
        "hhi_classification": concentration.get("classification"),
        "top_company": top_comp_name,
        "top_company_exposure_pct": top_comp_pct,
        "top_3_companies": [
            {"company": x.get("company"), "pct": round(float(x.get("exposure_percent", 0.0)), 2)}
            for x in top_exposures[:3]
        ],
        "mf_overlap_percentage": round(float(fee_analysis.get("overlap_percentage", 0.0)), 2),
        "annual_regular_commission_bleed": round(float(fee_analysis.get("total_regular_commission_bleed", 0.0)), 2),
        "estimated_duplicate_cost": round(float(fee_analysis.get("estimated_potential_duplicate_cost", 0.0)), 2),
        "nominee_compliance_pct": nominee_audit.get("compliance_percentage", 100.0),
        "nominee_missing_count": nominee_audit.get("accounts_missing", 0),
        "highest_group": group_data.get("highest_group"),
        "total_group_exposure_pct": group_data.get("total_group_exposure_pct", 0.0),
        "portfolio_sip_grade": sip_data.get("portfolio_sip_grade", "N/A"),
        "sips_review_needed": sip_data.get("review_needed_count", 0),
    }

    system_instruction = (
        "You are an expert, objective financial portfolio analyst. "
        "You will be given structured, verified portfolio facts calculated by our deterministic financial engine. "
        "Your task is to explain these facts in clean, plain English for the retail investor. "
        "CRITICAL RULES:\n"
        "1. DO NOT recalculate, modify, or estimate new numbers. Only use the numbers provided in the facts.\n"
        "2. Keep the tone professional, direct, and constructive.\n"
        "3. Emphasize how direct equity and mutual fund look-through combine to create true company concentration.\n"
        "4. Highlight wasted regular plan commissions and nominee gaps if present."
    )

    prompt = (
        f"VERIFIED DETERMINISTIC PORTFOLIO FACTS:\n"
        f"{wrap_untrusted_input(json.dumps(facts, indent=2), source_label='backend_facts')}\n\n"
        f"Generate the PortfolioExplanation JSON structure explaining these exact facts."
    )

    provider = get_llm_provider()
    try:
        explanation = provider.generate_structured(
            prompt=prompt,
            schema=PortfolioExplanation,
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="fast",
        )
        return explanation
    except Exception as exc:
        logger.warning(f"AI explanation generation failed, using deterministic fallback: {exc}")
        # Deterministic Safe Fallback
        headline = (
            f"Portfolio evaluated with Health Score {facts['health_score']} ({facts['health_rating']}) "
            f"and total value of ₹{facts['total_value']:,.2f}."
        )
        summary = (
            f"Your portfolio consists of {facts['holdings_count']} holdings. "
            f"Top company concentration is centered in {facts['top_company']} at {facts['top_company_exposure_pct']}%, "
            f"accounting for both direct holdings and mutual-fund look-through."
        )
        fee_insights = []
        if facts["annual_regular_commission_bleed"] > 0:
            fee_insights.append(
                f"Potential regular commission bleed of ₹{facts['annual_regular_commission_bleed']:,.0f}/yr detected in non-direct plans."
            )
        if facts["mf_overlap_percentage"] > 20:
            fee_insights.append(
                f"Mutual fund overlap is {facts['mf_overlap_percentage']}%, indicating potential duplicate fund expenses."
            )

        actionable = []
        if facts["nominee_missing_count"] > 0:
            actionable.append(f"{facts['nominee_missing_count']} account(s) are missing nominee registration.")
        if facts["sips_review_needed"] > 0:
            actionable.append(f"{facts['sips_review_needed']} active SIP(s) flagged for review due to relative lag or overlap.")

        return PortfolioExplanation(
            headline=headline,
            summary=summary,
            top_risk_factor=f"Company concentration in {facts['top_company']} ({facts['top_company_exposure_pct']}%)",
            concentration_explanation=(
                f"HHI concentration score is {facts['hhi_score']} ({facts['hhi_classification']}). "
                f"Your top holding is {facts['top_company']} at {facts['top_company_exposure_pct']}%."
            ),
            diversification_assessment=(
                f"Health score rating is {facts['health_rating']}. "
                f"Corporate group exposure to {facts['highest_group'] or 'primary conglomerate'} represents {facts['total_group_exposure_pct']}%."
            ),
            fee_insights=fee_insights,
            actionable_observations=actionable,
            disclaimer="Deterministic fallback explanation based strictly on calculated backend facts.",
        )

import logging
from decimal import Decimal
from typing import Any
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.schemas.ai import IPOAnalysisResponse
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.rag.pipeline import query_rag
from app.services.ai.security import wrap_untrusted_input
from app.services.diagnostics.service import build_diagnostics

logger = logging.getLogger(__name__)


def analyze_ipo_nfo_overlap(
    portfolio: Portfolio,
    entity_name: str,
    issue_type: str,
    db: Session,
) -> IPOAnalysisResponse:
    """
    Evaluate user's existing portfolio exposure to an incoming IPO or NFO.
    Calculates deterministic overlap first, queries official prospectus/RAG, and generates AI synthesis.
    """
    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    top_exposures = diagnostics.get("top_company_exposures", [])

    matched_items = []
    total_val = Decimal(str(portfolio.total_value or 0))
    query_norm = entity_name.strip().upper()

    query_tokens = [w for w in query_norm.split() if len(w) > 3 and w not in {"LIMITED", "INDIA", "CORP"}]
    existing_exp_val = Decimal("0")
    for item in top_exposures:
        cname = str(item.get("company", "")).upper()
        if query_norm in cname or cname in query_norm or any(tok in cname for tok in query_tokens):
            eval_val = Decimal(str(item.get("exposure_value", 0)))
            existing_exp_val += eval_val
            matched_items.append(item)

    existing_pct = float(round((existing_exp_val / total_val * Decimal("100")), 2)) if total_val > 0 else 0.0


    # Retrieve official prospectus or categorization rules from RAG
    rag_result = query_rag(f"Official issuance mandate for {entity_name} {issue_type}", topic="IPO")

    prompt = (
        f"INVESTOR OVERLAP ANALYSIS FOR {issue_type} - {entity_name}:\n"
        f"- Total Portfolio Value: ₹{float(total_val):,.2f}\n"
        f"- Existing Exposure to {entity_name}: ₹{float(existing_exp_val):,.2f} ({existing_pct:.2f}%)\n"
        f"- Contributing Source Holdings: {matched_items}\n\n"
        f"OFFICIAL CONTEXT:\n{rag_result.answer}\n\n"
        f"Explain whether applying for this {issue_type} would increase concentration or duplicate existing exposure."
    )

    system_instruction = (
        "You are an IPO/NFO investment analyst. "
        "Explain the deterministic exposure numbers provided. "
        "If the investor already holds exposure via mutual funds or direct equity, explicitly warn about stealth duplication."
    )

    provider = get_llm_provider()
    try:
        explanation = provider.generate_text(
            prompt=wrap_untrusted_input(prompt, source_label="ipo_overlap_data"),
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="fast",
        )
    except Exception:
        if existing_pct > 0:
            explanation = (
                f"You already hold approximately ₹{float(existing_exp_val):,.0f} ({existing_pct:.1f}%) exposure "
                f"to {entity_name} across your portfolio holdings. Adding this {issue_type} will further increase your concentration."
            )
        else:
            explanation = (
                f"You currently have no significant direct or mutual-fund look-through exposure to {entity_name}. "
                f"Participating in this {issue_type} would represent a new addition to your portfolio allocation."
            )

    return IPOAnalysisResponse(
        company_or_scheme_name=entity_name,
        issue_type="IPO" if issue_type.upper() == "IPO" else "NFO",
        existing_portfolio_exposure_value=float(existing_exp_val),
        existing_portfolio_exposure_pct=existing_pct,
        exposure_breakdown=matched_items,
        analysis_narrative=explanation.strip(),
        official_sources=[m.title for m in rag_result.cited_sources],
    )

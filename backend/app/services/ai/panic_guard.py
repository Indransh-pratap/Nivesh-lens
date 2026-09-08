import logging
from typing import Any
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.schemas.ai import PanicGuardResponse
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.security import wrap_untrusted_input
from app.services.diagnostics.service import build_diagnostics

logger = logging.getLogger(__name__)


def evaluate_panic_guard(portfolio: Portfolio, db: Session) -> PanicGuardResponse | None:
    """
    1. Deterministic Rule Evaluator: Tests for panic triggers (extreme concentration, steep drawdowns).
    2. Gemini generates an empathetic, rational behavioral nudge referencing historical market cycles.
       Rule: Never promises guaranteed future returns; never uses coercive language.
    """
    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    top_exposures = diagnostics.get("top_company_exposures", [])
    concentration = diagnostics.get("concentration", {})

    max_comp_pct = float(top_exposures[0].get("exposure_percent", 0.0)) if top_exposures else 0.0
    hhi = float(concentration.get("hhi_score", 0.0) or 0.0)

    trigger_type = None
    observed_metric = 0.0

    if max_comp_pct > 35.0:
        trigger_type = "EXTREME_CONCENTRATION"
        observed_metric = max_comp_pct
    elif hhi > 2500:
        trigger_type = "HIGH_VOLATILITY"
        observed_metric = hhi

    if not trigger_type:
        return None

    prompt = (
        f"BEHAVIORAL TRIGGER DETECTED:\n"
        f"- Trigger Type: {trigger_type}\n"
        f"- Observed Metric Value: {observed_metric:.1f}\n\n"
        f"Generate a calm, objective behavioral finance nudge. "
        f"Remind the investor that sudden reallocations in volatile or concentrated periods carry execution risks, "
        f"referencing historical Indian market cycle recoveries without guaranteeing future outcomes."
    )

    system_instruction = (
        "You are a behavioral finance coach. "
        "Provide a calm, non-manipulative psychological reminder about market cycles and concentration risk. "
        "Do NOT guarantee future returns or promise recovery."
    )

    provider = get_llm_provider()
    try:
        nudge = provider.generate_text(
            prompt=wrap_untrusted_input(prompt, source_label="panic_triggers"),
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="fast",
        )
    except Exception:
        nudge = (
            f"Your portfolio exhibits high concentration ({observed_metric:.1f}% in top holdings). "
            "Before taking reactive steps during market corrections, consider that disciplined rebalancing "
            "based on target asset allocation has historically provided superior risk-adjusted outcomes over multi-year cycles."
        )

    return PanicGuardResponse(
        trigger_type=trigger_type,  # type: ignore
        observed_metric=observed_metric,
        nudge_narrative=nudge.strip(),
        historical_cycles_reference="Indian equity indices (NIFTY 50) have traversed multiple 15-30% drawdowns historically with eventual recovery cycles.",
        disclaimer="Historical drawdowns and recovery durations do not guarantee future performance.",
    )

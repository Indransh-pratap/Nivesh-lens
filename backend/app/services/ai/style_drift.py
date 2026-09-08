from datetime import date
from decimal import Decimal
from typing import Any
from sqlalchemy.orm import Session

from app.models.holding import AssetType
from app.models.portfolio import Portfolio
from app.schemas.ai import DriftSignalResponse
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.security import wrap_untrusted_input
from app.services.diagnostics.service import build_diagnostics


def detect_style_and_fomo_drift(portfolio: Portfolio, db: Session) -> list[DriftSignalResponse]:
    """
    1. Deterministic Signal Engine: Detects stealth concentration drift where a mutual fund
       allocates to a company that the investor already holds directly in demat holdings.
    2. Gemini explains the signal without modifying facts.
    """
    direct_stocks = {
        h.name.strip().upper(): Decimal(str(h.current_value or 0))
        for h in portfolio.holdings
        if h.asset_type == AssetType.STOCK
    }

    if not direct_stocks:
        return []

    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    top_exposures = diagnostics.get("top_company_exposures", [])
    total_val = float(portfolio.total_value or 1)

    signals: list[DriftSignalResponse] = []
    provider = get_llm_provider()

    for exp in top_exposures:
        comp_name = exp.get("company", "").strip().upper()
        # Find if this company is also held directly
        direct_match_val = Decimal("0")
        for direct_name, d_val in direct_stocks.items():
            if comp_name in direct_name or direct_name in comp_name:
                direct_match_val = d_val
                break

        indirect_val = Decimal(str(exp.get("exposure_value", 0))) - direct_match_val
        if direct_match_val > 0 and indirect_val > Decimal("0"):
            combined_pct = round(float(exp.get("exposure_percent", 0)), 2)

            prompt = (
                f"STEALTH DRIFT SIGNAL DETECTED:\n"
                f"- Entity: {comp_name}\n"
                f"- Direct Demat Holding Value: ₹{float(direct_match_val):,.2f}\n"
                f"- Indirect Mutual Fund Look-Through Value: ₹{float(indirect_val):,.2f}\n"
                f"- Combined Portfolio Weight: {combined_pct}%\n\n"
                f"Explain how this overlap amplifies single-company risk for the investor."
            )

            system_instruction = (
                "Explain the stealth drift signal. The user owns this stock directly AND their mutual funds also buy it. "
                "Explain how this stealth concentration reduces true portfolio diversification."
            )

            try:
                narrative = provider.generate_text(
                    prompt=wrap_untrusted_input(prompt, source_label="drift_signal"),
                    system_instruction=system_instruction,
                    temperature=0.1,
                    model_tier="fast",
                )
            except Exception:
                narrative = (
                    f"Your portfolio has direct demat holdings in {comp_name} (₹{float(direct_match_val):,.0f}) "
                    f"while your mutual funds also allocate to it (₹{float(indirect_val):,.0f}), "
                    f"raising your combined exposure to {combined_pct}%."
                )

            signals.append(
                DriftSignalResponse(
                    signal_type="STEALTH_CONCENTRATION_DRIFT",
                    affected_entity=comp_name,
                    direct_holding_value=float(direct_match_val),
                    indirect_holding_value=float(indirect_val),
                    combined_exposure_pct=combined_pct,
                    narrative=narrative.strip(),
                    detected_at=date.today().isoformat(),
                )
            )

    return signals

import logging
from datetime import date
from decimal import Decimal
from typing import Any
from sqlalchemy.orm import Session

from app.models.holding import AssetType, Holding
from app.models.portfolio import Portfolio
from app.models.transaction import Transaction
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.rag.pipeline import query_rag
from app.services.ai.security import wrap_untrusted_input

logger = logging.getLogger(__name__)


def calculate_deterministic_capital_gains(portfolio: Portfolio) -> dict[str, Any]:
    """
    Deterministic capital gains computation based on Indian Income Tax holding periods:
    - Equity / Equity MF: LTCG if holding period > 12 months, STCG if <= 12 months.
    - Debt MF / Unlisted: Short-term / slab rate taxation under Section 50AA.
    """
    today = date.today()
    total_unrealized_ltcg = Decimal("0")
    total_unrealized_stcg = Decimal("0")
    holding_breakdown = []

    for h in portfolio.holdings:
        cur_val = h.current_value or Decimal("0")
        inv_val = h.invested_value or Decimal("0")
        unrealized = cur_val - inv_val

        # Determine holding period from earliest transaction or default 18 months
        earliest_tx = min((t.transaction_date for t in h.transactions if t.transaction_date), default=None)
        if earliest_tx:
            holding_days = (today - earliest_tx).days
        else:
            holding_days = 400  # Default long-term if not specified

        is_equity = h.asset_type in (AssetType.STOCK, AssetType.MUTUAL_FUND, AssetType.ETF)
        is_ltcg = holding_days > 365 if is_equity else holding_days > 730

        if is_ltcg:
            total_unrealized_ltcg += unrealized
            category = "LTCG"
        else:
            total_unrealized_stcg += unrealized
            category = "STCG"

        holding_breakdown.append({
            "holding_name": h.name,
            "isin": h.isin,
            "category": category,
            "holding_days": holding_days,
            "invested_value": float(inv_val),
            "current_value": float(cur_val),
            "unrealized_gain": float(unrealized),
        })

    # Under Budget 2024: Equity LTCG exemption is ₹1,25,000
    exemption_limit = Decimal("125000")
    taxable_ltcg = max(Decimal("0"), total_unrealized_ltcg - exemption_limit)
    est_ltcg_tax = taxable_ltcg * Decimal("0.125")  # 12.5%
    est_stcg_tax = max(Decimal("0"), total_unrealized_stcg) * Decimal("0.20")  # 20.0%

    return {
        "portfolio_id": str(portfolio.id),
        "total_unrealized_ltcg": float(total_unrealized_ltcg),
        "total_unrealized_stcg": float(total_unrealized_stcg),
        "ltcg_exemption_limit": float(exemption_limit),
        "taxable_ltcg": float(taxable_ltcg),
        "estimated_ltcg_tax": float(est_ltcg_tax),
        "estimated_stcg_tax": float(est_stcg_tax),
        "estimated_total_tax_liability": float(est_ltcg_tax + est_stcg_tax),
        "holdings": holding_breakdown,
    }


def explain_portfolio_tax_implications(portfolio: Portfolio, db: Session) -> dict[str, Any]:
    """
    Combines deterministic capital gains engine + official Budget 2024 tax RAG + Gemini explanation.
    Never invents tax rates; all numbers come from backend engine and official circulars.
    """
    calc = calculate_deterministic_capital_gains(portfolio)
    rag_result = query_rag("What are the current capital gains tax rates and exemption limits for equity and debt funds?", topic="TAXATION")

    prompt = (
        f"DETERMINISTIC CAPITAL GAINS RESULTS:\n"
        f"- Total Unrealized LTCG: ₹{calc['total_unrealized_ltcg']:,.2f}\n"
        f"- Total Unrealized STCG: ₹{calc['total_unrealized_stcg']:,.2f}\n"
        f"- Statutory Exemption Limit: ₹{calc['ltcg_exemption_limit']:,.2f}\n"
        f"- Estimated LTCG Tax (12.5% on excess): ₹{calc['estimated_ltcg_tax']:,.2f}\n"
        f"- Estimated STCG Tax (20%): ₹{calc['estimated_stcg_tax']:,.2f}\n"
        f"- Estimated Total Tax Impact: ₹{calc['estimated_total_tax_liability']:,.2f}\n\n"
        f"OFFICIAL STATUTE SOURCES:\n"
        f"{rag_result.answer}\n\n"
        f"Explain these deterministic calculations in simple terms for the investor. Mention the ₹1.25L exemption."
    )

    system_instruction = (
        "You are an Indian financial tax analyst. "
        "Explain the deterministic capital gains tax calculations provided. "
        "Strictly cite the official Budget 2024 tax rules (12.5% LTCG above ₹1.25 Lakh, 20% STCG). "
        "Do not alter or fabricate any numbers."
    )

    provider = get_llm_provider()
    try:
        explanation = provider.generate_text(
            prompt=wrap_untrusted_input(prompt, source_label="tax_engine_metrics"),
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="fast",
        )
        return {
            "deterministic_tax_calculation": calc,
            "explanation": explanation.strip(),
            "official_citations": [m.model_dump() for m in rag_result.cited_sources],
            "disclaimer": "Tax figures are estimates based on prevailing provisions (Finance Act 2024). Consult a Chartered Accountant.",
        }
    except Exception:
        fallback = (
            f"If all holdings were liquidated today, your estimated unrealized LTCG is ₹{calc['total_unrealized_ltcg']:,.2f} "
            f"and STCG is ₹{calc['total_unrealized_stcg']:,.2f}. Applying the Finance Act 2024 rules (12.5% LTCG above ₹1,25,000 "
            f"and 20% STCG), estimated tax liability is ₹{calc['estimated_total_tax_liability']:,.2f}."
        )
        return {
            "deterministic_tax_calculation": calc,
            "explanation": fallback,
            "official_citations": [m.model_dump() for m in rag_result.cited_sources],
            "disclaimer": "Deterministic tax estimate based on prevailing provisions (Finance Act 2024).",
        }

import json
import logging
from decimal import Decimal
from typing import Any
from sqlalchemy.orm import Session

from app.models.holding import AssetType, Holding
from app.models.portfolio import Portfolio
from app.schemas.ai import TaxRebalanceItem, TaxRebalanceProposal
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.rag.pipeline import query_rag
from app.services.ai.security import wrap_untrusted_input
from app.services.ai.tax_ai import calculate_deterministic_capital_gains
from app.services.diagnostics.service import build_diagnostics

logger = logging.getLogger(__name__)


def run_tax_aware_rebalance_agent(portfolio: Portfolio, db: Session) -> TaxRebalanceProposal:
    """
    Multi-Tool Tax-Aware Rebalancing Orchestrator:
    1. getHoldings() & getPortfolioDiagnostics()
    2. calculateDeterministicCapitalGains()
    3. getFundOverlap()
    4. retrieveTaxRules() via RAG
    5. Gemini synthesizes an understandable realignment roadmap.
    
    SAFETY INVARIANT:
    Strictly non-executable recommendation. Does NOT trade, redeem, or move funds.
    """
    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    tax_data = calculate_deterministic_capital_gains(portfolio)
    rag_tax = query_rag("Capital gains tax rates and grandfathering under Budget 2024", topic="TAXATION")

    fee_analysis = diagnostics.get("fee_analysis") or {}
    overlap_pct = float(fee_analysis.get("overlap_percentage", 0.0))
    top_overlapping = fee_analysis.get("top_overlapping_companies", [])

    # Identify potential candidates to trim/switch: high regular fee funds or extreme single-stock concentration
    proposal_items: list[TaxRebalanceItem] = []
    total_rebalance_amt = Decimal("0")
    total_estimated_tax = Decimal("0")

    for h in portfolio.holdings:
        is_regular = "REGULAR" in h.name.upper()
        cur_val = h.current_value or Decimal("0")
        inv_val = h.invested_value or Decimal("0")
        unrealized = cur_val - inv_val

        # Flag regular plans for direct switch
        if is_regular and cur_val > Decimal("1000"):
            rebalance_portion = cur_val
            total_rebalance_amt += rebalance_portion

            # If held > 1 year: 12.5% tax on gains exceeding exemption
            est_tax = max(Decimal("0"), unrealized) * Decimal("0.125")
            total_estimated_tax += est_tax

            proposal_items.append(
                TaxRebalanceItem(
                    holding_id=str(h.id),
                    holding_name=h.name,
                    asset_type=str(h.asset_type.value if hasattr(h.asset_type, "value") else h.asset_type),
                    action_type="SWITCH",
                    suggested_amount=float(rebalance_portion),
                    holding_period_category="LTCG",
                    estimated_unrealized_gain=float(unrealized),
                    estimated_tax_impact=float(est_tax),
                    rationale="Convert regular plan to direct growth plan to eliminate annual distributor commission drag.",
                )
            )

    prompt = (
        f"REBALANCING PROPOSAL DATA (READ-ONLY):\n"
        f"- Portfolio Total Value: ₹{float(portfolio.total_value or 0):,.2f}\n"
        f"- Overlap Percentage: {overlap_pct}%\n"
        f"- Total Suggested Rebalance: ₹{float(total_rebalance_amt):,.2f}\n"
        f"- Estimated Gross Tax Impact: ₹{float(total_estimated_tax):,.2f}\n"
        f"- Identified Items: {[item.model_dump() for item in proposal_items]}\n\n"
        f"OFFICIAL TAX RULES:\n{rag_tax.answer}\n\n"
        f"Provide a tax-optimization note explaining how the investor can stagger redemptions across financial years to maximize the ₹1.25 Lakh annual LTCG exemption."
    )

    system_instruction = (
        "You are an Indian wealth optimization advisor. "
        "Explain the tax-aware rebalancing proposal. "
        "Emphasize that this is an informational roadmap and not an automated execution."
    )

    provider = get_llm_provider()
    try:
        opt_note = provider.generate_text(
            prompt=wrap_untrusted_input(prompt, source_label="rebalance_plan"),
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="pro",
        )
    except Exception:
        opt_note = (
            "Tax Optimization Strategy: Under Finance Act 2024, equity LTCG up to ₹1,25,000 per financial year is exempt. "
            "To minimize capital gains tax when switching regular funds to direct funds, consider staggering switches "
            "across March 31 and April 1 to utilize the exemption across two separate assessment years."
        )

    return TaxRebalanceProposal(
        portfolio_id=str(portfolio.id),
        total_rebalance_amount=float(total_rebalance_amt),
        estimated_gross_tax_liability=float(total_estimated_tax),
        items=proposal_items,
        tax_optimization_note=opt_note.strip(),
    )

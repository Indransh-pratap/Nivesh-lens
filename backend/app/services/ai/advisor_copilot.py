import datetime
import json
import logging
from decimal import Decimal
from typing import Any
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.schemas.ai import AdvisorReport
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.security import wrap_untrusted_input
from app.services.benchmarking.engine import calculate_portfolio_benchmark
from app.services.diagnostics.service import build_diagnostics
from app.services.groups.exposure import calculate_group_exposure
from app.services.sip.health import calculate_sip_health

logger = logging.getLogger(__name__)


def generate_advisor_copilot_report(
    portfolio: Portfolio,
    client_name: str,
    db: Session,
) -> AdvisorReport:
    """
    Generate professional, audit-ready advisor narrative sections from validated portfolio metrics.
    Feeds structured narrative blocks into executive review memos or the diagnostic PDF generator.
    """
    diagnostics = build_diagnostics(str(portfolio.id), portfolio.holdings, portfolio.total_value, db=db)
    group_data = calculate_group_exposure(db, portfolio.holdings)
    sip_data = calculate_sip_health(db, portfolio.holdings, portfolio.transactions)
    benchmark_data = calculate_portfolio_benchmark(db, portfolio.holdings)

    fee_analysis = diagnostics.get("fee_analysis") or {}
    nominee_audit = diagnostics.get("nominee_audit") or {}
    concentration = diagnostics.get("concentration") or {}
    health = diagnostics.get("diversification_score") or {}
    top_exposures = diagnostics.get("top_company_exposures", [])

    metrics_payload = {
        "client_name": client_name,
        "portfolio_name": portfolio.name,
        "total_value": float(portfolio.total_value or Decimal("0")),
        "health_score": health.get("score"),
        "health_grade": health.get("rating"),
        "hhi_score": concentration.get("hhi_score"),
        "hhi_classification": concentration.get("classification"),
        "top_company": top_exposures[0].get("company") if top_exposures else "None",
        "top_company_exposure_pct": round(float(top_exposures[0].get("exposure_percent", 0.0)), 2) if top_exposures else 0.0,
        "mf_overlap_pct": round(float(fee_analysis.get("overlap_percentage", 0.0)), 2),
        "annual_regular_bleed": round(float(fee_analysis.get("total_regular_commission_bleed", 0.0)), 2),
        "nominee_compliance_pct": nominee_audit.get("compliance_percentage", 100.0),
        "nominee_missing_accounts": nominee_audit.get("accounts_missing", 0),
        "active_sips_count": sip_data.get("active_sips_count", 0),
        "sip_portfolio_grade": sip_data.get("portfolio_sip_grade", "A"),
        "benchmark_relative_position": benchmark_data.get("relative_position", "MODERATE"),
        "highest_group": group_data.get("highest_group"),
        "total_group_exposure_pct": group_data.get("total_group_exposure_pct", 0.0),
    }

    system_instruction = (
        "You are an institutional wealth management copilot assisting a SEBI-registered investment advisor. "
        "Draft a formal, rigorous portfolio review memo. "
        "Strictly adhere to the provided metrics. Do not fabricate or estimate numbers not present in the metrics."
    )

    prompt = (
        f"CLIENT PORTFOLIO AUDIT METRICS:\n"
        f"{wrap_untrusted_input(json.dumps(metrics_payload, indent=2), source_label='advisor_metrics')}\n\n"
        f"Generate the full AdvisorReport JSON structure."
    )

    provider = get_llm_provider()
    try:
        report = provider.generate_structured(
            prompt=prompt,
            schema=AdvisorReport,
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="pro",
        )
        return report
    except Exception as exc:
        logger.warning(f"Advisor report generation fallback triggered: {exc}")
        return AdvisorReport(
            client_identifier=client_name,
            portfolio_id=str(portfolio.id),
            generated_at=datetime.date.today().isoformat(),
            executive_summary=(
                f"Client portfolio valued at ₹{metrics_payload['total_value']:,.2f} displays an overall Health Score of "
                f"{metrics_payload['health_score']} ({metrics_payload['health_grade']}). Core allocation is balanced, "
                f"with identifiable concentration in {metrics_payload['top_company']}."
            ),
            concentration_analysis=(
                f"HHI index stands at {metrics_payload['hhi_score']} ({metrics_payload['hhi_classification']}). "
                f"Top holding {metrics_payload['top_company']} accounts for {metrics_payload['top_company_exposure_pct']}% of total portfolio value."
            ),
            diversification_analysis=(
                f"Relative to the Indian retail baseline, the portfolio holds a {metrics_payload['benchmark_relative_position']} position. "
                f"Conglomerate exposure in {metrics_payload['highest_group'] or 'top corporate group'} accounts for {metrics_payload['total_group_exposure_pct']}%."
            ),
            fee_audit_summary=(
                f"Active mutual fund overlap is {metrics_payload['mf_overlap_pct']}%. "
                f"Annual regular plan distributor commission bleed is estimated at ₹{metrics_payload['annual_regular_bleed']:,.0f}."
            ),
            nominee_review=(
                f"Nominee compliance is at {metrics_payload['nominee_compliance_pct']:.1f}%. "
                f"{metrics_payload['nominee_missing_accounts']} account(s) require nominee registration to mitigate inheritance disputes."
            ),
            sip_review=(
                f"SIP portfolio holds grade '{metrics_payload['sip_portfolio_grade']}' across {metrics_payload['active_sips_count']} active SIP mandate(s)."
            ),
            key_risks=[
                f"Single stock concentration in {metrics_payload['top_company']}",
                f"Regular plan commission fee drag (₹{metrics_payload['annual_regular_bleed']:,.0f}/yr)",
            ],
            suggested_areas_for_review=[
                "Transition regular mutual fund folios to direct growth plans.",
                "Review nominee registrations for compliance.",
            ],
            disclaimer="Advisor Copilot report compiled from verified deterministic metrics. Not standalone financial advice.",
        )

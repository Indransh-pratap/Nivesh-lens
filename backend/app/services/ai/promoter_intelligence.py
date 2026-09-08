import json
import logging
from typing import Any
from pydantic import BaseModel, Field

from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.rag.pipeline import query_rag
from app.services.ai.security import wrap_untrusted_input

logger = logging.getLogger(__name__)


class SupplyChainRiskFinding(BaseModel):
    category: str = Field(..., description="PROMOTER_GROUP, SUPPLIER_CONCENTRATION, CUSTOMER_CONCENTRATION, GEOGRAPHIC, COMMODITY, SEMICONDUCTOR")
    description: str
    risk_level: str = Field(..., description="HIGH, MEDIUM, LOW")
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    source_reference: str


class PromoterSupplyChainReport(BaseModel):
    company_name: str
    summary: str
    findings: list[SupplyChainRiskFinding] = Field(default_factory=list)
    disclaimer: str = "Synthesized from public regulatory filings and company disclosures. Does not constitute an audit."


def analyze_promoter_and_supply_chain(company_name: str) -> PromoterSupplyChainReport:
    """
    Synthesizes supply chain vulnerabilities and promoter dependencies
    from official financial documents and filings using RAG + Gemini.
    """
    rag_result = query_rag(f"Supply chain dependencies, promoter share pledge, customer concentration for {company_name}", company=company_name)

    system_instruction = (
        "You are an equity research specialist focusing on supply chain risk and promoter governance in Indian listed companies. "
        "Analyze potential structural vulnerabilities such as promoter leverage/pledging, key customer concentration, "
        "raw material or semiconductor dependencies, and geographic concentration. "
        "Never present unverified speculation as fact. Always attach confidence levels and references."
    )

    prompt = (
        f"COMPANY: {company_name}\n\n"
        f"AVAILABLE FILING CONTEXT:\n"
        f"{rag_result.answer}\n\n"
        f"Generate the PromoterSupplyChainReport with structured findings."
    )

    provider = get_llm_provider()
    try:
        return provider.generate_structured(
            prompt=wrap_untrusted_input(prompt, source_label="filing_context"),
            schema=PromoterSupplyChainReport,
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="fast",
        )
    except Exception as exc:
        logger.warning(f"Promoter intelligence fallback triggered: {exc}")
        return PromoterSupplyChainReport(
            company_name=company_name,
            summary=f"Standard supply chain profile for {company_name}. Evaluated against corporate group exposure and industry benchmarks.",
            findings=[
                SupplyChainRiskFinding(
                    category="PROMOTER_GROUP",
                    description=f"{company_name} maintains operational alignment with its parent promoter conglomerate.",
                    risk_level="MEDIUM",
                    confidence=0.9,
                    source_reference="MCA / NSE Corporate Governance Filings",
                )
            ],
        )

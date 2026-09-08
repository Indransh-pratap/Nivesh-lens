import json
import logging
import re
import uuid
from typing import Any
from sqlalchemy.orm import Session

from app.schemas.ai import PortfolioAnswer
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.security import wrap_untrusted_input
from app.services.ai import tools

logger = logging.getLogger(__name__)


def _detect_tools_for_query(query: str) -> list[tuple[str, dict[str, Any]]]:
    """
    Deterministically classify user intent and map to appropriate read-only tools.
    Always pairs specific tools with getPortfolioSummary for comprehensive grounding.
    """
    q = query.lower()
    selected = []

    # 1. Company Exposure / Specific Stock Look-through
    companies = ["reliance", "tcs", "infosys", "hdfc", "icici", "itc", "tata", "adani", "l&t", "bharti", "sbi", "kotak", "wipro"]
    matched_company = None
    for c in companies:
        if c in q:
            matched_company = c.title()
            break

    if matched_company or any(w in q for w in ["exposure", "company", "stock", "holding", "concentration", "top stock"]):
        selected.append(("getCompanyExposure", {"company_name": matched_company}))

    # 2. Overlap / Duplicate funds
    if any(w in q for w in ["overlap", "duplicate", "redundant", "same fund", "repeat", "schemes"]):
        selected.append(("getFundOverlap", {}))

    # 3. Health score / Diversification / Concentration
    if any(w in q for w in ["health", "score", "rating", "grade", "diversif", "hhi", "concentration", "safe"]):
        selected.append(("getHealthScore", {}))
        selected.append(("getHHI", {}))

    # 4. SIP review
    if any(w in q for w in ["sip", "systematic", "monthly", "installment"]):
        selected.append(("getSIPHealth", {}))

    # 5. Nominee audit
    if any(w in q for w in ["nominee", "legal", "heir", "claim", "compliance", "sebi"]):
        selected.append(("getNomineeAudit", {}))

    # 6. Group exposure
    if any(w in q for w in ["group", "conglomerate", "house of", "tata group", "adani group", "reliance group"]):
        selected.append(("getGroupExposure", {}))

    # 7. Stress test / Crash / Market Drops / NIFTY sensitivity
    if any(w in q for w in ["stress", "crash", "covid", "crisis", "bear", "fall", "down", "drop", "drops", "dropping", "nifty", "market", "correction", "drawdown", "loss"]):
        scenario = "COVID_2020"
        if "2008" in q or "lehman" in q:
            scenario = "CRISIS_2008"
        elif "2022" in q:
            scenario = "BEAR_2022"
        selected.append(("getStressTest", {"scenario_id": scenario}))

    # 8. Fund swap / simulation
    if any(w in q for w in ["swap", "replace", "switch", "remove"]):
        selected.append(("getFundSimulation", {"target_holding_id": "auto", "replacement_scheme_code": "120503"}))

    # Always ensure getPortfolioSummary is included as foundational context
    if ("getPortfolioSummary", {}) not in selected:
        selected.insert(0, ("getPortfolioSummary", {}))

    return selected


def ask_my_portfolio(
    portfolio_id: str | uuid.UUID,
    question: str,
    db: Session,
) -> PortfolioAnswer:
    """
    Natural-language portfolio assistant orchestrator:
    1. Intent classification
    2. Read-only deterministic tool execution
    3. Gemini answer generation from tool outputs
    4. Validation against PortfolioAnswer schema
    """
    tool_specs = _detect_tools_for_query(question)
    tool_results: dict[str, Any] = {}
    tools_consulted: list[str] = []

    for tool_name, kwargs in tool_specs:
        tools_consulted.append(tool_name)
        if tool_name == "getPortfolioSummary":
            tool_results[tool_name] = tools.get_portfolio_summary(portfolio_id, db)
        elif tool_name == "getCompanyExposure":
            tool_results[tool_name] = tools.get_company_exposure(portfolio_id, db, company_name=kwargs.get("company_name"))
        elif tool_name == "getFundOverlap":
            tool_results[tool_name] = tools.get_fund_overlap(portfolio_id, db)
        elif tool_name == "getHHI":
            tool_results[tool_name] = tools.get_hhi(portfolio_id, db)
        elif tool_name == "getHealthScore":
            tool_results[tool_name] = tools.get_health_score(portfolio_id, db)
        elif tool_name == "getNomineeAudit":
            tool_results[tool_name] = tools.get_nominee_audit(portfolio_id, db)
        elif tool_name == "getGroupExposure":
            tool_results[tool_name] = tools.get_group_exposure(portfolio_id, db)
        elif tool_name == "getSIPHealth":
            tool_results[tool_name] = tools.get_sip_health(portfolio_id, db)
        elif tool_name == "getStressTest":
            tool_results[tool_name] = tools.get_stress_test(portfolio_id, db, scenario_id=kwargs.get("scenario_id", "COVID_2020"))
        elif tool_name == "getFundSimulation":
            tool_results[tool_name] = tools.get_fund_simulation(
                portfolio_id, db,
                target_holding_id=kwargs.get("target_holding_id", "1"),
                replacement_scheme_code=kwargs.get("replacement_scheme_code", "120503"),
            )

    system_instruction = (
        "You are the Nivesh Lens AI Portfolio Diagnostic Assistant for Indian investors. "
        "You have access to verified deterministic backend tool outputs for this user's portfolio. "
        "CRITICAL RULES:\n"
        "1. GROUNDING: Use the tool outputs as the source of truth for portfolio figures (total value, holdings, returns, drawdowns, weights, overlap percentages, health scores). Never hallucinate numbers.\n"
        "2. PRACTICAL SENSITIVITY: If the user asks about hypothetical market drops (e.g. 'What happens if NIFTY drops 15%?'), use their total portfolio value, equity exposure, and the stress-test drawdown data from the tool outputs to explain the expected portfolio impact, estimated drawdown range, and protective factors.\n"
        "3. DIRECT & EMPATHETIC: Answer directly in clear, accessible language. Do not state that information is unavailable if the tool metrics provide the basis to assess the scenario.\n"
        "4. SUPPORTING FACTS: Extract the relevant numerical facts from the tool results into the supporting_facts array.\n"
        "5. LANGUAGE: If the user asks in Hindi or Hinglish, feel free to respond with a warm, natural explanation."
    )

    prompt = (
        f"USER QUESTION: {question}\n\n"
        f"READ-ONLY TOOL EXECUTION RESULTS:\n"
        f"{wrap_untrusted_input(json.dumps(tool_results, indent=2), source_label='tool_outputs')}\n\n"
        f"Answer the user question comprehensively and directly using these exact tool outputs."
    )

    provider = get_llm_provider()
    try:
        ans = provider.generate_structured(
            prompt=prompt,
            schema=PortfolioAnswer,
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="fast",
        )
        ans.tools_consulted = tools_consulted
        ans.question = question
        return ans

    except Exception as exc:
        logger.warning(f"Ask My Portfolio LLM call failed, returning deterministic answer: {exc}")
        # Deterministic Safe Fallback
        facts = []
        summary_text = "Based on your verified portfolio analytics: "
        if "getPortfolioSummary" in tool_results:
            p_sum = tool_results["getPortfolioSummary"]
            facts.append(f"Total value: ₹{p_sum.get('total_value', 0):,.2f} across {p_sum.get('holdings_count', 0)} holdings.")
        if "getHealthScore" in tool_results:
            hs = tool_results["getHealthScore"]
            facts.append(f"Portfolio Health Score: {hs.get('score')} ({hs.get('rating')}).")
        if "getCompanyExposure" in tool_results:
            ce = tool_results["getCompanyExposure"]
            if ce.get("found"):
                m = ce.get("matches", [])[0]
                facts.append(f"Exposure to {m.get('company')}: {m.get('exposure_percent', 0):.1f}% (₹{m.get('exposure_value', 0):,.0f}).")
            elif ce.get("top_company_exposures"):
                top = ce["top_company_exposures"][0]
                facts.append(f"Top company holding is {top.get('company')} at {top.get('exposure_percent', 0):.1f}%.")
        if "getFundOverlap" in tool_results:
            fo = tool_results["getFundOverlap"]
            facts.append(f"Mutual fund overlap: {fo.get('overlap_percentage', 0):.1f}%.")

        ans_str = " ".join(facts) if facts else "Your portfolio details are available in the dashboard."
        return PortfolioAnswer(
            question=question,
            answer=ans_str,
            supporting_facts=facts or ["Extracted from deterministic portfolio tools."],
            tools_consulted=tools_consulted,
            confidence=0.9,
            disclaimer="Deterministic fallback answer grounded in backend calculations.",
        )

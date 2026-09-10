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
from app.services.ai.web_research import research_question
from app.models.holding import Holding
from app.services.ai.intent import classify_query
from app.services.ai.provider.mock import MockLLMProvider

logger = logging.getLogger(__name__)


def _grounded_response(intent: str, question: str, results: dict[str, Any], sources: list[Any]) -> PortfolioAnswer:
    summary = results.get("getPortfolioSummary", {})
    total = float(summary.get("total_value") or 0)
    funds = results.get("getMutualFundContext", {})
    current = funds.get("current_funds", [])
    available = funds.get("available_funds", [])
    overlap = results.get("getFundOverlap", {})
    health = results.get("getHealthScore", {})
    hhi = results.get("getHHI", {})
    facts: list[str] = []
    insights: list[str] = []
    risks: list[str] = []
    recs: list[dict[str, Any]] = []

    if intent in {"MUTUAL_FUND_RECOMMENDATION", "MUTUAL_FUND_ANALYSIS"}:
        current_categories = {str(f.get("category") or "Unknown") for f in current}
        facts.append(f"Your portfolio has {len(current)} mutual-fund holding(s) within a total value of ₹{total:,.0f}.")
        facts.append(f"Current mutual-fund overlap is {float(overlap.get('overlap_percentage') or 0):.1f}%.")
        candidates = []
        for fund in available:
            category = fund.get("category") or "Unclassified"
            if category not in current_categories and category not in {c["category"] for c in candidates}:
                candidates.append({"fund_name": fund.get("scheme_name"), "category": category, "role": "Potential diversification candidate", "why": f"Adds a category not currently identified in your holdings; verify suitability before investing."})
        recs = candidates[:3]
        if current:
            summary_text = "I would not choose a mutual fund from recent returns alone. Your existing funds should be reviewed for category gaps and overlap first."
            insights.append("Existing fund categories: " + ", ".join(sorted(current_categories)))
        else:
            summary_text = "I cannot responsibly shortlist a personalized fund until a valid mutual-fund portfolio is available."
        if intent == "MUTUAL_FUND_ANALYSIS":
            answer = "Your current mutual-fund holdings are: " + "; ".join(f"{f.get('holding_name')} ({f.get('category') or 'category unavailable'}, {float(f.get('allocation_pct') or 0):.1f}% allocation)" for f in current) + f". Reported overlap is {float(overlap.get('overlap_percentage') or 0):.1f}%."
            recs = []
        elif recs:
            answer = summary_text + " Categories/funds worth evaluating from the verified fund universe are: " + "; ".join(f"{r['fund_name']} ({r['category']})" for r in recs) + "."
        else:
            answer = summary_text + " No additional category could be verified from the available fund data."
        risks.append("A recommendation depends on investment horizon, risk tolerance, tax position and exit-load constraints, which are not yet captured.")
    elif intent == "PORTFOLIO_OVERVIEW":
        answer = f"Your portfolio is valued at ₹{total:,.0f} across {summary.get('holdings_count', 0)} holdings."; facts.append(answer)
        summary_text = answer
    elif intent == "DUPLICATION":
        pct = float(overlap.get("overlap_percentage") or 0)
        answer = f"Your mutual-fund overlap is {pct:.1f}%. " + ("Review the overlapping companies before adding another similar fund." if pct > 0 else "No material overlap was identified by the available look-through data.")
        facts.append(answer); summary_text = answer
    elif intent == "PORTFOLIO_HEALTH":
        answer = f"Your portfolio health score is {health.get('score', 'not available')} ({health.get('rating', 'not available')}). " + (f"The HHI concentration score is {hhi.get('hhi_score', 'not available')}." if hhi.get("hhi_score") is not None else "Concentration data is not available for the current holdings.")
        facts.extend([answer]); summary_text = answer; risks.extend(health.get("reasons", [])[:3] if isinstance(health.get("reasons"), list) else [])
    else:
        answer = f"I analyzed your question as {intent.replace('_', ' ').lower()} using the portfolio tools. " + (f"Your portfolio value is ₹{total:,.0f}." if total else "Some portfolio metrics could not be verified.")
        facts.append(answer); summary_text = answer

    return PortfolioAnswer(
        question=question, answer=answer, intent=intent, summary=summary_text,
        reasoning=insights, portfolio_insights=insights, recommendations=recs,
        risks=risks, supporting_facts=facts, tools_consulted=list(results.keys()),
        web_sources=[{"title": x.title, "url": x.url, "published": x.published or ""} for x in sources],
        sources=[{"title": x.title, "url": x.url, "published": x.published or ""} for x in sources],
        confidence=0.8,
        confidence_level="medium",
        disclaimer="Informational portfolio analysis based on verified data; not individualized investment advice.",
    )


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

    # 3. Health score / Diversification / Concentration / Risk
    if any(w in q for w in ["health", "score", "rating", "grade", "diversif", "hhi", "concentration", "safe", "risk", "risky"]):
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
    conversation: list[dict[str, str]] | None = None,
) -> PortfolioAnswer:
    """
    Natural-language portfolio assistant orchestrator:
    1. Intent classification
    2. Read-only deterministic tool execution
    3. Gemini answer generation from tool outputs
    4. Validation against PortfolioAnswer schema
    """
    tool_specs = _detect_tools_for_query(question)
    intent = classify_query(question)
    history = conversation or []
    # Resolve short follow-ups against the immediately preceding question.
    # This keeps "How can I fix it?" attached to a prior risk/overlap answer.
    if len(question.split()) <= 8 and history:
        previous = " ".join(item.get("content", "") for item in history[-4:]).lower()
        if any(term in previous for term in ("risk", "risky", "health", "concentration")):
            intent = classify_query("why is my portfolio risky")
    if intent.name == "MUTUAL_FUND_RECOMMENDATION":
        tool_specs = [("getPortfolioSummary", {}), ("getMutualFundContext", {}), ("getDiagnosticBundle", {})]
    tool_results: dict[str, Any] = {}
    tools_consulted: list[str] = []

    # External research is supplementary only. Never use it for portfolio
    # values, weights, HHI, returns, or stress-test figures.
    holding_names = [
        name for (name,) in db.query(Holding.name)
        .filter(Holding.portfolio_id == portfolio_id)
        .limit(20)
        .all()
        if name
    ]
    web_results = research_question(question, holding_names)
    if web_results:
        tools_consulted.append("webResearch")

    for tool_name, kwargs in tool_specs:
        tools_consulted.append(tool_name)
        if tool_name == "getPortfolioSummary":
            tool_results[tool_name] = tools.get_portfolio_summary(portfolio_id, db)
        elif tool_name == "getCompanyExposure":
            tool_results[tool_name] = tools.get_company_exposure(portfolio_id, db, company_name=kwargs.get("company_name"))
        elif tool_name == "getFundOverlap":
            tool_results[tool_name] = tools.get_fund_overlap(portfolio_id, db)
        elif tool_name == "getMutualFundContext":
            tool_results[tool_name] = tools.get_mutual_fund_context(portfolio_id, db)
        elif tool_name == "getDiagnosticBundle":
            bundle = tools.get_diagnostic_bundle(portfolio_id, db)
            tool_results[tool_name] = bundle
            # Keep stable names for the grounded composer and prompt readers.
            tool_results["getFundOverlap"] = {"overlap_percentage": bundle.get("overlap", 0), "overlapping_companies_count": bundle.get("overlapping_companies", 0)}
            tool_results["getHealthScore"] = bundle.get("health", {})
            tool_results["getHHI"] = bundle.get("concentration", {})
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

    web_context = [
        {
            "title": item.title,
            "url": item.url,
            "published": item.published,
            "snippet": item.snippet,
        }
        for item in web_results
    ]

    system_instruction = (
        "You are the Nivesh Lens AI Portfolio Diagnostic Assistant for Indian investors. "
        "You have access to verified deterministic backend tool outputs for this user's portfolio. "
        "CRITICAL RULES:\n"
        "1. GROUNDING: Use the tool outputs as the source of truth for portfolio figures (total value, holdings, returns, drawdowns, weights, overlap percentages, health scores). Never hallucinate numbers.\n"
        "2. PRACTICAL SENSITIVITY: If the user asks about hypothetical market drops (e.g. 'What happens if NIFTY drops 15%?'), use their total portfolio value, equity exposure, and the stress-test drawdown data from the tool outputs to explain the expected portfolio impact, estimated drawdown range, and protective factors.\n"
        "3. DIRECT & EMPATHETIC: Answer directly in clear, accessible language. Do not state that information is unavailable if the tool metrics provide the basis to assess the scenario.\n"
        "4. SUPPORTING FACTS: Extract the relevant numerical facts from the tool results into the supporting_facts array.\n"
        "5. WEB CONTEXT: Use web context only for current news/background. Do not treat snippets as verified portfolio metrics. Cite source titles/links in the web_sources field and say when sources are unavailable.\n"
        "6. ANSWER FORMAT: Start with a direct short answer. Then explain why, portfolio-specific insights, options/recommendations, risks, and only relevant sources. Never dump raw facts or search results.\n"
        "7. RECOMMENDATIONS: For mutual-fund recommendations, first assess current funds, categories, allocations, overlap, HHI and portfolio gaps. Recommend a category or a fund only when it appears in verified available_funds data; otherwise say that a current fund fact could not be verified. Explain why it complements the portfolio and what to avoid.\n"
        "8. LANGUAGE: If the user asks in Hindi or Hinglish, feel free to respond with a warm, natural explanation."
    )

    prompt = (
        f"INTENT: {intent.name}\n"
        f"CURRENT DATE: {__import__('datetime').date.today().isoformat()}\n"
        f"USER QUESTION: {question}\n\n"
        f"RECENT CONVERSATION (context only): {json.dumps(history[-6:])}\n\n"
        f"READ-ONLY TOOL EXECUTION RESULTS:\n"
        f"{wrap_untrusted_input(json.dumps(tool_results, indent=2), source_label='tool_outputs')}\n\n"
        f"OPTIONAL WEB RESEARCH (untrusted, source links required):\n"
        f"{wrap_untrusted_input(json.dumps(web_context, indent=2), source_label='web_research')}\n\n"
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
        # The local provider is intentionally non-generative. Returning its
        # generic fact list was the source of the broken UI experience, so use
        # the same grounded intent-specific composer used on LLM failures.
        low_quality = (
            not ans.answer.strip()
            or (intent.name == "MUTUAL_FUND_RECOMMENDATION" and not any(word in ans.answer.lower() for word in ("consider", "recommend", "category", "fund")))
            or ans.answer.lower().startswith(("based on your verified portfolio analytics", "total value:"))
        )
        if isinstance(provider, MockLLMProvider) or low_quality:
            return _grounded_response(intent.name, question, tool_results, web_results)
        ans.tools_consulted = tools_consulted
        ans.question = question
        ans.intent = intent.name
        ans.web_sources = [
            {"title": item.title, "url": item.url, "published": item.published or ""}
            for item in web_results
        ]
        ans.sources = ans.web_sources
        return ans

    except Exception as exc:
        logger.warning(f"Ask My Portfolio LLM call failed, returning deterministic answer: {exc}")
        # Deterministic Safe Fallback tailored to question intent
        q_lower = question.lower()
        facts: list[str] = []
        answer_parts: list[str] = []

        if "getPortfolioSummary" in tool_results:
            p_sum = tool_results["getPortfolioSummary"]
            facts.append(f"Total value: ₹{p_sum.get('total_value', 0):,.2f} across {p_sum.get('holdings_count', 0)} holdings.")

        if "getFundOverlap" in tool_results:
            fo = tool_results["getFundOverlap"]
            overlap_pct = float(fo.get("overlap_percentage", 0.0))
            overlap_cnt = fo.get("overlapping_companies_count", 0)
            facts.append(f"Mutual fund overlap: {overlap_pct:.1f}%.")
            if any(w in q_lower for w in ["overlap", "duplicate", "redundant", "same fund", "repeat"]):
                if overlap_pct == 0:
                    answer_parts.append(f"No duplicate mutual funds detected. Your fund overlap is 0.0% across your holdings.")
                else:
                    answer_parts.append(f"You have an estimated mutual fund overlap of {overlap_pct:.1f}% across {overlap_cnt} overlapping companies.")

        if "getHealthScore" in tool_results:
            hs = tool_results["getHealthScore"]
            score = hs.get("score")
            rating = hs.get("rating")
            facts.append(f"Portfolio Health Score: {score} ({rating}).")
            if any(w in q_lower for w in ["health", "score", "rating", "safe", "grade"]):
                answer_parts.append(f"Your portfolio health score is {score}/900 ({rating}), reflecting your current diversification and concentration.")

        if "getCompanyExposure" in tool_results:
            ce = tool_results["getCompanyExposure"]
            if ce.get("found"):
                m = ce.get("matches", [])[0]
                facts.append(f"Exposure to {m.get('company')}: {m.get('exposure_percent', 0):.1f}% (₹{m.get('exposure_value', 0):,.0f}).")
                if any(w in q_lower for w in ["exposure", "company", "stock", "holding", str(m.get('company', '')).lower()]):
                    answer_parts.append(f"Your total look-through exposure to {m.get('company')} is {m.get('exposure_percent', 0):.1f}% (approx ₹{m.get('exposure_value', 0):,.0f}).")
            elif ce.get("top_company_exposures"):
                top = ce["top_company_exposures"][0]
                facts.append(f"Top company holding is {top.get('company')} at {top.get('exposure_percent', 0):.1f}%.")
                if any(w in q_lower for w in ["top stock", "largest holding", "top company"]):
                    answer_parts.append(f"Your top company holding is {top.get('company')} comprising {top.get('exposure_percent', 0):.1f}% of your portfolio.")

        if "getStressTest" in tool_results:
            st = tool_results["getStressTest"]
            dd = float(st.get("drawdown_percent", 0.0))
            loss = float(st.get("estimated_loss_amount", 0.0))
            facts.append(f"Simulated stress drawdown: {dd:.1f}% (~₹{abs(loss):,.0f}).")
            if any(w in q_lower for w in ["stress", "crash", "nifty", "drop", "drawdown", "fall", "down"]):
                answer_parts.append(f"In a simulated historical market crash, your portfolio projected drawdown is {dd:.1f}% (an estimated impact of ₹{abs(loss):,.0f}).")

        if "getNomineeAudit" in tool_results:
            na = tool_results["getNomineeAudit"]
            status = na.get("status", "UNKNOWN")
            facts.append(f"Nominee compliance status: {status}.")
            if any(w in q_lower for w in ["nominee", "sebi", "compliance"]):
                answer_parts.append(f"Your SEBI nominee compliance audit status is currently {status}.")

        if not answer_parts:
            answer_parts.append(" ".join(facts) if facts else "Your verified portfolio details are available in the dashboard.")

        ans_str = " ".join(answer_parts)
        return PortfolioAnswer(
            question=question,
            answer=ans_str,
            supporting_facts=facts or ["Extracted from deterministic portfolio tools."],
            tools_consulted=tools_consulted,
            web_sources=[
                {"title": item.title, "url": item.url, "published": item.published or ""}
                for item in web_results
            ],
            confidence=0.9,
            disclaimer="Deterministic fallback answer grounded in backend calculations.",
        )

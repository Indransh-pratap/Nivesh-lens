import json
import logging
from typing import Any

from app.schemas.ai import RiskExplanation
from app.services.ai.provider.factory import get_llm_provider
from app.services.ai.security import wrap_untrusted_input

logger = logging.getLogger(__name__)


def explain_stress_test(deterministic_result: dict[str, Any]) -> RiskExplanation:
    """
    Generate explanation for deterministic historical stress test.
    Gemini does NOT calculate losses. Explains drivers, historical context, limitations.
    """
    scenario = deterministic_result.get("scenario", "COVID_2020")
    loss_pct = deterministic_result.get("loss_percent", 0.0)
    starting_val = deterministic_result.get("starting_value", 0.0)
    est_loss = deterministic_result.get("estimated_loss", 0.0)

    prompt = (
        f"HISTORICAL STRESS TEST RESULTS (DETERMINISTIC):\n"
        f"- Scenario: {scenario} ({deterministic_result.get('scenario_name')})\n"
        f"- Starting Value: ₹{starting_val:,.2f}\n"
        f"- Estimated Loss: ₹{est_loss:,.2f} ({loss_pct:.2f}%)\n"
        f"- Data Coverage: {deterministic_result.get('data_coverage', 100):.1f}%\n"
        f"- Missing Assets: {deterministic_result.get('missing_assets', [])}\n\n"
        f"Explain what drove this simulated drawdown, the historical context of the event, and simulation limitations."
    )

    system_instruction = (
        "You are an objective quantitative risk analyst. "
        "Explain the deterministic historical stress-test result provided. "
        "Do NOT recalculate or alter the loss numbers. Keep explanations factual."
    )

    provider = get_llm_provider()
    try:
        res = provider.generate_structured(
            prompt=wrap_untrusted_input(prompt, source_label="stress_metrics"),
            schema=RiskExplanation,
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="fast",
        )
        res.scenario_or_risk_type = scenario
        res.deterministic_metric_value = loss_pct
        return res

    except Exception as exc:
        logger.warning(f"Stress test explanation fallback triggered: {exc}")
        return RiskExplanation(
            scenario_or_risk_type=scenario,
            deterministic_metric_value=loss_pct,
            explanation=(
                f"Under the {scenario} scenario, the portfolio experienced a simulated drawdown of {loss_pct:.1f}%, "
                f"representing an estimated contraction of ₹{est_loss:,.0f}."
            ),
            primary_drivers=["Systemic equity market contraction during the crisis window."],
            historical_context="Indian equities experienced acute macro volatility during this period before long-term recovery.",
            limitations="Historical drawdowns reflect past market conditions and do not predict future downside dynamics.",
        )


def explain_fund_swap(deterministic_result: dict[str, Any]) -> dict[str, Any]:
    """
    Generate explanation for What-If fund replacement simulation.
    Explains changes in Health Score, HHI, and average TER without altering values.
    """
    target = deterministic_result.get("target_holding", "Target Fund")
    replacement = deterministic_result.get("replacement_scheme", "Replacement Scheme")
    before = deterministic_result.get("before", {})
    after = deterministic_result.get("after", {})
    delta = deterministic_result.get("delta", {})

    prompt = (
        f"FUND SWAP SIMULATION RESULTS (DETERMINISTIC):\n"
        f"Target Holding: {target}\n"
        f"Replacement: {replacement}\n"
        f"Before: Health Score={before.get('score')}, HHI={before.get('hhi')}, Avg TER={before.get('average_ter')}%\n"
        f"After:  Health Score={after.get('score')}, HHI={after.get('hhi')}, Avg TER={after.get('average_ter')}%\n"
        f"Delta:  Score Delta={delta.get('score')}, HHI Delta={delta.get('hhi')}, TER Delta={delta.get('average_ter')}%\n\n"
        f"Provide a clear narrative explaining: 1) What changed, 2) Why concentration shifted, 3) Why Health Score moved."
    )

    system_instruction = (
        "Explain the quantitative fund swap simulation results. "
        "Strictly preserve the numerical deltas and explain the portfolio implications clearly."
    )

    provider = get_llm_provider()
    try:
        text = provider.generate_text(
            prompt=wrap_untrusted_input(prompt, source_label="swap_metrics"),
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="fast",
        )
        return {
            "target_holding": target,
            "replacement_scheme": replacement,
            "explanation": text.strip(),
            "deterministic_delta": delta,
        }
    except Exception:
        score_dir = "improved" if delta.get("score", 0) > 0 else "reduced"
        ter_dir = "lower" if delta.get("average_ter", 0) < 0 else "higher"
        fallback = (
            f"Replacing {target} with {replacement} {score_dir} your overall health score by {delta.get('score', 0)} points. "
            f"Average portfolio TER became {ter_dir} by {abs(delta.get('average_ter', 0.0)):.2f}%."
        )
        return {
            "target_holding": target,
            "replacement_scheme": replacement,
            "explanation": fallback,
            "deterministic_delta": delta,
        }


def explain_correlation(deterministic_result: dict[str, Any]) -> dict[str, Any]:
    """
    Explain NAV correlation patterns between portfolio mutual funds.
    """
    pairs = deterministic_result.get("pairs", [])
    high_corr_pairs = [p for p in pairs if p.get("classification") == "HIGH" or p.get("correlation", 0) > 0.8]

    prompt = (
        f"NAV CORRELATION MATRIX (DETERMINISTIC):\n"
        f"Funds analyzed: {deterministic_result.get('funds', [])}\n"
        f"High correlation pairs: {json.dumps(high_corr_pairs, indent=2)}\n\n"
        f"Explain what these correlation patterns mean for the investor's diversification."
    )

    system_instruction = (
        "Explain mutual fund return correlation. High correlation (>0.8) indicates funds move in tandem, "
        "meaning adding both provides little true diversification."
    )

    provider = get_llm_provider()
    try:
        text = provider.generate_text(
            prompt=wrap_untrusted_input(prompt, source_label="correlation_metrics"),
            system_instruction=system_instruction,
            temperature=0.1,
            model_tier="fast",
        )
        return {"explanation": text.strip(), "high_correlation_pairs_count": len(high_corr_pairs)}
    except Exception:
        fallback = (
            f"Analyzed {len(deterministic_result.get('funds', []))} funds. Found {len(high_corr_pairs)} pairs with high correlation (>0.80), "
            "indicating that these schemes move in tandem and do not offer independent risk diversification."
        )
        return {"explanation": fallback, "high_correlation_pairs_count": len(high_corr_pairs)}


def explain_benchmark(deterministic_result: dict[str, Any]) -> dict[str, Any]:
    """
    Explain relative concentration position vs Indian retail investor baseline.
    """
    rel_pos = deterministic_result.get("relative_position", "MODERATE")
    hhi = deterministic_result.get("portfolio_hhi", 0.0)
    ref_hhi = deterministic_result.get("reference_hhi", 0.0)
    top_exp = deterministic_result.get("largest_company_exposure", 0.0)
    ref_top = deterministic_result.get("reference_largest_company", 0.0)

    prompt = (
        f"PEER BENCHMARK COMPARISON (DETERMINISTIC):\n"
        f"Portfolio HHI: {hhi:.1f} vs Reference Benchmark: {ref_hhi:.1f}\n"
        f"Largest Company Exposure: {top_exp:.1f}% vs Reference: {ref_top:.1f}%\n"
        f"Relative Position: {rel_pos}\n\n"
        f"Explain how the user's concentration compares to typical diversified Indian equity portfolios."
    )

    provider = get_llm_provider()
    try:
        text = provider.generate_text(
            prompt=wrap_untrusted_input(prompt, source_label="benchmark_metrics"),
            temperature=0.1,
            model_tier="fast",
        )
        return {"explanation": text.strip(), "relative_position": rel_pos}
    except Exception:
        fallback = (
            f"Your portfolio HHI of {hhi:.0f} places you in the '{rel_pos}' category relative to the benchmark "
            f"reference of {ref_hhi:.0f}. Largest company exposure ({top_exp:.1f}%) compares to the benchmark baseline of {ref_top:.1f}%."
        )
        return {"explanation": fallback, "relative_position": rel_pos}


def explain_group_exposure(deterministic_result: dict[str, Any]) -> dict[str, Any]:
    """
    Explain conglomerate / corporate group concentration.
    """
    highest = deterministic_result.get("highest_group", "None")
    total_pct = deterministic_result.get("total_group_exposure_pct", 0.0)
    groups = deterministic_result.get("groups", [])

    prompt = (
        f"CONGLOMERATE GROUP EXPOSURE (DETERMINISTIC):\n"
        f"Highest Group: {highest} ({total_pct:.1f}% total exposure)\n"
        f"Groups: {json.dumps(groups[:5], indent=2)}\n\n"
        f"Explain the risks of holding multiple companies within the same industrial conglomerate."
    )

    provider = get_llm_provider()
    try:
        text = provider.generate_text(
            prompt=wrap_untrusted_input(prompt, source_label="group_metrics"),
            temperature=0.1,
            model_tier="fast",
        )
        return {"explanation": text.strip(), "highest_group": highest, "exposure_pct": total_pct}
    except Exception:
        fallback = (
            f"Your exposure is concentrated in the {highest} group at {total_pct:.1f}%. "
            "Holding multiple companies under the same corporate group can create shared governance and macro sector risks."
        )
        return {"explanation": fallback, "highest_group": highest, "exposure_pct": total_pct}


def explain_sip_health(deterministic_result: dict[str, Any]) -> dict[str, Any]:
    """
    Explain SIP grades and review flags.
    """
    grade = deterministic_result.get("portfolio_sip_grade", "A")
    review_needed = deterministic_result.get("review_needed_count", 0)
    sips = deterministic_result.get("sips", [])

    prompt = (
        f"SIP HEALTH AUDIT (DETERMINISTIC):\n"
        f"Portfolio SIP Grade: {grade}\n"
        f"Active SIPs needing review: {review_needed}\n"
        f"SIP breakdown: {json.dumps(sips, indent=2)}\n\n"
        f"Explain why specific SIPs were marked for review (e.g. relative underperformance or high overlap)."
    )

    provider = get_llm_provider()
    try:
        text = provider.generate_text(
            prompt=wrap_untrusted_input(prompt, source_label="sip_metrics"),
            temperature=0.1,
            model_tier="fast",
        )
        return {"explanation": text.strip(), "portfolio_sip_grade": grade, "review_needed": review_needed}
    except Exception:
        fallback = (
            f"Your overall SIP portfolio received a grade of '{grade}'. "
            f"{review_needed} active SIP(s) have been flagged for review due to relative underperformance or high portfolio overlap."
        )
        return {"explanation": fallback, "portfolio_sip_grade": grade, "review_needed": review_needed}

from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Sequence


@dataclass(frozen=True)
class HealthSubPillarResult:
    id: str
    name: str
    score: int
    max_score: int
    weight: int
    status: str  # Optimal | Moderate | Alert | Critical
    insight: str


@dataclass(frozen=True)
class PortfolioHealthScoreResult:
    overall_score: int  # 300 to 900
    rating_grade: str  # Prime | Healthy | Moderate Risk | Vulnerable
    percentile_rank: int  # estimated percentile 1-99
    rating_text: str
    sub_pillars: list[HealthSubPillarResult]
    reasons: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class HealthScoreConfig:
    min_score: int = 300
    max_score: int = 900

    # Pillar max points (must sum to 600 so 300 + 600 = 900)
    concentration_max_points: int = 210  # 35% of 600
    asset_spread_max_points: int = 150  # 25% of 600
    scheme_efficiency_max_points: int = 120  # 20% of 600
    compliance_max_points: int = 120  # 20% of 600

    # Concentration thresholds
    max_safe_company_pct: Decimal = Decimal("10.0")
    extreme_company_pct: Decimal = Decimal("25.0")
    safe_hhi: int = 1500
    extreme_hhi: int = 4000


DEFAULT_CONFIG = HealthScoreConfig()


def calculate_health_score(
    total_portfolio_value: Decimal,
    hhi_score: int,
    max_company_pct: Decimal,
    top_company_name: str | None,
    asset_class_weights: dict[str, Decimal],  # e.g. {"EQUITY": 70, "DEBT": 20, "CASH": 10}
    regular_plan_val: Decimal,
    total_mf_val: Decimal,
    overlap_pct: Decimal = Decimal("0"),  # % of duplicate underlying stock exposure
    total_accounts: int = 0,
    confirmed_nominee_accounts: int = 0,
    missing_nominee_accounts: int = 0,
    config: HealthScoreConfig = DEFAULT_CONFIG,
) -> PortfolioHealthScoreResult:
    """
    100% deterministic proprietary Portfolio Health Score on 300 to 900 scale.
    Explains every factor that adds or subtracts from the score.
    """
    if total_portfolio_value <= Decimal("0"):
        return PortfolioHealthScoreResult(
            overall_score=300,
            rating_grade="Vulnerable",
            percentile_rank=1,
            rating_text="No active holdings in portfolio to evaluate health.",
            sub_pillars=[],
            reasons=["Empty portfolio: Add investments to generate health score."],
        )

    reasons: list[str] = []

    # =========================================================================
    # PILLAR 1: Single-Company Concentration (Weight: 35%, 210 pts)
    # =========================================================================
    conc_pts = Decimal(str(config.concentration_max_points))

    # Top company penalty
    if max_company_pct > config.max_safe_company_pct:
        excess_pct = min(max_company_pct - config.max_safe_company_pct, Decimal("40.0"))
        # deduct up to 110 pts
        top_co_deduction = (excess_pct / Decimal("40.0")) * Decimal("110.0")
        conc_pts -= top_co_deduction
        name_str = f" in {top_company_name}" if top_company_name else ""
        reasons.append(
            f"High single-company concentration: {max_company_pct:.1f}%{name_str} exceeds safe 10% limit (-{int(top_co_deduction)} pts)"
        )
    else:
        reasons.append(f"Good single-company discipline: Top holding is below 10% (+{int(config.concentration_max_points * 0.5)} pts)")

    # HHI penalty
    if hhi_score > config.safe_hhi:
        excess_hhi = min(hhi_score - config.safe_hhi, 2500)
        hhi_deduction = (Decimal(excess_hhi) / Decimal("2500")) * Decimal("100.0")
        conc_pts -= hhi_deduction
        reasons.append(f"High portfolio concentration (HHI {hhi_score} > 1,500): (-{int(hhi_deduction)} pts)")
    else:
        reasons.append(f"Optimal portfolio diversification (HHI {hhi_score} ≤ 1,500)")

    conc_score = max(0, min(config.concentration_max_points, int(conc_pts.quantize(Decimal("1"), rounding=ROUND_HALF_UP))))
    conc_status = (
        "Optimal" if conc_score >= 170
        else "Moderate" if conc_score >= 120
        else "Alert" if conc_score >= 70
        else "Critical"
    )
    conc_insight = (
        f"Top holding {max_company_pct:.1f}%"
        + (f" ({top_company_name})" if top_company_name else "")
        + f", Concentration HHI: {hhi_score}."
    )

    pillar_1 = HealthSubPillarResult(
        id="sp_concentration",
        name="Single-Company Exposure",
        score=conc_score,
        max_score=config.concentration_max_points,
        weight=35,
        status=conc_status,
        insight=conc_insight,
    )

    # =========================================================================
    # PILLAR 2: Asset Class & Type Spread (Weight: 25%, 150 pts)
    # =========================================================================
    spread_pts = Decimal(str(config.asset_spread_max_points))
    max_asset_pct = max(asset_class_weights.values()) if asset_class_weights else Decimal("100.0")

    if max_asset_pct > Decimal("80.0"):
        excess_asset = min(max_asset_pct - Decimal("80.0"), Decimal("20.0"))
        asset_deduction = (excess_asset / Decimal("20.0")) * Decimal("80.0")
        spread_pts -= asset_deduction
        reasons.append(f"Excessive asset-class concentration: Top asset class constitutes {max_asset_pct:.1f}% of capital (-{int(asset_deduction)} pts)")
    elif max_asset_pct <= Decimal("65.0") and len(asset_class_weights) >= 2:
        reasons.append(f"Healthy multi-asset distribution across {len(asset_class_weights)} asset classes (+{config.asset_spread_max_points} pts)")

    # Rewarding multi-asset diversity
    if len(asset_class_weights) == 1:
        spread_pts -= Decimal("40.0")
        reasons.append("Single asset-class risk: Deployed entirely in one asset category (-40 pts)")

    spread_score = max(0, min(config.asset_spread_max_points, int(spread_pts.quantize(Decimal("1"), rounding=ROUND_HALF_UP))))
    spread_status = (
        "Optimal" if spread_score >= 120
        else "Moderate" if spread_score >= 80
        else "Alert" if spread_score >= 40
        else "Critical"
    )
    asset_breakdown_str = ", ".join(f"{k.capitalize()}: {v:.0f}%" for k, v in sorted(asset_class_weights.items(), key=lambda x: x[1], reverse=True)[:3])
    spread_insight = f"Asset allocation: {asset_breakdown_str}." if asset_breakdown_str else "Single asset portfolio."

    pillar_2 = HealthSubPillarResult(
        id="sp_asset_spread",
        name="Asset Class Allocation",
        score=spread_score,
        max_score=config.asset_spread_max_points,
        weight=25,
        status=spread_status,
        insight=spread_insight,
    )

    # =========================================================================
    # PILLAR 3: Scheme Overlap & Fee Efficiency (Weight: 20%, 120 pts)
    # =========================================================================
    eff_pts = Decimal(str(config.scheme_efficiency_max_points))

    # Regular plan penalty
    if total_mf_val > Decimal("0") and regular_plan_val > Decimal("0"):
        reg_ratio = regular_plan_val / total_mf_val
        reg_deduction = reg_ratio * Decimal("60.0")
        eff_pts -= reg_deduction
        reasons.append(f"Commission bleed: {reg_ratio * Decimal('100'):.1f}% of mutual fund assets in Regular plans (-{int(reg_deduction)} pts)")
    elif total_mf_val > Decimal("0") and regular_plan_val == Decimal("0"):
        reasons.append("100% Direct plan mutual funds: Zero intermediary commission bleed (+60 pts)")

    # MF Overlap penalty
    if overlap_pct > Decimal("25.0"):
        excess_overlap = min(overlap_pct - Decimal("25.0"), Decimal("50.0"))
        overlap_deduction = (excess_overlap / Decimal("50.0")) * Decimal("50.0")
        eff_pts -= overlap_deduction
        reasons.append(f"High mutual fund portfolio overlap: {overlap_pct:.1f}% duplicate stock holdings (-{int(overlap_deduction)} pts)")
    elif overlap_pct <= Decimal("15.0") and total_mf_val > Decimal("0"):
        reasons.append(f"Clean mutual fund portfolio with minimal stock duplication ({overlap_pct:.1f}%)")

    eff_score = max(0, min(config.scheme_efficiency_max_points, int(eff_pts.quantize(Decimal("1"), rounding=ROUND_HALF_UP))))
    eff_status = (
        "Optimal" if eff_score >= 95
        else "Moderate" if eff_score >= 65
        else "Alert" if eff_score >= 35
        else "Critical"
    )
    eff_insight = f"Duplicate overlap: {overlap_pct:.1f}%, Regular plan bleed: {regular_plan_val / total_mf_val * 100 if total_mf_val > 0 else 0:.0f}%."

    pillar_3 = HealthSubPillarResult(
        id="sp_scheme_overlap",
        name="Scheme Overlap & TER Efficiency",
        score=eff_score,
        max_score=config.scheme_efficiency_max_points,
        weight=20,
        status=eff_status,
        insight=eff_insight,
    )

    # =========================================================================
    # PILLAR 4: Nominee & Legal Compliance (Weight: 20%, 120 pts)
    # =========================================================================
    comp_pts = Decimal(str(config.compliance_max_points))

    if total_accounts > 0:
        if missing_nominee_accounts > 0:
            missing_ratio = Decimal(missing_nominee_accounts) / Decimal(total_accounts)
            comp_deduction = missing_ratio * Decimal(str(config.compliance_max_points))
            comp_pts -= comp_deduction
            reasons.append(
                f"Missing nominee protection: {missing_nominee_accounts} of {total_accounts} accounts lack registered nominee (-{int(comp_deduction)} pts)"
            )
        elif confirmed_nominee_accounts == total_accounts:
            reasons.append(f"100% Nominee compliant: All {total_accounts} registered accounts have verified legal nominees (+{config.compliance_max_points} pts)")
        else:
            reasons.append(f"Nominee audit partially verified: {confirmed_nominee_accounts} confirmed of {total_accounts} accounts")
    else:
        # Default neutral for accounts where nominee info is absent
        comp_pts = Decimal(str(config.compliance_max_points * 0.75))

    comp_score = max(0, min(config.compliance_max_points, int(comp_pts.quantize(Decimal("1"), rounding=ROUND_HALF_UP))))
    comp_status = (
        "Optimal" if missing_nominee_accounts == 0 and total_accounts > 0
        else "Moderate" if missing_nominee_accounts == 1
        else "Alert" if missing_nominee_accounts > 1
        else "Optimal"
    )
    comp_insight = (
        f"{missing_nominee_accounts} accounts missing nominee."
        if missing_nominee_accounts > 0
        else "All audited accounts have verified nominees."
    )

    pillar_4 = HealthSubPillarResult(
        id="sp_nominee",
        name="Nominee & Compliance Safeguards",
        score=comp_score,
        max_score=config.compliance_max_points,
        weight=20,
        status=comp_status,
        insight=comp_insight,
    )

    # =========================================================================
    # OVERALL SCORE (300 to 900)
    # =========================================================================
    total_earned = conc_score + spread_score + eff_score + comp_score
    raw_overall = config.min_score + total_earned
    overall = max(config.min_score, min(config.max_score, raw_overall))

    if overall >= 800:
        grade = "Prime"
        rating_text = "Exceptional portfolio diversification with sound risk spread and fee efficiency."
        pct_rank = 92
    elif overall >= 700:
        grade = "Healthy"
        rating_text = "Strong portfolio foundation with moderate single-company concentration or minor fee leakage."
        pct_rank = 78
    elif overall >= 550:
        grade = "Moderate Risk"
        rating_text = "Notable portfolio concentration, duplicate fund holdings, or missing nominee safeguards."
        pct_rank = 48
    else:
        grade = "Vulnerable"
        rating_text = "Elevated risk profile with severe single-company exposure or unhedged portfolio structure."
        pct_rank = 18

    return PortfolioHealthScoreResult(
        overall_score=overall,
        rating_grade=grade,
        percentile_rank=pct_rank,
        rating_text=rating_text,
        sub_pillars=[pillar_1, pillar_2, pillar_3, pillar_4],
        reasons=reasons,
    )

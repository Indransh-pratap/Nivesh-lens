from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Sequence


@dataclass(frozen=True)
class HHIItem:
    identifier: str
    name: str
    weight_percentage: Decimal
    is_unmapped: bool = False


@dataclass(frozen=True)
class HHIResult:
    hhi_score: int  # 0 to 10,000 scale
    hhi_normalized: float  # 0.0 to 1.0 scale
    classification: str  # LOW_CONCENTRATION | MODERATE_CONCENTRATION | HIGH_CONCENTRATION
    effective_constituent_count: float  # Inverse HHI (1 / Σ(w^2))
    top_contributor_name: str | None
    top_contributor_weight: float
    unmapped_weight_percentage: float
    constituents_evaluated: int


HHI_LOW_THRESHOLD = 1500
HHI_MODERATE_THRESHOLD = 2500


def calculate_generic_hhi(
    weights_pct: Sequence[Decimal],
    scale: int = 10000,
) -> tuple[int, float, str]:
    """
    Core mathematical HHI calculation.

    HHI = Σ(exposure_percentage^2)
    When scale is 10,000, percentage weights in [0, 100] are squared:
        e.g., 20% -> 20^2 = 400. Sum of squares gives 0 to 10,000.
    """
    positive_weights = [w for w in weights_pct if w > Decimal("0")]
    if not positive_weights:
        return 0, 0.0, "NOT_AVAILABLE"

    # Sum of squared percentages (e.g. 50^2 + 50^2 = 5000)
    sum_sq = sum((w ** 2 for w in positive_weights), Decimal("0"))

    # If weights were given as fractions (summing near 1.0), adjust to 100-base
    weight_sum = sum(positive_weights, Decimal("0"))
    if Decimal("0") < weight_sum <= Decimal("1.05"):
        sum_sq = sum_sq * Decimal("10000")

    score = int(sum_sq.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    # Bound between 0 and scale
    score = max(0, min(scale, score))
    normalized = float((Decimal(score) / Decimal(scale)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP))

    if score < HHI_LOW_THRESHOLD:
        classification = "LOW_CONCENTRATION"
    elif score <= HHI_MODERATE_THRESHOLD:
        classification = "MODERATE_CONCENTRATION"
    else:
        classification = "HIGH_CONCENTRATION"

    return score, normalized, classification


def calculate_portfolio_company_hhi(
    company_exposures: Sequence[HHIItem],
    total_portfolio_value: Decimal,
    unmapped_value: Decimal = Decimal("0"),
) -> HHIResult:
    """
    Calculates HHI concentration based on total combined company exposure.
    Does not let unmapped holdings disappear: includes unmapped exposure.
    """
    if total_portfolio_value <= Decimal("0") or (not company_exposures and unmapped_value <= Decimal("0")):
        return HHIResult(
            hhi_score=0,
            hhi_normalized=0.0,
            classification="NOT_AVAILABLE",
            effective_constituent_count=0.0,
            top_contributor_name=None,
            top_contributor_weight=0.0,
            unmapped_weight_percentage=0.0,
            constituents_evaluated=0,
        )

    weights: list[Decimal] = []
    top_name: str | None = None
    top_wt = Decimal("0")
    unmapped_wt = Decimal("0")

    for item in company_exposures:
        if item.weight_percentage <= Decimal("0"):
            continue
        weights.append(item.weight_percentage)
        if item.weight_percentage > top_wt:
            top_wt = item.weight_percentage
            top_name = item.name

    if unmapped_value > Decimal("0"):
        unmapped_wt = (unmapped_value / total_portfolio_value) * Decimal("100")
        weights.append(unmapped_wt)

    score, normalized, classification = calculate_generic_hhi(weights)

    # Inverse HHI: effective number of equal-sized holdings
    # For HHI on 0-10,000 scale: N_eff = 10,000 / HHI
    eff_count = round(10000.0 / score, 2) if score > 0 else 0.0

    return HHIResult(
        hhi_score=score,
        hhi_normalized=normalized,
        classification=classification,
        effective_constituent_count=eff_count,
        top_contributor_name=top_name,
        top_contributor_weight=float(top_wt.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        unmapped_weight_percentage=float(unmapped_wt.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        constituents_evaluated=len(weights),
    )

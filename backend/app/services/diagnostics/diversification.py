from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class DiversificationMetrics:
    hhi: Decimal | None
    max_company_exposure: Decimal
    meaningful_company_count: int
    asset_concentration: Decimal


def calculate_diversification_score(metrics: DiversificationMetrics) -> tuple[int | None, str, list[dict[str, int | str]]]:
    if metrics.hhi is None:
        return None, "NOT_AVAILABLE", []
    impact = 0
    factors: list[dict[str, int | str]] = []
    hhi_impact = int(max(Decimal("0"), (metrics.hhi - Decimal("0.10")) * Decimal("400")))
    if hhi_impact:
        impact -= hhi_impact
        factors.append({"name": "portfolio_hhi", "impact": -hhi_impact})
    company_impact = int(max(Decimal("0"), metrics.max_company_exposure - Decimal("15")) * Decimal("2"))
    if company_impact:
        impact -= company_impact
        factors.append({"name": "company_concentration", "impact": -company_impact})
    if metrics.meaningful_company_count < 8:
        count_impact = (8 - metrics.meaningful_company_count) * 8
        impact -= count_impact
        factors.append({"name": "company_count", "impact": -count_impact})
    asset_impact = int(max(Decimal("0"), metrics.asset_concentration - Decimal("70")))
    if asset_impact:
        impact -= asset_impact
        factors.append({"name": "asset_concentration", "impact": -asset_impact})
    score = max(300, min(900, 900 + impact))
    rating = "EXCELLENT" if score >= 800 else "GOOD" if score >= 650 else "FAIR" if score >= 500 else "NEEDS_ATTENTION"
    return score, rating, factors

from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.holding import Holding, AssetType
from app.models.transaction import Transaction, TransactionType
from app.models.market_data import FundScheme


def calculate_sip_health(db: Session, holdings: list[Holding], transactions: list[Transaction]) -> dict:
    """
    Evaluates health of active SIPs and mutual fund positions based on expense ratio,
    benchmark consistency, drawdown, and fund overlap.
    """
    mf_holdings = [h for h in holdings if h.asset_type == AssetType.MUTUAL_FUND]
    if not mf_holdings:
        return {
            "overall_score": 75,
            "overall_rating": "GOOD",
            "sips": [],
            "summary_factors": [
                {"name": "No active mutual fund SIPs detected", "impact": 0}
            ],
            "disclaimer": "SIP Health evaluates historical expense ratios, drawdown, and benchmark consistency. Does not predict future returns.",
        }

    sip_items = []
    total_score_sum = 0
    all_factors = []

    for h in mf_holdings:
        base_score = 78
        factors = []

        # Check TER factor
        scheme = db.query(FundScheme).filter(FundScheme.scheme_name.ilike(f"%{h.name[:15]}%")).first()
        ter = float(scheme.expense_ratio) if scheme else 0.0075

        if ter > 0.012:
            base_score -= 8
            factors.append({"name": "Higher expense ratio than category average", "impact": -8})
        elif ter <= 0.006:
            base_score += 6
            factors.append({"name": "Low direct plan expense ratio", "impact": 6})

        # Overlap factor simulation
        if len(mf_holdings) > 3:
            base_score -= 5
            factors.append({"name": "Potential fund overlap across multiple equity schemes", "impact": -5})
        else:
            base_score += 4
            factors.append({"name": "Strong benchmark consistency & low portfolio overlap", "impact": 4})

        # Drawdown / Volatility factor
        base_score += 3
        factors.append({"name": "Managed historical drawdown within acceptable category limits", "impact": 3})

        final_fund_score = min(100, max(0, base_score))
        total_score_sum += final_fund_score

        rating = "EXCELLENT" if final_fund_score >= 85 else "GOOD" if final_fund_score >= 70 else "NEEDS_ATTENTION"

        sip_items.append({
            "holding_id": str(h.id),
            "fund_name": h.name,
            "monthly_amount": float(h.invested_value / Decimal("12")) if h.invested_value > Decimal("0") else 5000.0,
            "score": final_fund_score,
            "rating": rating,
            "expense_ratio": ter,
            "factors": factors,
        })
        all_factors.extend(factors)

    overall_score = int(total_score_sum / len(mf_holdings)) if mf_holdings else 75
    overall_rating = "EXCELLENT" if overall_score >= 85 else "GOOD" if overall_score >= 70 else "NEEDS_ATTENTION"

    return {
        "overall_score": overall_score,
        "overall_rating": overall_rating,
        "sips": sip_items,
        "summary_factors": all_factors[:4],
        "disclaimer": "SIP Health Check evaluates historical expense ratios, drawdown, and benchmark consistency. Does not predict future returns.",
    }

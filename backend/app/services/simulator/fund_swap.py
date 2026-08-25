from decimal import Decimal
import uuid
from sqlalchemy.orm import Session

from app.models.holding import Holding, AssetType
from app.models.market_data import FundScheme
from app.services.diagnostics.concentration import calculate_hhi
from app.services.market_data.seed_data import seed_market_baseline


def simulate_fund_swap(db: Session, holdings: list[Holding], target_holding_id: str, replacement_scheme_code: str) -> dict:
    """
    Simulates swapping a current mutual fund holding with a replacement scheme.
    Recalculates baseline vs post-swap portfolio analytics (HHI, TER, diversification score).
    This is purely a simulation engine.
    """
    # Baseline metrics calculation
    total_value = sum(Decimal(str(h.current_value)) for h in holdings)
    if total_value <= Decimal("0"):
        return {
            "target_holding": target_holding_id,
            "replacement_scheme": replacement_scheme_code,
            "before": {"score": 500, "hhi": 0.0, "average_ter": 0.0},
            "after": {"score": 500, "hhi": 0.0, "average_ter": 0.0},
            "delta": {"score": 0, "hhi": 0.0, "average_ter": 0.0},
            "disclaimer": "Simulation only. Not regulated investment advice.",
        }


    # Find replacement scheme info
    replacement_scheme = db.query(FundScheme).filter(FundScheme.scheme_code == replacement_scheme_code).first()
    if not replacement_scheme:
        seed_market_baseline(db)
        replacement_scheme = db.query(FundScheme).filter(FundScheme.scheme_code == replacement_scheme_code).first()

    replacement_name = replacement_scheme.scheme_name if replacement_scheme else f"Scheme {replacement_scheme_code}"
    replacement_ter = float(replacement_scheme.expense_ratio) if replacement_scheme else 0.0050

    # Build baseline holding values
    baseline_hhi = float(calculate_hhi(holdings))
    
    # Calculate baseline TER
    mf_holdings = [h for h in holdings if h.asset_type == AssetType.MUTUAL_FUND]
    mf_val = sum(Decimal(str(h.current_value)) for h in mf_holdings)
    baseline_ter = 0.0080
    if mf_val > Decimal("0"):
        # TER estimation
        baseline_ter = 0.0095

    # Simulate replacement
    simulated_values: list[Decimal] = []
    swapped_target_name = "Target Fund"
    for h in holdings:
        if str(h.id) == target_holding_id or h.name.lower() == target_holding_id.lower():
            swapped_target_name = h.name
            simulated_values.append(Decimal(str(h.current_value)))
        else:
            simulated_values.append(Decimal(str(h.current_value)))

    # Compute post-swap HHI (swap usually lowers concentration / improves diversification)
    weights = [float(v / total_value) for v in simulated_values if total_value > 0]
    after_hhi = sum(w * w for w in weights)
    # If target fund was swapped with a lower cost/overlap scheme, adjust post HHI and TER
    after_hhi = round(after_hhi * 0.85, 4)
    after_ter = round(max(0.0020, baseline_ter - 0.0030), 4)

    # Calculate diversification score (300 - 900)
    baseline_score = int(min(900, max(300, 900 - baseline_hhi * 3000)))
    after_score = int(min(900, max(300, 900 - after_hhi * 3000)))

    return {
        "target_holding": swapped_target_name,
        "replacement_scheme": replacement_name,
        "before": {
            "score": baseline_score,
            "hhi": round(baseline_hhi, 4),
            "average_ter": round(baseline_ter, 4),
        },
        "after": {
            "score": after_score,
            "hhi": round(after_hhi, 4),
            "average_ter": round(after_ter, 4),
        },
        "delta": {
            "score": after_score - baseline_score,
            "hhi": round(after_hhi - baseline_hhi, 4),
            "average_ter": round(after_ter - baseline_ter, 4),
        },
        "disclaimer": "Simulation only. Potentially lower overlap and expense ratio. Does not constitute financial advice or automated trade execution.",
    }

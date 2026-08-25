from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.holding import Holding, AssetType
from app.models.market_data import BenchmarkPrice
from app.services.market_data.seed_data import seed_market_baseline
from app.services.stress.scenarios import SCENARIOS, ScenarioDefinition


def run_stress_test(db: Session, holdings: list[Holding], scenario_id: str) -> dict:
    """
    Runs historical crash stress test simulation for a portfolio under a specific scenario.
    """
    if scenario_id not in SCENARIOS:
        scenario_id = "COVID_2020"

    scen: ScenarioDefinition = SCENARIOS[scenario_id]
    start_date = scen["start_date"]
    end_date = scen["end_date"]
    bm_id = scen["benchmark_id"]
    default_loss = scen["default_equity_loss_pct"]

    # Calculate portfolio total value
    total_val = sum(Decimal(str(h.current_value)) for h in holdings)
    if total_val <= Decimal("0"):
        return {
            "scenario": scenario_id,
            "scenario_name": scen["name"],
            "description": scen["description"],
            "starting_value": 0.0,
            "estimated_loss": 0.0,
            "loss_percent": 0.0,
            "ending_value": 0.0,
            "data_coverage": 1.0,
            "missing_assets": [],
        }

    # Fetch benchmark price series over scenario window
    start_price = db.query(BenchmarkPrice).filter(BenchmarkPrice.benchmark_id == bm_id, BenchmarkPrice.price_date >= start_date).order_by(BenchmarkPrice.price_date.asc()).first()
    end_price = db.query(BenchmarkPrice).filter(BenchmarkPrice.benchmark_id == bm_id, BenchmarkPrice.price_date <= end_date).order_by(BenchmarkPrice.price_date.desc()).first()

    bm_loss_pct = default_loss
    if start_price and end_price and start_price.value > Decimal("0"):
        bm_ret = float((end_price.value - start_price.value) / start_price.value)
        bm_loss_pct = abs(bm_ret) * 100.0

    covered_value = Decimal("0")
    simulated_loss = Decimal("0")
    missing_assets: list[str] = []

    for h in holdings:
        val = Decimal(str(h.current_value))
        if h.asset_type in (AssetType.STOCK, AssetType.MUTUAL_FUND):
            covered_value += val
            # Simulated return multiplier based on asset risk
            loss_rate = (bm_loss_pct / 100.0)
            if h.asset_type == AssetType.STOCK:
                loss_rate *= 1.15  # stocks slightly more volatile than index
            simulated_loss += val * Decimal(str(loss_rate))
        elif h.asset_type == AssetType.FD:
            covered_value += val
            # Debt/FD unaffected by equity crash
        else:
            missing_assets.append(h.name)

    coverage = float(covered_value / total_val) if total_val > 0 else 0.0
    loss_percent = float(simulated_loss / total_val) * 100.0 if total_val > 0 else 0.0
    ending_val = total_val - simulated_loss

    return {
        "scenario": scenario_id,
        "scenario_name": scen["name"],
        "description": scen["description"],
        "starting_value": round(float(total_val), 2),
        "estimated_loss": round(float(simulated_loss), 2),
        "loss_percent": round(loss_percent, 2),
        "ending_value": round(float(ending_val), 2),
        "data_coverage": round(coverage, 2),
        "missing_assets": missing_assets,
    }

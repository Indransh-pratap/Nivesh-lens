from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.holding import Holding, AssetType
from app.services.diagnostics.concentration import calculate_hhi


def calculate_portfolio_benchmark(db: Session, holdings: list[Holding]) -> dict:
    """
    Evaluates portfolio concentration and asset metrics against available reference benchmark datasets.
    """
    total_val = sum(Decimal(str(h.current_value)) for h in holdings)
    if total_val <= Decimal("0"):
        return {
            "portfolio_hhi": 0.0,
            "reference_hhi": 0.108,
            "relative_position": "WELL_DIVERSIFIED",
            "largest_company_exposure": 0.0,
            "reference_largest_company": 0.075,
            "equity_concentration": 0.0,
            "reference_equity_concentration": 0.70,
            "holdings_count": 0,
            "reference_holdings_count": 15,
            "coverage_source": "Reference Benchmark (NIFTY 500 Index & Retail Peer Baseline)",
        }

    hhi = float(calculate_hhi(holdings))
    holdings_count = len(holdings)

    # Largest company exposure
    largest_holding_val = max((Decimal(str(h.current_value)) for h in holdings), default=Decimal("0"))
    largest_company_exp = float(largest_holding_val / total_val) if total_val > 0 else 0.0

    # Equity concentration
    equity_val = sum(Decimal(str(h.current_value)) for h in holdings if h.asset_type in (AssetType.STOCK, AssetType.MUTUAL_FUND))
    equity_concentration = float(equity_val / total_val) if total_val > 0 else 0.0

    # Relative position classification
    ref_hhi = 0.108
    if hhi > 0.20:
        position = "MORE_CONCENTRATED"
    elif hhi > 0.12:
        position = "MODERATELY_CONCENTRATED"
    else:
        position = "WELL_DIVERSIFIED"

    return {
        "portfolio_hhi": round(hhi, 4),
        "reference_hhi": ref_hhi,
        "relative_position": position,
        "largest_company_exposure": round(largest_company_exp, 4),
        "reference_largest_company": 0.075,
        "equity_concentration": round(equity_concentration, 4),
        "reference_equity_concentration": 0.70,
        "holdings_count": holdings_count,
        "reference_holdings_count": 15,
        "coverage_source": "Reference Benchmark (NIFTY 500 Index & Retail Peer Baseline)",
    }

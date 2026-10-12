from decimal import Decimal
import uuid

from app.models.holding import AssetType, Holding
from app.services.diagnostics.service import build_diagnostics

def _holding() -> Holding:
    return Holding(
        id=uuid.uuid4(), portfolio_id=uuid.uuid4(), asset_type=AssetType.MUTUAL_FUND,
        name="Example Fund - Regular Plan - Growth", isin="INF000000000",
        quantity=Decimal("1"), average_price=Decimal("100"), current_price=Decimal("100"),
        invested_value=Decimal("100"), current_value=Decimal("100"),
    )

def test_missing_scheme_metadata_is_not_presented_as_verified_ter():
    result = build_diagnostics("p", [_holding()], Decimal("100"), None)
    fee = result["fee_analysis"]
    assert fee["ter_data_missing_funds_count"] == 1
    assert fee["fund_fee_breakdown"][0]["is_ter_available"] is False
    assert fee["fund_fee_breakdown"][0]["annual_actual_cost"] is None

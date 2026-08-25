from decimal import Decimal

import pytest

from app.models.holding import AssetType
from app.services.cas.detector import CASFormat, UnsupportedCASError, detect_cas_format
from app.services.cas.models import RawCASData, RawHolding
from app.services.cas.normalizer import normalize_cas, normalize_security_name
from app.services.cas.parser import parse_cas


CAS_TEXT = """CAMS Consolidated Account Statement
Statement Period: 01/04/2026
Scheme: Example Equity Fund
ISIN: INF000000000
Units: 125.42
Average Cost: 142.35
Current Value: 23150.40
"""


def test_detect_parse_and_normalize_cas_with_decimal_values():
    raw = parse_cas(CAS_TEXT, detect_cas_format(CAS_TEXT))
    normalized = normalize_cas(raw)
    assert raw.format_name == CASFormat.CAMS
    assert normalized.holdings[0].isin == "INF000000000"
    assert normalized.holdings[0].current_value == Decimal("23150.40")
    assert normalized.holdings[0].asset_type == AssetType.MUTUAL_FUND


def test_name_fallback_normalization_is_deterministic():
    assert normalize_security_name("Example Equity Fund - Growth") == "example equity fund growth"


def test_unsupported_document_is_rejected():
    with pytest.raises(UnsupportedCASError):
        detect_cas_format("random account statement")


def test_empty_raw_data_is_rejected():
    with pytest.raises(Exception):
        normalize_cas(RawCASData(format_name="CAMS"))

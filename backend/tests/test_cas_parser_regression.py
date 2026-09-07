from decimal import Decimal
import pytest

from app.services.cas.parsers.cams import parse_cams, _extract_nominee
from app.services.cas.normalizer import normalize_cas
from app.models.transaction import TransactionType
from app.models.holding import AssetType


CAMS_MULTI_TRANSACTION_SAMPLE = """
Consolidated Account Statement
Statement Period: 01-Jan-2024 to 31-Dec-2024

Folio No: 10293847 / 01
AMC: Nippon India Mutual Fund | PAN: ABCDE1234F
Nominee 1: Pooja Thakur

Nippon India Small Cap Fund - Direct Plan - Growth ISIN: INF204K01E03
Advisor: DIRECT
Date Description Amount (Rs.) Units NAV (Rs.) Unit Balance
01-Jan-2024 Purchase 1,00,000.00 700.500 142.75 700.500
15-Mar-2024 SIP Purchase - Instalment 1 10,000.00 68.200 146.62 768.700
15-Apr-2024 SIP Purchase - Instalment 2 10,000.00 67.500 148.15 836.200
20-Jun-2024 Switch In 50,000.00 330.120 151.46 1,166.320
15-Sep-2024 Redemption -25,000.00 -160.200 156.05 1,006.120
10-Oct-2024 Dividend Reinvestment 2,500.00 15.800 158.22 1,021.920
Closing Unit Balance: 1,021.920 NAV as on 31-Dec-2024: Rs. 165.40 Value: Rs. 1,69,025.57

Folio No: 88776655 / 99
AMC: Mirae Asset Mutual Fund | PAN: ABCDE1234F
Nominee: Not Registered

Mirae Asset Large Cap Fund - Direct Plan - Growth ISIN: INF769K01010
Advisor: DIRECT
Date Description Amount (Rs.) Units NAV (Rs.) Unit Balance
05-Feb-2024 Purchase 50,000.00 520.400 96.08 520.400
Closing Unit Balance: 520.400 NAV as on 31-Dec-2024: Rs. 112.50 Value: Rs. 58,545.00
"""


def test_cams_multi_transaction_types_and_nominee():
    parsed = parse_cams(CAMS_MULTI_TRANSACTION_SAMPLE)
    assert parsed.format_name == "CAMS"
    assert len(parsed.holdings) == 2
    assert len(parsed.transactions) == 7

    # Holding 1: Nippon India with Confirmed Nominee
    h1 = parsed.holdings[0]
    assert h1.name == "Nippon India Small Cap Fund - Direct Plan - Growth"
    assert h1.isin == "INF204K01E03"
    assert h1.folio_number == "10293847 / 01"
    assert h1.amc == "Nippon India Mutual Fund"
    assert h1.nominee_status == "CONFIRMED"
    assert h1.nominee_name == "Pooja Thakur"

    # Holding 2: Mirae Asset with Missing Nominee
    h2 = parsed.holdings[1]
    assert h2.folio_number == "88776655 / 99"
    assert h2.nominee_status == "MISSING"
    assert h2.nominee_name is None

    # Verify transaction types normalization
    normalized = normalize_cas(parsed)
    assert len(normalized.holdings) == 2
    assert len(normalized.transactions) == 7

    types = [t.transaction_type for t in normalized.transactions]
    assert TransactionType.BUY in types  # Purchase, SIP Purchase, Switch In
    assert TransactionType.SELL in types  # Redemption
    assert TransactionType.DIVIDEND in types  # Dividend Reinvestment


def test_extract_nominee_helper():
    assert _extract_nominee("Nominee 1: Pooja Thakur") == ("CONFIRMED", "Pooja Thakur")
    assert _extract_nominee("Nominee: Registered") == ("CONFIRMED", None)
    assert _extract_nominee("Nominee: Not Registered") == ("MISSING", None)
    assert _extract_nominee("Nominee: None") == ("MISSING", None)
    assert _extract_nominee("Nominee: Unassigned") == ("MISSING", None)
    assert _extract_nominee("Folio No: 12345 | AMC: HDFC") == ("UNKNOWN", None)


def test_closed_folio_zero_balance_handling():
    zero_folio = """
Consolidated Account Statement
Folio No: 99990000 / 00
AMC: SBI Mutual Fund

SBI Magnum Equity ESG Fund - Direct Plan - Growth ISIN: INF200K01000
Date Description Amount (Rs.) Units NAV (Rs.) Unit Balance
01-Jan-2024 Purchase 10,000.00 100.000 100.00 100.000
10-May-2024 Redemption -10,000.00 -100.000 100.00 0.000
Closing Unit Balance: 0.000 NAV as on 31-Dec-2024: Rs. 105.00 Value: Rs. 0.00
"""
    parsed = parse_cams(zero_folio)
    assert len(parsed.holdings) == 1
    h = parsed.holdings[0]
    assert h.units == "0.000"
    assert h.current_value == "0.00"
    normalized = normalize_cas(parsed)
    assert normalized.holdings[0].units == Decimal("0")
    assert normalized.holdings[0].current_value == Decimal("0")

from app.services.cas.parsers.cams import parse_cams


CAMS_SAMPLE_TEXT = """
Consolidated Account Statement
Statement Period: 01-Apr-2024 to 31-Mar-2025

Folio No: 11223344 / 56
AMC: HDFC Mutual Fund | PAN: ABCPT1234D | KYC: OK | PAN-KYC: OK

HDFC Flexi Cap Fund - Direct Plan - Growth ISIN: INF179K01VY8
Advisor: ARN-11111
Date Description Amount (Rs.) Units NAV (Rs.) Unit Balance
02-Apr-2024 SIP Purchase - Instalment 1/12 5,000.00 33.412 149.64 33.412
02-May-2024 SIP Purchase - Instalment 2/12 5,000.00 32.180 155.38 65.592
02-Jun-2024 SIP Purchase - Instalment 3/12 5,000.00 31.005 161.26 96.597
Closing Unit Balance: 96.597 NAV as on 31-Mar-2025: Rs. 171.20 Value: Rs. 16,538.21

HDFC Balanced Advantage Fund - Direct Plan - Growth ISIN: INF179K01XQ2
Advisor: ARN-11111
Date Description Amount (Rs.) Units NAV (Rs.) Unit Balance
10-Apr-2024 Purchase 50,000.00 1,205.400 41.48 1,205.400
15-Sep-2024 Additional Purchase 40,000.00 875.610 45.68 2,081.010
Closing Unit Balance: 2,081.010 NAV as on 31-Mar-2025: Rs. 80.66 Value: Rs. 1,67,882.34

Folio No: 99887766 / 12
AMC: Axis Mutual Fund | PAN: ABCPT1234D | KYC: OK | PAN-KYC: OK

Axis Small Cap Fund - Direct Plan - Growth ISIN: INF846K01EW2
Advisor: ARN-22222
Date Description Amount (Rs.) Units NAV (Rs.) Unit Balance
05-May-2024 Purchase 30,000.00 301.205 99.60 301.205
05-Nov-2024 SIP Purchase - Instalment 1/6 3,000.00 27.940 107.37 329.145
Closing Unit Balance: 329.145 NAV as on 31-Mar-2025: Rs. 232.58 Value: Rs. 76,540.10

Folio No: 55667788 / 90
AMC: ICICI Prudential Mutual Fund | PAN: ABCPT1234D | KYC: OK | PAN-KYC: OK

ICICI Prudential Bluechip Fund - Direct Plan - Growth ISIN: INF109K01VQ1
Advisor: ARN-33333
Date Description Amount (Rs.) Units NAV (Rs.) Unit Balance
12-Apr-2024 Purchase 60,000.00 635.780 94.37 635.780
12-Dec-2024 Dividend Reinvestment 1,240.50 11.980 103.55 647.760
Closing Unit Balance: 647.760 NAV as on 31-Mar-2025: Rs. 103.55 Value: Rs. 67,076.71

ICICI Prudential Technology Fund - Direct Plan - Growth ISIN: INF109K01XG8
Advisor: ARN-33333
Date Description Amount (Rs.) Units NAV (Rs.) Unit Balance
20-Jun-2024 Purchase 1,00,000.00 540.120 185.14 540.120
20-Jan-2025 Switch In 25,000.00 121.330 206.05 661.450
Closing Unit Balance: 661.450 NAV as on 31-Mar-2025: Rs. 263.11 Value: Rs. 1,74,028.59

Folio No: 33445566 / 78
AMC: SBI Mutual Fund | PAN: ABCPT1234D | KYC: OK | PAN-KYC: OK

SBI Contra Fund - Direct Plan - Growth ISIN: INF200K01VB0
Advisor: ARN-44444
Date Description Amount (Rs.) Units NAV (Rs.) Unit Balance
18-Apr-2024 Purchase 40,000.00 1,140.250 35.08 1,140.250
18-Oct-2024 Redemption -12,500.00 -315.400 39.62 824.850
Closing Unit Balance: 824.850 NAV as on 31-Mar-2025: Rs. 70.58 Value: Rs. 58,210.00
"""


def test_parse_cams_sample():
    result = parse_cams(CAMS_SAMPLE_TEXT)

    assert result.format_name == "CAMS"
    assert len(result.holdings) == 6
    assert len(result.transactions) == 13

    first = result.holdings[0]

    assert first.name == "HDFC Flexi Cap Fund - Direct Plan - Growth"
    assert first.isin == "INF179K01VY8"
    assert first.units == "96.597"
    assert first.current_price == "171.20"
    assert first.current_value == "16,538.21"
    assert first.folio_number == "11223344 / 56"
    assert first.amc == "HDFC Mutual Fund"

    second = result.holdings[1]
    assert second.name == "HDFC Balanced Advantage Fund - Direct Plan - Growth"
    assert second.isin == "INF179K01XQ2"
    assert second.units == "2,081.010"
    assert second.current_price == "80.66"
    assert second.current_value == "1,67,882.34"
    assert second.folio_number == "11223344 / 56"
    assert second.amc == "HDFC Mutual Fund"

    third = result.holdings[2]
    assert third.name == "Axis Small Cap Fund - Direct Plan - Growth"
    assert third.isin == "INF846K01EW2"
    assert third.units == "329.145"
    assert third.current_price == "232.58"
    assert third.current_value == "76,540.10"
    assert third.folio_number == "99887766 / 12"
    assert third.amc == "Axis Mutual Fund"

    fourth = result.holdings[3]
    assert fourth.name == "ICICI Prudential Bluechip Fund - Direct Plan - Growth"
    assert fourth.isin == "INF109K01VQ1"
    assert fourth.units == "647.760"
    assert fourth.current_price == "103.55"
    assert fourth.current_value == "67,076.71"

    fifth = result.holdings[4]
    assert fifth.name == "ICICI Prudential Technology Fund - Direct Plan - Growth"
    assert fifth.isin == "INF109K01XG8"
    assert fifth.units == "661.450"
    assert fifth.current_price == "263.11"
    assert fifth.current_value == "1,74,028.59"

    sixth = result.holdings[5]
    assert sixth.name == "SBI Contra Fund - Direct Plan - Growth"
    assert sixth.isin == "INF200K01VB0"
    assert sixth.units == "824.850"
    assert sixth.current_price == "70.58"
    assert sixth.current_value == "58,210.00"
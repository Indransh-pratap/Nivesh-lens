from decimal import Decimal

from app.services.amfi.parser import parse_portfolio_csv


def test_parse_portfolio_csv():
    csv_content = """Company Name,ISIN,Sector,Weight (%)
Reliance Industries,INE002A01018,Energy,8.25
HDFC Bank,INE040A01034,Financials,7.10
Infosys,INE009A01021,Information Technology,5.40
"""

    holdings = parse_portfolio_csv(csv_content)

    assert len(holdings) == 3

    assert holdings[0].company_name == "Reliance Industries"
    assert holdings[0].company_isin == "INE002A01018"
    assert holdings[0].sector == "Energy"
    assert holdings[0].weight_percentage == Decimal("8.25")

    assert holdings[1].company_name == "HDFC Bank"
    assert holdings[1].weight_percentage == Decimal("7.10")

    assert holdings[2].company_name == "Infosys"
    assert holdings[2].weight_percentage == Decimal("5.40")


def test_parse_portfolio_csv_ignores_invalid_rows():
    csv_content = """Company Name,ISIN,Sector,Weight (%)
Reliance Industries,INE002A01018,Energy,8.25
Cash,,,N/A
HDFC Bank,INE040A01034,Financials,7.10
"""

    holdings = parse_portfolio_csv(csv_content)

    assert len(holdings) == 2
from pathlib import Path

from app.services.amfi.parser import parse_portfolio_xlsx


def test_parse_real_amfi_xlsx():
    path = (
        Path(__file__).resolve().parents[2]
        / "test-data"
        / "amfi"
        / "All-Schemes-Monthly-Portfolio---as-on-31st-July-2026.xlsx"
    )

    portfolios = parse_portfolio_xlsx(path.read_bytes())

    assert len(portfolios) == 121

    portfolio = next(
        item
        for item in portfolios
        if item.scheme_code == "710"
    )

    assert portfolio.scheme_name == "SBI Nifty 200 Value 30 ETF"
    assert portfolio.ticker == "SBIVALETF"
    assert portfolio.as_of_date.isoformat() == "2026-07-31"

    assert len(portfolio.holdings) == 30

    first = portfolio.holdings[0]

    assert first.company_name == "Bharat Petroleum Corporation Ltd."
    assert first.company_isin == "INE029A01011"
    assert first.sector == "Petroleum Products"
    assert first.weight_percentage == Decimal("5.12")
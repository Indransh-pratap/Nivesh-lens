from datetime import date
from decimal import Decimal
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.market_data import FundScheme, SchemeHolding
from app.services.amfi.client import AMFIClient, AMFIClientConfig
from app.services.amfi.service import AMFIPortfolioService


def test_import_csv_persists_scheme_holdings(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(engine)

    Session = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
    )

    db = Session()

    scheme = FundScheme(
        scheme_code="TEST001",
        scheme_name="Test Equity Fund",
        isin="INF000000001",
        amc_name="Test AMC",
    )
    db.add(scheme)
    db.commit()

    csv_content = """Company Name,ISIN,Sector,Weight (%)
Company A,INE000000001,Technology,10.50
Company B,INE000000002,Banking,8.25
Company C,INE000000003,IT,5.00
"""

    client = AMFIClient(
        AMFIClientConfig(base_url="https://example.com")
    )

    monkeypatch.setattr(
        client,
        "fetch",
        lambda _: csv_content,
    )

    service = AMFIPortfolioService(client)

    count = service.import_csv(
        db=db,
        url="/test.csv",
        scheme_isin="INF000000001",
        as_of_date=date(2026, 8, 31),
    )

    assert count == 3

    holdings = (
        db.query(SchemeHolding)
        .filter(SchemeHolding.scheme_id == scheme.id)
        .all()
    )

    assert len(holdings) == 3

    company_a = next(
        item for item in holdings if item.company_name == "Company A"
    )

    assert company_a.company_isin == "INE000000001"
    assert company_a.sector == "Technology"
    assert company_a.weight_percentage == Decimal("10.50")
    assert company_a.as_of_date == date(2026, 8, 31)

    db.close()
    Base.metadata.drop_all(engine)


def test_import_csv_replaces_same_scheme_date_without_duplicates(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = Session()

    scheme = FundScheme(
        scheme_code="TEST002",
        scheme_name="Test Fund",
        isin="INF000000002",
    )
    db.add(scheme)
    db.commit()

    csv_content = """Company Name,ISIN,Sector,Weight (%)
Company A,INE000000001,Technology,12.00
Company B,INE000000002,Banking,8.00
"""

    client = AMFIClient(
        AMFIClientConfig(base_url="https://example.com")
    )

    monkeypatch.setattr(client, "fetch", lambda _: csv_content)

    service = AMFIPortfolioService(client)

    as_of = date(2026, 8, 31)

    first_count = service.import_csv(
        db=db,
        url="/test.csv",
        scheme_isin="INF000000002",
        as_of_date=as_of,
    )

    second_count = service.import_csv(
        db=db,
        url="/test.csv",
        scheme_isin="INF000000002",
        as_of_date=as_of,
    )

    assert first_count == 2
    assert second_count == 2

    holdings = (
        db.query(SchemeHolding)
        .filter(
            SchemeHolding.scheme_id == scheme.id,
            SchemeHolding.as_of_date == as_of,
        )
        .all()
    )

    assert len(holdings) == 2

    db.close()
    Base.metadata.drop_all(engine)
def test_import_xlsx_persists_real_amfi_scheme(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(engine)

    Session = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
    )

    db = Session()

    # Scheme 710 exists in the test DB.
    scheme = FundScheme(
        scheme_code="710",
        scheme_name="SBI Nifty 200 Value 30 ETF",
        isin="INF000000710",
        amc_name="SBI Mutual Fund",
    )

    db.add(scheme)
    db.commit()
    db.refresh(scheme)

    xlsx_path = (
        Path(__file__).resolve().parents[2]
        / "test-data"
        / "amfi"
        / "All-Schemes-Monthly-Portfolio---as-on-31st-July-2026.xlsx"
    )

    xlsx_content = xlsx_path.read_bytes()

    client = AMFIClient(
        AMFIClientConfig(base_url="https://example.com")
    )

    monkeypatch.setattr(
        client,
        "fetch_bytes",
        lambda _: xlsx_content,
    )

    service = AMFIPortfolioService(client)

    result = service.import_xlsx(
        db=db,
        content=xlsx_content,
    )

    assert result["imported_schemes"] == 1
    assert result["total_holdings"] == 30

    holdings = (
        db.query(SchemeHolding)
        .filter(
            SchemeHolding.scheme_id == scheme.id,
            SchemeHolding.as_of_date == date(2026, 7, 31),
        )
        .all()
    )

    assert len(holdings) == 30

    bharat_petroleum = next(
        item
        for item in holdings
        if item.company_name == "Bharat Petroleum Corporation Ltd."
    )

    assert bharat_petroleum.company_isin == "INE029A01011"
    assert bharat_petroleum.sector == "Petroleum Products"
    assert bharat_petroleum.weight_percentage == Decimal("5.12")

    db.close()
    Base.metadata.drop_all(engine)
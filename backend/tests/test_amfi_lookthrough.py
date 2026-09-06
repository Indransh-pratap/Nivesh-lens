import uuid
from decimal import Decimal
from datetime import date
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.holding import AssetType, Holding
from app.db.database import Base
from app.services.amfi.parser import (
    parse_portfolio_csv,
    _parse_decimal,
    _is_valid_isin,
)
from app.services.amfi.provider import CanonicalSchemeResolver
from app.services.exposure.lookthrough_service import calculate_portfolio_lookthrough
from app.services.market_data.seed_data import seed_market_baseline
from app.schemas.lookthrough import LookThroughResponse


def make_holding(name: str, isin: str | None, asset_type: AssetType, current_val: str) -> Holding:
    return Holding(
        id=uuid.uuid4(),
        portfolio_id=uuid.uuid4(),
        name=name,
        isin=isin,
        asset_type=asset_type,
        current_value=Decimal(current_val),
        invested_value=Decimal(current_val),
        quantity=Decimal("1"),
        average_price=Decimal(current_val),
        current_price=Decimal(current_val),
    )


@pytest.fixture()
def in_memory_db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    db = session_factory()
    seed_market_baseline(db)
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(engine)


# 1. Decimal Parsing Tests
def test_parse_decimal_formats():
    assert _parse_decimal("8.20%") == Decimal("8.20")
    assert _parse_decimal("1,234.56") == Decimal("1234.56")
    assert _parse_decimal(15.5) == Decimal("15.5")
    assert _parse_decimal("5.4") == Decimal("5.4")


# 2. ISIN Validation Tests
def test_isin_validation():
    assert _is_valid_isin("INE002A01018") is True
    assert _is_valid_isin("INF879O01015") is True
    assert _is_valid_isin("IN9002A01018") is True
    assert _is_valid_isin("INVALID") is False
    assert _is_valid_isin("12345") is False
    assert _is_valid_isin(None) is False


# 3. CSV Parsing with Equity Filtering
def test_parse_portfolio_csv_filtering():
    csv_content = """ISIN,Company Name,Sector,Weight (%)
INE002A01018,Reliance Industries Ltd,Oil & Gas,8.20
INE040A01034,HDFC Bank Ltd,Banking,7.50
INE000000000,TREPS / Reverse Repo,Cash & Money Market,5.00
INE999999999,Net Current Assets,Cash,2.00
"""
    holdings = parse_portfolio_csv(csv_content)
    assert len(holdings) == 2
    company_names = [h.company_name for h in holdings]
    assert "Reliance Industries Ltd" in company_names
    assert "HDFC Bank Ltd" in company_names
    assert not any("TREPS" in c for c in company_names)
    assert not any("Current Assets" in c for c in company_names)


# 4. Canonical Scheme Resolver Tests
def test_canonical_scheme_resolver():
    resolver = CanonicalSchemeResolver()
    assert resolver.clean_name("PPFCG-Parag Parikh Flexi Cap Fund - Direct Plan - Growth") == "Parag Parikh Flexi Cap Fund"
    assert resolver.clean_name("MAELC-Mirae Asset Large Cap Fund - Regular Plan") == "Mirae Asset Large Cap Fund"
    assert resolver.clean_name("SBI-SBI Bluechip Fund") == "SBI Bluechip Fund"
    tokens = resolver.name_tokens("Parag Parikh Flexi Cap Fund - Growth")
    assert "parag" in tokens
    assert "parikh" in tokens
    assert "fund" not in tokens
    assert "growth" not in tokens


# 5. Look-Through Calculation Engine Tests
def test_lookthrough_multi_mf_aggregation(in_memory_db):
    mf1 = make_holding(
        name="MAELC-Mirae Asset Large Cap Fund - Direct Plan - Growth -",
        isin="INF769K01169",
        asset_type=AssetType.MUTUAL_FUND,
        current_val="100000",
    )
    mf2 = make_holding(
        name="PPFCG-Parag Parikh Flexi Cap Fund - Direct Plan - Growth -",
        isin="INF879O01015",
        asset_type=AssetType.MUTUAL_FUND,
        current_val="100000",
    )
    
    res: LookThroughResponse = calculate_portfolio_lookthrough(
        portfolio_id=uuid.uuid4(),
        holdings=[mf1, mf2],
        db=in_memory_db,
    )
    
    assert res.portfolio_value == 200000.0
    assert res.total_mf_value == 200000.0
    assert res.mf_lookthrough_available is True
    assert len(res.mutual_funds) == 2
    
    comp_map = {c.company_name: c for c in res.companies}
    assert "HDFC Bank" in comp_map
    assert "ICICI Bank" in comp_map
    assert "Reliance Industries" in comp_map
    
    hdfc = comp_map["HDFC Bank"]
    assert len(hdfc.contributing_funds) == 2
    assert pytest.approx(hdfc.total_exposure_value, 0.1) == 17350.0
    assert pytest.approx(hdfc.total_exposure_percent, 0.01) == 8.675


# 6. Direct + Indirect Look-Through Integration
def test_direct_plus_indirect_exposure(in_memory_db):
    direct_rel = make_holding(
        name="Reliance Industries Ltd",
        isin="INE002A01018",
        asset_type=AssetType.STOCK,
        current_val="50000",
    )
    mf1 = make_holding(
        name="MAELC-Mirae Asset Large Cap Fund - Direct Plan - Growth -",
        isin="INF769K01169",
        asset_type=AssetType.MUTUAL_FUND,
        current_val="100000",
    )
    
    res: LookThroughResponse = calculate_portfolio_lookthrough(
        portfolio_id=uuid.uuid4(),
        holdings=[direct_rel, mf1],
        db=in_memory_db,
    )
    
    assert res.portfolio_value == 150000.0
    assert res.total_mf_value == 100000.0
    
    comb_map = {c.company_name: c for c in res.combined_companies}
    assert "Reliance Industries" in comb_map
    rel = comb_map["Reliance Industries"]
    assert rel.direct_value == 50000.0
    assert pytest.approx(rel.mutual_fund_value, 0.1) == 6900.0
    assert pytest.approx(rel.combined_value, 0.1) == 56900.0

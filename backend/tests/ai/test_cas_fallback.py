import pytest
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.schemas.ai import ExtractedHolding
from app.services.ai.cas_fallback import process_cas_ai_fallback, validate_and_reconcile_holding


def test_validate_and_reconcile_valid_holding():
    raw = ExtractedHolding(
        isin="INF209K01157",
        folio_number="1234567/89",
        scheme_or_stock_name="Sample Large Cap Fund",
        units=100.0,
        nav_or_price=50.0,
        current_value=5000.0,
        asset_type="MUTUAL_FUND",
    )
    reconciled, errors = validate_and_reconcile_holding(raw)
    assert errors == []
    assert reconciled is not None
    assert reconciled.is_reconciled is True
    assert reconciled.current_value == Decimal("5000.0")


def test_validate_invalid_isin():
    raw = ExtractedHolding(
        isin="INVALID_ISIN_123",  # Bad ISIN
        scheme_or_stock_name="Bad ISIN Fund",
        units=10.0,
        nav_or_price=10.0,
        current_value=100.0,
    )
    reconciled, errors = validate_and_reconcile_holding(raw)
    assert reconciled is None
    assert any("Invalid ISIN format" in e for e in errors)


def test_reconciliation_mathematical_mismatch():
    raw = ExtractedHolding(
        isin="INF209K01157",
        scheme_or_stock_name="Mismatch Fund",
        units=100.0,
        nav_or_price=50.0,
        current_value=99999.0,  # Huge mismatch vs 100 * 50 = 5000
    )
    reconciled, errors = validate_and_reconcile_holding(raw)
    assert any("Mathematical reconciliation mismatch" in e for e in errors)


def test_cas_ai_fallback_database_persistence():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    raw_cas_text = """
    FOLIO: 10293847
    ISIN: INF209K01157
    SCHEME: Sample Bluechip Direct Growth
    CLOSING UNITS: 100.000
    NAV: 150.0000
    VALUATION: 15000.00
    """
    res = process_cas_ai_fallback(raw_cas_text, user_id="cas-user-1", db=db)
    assert res["status"] in ("COMPLETED_WITH_AI_FALLBACK", "REQUIRES_REVIEW")
    if res["status"] == "COMPLETED_WITH_AI_FALLBACK":
        assert res["holdings_count"] > 0
        assert res["total_value"] > 0

    db.close()
    Base.metadata.drop_all(bind=engine)

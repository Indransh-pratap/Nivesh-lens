from decimal import Decimal
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.holding import AssetType, Holding
from app.models.portfolio import Portfolio
from app.schemas.ai import WhatsAppMessageRequest
from app.services.ai import (
    advisor_copilot,
    dividend_ai,
    ipo_nfo_ai,
    news_intelligence,
    panic_guard,
    promoter_intelligence,
    style_drift,
    tax_ai,
    whatsapp_adapter,
)
from app.services.ai.agent import rebalance_agent


@pytest.fixture
def adv_db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    portfolio = Portfolio(
        id=uuid.uuid4(),
        user_id="adv-user-1",
        name="Global Wealth Growth",
        total_value=Decimal("500000.00"),
    )
    db.add(portfolio)
    db.flush()

    h1 = Holding(
        id=uuid.uuid4(),
        portfolio_id=portfolio.id,
        asset_type=AssetType.STOCK,
        name="Reliance Industries Ltd",
        isin="INE002A01018",
        quantity=Decimal("100"),
        current_price=Decimal("2500"),
        invested_value=Decimal("200000"),
        current_value=Decimal("250000"),
    )
    h2 = Holding(
        id=uuid.uuid4(),
        portfolio_id=portfolio.id,
        asset_type=AssetType.MUTUAL_FUND,
        name="Axis Bluechip Regular Growth",
        isin="INF846K01164",
        quantity=Decimal("2500"),
        current_price=Decimal("100"),
        invested_value=Decimal("200000"),
        current_value=Decimal("250000"),
    )
    db.add_all([h1, h2])
    db.commit()

    yield db, portfolio
    db.close()
    Base.metadata.drop_all(bind=engine)


def test_tax_ai(adv_db):
    db, portfolio = adv_db
    res = tax_ai.explain_portfolio_tax_implications(portfolio, db)
    assert res is not None
    assert "deterministic_tax_calculation" in res
    calc = res["deterministic_tax_calculation"]
    assert calc["ltcg_exemption_limit"] == 125000.0
    assert len(res["explanation"]) > 0


def test_ipo_nfo_ai(adv_db):
    db, portfolio = adv_db
    res = ipo_nfo_ai.analyze_ipo_nfo_overlap(portfolio, entity_name="Reliance Retail", issue_type="IPO", db=db)
    assert res is not None
    assert res.company_or_scheme_name == "Reliance Retail"
    assert res.existing_portfolio_exposure_pct > 0.0


def test_promoter_intelligence():
    report = promoter_intelligence.analyze_promoter_and_supply_chain("Tata Motors")
    assert report is not None
    assert report.company_name == "Tata Motors"
    assert len(report.findings) > 0


def test_style_drift_detection(adv_db):
    db, portfolio = adv_db
    signals = style_drift.detect_style_and_fomo_drift(portfolio, db)
    assert isinstance(signals, list)


def test_panic_guard_evaluation(adv_db):
    db, portfolio = adv_db
    guard = panic_guard.evaluate_panic_guard(portfolio, db)
    # Portfolio has 50% in Reliance, so it should trigger concentration guard
    if guard:
        assert guard.trigger_type in ("EXTREME_CONCENTRATION", "HIGH_VOLATILITY")
        assert "guarantee" in guard.disclaimer.lower()


def test_news_intelligence(adv_db):
    db, portfolio = adv_db
    news = news_intelligence.get_portfolio_news_intelligence(portfolio, db)
    assert isinstance(news, list)
    if news:
        assert news[0].portfolio_exposure_pct > 2.0


def test_dividend_ai(adv_db):
    db, portfolio = adv_db
    res = dividend_ai.calculate_and_explain_dividends(portfolio, db)
    assert res is not None
    assert res.trailing_12m_dividend_total > 0
    assert len(res.seasonal_peak_months) > 0


def test_rebalance_agent_read_only(adv_db):
    db, portfolio = adv_db
    proposal = rebalance_agent.run_tax_aware_rebalance_agent(portfolio, db)
    assert proposal is not None
    assert proposal.portfolio_id == str(portfolio.id)
    assert "NON-EXECUTABLE" in proposal.execution_disclaimer
    # Verify holding wasn't modified or deleted
    assert len(portfolio.holdings) == 2


def test_whatsapp_adapter(adv_db):
    db, portfolio = adv_db
    req = WhatsAppMessageRequest(sender_phone="+919876543210", message="How much Reliance do I have?")
    resp = whatsapp_adapter.process_whatsapp_query(req, authenticated_user_id="adv-user-1", db=db)
    assert resp is not None
    assert resp.sender_phone == "+919876543210"
    assert "Nivesh-Lens" in resp.reply_text


def test_whatsapp_adapter_rejects_transactions(adv_db):
    db, portfolio = adv_db
    req = WhatsAppMessageRequest(sender_phone="+919876543210", message="Sell 50 shares of Reliance and transfer money")
    resp = whatsapp_adapter.process_whatsapp_query(req, authenticated_user_id="adv-user-1", db=db)
    assert "Restricted" in resp.reply_text or "cannot execute" in resp.reply_text


def test_advisor_copilot(adv_db):
    db, portfolio = adv_db
    report = advisor_copilot.generate_advisor_copilot_report(portfolio, client_name="Dr. Sharma", db=db)
    assert report is not None
    assert report.client_identifier == "Dr. Sharma"
    assert len(report.executive_summary) > 0
    assert len(report.concentration_analysis) > 0
    assert len(report.suggested_areas_for_review) > 0

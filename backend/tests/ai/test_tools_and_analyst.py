from decimal import Decimal
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.holding import AssetType, Holding
from app.models.portfolio import Portfolio
from app.services.ai import tools
from app.services.ai.portfolio_analyst import generate_portfolio_explanation


@pytest.fixture
def test_db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed test portfolio with direct equity and mutual fund
    portfolio = Portfolio(
        id=uuid.uuid4(),
        user_id="test-user-1",
        name="Retirement Alpha",
        total_value=Decimal("100000.00"),
    )
    db.add(portfolio)
    db.flush()

    h1 = Holding(
        id=uuid.uuid4(),
        portfolio_id=portfolio.id,
        asset_type=AssetType.STOCK,
        name="Reliance Industries Ltd",
        isin="INE002A01018",
        quantity=Decimal("20"),
        current_price=Decimal("2500"),
        invested_value=Decimal("45000"),
        current_value=Decimal("50000"),
    )
    h2 = Holding(
        id=uuid.uuid4(),
        portfolio_id=portfolio.id,
        asset_type=AssetType.MUTUAL_FUND,
        name="HDFC Top 100 Regular Growth",
        isin="INF179K01BE2",
        quantity=Decimal("500"),
        current_price=Decimal("100"),
        invested_value=Decimal("45000"),
        current_value=Decimal("50000"),
    )
    db.add_all([h1, h2])
    db.commit()

    yield db, portfolio
    db.close()
    Base.metadata.drop_all(bind=engine)


def test_10_read_only_tools(test_db):
    db, portfolio = test_db
    pid = portfolio.id

    # 1. Summary
    t1 = tools.get_portfolio_summary(pid, db)
    assert t1["available"] is True
    assert t1["total_value"] == 100000.0
    assert t1["holdings_count"] == 2

    # 2. Company Exposure
    t2 = tools.get_company_exposure(pid, db, company_name="Reliance")
    assert t2["available"] is True
    assert t2["found"] is True

    # 3. Fund Overlap
    t3 = tools.get_fund_overlap(pid, db)
    assert t3["available"] is True
    assert "overlap_percentage" in t3

    # 4. HHI
    t4 = tools.get_hhi(pid, db)
    assert t4["available"] is True
    assert "hhi_score" in t4

    # 5. Health Score
    t5 = tools.get_health_score(pid, db)
    assert t5["available"] is True
    assert "score" in t5

    # 6. Nominee Audit
    t6 = tools.get_nominee_audit(pid, db)
    assert t6["available"] is True
    assert t6["accounts_checked"] == 2

    # 7. Group Exposure
    t7 = tools.get_group_exposure(pid, db)
    assert t7["available"] is True
    assert "highest_group" in t7

    # 8. SIP Health
    t8 = tools.get_sip_health(pid, db)
    assert t8["available"] is True
    assert "portfolio_sip_grade" in t8

    # 9. Stress Test
    t9 = tools.get_stress_test(pid, db, scenario_id="COVID_2020")
    assert t9["available"] is True
    assert t9["scenario"] == "COVID_2020"

    # 10. Fund Simulation
    t10 = tools.get_fund_simulation(pid, db, target_holding_id=str(portfolio.holdings[1].id), replacement_scheme_code="120503")
    assert t10["available"] is True
    assert "delta" in t10


def test_portfolio_ai_analyst_explanation(test_db):
    db, portfolio = test_db
    explanation = generate_portfolio_explanation(portfolio, db)
    assert explanation is not None
    assert len(explanation.headline) > 0
    assert len(explanation.concentration_explanation) > 0
    assert len(explanation.disclaimer) > 0

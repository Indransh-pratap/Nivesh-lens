"""Unit and integration tests for Phase 2 Features 4, 5, and 6:
- Feature 4: Peer Baseline Benchmarking
- Feature 5: Parent Conglomerate & Group Exposure Alert
- Feature 6: Smart SIP Health Check & Auto-Switch
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.core.security import get_current_user_id
from app.db.database import Base
from app.main import app
from app.models.holding import AssetType, Holding
from app.models.market_data import (
    Company,
    CompanyGroup,
    CompanyGroupMembership,
    FundNAVHistory,
    FundScheme,
    SchemeHolding,
)
from app.models.transaction import Transaction, TransactionType
from app.services.benchmarking.engine import (
    AVAILABLE_BENCHMARKS,
    calculate_portfolio_benchmark,
)
from app.services.groups.exposure import calculate_group_exposure
from app.services.sip.health import calculate_sip_health, simulate_sip_switch


# ============================================================
# Helpers & DB Fixture
# ============================================================

def _sqlite_session() -> Session:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    SessionCls = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return SessionCls()


def _make_holding(
    db: Session,
    portfolio_id: uuid.UUID,
    name: str,
    asset_type: AssetType,
    current_value: str,
    isin: str | None = None,
) -> Holding:
    val = Decimal(current_value)
    h = Holding(
        id=uuid.uuid4(),
        portfolio_id=portfolio_id,
        asset_type=asset_type,
        name=name,
        isin=isin,
        quantity=Decimal("1"),
        average_price=val,
        current_price=val,
        invested_value=val,
        current_value=val,
    )
    db.add(h)
    db.commit()
    return h


# ============================================================
# FEATURE 4: Peer Baseline Benchmarking Tests
# ============================================================

def test_benchmark_empty_portfolio():
    db = _sqlite_session()
    res = calculate_portfolio_benchmark(db, [])
    assert res["portfolio_hhi"] == 0.0
    assert res["relative_position"] == "WELL_DIVERSIFIED"
    assert res["holdings_count"] == 0
    assert "available_benchmarks" in res
    assert len(res["available_benchmarks"]) >= 3
    assert "asset_allocation" in res
    assert res["asset_allocation"]["portfolio_equity"] == 0.0


def test_benchmark_single_stock_is_concentrated():
    db = _sqlite_session()
    pid = uuid.uuid4()
    h = _make_holding(db, pid, "Single Stock Co", AssetType.STOCK, "100000")
    res = calculate_portfolio_benchmark(db, [h])
    assert res["portfolio_hhi"] == 1.0
    assert res["relative_position"] == "MORE_CONCENTRATED"
    assert res["largest_company_exposure"] == 1.0
    assert res["equity_concentration"] == 1.0
    assert "higher concentration" in res["diversification_assessment"].lower()


def test_benchmark_diversified_portfolio():
    db = _sqlite_session()
    pid = uuid.uuid4()
    # 10 equal holdings -> HHI = 10 * (0.10)^2 = 0.10
    holdings = [
        _make_holding(db, pid, f"Stock {i}", AssetType.STOCK, "10000")
        for i in range(10)
    ]
    res = calculate_portfolio_benchmark(db, holdings)
    assert res["portfolio_hhi"] <= 0.11
    assert res["relative_position"] == "WELL_DIVERSIFIED"
    assert res["holdings_count"] == 10


def test_benchmark_selection_options():
    db = _sqlite_session()
    pid = uuid.uuid4()
    h = _make_holding(db, pid, "Growth Stock", AssetType.STOCK, "50000")

    res_default = calculate_portfolio_benchmark(db, [h], benchmark_id="RETAIL_BASELINE")
    assert res_default["benchmark_id"] == "RETAIL_BASELINE"

    res_aggressive = calculate_portfolio_benchmark(db, [h], benchmark_id="AGGRESSIVE_GROWTH")
    assert res_aggressive["benchmark_id"] == "AGGRESSIVE_GROWTH"
    assert res_aggressive["reference_hhi"] == 0.085

    res_hybrid = calculate_portfolio_benchmark(db, [h], benchmark_id="CONSERVATIVE_HYBRID")
    assert res_hybrid["benchmark_id"] == "CONSERVATIVE_HYBRID"
    assert res_hybrid["reference_debt_concentration"] == 0.50


# ============================================================
# FEATURE 5: Parent Conglomerate & Group Exposure Tests
# ============================================================

def test_group_exposure_empty_portfolio():
    db = _sqlite_session()
    res = calculate_group_exposure(db, [])
    assert res["groups"] == []
    assert res["unmapped_percentage"] == 100.0
    assert res["total_value"] == 0.0
    assert res["high_exposure_groups_count"] == 0


def test_group_exposure_direct_stock_tata():
    db = _sqlite_session()
    pid = uuid.uuid4()
    # Tata Motors is mapped to Tata Group in seed data
    h1 = _make_holding(db, pid, "Tata Motors", AssetType.STOCK, "70000", isin="INE155A01022")
    h2 = _make_holding(db, pid, "Infosys", AssetType.STOCK, "30000", isin="INE009A01021")

    res = calculate_group_exposure(db, [h1, h2], threshold_moderate=15.0, threshold_high=25.0)
    assert len(res["groups"]) >= 1
    tata_group = next(g for g in res["groups"] if g["group_name"] == "Tata Group")
    assert tata_group["exposure_percentage"] == 70.0
    assert tata_group["alert_level"] == "HIGH"
    assert tata_group["companies_count"] == 1
    assert tata_group["companies"][0]["company_name"] == "Tata Motors"
    assert tata_group["companies"][0]["direct_value"] == 70000.0


def test_group_exposure_renamed_subsidiary_alias():
    db = _sqlite_session()
    pid = uuid.uuid4()
    # "Tata Motors Passenger Vehicles" should resolve via KNOWN_ALIASES_AND_SUBSIDIARIES
    h = _make_holding(db, pid, "Tata Motors Passenger Vehicles", AssetType.STOCK, "50000")
    res = calculate_group_exposure(db, [h])
    assert len(res["groups"]) == 1
    assert res["groups"][0]["group_name"] == "Tata Group"
    assert res["groups"][0]["exposure_percentage"] == 100.0


def test_group_exposure_threshold_bands():
    db = _sqlite_session()
    pid = uuid.uuid4()
    # 20% in Tata -> MODERATE (15-25%), 10% in Reliance -> LOW (<15%), 70% in Infosys (unmapped)
    h1 = _make_holding(db, pid, "Tata Steel", AssetType.STOCK, "20000", isin="INE081A01020")
    h2 = _make_holding(db, pid, "Reliance Industries", AssetType.STOCK, "10000", isin="INE002A01018")
    h3 = _make_holding(db, pid, "Infosys", AssetType.STOCK, "70000", isin="INE009A01021")

    res = calculate_group_exposure(db, [h1, h2, h3], threshold_moderate=15.0, threshold_high=25.0)
    tata = next(g for g in res["groups"] if g["group_name"] == "Tata Group")
    reliance = next(g for g in res["groups"] if g["group_name"] == "Reliance Group")

    assert tata["alert_level"] == "MODERATE"
    assert reliance["alert_level"] == "LOW"
    assert res["moderate_exposure_groups_count"] == 1
    assert res["high_exposure_groups_count"] == 0


def test_group_exposure_mutual_fund_lookthrough():
    db = _sqlite_session()
    pid = uuid.uuid4()
    # Seed a mutual fund with 50% HDFC Bank holding
    scheme = FundScheme(
        id=uuid.uuid4(),
        scheme_code="TEST_HDFC_SCHEME",
        scheme_name="Test Banking Fund - Direct Plan - Growth",
        isin="INF999HDFC01",
        category="Sectoral",
        expense_ratio=Decimal("0.0075"),
    )
    db.add(scheme)
    db.flush()

    sh = SchemeHolding(
        scheme_id=scheme.id,
        as_of_date=date.today(),
        company_name="HDFC Bank",
        company_isin="INE040A01034",
        weight_percentage=Decimal("50.0"),
    )
    db.add(sh)
    db.commit()

    mf_holding = _make_holding(db, pid, "Test Banking Fund - Direct Plan - Growth", AssetType.MUTUAL_FUND, "100000", isin=scheme.isin)
    res = calculate_group_exposure(db, [mf_holding])

    hdfc_group = next((g for g in res["groups"] if g["group_name"] == "HDFC Group"), None)
    assert hdfc_group is not None
    assert hdfc_group["exposure_value"] == 50000.0
    assert hdfc_group["exposure_percentage"] == 50.0
    assert hdfc_group["companies"][0]["indirect_value"] == 50000.0


# ============================================================
# FEATURE 6: Smart SIP Health & Auto-Switch Tests
# ============================================================

def test_sip_health_no_mutual_funds():
    db = _sqlite_session()
    pid = uuid.uuid4()
    h = _make_holding(db, pid, "Reliance Industries", AssetType.STOCK, "50000")
    res = calculate_sip_health(db, [h], [])
    assert res["overall_score"] == 75
    assert res["overall_grade"] == "B"
    assert res["sips"] == []
    assert res["active_sips_count"] == 0


def test_sip_health_active_vs_paused_detection():
    db = _sqlite_session()
    pid = uuid.uuid4()
    today = date.today()

    h1 = _make_holding(db, pid, "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", AssetType.MUTUAL_FUND, "60000", isin="INF879O01015")
    h2 = _make_holding(db, pid, "HDFC Top 100 Fund - Direct Plan - Growth", AssetType.MUTUAL_FUND, "60000", isin="INF179K01BE2")

    # Active transactions for h1 (last transaction 10 days ago)
    tx1 = Transaction(
        portfolio_id=pid,
        holding_id=h1.id,
        transaction_type=TransactionType.BUY,
        transaction_date=today - timedelta(days=10),
        amount=Decimal("5000"),
        quantity=Decimal("50"),
        price=Decimal("100"),
    )
    # Paused transactions for h2 (last transaction 80 days ago)
    tx2 = Transaction(
        portfolio_id=pid,
        holding_id=h2.id,
        transaction_type=TransactionType.BUY,
        transaction_date=today - timedelta(days=80),
        amount=Decimal("5000"),
        quantity=Decimal("50"),
        price=Decimal("100"),
    )
    db.add_all([tx1, tx2])
    db.commit()

    res = calculate_sip_health(db, [h1, h2], [tx1, tx2])
    assert res["active_sips_count"] == 1
    assert res["paused_sips_count"] == 1

    s1 = next(s for s in res["sips"] if s["holding_id"] == str(h1.id))
    s2 = next(s for s in res["sips"] if s["holding_id"] == str(h2.id))

    assert s1["status"] == "ACTIVE"
    assert s2["status"] == "PAUSED"


def test_sip_health_scoring_and_grades():
    db = _sqlite_session()
    pid = uuid.uuid4()

    # Direct plan fund with low expense ratio
    h = _make_holding(db, pid, "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", AssetType.MUTUAL_FUND, "100000", isin="INF879O01015")
    res = calculate_sip_health(db, [h], [])
    s = res["sips"][0]
    assert s["grade"] in ("A", "B")
    assert s["score"] >= 75
    assert any(f["category"] == "EXPENSE" for f in s["factors"])


def test_sip_switch_simulation():
    db = _sqlite_session()
    pid = uuid.uuid4()

    # Target scheme with high expense ratio
    target_scheme = FundScheme(
        id=uuid.uuid4(),
        scheme_code="HIGH_EXP_01",
        scheme_name="Expensive Regular Fund",
        category="Large Cap",
        expense_ratio=Decimal("0.0160"),  # 1.60%
    )
    # Replacement candidate with lower expense ratio
    repl_scheme = FundScheme(
        id=uuid.uuid4(),
        scheme_code="LOW_EXP_02",
        scheme_name="Low Cost Direct Fund",
        category="Large Cap",
        expense_ratio=Decimal("0.0040"),  # 0.40%
    )
    db.add_all([target_scheme, repl_scheme])
    db.commit()

    h = _make_holding(db, pid, "Expensive Regular Fund", AssetType.MUTUAL_FUND, "50000")
    h.invested_value = Decimal("60000")
    db.commit()

    sim = simulate_sip_switch(db, [h], [], str(h.id), "LOW_EXP_02")
    assert "error" not in sim
    assert sim["target_fund_name"] == "Expensive Regular Fund"
    assert sim["replacement_fund_name"] == "Low Cost Direct Fund"
    assert sim["current_expense_ratio"] == 0.0160
    assert sim["replacement_expense_ratio"] == 0.0040
    assert sim["ter_savings_percent"] == 75.0
    assert sim["estimated_annual_savings"] > 0
    assert sim["score_after"] > sim["score_before"]
    assert "disclaimer" in sim

    # Ensure the original holding was not mutated
    db.refresh(h)
    assert h.name == "Expensive Regular Fund"


# ============================================================
# API INTEGRATION TESTS
# ============================================================

def test_api_phase2_benchmark_endpoint(client):
    res = client.post("/api/portfolios", json={"name": "API Benchmark Portfolio"})
    pid = res.json()["id"]

    resp = client.get(f"/api/portfolios/{pid}/phase2/benchmark?benchmark_id=RETAIL_BASELINE")
    assert resp.status_code == 200
    body = resp.json()
    assert body["benchmark_id"] == "RETAIL_BASELINE"
    assert "portfolio_hhi" in body
    assert "asset_allocation" in body
    assert "available_benchmarks" in body


def test_api_phase2_group_exposure_endpoint(client):
    res = client.post("/api/portfolios", json={"name": "API Group Portfolio"})
    pid = res.json()["id"]

    resp = client.get(f"/api/portfolios/{pid}/phase2/group-exposure?threshold_moderate=15.0&threshold_high=25.0")
    assert resp.status_code == 200
    body = resp.json()
    assert "groups" in body
    assert "thresholds" in body
    assert body["thresholds"]["moderate"] == 15.0


def test_api_phase2_sip_health_endpoint(client):
    res = client.post("/api/portfolios", json={"name": "API SIP Portfolio"})
    pid = res.json()["id"]

    resp = client.get(f"/api/portfolios/{pid}/phase2/sip-health")
    assert resp.status_code == 200
    body = resp.json()
    assert "overall_score" in body
    assert "overall_grade" in body
    assert "sips" in body


def test_api_phase2_sip_switch_simulation_endpoint(client):
    res = client.post("/api/portfolios", json={"name": "API SIP Sim Portfolio"})
    pid = res.json()["id"]

    # Post invalid holding ID -> returns 400 with detail
    sim_resp = client.post(
        f"/api/portfolios/{pid}/phase2/sip-health/simulate-switch",
        json={"target_holding_id": "nonexistent", "replacement_scheme_code": "100033"},
    )
    assert sim_resp.status_code == 400
    assert "not found" in sim_resp.json()["detail"].lower()


def test_api_unauthorized_user_blocked_for_features_4_5_6(client):
    res = client.post("/api/portfolios", json={"name": "Auth Block Test"})
    pid = res.json()["id"]

    async def fake_user():
        return "other-intruder"

    app.dependency_overrides[get_current_user_id] = fake_user
    try:
        assert client.get(f"/api/portfolios/{pid}/phase2/benchmark").status_code == 404
        assert client.get(f"/api/portfolios/{pid}/phase2/group-exposure").status_code == 404
        assert client.get(f"/api/portfolios/{pid}/phase2/sip-health").status_code == 404
    finally:
        async def real_user():
            return "user-one"
        app.dependency_overrides[get_current_user_id] = real_user


"""Tests for Phase 2 services: stress test, fund swap, and correlation.

These tests use the new /api/portfolios/{id}/phase2/* routes which are
additive to the existing Phase 1 endpoints.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.core.security import get_current_user_id
from app.main import app
from app.models.holding import AssetType, Holding
from app.models.market_data import (
    Benchmark,
    BenchmarkPrice,
    FundNAVHistory,
    FundScheme,
)
from app.models.portfolio import Portfolio
from app.services.phase2.correlation import (
    LOOKBACK_WINDOWS,
    _pearson,
    _returns_from_nav,
    calculate_nav_correlation_matrix,
)
from app.services.phase2.fund_swap import simulate_fund_swap
from app.services.phase2.stress_test import SCENARIOS, run_stress_test


# ============================================================
# Fixtures
# ============================================================

def _make_holding(
    db: Session,
    portfolio_id: uuid.UUID,
    name: str,
    asset_type: AssetType,
    current_value: str,
    isin: str | None = None,
) -> Holding:
    h = Holding(
        id=uuid.uuid4(),
        portfolio_id=portfolio_id,
        asset_type=asset_type,
        name=name,
        isin=isin,
        quantity=Decimal("1"),
        average_price=Decimal(current_value),
        current_price=Decimal(current_value),
        invested_value=Decimal(current_value),
        current_value=Decimal(current_value),
    )
    db.add(h)
    return h


def _seed_benchmark(db: Session, benchmark_id: str, start: date, end: date, loss_pct: float) -> None:
    if not db.get(Benchmark, benchmark_id):
        db.add(Benchmark(id=benchmark_id, name=benchmark_id, index_symbol="X"))
    # Avoid duplicates
    db.query(BenchmarkPrice).filter(
        BenchmarkPrice.benchmark_id == benchmark_id,
        BenchmarkPrice.price_date >= start,
        BenchmarkPrice.price_date <= end,
    ).delete()
    base = Decimal("100.00")
    end_val = (base * (Decimal("1") - Decimal(str(loss_pct)))).quantize(Decimal("0.01"))
    db.add(BenchmarkPrice(benchmark_id=benchmark_id, price_date=start, value=base))
    db.add(BenchmarkPrice(benchmark_id=benchmark_id, price_date=end, value=end_val))
    db.commit()


def _seed_scheme_with_nav(
    db: Session,
    scheme_code: str,
    isin: str,
    scheme_name: str,
    category: str,
    nav_history: list[tuple[date, Decimal]],
    expense_ratio: str = "0.0050",
) -> FundScheme:
    existing = db.query(FundScheme).filter(FundScheme.scheme_code == scheme_code).first()
    if existing:
        return existing
    s = FundScheme(
        id=uuid.uuid4(),
        scheme_code=scheme_code,
        scheme_name=scheme_name,
        isin=isin,
        amc_name="Test AMC",
        category=category,
        expense_ratio=Decimal(expense_ratio),
        benchmark_id="NIFTY_50",
    )
    db.add(s)
    db.flush()
    for d, v in nav_history:
        db.add(FundNAVHistory(scheme_id=s.id, nav_date=d, nav=v))
    db.commit()
    return s


# ============================================================
# STRESS TEST — unit tests
# ============================================================

def test_stress_test_scenarios_are_well_formed():
    assert "COVID_2020" in SCENARIOS
    assert "CRISIS_2008" in SCENARIOS
    for s in SCENARIOS.values():
        assert s.start_date < s.end_date
        assert s.benchmark_id
        assert s.methodology
        assert s.data_source


def test_stress_test_empty_portfolio():
    db = _sqlite_session()
    result = run_stress_test(db, [], "COVID_2020")
    assert result["starting_value"] == 0.0
    assert result["estimated_loss"] == 0.0
    assert result["ending_value"] == 0.0
    assert result["loss_percent"] == 0.0
    assert result["data_coverage"] == 0.0


def test_stress_test_one_stock_with_benchmark():
    db = _sqlite_session()
    _seed_benchmark(db, "NIFTY_50", date(2020, 1, 15), date(2020, 3, 23), 0.38)
    h = Holding(
        id=uuid.uuid4(),
        portfolio_id=uuid.uuid4(),
        asset_type=AssetType.STOCK,
        name="Test Stock",
        isin=None,
        quantity=Decimal("1"),
        average_price=Decimal("100"),
        current_price=Decimal("100"),
        invested_value=Decimal("100"),
        current_value=Decimal("100"),
    )
    result = run_stress_test(db, [h], "COVID_2020")
    assert result["estimated_loss"] > 0
    assert result["loss_percent"] > 0
    assert result["data_coverage"] == 1.0
    assert len(result["holdings"]) == 1
    assert result["holdings"][0]["asset_type"] == "STOCK"
    assert result["holdings"][0]["confidence"] == "ESTIMATED"


def test_stress_test_cash_unaffected():
    db = _sqlite_session()
    _seed_benchmark(db, "NIFTY_50", date(2020, 1, 15), date(2020, 3, 23), 0.38)
    cash = Holding(
        id=uuid.uuid4(),
        portfolio_id=uuid.uuid4(),
        asset_type=AssetType.CASH,
        name="Cash Balance",
        isin=None,
        quantity=Decimal("1"),
        average_price=Decimal("1000"),
        current_price=Decimal("1000"),
        invested_value=Decimal("1000"),
        current_value=Decimal("1000"),
    )
    result = run_stress_test(db, [cash], "COVID_2020")
    assert result["estimated_loss"] == 0.0
    assert result["holdings"][0]["confidence"] == "ACTUAL_NAV"
    assert result["holdings"][0]["scenario_return"] == 0.0


def test_stress_test_missing_benchmark_marks_unavailable():
    db = _sqlite_session()
    h = Holding(
        id=uuid.uuid4(),
        portfolio_id=uuid.uuid4(),
        asset_type=AssetType.STOCK,
        name="Test Stock",
        isin=None,
        quantity=Decimal("1"),
        average_price=Decimal("100"),
        current_price=Decimal("100"),
        invested_value=Decimal("100"),
        current_value=Decimal("100"),
    )
    result = run_stress_test(db, [h], "COVID_2020")
    # No benchmark data → marking unavailable
    assert result["holdings"][0]["confidence"] == "UNAVAILABLE"
    assert "Test Stock" in result["missing_assets"]


def test_stress_test_holding_impact_sums_to_total_loss():
    db = _sqlite_session()
    _seed_benchmark(db, "NIFTY_50", date(2020, 1, 15), date(2020, 3, 23), 0.38)
    pid = uuid.uuid4()
    holdings = [
        _make_holding(db, pid, "Stock A", AssetType.STOCK, "50000"),
        _make_holding(db, pid, "Stock B", AssetType.STOCK, "30000"),
        _make_holding(db, pid, "Cash", AssetType.CASH, "20000"),
    ]
    result = run_stress_test(db, holdings, "COVID_2020")
    # Per-holding impact is signed (negative for loss). Sum of impacts must
    # equal -estimated_loss (estimated_loss is stored as positive magnitude).
    sum_impacts = sum(h["impact"] for h in result["holdings"])
    assert abs(sum_impacts + result["estimated_loss"]) < 0.5


def test_stress_test_mf_with_actual_nav():
    db = _sqlite_session()
    _seed_benchmark(db, "NIFTY_50", date(2020, 1, 15), date(2020, 3, 23), 0.38)
    pid = uuid.uuid4()
    # Seed a scheme with NAV points around 2020 scenario window
    nav = [
        (date(2020, 1, 10), Decimal("100.00")),
        (date(2020, 1, 15), Decimal("100.00")),
        (date(2020, 2, 1),  Decimal("85.00")),
        (date(2020, 3, 1),  Decimal("75.00")),
        (date(2020, 3, 23), Decimal("70.00")),  # -30% actual
        (date(2020, 4, 1),  Decimal("80.00")),
    ]
    s = _seed_scheme_with_nav(db, "TEST001", "INF999TEST01", "Test Fund", "Large Cap", nav)
    h = _make_holding(db, pid, "Test Fund", AssetType.MUTUAL_FUND, "10000", isin=s.isin)
    result = run_stress_test(db, [h], "COVID_2020")
    assert result["holdings"][0]["confidence"] == "ACTUAL_NAV"
    # Actual NAV-derived return should be reported
    assert result["holdings"][0]["scenario_return"] < 0


def test_stress_test_zero_value_holding():
    db = _sqlite_session()
    _seed_benchmark(db, "NIFTY_50", date(2020, 1, 15), date(2020, 3, 23), 0.38)
    h = Holding(
        id=uuid.uuid4(),
        portfolio_id=uuid.uuid4(),
        asset_type=AssetType.STOCK,
        name="Empty Holding",
        isin=None,
        quantity=Decimal("0"),
        average_price=Decimal("0"),
        current_price=Decimal("0"),
        invested_value=Decimal("0"),
        current_value=Decimal("0"),
    )
    result = run_stress_test(db, [h], "COVID_2020")
    # Should not error; impact is 0
    assert result["estimated_loss"] == 0.0
    # The zero-value holding is filtered out of the per-holding list.
    # We verify that no impact was attributed to it.
    assert all(item["impact"] == 0.0 for item in result["holdings"])


def test_stress_test_invalid_scenario_falls_back():
    db = _sqlite_session()
    _seed_benchmark(db, "NIFTY_50", date(2020, 1, 15), date(2020, 3, 23), 0.38)
    h = Holding(
        id=uuid.uuid4(),
        portfolio_id=uuid.uuid4(),
        asset_type=AssetType.STOCK,
        name="X",
        isin=None,
        quantity=Decimal("1"),
        average_price=Decimal("100"),
        current_price=Decimal("100"),
        invested_value=Decimal("100"),
        current_value=Decimal("100"),
    )
    result = run_stress_test(db, [h], "DOES_NOT_EXIST")
    assert result["scenario"] == "COVID_2020"  # falls back to default


# ============================================================
# FUND SWAP — unit tests
# ============================================================

def test_fund_swap_preserves_real_portfolio():
    """The real portfolio must not be mutated."""
    db = _sqlite_session()
    pid = uuid.uuid4()
    real_holding = _make_holding(db, pid, "Real Fund A", AssetType.MUTUAL_FUND, "20000", isin="INF111REAL01")
    isin_before = real_holding.isin
    name_before = real_holding.name
    value_before = real_holding.current_value

    _seed_scheme_with_nav(
        db, "REPL001", "INF222REPL01", "Replacement Fund", "Large Cap",
        [(date.today() - timedelta(days=i), Decimal("100")) for i in range(5)],
    )

    simulate_fund_swap(db, [real_holding], str(real_holding.id), "REPL001")

    # Real holding must be untouched
    db.refresh(real_holding)
    assert real_holding.isin == isin_before
    assert real_holding.name == name_before
    assert real_holding.current_value == value_before


def test_fund_swap_invalid_target_returns_error():
    db = _sqlite_session()
    pid = uuid.uuid4()
    h = _make_holding(db, pid, "Fund", AssetType.MUTUAL_FUND, "10000")
    _seed_scheme_with_nav(
        db, "X1", "INF111X1", "X", "Large Cap",
        [(date.today() - timedelta(days=i), Decimal("100")) for i in range(5)],
    )
    result = simulate_fund_swap(db, [h], "nonexistent-id", "X1")
    assert "error" in result


def test_fund_swap_invalid_replacement_returns_error():
    db = _sqlite_session()
    pid = uuid.uuid4()
    h = _make_holding(db, pid, "Fund", AssetType.MUTUAL_FUND, "10000")
    result = simulate_fund_swap(db, [h], str(h.id), "DOES_NOT_EXIST")
    assert "error" in result


def test_fund_swap_returns_before_after_delta():
    db = _sqlite_session()
    pid = uuid.uuid4()
    _make_holding(db, pid, "Fund A", AssetType.MUTUAL_FUND, "20000", isin="INF111A001")
    _seed_scheme_with_nav(
        db, "B001", "INF222B001", "Replacement B", "Large Cap",
        [(date.today() - timedelta(days=i), Decimal("100")) for i in range(5)],
        expense_ratio="0.0030",
    )
    holding = db.query(Holding).filter(Holding.name == "Fund A").first()
    result = simulate_fund_swap(db, [holding], str(holding.id), "B001")
    assert "before" in result
    assert "after" in result
    assert "delta" in result
    assert "disclaimer" in result
    # Metrics should be present
    assert "hhi" in result["before"]
    assert "score" in result["before"]


# ============================================================
# CORRELATION — unit tests
# ============================================================

def test_pearson_perfect_positive():
    x = [0.01, -0.02, 0.03, 0.005, -0.01]
    y = [0.01, -0.02, 0.03, 0.005, -0.01]
    assert abs(_pearson(x, y) - 1.0) < 1e-9


def test_pearson_perfect_negative():
    x = [0.01, -0.02, 0.03, 0.005, -0.01]
    y = [-0.01, 0.02, -0.03, -0.005, 0.01]
    assert abs(_pearson(x, y) - (-1.0)) < 1e-9


def test_pearson_zero_variance_returns_zero():
    x = [0.01] * 5
    y = [0.01, -0.02, 0.03, 0.005, -0.01]
    assert _pearson(x, y) == 0.0


def test_returns_from_nav():
    pts = [
        (date(2024, 1, 1), Decimal("100")),
        (date(2024, 1, 2), Decimal("110")),  # +10%
        (date(2024, 1, 3), Decimal("99")),   # -10%
    ]
    rets = _returns_from_nav(pts)
    assert len(rets) == 2
    assert abs(rets[0][1] - 0.10) < 1e-9
    assert abs(rets[1][1] - (-0.10)) < 1e-9


def test_correlation_with_two_funds():
    db = _sqlite_session()
    pid = uuid.uuid4()
    h1 = _make_holding(db, pid, "Fund1", AssetType.MUTUAL_FUND, "10000", isin="INF111C001")
    h2 = _make_holding(db, pid, "Fund2", AssetType.MUTUAL_FUND, "10000", isin="INF222C002")

    today = date.today()
    nav1 = [(today - timedelta(days=i), Decimal(str(100 + i * 0.5))) for i in range(60, -1, -1)]
    nav2 = [(today - timedelta(days=i), Decimal(str(100 + i * 0.5))) for i in range(60, -1, -1)]
    _seed_scheme_with_nav(db, "C001", "INF111C001", "Fund1", "Large Cap", nav1)
    _seed_scheme_with_nav(db, "C002", "INF222C002", "Fund2", "Large Cap", nav2)

    result = calculate_nav_correlation_matrix(db, [h1, h2], lookback="1Y")
    assert len(result["funds"]) == 2
    assert len(result["matrix"]) == 2
    assert abs(result["matrix"][0][0] - 1.0) < 1e-9
    assert abs(result["matrix"][1][1] - 1.0) < 1e-9
    # Identical NAV → correlation ≈ 1
    assert result["matrix"][0][1] > 0.99


def test_correlation_with_insufficient_data():
    db = _sqlite_session()
    pid = uuid.uuid4()
    h1 = _make_holding(db, pid, "Fund1", AssetType.MUTUAL_FUND, "10000", isin="INF111D001")
    h2 = _make_holding(db, pid, "Fund2", AssetType.MUTUAL_FUND, "10000", isin="INF222D002")
    # Only 3 data points
    today = date.today()
    nav1 = [(today - timedelta(days=i), Decimal("100")) for i in range(3, -1, -1)]
    nav2 = [(today - timedelta(days=i), Decimal("100")) for i in range(3, -1, -1)]
    _seed_scheme_with_nav(db, "D001", "INF111D001", "Fund1", "Large Cap", nav1)
    _seed_scheme_with_nav(db, "D002", "INF222D002", "Fund2", "Large Cap", nav2)

    result = calculate_nav_correlation_matrix(db, [h1, h2], lookback="1Y")
    assert result["matrix"] == []  # Empty matrix due to insufficient data
    assert "disclaimer" in result
    assert len(result["insufficient_funds"]) == 2


def test_correlation_with_unknown_funds():
    db = _sqlite_session()
    pid = uuid.uuid4()
    h1 = _make_holding(db, pid, "Unknown Fund", AssetType.MUTUAL_FUND, "10000", isin="INF999UNK01")
    h2 = _make_holding(db, pid, "Another Unknown", AssetType.MUTUAL_FUND, "10000", isin="INF999UNK02")

    result = calculate_nav_correlation_matrix(db, [h1, h2], lookback="1Y")
    # No data → empty matrix + reported as insufficient
    assert result["matrix"] == []
    assert len(result["insufficient_funds"]) == 2


def test_correlation_lookback_windows_present():
    for w in ("3M", "6M", "1Y", "3Y"):
        assert w in LOOKBACK_WINDOWS


def test_correlation_includes_methodology_and_disclaimer():
    db = _sqlite_session()
    pid = uuid.uuid4()
    h1 = _make_holding(db, pid, "F1", AssetType.MUTUAL_FUND, "10000", isin="INF111E001")
    today = date.today()
    nav1 = [(today - timedelta(days=i), Decimal(str(100 + i * 0.5))) for i in range(40, -1, -1)]
    _seed_scheme_with_nav(db, "E001", "INF111E001", "F1", "Large Cap", nav1)
    h2 = _make_holding(db, pid, "F2", AssetType.MUTUAL_FUND, "10000", isin="INF222E002")
    nav2 = [(today - timedelta(days=i), Decimal(str(100 + i * 0.7))) for i in range(40, -1, -1)]
    _seed_scheme_with_nav(db, "E002", "INF222E002", "F2", "Large Cap", nav2)

    result = calculate_nav_correlation_matrix(db, [h1, h2], lookback="1Y")
    assert "methodology" in result
    assert "disclaimer" in result
    assert "thresholds" in result


# ============================================================
# API endpoint tests
# ============================================================

def test_phase2_stress_test_endpoint(client):
    res = client.post("/api/portfolios", json={"name": "Stress Test"})
    p_id = res.json()["id"]
    res = client.get(f"/api/portfolios/{p_id}/phase2/stress-test?scenario=COVID_2020")
    assert res.status_code == 200
    body = res.json()
    assert "available_scenarios" in body
    assert "result" in body
    assert body["result"]["scenario"] == "COVID_2020"


def test_phase2_stress_test_post_endpoint(client):
    res = client.post("/api/portfolios", json={"name": "Stress Test Post"})
    p_id = res.json()["id"]
    res = client.post(
        f"/api/portfolios/{p_id}/phase2/stress-test",
        json={"scenario_id": "CRISIS_2008"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["scenario"] == "CRISIS_2008"
    # The new endpoint includes per-holding breakdown
    assert "holdings" in body
    assert "data_source" in body
    assert "methodology" in body
    assert "disclaimer" in body


def test_phase2_fund_swap_endpoint(client):
    res = client.post("/api/portfolios", json={"name": "Swap Test"})
    p_id = res.json()["id"]
    res = client.post(
        f"/api/portfolios/{p_id}/phase2/fund-swap",
        json={"target_holding_id": "fake", "replacement_scheme_code": "fake"},
    )
    # 200 with error message, not 500
    assert res.status_code == 200
    body = res.json()
    # Either an error or a result is acceptable
    assert "disclaimer" in body


def test_phase2_correlation_endpoint(client):
    res = client.post("/api/portfolios", json={"name": "Corr Test"})
    p_id = res.json()["id"]
    res = client.get(f"/api/portfolios/{p_id}/phase2/correlation?lookback=1Y")
    assert res.status_code == 200
    body = res.json()
    assert "available_lookbacks" in body
    assert "result" in body
    assert body["result"]["lookback"] == "1Y"


def test_phase2_correlation_lookback_options(client):
    res = client.post("/api/portfolios", json={"name": "Corr Lookback Test"})
    p_id = res.json()["id"]
    for lookback in ("3M", "6M", "1Y", "3Y"):
        res = client.get(f"/api/portfolios/{p_id}/phase2/correlation?lookback={lookback}")
        assert res.status_code == 200
        body = res.json()
        assert body["result"]["lookback"] == lookback


# ============================================================
# Helpers
# ============================================================

def _sqlite_session():
    """Create an isolated sqlite session for direct service unit tests."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from app.db.database import Base
    import app.models  # noqa: F401

    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return TestSession()


def test_unauthorized_user_blocked_for_phase2_endpoints(client):
    res = client.post("/api/portfolios", json={"name": "Auth Test"})
    p_id = res.json()["id"]

    async def other_user() -> str:
        return "another-user"

    app.dependency_overrides[get_current_user_id] = other_user
    try:
        res = client.get(f"/api/portfolios/{p_id}/phase2/stress-test")
        assert res.status_code == 404
        res = client.get(f"/api/portfolios/{p_id}/phase2/correlation")
        assert res.status_code == 404
    finally:
        async def user_one() -> str:
            return "user-one"
        app.dependency_overrides[get_current_user_id] = user_one

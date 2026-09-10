"""
Unit and integration tests for Admin AMFI Master Data Ingestion endpoints:
- GET /api/admin/amfi/status
- POST /api/admin/amfi/preview
- POST /api/admin/amfi/import
"""
import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import get_current_user_id
from app.db.database import Base
from app.db.dependencies import get_db
from app.main import app
from app.models.market_data import FundScheme, SchemeHolding, DataSyncRecord


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(test_db):
    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user_id] = lambda: "admin_user_123"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_get_amfi_data_status(client):
    res = client.get("/api/admin/amfi/status")
    assert res.status_code == 200
    data = res.json()
    assert "schemes_count" in data
    assert "holdings_count" in data
    assert "database_status" in data
    assert "recent_syncs" in data


def test_preview_amfi_file_invalid_extension(client):
    files = {"file": ("test.pdf", b"dummy content", "application/pdf")}
    res = client.post("/api/admin/amfi/preview", files=files)
    assert res.status_code == 400
    assert "Supported formats" in res.json()["detail"]


def test_preview_and_import_real_amfi_file(client):
    repo_file = (
        Path(__file__).resolve().parents[1]
        / "test-data"
        / "amfi"
        / "All-Schemes-Monthly-Portfolio---as-on-31st-July-2026.xlsx"
    )
    if not repo_file.exists():
        pytest.skip("Test AMFI Excel not found")

    content = repo_file.read_bytes()

    # 1. Test Preview
    files = {"file": ("All-Schemes-Monthly-Portfolio.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    res = client.post("/api/admin/amfi/preview", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["schemes_detected"] > 0
    assert data["holdings_detected"] > 0
    assert data["as_of_date"] is not None

    # 2. Test Import
    files = {"file": ("All-Schemes-Monthly-Portfolio.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    res_import = client.post("/api/admin/amfi/import", files=files)
    assert res_import.status_code == 200
    import_data = res_import.json()
    assert import_data["status"] == "SUCCESS"
    assert import_data["schemes_imported"] > 0
    assert import_data["holdings_imported"] > 0
    assert "imported successfully" in import_data["message"]

    # 3. Test Preview Duplicate Detection
    files = {"file": ("All-Schemes-Monthly-Portfolio.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    res_dup = client.post("/api/admin/amfi/preview", files=files)
    assert res_dup.status_code == 200
    dup_data = res_dup.json()
    assert dup_data["is_duplicate"] is True

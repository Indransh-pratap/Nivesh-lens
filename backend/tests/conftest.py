import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("INTERNAL_API_SECRET", "test-shared-secret")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import get_current_user_id
from app.db.database import Base, get_db
from app.main import app
import app.models as models  # noqa: F401


@pytest.fixture()
def client() -> TestClient:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    def override_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    async def user_one() -> str:
        return "user-one"

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user_id] = user_one
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)

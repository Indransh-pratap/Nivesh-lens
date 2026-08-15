from app.core.security import get_current_user_id
from app.main import app


def create(client, name="My Portfolio"):
    return client.post("/api/portfolios", json={"name": name})


def test_create_portfolio(client):
    response = create(client)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "My Portfolio"
    assert body["total_value"] == 0.0


def test_get_portfolio(client):
    portfolio_id = create(client).json()["id"]
    response = client.get(f"/api/portfolios/{portfolio_id}")
    assert response.status_code == 200
    assert response.json()["id"] == portfolio_id


def test_user_cannot_access_other_users_portfolio(client):
    portfolio_id = create(client).json()["id"]

    async def another_user() -> str:
        return "user-two"

    app.dependency_overrides[get_current_user_id] = another_user
    response = client.get(f"/api/portfolios/{portfolio_id}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PORTFOLIO_NOT_FOUND"


def test_delete_portfolio(client):
    portfolio_id = create(client).json()["id"]
    response = client.delete(f"/api/portfolios/{portfolio_id}")
    assert response.status_code == 204
    assert client.get(f"/api/portfolios/{portfolio_id}").status_code == 404

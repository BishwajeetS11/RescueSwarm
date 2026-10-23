from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health_returns_documented_schema() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "rescueswarm-api"}


def test_health_does_not_leak_secrets_or_environment() -> None:
    response = client.get("/health")
    body = response.text.lower()

    assert "llm_api_key" not in body
    assert "database_url" not in body
    assert "traceback" not in body
    assert "secret" not in body

from tests.conftest import valid_mini_draft


def test_list_scenarios_includes_bundled(client) -> None:
    response = client.get("/api/v1/scenarios")
    assert response.status_code == 200
    body = response.json()
    ids = {item["id"] for item in body["items"]}
    assert "scenario-balanced-1" in ids
    assert "scenario-shortage-1" in ids
    assert "scenario-routes-1" in ids
    assert len(body["items"]) >= 3


def test_get_scenario_detail(client) -> None:
    response = client.get("/api/v1/scenarios/scenario-balanced-1")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "scenario-balanced-1"
    assert body["nodes"]
    assert body["incidents"]
    assert body["medical_units"]


def test_get_unknown_scenario_is_not_found(client) -> None:
    response = client.get("/api/v1/scenarios/does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"
    assert "traceback" not in response.text.lower()


def test_validate_invalid_domain_returns_200(client) -> None:
    payload = valid_mini_draft().model_dump()
    payload["edges"][0]["source"] = "missing"
    response = client.post("/api/v1/scenarios/validate", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert body["errors"]


def test_validate_malformed_payload_returns_422(client) -> None:
    response = client.post("/api/v1/scenarios/validate", json={"name": 123})
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_create_valid_scenario(client) -> None:
    payload = valid_mini_draft().model_dump()
    payload["id"] = "scenario-created-1"
    response = client.post("/api/v1/scenarios", json=payload)
    assert response.status_code == 201
    assert response.json()["id"] == "scenario-created-1"
    fetched = client.get("/api/v1/scenarios/scenario-created-1")
    assert fetched.status_code == 200

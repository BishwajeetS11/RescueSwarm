from __future__ import annotations

import json
from pathlib import Path

import pytest
from app.api.deps import get_scenario_repository
from app.core.config import get_settings
from app.core.db import get_engine, get_session_factory
from app.core.limits import ScenarioLimits
from app.main import app
from app.schemas.scenario import ScenarioDraft
from app.services.run_service import get_run_repository
from app.services.scenario_validation import validate_scenario_draft
from fastapi.testclient import TestClient

SCENARIOS_DIR = Path(__file__).resolve().parents[1] / "scenarios"


@pytest.fixture
def limits() -> ScenarioLimits:
    return ScenarioLimits()


@pytest.fixture
def client(tmp_path, monkeypatch) -> TestClient:
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/test.db")
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()
    get_scenario_repository.cache_clear()
    get_run_repository.cache_clear()
    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()
    get_scenario_repository.cache_clear()
    get_run_repository.cache_clear()


def load_bundled_draft(name: str) -> ScenarioDraft:
    payload = json.loads((SCENARIOS_DIR / name).read_text(encoding="utf-8"))
    return ScenarioDraft.model_validate(payload)


def valid_mini_draft() -> ScenarioDraft:
    return ScenarioDraft.model_validate(
        {
            "id": "scenario-mini",
            "name": "Mini",
            "description": "Tiny synthetic graph for validation tests.",
            "schema_version": 1,
            "nodes": [
                {"id": "n1", "label": "Base", "kind": "resource_base"},
                {"id": "n2", "label": "Site", "kind": "incident_site"},
            ],
            "edges": [{"id": "e1", "source": "n1", "target": "n2", "cost": 1, "available": True}],
            "incidents": [
                {
                    "id": "i1",
                    "label": "Incident",
                    "node_id": "n2",
                    "category": "flood",
                    "urgency": 3,
                    "people_affected": 4,
                    "time_sensitivity": 0.5,
                    "access_risk": 0.2,
                    "medical_units_required": 1,
                    "kits_required": 1,
                    "shelter_demand": 1,
                    "status": "pending",
                }
            ],
            "medical_units": [{"id": "m1", "node_id": "n1", "available": True}],
            "shelters": [{"id": "s1", "node_id": "n2", "capacity": 5, "used_capacity": 0, "enabled": True}],
            "supply_stocks": [{"id": "k1", "node_id": "n1", "kits_available": 3}],
        }
    )


def assert_valid(draft: ScenarioDraft, limits: ScenarioLimits) -> None:
    result = validate_scenario_draft(draft, limits, assign_id=draft.id)
    assert result.valid, [item.model_dump() for item in result.errors]

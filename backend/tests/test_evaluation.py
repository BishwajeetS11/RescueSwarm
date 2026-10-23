from __future__ import annotations

from pathlib import Path

from app.agents.coordinator import Coordinator
from app.algorithms.metrics import compute_metrics
from app.core.config import get_settings
from app.core.limits import limits_from_settings
from app.evaluation import build_scale_scenario
from app.schemas.enums import DisruptionType, LLMMode, RunStrategy
from app.schemas.run import DisruptionRequest
from app.schemas.scenario import Scenario
from app.services.scenario_validation import validate_scenario_draft
from app.simulation.disruptions import apply_disruption

from tests.conftest import load_bundled_draft

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts" / "run_experiments.py"


def test_scale_scenario_validates_within_caps() -> None:
    scenario = build_scale_scenario()
    result = validate_scenario_draft(scenario, limits_from_settings(get_settings()), assign_id=scenario.id)
    assert result.valid, [item.model_dump() for item in result.errors]
    assert len(scenario.nodes) <= 25
    assert len(scenario.edges) <= 60
    assert len(scenario.incidents) <= 20


def test_export_metrics_match_recomputed_metrics() -> None:
    scenario = Scenario.model_validate(load_bundled_draft("balanced_flood.json").model_dump())
    coordinator = Coordinator(get_settings())
    detail, state, _events = coordinator.execute(scenario, RunStrategy.rescueswarm, 42, LLMMode.mock)
    recomputed = compute_metrics(state)
    assert detail.metrics.incident_coverage_rate == recomputed.incident_coverage_rate
    assert detail.metrics.unmet_demand_total == recomputed.unmet_demand_total
    assert detail.metrics.kits_delivered == recomputed.kits_delivered
    assert detail.metrics.constraint_violation_count == 0


def test_disruption_recovery_on_used_route() -> None:
    scenario = Scenario.model_validate(load_bundled_draft("alternate_routes.json").model_dump())
    coordinator = Coordinator(get_settings())
    _detail, state, events = coordinator.execute(scenario, RunStrategy.rescueswarm, 42, LLMMode.mock)
    before = len(state.medical_assignments)
    assert before == 1
    affected = apply_disruption(
        state,
        DisruptionRequest(type=DisruptionType.close_edge, edge_id="e-cheap", reason="test"),
    )
    assert "inc-1" in affected
    updated, state, _events = coordinator.execute(
        scenario,
        RunStrategy.rescueswarm,
        42,
        LLMMode.mock,
        run_id=state.run_id,
        existing_state=state,
        existing_events=events,
        replan=True,
    )
    assert updated.metrics.replan_count == 1
    assert len(state.medical_assignments) == 1
    assert state.medical_assignments[0].route != ["n-base", "n-incident"]
    assert updated.metrics.constraint_violation_count == 0
    assert SCRIPTS.exists()

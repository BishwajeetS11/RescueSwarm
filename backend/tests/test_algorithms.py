from app.algorithms.constraints import committed_invariants
from app.algorithms.metrics import compute_metrics
from app.algorithms.planner import plan_once
from app.algorithms.priority import rank_incidents, score_incident
from app.algorithms.routing import shortest_route
from app.schemas.enums import RunStrategy
from app.schemas.scenario import Edge, Node, Scenario
from app.simulation.state import SimulationState

from tests.conftest import load_bundled_draft, valid_mini_draft


def _state(scenario: Scenario, strategy: RunStrategy = RunStrategy.rescueswarm) -> SimulationState:
    return SimulationState.from_scenario(scenario, run_id="run-test", seed=42, strategy=strategy)


def _scenario(name: str) -> Scenario:
    draft = load_bundled_draft(name)
    return Scenario.model_validate(draft.model_dump())


def test_closed_edge_is_excluded_from_shortest_path() -> None:
    nodes = [
        Node(id="a", label="A", kind="resource_base"),
        Node(id="b", label="B", kind="incident_site"),
        Node(id="c", label="C", kind="junction"),
    ]
    edges = [
        Edge(id="cheap", source="a", target="b", cost=1, available=False),
        Edge(id="ac", source="a", target="c", cost=2, available=True),
        Edge(id="cb", source="c", target="b", cost=2, available=True),
    ]
    result = shortest_route(nodes, edges, "a", "b")
    assert result.feasible is True
    assert result.path == ["a", "c", "b"]
    assert result.cost == 4


def test_unreachable_incident_has_no_route() -> None:
    nodes = [
        Node(id="a", label="A", kind="resource_base"),
        Node(id="b", label="B", kind="incident_site"),
    ]
    edges = [Edge(id="ab", source="a", target="b", cost=1, available=False)]
    result = shortest_route(nodes, edges, "a", "b")
    assert result.feasible is False


def test_priority_tie_breaks_by_input_order_then_id() -> None:
    scenario = valid_mini_draft()
    payload = scenario.model_dump()
    payload["incidents"].append(
        {
            "id": "i0",
            "label": "Same score earlier id",
            "node_id": "n2",
            "category": "flood",
            "urgency": 3,
            "people_affected": 4,
            "time_sensitivity": 0.5,
            "access_risk": 0.2,
            "medical_units_required": 0,
            "kits_required": 0,
            "shelter_demand": 0,
            "status": "pending",
        }
    )
    state = _state(Scenario.model_validate({**payload, "id": "s"}))
    ranked = rank_incidents(state)
    assert [incident.id for incident in ranked] == ["i1", "i0"]
    assert score_incident(ranked[0], 4) == score_incident(ranked[1], 4)


def test_shortage_does_not_double_book_and_reports_unmet() -> None:
    state = _state(_scenario("resource_shortage.json"))
    plan_once(state)
    errors = committed_invariants(state)
    assert errors == []
    assigned_units = [item.unit_id for item in state.medical_assignments]
    assert len(assigned_units) == len(set(assigned_units)) == 1
    assert sum(state.unmet_medical.values()) == 2


def test_disconnected_incident_is_unserved() -> None:
    state = _state(_scenario("disconnected.json"))
    plan_once(state)
    assert "inc-island" in state.unmet_medical
    assert state.medical_assigned_count("inc-reachable") == 1


def test_supply_shortage_records_partial_fulfillment() -> None:
    state = _state(_scenario("supply_shortage.json"))
    plan_once(state)
    metrics = compute_metrics(state)
    assert metrics.kits_delivered == 5
    assert metrics.unmet_kits == 15
    assert metrics.kit_fulfillment_rate == 0.25


def test_shelter_shortage_does_not_exceed_capacity() -> None:
    state = _state(_scenario("shelter_shortage.json"))
    plan_once(state)
    for shelter in state.shelters:
        assert shelter.used_capacity <= shelter.capacity
    metrics = compute_metrics(state)
    assert metrics.unmet_shelter > 0


def test_zero_demand_metrics_are_null() -> None:
    payload = valid_mini_draft().model_dump()
    payload["incidents"][0].update(
        {"medical_units_required": 0, "kits_required": 0, "shelter_demand": 0, "people_affected": 0}
    )
    payload["medical_units"] = []
    payload["shelters"] = []
    payload["supply_stocks"] = []
    state = _state(Scenario.model_validate({**payload, "id": "zero"}))
    plan_once(state)
    metrics = compute_metrics(state)
    assert metrics.medical_assignment_coverage is None
    assert metrics.kit_fulfillment_rate is None
    assert metrics.shelter_fulfillment_rate is None


def test_identical_inputs_are_deterministic() -> None:
    first = _state(_scenario("balanced_flood.json"))
    second = _state(_scenario("balanced_flood.json"))
    plan_once(first)
    plan_once(second)
    assert first.signature() == second.signature()


def test_baseline_and_rescueswarm_share_invariants() -> None:
    swarm = _state(_scenario("resource_shortage.json"), RunStrategy.rescueswarm)
    base = _state(_scenario("resource_shortage.json"), RunStrategy.baseline)
    plan_once(swarm)
    plan_once(base)
    assert committed_invariants(swarm) == []
    assert committed_invariants(base) == []
    assert len(swarm.medical_assignments) == 1
    assert len(base.medical_assignments) == 1


def test_shortage_priority_differs_from_baseline_input_order() -> None:
    swarm = _state(_scenario("resource_shortage.json"), RunStrategy.rescueswarm)
    base = _state(_scenario("resource_shortage.json"), RunStrategy.baseline)
    plan_once(swarm)
    plan_once(base)
    assert swarm.medical_assignments[0].incident_id == "inc-high"
    assert base.medical_assignments[0].incident_id == "inc-low"
    assert compute_metrics(swarm).medical_assignment_coverage == compute_metrics(base).medical_assignment_coverage

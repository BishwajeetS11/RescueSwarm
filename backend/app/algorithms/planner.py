from app.algorithms.actions import ProposedAction
from app.algorithms.constraints import apply_action, committed_invariants, validate_action
from app.algorithms.medical import propose_medical
from app.algorithms.priority import rank_incidents
from app.algorithms.shelter import propose_shelter
from app.algorithms.supply import propose_supply
from app.schemas.common import FieldIssue
from app.simulation.state import SimulationState


def plan_once(state: SimulationState) -> list[tuple[ProposedAction, list[FieldIssue]]]:
    ordered = rank_incidents(state)
    proposals = propose_medical(state, ordered) + propose_shelter(state, ordered) + propose_supply(state, ordered)
    results: list[tuple[ProposedAction, list[FieldIssue]]] = []
    for action in proposals:
        errors = validate_action(state, action)
        results.append((action, errors))
        if not errors:
            apply_action(state, action)
    return results


def assert_invariants(state: SimulationState) -> None:
    errors = committed_invariants(state)
    if errors:
        raise AssertionError([item.model_dump() for item in errors])

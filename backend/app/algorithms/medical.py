from app.algorithms.actions import ProposedAction
from app.algorithms.routing import shortest_route
from app.schemas.enums import ResourceStatus, RunStrategy
from app.schemas.scenario import Incident
from app.simulation.state import SimulationState


def propose_medical(state: SimulationState, ordered: list[Incident]) -> list[ProposedAction]:
    actions: list[ProposedAction] = []
    incidents = ordered if state.strategy == RunStrategy.rescueswarm else list(state.incidents)
    for incident in incidents:
        needed = incident.medical_units_required - state.medical_assigned_count(incident.id)
        if needed <= 0:
            continue
        remaining = needed
        while remaining > 0:
            chosen: tuple[float, str] | None = None
            chosen_action: ProposedAction | None = None
            units = (
                sorted(state.units, key=lambda unit: unit.id)
                if state.strategy == RunStrategy.baseline
                else list(state.units)
            )
            for unit in units:
                if unit.status != ResourceStatus.available:
                    continue
                if any(action.unit_id == unit.id for action in actions):
                    continue
                route = shortest_route(state.nodes, state.edges, unit.node_id, incident.node_id)
                if not route.feasible:
                    continue
                action = ProposedAction(
                    kind="assign_medical",
                    incident_id=incident.id,
                    unit_id=unit.id,
                    route=route.path,
                    route_cost=route.cost,
                    reason_codes=["medical_assigned"],
                )
                if state.strategy == RunStrategy.baseline:
                    chosen_action = action
                    break
                key = (route.cost, unit.id)
                if chosen is None or key < chosen:
                    chosen = key
                    chosen_action = action
            if chosen_action is None:
                actions.append(
                    ProposedAction(
                        kind="mark_unserved",
                        incident_id=incident.id,
                        category="medical",
                        unmet=remaining,
                        reason_codes=["no_feasible_medical_unit"],
                    )
                )
                break
            actions.append(chosen_action)
            remaining -= 1
    return actions

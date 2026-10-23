from app.algorithms.actions import ProposedAction
from app.algorithms.routing import shortest_route
from app.schemas.enums import RunStrategy
from app.schemas.scenario import Incident
from app.simulation.state import SimulationState


def propose_shelter(state: SimulationState, ordered: list[Incident]) -> list[ProposedAction]:
    actions: list[ProposedAction] = []
    remaining_capacity = {shelter.id: state.remaining_shelter(shelter.id) for shelter in state.shelters}
    incidents = ordered if state.strategy == RunStrategy.rescueswarm else list(state.incidents)
    for incident in incidents:
        demand = incident.shelter_demand - state.shelter_assigned_count(incident.id)
        if demand <= 0:
            continue
        leftover = demand
        while leftover > 0:
            best: tuple[float, str] | None = None
            best_action: ProposedAction | None = None
            shelters = (
                sorted(state.shelters, key=lambda item: item.id)
                if state.strategy == RunStrategy.baseline
                else list(state.shelters)
            )
            for shelter in shelters:
                if not shelter.enabled:
                    continue
                free = remaining_capacity[shelter.id]
                if free <= 0:
                    continue
                needed = leftover if state.allow_shelter_split else leftover
                if not state.allow_shelter_split and free < needed:
                    continue
                take = min(free, leftover)
                if take <= 0:
                    continue
                route = shortest_route(state.nodes, state.edges, incident.node_id, shelter.node_id)
                if not route.feasible:
                    continue
                action = ProposedAction(
                    kind="assign_shelter",
                    incident_id=incident.id,
                    shelter_id=shelter.id,
                    people=take,
                    route=route.path,
                    route_cost=route.cost,
                    reason_codes=["shelter_assigned"],
                )
                if state.strategy == RunStrategy.baseline:
                    best_action = action
                    break
                key = (route.cost, shelter.id)
                if best is None or key < best:
                    best = key
                    best_action = action
            if best_action is None:
                actions.append(
                    ProposedAction(
                        kind="mark_unserved",
                        incident_id=incident.id,
                        category="shelter",
                        unmet=leftover,
                        reason_codes=["insufficient_shelter_capacity_or_route"],
                    )
                )
                break
            assert best_action.shelter_id is not None
            assert best_action.people is not None
            remaining_capacity[best_action.shelter_id] -= best_action.people
            leftover -= best_action.people
            actions.append(best_action)
            if not state.allow_shelter_split:
                break
    return actions

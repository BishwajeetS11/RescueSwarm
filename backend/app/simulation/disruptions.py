from app.algorithms.routing import path_uses_edge
from app.api.errors import AppError
from app.schemas.enums import ResourceStatus
from app.schemas.run import DisruptionRequest
from app.simulation.state import SimulationState


def apply_disruption(state: SimulationState, request: DisruptionRequest) -> list[str]:
    affected: list[str] = []
    if request.type.value == "close_edge":
        edge = _require_edge(state, request.edge_id)
        edge.available = False
        affected.extend(_invalidate_routes_using(state, edge.id))
    elif request.type.value == "open_edge":
        edge = _require_edge(state, request.edge_id)
        edge.available = True
    elif request.type.value == "reduce_shelter_capacity":
        shelter = _require_shelter(state, request.shelter_id)
        if request.new_capacity is None:
            raise AppError(422, "VALIDATION_ERROR", "new_capacity is required.")
        if request.new_capacity < shelter.used_capacity:
            raise AppError(
                409,
                "CONFLICT",
                "New capacity is below used capacity; occupants are not silently evicted.",
            )
        if request.new_capacity < 0:
            raise AppError(422, "VALIDATION_ERROR", "Capacity cannot be negative.")
        shelter.capacity = request.new_capacity
    else:
        raise AppError(422, "VALIDATION_ERROR", "Unsupported disruption type.")
    state.active_disruptions.append(request.model_dump())
    state.replan_count += 1
    state.state_version += 1
    return affected


def _require_edge(state: SimulationState, edge_id: str | None):
    if not edge_id:
        raise AppError(422, "VALIDATION_ERROR", "edge_id is required.")
    edge = state.edge_map().get(edge_id)
    if edge is None:
        raise AppError(404, "NOT_FOUND", f"Edge '{edge_id}' was not found.")
    return edge


def _require_shelter(state: SimulationState, shelter_id: str | None):
    if not shelter_id:
        raise AppError(422, "VALIDATION_ERROR", "shelter_id is required.")
    shelter = state.shelter_map().get(shelter_id)
    if shelter is None:
        raise AppError(404, "NOT_FOUND", f"Shelter '{shelter_id}' was not found.")
    return shelter


def _invalidate_routes_using(state: SimulationState, edge_id: str) -> list[str]:
    affected: list[str] = []
    edge = state.edge_map()[edge_id]
    remaining_medical = []
    for assignment in state.medical_assignments:
        if path_uses_edge(assignment.route, edge):
            unit = state.unit_map()[assignment.unit_id]
            unit.status = ResourceStatus.available
            unit.assigned_incident_id = None
            state.unmet_medical.pop(assignment.incident_id, None)
            affected.append(assignment.incident_id)
            state.refresh_incident_status(assignment.incident_id)
        else:
            remaining_medical.append(assignment)
    state.medical_assignments = remaining_medical

    remaining_supply = []
    for assignment in state.supply_assignments:
        if path_uses_edge(assignment.route, edge):
            stock = state.stock_map()[assignment.stock_id]
            stock.kits_available += assignment.kits
            state.unmet_kits.pop(assignment.incident_id, None)
            affected.append(assignment.incident_id)
            state.refresh_incident_status(assignment.incident_id)
        else:
            remaining_supply.append(assignment)
    state.supply_assignments = remaining_supply
    return sorted(set(affected))

from app.algorithms.actions import ProposedAction
from app.algorithms.routing import path_uses_edge
from app.schemas.common import FieldIssue
from app.schemas.enums import ResourceStatus
from app.schemas.run import MedicalAssignment, ShelterAssignment, SupplyAssignment
from app.simulation.state import SimulationState


def validate_action(state: SimulationState, action: ProposedAction) -> list[FieldIssue]:
    errors: list[FieldIssue] = []
    incidents = state.incident_map()
    if action.incident_id not in incidents:
        errors.append(FieldIssue(field="incident_id", issue="unknown incident", code="UNKNOWN_ID"))
        return errors
    if action.kind == "assign_medical":
        errors.extend(_validate_medical(state, action))
    elif action.kind == "assign_shelter":
        errors.extend(_validate_shelter(state, action))
    elif action.kind == "assign_supply":
        errors.extend(_validate_supply(state, action))
    return errors


def _route_errors(state: SimulationState, route: list[str]) -> list[FieldIssue]:
    errors: list[FieldIssue] = []
    for source, target in zip(route, route[1:], strict=False):
        match = next(
            (edge for edge in state.edges if edge.source == source and edge.target == target),
            None,
        )
        if match is None:
            errors.append(FieldIssue(field="route", issue=f"no edge {source}->{target}", code="UNKNOWN_EDGE"))
        elif not match.available:
            errors.append(FieldIssue(field="route", issue=f"closed edge {match.id}", code="CLOSED_EDGE"))
    return errors


def _validate_medical(state: SimulationState, action: ProposedAction) -> list[FieldIssue]:
    errors: list[FieldIssue] = []
    if not action.unit_id:
        errors.append(FieldIssue(field="unit_id", issue="medical assignment requires a unit", code="MISSING"))
        return errors
    unit = state.unit_map().get(action.unit_id)
    if unit is None:
        errors.append(FieldIssue(field="unit_id", issue="unknown medical unit", code="UNKNOWN_ID"))
        return errors
    if unit.status != ResourceStatus.available:
        errors.append(FieldIssue(field="unit_id", issue="unit is not available", code="UNIT_BUSY"))
    if any(item.unit_id == action.unit_id for item in state.medical_assignments):
        errors.append(FieldIssue(field="unit_id", issue="unit already assigned", code="DOUBLE_BOOK"))
    errors.extend(_route_errors(state, action.route))
    return errors


def _validate_shelter(state: SimulationState, action: ProposedAction) -> list[FieldIssue]:
    errors: list[FieldIssue] = []
    if not action.shelter_id or action.people is None:
        errors.append(FieldIssue(field="shelter_id", issue="shelter assignment is incomplete", code="MISSING"))
        return errors
    if action.people <= 0:
        errors.append(FieldIssue(field="people", issue="assigned people must be positive", code="INVALID"))
    shelter = state.shelter_map().get(action.shelter_id)
    if shelter is None:
        errors.append(FieldIssue(field="shelter_id", issue="unknown shelter", code="UNKNOWN_ID"))
        return errors
    if not shelter.enabled:
        errors.append(FieldIssue(field="shelter_id", issue="shelter is disabled", code="DISABLED"))
    if shelter.used_capacity + action.people > shelter.capacity:
        errors.append(FieldIssue(field="people", issue="assignment exceeds remaining capacity", code="OVER_CAPACITY"))
    errors.extend(_route_errors(state, action.route))
    return errors


def _validate_supply(state: SimulationState, action: ProposedAction) -> list[FieldIssue]:
    errors: list[FieldIssue] = []
    if not action.stock_id or action.kits is None:
        errors.append(FieldIssue(field="stock_id", issue="supply assignment is incomplete", code="MISSING"))
        return errors
    if action.kits <= 0:
        errors.append(FieldIssue(field="kits", issue="assigned kits must be positive", code="INVALID"))
    stock = state.stock_map().get(action.stock_id)
    if stock is None:
        errors.append(FieldIssue(field="stock_id", issue="unknown stock", code="UNKNOWN_ID"))
        return errors
    if stock.kits_available - action.kits < 0:
        errors.append(FieldIssue(field="kits", issue="assignment exceeds inventory", code="NEGATIVE_INVENTORY"))
    errors.extend(_route_errors(state, action.route))
    return errors


def apply_action(state: SimulationState, action: ProposedAction) -> None:
    if action.kind == "assign_medical":
        assert action.unit_id is not None
        unit = state.unit_map()[action.unit_id]
        unit.status = ResourceStatus.assigned
        unit.assigned_incident_id = action.incident_id
        state.medical_assignments.append(
            MedicalAssignment(
                unit_id=action.unit_id,
                incident_id=action.incident_id,
                route=action.route,
                route_cost=action.route_cost,
            )
        )
    elif action.kind == "assign_shelter":
        assert action.shelter_id is not None
        assert action.people is not None
        shelter = state.shelter_map()[action.shelter_id]
        shelter.used_capacity += action.people
        state.shelter_assignments.append(
            ShelterAssignment(shelter_id=action.shelter_id, incident_id=action.incident_id, people=action.people)
        )
    elif action.kind == "assign_supply":
        assert action.stock_id is not None
        assert action.kits is not None
        stock = state.stock_map()[action.stock_id]
        stock.kits_available -= action.kits
        state.supply_assignments.append(
            SupplyAssignment(
                stock_id=action.stock_id,
                incident_id=action.incident_id,
                kits=action.kits,
                route=action.route,
                route_cost=action.route_cost,
            )
        )
    elif action.kind == "mark_unserved":
        if action.category == "medical":
            state.unmet_medical[action.incident_id] = state.unmet_medical.get(action.incident_id, 0) + (
                action.unmet or 0
            )
        elif action.category == "shelter":
            state.unmet_shelter[action.incident_id] = state.unmet_shelter.get(action.incident_id, 0) + (
                action.unmet or 0
            )
        elif action.category == "supply":
            state.unmet_kits[action.incident_id] = state.unmet_kits.get(action.incident_id, 0) + (action.unmet or 0)
    state.refresh_incident_status(action.incident_id)
    state.state_version += 1


def committed_invariants(state: SimulationState) -> list[FieldIssue]:
    errors: list[FieldIssue] = []
    seen_units: set[str] = set()
    for assignment in state.medical_assignments:
        if assignment.unit_id in seen_units:
            errors.append(FieldIssue(field="unit_id", issue=f"{assignment.unit_id} double-booked", code="DOUBLE_BOOK"))
        seen_units.add(assignment.unit_id)
        for edge in state.edges:
            if path_uses_edge(assignment.route, edge) and not edge.available:
                errors.append(
                    FieldIssue(field="route", issue=f"closed edge {edge.id} in assignment", code="CLOSED_EDGE")
                )
    for shelter in state.shelters:
        if shelter.used_capacity > shelter.capacity:
            errors.append(FieldIssue(field=shelter.id, issue="used capacity exceeds total", code="OVER_CAPACITY"))
        if shelter.used_capacity < 0:
            errors.append(FieldIssue(field=shelter.id, issue="negative used capacity", code="NEGATIVE_VALUE"))
    for stock in state.stocks:
        if stock.kits_available < 0:
            errors.append(FieldIssue(field=stock.id, issue="negative inventory", code="NEGATIVE_INVENTORY"))
    return errors

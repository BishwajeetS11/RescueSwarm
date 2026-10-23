from app.schemas.run import RunMetrics
from app.simulation.state import SimulationState


def _rate(numerator: int, denominator: int) -> float | None:
    if denominator == 0:
        return None
    return numerator / denominator


def compute_metrics(state: SimulationState) -> RunMetrics:
    incidents_total = len(state.incidents)
    with_assignment = sum(
        1
        for incident in state.incidents
        if state.medical_assigned_count(incident.id)
        or state.shelter_assigned_count(incident.id)
        or state.kits_assigned_count(incident.id)
    )
    medical_requested = sum(incident.medical_units_required for incident in state.incidents)
    medical_used = len(state.medical_assignments)
    shelter_demand = sum(incident.shelter_demand for incident in state.incidents)
    shelter_fulfilled = sum(item.people for item in state.shelter_assignments)
    total_capacity = sum(shelter.capacity for shelter in state.shelters)
    used_capacity = sum(shelter.used_capacity for shelter in state.shelters)
    kits_requested = sum(incident.kits_required for incident in state.incidents)
    kits_delivered = sum(item.kits for item in state.supply_assignments)
    route_costs = [item.route_cost for item in state.medical_assignments] + [
        item.route_cost for item in state.supply_assignments
    ]
    unmet_medical = sum(state.unmet_medical.values())
    unmet_shelter = sum(state.unmet_shelter.values())
    unmet_kits = sum(state.unmet_kits.values())
    return RunMetrics(
        incidents_total=incidents_total,
        incidents_with_any_assignment=with_assignment,
        incident_coverage_rate=_rate(with_assignment, incidents_total),
        medical_units_requested=medical_requested,
        medical_units_used=medical_used,
        medical_assignment_coverage=_rate(medical_used, medical_requested),
        shelter_demand_total=shelter_demand,
        shelter_demand_fulfilled=shelter_fulfilled,
        shelter_fulfillment_rate=_rate(shelter_fulfilled, shelter_demand),
        shelter_capacity_utilization=_rate(used_capacity, total_capacity),
        kits_requested=kits_requested,
        kits_delivered=kits_delivered,
        kit_fulfillment_rate=_rate(kits_delivered, kits_requested),
        mean_assigned_route_cost=(sum(route_costs) / len(route_costs)) if route_costs else None,
        total_route_cost=sum(route_costs),
        unmet_medical=unmet_medical,
        unmet_shelter=unmet_shelter,
        unmet_kits=unmet_kits,
        unmet_demand_total=unmet_medical + unmet_shelter + unmet_kits,
        constraint_violation_count=0,
        replan_count=state.replan_count,
        coordinator_steps=state.step,
        llm_calls=0,
    )

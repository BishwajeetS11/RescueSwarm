from enum import StrEnum


class NodeKind(StrEnum):
    incident_site = "incident_site"
    resource_base = "resource_base"
    shelter = "shelter"
    junction = "junction"
    supply_depot = "supply_depot"
    mixed = "mixed"


class IncidentCategory(StrEnum):
    flood = "flood"
    fire = "fire"
    earthquake = "earthquake"
    storm = "storm"
    infrastructure = "infrastructure"
    other = "other"


class IncidentStatus(StrEnum):
    pending = "pending"
    partially_assigned = "partially_assigned"
    assigned = "assigned"
    unserved = "unserved"


class ResourceStatus(StrEnum):
    available = "available"
    assigned = "assigned"
    unavailable = "unavailable"


class RunStatus(StrEnum):
    created = "created"
    running = "running"
    completed = "completed"
    infeasible = "infeasible"
    failed = "failed"
    cancelled = "cancelled"


class RunStrategy(StrEnum):
    rescueswarm = "rescueswarm"
    baseline = "baseline"


class LLMMode(StrEnum):
    mock = "mock"
    provider = "provider"


class EventStatus(StrEnum):
    success = "success"
    warning = "warning"
    rejected = "rejected"
    failed = "failed"
    info = "info"


class EventType(StrEnum):
    run_started = "run_started"
    priority_computed = "priority_computed"
    route_proposed = "route_proposed"
    allocation_committed = "allocation_committed"
    proposal_rejected = "proposal_rejected"
    incident_unserved = "incident_unserved"
    disruption_applied = "disruption_applied"
    replan_started = "replan_started"
    replan_completed = "replan_completed"
    run_completed = "run_completed"
    no_progress = "no_progress"
    max_steps_reached = "max_steps_reached"


class Actor(StrEnum):
    coordinator = "coordinator"
    prioritizer = "prioritizer"
    route_planner = "route_planner"
    medical_dispatch = "medical_dispatch"
    shelter_allocator = "shelter_allocator"
    supply_allocator = "supply_allocator"
    constraint_validator = "constraint_validator"
    explanation = "explanation"
    user = "user"
    interpreter = "interpreter"


class DisruptionType(StrEnum):
    close_edge = "close_edge"
    open_edge = "open_edge"
    reduce_shelter_capacity = "reduce_shelter_capacity"


class AgentResultStatus(StrEnum):
    success = "success"
    no_action = "no_action"
    infeasible = "infeasible"
    error = "error"

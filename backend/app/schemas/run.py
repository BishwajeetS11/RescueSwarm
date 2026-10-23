from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from app.core.constants import DISCLAIMER
from app.schemas.common import APIModel
from app.schemas.enums import (
    Actor,
    DisruptionType,
    EventStatus,
    EventType,
    LLMMode,
    RunStatus,
    RunStrategy,
)
from app.schemas.scenario import Scenario


class RunMetrics(APIModel):
    incidents_total: int = 0
    incidents_with_any_assignment: int = 0
    incident_coverage_rate: float | None = None
    medical_units_requested: int = 0
    medical_units_used: int = 0
    medical_assignment_coverage: float | None = None
    shelter_demand_total: int = 0
    shelter_demand_fulfilled: int = 0
    shelter_fulfillment_rate: float | None = None
    shelter_capacity_utilization: float | None = None
    kits_requested: int = 0
    kits_delivered: int = 0
    kit_fulfillment_rate: float | None = None
    mean_assigned_route_cost: float | None = None
    total_route_cost: float = 0.0
    unmet_medical: int = 0
    unmet_shelter: int = 0
    unmet_kits: int = 0
    unmet_demand_total: int = 0
    constraint_violation_count: int = 0
    replan_count: int = 0
    coordinator_steps: int = 0
    llm_calls: int = 0


class MedicalAssignment(APIModel):
    unit_id: str
    incident_id: str
    route: list[str]
    route_cost: float


class ShelterAssignment(APIModel):
    shelter_id: str
    incident_id: str
    people: int


class SupplyAssignment(APIModel):
    stock_id: str
    incident_id: str
    kits: int
    route: list[str]
    route_cost: float


class SimulationSnapshot(APIModel):
    scenario_id: str
    run_id: str
    seed: int
    algorithm_version: str
    status: RunStatus
    step: int
    state_version: int
    replan_count: int = 0
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    incidents: list[dict[str, Any]]
    medical_units: list[dict[str, Any]]
    shelters: list[dict[str, Any]]
    supply_stocks: list[dict[str, Any]]
    medical_assignments: list[MedicalAssignment]
    shelter_assignments: list[ShelterAssignment]
    supply_assignments: list[SupplyAssignment]
    unmet_medical: dict[str, int] = Field(default_factory=dict)
    unmet_shelter: dict[str, int] = Field(default_factory=dict)
    unmet_kits: dict[str, int] = Field(default_factory=dict)
    active_disruptions: list[dict[str, Any]] = Field(default_factory=list)


class RunEvent(APIModel):
    event_id: str
    run_id: str
    sequence: int
    timestamp: datetime
    actor: Actor
    event_type: EventType
    status: EventStatus
    reason_codes: list[str] = Field(default_factory=list)
    payload: dict[str, Any] = Field(default_factory=dict)
    state_version_before: int | None = None
    state_version_after: int | None = None
    explanation: str | None = None


class RunCreateRequest(APIModel):
    scenario_id: str
    strategy: RunStrategy = RunStrategy.rescueswarm
    seed: int = 42
    llm_mode: LLMMode = LLMMode.mock


class RunSummary(APIModel):
    run_id: str
    status: RunStatus
    scenario_id: str
    strategy: RunStrategy
    seed: int
    metrics: RunMetrics
    event_count: int
    llm_mode: LLMMode
    disclaimer: str = DISCLAIMER
    created_at: datetime
    completed_at: datetime | None = None
    algorithm_version: str
    metric_schema_version: str


class RunDetail(RunSummary):
    scenario_snapshot_hash: str
    scenario: Scenario
    state: SimulationSnapshot
    explanation: str | None = None
    explanation_source: Literal["template", "llm", "none"] = "none"


class RunListResponse(APIModel):
    items: list[RunSummary]
    total: int


class EventListResponse(APIModel):
    items: list[RunEvent]


class DisruptionRequest(APIModel):
    type: DisruptionType
    edge_id: str | None = None
    shelter_id: str | None = None
    new_capacity: int | None = None
    reason: str = Field(default="simulated disruption", max_length=200)


class DisruptionResponse(APIModel):
    run: RunDetail
    replan_status: RunStatus
    new_event_count: int


class ParseTextRequest(APIModel):
    text: str
    llm_mode: LLMMode = LLMMode.mock


class ParseTextResponse(APIModel):
    draft: dict[str, Any]
    needs_review: bool = True
    warnings: list[str]
    parser_mode: LLMMode
    missing_fields: list[str] = Field(default_factory=list)
    fallback_used: bool = False


class Comparability(APIModel):
    comparable: bool
    differences: list[str] = Field(default_factory=list)


class RunCompareResponse(APIModel):
    items: list[RunDetail]
    comparability: Comparability
    disclaimer: str = DISCLAIMER

from pydantic import Field, field_validator

from app.core.constants import SCENARIO_SCHEMA_VERSION
from app.schemas.common import APIModel, FieldIssue
from app.schemas.enums import IncidentCategory, IncidentStatus, NodeKind


class Node(APIModel):
    id: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=80)
    kind: NodeKind


class Edge(APIModel):
    id: str = Field(min_length=1, max_length=64)
    source: str = Field(min_length=1, max_length=64)
    target: str = Field(min_length=1, max_length=64)
    cost: float
    available: bool = True

    @field_validator("cost")
    @classmethod
    def cost_must_be_numeric(cls, value: float) -> float:
        if value != value or value in (float("inf"), float("-inf")):
            raise ValueError("cost must be a finite number")
        return value


class Incident(APIModel):
    id: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=80)
    node_id: str = Field(min_length=1, max_length=64)
    category: IncidentCategory
    urgency: int
    people_affected: int
    time_sensitivity: float
    access_risk: float
    medical_units_required: int
    kits_required: int
    shelter_demand: int
    status: IncidentStatus = IncidentStatus.pending


class MedicalUnit(APIModel):
    id: str = Field(min_length=1, max_length=64)
    node_id: str = Field(min_length=1, max_length=64)
    available: bool = True


class Shelter(APIModel):
    id: str = Field(min_length=1, max_length=64)
    node_id: str = Field(min_length=1, max_length=64)
    capacity: int
    used_capacity: int = 0
    enabled: bool = True


class SupplyStock(APIModel):
    id: str = Field(min_length=1, max_length=64)
    node_id: str = Field(min_length=1, max_length=64)
    kits_available: int


class ScenarioBase(APIModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=2000)
    schema_version: int = SCENARIO_SCHEMA_VERSION
    graph_directed: bool = True
    allow_shelter_split: bool = False
    nodes: list[Node]
    edges: list[Edge]
    incidents: list[Incident]
    medical_units: list[MedicalUnit]
    shelters: list[Shelter]
    supply_stocks: list[SupplyStock]


class Scenario(ScenarioBase):
    id: str = Field(min_length=1, max_length=64)


class ScenarioDraft(ScenarioBase):
    """Untrusted structured draft. Domain rules are applied by the validator, not as HTTP 422."""

    id: str | None = Field(default=None, min_length=1, max_length=64)


class ScenarioSummary(APIModel):
    id: str
    name: str
    description: str
    incident_count: int
    node_count: int
    medical_unit_count: int
    bundled: bool


class ScenarioListResponse(APIModel):
    items: list[ScenarioSummary]


class ScenarioValidateResponse(APIModel):
    valid: bool
    errors: list[FieldIssue] = Field(default_factory=list)
    warnings: list[FieldIssue] = Field(default_factory=list)
    normalized_scenario: Scenario | None = None

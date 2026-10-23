from typing import Literal

from pydantic import Field

from app.schemas.common import APIModel


class ProposedAction(APIModel):
    kind: Literal["assign_medical", "assign_shelter", "assign_supply", "mark_unserved"]
    incident_id: str
    unit_id: str | None = None
    shelter_id: str | None = None
    stock_id: str | None = None
    people: int | None = None
    kits: int | None = None
    route: list[str] = Field(default_factory=list)
    route_cost: float = 0.0
    reason_codes: list[str] = Field(default_factory=list)
    category: Literal["medical", "shelter", "supply"] | None = None
    unmet: int | None = None

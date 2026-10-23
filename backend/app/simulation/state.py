from __future__ import annotations

import json
from copy import deepcopy
from typing import Any

from pydantic import Field

from app.core.constants import ALGORITHM_VERSION
from app.schemas.common import APIModel
from app.schemas.enums import IncidentStatus, ResourceStatus, RunStatus, RunStrategy
from app.schemas.run import MedicalAssignment, ShelterAssignment, SimulationSnapshot, SupplyAssignment
from app.schemas.scenario import Edge, Incident, MedicalUnit, Node, Scenario, Shelter, SupplyStock


class UnitState(APIModel):
    id: str
    node_id: str
    status: ResourceStatus = ResourceStatus.available
    assigned_incident_id: str | None = None


class SimulationState(APIModel):
    scenario_id: str
    run_id: str
    seed: int
    strategy: RunStrategy
    algorithm_version: str = ALGORITHM_VERSION
    status: RunStatus = RunStatus.created
    step: int = 0
    state_version: int = 0
    replan_count: int = 0
    allow_shelter_split: bool = False
    nodes: list[Node]
    edges: list[Edge]
    incidents: list[Incident]
    units: list[UnitState]
    shelters: list[Shelter]
    stocks: list[SupplyStock]
    medical_assignments: list[MedicalAssignment] = Field(default_factory=list)
    shelter_assignments: list[ShelterAssignment] = Field(default_factory=list)
    supply_assignments: list[SupplyAssignment] = Field(default_factory=list)
    unmet_medical: dict[str, int] = Field(default_factory=dict)
    unmet_shelter: dict[str, int] = Field(default_factory=dict)
    unmet_kits: dict[str, int] = Field(default_factory=dict)
    priorities: dict[str, float] = Field(default_factory=dict)
    active_disruptions: list[dict[str, Any]] = Field(default_factory=list)

    @classmethod
    def from_scenario(
        cls,
        scenario: Scenario,
        run_id: str,
        seed: int,
        strategy: RunStrategy,
    ) -> SimulationState:
        incidents = [incident.model_copy(deep=True) for incident in scenario.incidents]
        for incident in incidents:
            incident.status = IncidentStatus.pending
        return cls(
            scenario_id=scenario.id,
            run_id=run_id,
            seed=seed,
            strategy=strategy,
            allow_shelter_split=scenario.allow_shelter_split,
            nodes=[node.model_copy(deep=True) for node in scenario.nodes],
            edges=[edge.model_copy(deep=True) for edge in scenario.edges],
            incidents=incidents,
            units=[
                UnitState(
                    id=unit.id,
                    node_id=unit.node_id,
                    status=ResourceStatus.available if unit.available else ResourceStatus.unavailable,
                )
                for unit in scenario.medical_units
            ],
            shelters=[shelter.model_copy(deep=True) for shelter in scenario.shelters],
            stocks=[stock.model_copy(deep=True) for stock in scenario.supply_stocks],
        )

    @classmethod
    def from_snapshot(
        cls,
        snapshot: SimulationSnapshot,
        strategy: RunStrategy,
        allow_shelter_split: bool,
        priorities: dict[str, float] | None = None,
    ) -> SimulationState:
        return cls(
            scenario_id=snapshot.scenario_id,
            run_id=snapshot.run_id,
            seed=snapshot.seed,
            strategy=strategy,
            algorithm_version=snapshot.algorithm_version,
            status=snapshot.status,
            step=snapshot.step,
            state_version=snapshot.state_version,
            allow_shelter_split=allow_shelter_split,
            nodes=[Node.model_validate(item) for item in snapshot.nodes],
            edges=[Edge.model_validate(item) for item in snapshot.edges],
            incidents=[Incident.model_validate(item) for item in snapshot.incidents],
            units=[
                UnitState(
                    id=str(item["id"]),
                    node_id=str(item["node_id"]),
                    status=ResourceStatus(str(item.get("status", "available"))),
                    assigned_incident_id=item.get("assigned_incident_id"),  # type: ignore[arg-type]
                )
                for item in snapshot.medical_units
            ],
            shelters=[Shelter.model_validate(item) for item in snapshot.shelters],
            stocks=[SupplyStock.model_validate(item) for item in snapshot.supply_stocks],
            medical_assignments=list(snapshot.medical_assignments),
            shelter_assignments=list(snapshot.shelter_assignments),
            supply_assignments=list(snapshot.supply_assignments),
            unmet_medical=dict(snapshot.unmet_medical),
            unmet_shelter=dict(snapshot.unmet_shelter),
            unmet_kits=dict(snapshot.unmet_kits),
            priorities=priorities or {},
            active_disruptions=list(snapshot.active_disruptions),
            replan_count=snapshot.replan_count,
        )

    def clone(self) -> SimulationState:
        return SimulationState.model_validate(deepcopy(self.model_dump()))

    def node_map(self) -> dict[str, Node]:
        return {node.id: node for node in self.nodes}

    def edge_map(self) -> dict[str, Edge]:
        return {edge.id: edge for edge in self.edges}

    def incident_map(self) -> dict[str, Incident]:
        return {incident.id: incident for incident in self.incidents}

    def unit_map(self) -> dict[str, UnitState]:
        return {unit.id: unit for unit in self.units}

    def shelter_map(self) -> dict[str, Shelter]:
        return {shelter.id: shelter for shelter in self.shelters}

    def stock_map(self) -> dict[str, SupplyStock]:
        return {stock.id: stock for stock in self.stocks}

    def remaining_shelter(self, shelter_id: str) -> int:
        shelter = self.shelter_map()[shelter_id]
        return shelter.capacity - shelter.used_capacity

    def medical_assigned_count(self, incident_id: str) -> int:
        return sum(1 for item in self.medical_assignments if item.incident_id == incident_id)

    def shelter_assigned_count(self, incident_id: str) -> int:
        return sum(item.people for item in self.shelter_assignments if item.incident_id == incident_id)

    def kits_assigned_count(self, incident_id: str) -> int:
        return sum(item.kits for item in self.supply_assignments if item.incident_id == incident_id)

    def refresh_incident_status(self, incident_id: str) -> None:
        incident = self.incident_map()[incident_id]
        medical_done = self.medical_assigned_count(incident_id) >= incident.medical_units_required
        shelter_done = self.shelter_assigned_count(incident_id) >= incident.shelter_demand
        kits_done = self.kits_assigned_count(incident_id) >= incident.kits_required
        any_assigned = (
            self.medical_assigned_count(incident_id) > 0
            or self.shelter_assigned_count(incident_id) > 0
            or self.kits_assigned_count(incident_id) > 0
        )
        if medical_done and shelter_done and kits_done:
            incident.status = IncidentStatus.assigned
        elif any_assigned:
            incident.status = IncidentStatus.partially_assigned
        elif (
            self.unmet_medical.get(incident_id, 0)
            or self.unmet_shelter.get(incident_id, 0)
            or self.unmet_kits.get(incident_id, 0)
        ):
            incident.status = IncidentStatus.unserved
        else:
            incident.status = IncidentStatus.pending

    def signature(self) -> str:
        payload = {
            "edges": [(edge.id, edge.available) for edge in sorted(self.edges, key=lambda item: item.id)],
            "units": [
                (unit.id, unit.status.value, unit.assigned_incident_id)
                for unit in sorted(self.units, key=lambda item: item.id)
            ],
            "shelters": [
                (shelter.id, shelter.capacity, shelter.used_capacity, shelter.enabled)
                for shelter in sorted(self.shelters, key=lambda item: item.id)
            ],
            "stocks": [
                (stock.id, stock.kits_available) for stock in sorted(self.stocks, key=lambda item: item.id)
            ],
            "medical": [item.model_dump() for item in self.medical_assignments],
            "shelter": [item.model_dump() for item in self.shelter_assignments],
            "supply": [item.model_dump() for item in self.supply_assignments],
            "unmet": {
                "medical": dict(sorted(self.unmet_medical.items())),
                "shelter": dict(sorted(self.unmet_shelter.items())),
                "kits": dict(sorted(self.unmet_kits.items())),
            },
        }
        return json.dumps(payload, sort_keys=True, default=str)

    def snapshot_payload(self) -> dict[str, Any]:
        return {
            "scenario_id": self.scenario_id,
            "run_id": self.run_id,
            "seed": self.seed,
            "algorithm_version": self.algorithm_version,
            "status": self.status.value,
            "step": self.step,
            "state_version": self.state_version,
            "replan_count": self.replan_count,
            "nodes": [item.model_dump() for item in self.nodes],
            "edges": [item.model_dump() for item in self.edges],
            "incidents": [item.model_dump() for item in self.incidents],
            "medical_units": [
                MedicalUnit(
                    id=unit.id,
                    node_id=unit.node_id,
                    available=unit.status == ResourceStatus.available,
                ).model_dump()
                | {"status": unit.status.value, "assigned_incident_id": unit.assigned_incident_id}
                for unit in self.units
            ],
            "shelters": [item.model_dump() for item in self.shelters],
            "supply_stocks": [item.model_dump() for item in self.stocks],
            "medical_assignments": [item.model_dump() for item in self.medical_assignments],
            "shelter_assignments": [item.model_dump() for item in self.shelter_assignments],
            "supply_assignments": [item.model_dump() for item in self.supply_assignments],
            "unmet_medical": self.unmet_medical,
            "unmet_shelter": self.unmet_shelter,
            "unmet_kits": self.unmet_kits,
            "active_disruptions": self.active_disruptions,
        }

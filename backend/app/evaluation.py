"""Experiment helpers used by the batch script and evaluation tests."""

from __future__ import annotations

from app.schemas.enums import NodeKind
from app.schemas.scenario import Edge, Incident, MedicalUnit, Node, Scenario, Shelter, SupplyStock

FAMILY = {
    "scenario-balanced-1": "E1 Balanced resources",
    "scenario-shortage-1": "E2 Resource shortage",
    "scenario-routes-1": "E3 Route disruption",
    "scenario-shelter-1": "E4 Shelter shortage",
    "scenario-supply-1": "E5 Supply shortage",
    "scenario-disconnected-1": "E6 Disconnected graph",
    "scenario-scale-1": "E7 Scale variation",
}


def build_scale_scenario() -> Scenario:
    """Connected synthetic graph near MVP caps: 15 nodes, 8 incidents, 3 medical units."""
    nodes = [
        Node(id="n-base", label="Scale base", kind=NodeKind.resource_base),
        Node(id="n-depot", label="Scale depot", kind=NodeKind.supply_depot),
        Node(id="n-shelter", label="Scale shelter", kind=NodeKind.shelter),
    ]
    nodes.extend(
        Node(id=f"n-inc-{index:02d}", label=f"Scale site {index}", kind=NodeKind.incident_site) for index in range(8)
    )
    nodes.extend(Node(id=f"n-j-{index:02d}", label=f"Junction {index}", kind=NodeKind.junction) for index in range(4))

    def bidir(name: str, source: str, target: str, cost: float) -> list[Edge]:
        return [
            Edge(id=f"{name}-fwd", source=source, target=target, cost=cost, available=True),
            Edge(id=f"{name}-rev", source=target, target=source, cost=cost, available=True),
        ]

    edges: list[Edge] = []
    edges.extend(bidir("e-base-depot", "n-base", "n-depot", 1))
    edges.extend(bidir("e-base-shelter", "n-base", "n-shelter", 2))
    edges.extend(bidir("e-base-j0", "n-base", "n-j-00", 2))
    edges.extend(bidir("e-j0-j1", "n-j-00", "n-j-01", 2))
    edges.extend(bidir("e-j1-j2", "n-j-01", "n-j-02", 2))
    edges.extend(bidir("e-j2-j3", "n-j-02", "n-j-03", 2))
    for index in range(8):
        incident_node = f"n-inc-{index:02d}"
        cost = float(index + 1)
        edges.extend(bidir(f"e-base-{index:02d}", "n-base", incident_node, cost))
        edges.extend(bidir(f"e-dep-{index:02d}", "n-depot", incident_node, cost + 1))
        edges.extend(bidir(f"e-sh-{index:02d}", incident_node, "n-shelter", 2))

    incidents = []
    for index in range(8):
        high = index >= 3
        incidents.append(
            Incident(
                id=f"inc-{index:02d}",
                label=f"{'High' if high else 'Low'}-urgency scale incident {index}",
                node_id=f"n-inc-{index:02d}",
                category="flood" if high else "infrastructure",
                urgency=5 if high else 2,
                people_affected=20 if high else 4,
                time_sensitivity=0.9 if high else 0.2,
                access_risk=0.5 if high else 0.1,
                medical_units_required=1,
                kits_required=3,
                shelter_demand=8,
            )
        )
    return Scenario(
        id="scenario-scale-1",
        name="Scale variation within MVP caps",
        description=(
            "Eight incidents and three medical units on a 15-node synthetic graph. "
            "Input order prefers low-urgency sites; RescueSwarm ranking prefers high-urgency sites."
        ),
        nodes=nodes,
        edges=edges,
        incidents=incidents,
        medical_units=[MedicalUnit(id=f"med-{index}", node_id="n-base", available=True) for index in range(3)],
        shelters=[Shelter(id="shelter-1", node_id="n-shelter", capacity=40, used_capacity=0, enabled=True)],
        supply_stocks=[SupplyStock(id="stock-1", node_id="n-depot", kits_available=24)],
    )

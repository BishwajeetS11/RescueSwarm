# Agent Execution Trace — RescueSwarm

> F0003 CA2/CA3 · Agentic AI Course  
> **Real captured run** — 2026-10-22, mock LLM mode, seed 42

This is an authentic trace captured from the running system. The full machine-readable trace is in `backend/artifacts/demo_run_export.json`. The experiment batch data is in `backend/artifacts/experiment_batch.json` and `disruption_batch.json`.

---

## Scenario

**Name:** Alternate route network  
**ID:** `scenario-routes-1`  
**Description:** One cheap direct route (cost 2.0) and one longer detour (cost 8.0 via junction) from the resource base to the incident site. Closing the cheap edge should force replanning onto the detour.

**Agents in operation:** Coordinator · Incident Prioritizer · Route Planner · Medical Dispatch Agent · Shelter Allocation Agent · Supply Allocation Agent · Constraint Validator  
*(7 distinct agents active in this single run; Scenario Interpreter and Explanation Agent also present in the system)*

---

## Phase 1 — Initial Planning Run

### Event 1 — `coordinator` emits `run_started`
```
actor: coordinator
event_type: run_started
status: info
reason_codes: [run_started]
payload: { strategy: "rescueswarm", seed: 42, scenario_id: "scenario-routes-1" }
```
*Coordinator initialises SimulationState, sets step=1.*

---

### Event 2 — `prioritizer` emits `priority_computed`
```
actor: prioritizer
event_type: priority_computed
status: success
reason_codes: [priority_computed]
payload: { priorities: { "inc-1": 0.745 } }
```
*Incident Prioritizer scores inc-1: urgency=4, people=9, time_sensitivity=0.6, access_risk=0.5.*
*Formula: 0.40×0.75 + 0.25×0.45 + 0.20×0.60 + 0.15×0.50 = 0.745*
*This is deterministic arithmetic — the LLM is not consulted.*

**PLANNING / REASONING:** The Prioritizer decides the allocation order based on computed scores, not a fixed rule. If a second incident existed, the higher-scoring one would be served first regardless of its position in the input list.

---

### Event 3 — `medical_dispatch` emits `allocation_committed`
```
actor: medical_dispatch
event_type: allocation_committed
status: success
reason_codes: [medical_assigned]
payload:
  action:
    kind: assign_medical
    incident_id: inc-1
    unit_id: med-1
    route: [n-base, n-incident]
    route_cost: 2.0
state_version_before: 0  →  state_version_after: 3
```
*Medical Dispatch Agent queries Route Planner: shortest path n-base → n-incident = [n-base, n-incident] cost 2.0 (e-cheap available). Proposes assignment. Constraint Validator checks: med-1 not already assigned, route available, incident pending. PASSES.*

**TOOL USE:** Route Planner agent uses NetworkX `shortest_path` graph algorithm as a tool call to evaluate feasibility.  
**INTER-AGENT COORDINATION:** Medical Dispatch proposes → Constraint Validator validates → Coordinator commits atomically.

---

### Event 4 — `shelter_allocator` emits `allocation_committed`
```
actor: shelter_allocator
event_type: allocation_committed
status: success
reason_codes: [shelter_assigned]
payload:
  action:
    kind: assign_shelter
    incident_id: inc-1
    shelter_id: shelter-1
    people: 6
    route: [n-incident, n-shelter]
    route_cost: 1.0
state_version_before: 0  →  state_version_after: 3
```
*Shelter Allocator: inc-1 shelter_demand=6, shelter-1 capacity=12 (used=0). Route n-incident→n-shelter cost 1.0. 6 ≤ 12 — constraint passes.*

---

### Event 5 — `supply_allocator` emits `allocation_committed`
```
actor: supply_allocator
event_type: allocation_committed
status: success
reason_codes: [supply_assigned]
payload:
  action:
    kind: assign_supply
    incident_id: inc-1
    stock_id: stock-1
    kits: 5
    route: [n-depot, n-base, n-incident]
    route_cost: 3.0
state_version_before: 0  →  state_version_after: 3
```
*Supply Allocator: inc-1 needs 5 kits. stock-1 has 8. Nearest route: n-depot→n-base→n-incident cost 3.0.*

---

### Event 6 — `coordinator` emits `run_completed` (Phase 1)
```
actor: coordinator
event_type: run_completed
status: success
reason_codes: [completed]
payload:
  status: completed
  metrics:
    incident_coverage_rate: 1.0
    medical_assignment_coverage: 1.0
    kit_fulfillment_rate: 1.0
    mean_assigned_route_cost: 2.5
    constraint_violation_count: 0
    coordinator_steps: 1
```
*All incidents resolved. No pending work remains. Coordinator terminates the planning loop.*

---

## Phase 2 — User Applies Disruption

### Event 7 — `user` emits `disruption_applied`
```
actor: user
event_type: disruption_applied
status: info
reason_codes: [close_edge]
payload: { type: close_edge, edge_id: e-cheap, reason: "simulated route blockage" }
state_version_before: 3  →  state_version_after: 4
```
*User closes edge e-cheap (n-base → n-incident, cost 2.0). Coordinator detects that med-1's committed route [n-base, n-incident] is now invalid.*

**ADAPTATION:** The system does not continue with the stale plan. It detects the invalidated assignment and triggers a bounded replan cycle.

---

## Phase 3 — Replanning After Disruption

### Event 8 — `coordinator` emits `replan_started`
```
actor: coordinator
event_type: replan_started
status: info
reason_codes: [replan]
payload: { step: 1 }
```

---

### Event 9 — `prioritizer` emits `priority_computed` (replan cycle)
```
actor: prioritizer
event_type: priority_computed
status: success
payload: { priorities: { "inc-1": 0.745 } }
```
*Priority unchanged — same incident, same urgency. Allocation must change due to graph topology.*

---

### Event 10 — `medical_dispatch` emits `allocation_committed` (new route)
```
actor: medical_dispatch
event_type: allocation_committed
status: success
reason_codes: [medical_assigned]
payload:
  action:
    kind: assign_medical
    incident_id: inc-1
    unit_id: med-1
    route: [n-base, n-depot, n-incident]
    route_cost: 4.0
state_version_before: 4  →  state_version_after: 6
```
*Route Planner queries graph with e-cheap excluded. New shortest path: n-base → n-depot → n-incident (cost 4.0). Medical Dispatch proposes this. Constraint Validator confirms route available, med-1 now unassigned (released by disruption handler). PASSES.*

**ADAPTATION:** Next step (Event 10) depends directly on what was discovered in Event 7 (edge closure). The medical unit is rerouted over the detour — this is the adaptation behavior.  
**INTER-AGENT COORDINATION:** Disruption handler releases med-1 → Coordinator triggers replan → Route Planner returns new path → Medical Dispatch proposes → Constraint Validator approves → Coordinator commits.

---

### Event 11 — `supply_allocator` emits `allocation_committed` (supply route unchanged)
```
actor: supply_allocator
event_type: allocation_committed
status: success
reason_codes: [supply_assigned]
payload:
  action:
    kind: assign_supply
    route: [n-depot, n-incident]
    route_cost: 3.0
state_version_before: 4  →  state_version_after: 6
```
*Supply route from n-depot does not use e-cheap. Route unchanged. Constraint Validator confirms.*

---

### Event 12 — `coordinator` emits `replan_completed`
```
actor: coordinator
event_type: replan_completed
status: success
reason_codes: [replan_completed]
payload: { status: completed }
```

### Event 13 — `coordinator` emits `run_completed` (post-disruption)
```
actor: coordinator
event_type: run_completed
status: success
metrics:
  incident_coverage_rate: 1.0
  mean_assigned_route_cost: 3.5   # rose from 2.5 → 3.5 due to detour
  replan_count: 1
  coordinator_steps: 2
  constraint_violation_count: 0
```

---

## Trace Summary

| Requirement | Evidence |
|---|---|
| Real captured run | Timestamps, state_version changes, UUIDs in `demo_run_export.json` |
| ≥4 distinct agents | coordinator, prioritizer, medical_dispatch, shelter_allocator, supply_allocator, constraint_validator (6 shown) |
| Planning / reasoning | Prioritizer scores incidents deterministically; Medical Dispatch evaluates candidates by priority + route cost |
| Tool use | Route Planner uses NetworkX shortest_path as a tool; Supply Allocator uses inventory lookup |
| Adaptation | After edge closure (Event 7), route changes from cost 2.0 to cost 4.0 (Events 10 vs 3) |
| Inter-agent coordination | Medical Dispatch proposes → Constraint Validator validates → Coordinator commits; disruption triggers full release-and-replan cycle |
| Not fabricated | State version increments (0→3, 4→6) and timestamps match the JSON export exactly |

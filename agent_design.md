# Agent Design Specification

## 1. Design goals

Agents are independent software components with clear responsibilities, typed inputs/outputs, and bounded actions. A component is an “agent” only when it has a defined goal, observes state, makes a decision within an action space, and returns an action or recommendation. Avoid artificial agent multiplication: deterministic specialist agents are acceptable and help make the system reliable.

## 2. Agent inventory

| Agent / component | Goal | Primary technique | May call LLM? |
|---|---|---|---|
| Scenario Interpreter | Convert user text into a proposed scenario schema | LLM structured extraction + validation; mock parser fallback | Yes, optional |
| Incident Prioritizer | Score and order incidents consistently | Deterministic weighted rule | No |
| Route Planner | Find feasible low-cost route | NetworkX shortest path with closed-edge exclusion | No |
| Medical Dispatch Agent | Assign available ambulances/medical units to incidents | Deterministic greedy allocation using priority and route cost | No |
| Shelter Allocation Agent | Assign synthetic displaced-person counts to shelter capacity | Deterministic constrained allocation | No |
| Supply Allocation Agent | Allocate finite aid kits to incidents/locations | Deterministic constrained allocation | No |
| Coordinator Agent | Sequence work, maintain state, resolve conflicts, trigger replanning | Bounded state machine | No direct LLM calls |
| Constraint Validator | Reject invalid proposed state transitions | Invariants and schema checks | No |
| Explanation Agent | Explain a committed result in plain language | Template or optional LLM summary of structured facts | Yes, optional |
| Simulation Environment | Maintain graph, incidents, resources, capacities, disruptions, clock/steps | Deterministic transition rules | No |

In a small implementation, the deterministic agent roles may share a base protocol and common utilities, but their goal, input, output, and tests must remain separate.

## 3. Common agent protocol

Each agent should support a consistent method conceptually equivalent to:

```python
class AgentResult(BaseModel):
    agent_name: str
    status: Literal["success", "no_action", "infeasible", "error"]
    actions: list[ProposedAction]
    reason_codes: list[str]
    evidence_refs: list[str]
    notes: str | None = None  # concise, non-sensitive operational summary
```

The exact class names may differ. Inputs should be immutable snapshots or typed context objects. Agents return **proposed actions**; the coordinator validates and commits actions. An agent must not mutate shared state directly.

## 4. Core state model

`SimulationState` contains:

- `scenario_id`, `run_id`, `seed`, `algorithm_version`.
- Graph nodes and edges; edge `available` flag and non-negative travel cost.
- Incidents with location node, category, synthetic demand, urgency attributes, status, and optional assigned resources.
- Resources with type, home/current node, availability, capacity, and current assignment.
- Shelters with location, total capacity, used capacity, and enabled status.
- Supply stock by location/type.
- Active disruptions and ordered event sequence.
- Step counter, terminal status, and current committed plan.

Every mutation passes through coordinator + constraint validation. Snapshots should be safe to serialize.

## 5. Priority scoring

Use a documented, configurable deterministic score, for example:

`priority = 0.40 * urgency + 0.25 * people_affected_norm + 0.20 * time_sensitivity + 0.15 * access_risk`

Inputs must be normalized to 0–1 and validated. The weights are initial design choices, not clinically or operationally authoritative. All bundled scenarios must document the input values and formula. A tie is broken deterministically by creation sequence, then incident ID. Do not call this real medical triage.

## 6. Route planning

- Graph edges carry a non-negative simulated cost, such as abstract travel-time units.
- Closed edges are excluded from route search.
- Use a shortest-path algorithm with deterministic tie-breaking where practical.
- Return path node IDs, total simulated cost, and any infeasibility reason.
- If no route exists, do not invent a route; return `infeasible` and allow coordination logic to consider alternatives or mark the incident unserved.

## 7. Resource allocation policies

### Medical Dispatch Agent

1. Receive prioritized unassigned incidents and available simulated medical units.
2. Evaluate route feasibility and estimated cost for eligible units.
3. Score candidate assignments by incident priority, then route cost, then stable resource ID.
4. Propose assignment without exceeding resource availability.
5. Return unserved incidents and reason codes when no feasible unit exists.

### Shelter Allocation Agent

1. Calculate each incident's synthetic shelter demand.
2. Sort demands deterministically by priority and ID.
3. Allocate to reachable enabled shelters with remaining capacity.
4. Split demand across shelters only if the scenario schema permits splitting; otherwise keep demand whole and mark unmatched demand.
5. Never assign more than remaining capacity.

### Supply Allocation Agent

1. Compute the requested supply quantity from the incident's synthetic demand.
2. Find reachable stock locations with remaining inventory.
3. Allocate using a documented deterministic policy such as nearest available stock first.
4. Do not create stock or silently treat partial fulfillment as full fulfillment.
5. Record unmet demand separately.

## 8. Coordinator loop

The coordinator owns all orchestration:

1. Validate initial scenario and construct simulation state.
2. Emit `run_started`.
3. Parse/normalize scenario if required; never use unreviewed free-text output as authoritative state.
4. Compute incident priorities.
5. Ask route/resource agents for proposals.
6. Validate proposals against graph availability, resource inventory, shelter capacity, and assignment invariants.
7. Commit valid proposals atomically and append events.
8. If a disruption is introduced, mark affected paths/assignments as stale and rerun only required planning stages (full replanning is acceptable in MVP).
9. Stop when all requested allocations are complete or explicitly unserved, no feasible action remains, state repeats without progress, or `MAX_COORDINATOR_STEPS` is reached.
10. Compute metrics from final structured state and persist immutable run record.
11. Generate optional explanation from committed summary only.

Max steps and call limits must be enforced in code. A repeated identical state signature should stop a no-progress loop.

## 9. Disruption types

MVP must include:

- `close_edge` / `open_edge` on an existing graph edge.
- `reduce_shelter_capacity` (not below used capacity unless the behavior is explicitly modelled as newly displaced occupants).

Optional stretch goal: `remove_resource` or `reduce_supply_stock`. Every disruption is a typed event. If a disruption invalidates current assignments, the coordinator must release/reassign resources without double-booking them.

## 10. Agent message/event envelope

Each message or event includes:

- `event_id`, `run_id`, `sequence`, `timestamp`.
- `actor`, `event_type`, `status`.
- `input_refs` / `evidence_refs` referencing structured objects.
- `action_summary`, `reason_codes`, `state_version_before`, `state_version_after`.
- Optional short, user-facing `explanation` separated from structured reasoning fields.

Do not persist private chain-of-thought. Store concise operational justifications, selected option, and relevant evidence instead.

## 11. Failure handling

- Invalid agent proposal → reject, record `proposal_rejected`, continue if safe.
- Route unavailable → return `infeasible`.
- Resource conflict → constraint validator rejects; coordinator tries the next deterministic candidate within bounded steps.
- LLM unavailable/invalid JSON → use mock/template fallback for explanation; for free-text parsing ask the user to edit a structured form or use the deterministic mock parser.
- Agent exception → catch at the coordinator boundary, emit structured failure, and stop or continue based on whether the affected action is necessary. Never silently ignore errors.

## 12. Agent tests

Every agent needs tests for normal output, empty input, invalid input, ties, capacity edge cases, and failures. Coordinator integration tests must verify event order, bounded termination, no duplicate assignment, and successful replanning after edge closure.

# Input / Output Definitions — RescueSwarm

> F0003 CA2/CA3 · Agentic AI Course

---

## 1. System Inputs

### 1.1 Scenario Object (primary input)

The system accepts a structured JSON scenario. This is the canonical input format validated by `ScenarioIn` in `backend/app/schemas/scenario.py`.

**Schema (key fields):**

```json
{
  "name": "string (1-120 chars)",
  "description": "string (optional)",
  "schema_version": 1,
  "graph_directed": true,
  "allow_shelter_split": false,
  "nodes": [
    { "id": "string", "label": "string", "kind": "resource_base|incident_site|junction|shelter|supply_depot" }
  ],
  "edges": [
    { "id": "string", "source": "node_id", "target": "node_id", "cost": "float >= 0", "available": true }
  ],
  "incidents": [
    {
      "id": "string", "label": "string", "node_id": "node_id",
      "category": "medical|infrastructure|fire|flood|other",
      "urgency": "int 1-5", "people_affected": "int >= 0",
      "time_sensitivity": "float 0.0-1.0", "access_risk": "float 0.0-1.0",
      "medical_units_required": "int >= 0",
      "kits_required": "int >= 0",
      "shelter_demand": "int >= 0",
      "status": "pending"
    }
  ],
  "medical_units": [ { "id": "string", "node_id": "node_id", "available": true } ],
  "shelters": [ { "id": "string", "node_id": "node_id", "capacity": "int > 0", "used_capacity": 0, "enabled": true } ],
  "supply_stocks": [ { "id": "string", "node_id": "node_id", "kits_available": "int >= 0" } ]
}
```

**Limits (enforced in `backend/app/core/limits.py`):**
- Nodes: 1–25; Edges: 1–60; Incidents: 1–20; Medical units: 1–20; Shelters: 0–20; Supply stocks: 0–20

### 1.2 Run Request

`POST /api/v1/runs` accepts:

```json
{
  "scenario_id": "string",
  "strategy": "rescueswarm | baseline",
  "seed": "integer (default 42)",
  "llm_mode": "mock | provider"
}
```

### 1.3 Disruption Request

`POST /api/v1/runs/{run_id}/disruptions` accepts:

```json
{
  "type": "close_edge | open_edge | reduce_shelter_capacity",
  "edge_id": "string (required for edge disruptions)",
  "shelter_id": "string (required for shelter disruptions)",
  "new_capacity": "integer >= used_capacity (for reduce_shelter_capacity)",
  "reason": "string (optional, user label)"
}
```

### 1.4 Natural-Language Scenario Text (optional LLM path)

`POST /api/v1/scenarios/parse-text` accepts:

```json
{ "text": "string (1-2000 chars)" }
```

---

## 2. Real Sample Input

**Bundled scenario: `backend/scenarios/alternate_routes.json`**

```json
{
  "name": "Alternate route network",
  "description": "One cheap direct route and one longer detour. Closing the cheap edge forces replanning.",
  "schema_version": 1, "graph_directed": true, "allow_shelter_split": false,
  "nodes": [
    {"id":"n-base","label":"Resource base","kind":"resource_base"},
    {"id":"n-incident","label":"Blocked-road incident","kind":"incident_site"},
    {"id":"n-detour","label":"Detour junction","kind":"junction"},
    {"id":"n-shelter","label":"Roadside shelter","kind":"shelter"},
    {"id":"n-depot","label":"Roadside depot","kind":"supply_depot"}
  ],
  "edges": [
    {"id":"e-cheap","source":"n-base","target":"n-incident","cost":2.0,"available":true},
    {"id":"e-detour-1","source":"n-base","target":"n-detour","cost":4.0,"available":true},
    {"id":"e-detour-2","source":"n-detour","target":"n-incident","cost":4.0,"available":true}
  ],
  "incidents": [
    {"id":"inc-1","label":"Simulated road blockage","node_id":"n-incident",
     "category":"infrastructure","urgency":4,"people_affected":9,
     "time_sensitivity":0.6,"access_risk":0.5,
     "medical_units_required":1,"kits_required":5,"shelter_demand":6,"status":"pending"}
  ],
  "medical_units": [{"id":"med-1","node_id":"n-base","available":true}],
  "shelters": [{"id":"shelter-1","node_id":"n-shelter","capacity":12,"used_capacity":0,"enabled":true}],
  "supply_stocks": [{"id":"stock-1","node_id":"n-depot","kits_available":8}]
}
```

---

## 3. System Outputs

### 3.1 Run Detail Response (`GET /api/v1/runs/{run_id}`)

```json
{
  "run_id": "string (UUID)",
  "status": "completed | infeasible | failed",
  "scenario_id": "string",
  "strategy": "rescueswarm | baseline",
  "seed": "integer",
  "metrics": {
    "incidents_total": "integer",
    "incidents_with_any_assignment": "integer",
    "incident_coverage_rate": "float 0.0-1.0",
    "medical_units_requested": "integer",
    "medical_units_used": "integer",
    "medical_assignment_coverage": "float",
    "shelter_demand_total": "integer",
    "shelter_demand_fulfilled": "integer",
    "shelter_fulfillment_rate": "float",
    "kits_requested": "integer",
    "kits_delivered": "integer",
    "kit_fulfillment_rate": "float",
    "mean_assigned_route_cost": "float",
    "unmet_demand_total": "integer",
    "constraint_violation_count": "integer",
    "replan_count": "integer",
    "coordinator_steps": "integer"
  },
  "events": [ "...see Section 3.2..." ],
  "state": { "...committed simulation state..." },
  "explanation": "string (plain-language summary)",
  "explanation_source": "template | provider",
  "algorithm_version": "alloc-v1",
  "disclaimer": "Educational simulation only; not for real emergency response."
}
```

### 3.2 Event Trace Entry

Each event in the `events` array:

```json
{
  "event_id": "string (UUID)",
  "run_id": "string",
  "sequence": "integer (1-based)",
  "timestamp": "ISO 8601 UTC",
  "actor": "coordinator|prioritizer|medical_dispatch|shelter_allocator|supply_allocator|constraint_validator|scenario_interpreter|explanation_agent|user",
  "event_type": "run_started|priority_computed|allocation_committed|proposal_rejected|incident_unserved|disruption_applied|replan_started|replan_completed|run_completed|no_progress|max_steps_reached",
  "status": "info|success|warning|rejected|failed",
  "reason_codes": ["array of string codes"],
  "payload": { "...event-specific structured data..." },
  "state_version_before": "integer or null",
  "state_version_after": "integer or null"
}
```

---

## 4. Real Sample Output

See `backend/artifacts/demo_run_export.json` for a complete, real captured run of the `alternate_routes` scenario (13 events, 1 disruption, 1 replan cycle):

- **Run ID:** `run-8ed1a0f3-f2a3-46c0-b362-a763685e177a`
- **Strategy:** `rescueswarm`, seed 42, mock LLM
- **Outcome:** coverage 1.00, 0 violations, 1 replan after `close_edge e-cheap`
- **Medical route change:** `n-base → n-incident` (cost 2.0) → `n-base → n-depot → n-incident` (cost 4.0)

# API Contracts

This is the initial REST contract. Implement schemas with Pydantic and keep the frontend client aligned. Any contract change must update this file and associated tests in the same change.

## Conventions

- Base path: `/api/v1`; `/health` is a liveness endpoint.
- JSON request/response unless an export endpoint specifies CSV.
- IDs are opaque strings; UUIDs are recommended.
- Timestamps use ISO 8601 UTC.
- All domain entities describe the synthetic simulation.
- Validate limits server-side.
- Never return stack traces, credentials, raw secret-bearing provider responses, or environment dumps.

Standard error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The scenario contains an invalid edge.",
    "details": [{"field": "edges[0].cost", "issue": "must be greater than zero"}],
    "request_id": "request-id"
  }
}
```

## Endpoints

### `GET /health`

Returns `200`: `{"status":"ok","service":"rescueswarm-api"}`. Do not include secrets or detailed infrastructure information.

### `GET /api/v1/scenarios`

Returns `200`: `{"items":[ScenarioSummary]}` for bundled and saved scenarios.

### `GET /api/v1/scenarios/{scenario_id}`

Returns a complete validated scenario or `404 NOT_FOUND`.

### `POST /api/v1/scenarios/validate`

Accepts a `ScenarioDraft`. Validates node/edge references, unique IDs, field ranges, resource counts, shelter capacity, and scenario size without saving. For a syntactically valid draft that fails domain validation, return `200` with `valid:false`, field-level `errors`, `warnings`, and optional `normalized_scenario`. For malformed HTTP payloads, return `422`. Keep this convention consistent.

### `POST /api/v1/scenarios/parse-text`

Request:

```json
{"text":"A simulated flood affects two areas; one route is closed.","llm_mode":"mock"}
```

Response:

```json
{"draft":{},"needs_review":true,"warnings":["Review proposed fields before use."],"parser_mode":"mock","missing_fields":[]}
```

The result is an untrusted draft, not a persisted scenario or a command. The frontend must let the user review/edit it. Only configured modes are accepted.

### `POST /api/v1/scenarios`

Persists a validated `ScenarioDraft`. Returns `201` with the stored `Scenario`.

### `POST /api/v1/runs`

Creates and executes a bounded run. MVP runs synchronously for the documented small scenario limits.

Request:

```json
{"scenario_id":"scenario-example-1","strategy":"rescueswarm","seed":42,"llm_mode":"mock"}
```

`strategy`: `rescueswarm` or `baseline`. `llm_mode` must be a configured mode.

Response `201`:

```json
{
  "run_id":"run-example-1",
  "status":"completed",
  "scenario_id":"scenario-example-1",
  "strategy":"rescueswarm",
  "seed":42,
  "metrics":{},
  "event_count":0,
  "llm_mode":"mock",
  "disclaimer":"Educational simulation only; not for real emergency response."
}
```

A valid run can finish with `infeasible` or partial allocation. That is a simulation outcome, not an HTTP server failure.

### `GET /api/v1/runs`

Supports `scenario_id`, `strategy`, `limit` (server-capped), and `offset` filters. Returns `{"items":[RunSummary],"total":0}`.

### `GET /api/v1/runs/{run_id}`

Returns run metadata, scenario snapshot/hash, final structured state, metrics, algorithm/metric versions, and LLM mode.

### `GET /api/v1/runs/{run_id}/events`

Returns ordered events. Optional filters: `after_sequence`, `actor`, `event_type`.

### `POST /api/v1/runs/{run_id}/disruptions`

Close/open edge example:

```json
{"type":"close_edge","edge_id":"edge-03","reason":"simulated route blockage"}
```

Shelter capacity example:

```json
{"type":"reduce_shelter_capacity","shelter_id":"shelter-02","new_capacity":20,"reason":"simulated capacity constraint"}
```

Reject unknown IDs and invalid capacity changes with a documented `422` or `409`. Return the updated state, replan status, metrics, and newly appended events. Do not silently evict existing occupants if capacity falls below used capacity.

### `GET /api/v1/runs/{run_id}/export.json`

Returns a self-contained result artifact with scenario snapshot, run configuration, metrics, events, algorithm/metric versions, seed, timestamps, LLM mode, and disclaimer.

### `GET /api/v1/runs/{run_id}/export.csv`

Returns a documented flattened event or assignment table with stable columns. If multiple views are offered, use an explicit validated `view` enum and document every header.

### `GET /api/v1/runs/compare?run_ids=...`

Compares selected runs. Response includes each run's metrics and a `comparability` section that identifies differences in scenario hash, seed, strategy, algorithm version, and metric version. Do not imply a controlled comparison when required fields differ.

## Core schemas

### Scenario

- `id`, `name`, `description`, `schema_version`.
- `nodes[]`: `id`, `label`, `kind`.
- `edges[]`: `id`, `source`, `target`, `cost`, `available`.
- `incidents[]`: `id`, `label`, `node_id`, `category`, `urgency`, `people_affected`, `time_sensitivity`, `access_risk`, `medical_units_required`, `kits_required`, `shelter_demand`, `status`.
- `medical_units[]`: `id`, `node_id`, `available`.
- `shelters[]`: `id`, `node_id`, `capacity`, `used_capacity`, `enabled`.
- `supply_stocks[]`: `id`, `node_id`, `kits_available`.

### Run

- `id`, `scenario_id`, `scenario_snapshot_hash`, `strategy`, `seed`, `algorithm_version`, `metric_schema_version`, `status`, `llm_mode`, `created_at`, `completed_at`, `metrics`.

### Event

- `event_id`, `run_id`, `sequence`, `timestamp`, `actor`, `event_type`, `status`, `reason_codes[]`, `payload`, `state_version_before`, `state_version_after`.

## Enums

Run status: `created`, `running`, `completed`, `infeasible`, `failed`, `cancelled`.  
Incident status: `pending`, `partially_assigned`, `assigned`, `unserved`.  
Resource status: `available`, `assigned`, `unavailable`.  
Event status: `success`, `warning`, `rejected`, `failed`, `info`.

Use backend enums and matching TypeScript unions. Reject unknown enum values.

## Consistency, persistence, and concurrency

- A committed resource cannot be double-booked within one run.
- Reapplying a disruption should not occur accidentally; request IDs/idempotency can be added if required by implementation.
- Each committed state change and its event should be persisted atomically where practical.
- A rerun creates a new immutable run record and must not overwrite prior experiments.
- MVP is local/single-user; do not claim concurrent multi-user safety unless implemented and tested.

## Contract tests

Test required fields, enum values, malformed requests, domain validation, unknown IDs, disruption capacity rules, sanitized failures, export schema, and frontend/backend type agreement.

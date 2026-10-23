# RescueSwarm

Educational web app that simulates disaster-response coordination with specialized software agents and optional Generative AI. It is a classroom simulation with synthetic data only. It does not contact emergency services and must not be used to make real emergency-response decisions.

The local MVP can load bundled synthetic scenarios, run RescueSwarm or baseline allocation, apply route/shelter disruptions, inspect events and metrics, export JSON/CSV, and parse scenario text in mock LLM mode. No API key is required.

## Local setup

Verified on this machine during Phase 0: Python 3.14.6, Node.js v25.6.0, npm 11.8.0. Compatible targets: Python 3.12+ and Node.js 20.19+ (or 22.12+), which Vite 8 requires.

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The API binds to localhost by default. Check liveness with:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok","service":"rescueswarm-api"}
```

Mock LLM mode is the default. An empty `LLM_API_KEY` is expected and required files never include a real key.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://127.0.0.1:5173. Choose a bundled scenario, set a seed and strategy, run the simulation, inspect the graph/events/metrics, optionally close a route, and export results. Mock LLM mode is the default.

Frontend and backend start independently. If the API is not running, the UI still renders and reports that the health check failed.

## Checks

```bash
# backend
cd backend
source .venv/bin/activate
pytest
ruff check app tests

# frontend
cd frontend
npm test
npm run typecheck
npm run build
```

Pinned versions:

- Backend: FastAPI 0.159.1, Pydantic 2.14.1, pydantic-settings 2.16.1, Uvicorn 0.54.0, NetworkX 3.6.1, SQLAlchemy 2.0.44, pytest 9.1.1, ruff 0.17.1
- Frontend: React 19.3.1, Vite 8.3.5, TypeScript 7.0.2, Vitest 4.1.11

Use `backend/requirements.lock` and `frontend/package-lock.json` for a reproducible install. Additional locked libraries: NetworkX 3.6.1 and SQLAlchemy 2.0.44. Provider LLM calls are optional; httpx is used only if `LLM_PROVIDER` is not `mock` and a key is configured locally.

Repeat-run experiment batch (from `backend/`):

```bash
PYTHONPATH=. python scripts/run_experiments.py
```

Output is written to `backend/artifacts/` (`experiment_batch.json`, `disruption_batch.json`, `experiment_tables.md`). Interpret measured findings from `evaluation_results.md`. UI screenshots from the 2026-10-22 demo are in `artifacts/screenshots/`.

## Documentation pack

1. Read `prd.md` and `architecture.md`.
2. Read `agent_design.md`, `api_contracts.md`, and `llm_safety.md` before coding the backend.
3. Read `app_flow.md` before implementing the UI.
4. Follow `implementation_plan.md` phase by phase.
5. Run the checks in `testing_strategy.md` and the experiment protocol in `evaluation_plan.md`.
6. Use `report_outline.md` to collect evidence for the academic submission.

If documents disagree, resolve the conflict in this order: `prd.md` (scope) → `architecture.md` (system boundaries) → `agent_design.md` and `api_contracts.md` (behavior and interfaces) → implementation. Record an approved architectural change in `decision_log.md` and update affected documents in the same change.

## Scope note

RescueSwarm is an educational simulation, not an operational emergency-response system. All maps, locations, incidents, capacity values, resource counts, and outcomes are simulated. The system must not dispatch real emergency services or present generated recommendations as real-world emergency instructions.

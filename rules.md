# Consolidated Coding Rules

This file summarizes engineering rules for human contributors and AI coding tools. Platform-specific auto-loaded rules live in `.cursor/rules/` and `.agents/rules/`; root `AGENTS.md` is the shared entry point.

## Product boundaries

- Build only the MVP defined in `prd.md` unless scope is explicitly approved and documented.
- This is a synthetic educational simulation. Do not add real emergency dispatch, live emergency feeds, contact with responders, or physical actions.
- Keep mock mode fully functional without API keys or external network access.

## Stack enforcement

- Frontend: React + TypeScript + Vite.
- Backend: Python + FastAPI.
- Boundary validation: Pydantic.
- Route graph: NetworkX.
- Local persistence: SQLite through a repository/service layer.
- Test deterministic logic without an LLM or internet.
- Verify compatible stable package versions and commit lockfiles once setup is implemented. Do not silently swap frameworks.

## Code quality

- Use typed inputs/outputs, small modules, cohesive functions, and clear names.
- Keep HTTP routes thin; keep domain logic out of UI components.
- Keep provider-specific LLM code behind an adapter.
- Avoid duplicated schemas; synchronize Pydantic models and frontend types using tests or a documented generation method.
- Make tie-breaking deterministic wherever the output is meant to be reproducible.
- Add tests whenever behavior changes. Test the error path as well as the happy path.

## Agent and GenAI rules

- Agent roles, state transitions, and messages must follow `agent_design.md`.
- Agents propose actions; the coordinator validates and commits them.
- Deterministic code is authoritative for routing, allocation, hard constraints, and metrics.
- LLM output is untrusted; validate it with a strict schema and business rules.
- Require user review before a parsed natural-language draft becomes a runnable scenario.
- The LLM has no arbitrary tools, shell, filesystem, or external action permissions.
- Bound model calls, retries, output size, and coordinator steps.
- Store action summaries and evidence references, not private chain-of-thought.

## Security and privacy

- Never commit `.env`, credentials, tokens, or keys.
- Never expose secrets in logs, errors, prompts, exports, or browser code.
- Treat scenario descriptions and imported JSON as untrusted input.
- Enforce size/quantity bounds on the server.
- Do not use real personal or emergency data in the project.
- Public deployment is out of MVP scope; no-auth local assumptions must not be presented as production security.

## Change discipline

- Follow `implementation_plan.md` and work one phase at a time.
- Read the relevant specifications before changing a subsystem.
- Do not overwrite unrelated user work or use destructive Git commands without permission.
- When a decision changes architecture or scope, record the rationale in `decision_log.md` and update the affected specs.
- Keep `known_limitations.md` accurate.

## Done means

- Acceptance criteria are met.
- Relevant tests/checks were run and outcomes reported honestly.
- Documents, API contracts, and tests match the implementation.
- No unsupported claim of completion, reliability, or experimental performance is made.

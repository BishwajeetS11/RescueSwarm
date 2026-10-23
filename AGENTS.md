# Repository Instructions for AI Coding Agents

These instructions apply to Cursor, Google Antigravity, and other coding agents working in this repository.

## Mandatory first steps

1. Read `rules.md` for coding/security invariants.
2. Read `prd.md` for scope and non-goals.
3. Read `architecture.md` for component boundaries and approved stack.
4. Read `agent_design.md` before changing agent behavior or orchestration.
5. Read `api_contracts.md` before changing backend endpoints or frontend API calls.
6. Read `llm_safety.md` before adding an LLM or tool integration.
7. Read `testing_strategy.md` and `evaluation_plan.md` before changing tests or metrics.
8. Read `implementation_plan.md` and work only on the current phase or explicitly assigned task.

## Scope and architecture invariants

- Build an educational simulation only. Never add real emergency dispatch, live emergency feeds, emergency calling, live location tracking, or real resource-control integrations.
- Implement the MVP in the approved stack. Do not silently introduce another framework, hosted service, database, queue, vector database, or paid dependency.
- GenAI is optional at runtime. Mock/offline mode must support the full demonstration without an API key.
- Use the LLM for language interpretation and explanation, not as the authority for routing math, capacity checks, assignment feasibility, or reported metrics.
- Enforce hard constraints in ordinary validated code. Do not rely on prompts to enforce capacity, route availability, schema validity, or safety boundaries.
- Keep agents modular, with typed inputs/outputs and explicit responsibilities. Avoid creating extra agents that only rename the same function.
- Do not fake data provenance, citations, test outcomes, measurements, or claims about model behavior.

## Coding standards

- Prefer small modules and cohesive functions over large all-in-one files.
- Use type hints in Python and strict TypeScript types in frontend code.
- Validate external inputs and LLM outputs with explicit schemas.
- Keep business logic out of UI components and HTTP route handlers.
- Use structured logs with run ID, event type, agent name, and outcome; do not log secrets.
- Use environment variables for configurable settings and secrets. Never commit `.env` or API keys.
- Add tests for behavior changes. Use deterministic fixtures for tests.
- Avoid hidden global state. Pass run context and dependencies explicitly.
- Handle loading, empty, error, and offline/mock states in the UI.
- Do not overstate accessibility, reliability, or production readiness without verification.

## Implementation workflow

1. Confirm the assigned task and inspect the relevant files.
2. State a compact plan before broad or cross-cutting changes.
3. Implement the smallest complete vertical slice.
4. Run relevant formatting, lint, type-check, and test commands that exist in the repository.
5. Fix regressions caused by the change.
6. Update documentation and API contracts when behavior or interfaces change.
7. Summarize changed files, tests run, results, and remaining limitations. Never say a check passed unless it was actually run and passed.

## Git and dependency discipline

- Do not overwrite unrelated user work.
- Do not reset, force-push, delete user data, or run destructive commands without explicit authorization.
- Do not add dependencies unless they support an approved requirement; state why and update dependency files.
- Keep dependency versions reproducible through lockfiles or pinned environment files created by the implementation.
- If a requested change conflicts with a source-of-truth document, stop and explain the conflict instead of silently changing scope.

## Completion criteria

A task is complete only when its acceptance criteria are met, relevant tests are added or updated, checks are reported honestly, and any changed behavior is documented.

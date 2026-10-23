# Product Requirements Document (PRD)

**Product:** RescueSwarm  
**Version:** 1.0 — initial MVP specification  
**Status:** MVP implemented (Phases 0–8). Educational simulation only.

## 1. Product summary

RescueSwarm is an educational web application that simulates disaster-response coordination using specialized software agents and Generative AI. A user creates or selects a synthetic incident scenario, runs the simulation, observes agent decisions and resource assignments, introduces a disruption, and compares outcomes with a simple baseline strategy.

It demonstrates agent-based computing through autonomous specialist behavior, coordination, state updates, constrained resource allocation, route replanning, and an auditable event history. GenAI supports natural-language scenario interpretation and post-run explanations. The LLM does not control hard constraints or calculate official metrics.

## 2. Problem statement

Disaster-response planning can involve multiple incidents, limited response resources, route closures, shelter capacity limits, and changing priorities. A static plan can become invalid when the scenario changes. This project studies whether a coordinated multi-agent simulation can adapt its plan more effectively than a fixed/simple baseline under controlled synthetic conditions.

This is a classroom simulation, not a claim that the software is safe or suitable for real emergency operations.

## 3. Target audience

- Primary: undergraduate students and faculty evaluating Autonomous AI Systems and Agent-Based Computing.
- Secondary: developers learning multi-agent coordination, deterministic simulation, and responsible GenAI integration.
- Demo user: a student or evaluator who configures a synthetic scenario and inspects system behavior.

## 4. Goals

1. Demonstrate multiple specialized agents with clear roles and typed inputs/outputs.
2. Interpret a plain-language scenario into validated structured incident data using GenAI when configured.
3. Coordinate finite simulated resources across incidents while respecting hard capacity and route constraints.
4. Replan when a simulated disruption occurs.
5. Make agent actions and decision reasons visible in an event log.
6. Compare the multi-agent approach with a documented deterministic baseline.
7. Produce reproducible metrics and artifacts suitable for the project report and presentation.
8. Support an offline mock mode so the project is demonstrable without paid APIs or internet connectivity.

## 5. Non-goals — must not be implemented in the MVP

- Real-world emergency dispatch, emergency calls, or integration with ambulance/fire/police services.
- Live public-safety feeds, live traffic, real GPS tracking, or identifying real affected individuals.
- Claims that its recommendations are clinically, operationally, or legally authoritative.
- Production-grade deployment, high availability, multi-tenant administration, billing, or complex role-based access.
- Training or fine-tuning a foundation model.
- Autonomous external actions, financial transactions, or contact with third parties.
- Real-time sensor/IoT integrations, drones, robotics, or physical actuation.
- Image-based casualty diagnosis or medical triage.
- Unbounded self-directed agent loops or agents that can create arbitrary tools.

## 6. MVP user stories

### US-01: Select a scenario
As a demo user, I can load a bundled synthetic scenario so I can run the system without manually entering all data.

**Acceptance:** At least three scenarios are bundled; each includes a graph, incidents, and resource inventory; invalid scenario data is rejected with a useful error.

### US-02: Describe a scenario in natural language
As a demo user, I can enter a short incident description and see a structured preview before it is accepted.

**Acceptance:** The parser proposes structured fields; every parsed field is shown for review; invalid or missing fields trigger clarification/default prompts; mock mode works without an LLM API key.

### US-03: Run coordinated response
As a demo user, I can start a run and observe assignments, routes, resource status, and agent events.

**Acceptance:** A run produces a stable run ID, a final run status, a decision trace, and metrics. Hard constraints are enforced by code.

### US-04: Introduce a disruption
As a demo user, I can close a simulated route edge or reduce a resource/shelter capacity to see whether the system replans.

**Acceptance:** The disruption is recorded as a simulation event; a new plan is computed; affected assignments are marked as retained, changed, or infeasible.

### US-05: Inspect a decision
As a demo user, I can open an event or assignment and see the structured reason, relevant constraints, and whether GenAI wrote the natural-language explanation.

**Acceptance:** Explainability does not invent facts; each explanation references existing structured run data.

### US-06: Compare strategies
As a demo user, I can compare the coordinated system with a simple baseline on the same scenario and seed.

**Acceptance:** Scenario, seed, and metric definitions are identical; results clearly label measured outputs and do not claim statistical significance from a single run.

### US-07: Export results
As a demo user, I can export a run summary as JSON or CSV for the report.

**Acceptance:** Export includes run/scenario identifiers, seed, timestamps, algorithm label, metrics, and the simulated event trace; it excludes secrets and provider credentials.

## 7. Functional requirements

- FR-01: Load bundled scenarios from validated JSON files.
- FR-02: Create/edit a scenario within the safe synthetic data model.
- FR-03: Parse optional natural-language input to a typed schema; retain a mock parser fallback.
- FR-04: Score incident urgency using a documented deterministic formula.
- FR-05: Plan paths over a weighted graph that supports closed edges.
- FR-06: Allocate simulated resources without exceeding inventory/capacity constraints.
- FR-07: Coordinate agents in a bounded workflow with explicit states and maximum step counts.
- FR-08: Apply a disruption and rerun affected planning steps.
- FR-09: Store run metadata and event traces locally in SQLite.
- FR-10: Display agent events, assignments, routes, capacities, and metrics.
- FR-11: Offer baseline comparison and reproducible seeded runs.
- FR-12: Export run output as JSON and CSV.
- FR-13: Surface LLM mode (`mock` or configured provider), request failures, and fallback status.
- FR-14: Show an educational simulation disclaimer in the application and exports.

## 8. Non-functional requirements

- Deterministic components should produce identical results for identical input and seed, except timestamps/IDs explicitly excluded from comparison.
- Every run has bounded iterations, bounded LLM calls, request timeouts, and a maximum scenario size.
- External inputs and LLM outputs are schema-validated.
- The app should run locally on a typical student laptop with a small synthetic scenario.
- API errors use a consistent JSON structure.
- UI supports loading, empty, validation, partial-failure, and offline/mock states.
- Do not include secrets in logs or exports.
- Core scenario execution must be available in mock/offline mode.

## 9. MVP scope limits / configurable caps

Initial defaults (may be changed only with an updated decision log): maximum 25 nodes, 60 edges, 20 incidents, 30 total resources, 10 shelters, and 10 simulation replanning cycles per run. Keep LLM scenario text below 4,000 characters. Enforce server-side limits even if the UI also limits input.

## 10. Success criteria

A release candidate is acceptable when:

- All MVP user stories pass their acceptance tests.
- Every hard constraint has automated tests.
- At least three scenarios and two disruption types are demonstrable.
- Baseline and coordinated strategies are compared using the same input scenarios and seeds.
- The report can reproduce metrics from exported artifacts.
- Mock mode works without credentials.
- No critical secrets or real-world integrations exist in the repository.

## 11. Assumptions and risks

- A synthetic graph is an adequate teaching abstraction for route planning.
- A simple, transparent heuristic is preferable to a complex, hard-to-debug optimizer in the MVP.
- A configured LLM may be unavailable or nondeterministic; the core system must still work without it.
- Results reflect only the synthetic scenarios and algorithms tested, not real disaster-response effectiveness.

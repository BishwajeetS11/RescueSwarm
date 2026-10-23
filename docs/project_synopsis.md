# Project Synopsis — RescueSwarm

> F0003 CA2/CA3 · Agentic AI Course

## Problem Being Solved

Disaster-response planning presents a classic multi-objective resource allocation problem: a dispatcher must assign finite medical units, shelter capacity, and supply kits across several simultaneous incidents while respecting route availability, capacity constraints, and changing priorities. A single static plan rapidly becomes invalid when conditions change — a road closes, a shelter fills up, or a new incident emerges. Manual replanning under time pressure introduces coordination errors and missed coverage. This project studies whether a coordinated, multi-agent simulation can adapt its plan more effectively than a fixed, sequential baseline strategy under controlled synthetic conditions.

## Solution: Multi-Agent Coordination System

RescueSwarm is an educational web application that simulates disaster-response coordination using nine specialized software agents and optional Generative AI. A user loads or describes a synthetic scenario, executes the simulation, and observes how the system allocates resources across incidents. The system implements an **orchestrator-worker** multi-agent pattern: a **Coordinator Agent** owns the run lifecycle and sequentially invokes specialist agents — an **Incident Prioritizer**, a **Route Planner**, a **Medical Dispatch Agent**, a **Shelter Allocation Agent**, and a **Supply Allocation Agent** — each proposing actions against a shared simulation state. A **Constraint Validator** rejects infeasible proposals before they mutate state. A **Scenario Interpreter** converts free-text incident descriptions into validated structured data via an optional LLM call. An **Explanation Agent** summarizes committed results in plain language without altering the plan.

When a user applies a disruption (e.g. closes a route or reduces shelter capacity), the Coordinator triggers a bounded replanning cycle, releasing and reallocating invalidated assignments. All hard constraints — capacity limits, route feasibility, no double-booking — are enforced in deterministic code; the LLM is never the authority for these checks. An offline mock mode supports a full demonstration without any API key.

## Target User and Context

The primary audience is undergraduate students and faculty evaluating Autonomous AI Systems and Agent-Based Computing. A demo user configures a bundled synthetic scenario (e.g. resource shortage, disconnected graph, alternate routes), runs both the RescueSwarm and a simple baseline strategy, introduces disruptions, and compares structured event traces and metrics side by side. The system is explicitly not intended for operational emergency response: all maps, incident data, capacity values, and outcomes are simulated. It must not be used to dispatch real emergency services.

## Scope Note (CA3 vs CA2)

The scope is consistent with the CA2 submission. The full agent inventory (9 agents), orchestration pattern, technology stack (FastAPI + React/TypeScript + SQLite), and mock-mode-first design were established in the CA2 design document. CA3 delivers the complete, running implementation: all six bundled scenarios, deterministic allocation algorithms, constraint validation, disruption handling and replanning, structured event tracing, metric computation, experiment batch runs, and the React/TypeScript frontend. No scope changes from CA2 design goals were required.

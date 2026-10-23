#!/usr/bin/env python3
"""Run the evaluation matrix and write raw JSON plus filled result tables."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from time import perf_counter

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.agents.coordinator import Coordinator  # noqa: E402
from app.algorithms.metrics import compute_metrics  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.constants import ALGORITHM_VERSION, METRIC_SCHEMA_VERSION  # noqa: E402
from app.core.limits import limits_from_settings  # noqa: E402
from app.evaluation import FAMILY, build_scale_scenario  # noqa: E402
from app.repositories.scenario_repository import ScenarioRepository  # noqa: E402
from app.schemas.enums import DisruptionType, LLMMode, RunStrategy  # noqa: E402
from app.schemas.run import DisruptionRequest  # noqa: E402
from app.schemas.scenario import Scenario  # noqa: E402
from app.services.scenario_validation import validate_scenario_draft  # noqa: E402
from app.simulation.disruptions import apply_disruption  # noqa: E402
from app.simulation.state import SimulationState  # noqa: E402

OUT = ROOT / "artifacts"
SCENARIOS = ROOT / "scenarios"
SEED = 42


def _record(scenario: Scenario, strategy: RunStrategy, detail, state: SimulationState, elapsed_ms: float) -> dict:
    recomputed = compute_metrics(state)
    recomputed.constraint_violation_count = detail.metrics.constraint_violation_count
    recomputed.coordinator_steps = detail.metrics.coordinator_steps
    recomputed.replan_count = detail.metrics.replan_count
    return {
        "family": FAMILY.get(scenario.id, scenario.id),
        "scenario_id": scenario.id,
        "scenario_name": scenario.name,
        "strategy": strategy.value,
        "seed": SEED,
        "status": detail.status.value,
        "elapsed_ms": round(elapsed_ms, 3),
        "metrics": detail.metrics.model_dump(),
        "recomputed_metrics": {
            "incident_coverage_rate": recomputed.incident_coverage_rate,
            "medical_assignment_coverage": recomputed.medical_assignment_coverage,
            "unmet_demand_total": recomputed.unmet_demand_total,
            "constraint_violation_count": recomputed.constraint_violation_count,
        },
        "medical_incident_ids": [item.incident_id for item in state.medical_assignments],
        "node_count": len(scenario.nodes),
        "incident_count": len(scenario.incidents),
        "algorithm_version": ALGORITHM_VERSION,
        "metric_schema_version": METRIC_SCHEMA_VERSION,
        "llm_mode": LLMMode.mock.value,
        "seed_used_for_rng": False,
    }


def _fmt(value: float | None, digits: int = 2) -> str:
    if value is None:
        return "N/A"
    return f"{value:.{digits}f}"


def _run(coordinator: Coordinator, scenario: Scenario, strategy: RunStrategy):
    started = perf_counter()
    detail, state, events = coordinator.execute(scenario, strategy, SEED, LLMMode.mock)
    elapsed_ms = (perf_counter() - started) * 1000
    return detail, state, events, elapsed_ms


def _disruption_trial(
    coordinator: Coordinator,
    scenario: Scenario,
    strategy: RunStrategy,
    request: DisruptionRequest,
    label: str,
) -> dict:
    _detail, state, events, _elapsed = _run(coordinator, scenario, strategy)
    before_medical = list(state.medical_assignments)
    before_supply = list(state.supply_assignments)
    before_keys = {(item.incident_id, "medical") for item in before_medical} | {
        (item.incident_id, "supply") for item in before_supply
    }
    affected = apply_disruption(state, request)
    after_keys = {(item.incident_id, "medical") for item in state.medical_assignments} | {
        (item.incident_id, "supply") for item in state.supply_assignments
    }
    invalidated = sorted(before_keys - after_keys)
    started = perf_counter()
    updated, state, _events = coordinator.execute(
        scenario,
        strategy,
        SEED,
        LLMMode.mock,
        run_id=state.run_id,
        existing_state=state,
        existing_events=events,
        replan=True,
    )
    replan_ms = (perf_counter() - started) * 1000
    restored = 0
    for incident_id, kind in invalidated:
        if kind == "medical" and any(item.incident_id == incident_id for item in state.medical_assignments):
            restored += 1
        if kind == "supply" and any(item.incident_id == incident_id for item in state.supply_assignments):
            restored += 1
    invalidated_count = len(invalidated)
    recovery = None if invalidated_count == 0 else restored / invalidated_count
    return {
        "label": label,
        "family": FAMILY.get(scenario.id, scenario.id),
        "scenario_id": scenario.id,
        "strategy": strategy.value,
        "seed": SEED,
        "disruption": request.model_dump(),
        "assignments_invalidated": invalidated_count,
        "assignments_restored": restored,
        "recovery_rate": recovery,
        "affected_incident_ids": affected,
        "replan_count": updated.metrics.replan_count,
        "replan_steps": updated.metrics.coordinator_steps,
        "replan_elapsed_ms": round(replan_ms, 3),
        "final_status": updated.status.value,
        "final_feasibility": updated.status.value,
        "constraint_violation_count": updated.metrics.constraint_violation_count,
        "medical_incident_ids_before": [item.incident_id for item in before_medical],
        "medical_incident_ids_after": [item.incident_id for item in state.medical_assignments],
        "mean_assigned_route_cost_after": updated.metrics.mean_assigned_route_cost,
    }


def _write_tables(records: list[dict], disruptions: list[dict], path: Path) -> None:
    lines = [
        "# Experiment tables (generated)",
        "",
        f"Algorithm version: `{ALGORITHM_VERSION}`. Metric schema: `{METRIC_SCHEMA_VERSION}`. Seed: {SEED}. LLM mode: mock.",
        "The recorded seed is part of the run identity; current allocators do not draw random numbers from it.",
        "",
        "### Aggregate table",
        "",
        "| Scenario family | Strategy | Runs / seeds | Coverage | Medical coverage | Mean route cost | Unmet demand | Constraint violations | Runtime (ms) |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for item in records:
        metrics = item["metrics"]
        lines.append(
            "| {family} | {strategy} | 1 / {seed} | {cov} | {med} | {cost} | {unmet} | {viol} | {runtime} |".format(
                family=item["family"],
                strategy=item["strategy"],
                seed=item["seed"],
                cov=_fmt(metrics["incident_coverage_rate"]),
                med=_fmt(metrics["medical_assignment_coverage"]),
                cost=_fmt(metrics["mean_assigned_route_cost"]),
                unmet=metrics["unmet_demand_total"],
                viol=metrics["constraint_violation_count"],
                runtime=_fmt(item["elapsed_ms"], 1),
            )
        )
    lines.extend(
        [
            "",
            "### Disruption table",
            "",
            "| Scenario | Strategy | Assignments invalidated | Assignments restored | Recovery rate | Replan steps | Final feasibility |",
            "|---|---|---:|---:|---:|---:|---|",
        ]
    )
    for item in disruptions:
        lines.append(
            "| {label} | {strategy} | {inv} | {rest} | {rec} | {steps} | {status} |".format(
                label=item["label"],
                strategy=item["strategy"],
                inv=item["assignments_invalidated"],
                rest=item["assignments_restored"],
                rec=_fmt(item["recovery_rate"]),
                steps=item["replan_steps"],
                status=item["final_feasibility"],
            )
        )
    lines.extend(
        [
            "",
            "### Medical unit recipient (policy difference)",
            "",
            "| Scenario | RescueSwarm incidents | Baseline incidents |",
            "|---|---|---|",
        ]
    )
    by_scenario: dict[str, dict[str, list[str]]] = {}
    for item in records:
        by_scenario.setdefault(item["scenario_id"], {})[item["strategy"]] = item["medical_incident_ids"]
    for scenario_id, strategies in by_scenario.items():
        swarm = ", ".join(strategies.get("rescueswarm", [])) or "none"
        baseline = ", ".join(strategies.get("baseline", [])) or "none"
        lines.append(f"| {scenario_id} | {swarm} | {baseline} |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    settings = get_settings()
    limits = limits_from_settings(settings)
    repo = ScenarioRepository(SCENARIOS, limits)
    coordinator = Coordinator(settings)
    OUT.mkdir(exist_ok=True)

    scenarios = []
    for summary in repo.list_summaries():
        scenario = repo.get(summary.id)
        if scenario is not None:
            scenarios.append(scenario)
    scale = build_scale_scenario()
    draft_errors = validate_scenario_draft(scale, limits, assign_id=scale.id)
    if not draft_errors.valid:
        raise SystemExit(f"Scale scenario failed validation: {draft_errors.errors}")
    scenarios.append(scale)

    records = []
    for scenario in scenarios:
        for strategy in (RunStrategy.rescueswarm, RunStrategy.baseline):
            detail, state, _events, elapsed_ms = _run(coordinator, scenario, strategy)
            records.append(_record(scenario, strategy, detail, state, elapsed_ms))

    routes = next(item for item in scenarios if item.id == "scenario-routes-1")
    balanced = next(item for item in scenarios if item.id == "scenario-balanced-1")
    disruptions = []
    for strategy in (RunStrategy.rescueswarm, RunStrategy.baseline):
        disruptions.append(
            _disruption_trial(
                coordinator,
                routes,
                strategy,
                DisruptionRequest(
                    type=DisruptionType.close_edge,
                    edge_id="e-cheap",
                    reason="E3 close used cheapest route",
                ),
                "Alternate routes / close e-cheap",
            )
        )
        disruptions.append(
            _disruption_trial(
                coordinator,
                balanced,
                strategy,
                DisruptionRequest(
                    type=DisruptionType.reduce_shelter_capacity,
                    shelter_id="shelter-1",
                    new_capacity=18,
                    reason="E3 reduce shelter to remaining used capacity",
                ),
                "Balanced flood / reduce shelter to 18",
            )
        )

    batch_path = OUT / "experiment_batch.json"
    disruption_path = OUT / "disruption_batch.json"
    config_path = OUT / "experiment_config.json"
    tables_path = OUT / "experiment_tables.md"
    records.sort(key=lambda item: (item["family"], item["strategy"]))
    disruptions.sort(key=lambda item: (item["label"], item["strategy"]))
    batch_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    disruption_path.write_text(json.dumps(disruptions, indent=2), encoding="utf-8")
    config_path.write_text(
        json.dumps(
            {
                "seed": SEED,
                "algorithm_version": ALGORITHM_VERSION,
                "metric_schema_version": METRIC_SCHEMA_VERSION,
                "llm_mode": "mock",
                "llm_calls": 0,
                "seed_used_for_rng": False,
                "strategies": ["rescueswarm", "baseline"],
                "scenario_ids": [item.id for item in scenarios],
                "partial_assignment_counts_as_coverage": True,
                "notes": [
                    "Incident coverage counts an incident if it received any medical, shelter, or kit assignment.",
                    "Baseline processes incidents in input order and takes the first feasible unit by id.",
                    "RescueSwarm ranks incidents by the documented priority formula and prefers lower route cost.",
                    "Both strategies replan after a disruption; the comparison is allocation policy, not with/without AI.",
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    _write_tables(records, disruptions, tables_path)
    print(f"Wrote {len(records)} planning runs and {len(disruptions)} disruption trials to {OUT}")


if __name__ == "__main__":
    main()

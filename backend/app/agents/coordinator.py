from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from app.algorithms.constraints import committed_invariants
from app.algorithms.metrics import compute_metrics
from app.algorithms.planner import plan_once
from app.core.config import Settings
from app.core.constants import ALGORITHM_VERSION, METRIC_SCHEMA_VERSION
from app.llm.explanation import explain_run
from app.schemas.enums import Actor, EventStatus, EventType, IncidentStatus, LLMMode, RunStatus, RunStrategy
from app.schemas.run import RunDetail, RunEvent, RunMetrics, SimulationSnapshot
from app.schemas.scenario import Scenario
from app.simulation.state import SimulationState


def _now() -> datetime:
    return datetime.now(UTC)


class Coordinator:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def execute(
        self,
        scenario: Scenario,
        strategy: RunStrategy,
        seed: int,
        llm_mode: LLMMode,
        run_id: str | None = None,
        existing_state: SimulationState | None = None,
        existing_events: list[RunEvent] | None = None,
        replan: bool = False,
    ) -> tuple[RunDetail, SimulationState, list[RunEvent]]:
        run_id = run_id or f"run-{uuid4()}"
        events = list(existing_events or [])
        sequence = events[-1].sequence if events else 0
        state = existing_state or SimulationState.from_scenario(scenario, run_id, seed, strategy)
        state.status = RunStatus.running

        def emit(
            actor: Actor,
            event_type: EventType,
            status: EventStatus,
            reason_codes: list[str],
            payload: dict,
            before: int | None = None,
            after: int | None = None,
        ) -> None:
            nonlocal sequence
            sequence += 1
            events.append(
                RunEvent(
                    event_id=f"evt-{uuid4()}",
                    run_id=run_id,
                    sequence=sequence,
                    timestamp=_now(),
                    actor=actor,
                    event_type=event_type,
                    status=status,
                    reason_codes=reason_codes,
                    payload=payload,
                    state_version_before=before,
                    state_version_after=after,
                )
            )

        if replan:
            emit(
                Actor.coordinator,
                EventType.replan_started,
                EventStatus.info,
                ["replan"],
                {"step": state.step},
            )
        else:
            emit(
                Actor.coordinator,
                EventType.run_started,
                EventStatus.info,
                ["run_started"],
                {"strategy": strategy.value, "seed": seed, "scenario_id": scenario.id},
            )

        seen: set[str] = set()
        max_steps = self._settings.max_coordinator_steps
        started_step = state.step
        for step in range(started_step + 1, started_step + max_steps + 1):
            state.step = step
            before = state.signature()
            version_before = state.state_version
            results = plan_once(state)
            emit(
                Actor.prioritizer,
                EventType.priority_computed,
                EventStatus.success,
                ["priority_computed"],
                {"priorities": state.priorities},
            )
            for action, errors in results:
                if errors:
                    emit(
                        Actor.constraint_validator,
                        EventType.proposal_rejected,
                        EventStatus.rejected,
                        [item.code for item in errors],
                        {"action": action.model_dump(), "errors": [item.model_dump() for item in errors]},
                        before=version_before,
                        after=state.state_version,
                    )
                    continue
                event_type = (
                    EventType.incident_unserved if action.kind == "mark_unserved" else EventType.allocation_committed
                )
                actor = {
                    "assign_medical": Actor.medical_dispatch,
                    "assign_shelter": Actor.shelter_allocator,
                    "assign_supply": Actor.supply_allocator,
                    "mark_unserved": Actor.coordinator,
                }[action.kind]
                emit(
                    actor,
                    event_type,
                    EventStatus.warning if action.kind == "mark_unserved" else EventStatus.success,
                    action.reason_codes,
                    {"action": action.model_dump()},
                    before=version_before,
                    after=state.state_version,
                )
            after = state.signature()
            if after == before:
                emit(Actor.coordinator, EventType.no_progress, EventStatus.info, ["no_progress"], {"step": step})
                break
            if after in seen:
                emit(
                    Actor.coordinator,
                    EventType.no_progress,
                    EventStatus.warning,
                    ["repeated_state"],
                    {"step": step},
                )
                break
            seen.add(after)
            if all(incident.status != IncidentStatus.pending for incident in state.incidents):
                break
        else:
            emit(
                Actor.coordinator,
                EventType.max_steps_reached,
                EventStatus.warning,
                ["max_steps_reached"],
                {"max_steps": max_steps},
            )

        violations = committed_invariants(state)
        metrics = compute_metrics(state)
        metrics.constraint_violation_count = len(violations)
        metrics.coordinator_steps = state.step
        has_assignments = bool(
            state.medical_assignments or state.shelter_assignments or state.supply_assignments
        )
        has_demand = any(
            incident.medical_units_required or incident.kits_required or incident.shelter_demand
            for incident in state.incidents
        )
        if violations:
            state.status = RunStatus.failed
        elif not has_assignments and has_demand:
            state.status = RunStatus.infeasible
        else:
            state.status = RunStatus.completed

        if replan:
            emit(
                Actor.coordinator,
                EventType.replan_completed,
                EventStatus.success,
                ["replan_completed"],
                {"status": state.status.value},
            )
        emit(
            Actor.coordinator,
            EventType.run_completed,
            EventStatus.success if state.status != RunStatus.failed else EventStatus.failed,
            [state.status.value],
            {"status": state.status.value, "metrics": metrics.model_dump()},
        )

        explanation = explain_run(scenario, state, metrics, llm_mode)
        detail = _to_detail(scenario, state, metrics, events, llm_mode, explanation)
        return detail, state, events


def _to_detail(
    scenario: Scenario,
    state: SimulationState,
    metrics: RunMetrics,
    events: list[RunEvent],
    llm_mode: LLMMode,
    explanation: str,
) -> RunDetail:
    from hashlib import sha256

    snapshot_hash = sha256(scenario.model_dump_json().encode("utf-8")).hexdigest()
    created = events[0].timestamp if events else _now()
    completed = events[-1].timestamp if events else None
    return RunDetail(
        run_id=state.run_id,
        status=state.status,
        scenario_id=scenario.id,
        strategy=state.strategy,
        seed=state.seed,
        metrics=metrics,
        event_count=len(events),
        llm_mode=llm_mode,
        created_at=created,
        completed_at=completed,
        algorithm_version=ALGORITHM_VERSION,
        metric_schema_version=METRIC_SCHEMA_VERSION,
        scenario_snapshot_hash=snapshot_hash,
        scenario=scenario,
        state=SimulationSnapshot.model_validate(state.snapshot_payload()),
        explanation=explanation,
        explanation_source="template",
    )

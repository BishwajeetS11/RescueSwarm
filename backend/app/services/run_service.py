from __future__ import annotations

import csv
import io
from functools import lru_cache

from app.agents.coordinator import Coordinator
from app.api.errors import AppError
from app.core.config import Settings, get_settings
from app.core.constants import DISCLAIMER
from app.core.limits import limits_from_settings
from app.llm.provider import LLMAdapter
from app.repositories.run_repository import RunRepository
from app.repositories.scenario_repository import ScenarioRepository
from app.schemas.enums import Actor, EventStatus, EventType, LLMMode
from app.schemas.run import (
    Comparability,
    DisruptionRequest,
    DisruptionResponse,
    EventListResponse,
    ParseTextRequest,
    ParseTextResponse,
    RunCompareResponse,
    RunCreateRequest,
    RunDetail,
    RunListResponse,
    RunSummary,
)
from app.simulation.disruptions import apply_disruption
from app.simulation.state import SimulationState


class RunService:
    def __init__(
        self,
        scenarios: ScenarioRepository,
        runs: RunRepository,
        settings: Settings,
    ) -> None:
        self._scenarios = scenarios
        self._runs = runs
        self._settings = settings
        self._coordinator = Coordinator(settings)
        self._llm = LLMAdapter(settings)

    def create_run(self, request: RunCreateRequest) -> RunSummary:
        if request.llm_mode == LLMMode.provider and self._settings.llm_provider == "mock":
            request = request.model_copy(update={"llm_mode": LLMMode.mock})
        scenario = self._require_scenario(request.scenario_id)
        detail, _state, events = self._coordinator.execute(
            scenario, request.strategy, request.seed, request.llm_mode
        )
        self._runs.save_scenario(scenario, bundled=self._scenarios.is_bundled(scenario.id))
        self._runs.save_run(detail, events)
        return _summary(detail)

    def get_run(self, run_id: str) -> RunDetail:
        return self._load(run_id)[0]

    def list_runs(
        self,
        scenario_id: str | None,
        strategy: str | None,
        limit: int,
        offset: int,
    ) -> RunListResponse:
        limit = min(max(limit, 1), 100)
        offset = max(offset, 0)
        items, total = self._runs.list_runs(scenario_id, strategy, limit, offset)
        return RunListResponse(items=items, total=total)

    def list_events(
        self,
        run_id: str,
        after_sequence: int | None = None,
        actor: str | None = None,
        event_type: str | None = None,
    ) -> EventListResponse:
        _detail, events = self._load(run_id)
        if after_sequence is not None:
            events = [event for event in events if event.sequence > after_sequence]
        if actor:
            events = [event for event in events if event.actor.value == actor]
        if event_type:
            events = [event for event in events if event.event_type.value == event_type]
        return EventListResponse(items=events)

    def apply_disruption(self, run_id: str, request: DisruptionRequest) -> DisruptionResponse:
        detail, events = self._load(run_id)
        state = SimulationState.from_snapshot(
            detail.state, detail.strategy, detail.scenario.allow_shelter_split
        )
        before_count = len(events)
        apply_disruption(state, request)
        events.append(
            events[-1].model_copy(
                update={
                    "event_id": f"{events[-1].event_id}-d",
                    "sequence": events[-1].sequence + 1,
                    "actor": Actor.user,
                    "event_type": EventType.disruption_applied,
                    "status": EventStatus.info,
                    "reason_codes": [request.type.value],
                    "payload": request.model_dump(),
                    "state_version_before": state.state_version - 1,
                    "state_version_after": state.state_version,
                }
            )
        )
        updated, state, new_events = self._coordinator.execute(
            detail.scenario,
            detail.strategy,
            detail.seed,
            detail.llm_mode,
            run_id=detail.run_id,
            existing_state=state,
            existing_events=events,
            replan=True,
        )
        self._runs.save_run(updated, new_events)
        return DisruptionResponse(
            run=updated,
            replan_status=updated.status,
            new_event_count=len(new_events) - before_count,
        )

    def export_json(self, run_id: str) -> dict:
        detail, events = self._load(run_id)
        return {
            "disclaimer": DISCLAIMER,
            "run": detail.model_dump(mode="json"),
            "events": [event.model_dump(mode="json") for event in events],
        }

    def export_csv(self, run_id: str) -> str:
        detail, events = self._load(run_id)
        buffer = io.StringIO()
        writer = csv.DictWriter(
            buffer,
            fieldnames=[
                "run_id",
                "scenario_id",
                "strategy",
                "seed",
                "sequence",
                "timestamp",
                "actor",
                "event_type",
                "status",
                "reason_codes",
                "disclaimer",
            ],
        )
        writer.writeheader()
        for event in events:
            writer.writerow(
                {
                    "run_id": detail.run_id,
                    "scenario_id": detail.scenario_id,
                    "strategy": detail.strategy.value,
                    "seed": detail.seed,
                    "sequence": event.sequence,
                    "timestamp": event.timestamp.isoformat(),
                    "actor": event.actor.value,
                    "event_type": event.event_type.value,
                    "status": event.status.value,
                    "reason_codes": "|".join(event.reason_codes),
                    "disclaimer": DISCLAIMER,
                }
            )
        return buffer.getvalue()

    def compare(self, run_ids: list[str]) -> RunCompareResponse:
        if len(run_ids) < 2:
            raise AppError(422, "VALIDATION_ERROR", "At least two run_ids are required.")
        details = [self.get_run(run_id) for run_id in run_ids]
        first = details[0]
        differences: list[str] = []
        for item in details[1:]:
            if item.scenario_snapshot_hash != first.scenario_snapshot_hash:
                differences.append("scenario_hash")
            if item.seed != first.seed:
                differences.append("seed")
            if item.strategy != first.strategy:
                differences.append("strategy")
            if item.algorithm_version != first.algorithm_version:
                differences.append("algorithm_version")
            if item.metric_schema_version != first.metric_schema_version:
                differences.append("metric_schema_version")
        unique = sorted(set(differences))
        return RunCompareResponse(
            items=details,
            comparability=Comparability(comparable=not unique, differences=unique),
        )

    def parse_text(self, request: ParseTextRequest) -> ParseTextResponse:
        template = self._require_scenario("scenario-balanced-1")
        limits = limits_from_settings(self._settings)
        if len(request.text) > limits.max_llm_text_chars:
            raise AppError(413, "PAYLOAD_TOO_LARGE", "Scenario text exceeds the 4000 character limit.")
        return self._llm.parse_scenario(request.text, template, limits, request.llm_mode)

    def _require_scenario(self, scenario_id: str):
        scenario = self._scenarios.get(scenario_id)
        if scenario is None:
            raise AppError(404, "NOT_FOUND", f"Scenario '{scenario_id}' was not found.")
        return scenario

    def _load(self, run_id: str) -> tuple:
        loaded = self._runs.get_run(run_id)
        if loaded is None:
            raise AppError(404, "NOT_FOUND", f"Run '{run_id}' was not found.")
        return loaded


def _summary(detail: RunDetail) -> RunSummary:
    return RunSummary(
        run_id=detail.run_id,
        status=detail.status,
        scenario_id=detail.scenario_id,
        strategy=detail.strategy,
        seed=detail.seed,
        metrics=detail.metrics,
        event_count=detail.event_count,
        llm_mode=detail.llm_mode,
        disclaimer=detail.disclaimer,
        created_at=detail.created_at,
        completed_at=detail.completed_at,
        algorithm_version=detail.algorithm_version,
        metric_schema_version=detail.metric_schema_version,
    )


@lru_cache
def get_run_repository() -> RunRepository:
    return RunRepository()


def get_run_service() -> RunService:
    from app.api.deps import get_scenario_repository

    return RunService(get_scenario_repository(), get_run_repository(), get_settings())

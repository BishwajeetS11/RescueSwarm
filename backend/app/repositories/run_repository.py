from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.db import get_session_factory, init_db
from app.repositories.models import EventRow, RunRow, ScenarioRow
from app.schemas.run import RunDetail, RunEvent, RunSummary
from app.schemas.scenario import Scenario


class RunRepository:
    def __init__(self) -> None:
        init_db()
        self._sessions = get_session_factory()

    def session(self) -> Session:
        return self._sessions()

    def save_scenario(self, scenario: Scenario, bundled: bool) -> None:
        with self.session() as session:
            row = session.get(ScenarioRow, scenario.id)
            if row is None:
                row = ScenarioRow(
                    id=scenario.id,
                    bundled=bundled,
                    payload=scenario.model_dump_json(),
                    created_at=datetime.now(UTC),
                )
                session.add(row)
            else:
                row.payload = scenario.model_dump_json()
                row.bundled = bundled
            session.commit()

    def save_run(self, detail: RunDetail, events: list[RunEvent]) -> None:
        with self.session() as session:
            payload = detail.model_dump_json()
            row = session.get(RunRow, detail.run_id)
            if row is None:
                row = RunRow(
                    id=detail.run_id,
                    scenario_id=detail.scenario_id,
                    strategy=detail.strategy.value,
                    seed=detail.seed,
                    status=detail.status.value,
                    llm_mode=detail.llm_mode.value,
                    scenario_snapshot_hash=detail.scenario_snapshot_hash,
                    algorithm_version=detail.algorithm_version,
                    metric_schema_version=detail.metric_schema_version,
                    payload=payload,
                    created_at=detail.created_at,
                    completed_at=detail.completed_at,
                )
                session.add(row)
            else:
                row.status = detail.status.value
                row.payload = payload
                row.completed_at = detail.completed_at
            session.query(EventRow).filter(EventRow.run_id == detail.run_id).delete()
            for event in events:
                session.add(
                    EventRow(
                        event_id=event.event_id,
                        run_id=event.run_id,
                        sequence=event.sequence,
                        payload=event.model_dump_json(),
                    )
                )
            session.commit()

    def get_run(self, run_id: str) -> tuple[RunDetail, list[RunEvent]] | None:
        with self.session() as session:
            row = session.get(RunRow, run_id)
            if row is None:
                return None
            events = (
                session.query(EventRow)
                .filter(EventRow.run_id == run_id)
                .order_by(EventRow.sequence.asc())
                .all()
            )
            detail = RunDetail.model_validate_json(row.payload)
            parsed_events = [RunEvent.model_validate_json(item.payload) for item in events]
            return detail, parsed_events

    def list_runs(self, scenario_id: str | None, strategy: str | None, limit: int, offset: int) -> tuple[list[RunSummary], int]:
        with self.session() as session:
            query = session.query(RunRow)
            if scenario_id:
                query = query.filter(RunRow.scenario_id == scenario_id)
            if strategy:
                query = query.filter(RunRow.strategy == strategy)
            total = query.count()
            rows = query.order_by(RunRow.created_at.desc()).offset(offset).limit(limit).all()
            details = [RunDetail.model_validate_json(row.payload) for row in rows]
            summaries = [
                RunSummary(
                    run_id=item.run_id,
                    status=item.status,
                    scenario_id=item.scenario_id,
                    strategy=item.strategy,
                    seed=item.seed,
                    metrics=item.metrics,
                    event_count=item.event_count,
                    llm_mode=item.llm_mode,
                    disclaimer=item.disclaimer,
                    created_at=item.created_at,
                    completed_at=item.completed_at,
                    algorithm_version=item.algorithm_version,
                    metric_schema_version=item.metric_schema_version,
                )
                for item in details
            ]
            return summaries, total

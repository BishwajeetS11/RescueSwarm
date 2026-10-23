from __future__ import annotations

from uuid import uuid4

from app.api.errors import AppError
from app.core.limits import ScenarioLimits
from app.repositories.scenario_repository import ScenarioRepository
from app.schemas.scenario import (
    Scenario,
    ScenarioDraft,
    ScenarioListResponse,
    ScenarioValidateResponse,
)
from app.services.scenario_validation import validate_scenario_draft


class ScenarioService:
    def __init__(self, repository: ScenarioRepository, limits: ScenarioLimits) -> None:
        self._repository = repository
        self._limits = limits

    def list_scenarios(self) -> ScenarioListResponse:
        return ScenarioListResponse(items=self._repository.list_summaries())

    def get_scenario(self, scenario_id: str) -> Scenario:
        scenario = self._repository.get(scenario_id)
        if scenario is None:
            raise AppError(404, "NOT_FOUND", f"Scenario '{scenario_id}' was not found.")
        return scenario

    def validate(self, draft: ScenarioDraft) -> ScenarioValidateResponse:
        return validate_scenario_draft(draft, self._limits, assign_id=draft.id or f"scenario-{uuid4()}")

    def create(self, draft: ScenarioDraft) -> Scenario:
        assigned_id = draft.id or f"scenario-{uuid4()}"
        if self._repository.get(assigned_id) is not None:
            raise AppError(409, "CONFLICT", f"Scenario '{assigned_id}' already exists.")
        result = validate_scenario_draft(draft, self._limits, assign_id=assigned_id)
        if not result.valid or result.normalized_scenario is None:
            raise AppError(
                422,
                "VALIDATION_ERROR",
                "The scenario failed domain validation.",
                details=result.errors,
            )
        return self._repository.save(result.normalized_scenario)

from __future__ import annotations

import json
from pathlib import Path

from app.core.limits import ScenarioLimits
from app.schemas.scenario import Scenario, ScenarioSummary
from app.services.scenario_validation import validate_scenario_draft


class ScenarioLoadError(RuntimeError):
    pass


class ScenarioRepository:
    def __init__(self, bundled_dir: Path, limits: ScenarioLimits) -> None:
        self._bundled_dir = bundled_dir
        self._limits = limits
        self._bundled: dict[str, Scenario] = {}
        self._saved: dict[str, Scenario] = {}
        self.reload_bundled()

    def reload_bundled(self) -> None:
        loaded: dict[str, Scenario] = {}
        if not self._bundled_dir.exists():
            raise ScenarioLoadError(f"Bundled scenario directory is missing: {self._bundled_dir}")
        for path in sorted(self._bundled_dir.glob("*.json")):
            payload = json.loads(path.read_text(encoding="utf-8"))
            draft = Scenario.model_validate(payload)
            result = validate_scenario_draft(draft, self._limits, assign_id=draft.id)
            if not result.valid or result.normalized_scenario is None:
                issues = "; ".join(f"{item.field}: {item.issue}" for item in result.errors)
                raise ScenarioLoadError(f"Bundled scenario {path.name} is invalid: {issues}")
            scenario = result.normalized_scenario
            if scenario.id in loaded:
                raise ScenarioLoadError(f"Duplicate bundled scenario id '{scenario.id}'")
            loaded[scenario.id] = scenario
        if len(loaded) < 3:
            raise ScenarioLoadError("At least three bundled scenarios are required")
        self._bundled = loaded

    def list_summaries(self) -> list[ScenarioSummary]:
        items = [self._to_summary(scenario, bundled=True) for scenario in self._bundled.values()]
        items.extend(self._to_summary(scenario, bundled=False) for scenario in self._saved.values())
        return sorted(items, key=lambda item: item.id)

    def get(self, scenario_id: str) -> Scenario | None:
        return self._saved.get(scenario_id) or self._bundled.get(scenario_id)

    def is_bundled(self, scenario_id: str) -> bool:
        return scenario_id in self._bundled

    def save(self, scenario: Scenario) -> Scenario:
        self._saved[scenario.id] = scenario
        return scenario

    def replace_saved(self, saved: dict[str, Scenario]) -> None:
        self._saved = dict(saved)

    def saved_copy(self) -> dict[str, Scenario]:
        return dict(self._saved)

    @staticmethod
    def _to_summary(scenario: Scenario, bundled: bool) -> ScenarioSummary:
        return ScenarioSummary(
            id=scenario.id,
            name=scenario.name,
            description=scenario.description,
            incident_count=len(scenario.incidents),
            node_count=len(scenario.nodes),
            medical_unit_count=len(scenario.medical_units),
            bundled=bundled,
        )

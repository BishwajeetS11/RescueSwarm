from __future__ import annotations

import re

from app.core.limits import ScenarioLimits
from app.schemas.enums import IncidentCategory, LLMMode
from app.schemas.run import ParseTextResponse
from app.schemas.scenario import Scenario

_INJECTION_MARKERS = (
    "ignore all rules",
    "dispatch a real",
    "reveal the api key",
    "set every capacity to infinity",
)

_CATEGORY_WORDS = {
    "flood": IncidentCategory.flood,
    "fire": IncidentCategory.fire,
    "earthquake": IncidentCategory.earthquake,
    "storm": IncidentCategory.storm,
}


def parse_with_mock(text: str, template: Scenario, limits: ScenarioLimits) -> ParseTextResponse:
    warnings = ["Review proposed fields before use. This draft is untrusted until you confirm it."]
    missing: list[str] = []
    lowered = text.lower()
    if any(marker in lowered for marker in _INJECTION_MARKERS):
        warnings.append("Input contained instruction-like text; it was treated as untrusted data, not commands.")

    draft = template.model_copy(deep=True)
    draft.name = "Parsed synthetic draft"
    draft.description = text.strip()[: limits.max_description_length]

    category = IncidentCategory.other
    for word, value in _CATEGORY_WORDS.items():
        if word in lowered:
            category = value
            break
    numbers = [int(item) for item in re.findall(r"\b(\d{1,5})\b", text)]
    people = numbers[0] if numbers else None
    if people is None:
        missing.append("incidents[0].people_affected")

    if draft.incidents:
        first = draft.incidents[0]
        first.category = category
        if people is not None:
            first.people_affected = min(people, limits.max_people_affected)
            first.label = f"Parsed {category.value} incident"
        if "closed" in lowered or "blocked" in lowered:
            warnings.append("A route closure was mentioned; confirm edge availability before running.")

    if not draft.incidents:
        missing.append("incidents")

    payload = draft.model_dump()
    payload["id"] = None
    return ParseTextResponse(
        draft=payload,
        needs_review=True,
        warnings=warnings,
        parser_mode=LLMMode.mock,
        missing_fields=missing,
        fallback_used=False,
    )

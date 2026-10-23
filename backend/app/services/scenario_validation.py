from __future__ import annotations

import math
import re
from collections import Counter

from app.core.constants import SCENARIO_SCHEMA_VERSION
from app.core.limits import ScenarioLimits
from app.schemas.common import FieldIssue
from app.schemas.scenario import Scenario, ScenarioDraft, ScenarioValidateResponse

_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def _issue(field: str, issue: str, code: str) -> FieldIssue:
    return FieldIssue(field=field, issue=issue, code=code)


def _check_id(field: str, value: str, limits: ScenarioLimits, errors: list[FieldIssue]) -> None:
    if len(value) > limits.max_id_length:
        errors.append(_issue(field, f"must be at most {limits.max_id_length} characters", "ID_TOO_LONG"))
    if not _ID_PATTERN.match(value):
        errors.append(
            _issue(
                field,
                "must start with an alphanumeric character and use only letters, digits, '.', '_' or '-'",
                "INVALID_ID",
            )
        )


def _unique(field_prefix: str, ids: list[str], errors: list[FieldIssue]) -> None:
    counts = Counter(ids)
    for item_id, count in counts.items():
        if count > 1:
            errors.append(_issue(f"{field_prefix}", f"duplicate id '{item_id}'", "DUPLICATE_ID"))


def validate_scenario_draft(
    draft: Scenario | ScenarioDraft,
    limits: ScenarioLimits,
    *,
    assign_id: str | None = None,
) -> ScenarioValidateResponse:
    errors: list[FieldIssue] = []
    warnings: list[FieldIssue] = []

    scenario_id = draft.id or assign_id
    if not scenario_id:
        errors.append(_issue("id", "scenario id is required", "MISSING_ID"))
        scenario_id = "scenario-pending"
    _check_id("id", scenario_id, limits, errors)

    if draft.schema_version != SCENARIO_SCHEMA_VERSION:
        errors.append(
            _issue(
                "schema_version",
                f"unsupported schema_version {draft.schema_version}; expected {SCENARIO_SCHEMA_VERSION}",
                "UNSUPPORTED_SCHEMA",
            )
        )

    if len(draft.nodes) > limits.max_nodes:
        errors.append(_issue("nodes", f"at most {limits.max_nodes} nodes are allowed", "LIMIT_EXCEEDED"))
    if len(draft.edges) > limits.max_edges:
        errors.append(_issue("edges", f"at most {limits.max_edges} edges are allowed", "LIMIT_EXCEEDED"))
    if len(draft.incidents) > limits.max_incidents:
        errors.append(_issue("incidents", f"at most {limits.max_incidents} incidents are allowed", "LIMIT_EXCEEDED"))
    if len(draft.medical_units) > limits.max_resources:
        errors.append(
            _issue("medical_units", f"at most {limits.max_resources} medical units are allowed", "LIMIT_EXCEEDED")
        )
    if len(draft.shelters) > limits.max_shelters:
        errors.append(_issue("shelters", f"at most {limits.max_shelters} shelters are allowed", "LIMIT_EXCEEDED"))
    if len(draft.supply_stocks) > limits.max_supply_stocks:
        errors.append(
            _issue("supply_stocks", f"at most {limits.max_supply_stocks} supply stocks are allowed", "LIMIT_EXCEEDED")
        )

    node_ids = [node.id for node in draft.nodes]
    _unique("nodes", node_ids, errors)
    _unique("edges", [edge.id for edge in draft.edges], errors)
    _unique("incidents", [incident.id for incident in draft.incidents], errors)
    _unique("medical_units", [unit.id for unit in draft.medical_units], errors)
    _unique("shelters", [shelter.id for shelter in draft.shelters], errors)
    _unique("supply_stocks", [stock.id for stock in draft.supply_stocks], errors)

    node_id_set = set(node_ids)
    for index, node in enumerate(draft.nodes):
        _check_id(f"nodes[{index}].id", node.id, limits, errors)

    for index, edge in enumerate(draft.edges):
        prefix = f"edges[{index}]"
        _check_id(f"{prefix}.id", edge.id, limits, errors)
        if edge.source not in node_id_set:
            errors.append(_issue(f"{prefix}.source", f"unknown node '{edge.source}'", "UNKNOWN_NODE"))
        if edge.target not in node_id_set:
            errors.append(_issue(f"{prefix}.target", f"unknown node '{edge.target}'", "UNKNOWN_NODE"))
        if edge.source == edge.target:
            errors.append(_issue(f"{prefix}", "self-loop edges are not allowed", "SELF_LOOP"))
        if not math.isfinite(edge.cost) or edge.cost <= 0:
            errors.append(_issue(f"{prefix}.cost", "must be a finite number greater than zero", "INVALID_COST"))

    pair_counts = Counter((edge.source, edge.target) for edge in draft.edges)
    for (source, target), count in pair_counts.items():
        if count > 1:
            errors.append(
                _issue("edges", f"duplicate directed edge from '{source}' to '{target}'", "DUPLICATE_EDGE")
            )

    for index, incident in enumerate(draft.incidents):
        prefix = f"incidents[{index}]"
        _check_id(f"{prefix}.id", incident.id, limits, errors)
        if incident.node_id not in node_id_set:
            errors.append(_issue(f"{prefix}.node_id", f"unknown node '{incident.node_id}'", "UNKNOWN_NODE"))
        if incident.urgency < 1 or incident.urgency > 5:
            errors.append(_issue(f"{prefix}.urgency", "must be an integer from 1 to 5", "OUT_OF_RANGE"))
        if incident.people_affected < 0 or incident.people_affected > limits.max_people_affected:
            errors.append(
                _issue(
                    f"{prefix}.people_affected",
                    f"must be between 0 and {limits.max_people_affected}",
                    "OUT_OF_RANGE",
                )
            )
        if incident.time_sensitivity < 0 or incident.time_sensitivity > 1:
            errors.append(_issue(f"{prefix}.time_sensitivity", "must be between 0 and 1", "OUT_OF_RANGE"))
        if incident.access_risk < 0 or incident.access_risk > 1:
            errors.append(_issue(f"{prefix}.access_risk", "must be between 0 and 1", "OUT_OF_RANGE"))
        for field_name, value in (
            ("medical_units_required", incident.medical_units_required),
            ("kits_required", incident.kits_required),
            ("shelter_demand", incident.shelter_demand),
        ):
            if value < 0:
                errors.append(_issue(f"{prefix}.{field_name}", "cannot be negative", "NEGATIVE_VALUE"))
        if (
            incident.medical_units_required == 0
            and incident.kits_required == 0
            and incident.shelter_demand == 0
        ):
            warnings.append(_issue(f"{prefix}", "incident has zero simulated demand", "ZERO_DEMAND"))

    for index, unit in enumerate(draft.medical_units):
        prefix = f"medical_units[{index}]"
        _check_id(f"{prefix}.id", unit.id, limits, errors)
        if unit.node_id not in node_id_set:
            errors.append(_issue(f"{prefix}.node_id", f"unknown node '{unit.node_id}'", "UNKNOWN_NODE"))

    for index, shelter in enumerate(draft.shelters):
        prefix = f"shelters[{index}]"
        _check_id(f"{prefix}.id", shelter.id, limits, errors)
        if shelter.node_id not in node_id_set:
            errors.append(_issue(f"{prefix}.node_id", f"unknown node '{shelter.node_id}'", "UNKNOWN_NODE"))
        if shelter.capacity < 0:
            errors.append(_issue(f"{prefix}.capacity", "cannot be negative", "NEGATIVE_VALUE"))
        if shelter.used_capacity < 0:
            errors.append(_issue(f"{prefix}.used_capacity", "cannot be negative", "NEGATIVE_VALUE"))
        if shelter.used_capacity > shelter.capacity:
            errors.append(
                _issue(
                    f"{prefix}.used_capacity",
                    "cannot exceed total capacity",
                    "OVER_CAPACITY",
                )
            )

    for index, stock in enumerate(draft.supply_stocks):
        prefix = f"supply_stocks[{index}]"
        _check_id(f"{prefix}.id", stock.id, limits, errors)
        if stock.node_id not in node_id_set:
            errors.append(_issue(f"{prefix}.node_id", f"unknown node '{stock.node_id}'", "UNKNOWN_NODE"))
        if stock.kits_available < 0:
            errors.append(_issue(f"{prefix}.kits_available", "cannot be negative", "NEGATIVE_INVENTORY"))

    if not draft.nodes:
        errors.append(_issue("nodes", "at least one node is required", "EMPTY"))
    if not draft.incidents:
        warnings.append(_issue("incidents", "scenario has no incidents", "EMPTY"))

    normalized: Scenario | None = None
    if not errors:
        payload = draft.model_dump()
        payload["id"] = scenario_id
        normalized = Scenario.model_validate(payload)

    return ScenarioValidateResponse(
        valid=not errors,
        errors=errors,
        warnings=warnings,
        normalized_scenario=normalized,
    )

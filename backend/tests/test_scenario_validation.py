from copy import deepcopy

from app.services.scenario_validation import validate_scenario_draft

from tests.conftest import load_bundled_draft, valid_mini_draft


def test_each_bundled_fixture_validates(limits) -> None:
    names = [
        "balanced_flood.json",
        "resource_shortage.json",
        "alternate_routes.json",
        "shelter_shortage.json",
        "supply_shortage.json",
        "disconnected.json",
    ]
    for name in names:
        draft = load_bundled_draft(name)
        result = validate_scenario_draft(draft, limits, assign_id=draft.id)
        assert result.valid, f"{name}: {[item.model_dump() for item in result.errors]}"
        assert result.normalized_scenario is not None
        assert result.normalized_scenario.id == draft.id


def test_unknown_node_reference_is_rejected(limits) -> None:
    draft = valid_mini_draft()
    payload = draft.model_dump()
    payload["incidents"][0]["node_id"] = "missing-node"
    result = validate_scenario_draft(type(draft).model_validate(payload), limits)
    assert result.valid is False
    assert any(item.code == "UNKNOWN_NODE" for item in result.errors)


def test_duplicate_ids_are_rejected(limits) -> None:
    draft = valid_mini_draft()
    payload = draft.model_dump()
    payload["nodes"].append(deepcopy(payload["nodes"][0]))
    result = validate_scenario_draft(type(draft).model_validate(payload), limits)
    assert result.valid is False
    assert any(item.code == "DUPLICATE_ID" for item in result.errors)


def test_negative_inventory_is_rejected(limits) -> None:
    draft = valid_mini_draft()
    payload = draft.model_dump()
    payload["supply_stocks"][0]["kits_available"] = -4
    result = validate_scenario_draft(type(draft).model_validate(payload), limits)
    assert result.valid is False
    assert any(item.code == "NEGATIVE_INVENTORY" for item in result.errors)


def test_invalid_cost_is_rejected(limits) -> None:
    draft = valid_mini_draft()
    payload = draft.model_dump()
    payload["edges"][0]["cost"] = 0
    result = validate_scenario_draft(type(draft).model_validate(payload), limits)
    assert result.valid is False
    assert any(item.code == "INVALID_COST" for item in result.errors)


def test_over_capacity_shelter_is_rejected(limits) -> None:
    draft = valid_mini_draft()
    payload = draft.model_dump()
    payload["shelters"][0]["capacity"] = 3
    payload["shelters"][0]["used_capacity"] = 5
    result = validate_scenario_draft(type(draft).model_validate(payload), limits)
    assert result.valid is False
    assert any(item.code == "OVER_CAPACITY" for item in result.errors)

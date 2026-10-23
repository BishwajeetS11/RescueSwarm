from pydantic import BaseModel

from app.core.config import Settings


class ScenarioLimits(BaseModel):
    max_nodes: int = 25
    max_edges: int = 60
    max_incidents: int = 20
    max_resources: int = 30
    max_shelters: int = 10
    max_supply_stocks: int = 10
    max_id_length: int = 64
    max_name_length: int = 100
    max_description_length: int = 2000
    max_label_length: int = 80
    max_people_affected: int = 10_000
    max_llm_text_chars: int = 4000
    max_reason_length: int = 200


def limits_from_settings(settings: Settings) -> ScenarioLimits:
    return ScenarioLimits(
        max_nodes=settings.max_nodes,
        max_edges=settings.max_edges,
        max_incidents=settings.max_incidents,
        max_resources=settings.max_resources,
        max_shelters=settings.max_shelters,
        max_llm_text_chars=settings.max_llm_text_chars,
    )

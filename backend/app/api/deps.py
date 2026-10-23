from functools import lru_cache
from pathlib import Path

from app.core.config import get_settings
from app.core.limits import limits_from_settings
from app.repositories.scenario_repository import ScenarioRepository
from app.services.scenario_service import ScenarioService

BACKEND_ROOT = Path(__file__).resolve().parents[2]
BUNDLED_SCENARIOS_DIR = BACKEND_ROOT / "scenarios"


@lru_cache
def get_scenario_repository() -> ScenarioRepository:
    settings = get_settings()
    return ScenarioRepository(BUNDLED_SCENARIOS_DIR, limits_from_settings(settings))


def get_scenario_service() -> ScenarioService:
    settings = get_settings()
    return ScenarioService(get_scenario_repository(), limits_from_settings(settings))

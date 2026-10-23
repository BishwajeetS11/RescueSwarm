from fastapi import APIRouter, Depends, Response

from app.api.deps import get_scenario_service
from app.schemas.run import ParseTextRequest, ParseTextResponse
from app.schemas.scenario import (
    Scenario,
    ScenarioDraft,
    ScenarioListResponse,
    ScenarioValidateResponse,
)
from app.services.run_service import RunService, get_run_service
from app.services.scenario_service import ScenarioService

router = APIRouter(prefix="/api/v1/scenarios", tags=["scenarios"])


@router.get("", response_model=ScenarioListResponse)
def list_scenarios(service: ScenarioService = Depends(get_scenario_service)) -> ScenarioListResponse:
    return service.list_scenarios()


@router.post("/validate", response_model=ScenarioValidateResponse)
def validate_scenario(
    draft: ScenarioDraft, service: ScenarioService = Depends(get_scenario_service)
) -> ScenarioValidateResponse:
    return service.validate(draft)


@router.post("/parse-text", response_model=ParseTextResponse)
def parse_text(
    request: ParseTextRequest, service: RunService = Depends(get_run_service)
) -> ParseTextResponse:
    return service.parse_text(request)


@router.post("", response_model=Scenario, status_code=201)
def create_scenario(
    draft: ScenarioDraft,
    response: Response,
    service: ScenarioService = Depends(get_scenario_service),
) -> Scenario:
    scenario = service.create(draft)
    response.status_code = 201
    return scenario


@router.get("/{scenario_id}", response_model=Scenario)
def get_scenario(
    scenario_id: str, service: ScenarioService = Depends(get_scenario_service)
) -> Scenario:
    return service.get_scenario(scenario_id)

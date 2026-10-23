from fastapi import APIRouter, Depends, Query, Response

from app.schemas.enums import RunStrategy
from app.schemas.run import (
    DisruptionRequest,
    DisruptionResponse,
    EventListResponse,
    RunCompareResponse,
    RunCreateRequest,
    RunDetail,
    RunListResponse,
    RunSummary,
)
from app.services.run_service import RunService, get_run_service

router = APIRouter(prefix="/api/v1/runs", tags=["runs"])


@router.post("", response_model=RunSummary, status_code=201)
def create_run(request: RunCreateRequest, service: RunService = Depends(get_run_service)) -> RunSummary:
    return service.create_run(request)


@router.get("", response_model=RunListResponse)
def list_runs(
    scenario_id: str | None = None,
    strategy: RunStrategy | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    service: RunService = Depends(get_run_service),
) -> RunListResponse:
    return service.list_runs(scenario_id, strategy.value if strategy else None, limit, offset)


@router.get("/compare", response_model=RunCompareResponse)
def compare_runs(
    run_ids: str,
    service: RunService = Depends(get_run_service),
) -> RunCompareResponse:
    ids = [item.strip() for item in run_ids.split(",") if item.strip()]
    return service.compare(ids)


@router.get("/{run_id}", response_model=RunDetail)
def get_run(run_id: str, service: RunService = Depends(get_run_service)) -> RunDetail:
    return service.get_run(run_id)


@router.get("/{run_id}/events", response_model=EventListResponse)
def list_events(
    run_id: str,
    after_sequence: int | None = None,
    actor: str | None = None,
    event_type: str | None = None,
    service: RunService = Depends(get_run_service),
) -> EventListResponse:
    return service.list_events(run_id, after_sequence, actor, event_type)


@router.post("/{run_id}/disruptions", response_model=DisruptionResponse)
def apply_disruption(
    run_id: str,
    request: DisruptionRequest,
    service: RunService = Depends(get_run_service),
) -> DisruptionResponse:
    return service.apply_disruption(run_id, request)


@router.get("/{run_id}/export.json")
def export_json(run_id: str, service: RunService = Depends(get_run_service)) -> dict:
    return service.export_json(run_id)


@router.get("/{run_id}/export.csv")
def export_csv(run_id: str, service: RunService = Depends(get_run_service)) -> Response:
    content = service.export_csv(run_id)
    return Response(content=content, media_type="text/csv")

from fastapi import APIRouter

from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Liveness probe. Does not expose configuration, secrets, or infrastructure detail."""
    return HealthResponse(status="ok", service="rescueswarm-api")

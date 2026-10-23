from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import (
    AppError,
    app_error_handler,
    http_error_handler,
    request_validation_handler,
    unhandled_error_handler,
)
from app.api.routes.health import router as health_router
from app.api.routes.runs import router as runs_router
from app.api.routes.scenarios import router as scenarios_router
from app.core.config import get_settings
from app.core.db import init_db

settings = get_settings()

app = FastAPI(
    title="RescueSwarm API",
    version="0.1.0",
    summary="Educational disaster-response simulation API.",
    description=(
        "RescueSwarm is an educational simulation using synthetic data. "
        "It does not contact emergency services and must not be used to make "
        "real emergency-response decisions."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "X-Request-ID"],
)


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, request_validation_handler)
app.add_exception_handler(HTTPException, http_error_handler)
app.add_exception_handler(Exception, unhandled_error_handler)

@app.on_event("startup")
def startup() -> None:
    init_db()


app.include_router(health_router)
app.include_router(scenarios_router)
app.include_router(runs_router)


def run() -> None:
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_env == "development",
    )


if __name__ == "__main__":
    run()

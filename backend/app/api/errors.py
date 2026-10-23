from typing import Any

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.schemas.common import ErrorBody, ErrorResponse, FieldIssue


def request_id_of(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def error_payload(
    code: str,
    message: str,
    request_id: str,
    details: list[FieldIssue] | None = None,
) -> dict[str, Any]:
    return ErrorResponse(
        error=ErrorBody(
            code=code,
            message=message,
            details=details or [],
            request_id=request_id,
        )
    ).model_dump()


class AppError(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: list[FieldIssue] | None = None,
    ) -> None:
        self.code = code
        self.details = details or []
        super().__init__(status_code=status_code, detail=message)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(exc.code, str(exc.detail), request_id_of(request), exc.details),
    )


async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
    message = str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(code, message, request_id_of(request)),
    )


def _loc_to_field(loc: tuple[Any, ...]) -> str:
    parts = [str(item) for item in loc if item not in {"body", "query", "path"}]
    return ".".join(parts) if parts else "body"


async def request_validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        FieldIssue(field=_loc_to_field(err.get("loc", ())), issue=str(err.get("msg", "invalid")), code="MALFORMED")
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=error_payload(
            "VALIDATION_ERROR",
            "The request payload is malformed.",
            request_id_of(request),
            details,
        ),
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    del exc
    return JSONResponse(
        status_code=500,
        content=error_payload(
            "INTERNAL_ERROR",
            "An unexpected error occurred. The simulation did not change.",
            request_id_of(request),
        ),
    )

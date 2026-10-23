from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FieldIssue(APIModel):
    field: str
    issue: str
    code: str = "INVALID"


class ErrorBody(APIModel):
    code: str
    message: str
    details: list[FieldIssue] = Field(default_factory=list)
    request_id: str


class ErrorResponse(APIModel):
    error: ErrorBody

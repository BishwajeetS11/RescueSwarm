from app.algorithms.actions import ProposedAction
from app.schemas.common import APIModel
from app.schemas.enums import AgentResultStatus


class AgentResult(APIModel):
    agent_name: str
    status: AgentResultStatus
    actions: list[ProposedAction]
    reason_codes: list[str]
    evidence_refs: list[str]
    notes: str | None = None

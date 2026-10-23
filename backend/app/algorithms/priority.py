from app.core.constants import PRIORITY_WEIGHTS
from app.schemas.scenario import Incident
from app.simulation.state import SimulationState


def normalize_urgency(urgency: int) -> float:
    return (urgency - 1) / 4


def score_incident(incident: Incident, max_people: int) -> float:
    people_norm = 0.0 if max_people <= 0 else incident.people_affected / max_people
    return (
        PRIORITY_WEIGHTS["urgency"] * normalize_urgency(incident.urgency)
        + PRIORITY_WEIGHTS["people_affected_norm"] * people_norm
        + PRIORITY_WEIGHTS["time_sensitivity"] * incident.time_sensitivity
        + PRIORITY_WEIGHTS["access_risk"] * incident.access_risk
    )


def rank_incidents(state: SimulationState) -> list[Incident]:
    max_people = max((incident.people_affected for incident in state.incidents), default=0)
    scored: list[tuple[float, int, str, Incident]] = []
    for index, incident in enumerate(state.incidents):
        score = score_incident(incident, max_people)
        state.priorities[incident.id] = score
        scored.append((-score, index, incident.id, incident))
    scored.sort()
    return [item[3] for item in scored]

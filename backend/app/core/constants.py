DISCLAIMER = (
    "Educational simulation only; not for real emergency response."
)
DISCLAIMER_LONG = (
    "RescueSwarm is an educational simulation using synthetic data. "
    "It does not contact emergency services and must not be used to make "
    "real emergency-response decisions."
)
ALGORITHM_VERSION = "alloc-v1"
METRIC_SCHEMA_VERSION = "metrics-v1"
SCENARIO_SCHEMA_VERSION = 1
PRIORITY_WEIGHTS = {
    "urgency": 0.40,
    "people_affected_norm": 0.25,
    "time_sensitivity": 0.20,
    "access_risk": 0.15,
}

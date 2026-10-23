from app.core.constants import DISCLAIMER_LONG
from app.schemas.enums import LLMMode
from app.schemas.run import RunMetrics
from app.schemas.scenario import Scenario
from app.simulation.state import SimulationState


def explain_run(scenario: Scenario, state: SimulationState, metrics: RunMetrics, llm_mode: LLMMode) -> str:
    coverage = "n/a" if metrics.incident_coverage_rate is None else f"{metrics.incident_coverage_rate:.2f}"
    medical = f"{metrics.medical_units_used}/{metrics.medical_units_requested}"
    kits = f"{metrics.kits_delivered}/{metrics.kits_requested}"
    shelter = f"{metrics.shelter_demand_fulfilled}/{metrics.shelter_demand_total}"
    return (
        f"{DISCLAIMER_LONG} Simulated run {state.run_id} used the {state.strategy.value} strategy on "
        f"scenario '{scenario.name}' with seed {state.seed} and LLM mode {llm_mode.value}. "
        f"Incident coverage rate {coverage}. Medical units assigned {medical}. "
        f"Shelter demand fulfilled {shelter}. Kits delivered {kits}. "
        f"Unmet simulated demand: medical {metrics.unmet_medical}, shelter {metrics.unmet_shelter}, "
        f"kits {metrics.unmet_kits}. Constraint violations {metrics.constraint_violation_count}. "
        f"These values come from committed simulation state, not from a language model."
    )

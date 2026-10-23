from app.algorithms.actions import ProposedAction
from app.algorithms.routing import shortest_route
from app.schemas.enums import RunStrategy
from app.schemas.scenario import Incident
from app.simulation.state import SimulationState


def propose_supply(state: SimulationState, ordered: list[Incident]) -> list[ProposedAction]:
    actions: list[ProposedAction] = []
    remaining_stock = {stock.id: stock.kits_available for stock in state.stocks}
    incidents = ordered if state.strategy == RunStrategy.rescueswarm else list(state.incidents)
    for incident in incidents:
        demand = incident.kits_required - state.kits_assigned_count(incident.id)
        if demand <= 0:
            continue
        leftover = demand
        while leftover > 0:
            best: tuple[float, str] | None = None
            best_action: ProposedAction | None = None
            stocks = (
                sorted(state.stocks, key=lambda item: item.id)
                if state.strategy == RunStrategy.baseline
                else list(state.stocks)
            )
            for stock in stocks:
                available = remaining_stock[stock.id]
                if available <= 0:
                    continue
                take = min(available, leftover)
                route = shortest_route(state.nodes, state.edges, stock.node_id, incident.node_id)
                if not route.feasible:
                    continue
                action = ProposedAction(
                    kind="assign_supply",
                    incident_id=incident.id,
                    stock_id=stock.id,
                    kits=take,
                    route=route.path,
                    route_cost=route.cost,
                    reason_codes=["supply_assigned"],
                )
                if state.strategy == RunStrategy.baseline:
                    best_action = action
                    break
                key = (route.cost, stock.id)
                if best is None or key < best:
                    best = key
                    best_action = action
            if best_action is None:
                actions.append(
                    ProposedAction(
                        kind="mark_unserved",
                        incident_id=incident.id,
                        category="supply",
                        unmet=leftover,
                        reason_codes=["insufficient_kits_or_route"],
                    )
                )
                break
            assert best_action.stock_id is not None
            assert best_action.kits is not None
            remaining_stock[best_action.stock_id] -= best_action.kits
            leftover -= best_action.kits
            actions.append(best_action)
    return actions

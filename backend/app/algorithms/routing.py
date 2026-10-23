from __future__ import annotations

from dataclasses import dataclass

import networkx as nx

from app.schemas.scenario import Edge, Node


@dataclass(frozen=True)
class RouteResult:
    path: list[str]
    cost: float
    feasible: bool
    reason: str | None = None


def build_graph(nodes: list[Node], edges: list[Edge], *, include_closed: bool = False) -> nx.DiGraph:
    graph = nx.DiGraph()
    for node in nodes:
        graph.add_node(node.id)
    for edge in edges:
        if edge.available or include_closed:
            graph.add_edge(edge.source, edge.target, cost=edge.cost, id=edge.id, available=edge.available)
    return graph


def path_uses_edge(path: list[str], edge: Edge) -> bool:
    for source, target in zip(path, path[1:], strict=False):
        if source == edge.source and target == edge.target:
            return True
    return False


def shortest_route(nodes: list[Node], edges: list[Edge], source: str, target: str) -> RouteResult:
    if source == target:
        return RouteResult(path=[source], cost=0.0, feasible=True)
    graph = build_graph(nodes, edges)
    if source not in graph or target not in graph:
        return RouteResult(path=[], cost=0.0, feasible=False, reason="unknown_node")
    try:
        candidates = list(nx.all_shortest_paths(graph, source, target, weight="cost"))
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return RouteResult(path=[], cost=0.0, feasible=False, reason="no_route")
    best = min(candidates, key=lambda path: (tuple(path), len(path)))
    cost = 0.0
    for u, v in zip(best, best[1:], strict=False):
        cost += float(graph[u][v]["cost"])
    return RouteResult(path=best, cost=cost, feasible=True)

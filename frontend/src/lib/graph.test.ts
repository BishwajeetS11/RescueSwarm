import { describe, expect, it } from "vitest";

import { makeRun, scenario } from "../test/fixtures";
import { curvedEdge, describeEdge, describeRoute, layoutNodes, routeEdgeKeys, routesUsingEdge } from "./graph";

describe("graph helpers", () => {
  it("describes edges and routes with labels instead of ids", () => {
    const edge = scenario.edges[0]!;
    expect(describeEdge(scenario.nodes, edge)).toBe("Base → Site");
    expect(describeRoute(scenario.nodes, ["n-a", "n-c", "n-b"])).toBe("Base → Junction → Site");
    expect(describeRoute(scenario.nodes, [])).toBe("no route");
  });

  it("lays out every node deterministically inside the canvas", () => {
    const first = layoutNodes(scenario.nodes, 760, 440);
    const second = layoutNodes([...scenario.nodes].reverse(), 760, 440);
    expect(first.size).toBe(scenario.nodes.length);
    for (const node of scenario.nodes) {
      const a = first.get(node.id)!;
      const b = second.get(node.id)!;
      expect(a.x).toBeCloseTo(b.x);
      expect(a.y).toBeCloseTo(b.y);
      expect(a.x).toBeGreaterThan(0);
      expect(a.x).toBeLessThan(760);
      expect(a.y).toBeGreaterThan(0);
      expect(a.y).toBeLessThan(440);
    }
  });

  it("bows the reverse of an edge to the opposite side so both stay visible", () => {
    const from = { x: 100, y: 100 };
    const to = { x: 300, y: 100 };
    const forward = curvedEdge(from, to, 10);
    const back = curvedEdge(to, from, 10);
    expect(forward.label.y).not.toBeCloseTo(100);
    expect(Math.sign(forward.label.y - 100)).toBe(-Math.sign(back.label.y - 100));
  });

  it("collects directed edge keys from routes", () => {
    expect([...routeEdgeKeys([["a", "b", "c"], ["c", "a"]])].sort()).toEqual(["a->b", "b->c", "c->a"]);
    expect(routeEdgeKeys([["solo"]]).size).toBe(0);
  });

  it("finds committed routes that use a road", () => {
    const run = makeRun();
    const usage = routesUsingEdge(run, scenario.edges[0]!);
    expect(usage.medical).toEqual([{ unitId: "med-1", incidentId: "inc-1" }]);
    expect(usage.supply).toEqual([{ stockId: "stock-1", incidentId: "inc-1" }]);
    expect(routesUsingEdge(run, scenario.edges[2]!)).toEqual({ medical: [], supply: [] });
  });
});

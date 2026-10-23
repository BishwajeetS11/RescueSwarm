import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { makeRun, metrics } from "../../test/fixtures";
import { CompareTable } from "./CompareTable";

afterEach(cleanup);

const baseline = makeRun({
  run_id: "run-aaaaaaaa-0000-0000-0000-000000000000",
  strategy: "baseline",
  metrics: { ...metrics, unmet_demand_total: 4 },
});
const swarm = makeRun({ run_id: "run-bbbbbbbb-0000-0000-0000-000000000000" });

describe("CompareTable", () => {
  it("labels a strategy-only difference as a controlled comparison", () => {
    render(<CompareTable a={baseline} b={swarm} comparability={{ comparable: false, differences: ["strategy"] }} />);
    expect(screen.getByText("Controlled comparison")).toBeInTheDocument();
    expect(screen.getByText(/only the planning strategy differs/i)).toBeInTheDocument();
  });

  it("shows verdict text for run B relative to run A", () => {
    render(<CompareTable a={baseline} b={swarm} comparability={{ comparable: false, differences: ["strategy"] }} />);
    const row = screen.getByRole("row", { name: /^Unmet demand/ });
    expect(within(row).getByText("B is better")).toBeInTheDocument();
  });

  it("warns when seeds or scenarios differ", () => {
    render(
      <CompareTable a={baseline} b={swarm} comparability={{ comparable: false, differences: ["seed", "scenario_hash"] }} />,
    );
    expect(screen.getByText("Not a controlled comparison")).toBeInTheDocument();
    expect(screen.getByText(/seeds differ/i)).toBeInTheDocument();
    expect(screen.getByText(/scenarios differ/i)).toBeInTheDocument();
  });

  it("warns when disruption histories differ", () => {
    const disrupted = makeRun({
      run_id: "run-cccccccc-0000-0000-0000-000000000000",
      metrics: { ...metrics, replan_count: 1 },
    });
    render(<CompareTable a={baseline} b={disrupted} comparability={{ comparable: false, differences: ["strategy"] }} />);
    expect(screen.getByText(/different numbers of disruptions/i)).toBeInTheDocument();
  });

  it("states that one scenario is not statistical evidence", () => {
    render(<CompareTable a={baseline} b={swarm} comparability={{ comparable: true, differences: [] }} />);
    expect(screen.getByText(/not statistical evidence/i)).toBeInTheDocument();
  });
});

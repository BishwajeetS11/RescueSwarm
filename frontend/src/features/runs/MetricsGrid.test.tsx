import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { metrics } from "../../test/fixtures";
import { MetricsGrid } from "./MetricsGrid";

afterEach(cleanup);

describe("MetricsGrid", () => {
  it("shows percentages with context and a definition for every metric", () => {
    render(<MetricsGrid metrics={metrics} />);
    const coverage = screen.getByRole("article", { name: "Incident coverage: 100%" });
    expect(within(coverage).getByText("1 of 1 incident")).toBeInTheDocument();
    expect(within(coverage).getByRole("tooltip")).toHaveTextContent(/at least one assignment/i);
    expect(screen.getAllByRole("tooltip")).toHaveLength(9);
  });

  it("uses text status labels, not color alone, for shortfalls and violations", () => {
    render(
      <MetricsGrid
        metrics={{
          ...metrics,
          unmet_demand_total: 3,
          unmet_kits: 3,
          kit_fulfillment_rate: 0.25,
          constraint_violation_count: 1,
        }}
      />,
    );
    expect(screen.getByRole("article", { name: "Aid kits delivered: 25%" })).toHaveTextContent("Partial");
    expect(screen.getByRole("article", { name: "Unmet demand: 3" })).toHaveTextContent("Shortfall");
    expect(screen.getByRole("article", { name: "Constraint violations: 1" })).toHaveTextContent("Violation");
  });

  it("shows N/A rather than a misleading 0% when there was no demand", () => {
    render(<MetricsGrid metrics={{ ...metrics, kit_fulfillment_rate: null, kits_requested: 0, kits_delivered: 0 }} />);
    const card = screen.getByRole("article", { name: "Aid kits delivered: N/A" });
    expect(card).toHaveTextContent("No demand");
  });
});

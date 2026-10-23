import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { makeEvent, scenario } from "../../test/fixtures";
import { EventTimeline } from "./EventTimeline";

afterEach(cleanup);

const events = [
  makeEvent({ sequence: 1, event_type: "run_started", payload: { strategy: "rescueswarm", seed: 42 } }),
  makeEvent({
    sequence: 2,
    actor: "medical_dispatch",
    event_type: "allocation_committed",
    status: "success",
    payload: { action: { kind: "assign_medical", incident_id: "inc-1", unit_id: "med-1", route: ["n-a", "n-b"] } },
  }),
  makeEvent({
    sequence: 3,
    actor: "constraint_validator",
    event_type: "proposal_rejected",
    status: "rejected",
    payload: { action: { kind: "assign_medical", incident_id: "inc-1", unit_id: "med-2" }, errors: [] },
  }),
];

describe("EventTimeline", () => {
  it("renders plain-language sentences and keeps raw details behind a disclosure", () => {
    render(<EventTimeline events={events} nodes={scenario.nodes} />);
    expect(screen.getByText("Sent medical unit med-1 to inc-1 via Base → Site")).toBeInTheDocument();
    expect(screen.getAllByText("Technical details")).toHaveLength(3);
    expect(screen.getByText("Showing 3 of 3 events")).toBeInTheDocument();
  });

  it("filters by outcome and can be cleared", () => {
    render(<EventTimeline events={events} nodes={scenario.nodes} />);
    fireEvent.click(screen.getByRole("button", { name: "Rejected" }));
    expect(screen.getByText("Showing 1 of 3 events")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejected" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "All outcomes" }));
    expect(screen.getByText("Showing 3 of 3 events")).toBeInTheDocument();
  });

  it("filters by agent and offers a way out of an empty result", () => {
    render(<EventTimeline events={events} nodes={scenario.nodes} />);
    fireEvent.change(screen.getByLabelText("Agent"), { target: { value: "medical_dispatch" } });
    expect(screen.getByText("Showing 1 of 3 events")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rejected" }));
    expect(screen.getByText(/no events match these filters/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Showing 3 of 3 events")).toBeInTheDocument();
  });

  it("explains an empty trace", () => {
    render(<EventTimeline events={[]} nodes={scenario.nodes} />);
    expect(screen.getByText(/no events recorded/i)).toBeInTheDocument();
  });
});

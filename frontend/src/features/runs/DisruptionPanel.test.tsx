import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeRun } from "../../test/fixtures";
import { DisruptionPanel, validateShelterCapacity } from "./DisruptionPanel";

afterEach(cleanup);

function setup(overrides: { busy?: boolean; selectedEdgeId?: string | null } = {}) {
  const onApply = vi.fn();
  const onSelectEdge = vi.fn();
  render(
    <DisruptionPanel
      run={makeRun()}
      busy={overrides.busy ?? false}
      selectedEdgeId={overrides.selectedEdgeId ?? null}
      onSelectEdge={onSelectEdge}
      onApply={onApply}
    />,
  );
  return { onApply, onSelectEdge };
}

describe("validateShelterCapacity", () => {
  it("blocks values below usage or not below current capacity", () => {
    expect(validateShelterCapacity("", 6, 10)).toMatch(/enter/i);
    expect(validateShelterCapacity("2.5", 6, 10)).toMatch(/whole number/i);
    expect(validateShelterCapacity("3", 6, 10)).toMatch(/already in use/i);
    expect(validateShelterCapacity("10", 6, 10)).toMatch(/lower than the current capacity/i);
    expect(validateShelterCapacity("8", 6, 10)).toBeNull();
  });
});

describe("DisruptionPanel", () => {
  it("lists only open roads for closing, with readable labels", () => {
    setup();
    const select = screen.getByLabelText("Road to close") as HTMLSelectElement;
    const labels = [...select.options].map((option) => option.textContent);
    expect(labels).toContain("Base → Site · cost 2");
    expect(labels.join(" ")).not.toContain("Junction → Site");
  });

  it("warns which committed routes use the selected road before closing it", () => {
    setup({ selectedEdgeId: "e1" });
    expect(screen.getByText(/used by 2 committed routes/i)).toBeInTheDocument();
    expect(screen.getByText(/med-1 → inc-1, kits stock-1 → inc-1/)).toBeInTheDocument();
  });

  it("submits a close request for the selected road", () => {
    const { onApply } = setup({ selectedEdgeId: "e1" });
    fireEvent.click(screen.getByRole("button", { name: "Close road and replan" }));
    expect(onApply).toHaveBeenCalledWith({ type: "close_edge", edge_id: "e1", reason: "simulated road closure" });
  });

  it("offers closed roads to reopen", () => {
    const { onApply } = setup();
    fireEvent.click(screen.getByLabelText("Reopen road"));
    expect((screen.getByLabelText("Road to reopen") as HTMLSelectElement).value).toBe("e4");
    fireEvent.click(screen.getByRole("button", { name: "Reopen road and replan" }));
    expect(onApply).toHaveBeenCalledWith({ type: "open_edge", edge_id: "e4", reason: "simulated road reopening" });
  });

  it("prevents an invalid shelter reduction and explains why", () => {
    const { onApply } = setup();
    fireEvent.click(screen.getByLabelText("Cut shelter"));
    fireEvent.change(screen.getByLabelText("New capacity (seats)"), { target: { value: "3" } });
    expect(screen.getByText(/cannot go below the 6 seats already in use/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reduce capacity and replan" }));
    expect(onApply).not.toHaveBeenCalled();
  });

  it("submits a valid shelter reduction", () => {
    const { onApply } = setup();
    fireEvent.click(screen.getByLabelText("Cut shelter"));
    fireEvent.change(screen.getByLabelText("New capacity (seats)"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Reduce capacity and replan" }));
    expect(onApply).toHaveBeenCalledWith({
      type: "reduce_shelter_capacity",
      shelter_id: "sh-1",
      new_capacity: 8,
      reason: "simulated capacity reduction",
    });
  });

  it("disables the action while a replan is running", () => {
    setup({ busy: true });
    expect(screen.getByRole("button", { name: "Replanning…" })).toBeDisabled();
  });
});

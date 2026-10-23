import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RunLauncher, validateSeed } from "./RunLauncher";

afterEach(cleanup);

describe("validateSeed", () => {
  it("accepts whole numbers from zero up", () => {
    expect(validateSeed("42")).toBeNull();
    expect(validateSeed("0")).toBeNull();
  });

  it("rejects empty, negative and fractional seeds", () => {
    expect(validateSeed("")).not.toBeNull();
    expect(validateSeed("-1")).not.toBeNull();
    expect(validateSeed("1.5")).not.toBeNull();
  });
});

describe("RunLauncher", () => {
  it("runs with the chosen strategy and seed", () => {
    const onRun = vi.fn();
    render(<RunLauncher busy={false} onRun={onRun} />);
    fireEvent.click(screen.getByLabelText(/Baseline/));
    fireEvent.change(screen.getByLabelText("2. Seed"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Run simulation" }));
    expect(onRun).toHaveBeenCalledWith("baseline", 7);
  });

  it("blocks an invalid seed and shows the reason next to the field", () => {
    const onRun = vi.fn();
    render(<RunLauncher busy={false} onRun={onRun} />);
    fireEvent.change(screen.getByLabelText("2. Seed"), { target: { value: "-5" } });
    fireEvent.click(screen.getByRole("button", { name: "Run simulation" }));
    expect(onRun).not.toHaveBeenCalled();
    expect(screen.getByText(/0 or higher/i)).toBeInTheDocument();
    expect(screen.getByLabelText("2. Seed")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a busy state and prevents double submits", () => {
    render(<RunLauncher busy onRun={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Running simulation…" })).toBeDisabled();
  });
});

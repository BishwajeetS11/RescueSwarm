import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeRun, scenario } from "../test/fixtures";
import { NetworkGraph } from "./NetworkGraph";

afterEach(cleanup);

describe("NetworkGraph", () => {
  it("summarizes the map for assistive technology, including closed roads", () => {
    render(<NetworkGraph scenario={scenario} run={makeRun()} />);
    expect(screen.getByRole("group", { name: /4 places and 4 one-way roads, 1 closed/i })).toBeInTheDocument();
  });

  it("has a legend that explains shapes and line styles, not only colors", () => {
    render(<NetworkGraph scenario={scenario} run={makeRun()} />);
    const legend = screen.getByRole("list", { name: "Map legend" });
    expect(legend).toHaveTextContent("Closed road (✕)");
    expect(legend).toHaveTextContent("Medical route (solid)");
    expect(legend).toHaveTextContent("Kit route (dotted)");
  });

  it("makes roads keyboard-selectable only when a handler is given", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<NetworkGraph scenario={scenario} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);

    rerender(<NetworkGraph scenario={scenario} onSelectEdge={onSelect} selectedEdgeId="e1" />);
    const road = screen.getByRole("button", { name: /Base → Site, cost 2, open/ });
    expect(road).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(road, { key: "Enter" });
    fireEvent.click(road);
    expect(onSelect).toHaveBeenCalledWith("e1");
    expect(screen.getByRole("button", { name: /Junction → Site, cost 3, closed/ })).toBeInTheDocument();
  });
});

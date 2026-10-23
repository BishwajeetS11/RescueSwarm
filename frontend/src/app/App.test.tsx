import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DISCLAIMER_TEXT } from "../components/SimulationDisclaimer";
import { App } from "./App";

function jsonResponse(data: unknown) {
  return {
    ok: true,
    headers: { get: () => "application/json" },
    json: async () => data,
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App shell", () => {
  it("shows the simulation disclaimer and mock LLM mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/health")) {
          return jsonResponse({ status: "ok", service: "rescueswarm-api" });
        }
        if (url.includes("/api/v1/scenarios")) {
          return jsonResponse({ items: [] });
        }
        if (url.includes("/api/v1/runs")) {
          return jsonResponse({ items: [], total: 0 });
        }
        return jsonResponse({});
      }),
    );

    render(<App apiBaseUrl="http://127.0.0.1:8000" />);

    expect(screen.getByRole("link", { name: /rescueswarm/i })).toBeInTheDocument();
    expect(screen.getAllByText(/simulation only/i).length).toBeGreaterThan(0);
    expect(screen.getByText(DISCLAIMER_TEXT)).toBeInTheDocument();
    expect(screen.getByLabelText(/language model mode mock/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/rescueswarm-api is reachable/i)).toBeInTheDocument();
    });
  });

  it("marks the current section in the navigation and keeps a skip link", () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<App apiBaseUrl="http://127.0.0.1:8000" />);
    expect(screen.getByRole("link", { name: "Scenarios" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: /skip to main content/i })).toBeInTheDocument();
  });

  it("shows scenario cards and an empty run state once data loads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/health")) return jsonResponse({ status: "ok", service: "rescueswarm-api" });
        if (url.includes("/api/v1/scenarios")) {
          return jsonResponse({
            items: [
              {
                id: "scenario-shortage-1",
                name: "Medical unit shortage",
                description: "Three incidents, one unit.",
                incident_count: 3,
                node_count: 6,
                medical_unit_count: 1,
                bundled: true,
              },
            ],
          });
        }
        return jsonResponse({ items: [], total: 0 });
      }),
    );

    render(<App apiBaseUrl="http://127.0.0.1:8000" />);

    expect(await screen.findByRole("heading", { name: "Medical unit shortage" })).toBeInTheDocument();
    expect(screen.getByText("Medical shortage")).toBeInTheDocument();
    expect(await screen.findByText(/no runs yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Medical unit shortage" })).toHaveAttribute(
      "href",
      "#/scenarios/scenario-shortage-1",
    );
  });

  it("offers a retry when scenarios cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));
    render(<App apiBaseUrl="http://127.0.0.1:8000" />);
    expect(await screen.findByText(/scenarios unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try loading scenarios again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try loading runs again" })).toBeInTheDocument();
  });

  it("explains when the backend returns no scenarios", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).endsWith("/health")
          ? jsonResponse({ status: "ok", service: "rescueswarm-api" })
          : jsonResponse({ items: [], total: 0 }),
      ),
    );
    render(<App apiBaseUrl="http://127.0.0.1:8000" />);
    expect(await screen.findByText(/no scenarios found/i)).toBeInTheDocument();
  });

  it("shows an error state when the health endpoint is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));

    render(<App apiBaseUrl="http://127.0.0.1:8000" />);

    await waitFor(() => {
      expect(screen.getAllByText(/failed to fetch/i).length).toBeGreaterThan(0);
    });
  });
});

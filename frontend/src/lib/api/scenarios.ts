import { apiFetch } from "./http";
import type { ParseTextResponse, Scenario, ScenarioSummary } from "./types";

export async function listScenarios(): Promise<ScenarioSummary[]> {
  const payload = await apiFetch<{ items: ScenarioSummary[] }>("/api/v1/scenarios");
  return payload.items;
}

export async function getScenario(id: string): Promise<Scenario> {
  return apiFetch<Scenario>(`/api/v1/scenarios/${id}`);
}

export async function parseScenarioText(text: string): Promise<ParseTextResponse> {
  return apiFetch<ParseTextResponse>("/api/v1/scenarios/parse-text", {
    method: "POST",
    body: JSON.stringify({ text, llm_mode: "mock" }),
  });
}

export async function createScenario(draft: Record<string, unknown>): Promise<Scenario> {
  return apiFetch<Scenario>("/api/v1/scenarios", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

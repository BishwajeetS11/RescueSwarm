import { apiFetch } from "./http";
import type {
  CompareResponse,
  DisruptionRequest,
  DisruptionResponse,
  RunDetail,
  RunEvent,
  RunSummary,
} from "./types";

export type Strategy = "rescueswarm" | "baseline";

export async function createRun(input: {
  scenario_id: string;
  strategy: Strategy;
  seed: number;
}): Promise<RunSummary> {
  return apiFetch<RunSummary>("/api/v1/runs", {
    method: "POST",
    body: JSON.stringify({ ...input, llm_mode: "mock" }),
  });
}

export async function getRun(runId: string): Promise<RunDetail> {
  return apiFetch<RunDetail>(`/api/v1/runs/${runId}`);
}

export async function listRuns(): Promise<RunSummary[]> {
  const payload = await apiFetch<{ items: RunSummary[]; total: number }>("/api/v1/runs");
  return payload.items;
}

export async function listEvents(runId: string): Promise<RunEvent[]> {
  const payload = await apiFetch<{ items: RunEvent[] }>(`/api/v1/runs/${runId}/events`);
  return payload.items;
}

export async function applyDisruption(
  runId: string,
  body: DisruptionRequest,
): Promise<DisruptionResponse> {
  return apiFetch<DisruptionResponse>(`/api/v1/runs/${runId}/disruptions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function compareRuns(runIds: string[]): Promise<CompareResponse> {
  return apiFetch<CompareResponse>(`/api/v1/runs/compare?run_ids=${runIds.join(",")}`);
}

export function exportJsonUrl(runId: string): string {
  return `/api/v1/runs/${runId}/export.json`;
}

export function exportCsvUrl(runId: string): string {
  return `/api/v1/runs/${runId}/export.csv`;
}

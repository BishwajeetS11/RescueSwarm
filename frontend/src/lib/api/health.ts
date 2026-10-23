export type HealthResponse = {
  status: string;
  service: string;
};

export class HealthRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HealthRequestError";
  }
}

export function parseHealthResponse(data: unknown): HealthResponse {
  if (typeof data !== "object" || data === null) {
    throw new HealthRequestError("Health response was not a JSON object.");
  }

  const record = data as Record<string, unknown>;
  if (typeof record.status !== "string" || typeof record.service !== "string") {
    throw new HealthRequestError("Health response did not match the documented schema.");
  }

  return { status: record.status, service: record.service };
}

export async function getHealth(baseUrl: string): Promise<HealthResponse> {
  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) {
    throw new HealthRequestError(`Health check failed with HTTP ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new HealthRequestError("Health response was not valid JSON.");
  }

  return parseHealthResponse(payload);
}

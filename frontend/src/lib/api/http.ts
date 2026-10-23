import { getApiBaseUrl } from "./client";
import type { ApiError } from "./types";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let code = "HTTP_ERROR";
    let message = `Request failed with HTTP ${response.status}.`;
    try {
      const payload = (await response.json()) as ApiError;
      code = payload.error.code;
      message = payload.error.message;
    } catch {
      // Keep the generic message when the body is not the documented error envelope.
    }
    throw new ApiRequestError(message, response.status, code);
  }
  if (response.headers.get("content-type")?.includes("text/csv")) {
    return (await response.text()) as T;
  }
  return (await response.json()) as T;
}

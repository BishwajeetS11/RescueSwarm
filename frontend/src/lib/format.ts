import { ApiRequestError } from "./api/http";

/** Rates are bounded 0..1 in the API; the UI shows them as percentages. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return `${Math.round(value * 100)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return "N/A";
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `run-8ed1a0f3-f2a3-...` becomes `run-8ed1a0f3` for compact display. */
export function shortId(id: string): string {
  const match = /^([a-z]+-[0-9a-f]{8})-/i.exec(id);
  return match?.[1] ?? id;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

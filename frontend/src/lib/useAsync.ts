import { useCallback, useEffect, useState } from "react";

import { errorMessage } from "./format";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

/**
 * Loads data when `deps` change. `reload` refetches without clearing the
 * current data, so screens keep showing stale content instead of flashing.
 */
export function useAsync<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
  errorFallback = "Unable to load data.",
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const [lastKey, setLastKey] = useState(JSON.stringify(deps));

  const key = JSON.stringify(deps);
  if (key !== lastKey) {
    // Dependencies changed: show loading immediately rather than stale data for another entity.
    setLastKey(key);
    setState({ status: "loading" });
  }

  // `load` is intentionally keyed on the serialized deps, not its identity.
  const stableLoad = useCallback(load, [key]);

  useEffect(() => {
    let cancelled = false;
    stableLoad()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: errorMessage(error, errorFallback) });
      });
    return () => {
      cancelled = true;
    };
  }, [stableLoad, version, errorFallback]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, reload };
}

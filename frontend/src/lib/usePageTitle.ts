import { useEffect } from "react";

/** Keeps the browser tab title in sync with the current screen (orientation + history entries). */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · RescueSwarm (simulation)`;
  }, [title]);
}

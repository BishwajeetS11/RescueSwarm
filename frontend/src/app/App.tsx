import { useEffect, useState } from "react";

import type { ApiStatusState } from "../components/ApiStatus";
import { getApiBaseUrl } from "../lib/api/client";
import { getHealth } from "../lib/api/health";
import { parseHash, type Route } from "../lib/router";
import { AppShell } from "./AppShell";
import { AboutPage } from "./pages/AboutPage";
import { ComparePage } from "./pages/ComparePage";
import { CreatePage } from "./pages/CreatePage";
import { HomePage } from "./pages/HomePage";
import { RunPage } from "./pages/RunPage";
import { ScenarioPage } from "./pages/ScenarioPage";

type AppProps = {
  apiBaseUrl?: string;
};

function renderRoute(route: Route) {
  switch (route.name) {
    case "home":
      return <HomePage />;
    case "scenario":
      return <ScenarioPage id={route.id} />;
    case "run":
      return <RunPage id={route.id} />;
    case "create":
      return <CreatePage />;
    case "compare":
      return <ComparePage a={route.a} b={route.b} />;
    case "about":
      return <AboutPage />;
  }
}

export function App({ apiBaseUrl = getApiBaseUrl() }: AppProps) {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [apiStatus, setApiStatus] = useState<ApiStatusState>({ kind: "loading" });

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getHealth(apiBaseUrl)
      .then((health) => {
        if (!cancelled) setApiStatus({ kind: "ok", service: health.service });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setApiStatus({
            kind: "error",
            message: err instanceof Error ? err.message : "The backend health check failed.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  return (
    <AppShell route={route} apiStatus={apiStatus}>
      {renderRoute(route)}
    </AppShell>
  );
}

import { useEffect, useRef, type ReactNode } from "react";

import { ApiStatus, type ApiStatusState } from "../components/ApiStatus";
import { LLMModeIndicator } from "../components/LLMModeIndicator";
import { SimulationDisclaimer } from "../components/SimulationDisclaimer";
import { href, type Route } from "../lib/router";
import styles from "./AppShell.module.css";

type NavItem = { label: string; target: Route; active: Route["name"][] };

const NAV: NavItem[] = [
  { label: "Scenarios", target: { name: "home" }, active: ["home", "scenario", "run"] },
  { label: "Create", target: { name: "create" }, active: ["create"] },
  { label: "Compare", target: { name: "compare" }, active: ["compare"] },
  { label: "About", target: { name: "about" }, active: ["about"] },
];

type Props = {
  route: Route;
  apiStatus: ApiStatusState;
  children: ReactNode;
};

function routeKey(route: Route): string {
  return "id" in route ? `${route.name}:${route.id}` : route.name;
}

export function AppShell({ route, apiStatus, children }: Props) {
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const key = routeKey(route);

  // Move focus to the new screen so keyboard and screen-reader users notice the change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
    mainRef.current?.scrollIntoView?.({ block: "start" });
  }, [key]);

  return (
    <div className={styles.shell}>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to main content
      </a>
      <header className={styles.header}>
        <div className={styles.bar}>
          <a className={styles.brand} href={href({ name: "home" })}>
            <span className={styles.logo} aria-hidden="true">
              RS
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>RescueSwarm</span>
              <span className={styles.tagline}>Educational multi-agent simulation</span>
            </span>
          </a>
          <nav className={styles.nav} aria-label="Primary">
            {NAV.map((item) => {
              const current = item.active.includes(route.name);
              return (
                <a
                  key={item.label}
                  href={href(item.target)}
                  className={`${styles.link} ${current ? styles.current : ""}`}
                  aria-current={current ? "page" : undefined}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
          <LLMModeIndicator mode="mock" />
        </div>
        <div className={styles.notices}>
          <SimulationDisclaimer />
          <ApiStatus state={apiStatus} />
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        Synthetic data only · No real dispatch, location or emergency-service integration · Deterministic planning;
        the language model (mock by default) never decides routes or capacity.
      </footer>
    </div>
  );
}

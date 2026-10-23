import { useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "../../components/Status";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import { Panel } from "../../components/ui/Panel";
import { PastRunsTable } from "../../features/runs/PastRunsTable";
import { ScenarioCard } from "../../features/scenarios/ScenarioCard";
import { createRun, listRuns } from "../../lib/api/runs";
import { listScenarios } from "../../lib/api/scenarios";
import { errorMessage } from "../../lib/format";
import { DEMO_SCENARIO_ID } from "../../lib/labels";
import { href, navigate } from "../../lib/router";
import { useAsync } from "../../lib/useAsync";
import { usePageTitle } from "../../lib/usePageTitle";
import styles from "./pages.module.css";

const HOW_IT_WORKS = [
  { title: "Pick a scenario", text: "Synthetic road networks with incidents, units, shelters and kits." },
  { title: "Run a strategy", text: "Watch specialist agents propose and a validator approve assignments." },
  { title: "Stress the plan", text: "Close a road or cut shelter capacity, then see what the planner changes." },
  { title: "Compare and export", text: "Check RescueSwarm against a simple baseline and export the evidence." },
];

export function HomePage() {
  usePageTitle("Scenarios");
  const scenarios = useAsync(listScenarios, [], "Unable to load scenarios.");
  const runs = useAsync(listRuns, [], "Unable to load runs.");
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const canDemo = scenarios.status === "ready" && scenarios.data.some((item) => item.id === DEMO_SCENARIO_ID);

  const startDemo = () => {
    setDemoBusy(true);
    setDemoError(null);
    createRun({ scenario_id: DEMO_SCENARIO_ID, strategy: "rescueswarm", seed: 42 })
      .then((run) => navigate({ name: "run", id: run.run_id }))
      .catch((error: unknown) => setDemoError(errorMessage(error, "The demo run could not be started.")))
      .finally(() => setDemoBusy(false));
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div>
          <p className={styles.eyebrowLight}>Educational multi-agent simulation</p>
          <h1 id="hero-title" className={styles.heroTitle}>
            Plan scarce resources when the map changes under you
          </h1>
          <p className={styles.heroText}>
            Explore how cooperating software agents prioritize incidents, route units and respect hard limits, in a
            synthetic world with no real people, places or emergency services.
          </p>
          <div className={styles.heroActions}>
            <Button variant="primary" busy={demoBusy} disabled={!canDemo} onClick={startDemo} icon="▶">
              {demoBusy ? "Starting demo…" : "Start the 60-second demo"}
            </Button>
            <ButtonLink href="#scenario-gallery" variant="secondary" onClick={(event) => {
              event.preventDefault();
              document.getElementById("scenario-gallery")?.scrollIntoView?.({ behavior: "smooth" });
            }}>
              Browse scenarios
            </ButtonLink>
          </div>
          {demoError ? (
            <div className={styles.heroNotice}>
              <Notice tone="danger" title="Could not start the demo" onDismiss={() => setDemoError(null)}>
                {demoError}
              </Notice>
            </div>
          ) : null}
        </div>
        <div>
          <h2 className="visually-hidden">How it works</h2>
          <ol className={styles.steps}>
            {HOW_IT_WORKS.map((step) => (
              <li key={step.title}>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="scenario-gallery" aria-labelledby="gallery-title">
        <h2 id="gallery-title" className={styles.sectionTitle}>
          Choose a scenario
        </h2>
        {scenarios.status === "loading" ? (
          <LoadingState title="Scenarios" message="Loading bundled scenarios…" />
        ) : scenarios.status === "error" ? (
          <ErrorState
            title="Scenarios unavailable"
            message={scenarios.message}
            action={<Button onClick={scenarios.reload} aria-label="Try loading scenarios again">Try again</Button>}
          />
        ) : scenarios.data.length === 0 ? (
          <EmptyState
            title="No scenarios found"
            message="The backend returned no scenarios. Check that the bundled scenario files exist, or create your own."
            action={
              <ButtonLink href={href({ name: "create" })} variant="primary">
                Create a scenario
              </ButtonLink>
            }
          />
        ) : (
          <div className={styles.gallery}>
            {scenarios.data.map((scenario) => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        )}
      </section>

      <Panel title="Recent runs" description="Open a run to inspect its plan, or compare two runs side by side.">
        {runs.status === "loading" ? (
          <LoadingState title="Runs" message="Loading recent runs…" />
        ) : runs.status === "error" ? (
          <ErrorState
            title="Runs unavailable"
            message={runs.message}
            action={<Button onClick={runs.reload} aria-label="Try loading runs again">Try again</Button>}
          />
        ) : runs.data.length === 0 ? (
          <EmptyState
            title="No runs yet"
            message="Start the demo or open a scenario and press Run simulation. Your runs will be listed here."
          />
        ) : (
          <PastRunsTable runs={runs.data} scenarios={scenarios.status === "ready" ? scenarios.data : []} />
        )}
      </Panel>
    </div>
  );
}

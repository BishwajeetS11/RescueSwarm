import { useState } from "react";

import { ErrorState, LoadingState } from "../../components/Status";
import { NetworkGraph } from "../../components/NetworkGraph";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { IncidentTable } from "../../features/scenarios/IncidentTable";
import { ResourceInventory } from "../../features/scenarios/ResourceInventory";
import { RunLauncher } from "../../features/scenarios/RunLauncher";
import { createRun } from "../../lib/api/runs";
import { getScenario } from "../../lib/api/scenarios";
import { errorMessage, pluralize } from "../../lib/format";
import { scenarioFocus, type StrategyKey } from "../../lib/labels";
import { href, navigate } from "../../lib/router";
import { useAsync } from "../../lib/useAsync";
import { usePageTitle } from "../../lib/usePageTitle";
import styles from "./pages.module.css";

type Props = { id: string };

export function ScenarioPage({ id }: Props) {
  const scenario = useAsync(() => getScenario(id), [id], "Unable to load this scenario.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  usePageTitle(scenario.status === "ready" ? scenario.data.name : "Scenario");

  if (scenario.status === "loading") {
    return <LoadingState title="Scenario" message="Loading scenario detail…" />;
  }
  if (scenario.status === "error") {
    return (
      <ErrorState
        title="Scenario unavailable"
        message={scenario.message}
        action={
          <>
            <Button onClick={scenario.reload}>Try again</Button>{" "}
            <Button variant="ghost" onClick={() => navigate({ name: "home" })}>
              Back to scenarios
            </Button>
          </>
        }
      />
    );
  }

  const data = scenario.data;
  const focus = scenarioFocus(data.id);

  const run = (strategy: StrategyKey, seed: number) => {
    setBusy(true);
    setError(null);
    createRun({ scenario_id: data.id, strategy, seed })
      .then((created) => navigate({ name: "run", id: created.run_id }))
      .catch((err: unknown) => {
        setError(errorMessage(err, "The simulation could not be started."));
        setBusy(false);
      });
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Scenario"
        title={data.name}
        description={data.description}
        crumbs={[{ label: "Scenarios", href: href({ name: "home" }) }, { label: data.name }]}
        badges={
          <>
            <Badge tone={focus.tone} glyph={false}>
              {focus.focus}
            </Badge>
            <Badge tone="neutral" glyph={false}>
              {pluralize(data.incidents.length, "incident")}
            </Badge>
            <Badge tone="neutral" glyph={false}>
              {pluralize(data.nodes.length, "place")} · {pluralize(data.edges.length, "road")}
            </Badge>
          </>
        }
      />

      <div className={styles.dashboard}>
        <div className={styles.side}>
          <Panel
            title="Run this scenario"
            description="Pick how incidents are planned. Everything runs offline in mock mode."
            tone="highlight"
          >
            <RunLauncher busy={busy} onRun={run} />
            {error ? (
              <Notice tone="danger" title="Run failed" onDismiss={() => setError(null)}>
                {error}
              </Notice>
            ) : null}
          </Panel>
        </div>
        <div className={styles.center}>
          <Panel title="Network map" description="Places and one-way roads. Numbers are synthetic travel costs.">
            <NetworkGraph scenario={data} />
          </Panel>
          <Panel title="Incidents" description="What each site needs before any planning happens.">
            <IncidentTable incidents={data.incidents} nodes={data.nodes} />
          </Panel>
          <Panel title="Resources and capacity">
            <ResourceInventory scenario={data} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

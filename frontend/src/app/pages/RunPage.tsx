import { useState } from "react";

import { ErrorState, LoadingState } from "../../components/Status";
import { NetworkGraph } from "../../components/NetworkGraph";
import { Button } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import { Panel } from "../../components/ui/Panel";
import { Stepper, type Step } from "../../components/ui/Stepper";
import { ChangeSummary } from "../../features/runs/ChangeSummary";
import { DisruptionPanel } from "../../features/runs/DisruptionPanel";
import { EventTimeline } from "../../features/runs/EventTimeline";
import { ExplanationCard } from "../../features/runs/ExplanationCard";
import { MetricsGrid } from "../../features/runs/MetricsGrid";
import { RouteList } from "../../features/runs/RouteList";
import { RunHeader } from "../../features/runs/RunHeader";
import { IncidentTable } from "../../features/scenarios/IncidentTable";
import { ResourceInventory } from "../../features/scenarios/ResourceInventory";
import { applyDisruption, createRun, getRun, listEvents } from "../../lib/api/runs";
import type { DisruptionRequest, RunDetail, RunEvent } from "../../lib/api/types";
import { latestPriorities } from "../../lib/events";
import { errorMessage } from "../../lib/format";
import { otherStrategy, type StrategyKey } from "../../lib/labels";
import { href, navigate } from "../../lib/router";
import { useAsync } from "../../lib/useAsync";
import { usePageTitle } from "../../lib/usePageTitle";
import styles from "./pages.module.css";

type Loaded = { run: RunDetail; events: RunEvent[] };

async function loadRun(id: string): Promise<Loaded> {
  const [run, events] = await Promise.all([getRun(id), listEvents(id)]);
  return { run, events };
}

function scrollToSection(id: string): void {
  document.getElementById(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

export function RunPage({ id }: { id: string }) {
  const loaded = useAsync(() => loadRun(id), [id], "Unable to load this run.");
  usePageTitle(loaded.status === "ready" ? `Run · ${loaded.data.run.scenario.name}` : "Run");

  if (loaded.status === "loading") {
    return <LoadingState title="Run" message="Loading simulation results…" />;
  }
  if (loaded.status === "error") {
    return (
      <ErrorState
        title="Run unavailable"
        message={loaded.message}
        action={
          <>
            <Button onClick={loaded.reload}>Try again</Button>{" "}
            <Button variant="ghost" onClick={() => navigate({ name: "home" })}>
              Back to scenarios
            </Button>
          </>
        }
      />
    );
  }
  return <RunDashboard key={loaded.data.run.run_id} initial={loaded.data} />;
}

type ChangeState = { request: DisruptionRequest; before: RunDetail; after: RunDetail };

function RunDashboard({ initial }: { initial: Loaded }) {
  const [run, setRun] = useState(initial.run);
  const [events, setEvents] = useState(initial.events);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [change, setChange] = useState<ChangeState | null>(null);
  const [compareBusy, setCompareBusy] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const apply = async (request: DisruptionRequest) => {
    const before = run;
    setBusy(true);
    setError(null);
    try {
      const response = await applyDisruption(run.run_id, request);
      const refreshed = await listEvents(run.run_id);
      setRun(response.run);
      setEvents(refreshed);
      setChange({ request, before, after: response.run });
      setSelectedEdge(null);
    } catch (err) {
      setError(errorMessage(err, "The disruption could not be applied."));
    } finally {
      setBusy(false);
    }
  };

  const compareWithOther = () => {
    setCompareBusy(true);
    setCompareError(null);
    createRun({
      scenario_id: run.scenario_id,
      strategy: otherStrategy(run.strategy as StrategyKey),
      seed: run.seed,
    })
      .then((created) => navigate({ name: "compare", a: run.run_id, b: created.run_id }))
      .catch((err: unknown) => {
        setCompareError(errorMessage(err, "The comparison run could not be started."));
        setCompareBusy(false);
      });
  };

  const disrupted = run.metrics.replan_count > 0;
  const steps: Step[] = [
    { id: "run", label: "Run completed", hint: "Plan committed and validated", state: "done" },
    {
      id: "inspect",
      label: "Inspect the plan",
      hint: "Map, metrics, incidents",
      state: "done",
      onSelect: () => scrollToSection("plan"),
    },
    {
      id: "disrupt",
      label: "Stress the plan",
      hint: disrupted ? `${run.metrics.replan_count} replan(s) applied` : "Close a road or cut a shelter",
      state: disrupted ? "done" : "current",
      onSelect: () => scrollToSection("disruption"),
    },
    {
      id: "compare",
      label: "Compare strategies",
      hint: "Same scenario and seed",
      state: disrupted ? "current" : "upcoming",
      onSelect: compareWithOther,
    },
  ];

  const unmet = {
    medical: run.state.unmet_medical,
    shelter: run.state.unmet_shelter,
    kits: run.state.unmet_kits,
  };
  const closedEdgeId = change && change.request.type === "close_edge" ? change.request.edge_id : null;
  const undo = closedEdgeId
    ? () => apply({ type: "open_edge", edge_id: closedEdgeId, reason: "undo road closure" })
    : undefined;

  return (
    <div className={styles.page}>
      <RunHeader run={run} compareBusy={compareBusy} onCompareOther={compareWithOther} />

      {compareError ? (
        <Notice tone="danger" title="Comparison failed" onDismiss={() => setCompareError(null)}>
          {compareError}
        </Notice>
      ) : null}
      {run.status === "infeasible" ? (
        <Notice tone="warning" title="No feasible assignment">
          The planner could not reach any demand with the current roads and resources. It reports this instead of
          inventing a route. Check the event trace below for the reasons.
        </Notice>
      ) : null}
      {run.status === "failed" ? (
        <Notice tone="danger" title="Constraint violation detected">
          The independent validator found a hard-rule breach in the committed plan. Review the event trace.
        </Notice>
      ) : null}

      <Panel title="Your progress" description="Follow the loop: inspect, stress, then compare.">
        <Stepper label="Run workflow" steps={steps} />
      </Panel>

      <div className={`${styles.dashboard} ${styles.contentFirst}`} id="plan">
        <div className={styles.side}>
          <Panel
            id="disruption"
            title="Disrupt the plan"
            description="Change the world, then watch the planner recompute."
            tone="highlight"
          >
            <DisruptionPanel
              run={run}
              busy={busy}
              selectedEdgeId={selectedEdge}
              onSelectEdge={setSelectedEdge}
              onApply={(request) => void apply(request)}
            />
            {error ? (
              <Notice tone="danger" title="Disruption rejected" onDismiss={() => setError(null)}>
                {error}
              </Notice>
            ) : null}
          </Panel>
          {change ? (
            <ChangeSummary
              request={change.request}
              before={change.before}
              after={change.after}
              onDismiss={() => setChange(null)}
              onUndo={undo}
            />
          ) : null}
          <Panel title="Plain-language summary">
            <ExplanationCard explanation={run.explanation} source={run.explanation_source} />
          </Panel>
        </div>
        <div className={styles.center}>
          <Panel title="Network map" description="Click a road to select it for a disruption.">
            <NetworkGraph scenario={run.scenario} run={run} selectedEdgeId={selectedEdge} onSelectEdge={setSelectedEdge} />
            <details>
              <summary>Text list of committed assignments</summary>
              <RouteList run={run} />
            </details>
          </Panel>
        </div>
      </div>

      <Panel title="Results" description="Hover or focus the ? icons for definitions and units.">
        <MetricsGrid metrics={run.metrics} />
      </Panel>

      <Panel title="Incidents" description="Ranked by the prioritizer's last score. Status shows what was actually assigned.">
        <IncidentTable
          incidents={run.state.incidents}
          nodes={run.scenario.nodes}
          priorities={latestPriorities(events)}
          showStatus
          unmet={unmet}
        />
      </Panel>

      <Panel title="Resources after planning">
        <ResourceInventory scenario={run.scenario} run={run} />
      </Panel>

      <Panel
        title="Agent event trace"
        description="Every proposal, rejection, commit and replan is recorded. Filter by agent or outcome."
      >
        <EventTimeline events={events} nodes={run.scenario.nodes} edges={run.state.edges} />
      </Panel>
      <p>
        <a href={href({ name: "compare", a: run.run_id })}>Open this run in the comparison view</a>
      </p>
    </div>
  );
}

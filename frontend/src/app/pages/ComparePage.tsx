import { EmptyState, ErrorState, LoadingState } from "../../components/Status";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Notice } from "../../components/ui/Notice";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { CompareTable } from "../../features/runs/CompareTable";
import { compareRuns, listRuns } from "../../lib/api/runs";
import { listScenarios } from "../../lib/api/scenarios";
import type { RunSummary, ScenarioSummary } from "../../lib/api/types";
import { formatDateTime, shortId } from "../../lib/format";
import { strategyLabel } from "../../lib/labels";
import { href, navigate } from "../../lib/router";
import { useAsync } from "../../lib/useAsync";
import { usePageTitle } from "../../lib/usePageTitle";
import styles from "./pages.module.css";

type Props = { a?: string | undefined; b?: string | undefined };

/** Prefer the newest same-scenario, same-seed pair with different strategies: baseline as A, RescueSwarm as B. */
export function defaultPair(runs: RunSummary[]): [string, string] | null {
  const sorted = [...runs].sort((x, y) => y.created_at.localeCompare(x.created_at));
  for (const first of sorted) {
    const partner = sorted.find(
      (other) =>
        other.run_id !== first.run_id &&
        other.scenario_id === first.scenario_id &&
        other.seed === first.seed &&
        other.strategy !== first.strategy,
    );
    if (partner) {
      const baseline = first.strategy === "baseline" ? first : partner;
      const swarm = first.strategy === "baseline" ? partner : first;
      return [baseline.run_id, swarm.run_id];
    }
  }
  const [x, y] = sorted;
  return x && y ? [y.run_id, x.run_id] : null;
}

function runLabel(run: RunSummary, scenarios: ScenarioSummary[]): string {
  const name = scenarios.find((item) => item.id === run.scenario_id)?.name ?? run.scenario_id;
  return `${strategyLabel(run.strategy)} · ${name} · seed ${run.seed} · ${formatDateTime(run.created_at)} (${shortId(run.run_id)})`;
}

export function ComparePage({ a, b }: Props) {
  usePageTitle("Compare runs");
  const runs = useAsync(listRuns, [], "Unable to load runs.");
  const scenarios = useAsync(listScenarios, [], "Unable to load scenarios.");

  let body;
  if (runs.status === "loading") {
    body = <LoadingState title="Runs" message="Loading recent runs…" />;
  } else if (runs.status === "error") {
    body = (
      <ErrorState title="Runs unavailable" message={runs.message} action={<Button onClick={runs.reload}>Try again</Button>} />
    );
  } else if (runs.data.length < 2) {
    body = (
      <EmptyState
        title="Two runs are needed"
        message="Run the same scenario with RescueSwarm and with Baseline, then compare them here. The quickest way is the Compare button on any run."
        action={
          <ButtonLink href={href({ name: "home" })} variant="primary">
            Choose a scenario
          </ButtonLink>
        }
      />
    );
  } else {
    const fallback = defaultPair(runs.data);
    const idA = a ?? fallback?.[0] ?? "";
    const idB = b ?? fallback?.[1] ?? "";
    body = (
      <Comparison
        runs={runs.data}
        scenarios={scenarios.status === "ready" ? scenarios.data : []}
        idA={idA}
        idB={idB}
      />
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Compare"
        title="Compare two runs"
        description="Pick any two runs. A controlled comparison uses the same scenario and seed and changes only the strategy."
        crumbs={[{ label: "Scenarios", href: href({ name: "home" }) }, { label: "Compare" }]}
      />
      {body}
    </div>
  );
}

type ComparisonProps = { runs: RunSummary[]; scenarios: ScenarioSummary[]; idA: string; idB: string };

function Comparison({ runs, scenarios, idA, idB }: ComparisonProps) {
  const result = useAsync(() => compareRuns([idA, idB]), [idA, idB], "Unable to compare these runs.");

  return (
    <div className={styles.compareLayout}>
      <Panel title="Choose runs" description="Changing a selection updates the link, so you can share or bookmark it.">
        <div className={styles.pickers}>
          <Field label="Run A (reference)">
            {(props) => (
              <select {...props} value={idA} onChange={(event) => navigate({ name: "compare", a: event.target.value, b: idB })}>
                {runs.map((run) => (
                  <option key={run.run_id} value={run.run_id}>
                    {runLabel(run, scenarios)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Button onClick={() => navigate({ name: "compare", a: idB, b: idA })} aria-label="Swap run A and run B">
            ⇄ Swap
          </Button>
          <Field label="Run B (compared)">
            {(props) => (
              <select {...props} value={idB} onChange={(event) => navigate({ name: "compare", a: idA, b: event.target.value })}>
                {runs.map((run) => (
                  <option key={run.run_id} value={run.run_id}>
                    {runLabel(run, scenarios)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </Panel>

      <Panel title="Side-by-side results" description="Verdicts describe run B relative to run A, metric by metric.">
        {result.status === "loading" ? (
          <LoadingState title="Comparison" message="Comparing runs…" />
        ) : result.status === "error" ? (
          <Notice tone="danger" title="Comparison failed" action={<Button size="sm" onClick={result.reload}>Try again</Button>}>
            {result.message}
          </Notice>
        ) : result.data.items.length < 2 || !result.data.items[0] || !result.data.items[1] ? (
          <EmptyState title="Nothing to compare" message="The backend returned fewer than two runs." />
        ) : (
          <CompareTable a={result.data.items[0]} b={result.data.items[1]} comparability={result.data.comparability} />
        )}
      </Panel>
    </div>
  );
}

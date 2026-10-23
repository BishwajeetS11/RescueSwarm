import { Badge } from "../../components/ui/Badge";
import { ButtonLink, Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { getApiBaseUrl } from "../../lib/api/client";
import { exportCsvUrl, exportJsonUrl } from "../../lib/api/runs";
import type { RunDetail } from "../../lib/api/types";
import { formatDateTime, shortId } from "../../lib/format";
import { otherStrategy, runStatusInfo, STRATEGIES, strategyLabel, type StrategyKey } from "../../lib/labels";
import { href } from "../../lib/router";

type Props = {
  run: RunDetail;
  compareBusy: boolean;
  onCompareOther: () => void;
};

export function RunHeader({ run, compareBusy, onCompareOther }: Props) {
  const status = runStatusInfo(run.status);
  const other = otherStrategy(run.strategy as StrategyKey);
  const base = getApiBaseUrl();
  return (
    <PageHeader
      eyebrow="Simulation run"
      title={run.scenario.name}
      description={`Run ${shortId(run.run_id)} · started ${formatDateTime(run.created_at)}`}
      crumbs={[
        { label: "Scenarios", href: href({ name: "home" }) },
        { label: run.scenario.name, href: href({ name: "scenario", id: run.scenario_id }) },
        { label: `Run ${shortId(run.run_id)}` },
      ]}
      badges={
        <>
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge tone="info" glyph={false}>
            {strategyLabel(run.strategy)}
          </Badge>
          <Badge tone="neutral" glyph={false} title="Recorded with the run; planning is deterministic.">
            Seed {run.seed}
          </Badge>
          <Badge tone="neutral" glyph={false} title="Mock mode makes no network model calls.">
            LLM: {run.llm_mode}
          </Badge>
          <Badge tone="neutral" glyph={false}>
            {run.algorithm_version} · {run.metric_schema_version}
          </Badge>
        </>
      }
      actions={
        <>
          <Button
            variant="primary"
            busy={compareBusy}
            onClick={onCompareOther}
            title={`Runs ${STRATEGIES[other].label} on the same scenario and seed, then opens the comparison.`}
          >
            {compareBusy ? "Preparing comparison…" : `Compare with ${STRATEGIES[other].label}`}
          </Button>
          <ButtonLink href={`${base}${exportJsonUrl(run.run_id)}`} download>
            Export JSON
          </ButtonLink>
          <ButtonLink href={`${base}${exportCsvUrl(run.run_id)}`} download>
            Export CSV
          </ButtonLink>
        </>
      }
    />
  );
}

import { Badge } from "../../components/ui/Badge";
import { TableWrap } from "../../components/ui/TableWrap";
import type { RunSummary, ScenarioSummary } from "../../lib/api/types";
import { formatDateTime, formatPercent, shortId } from "../../lib/format";
import { runStatusInfo, strategyLabel } from "../../lib/labels";
import { href } from "../../lib/router";

type Props = { runs: RunSummary[]; scenarios: ScenarioSummary[] };

export function PastRunsTable({ runs, scenarios }: Props) {
  const names = new Map(scenarios.map((scenario) => [scenario.id, scenario.name]));
  return (
    <TableWrap label="Recent runs">
      <thead>
        <tr>
          <th scope="col">Run</th>
          <th scope="col">Scenario</th>
          <th scope="col">Strategy</th>
          <th scope="col">Status</th>
          <th scope="col" data-numeric>
            Coverage
          </th>
          <th scope="col" data-numeric>
            Unmet
          </th>
          <th scope="col">Started</th>
        </tr>
      </thead>
      <tbody>
        {runs.slice(0, 12).map((run) => {
          const status = runStatusInfo(run.status);
          return (
            <tr key={run.run_id}>
              <th scope="row">
                <a href={href({ name: "run", id: run.run_id })}>{shortId(run.run_id)}</a>
              </th>
              <td>{names.get(run.scenario_id) ?? run.scenario_id}</td>
              <td>{strategyLabel(run.strategy)}</td>
              <td>
                <Badge tone={status.tone}>{status.label}</Badge>
              </td>
              <td data-numeric>{formatPercent(run.metrics.incident_coverage_rate)}</td>
              <td data-numeric>{run.metrics.unmet_demand_total}</td>
              <td>{formatDateTime(run.created_at)}</td>
            </tr>
          );
        })}
      </tbody>
    </TableWrap>
  );
}

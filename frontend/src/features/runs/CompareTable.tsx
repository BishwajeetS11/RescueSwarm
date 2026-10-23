import { Badge } from "../../components/ui/Badge";
import { HelpTip } from "../../components/ui/HelpTip";
import { Notice } from "../../components/ui/Notice";
import { TableWrap } from "../../components/ui/TableWrap";
import type { Comparability, RunDetail } from "../../lib/api/types";
import { buildComparisonRows, comparisonCaveats, medicalRecipients, type Verdict } from "../../lib/compare";
import { describeDifference, strategyLabel, type Tone } from "../../lib/labels";
import styles from "./runs.module.css";

type Props = { a: RunDetail; b: RunDetail; comparability: Comparability };

const VERDICT: Record<Verdict, { label: string; tone: Tone }> = {
  same: { label: "Same", tone: "neutral" },
  better: { label: "B is better", tone: "success" },
  worse: { label: "B is worse", tone: "danger" },
  differs: { label: "Differs", tone: "info" },
  na: { label: "Not comparable", tone: "neutral" },
};

export function CompareTable({ a, b, comparability }: Props) {
  const rows = buildComparisonRows(a, b);
  const unexpected = comparability.differences.filter((code) => code !== "strategy");
  const caveats = comparisonCaveats(a, b);
  const recipientsA = medicalRecipients(a);
  const recipientsB = medicalRecipients(b);
  const allSame = rows.every((row) => row.verdict === "same");

  return (
    <div className={styles.compare}>
      {unexpected.length === 0 && caveats.length === 0 ? (
        <Notice tone="success" title="Controlled comparison">
          Same scenario content and seed. {comparability.differences.includes("strategy")
            ? "Only the planning strategy differs."
            : "Both runs use the same strategy."}
        </Notice>
      ) : (
        <Notice tone="warning" title="Not a controlled comparison">
          <ul className={styles.plainList}>
            {unexpected.map((code) => (
              <li key={code}>{describeDifference(code)}</li>
            ))}
            {caveats.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </Notice>
      )}

      <TableWrap label="Run comparison">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col" data-numeric>
              A · {strategyLabel(a.strategy)}
            </th>
            <th scope="col" data-numeric>
              B · {strategyLabel(b.strategy)}
            </th>
            <th scope="col">B vs A</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const verdict = VERDICT[row.verdict];
            return (
              <tr key={row.key}>
                <th scope="row">
                  <span className={styles.metricName}>
                    {row.label} <HelpTip label={row.label} text={`${row.help} Unit: ${row.unit}.`} />
                  </span>
                </th>
                <td data-numeric>{row.a}</td>
                <td data-numeric>{row.b}</td>
                <td>
                  <Badge tone={verdict.tone}>{verdict.label}</Badge>
                </td>
              </tr>
            );
          })}
          <tr>
            <th scope="row">Incidents given a medical unit</th>
            <td>{recipientsA.join(", ") || "none"}</td>
            <td>{recipientsB.join(", ") || "none"}</td>
            <td>
              <Badge tone={recipientsA.join() === recipientsB.join() ? "neutral" : "info"}>
                {recipientsA.join() === recipientsB.join() ? "Same" : "Differs"}
              </Badge>
            </td>
          </tr>
        </tbody>
      </TableWrap>

      {allSame && recipientsA.join() !== recipientsB.join() ? (
        <Notice tone="info" title="Equal totals, different choices">
          Both runs reached the same totals, but they sent medical units to different incidents. Totals alone can hide
          which incidents were prioritized.
        </Notice>
      ) : null}
      <p className={styles.muted}>
        One synthetic scenario is an illustration, not statistical evidence. “Better” means lower or higher on that
        metric only; it is not a judgement about real emergency response.
      </p>
    </div>
  );
}

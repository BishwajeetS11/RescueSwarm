import { Button } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import type { DisruptionRequest, RunDetail } from "../../lib/api/types";
import { describeEdge, describeRoute } from "../../lib/graph";
import { runStatusInfo, type Tone } from "../../lib/labels";
import { summarizeRunChange } from "../../lib/runDiff";
import styles from "./runs.module.css";

type Props = {
  request: DisruptionRequest;
  before: RunDetail;
  after: RunDetail;
  onDismiss: () => void;
  onUndo?: (() => void) | undefined;
};

function title(request: DisruptionRequest, after: RunDetail): string {
  const nodes = after.scenario.nodes;
  if (request.type === "reduce_shelter_capacity") {
    return `Shelter ${request.shelter_id} reduced to ${request.new_capacity} seats`;
  }
  const edge = after.state.edges.find((item) => item.id === request.edge_id);
  const road = edge ? describeEdge(nodes, edge) : request.edge_id;
  return request.type === "close_edge" ? `Closed road ${road}` : `Reopened road ${road}`;
}

function delta(before: number, after: number): string {
  if (after === before) return "no change";
  return after > before ? `▲ up by ${after - before}` : `▼ down by ${before - after}`;
}

export function ChangeSummary({ request, before, after, onDismiss, onUndo }: Props) {
  const change = summarizeRunChange(before, after);
  const nodes = after.scenario.nodes;
  const status = runStatusInfo(change.statusAfter);
  const tone: Exclude<Tone, "neutral"> = status.tone === "neutral" ? "info" : status.tone;

  return (
    <Notice
      tone={tone}
      title={`${title(request, after)} · plan ${status.label.toLowerCase()}`}
      onDismiss={onDismiss}
      action={
        onUndo ? (
          <Button size="sm" onClick={onUndo}>
            Undo: reopen this road
          </Button>
        ) : undefined
      }
    >
      <div className={styles.change}>
        <p>What changed after replanning:</p>
        <ul>
          {change.routeChanges.length === 0 ? (
            <li>No assignment routes changed.</li>
          ) : (
            change.routeChanges.map((item) => (
              <li key={`${item.kind}-${item.incidentId}-${item.before?.join(">") ?? "x"}-${item.after?.join(">") ?? "x"}`}>
                <strong>{item.incidentId}</strong> ({item.kind === "medical" ? "medical route" : "kit route"})
                <span className={styles.routeLine}>
                  <span className={styles.routeTag}>Was</span> {item.before ? describeRoute(nodes, item.before) : "not assigned"}
                </span>
                <span className={styles.routeLine}>
                  <span className={styles.routeTag}>Now</span> {item.after ? describeRoute(nodes, item.after) : "no route available"}
                </span>
              </li>
            ))
          )}
          <li>
            Assignments: {change.assignmentsBefore} → {change.assignmentsAfter}
          </li>
          <li>
            Unmet demand: {change.unmetBefore} → {change.unmetAfter} ({delta(change.unmetBefore, change.unmetAfter)})
          </li>
        </ul>
      </div>
    </Notice>
  );
}

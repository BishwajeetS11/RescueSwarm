import { useId, useMemo, useState } from "react";

import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/Status";
import type { RunEvent, ScenarioEdge, ScenarioNode } from "../../lib/api/types";
import { describeEvent } from "../../lib/events";
import { formatDateTime } from "../../lib/format";
import { actorLabel, eventStatusInfo, EVENT_STATUS_ORDER } from "../../lib/labels";
import styles from "./runs.module.css";

type Props = { events: RunEvent[]; nodes: ScenarioNode[]; edges?: ScenarioEdge[] };

const MILESTONES = new Set(["disruption_applied", "replan_started", "replan_completed"]);

export function EventTimeline({ events, nodes, edges = [] }: Props) {
  const [actor, setActor] = useState("all");
  const [status, setStatus] = useState("all");
  const actorId = useId();

  const actors = useMemo(() => [...new Set(events.map((event) => event.actor))].sort(), [events]);
  const presentStatuses = useMemo(
    () => EVENT_STATUS_ORDER.filter((value) => events.some((event) => event.status === value)),
    [events],
  );
  const visible = events.filter(
    (event) => (actor === "all" || event.actor === actor) && (status === "all" || event.status === status),
  );

  if (events.length === 0) {
    return <EmptyState title="No events recorded" message="Events appear here once a run has started." />;
  }

  return (
    <div className={styles.timeline}>
      <div className={styles.filters}>
        <div className={styles.filterField}>
          <label htmlFor={actorId}>Agent</label>
          <select id={actorId} value={actor} onChange={(event) => setActor(event.target.value)}>
            <option value="all">All agents</option>
            {actors.map((value) => (
              <option key={value} value={value}>
                {actorLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.chips} role="group" aria-label="Filter by outcome">
          <button
            type="button"
            className={`${styles.chip} ${status === "all" ? styles.chipOn : ""}`}
            aria-pressed={status === "all"}
            onClick={() => setStatus("all")}
          >
            All outcomes
          </button>
          {presentStatuses.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.chip} ${status === value ? styles.chipOn : ""}`}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {eventStatusInfo(value).label}
            </button>
          ))}
        </div>
        <p className={styles.count} aria-live="polite">
          Showing {visible.length} of {events.length} events
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No events match these filters"
          message="Try another agent or outcome."
          action={
            <Button
              size="sm"
              onClick={() => {
                setActor("all");
                setStatus("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <ol className={styles.events}>
          {visible.map((event) => {
            const info = eventStatusInfo(event.status);
            const milestone = MILESTONES.has(event.event_type);
            return (
              <li key={event.event_id} className={`${styles.event} ${milestone ? styles.milestone : ""}`}>
                <span className={styles.seq} aria-label={`Event ${event.sequence}`}>
                  {event.sequence}
                </span>
                <div className={styles.eventBody}>
                  <p className={styles.eventText}>{describeEvent(event, nodes, edges)}</p>
                  <p className={styles.eventMeta}>
                    <span className={styles.actor}>{actorLabel(event.actor)}</span>
                    <span>{event.event_type.replaceAll("_", " ")}</span>
                    {event.reason_codes.length > 0 ? <span>Reason: {event.reason_codes.join(", ")}</span> : null}
                    <time dateTime={event.timestamp}>{formatDateTime(event.timestamp)}</time>
                  </p>
                  <details className={styles.raw}>
                    <summary>Technical details</summary>
                    <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                  </details>
                </div>
                <Badge tone={info.tone}>{info.label}</Badge>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

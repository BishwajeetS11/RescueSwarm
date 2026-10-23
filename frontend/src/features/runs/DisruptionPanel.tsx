import { useEffect, useState } from "react";

import { Button } from "../../components/ui/Button";
import { Field, Segmented } from "../../components/ui/Field";
import { Notice } from "../../components/ui/Notice";
import type { DisruptionRequest, RunDetail } from "../../lib/api/types";
import { describeEdge, routesUsingEdge } from "../../lib/graph";
import styles from "./runs.module.css";

type Mode = "close" | "open" | "shelter";

type Props = {
  run: RunDetail;
  busy: boolean;
  selectedEdgeId: string | null;
  onSelectEdge: (edgeId: string) => void;
  onApply: (request: DisruptionRequest) => void;
};

export function validateShelterCapacity(raw: string, used: number, capacity: number): string | null {
  if (raw.trim() === "") return "Enter the new capacity.";
  const value = Number(raw);
  if (!Number.isInteger(value)) return "Use a whole number of seats.";
  if (value < used) return `Cannot go below the ${used} seats already in use. Sheltered people are not removed.`;
  if (value >= capacity) return `Must be lower than the current capacity of ${capacity}.`;
  return null;
}

export function DisruptionPanel({ run, busy, selectedEdgeId, onSelectEdge, onApply }: Props) {
  const nodes = run.scenario.nodes;
  const [mode, setMode] = useState<Mode>("close");
  const [shelterId, setShelterId] = useState(run.state.shelters.find((shelter) => shelter.enabled)?.id ?? "");
  const [capacity, setCapacity] = useState("");
  const [touched, setTouched] = useState(false);

  const openEdges = run.state.edges.filter((edge) => edge.available);
  const closedEdges = run.state.edges.filter((edge) => !edge.available);
  const candidates = mode === "close" ? openEdges : closedEdges;
  const edge = candidates.find((item) => item.id === selectedEdgeId) ?? candidates[0];
  const shelter = run.state.shelters.find((item) => item.id === shelterId);

  // Choosing a road on the map switches to the matching action (close an open road, reopen a closed one).
  // Runs only when the selection changes, so a disruption result does not flip the mode by itself.
  useEffect(() => {
    if (!selectedEdgeId) return;
    const picked = run.state.edges.find((item) => item.id === selectedEdgeId);
    if (picked) setMode(picked.available ? "close" : "open");
  }, [selectedEdgeId]);

  const capacityError =
    mode === "shelter" && shelter && touched ? validateShelterCapacity(capacity, shelter.used_capacity, shelter.capacity) : null;

  const usage = mode === "close" && edge ? routesUsingEdge(run, edge) : null;
  const affectedRoutes = usage
    ? [
        ...usage.medical.map((item) => `${item.unitId} → ${item.incidentId}`),
        ...usage.supply.map((item) => `kits ${item.stockId} → ${item.incidentId}`),
      ]
    : [];
  const affected = affectedRoutes.length;

  const submit = () => {
    if (mode === "shelter") {
      setTouched(true);
      if (!shelter || validateShelterCapacity(capacity, shelter.used_capacity, shelter.capacity) !== null) return;
      onApply({
        type: "reduce_shelter_capacity",
        shelter_id: shelter.id,
        new_capacity: Number(capacity),
        reason: "simulated capacity reduction",
      });
      return;
    }
    if (!edge) return;
    onApply({
      type: mode === "close" ? "close_edge" : "open_edge",
      edge_id: edge.id,
      reason: mode === "close" ? "simulated road closure" : "simulated road reopening",
    });
  };

  const noTarget = mode !== "shelter" && !edge;

  return (
    <form
      className={styles.disruption}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      noValidate
    >
      <Segmented
        legend="Type of disruption"
        name="disruption-mode"
        value={mode}
        onChange={(value) => {
          setMode(value);
          setTouched(false);
        }}
        options={[
          { value: "close", label: "Close road" },
          { value: "open", label: "Reopen road" },
          { value: "shelter", label: "Cut shelter" },
        ]}
      />

      {mode !== "shelter" ? (
        <>
          <Field
            label={mode === "close" ? "Road to close" : "Road to reopen"}
            hint="You can also click a road on the map."
          >
            {(props) => (
              <select
                {...props}
                value={edge?.id ?? ""}
                disabled={busy || candidates.length === 0}
                onChange={(event) => onSelectEdge(event.target.value)}
              >
                {candidates.length === 0 ? (
                  <option value="">{mode === "close" ? "No open roads" : "No closed roads"}</option>
                ) : null}
                {candidates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {describeEdge(nodes, item)} · cost {item.cost}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {mode === "close" && edge ? (
            affected > 0 ? (
              <Notice tone="warning" title={`Used by ${affected} committed ${affected === 1 ? "route" : "routes"}`}>
                {affectedRoutes.join(", ")}. Closing this road makes the planner recompute them.
              </Notice>
            ) : (
              <p className={styles.hintText}>
                No committed route uses this road. The planner still re-checks the whole plan, so this counts as a
                replan.
              </p>
            )
          ) : null}
          {mode === "open" && !edge ? <p className={styles.hintText}>No road is closed yet. Close one first.</p> : null}
        </>
      ) : (
        <>
          <Field label="Shelter">
            {(props) => (
              <select
                {...props}
                value={shelterId}
                disabled={busy || run.state.shelters.length === 0}
                onChange={(event) => {
                  setShelterId(event.target.value);
                  setTouched(false);
                }}
              >
                {run.state.shelters.length === 0 ? <option value="">No shelters</option> : null}
                {run.state.shelters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} · {item.used_capacity} of {item.capacity} seats used
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label="New capacity (seats)"
            hint={shelter ? `Between ${shelter.used_capacity} (in use) and ${shelter.capacity - 1}.` : undefined}
            error={capacityError}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                inputMode="numeric"
                step={1}
                value={capacity}
                disabled={busy || !shelter}
                onChange={(event) => {
                  setCapacity(event.target.value);
                  setTouched(true);
                }}
              />
            )}
          </Field>
        </>
      )}

      <Button
        type="submit"
        variant={mode === "close" ? "danger" : "primary"}
        busy={busy}
        disabled={noTarget || (mode === "shelter" && !shelter)}
      >
        {busy
          ? "Replanning…"
          : mode === "close"
            ? "Close road and replan"
            : mode === "open"
              ? "Reopen road and replan"
              : "Reduce capacity and replan"}
      </Button>
    </form>
  );
}

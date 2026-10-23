import { useState } from "react";

import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Notice } from "../../components/ui/Notice";
import type { ParseTextResponse } from "../../lib/api/types";
import { previewDraft } from "../../lib/draft";
import { pluralize } from "../../lib/format";
import { IncidentTable } from "./IncidentTable";
import styles from "./scenarios.module.css";

type Props = {
  result: ParseTextResponse;
  draftText: string;
  onDraftTextChange: (value: string) => void;
  saving: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
};

function readJson(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Human-readable review of an untrusted draft before the user confirms it. */
export function DraftReview({ result, draftText, onDraftTextChange, saving, onConfirm, onDiscard }: Props) {
  const [showJson, setShowJson] = useState(false);
  const parsed = readJson(draftText);
  const preview = parsed ? previewDraft(parsed) : null;

  return (
    <div className={styles.launcher}>
      <div className={styles.cardTop}>
        <Badge tone="info" glyph={false}>
          Parser: {result.parser_mode}
        </Badge>
        <Badge tone="warning">Needs your review</Badge>
        {result.fallback_used ? <Badge tone="warning">Fallback template used</Badge> : null}
      </div>

      {result.warnings.map((warning) => (
        <Notice key={warning} tone="warning">
          {warning}
        </Notice>
      ))}
      {result.missing_fields.length > 0 ? (
        <Notice tone="warning" title="Missing fields">
          {result.missing_fields.join(", ")}
        </Notice>
      ) : null}

      {preview ? (
        <>
          <div>
            <h3>{preview.name}</h3>
            {preview.description ? <p className={styles.muted}>{preview.description}</p> : null}
            <p className={styles.muted}>
              {pluralize(preview.counts.nodes, "place")} · {pluralize(preview.counts.edges, "road")} ·{" "}
              {pluralize(preview.counts.incidents, "incident")} · {pluralize(preview.counts.units, "medical unit")} ·{" "}
              {pluralize(preview.counts.shelters, "shelter")} · {pluralize(preview.counts.stocks, "kit depot")}
            </p>
          </div>
          <IncidentTable incidents={preview.incidents} nodes={preview.nodes} />
        </>
      ) : (
        <Notice tone="danger" title="Draft JSON is not valid">
          Fix the JSON below or discard the draft. Nothing is saved until the backend validates it.
        </Notice>
      )}

      <details open={showJson} onToggle={(event) => setShowJson(event.currentTarget.open)}>
        <summary>Advanced: edit the draft JSON</summary>
        <Field label="Draft JSON" hint="The backend validates this again on save.">
          {(props) => (
            <textarea
              {...props}
              spellCheck={false}
              rows={12}
              value={draftText}
              onChange={(event) => onDraftTextChange(event.target.value)}
            />
          )}
        </Field>
      </details>

      <div className={styles.cardTop}>
        <Button variant="primary" busy={saving} disabled={!parsed} onClick={onConfirm}>
          {saving ? "Saving…" : "Confirm and save scenario"}
        </Button>
        <Button variant="ghost" onClick={onDiscard} disabled={saving}>
          Discard draft
        </Button>
      </div>
    </div>
  );
}

import { Badge } from "../../components/ui/Badge";
import { DISCLAIMER_TEXT } from "../../components/SimulationDisclaimer";
import styles from "./runs.module.css";

type Props = { explanation: string | null; source: string };

/** The always-visible banner carries the disclaimer, so it is not repeated inside the summary. */
export function stripDisclaimer(text: string): string {
  return text.replace(DISCLAIMER_TEXT, "").trim();
}

export function ExplanationCard({ explanation, source }: Props) {
  if (!explanation) {
    return <p className={styles.muted}>No explanation was generated for this run.</p>;
  }
  const isTemplate = source !== "llm";
  return (
    <div className={styles.explanation}>
      <p>{stripDisclaimer(explanation)}</p>
      <p>
        <Badge tone="neutral" glyph={false}>
          Source: {isTemplate ? "template (no model call)" : source}
        </Badge>{" "}
        <span className={styles.muted}>
          Written from the committed plan and metrics; it cannot change them.
        </span>
      </p>
    </div>
  );
}

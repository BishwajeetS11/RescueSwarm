import type { Tone } from "../../lib/labels";
import { Badge } from "./Badge";
import { HelpTip } from "./HelpTip";
import styles from "./MetricCard.module.css";

type Props = {
  label: string;
  value: string;
  unit: string;
  help: string;
  /** Context line, e.g. "2 of 3 units". */
  detail?: string;
  /** 0..1 fill for rate metrics. Hidden from assistive tech: the value is already text. */
  fill?: number | null;
  statusLabel?: string;
  tone?: Tone;
};

export function MetricCard({ label, value, unit, help, detail, fill, statusLabel, tone = "neutral" }: Props) {
  return (
    <article className={styles.card} aria-label={`${label}: ${value}`}>
      <header className={styles.header}>
        <h3 className={styles.label}>{label}</h3>
        <HelpTip label={label} text={`${help} Unit: ${unit}.`} />
      </header>
      <p className={styles.value}>{value}</p>
      {fill !== undefined && fill !== null ? (
        <div className={`${styles.track} ${styles[tone]}`} aria-hidden="true">
          <div className={styles.fill} style={{ width: `${Math.round(Math.min(1, Math.max(0, fill)) * 100)}%` }} />
        </div>
      ) : null}
      <footer className={styles.footer}>
        <span className={styles.detail}>{detail ?? unit}</span>
        {statusLabel ? <Badge tone={tone}>{statusLabel}</Badge> : null}
      </footer>
    </article>
  );
}

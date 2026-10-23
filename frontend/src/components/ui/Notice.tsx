import type { ReactNode } from "react";

import type { Tone } from "../../lib/labels";
import { Button } from "./Button";
import styles from "./Notice.module.css";

type Props = {
  tone: Exclude<Tone, "neutral">;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
  action?: ReactNode;
};

/** Inline feedback placed next to the control that caused it. Errors use role=alert. */
export function Notice({ tone, title, children, onDismiss, action }: Props) {
  const urgent = tone === "danger" || tone === "warning";
  return (
    <div className={`${styles.notice} ${styles[tone]}`} role={urgent ? "alert" : "status"}>
      <div className={styles.content}>
        {title ? <strong className={styles.title}>{title}</strong> : null}
        <div>{children}</div>
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
      {onDismiss ? (
        <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss message">
          Dismiss
        </Button>
      ) : null}
    </div>
  );
}

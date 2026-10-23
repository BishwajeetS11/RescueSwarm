import type { ReactNode } from "react";

import styles from "./Status.module.css";

type Props = { title: string; message: string; action?: ReactNode };

/** Skeleton placeholder with a polite status message while data loads. */
export function LoadingState({ title, message }: Props) {
  return (
    <div className={styles.state} role="status" aria-live="polite">
      <div className={styles.skeleton} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>
        <strong>{title}:</strong> {message}
      </p>
    </div>
  );
}

/** Explains why nothing is shown and what the user can do next. */
export function EmptyState({ title, message, action }: Props) {
  return (
    <div className={`${styles.state} ${styles.empty}`}>
      <span className={styles.icon} aria-hidden="true">
        ○
      </span>
      <p>
        <strong>{title}.</strong> {message}
      </p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

/** Announced immediately; always offers a way forward when an action is supplied. */
export function ErrorState({ title, message, action }: Props) {
  return (
    <div className={`${styles.state} ${styles.error}`} role="alert">
      <span className={styles.icon} aria-hidden="true">
        ✕
      </span>
      <p>
        <strong>{title}:</strong> {message}
      </p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

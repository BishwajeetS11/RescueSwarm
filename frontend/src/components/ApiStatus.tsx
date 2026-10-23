import styles from "./ApiStatus.module.css";

export type ApiStatusState =
  | { kind: "loading" }
  | { kind: "ok"; service: string }
  | { kind: "error"; message: string };

type ApiStatusProps = {
  state: ApiStatusState;
};

export function ApiStatus({ state }: ApiStatusProps) {
  if (state.kind === "loading") {
    return (
      <p className={`${styles.status} ${styles.loading}`} aria-live="polite">
        <span className={styles.glyph} aria-hidden="true">
          …
        </span>
        <span className={styles.mark}>API:</span> Checking backend health…
      </p>
    );
  }

  if (state.kind === "ok") {
    return (
      <p className={`${styles.status} ${styles.ok}`} aria-live="polite">
        <span className={styles.glyph} aria-hidden="true">
          ✓
        </span>
        <span className={styles.mark}>API:</span> {state.service} is reachable
      </p>
    );
  }

  return (
    <p className={`${styles.status} ${styles.error}`} role="status">
      <span className={styles.glyph} aria-hidden="true">
        !
      </span>
      <span className={styles.mark}>API:</span> {state.message} Start the backend on 127.0.0.1:8000 to connect.
      Saved pages stay visible but actions need the backend.
    </p>
  );
}

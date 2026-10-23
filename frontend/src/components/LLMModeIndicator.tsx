import styles from "./LLMModeIndicator.module.css";

type LLMModeIndicatorProps = {
  mode: string;
};

export function LLMModeIndicator({ mode }: LLMModeIndicatorProps) {
  return (
    <span
      className={styles.badge}
      aria-label={`Language model mode ${mode}`}
      title={
        mode === "mock"
          ? "Offline mock mode: no API key or network model is used. All planning is deterministic."
          : "A language model drafts text and explanations. Planning stays deterministic."
      }
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>LLM mode</span>
      <span className={styles.value}>{mode}</span>
    </span>
  );
}

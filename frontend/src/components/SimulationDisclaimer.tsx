import styles from "./SimulationDisclaimer.module.css";

export const DISCLAIMER_TEXT =
  "RescueSwarm is an educational simulation using synthetic data. It does not contact emergency services and must not be used to make real emergency-response decisions.";

export function SimulationDisclaimer() {
  return (
    <aside className={styles.banner} role="note" aria-label="Simulation disclaimer">
      <span className={styles.label}>Simulation only</span>
      <p className={styles.text}>{DISCLAIMER_TEXT}</p>
    </aside>
  );
}

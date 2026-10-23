import styles from "./Stepper.module.css";

export type Step = {
  id: string;
  label: string;
  hint?: string;
  state: "done" | "current" | "upcoming";
  onSelect?: () => void;
};

type Props = { steps: Step[]; label: string };

/** Shows where the user is in the workflow (visibility of system status). */
export function Stepper({ steps, label }: Props) {
  return (
    <nav aria-label={label}>
      <ol className={styles.list}>
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`${styles.item} ${styles[step.state]}`}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            <span className={styles.marker} aria-hidden="true">
              {step.state === "done" ? "✓" : index + 1}
            </span>
            <span className={styles.text}>
              {step.onSelect ? (
                <button type="button" className={styles.link} onClick={step.onSelect}>
                  {step.label}
                </button>
              ) : (
                <span className={styles.name}>{step.label}</span>
              )}
              {step.hint ? <span className={styles.hint}>{step.hint}</span> : null}
              <span className="visually-hidden">
                {step.state === "done" ? " (done)" : step.state === "current" ? " (current step)" : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

import { useId, type ReactNode } from "react";

import styles from "./Panel.module.css";

type Props = {
  title: string;
  /** Short helper text under the title (progressive disclosure for detail). */
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
  tone?: "default" | "highlight";
  headingLevel?: 2 | 3;
};

export function Panel({ title, description, actions, children, id, tone = "default", headingLevel = 2 }: Props) {
  const headingId = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section id={id} className={`${styles.panel} ${tone === "highlight" ? styles.highlight : ""}`} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div>
          <Heading id={headingId} className={styles.title}>
            {title}
          </Heading>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

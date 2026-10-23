import { useId } from "react";

import styles from "./HelpTip.module.css";

type Props = { label: string; text: string };

/** A keyboard-focusable "?" that reveals a definition on hover or focus. */
export function HelpTip({ label, text }: Props) {
  const id = useId();
  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.trigger} aria-label={`What is ${label}?`} aria-describedby={id}>
        ?
      </button>
      <span role="tooltip" id={id} className={styles.tip}>
        {text}
      </span>
    </span>
  );
}

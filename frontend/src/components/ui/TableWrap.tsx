import type { ReactNode } from "react";

import styles from "./TableWrap.module.css";

type Props = { children: ReactNode; label: string };

/** Scrolls tables horizontally on narrow screens instead of breaking the layout. */
export function TableWrap({ children, label }: Props) {
  return (
    <div className={styles.wrap} role="region" aria-label={label} tabIndex={0}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}

import type { ReactNode } from "react";

import type { Tone } from "../../lib/labels";
import styles from "./Badge.module.css";

const GLYPHS: Record<Tone, string> = {
  neutral: "•",
  success: "✓",
  warning: "!",
  danger: "✕",
  info: "i",
};

type Props = {
  tone?: Tone;
  children: ReactNode;
  /** Pass false for purely informational chips that need no status glyph. */
  glyph?: boolean;
  title?: string;
};

/** Status is always conveyed by a glyph and text, never by color alone. */
export function Badge({ tone = "neutral", children, glyph = true, title }: Props) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`} title={title}>
      {glyph ? (
        <span className={styles.glyph} aria-hidden="true">
          {GLYPHS[tone]}
        </span>
      ) : null}
      {children}
    </span>
  );
}

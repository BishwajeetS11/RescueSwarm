import { useId, type ReactNode } from "react";

import styles from "./Field.module.css";

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FieldProps = {
  label: string;
  hint?: string;
  error?: string | null;
  children: (props: ControlProps) => ReactNode;
};

/** Label, hint and error are wired to the control so errors are announced and recognizable. */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(error ? { "aria-invalid": true as const } : {}),
      })}
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error}>
          <span aria-hidden="true">✕ </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type Option<T extends string> = { value: T; title: string; description: string };

type RadioCardsProps<T extends string> = {
  legend: string;
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
};

/** Native radios styled as selectable cards: recognition over recall, full keyboard support. */
export function RadioCards<T extends string>({ legend, name, value, options, onChange, disabled }: RadioCardsProps<T>) {
  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend className={styles.label}>{legend}</legend>
      <div className={styles.cards}>
        {options.map((option) => (
          <label key={option.value} className={`${styles.card} ${option.value === value ? styles.selected : ""}`}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className={styles.radio}
            />
            <span className={styles.cardTitle}>
              <span className={styles.mark} aria-hidden="true">
                {option.value === value ? "●" : "○"}
              </span>
              {option.title}
            </span>
            <span className={styles.cardText}>{option.description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type SegmentedProps<T extends string> = {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
};

/** Compact mode switch built from radios. */
export function Segmented<T extends string>({ legend, name, value, options, onChange }: SegmentedProps<T>) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className="visually-hidden">{legend}</legend>
      <div className={styles.segmented}>
        {options.map((option) => (
          <label key={option.value} className={`${styles.segment} ${option.value === value ? styles.segmentOn : ""}`}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className={styles.radio}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

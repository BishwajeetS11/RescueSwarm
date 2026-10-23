import { useState } from "react";

import { Button } from "../../components/ui/Button";
import { Field, RadioCards } from "../../components/ui/Field";
import { STRATEGIES, type StrategyKey } from "../../lib/labels";
import styles from "./scenarios.module.css";

type Props = {
  busy: boolean;
  onRun: (strategy: StrategyKey, seed: number) => void;
};

export function validateSeed(raw: string): string | null {
  if (raw.trim() === "") return "Enter a whole number, for example 42.";
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return "Use a whole number that is 0 or higher.";
  return null;
}

export function RunLauncher({ busy, onRun }: Props) {
  const [strategy, setStrategy] = useState<StrategyKey>("rescueswarm");
  const [seed, setSeed] = useState("42");
  const [touched, setTouched] = useState(false);
  const error = touched ? validateSeed(seed) : null;

  return (
    <form
      className={styles.launcher}
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (validateSeed(seed) === null) onRun(strategy, Number(seed));
      }}
      noValidate
    >
      <RadioCards
        legend="1. Choose a planning strategy"
        name="strategy"
        value={strategy}
        onChange={setStrategy}
        disabled={busy}
        options={(Object.keys(STRATEGIES) as StrategyKey[]).map((key) => ({
          value: key,
          title: STRATEGIES[key].label,
          description: STRATEGIES[key].description,
        }))}
      />
      <Field
        label="2. Seed"
        hint="Recorded with the run so it can be repeated. Planning itself is deterministic."
        error={error}
      >
        {(props) => (
          <input
            {...props}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={seed}
            disabled={busy}
            onChange={(event) => {
              setSeed(event.target.value);
              setTouched(true);
            }}
          />
        )}
      </Field>
      <Button type="submit" variant="primary" busy={busy} icon="▶">
        {busy ? "Running simulation…" : "Run simulation"}
      </Button>
    </form>
  );
}

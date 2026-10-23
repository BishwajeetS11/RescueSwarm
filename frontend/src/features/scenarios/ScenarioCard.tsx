import { Badge } from "../../components/ui/Badge";
import { ButtonLink } from "../../components/ui/Button";
import type { ScenarioSummary } from "../../lib/api/types";
import { scenarioFocus } from "../../lib/labels";
import { href } from "../../lib/router";
import styles from "./scenarios.module.css";

type Props = { scenario: ScenarioSummary };

export function ScenarioCard({ scenario }: Props) {
  const { focus, tone } = scenarioFocus(scenario.id);
  return (
    <article className={styles.card} aria-labelledby={`sc-${scenario.id}`}>
      <div className={styles.cardTop}>
        <Badge tone={tone} glyph={false}>
          {focus}
        </Badge>
        {!scenario.bundled ? <Badge tone="info" glyph={false}>Yours</Badge> : null}
      </div>
      <h3 id={`sc-${scenario.id}`} className={styles.cardTitle}>
        {scenario.name}
      </h3>
      <p className={styles.cardText}>{scenario.description}</p>
      <ul className={styles.facts} aria-label="Scenario size">
        <li>
          <strong>{scenario.incident_count}</strong> {scenario.incident_count === 1 ? "incident" : "incidents"}
        </li>
        <li>
          <strong>{scenario.node_count}</strong> places
        </li>
        <li>
          <strong>{scenario.medical_unit_count}</strong>{" "}
          {scenario.medical_unit_count === 1 ? "medical unit" : "medical units"}
        </li>
      </ul>
      <ButtonLink variant="secondary" href={href({ name: "scenario", id: scenario.id })} aria-label={`Open ${scenario.name}`}>
        Open scenario
      </ButtonLink>
    </article>
  );
}

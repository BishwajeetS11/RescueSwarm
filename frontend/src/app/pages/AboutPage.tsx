import { Badge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { METRIC_HELP } from "../../lib/labels";
import { usePageTitle } from "../../lib/usePageTitle";
import styles from "./pages.module.css";

const AGENTS = [
  { name: "Interpreter", role: "Turns a text description into a reviewable scenario draft.", llm: "Optional language model; mock by default" },
  { name: "Prioritizer", role: "Scores incidents from urgency, people affected, time sensitivity and access risk.", llm: "Deterministic" },
  { name: "Route planner", role: "Finds the cheapest open route on the road graph.", llm: "Deterministic" },
  { name: "Medical, shelter and supply allocators", role: "Propose assignments from available units, seats and kits.", llm: "Deterministic" },
  { name: "Constraint validator", role: "Rejects any proposal that breaks capacity, availability or route rules.", llm: "Deterministic" },
  { name: "Coordinator", role: "Commits approved actions, replans after disruptions and stops when nothing more can be done.", llm: "Deterministic" },
  { name: "Explanation", role: "Writes a plain-language summary from committed facts only.", llm: "Template; optional language model" },
];

const LIMITS = [
  "Synthetic data only. There is no real dispatch, location tracking, emergency calling or live feed.",
  "Road costs are abstract units, not travel time or distance.",
  "Results from a handful of small scenarios are illustrative, not statistical evidence.",
  "Baseline and RescueSwarm both replan after disruptions, so a comparison shows a planning-policy difference only.",
  "The language model never decides routes, capacity or reported metrics.",
];

export function AboutPage() {
  usePageTitle("About");
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="About"
        title="How RescueSwarm works"
        description="A teaching tool for multi-agent coordination under scarcity and disruption."
      />
      <Panel title="Agents and their jobs" description="Agents propose, the validator checks, and the coordinator commits.">
        <ul className={styles.agents}>
          {AGENTS.map((agent) => (
            <li key={agent.name}>
              <h3>{agent.name}</h3>
              <p>{agent.role}</p>
              <div>
                <Badge tone={agent.llm === "Deterministic" ? "success" : "info"} glyph={false}>
                  {agent.llm}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="What the metrics mean" description="The same definitions appear as ? help throughout the app.">
        <dl className={styles.glossary}>
          {Object.values(METRIC_HELP).map((metric) => (
            <div key={metric.label}>
              <dt>
                {metric.label} <span className={styles.placeholder}>({metric.unit})</span>
              </dt>
              <dd>{metric.help}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title="Limits to keep in mind">
        <ul className={styles.bullets}>
          {LIMITS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

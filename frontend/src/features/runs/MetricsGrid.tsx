import { MetricCard } from "../../components/ui/MetricCard";
import type { RunMetrics } from "../../lib/api/types";
import { formatNumber, formatPercent, pluralize } from "../../lib/format";
import { METRIC_HELP, type MetricKey, type Tone } from "../../lib/labels";
import styles from "./runs.module.css";

type Props = { metrics: RunMetrics };

function rateTone(rate: number | null): Tone {
  if (rate === null) return "neutral";
  return rate >= 1 ? "success" : "warning";
}

function rateStatus(rate: number | null): string | undefined {
  if (rate === null) return "No demand";
  return rate >= 1 ? "Full" : "Partial";
}

function RateCard({
  metric,
  rate,
  detail,
}: {
  metric: Extract<MetricKey, "incident_coverage_rate" | "medical_assignment_coverage" | "shelter_fulfillment_rate" | "kit_fulfillment_rate">;
  rate: number | null;
  detail: string;
}) {
  const info = METRIC_HELP[metric];
  const status = rateStatus(rate);
  return (
    <MetricCard
      label={info.label}
      value={formatPercent(rate)}
      unit={info.unit}
      help={info.help}
      detail={detail}
      fill={rate}
      tone={rateTone(rate)}
      {...(status ? { statusLabel: status } : {})}
    />
  );
}

export function MetricsGrid({ metrics }: Props) {
  const unmet = METRIC_HELP.unmet_demand_total;
  const cost = METRIC_HELP.mean_assigned_route_cost;
  const violations = METRIC_HELP.constraint_violation_count;
  const replans = METRIC_HELP.replan_count;
  const steps = METRIC_HELP.coordinator_steps;

  return (
    <div className={styles.metricGroups}>
      <section aria-labelledby="coverage-heading">
        <h3 id="coverage-heading" className={styles.groupTitle}>
          How much demand was served
        </h3>
        <div className={styles.metricGrid}>
          <RateCard
            metric="incident_coverage_rate"
            rate={metrics.incident_coverage_rate}
            detail={`${metrics.incidents_with_any_assignment} of ${pluralize(metrics.incidents_total, "incident")}`}
          />
          <RateCard
            metric="medical_assignment_coverage"
            rate={metrics.medical_assignment_coverage}
            detail={`${metrics.medical_units_used} of ${pluralize(metrics.medical_units_requested, "unit")}`}
          />
          <RateCard
            metric="shelter_fulfillment_rate"
            rate={metrics.shelter_fulfillment_rate}
            detail={`${metrics.shelter_demand_fulfilled} of ${metrics.shelter_demand_total} people`}
          />
          <RateCard
            metric="kit_fulfillment_rate"
            rate={metrics.kit_fulfillment_rate}
            detail={`${metrics.kits_delivered} of ${pluralize(metrics.kits_requested, "kit")}`}
          />
        </div>
      </section>
      <section aria-labelledby="quality-heading">
        <h3 id="quality-heading" className={styles.groupTitle}>
          Plan quality and process
        </h3>
        <div className={styles.metricGrid}>
          <MetricCard
            label={unmet.label}
            value={String(metrics.unmet_demand_total)}
            unit={unmet.unit}
            help={unmet.help}
            detail={`${metrics.unmet_medical} medical · ${metrics.unmet_shelter} seats · ${metrics.unmet_kits} kits`}
            tone={metrics.unmet_demand_total === 0 ? "success" : "warning"}
            statusLabel={metrics.unmet_demand_total === 0 ? "None" : "Shortfall"}
          />
          <MetricCard
            label={cost.label}
            value={formatNumber(metrics.mean_assigned_route_cost)}
            unit={cost.unit}
            help={cost.help}
            detail="Synthetic units · lower is cheaper"
          />
          <MetricCard
            label={violations.label}
            value={String(metrics.constraint_violation_count)}
            unit={violations.unit}
            help={violations.help}
            detail="Independent check of the final plan"
            tone={metrics.constraint_violation_count === 0 ? "success" : "danger"}
            statusLabel={metrics.constraint_violation_count === 0 ? "None found" : "Violation"}
          />
          <MetricCard
            label={replans.label}
            value={String(metrics.replan_count)}
            unit={replans.unit}
            help={replans.help}
            detail={metrics.replan_count === 0 ? "No disruption applied yet" : "After your disruptions"}
          />
          <MetricCard
            label={steps.label}
            value={String(metrics.coordinator_steps)}
            unit={steps.unit}
            help={steps.help}
            detail="Bounded planning loop"
          />
        </div>
      </section>
    </div>
  );
}

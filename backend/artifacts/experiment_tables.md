# Experiment tables (generated)

Algorithm version: `alloc-v1`. Metric schema: `metrics-v1`. Seed: 42. LLM mode: mock.
The recorded seed is part of the run identity; current allocators do not draw random numbers from it.

### Aggregate table

| Scenario family | Strategy | Runs / seeds | Coverage | Medical coverage | Mean route cost | Unmet demand | Constraint violations | Runtime (ms) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| E1 Balanced resources | baseline | 1 / 42 | 1.00 | 1.00 | 5.50 | 0 | 0 | 0.4 |
| E1 Balanced resources | rescueswarm | 1 / 42 | 1.00 | 1.00 | 5.50 | 0 | 0 | 1.0 |
| E2 Resource shortage | baseline | 1 / 42 | 1.00 | 0.33 | 2.25 | 2 | 0 | 0.5 |
| E2 Resource shortage | rescueswarm | 1 / 42 | 1.00 | 0.33 | 2.00 | 2 | 0 | 0.5 |
| E3 Route disruption | baseline | 1 / 42 | 1.00 | 1.00 | 2.50 | 0 | 0 | 0.2 |
| E3 Route disruption | rescueswarm | 1 / 42 | 1.00 | 1.00 | 2.50 | 0 | 0 | 0.3 |
| E4 Shelter shortage | baseline | 1 / 42 | 1.00 | 1.00 | 2.00 | 20 | 0 | 0.3 |
| E4 Shelter shortage | rescueswarm | 1 / 42 | 1.00 | 1.00 | 2.00 | 20 | 0 | 0.4 |
| E5 Supply shortage | baseline | 1 / 42 | 1.00 | 1.00 | 2.00 | 15 | 0 | 0.2 |
| E5 Supply shortage | rescueswarm | 1 / 42 | 1.00 | 1.00 | 2.00 | 15 | 0 | 0.2 |
| E6 Disconnected graph | baseline | 1 / 42 | 0.50 | 0.50 | 2.50 | 11 | 0 | 0.3 |
| E6 Disconnected graph | rescueswarm | 1 / 42 | 0.50 | 0.50 | 2.50 | 11 | 0 | 0.4 |
| E7 Scale variation | baseline | 1 / 42 | 1.00 | 0.38 | 3.64 | 29 | 0 | 1.7 |
| E7 Scale variation | rescueswarm | 1 / 42 | 1.00 | 0.38 | 4.18 | 29 | 0 | 1.9 |

### Disruption table

| Scenario | Strategy | Assignments invalidated | Assignments restored | Recovery rate | Replan steps | Final feasibility |
|---|---|---:|---:|---:|---:|---|
| Alternate routes / close e-cheap | baseline | 2 | 2 | 1.00 | 2 | completed |
| Alternate routes / close e-cheap | rescueswarm | 2 | 2 | 1.00 | 2 | completed |
| Balanced flood / reduce shelter to 18 | baseline | 0 | 0 | N/A | 2 | completed |
| Balanced flood / reduce shelter to 18 | rescueswarm | 0 | 0 | N/A | 2 | completed |

### Medical unit recipient (policy difference)

| Scenario | RescueSwarm incidents | Baseline incidents |
|---|---|---|
| scenario-balanced-1 | inc-a, inc-b | inc-a, inc-b |
| scenario-shortage-1 | inc-high | inc-low |
| scenario-routes-1 | inc-1 | inc-1 |
| scenario-shelter-1 | inc-a, inc-b | inc-a, inc-b |
| scenario-supply-1 | inc-1 | inc-1 |
| scenario-disconnected-1 | inc-reachable | inc-reachable |
| scenario-scale-1 | inc-03, inc-04, inc-05 | inc-00, inc-01, inc-02 |

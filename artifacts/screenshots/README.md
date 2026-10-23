# UI screenshots (2026-10-22, polished UI)

Authentic captures from http://127.0.0.1:5173 with the API at http://127.0.0.1:8000 in mock LLM mode, taken with headless Chrome at 1280 px wide (the mobile capture is 390 px wide). Runs shown were created during capture with seed 42 on `scenario-routes-1`; the recent-runs table on the gallery also lists earlier development runs.

| File | What it shows |
|---|---|
| `01-gallery.png` | Hero with the four-step flow, six bundled scenarios, recent runs, disclaimer, mock LLM badge, API status |
| `02-scenario-routes.png` | Alternate route network: run launcher, directed road map, incidents, resources |
| `03-run-completed.png` | Completed RescueSwarm run: progress stepper, disruption panel, plain-language summary, metric cards, incidents, event trace |
| `04-run-after-disruption.png` | Same scenario after closing `e-cheap` and replanning: replans 1, constraint violations 0, route via depot |
| `05-parse-review.png` | Mock parser draft with "Needs your review"; nothing is saved or run until confirmed |
| `06-about.png` | Educational-simulation description, agents, metric glossary, limits |
| `07-compare.png` | Baseline (A) vs RescueSwarm (B), same scenario and seed: controlled comparison with per-metric verdicts |
| `08-run-mobile-390.png` | Run page at 390 px wide (first 2400 px), single-column layout |

`report/` holds viewport-sized crops of the same pages (1280 px wide, up to 960 px tall; `04` is the results section of the disrupted run). `scripts/generate_ca3_submission.py` embeds these so figures fit a Word page and a slide without distortion.

# ✅ CA3 Artifacts Submission Checklist
> **F0003 CA2/CA3 · Agentic AI Course** | Total: **45 Marks**
> Use this as your team's pre-submission verification. Tick every item before hitting **Submit**.

---

## 📦 Section 1 — Required Submission Artifacts (Project Artifacts Page)

### 1. Project Synopsis
> *Feeds into: Section E — Documentation (5 marks)*

- [ ] Written as **2–3 paragraphs**
- [ ] Covers **the problem** being solved
- [ ] Covers **your solution** (multi-agent system)
- [ ] Covers **the target user**
- [ ] If scope changed from CA2 — **explicitly note what changed and why**
- [ ] Consistent with Design Document and what is actually deployed

---

### 2. Design Document
> *Feeds into: Section B — Design (8 marks)*

- [ ] **Architecture diagram** included showing:
  - [ ] Every agent (≥4) labelled with its role
  - [ ] Every connection between agents
  - [ ] Direction of data flow between agents
- [ ] **Each agent's role and responsibilities** described individually
- [ ] **Orchestration pattern** named (e.g., orchestrator-worker, peer-to-peer, blackboard) and **justified**
- [ ] **Technology/framework choices** listed with a brief justification for each
- [ ] Document matches what is actually deployed (consistency check!)

---

### 3. Input Definition
> *Feeds into: Section B — Design (8 marks)*

- [ ] Schema/format of what the system **accepts** is documented precisely
- [ ] At least **one real sample input** provided (not just a prose description)

---

### 4. Output Definition
> *Feeds into: Section B — Design (8 marks)*

- [ ] Schema/format of what the system **produces** is documented precisely
- [ ] At least **one real sample output** provided (not just a prose description)

---

### 5. GitHub Repository URL
> *Feeds into: Section F — Code Review (5 marks) + Section G — Individual Contributions (5 marks)*

- [ ] Repository URL submitted on the Project Artifacts page
- [ ] Repository is **public** OR `examstudio-bot` added as a collaborator
- [ ] **Every active team member's GitHub username** registered on the Project Artifacts page
- [ ] Repository has sensible **folder structure** (e.g., `agents/`, `tools/`, `lib/` separated)
- [ ] A **real `README.md`** is present and informative
- [ ] **`.gitignore` is present** and working — no secrets committed
- [ ] **No API keys / `.env` files** committed to the repo
- [ ] **Real automated tests** present (not empty placeholder files)
- [ ] **Commit messages are meaningful and incremental** — not one bulk upload

---

### 6. Project URL (Live Deployment)
> *Feeds into: Section C — Live Demo (6 marks)*

- [ ] A working deployment URL submitted
- [ ] The system is **live and reachable** ahead of demo day
- [ ] Deployment will remain **live until results are published**
- [ ] Handles bad/unexpected input **gracefully** (no hard crashes)
- [ ] Partial agent failures handled **gracefully**

---

### 7. Agent Execution Trace / Log
> *Feeds into: Section A — Multi-Agent Architecture & Agentic Design (8 marks)*

- [ ] This is a **real, captured run** — not a description of what would happen
- [ ] Shows **actual messages and handoffs between agents**
- [ ] Demonstrates **≥4 distinct agents** in operation
- [ ] Demonstrates **planning / reasoning** by at least one agent
- [ ] Demonstrates **tool use** by at least one agent
- [ ] Demonstrates **adaptation** — next step depends on what was just discovered
- [ ] Demonstrates **inter-agent coordination** — agents exchanging info, critiquing, or replanning
- [ ] **Not fabricated or edited** to misrepresent actual system behaviour (integrity violation)

---

### 8. Demo Video *(Optional but Recommended)*
> *Feeds into: Section C — Live Demo (supporting evidence only)*

- [ ] **2–3 minutes** in length
- [ ] Walkthrough of the working system
- [ ] Acts as **backup only** — does not replace the live demo requirement

---

## 🤖 Section 2 — Agent & Architecture Quality Checklist
> *Feeds into: Section A — 8 marks*

### Agent Count & Role Clarity (3 marks)
- [ ] **≥4 distinct AI agents** present in code and design
- [ ] Each agent has a **clearly separated responsibility**
- [ ] Agent roles are visible in **both** the design document and the actual code

### Genuine Agentic Behaviour (3 marks)
- [ ] Agents **plan** — they decide what to do next based on context
- [ ] Agents **reason** — LLM drives the decision, not a fixed rule
- [ ] Agents use **tools** (e.g., search, APIs, database queries)
- [ ] Agents **adapt** — behaviour changes based on previous output
- [ ] Agents can **handle failures** by re-planning, not just erroring out
- [ ] NOT a fixed pipeline where Step 2 always follows Step 1 regardless of output

### Inter-Agent Coordination (2 marks)
- [ ] Agents **exchange information** with each other
- [ ] Agents can **disagree, arbitrate, critique, or request revisions**
- [ ] Coordination is NOT just one-way data hand-off in a fixed order
- [ ] Evidence of coordination is visible in the **Execution Trace**

---

## 📋 Section 3 — Cross-Artifact Consistency Check
> *Evaluators will cross-check all of these against each other*

| Artifact A | Must Match | Artifact B |
|---|---|---|
| Design Document | ↔ | What is actually deployed |
| Input/Output Definitions | ↔ | Actual system behaviour |
| Execution Trace | ↔ | Repository code |
| Project Synopsis | ↔ | Design Document |
| Agent roles in diagram | ↔ | Agent roles in code |

- [ ] All artifacts describe **the same system**
- [ ] No contradictions between Synopsis, Design Doc, Execution Trace, and code

---

## 👤 Section 4 — Individual Contributions (Per Student — 5 marks)

Each team member should verify:

- [ ] **GitHub username registered** on the Project Artifacts page before first commit
- [ ] Commits spread across **multiple distinct days** (not a bulk dump at the end)
- [ ] **Meaningful commit messages** (not "fix", "update", "changes")
- [ ] **Pull Requests opened** where possible
- [ ] **PR reviews/comments** left on teammates' PRs
- [ ] Files you primarily worked on are committed **under your own GitHub login**
- [ ] Design/planning contributions flagged in the **presentation** if not visible in commits

> **Contribution Scorecard Weights:**
> | Metric | Weight |
> |---|---|
> | Total commits | 25% |
> | Active days | 25% |
> | Pull requests opened | 15% |
> | Reviews/comments | 15% |
> | Lines added/deleted | 10% |
> | Files primarily owned | 10% |

---

## 🎤 Section 5 — Presentation Readiness (8 marks, Manual)

- [ ] Every team member can explain **what the system does in plain language**
- [ ] Every team member can explain **why it needed multiple agents** (not just one)
- [ ] Every team member can **justify framework and orchestration choices**
- [ ] Every team member can **answer Q&A about their own specific contribution**
- [ ] Team can explain the **agent-vs-workflow distinction** and how your system qualifies

---

## 🚨 Final Pre-Submission Gate

- [ ] All 7 required artifacts submitted on the Project Artifacts page
- [ ] GitHub repository is accessible to evaluators
- [ ] Project URL is live and responding
- [ ] No secrets or `.env` files in the repository
- [ ] Execution Trace is a genuine capture (not fabricated)
- [ ] All team members' GitHub usernames are registered
- [ ] Cross-artifact consistency verified (all docs describe the same system)
- [ ] Demo video uploaded *(recommended)*

> [!CAUTION]
> Do NOT hit **Submit** until every item above is checked. You may save drafts and keep editing until the submission window closes — but once the Super Admin begins scoring, further artifact edits may not be reflected.

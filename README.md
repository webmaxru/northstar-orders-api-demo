# Northstar Orders API

> **Synthetic reference implementation.** Northstar Commerce, its incidents,
> metrics, and identifiers are fictional.

This repository implements the AI engineering system described in
[`docs/Developing-in-Agentic-AI-Systems-Learning-Paths.md`](docs/Developing-in-Agentic-AI-Systems-Learning-Paths.md).
The sample workload is a TypeScript/Fastify order API whose idempotency behavior
must remain correct across multiple stateless service instances.

The system follows **plan -> act -> evaluate** and the responsibility boundary
**agents propose; humans and policy accept**.

## What is implemented

- GitHub issues as task contracts with inputs, outputs, success criteria,
  validation expectations, rollout expectations, and stop conditions.
- A read-only planner, scoped implementer, dependency agent, security reviewer,
  and read-only risk reviewer.
- A machine-readable `northstar/plan/1` contract with deterministic
  low/medium/high/critical risk routing.
- Human approval bound to the task digest, plan digest, base SHA, and plan-only
  commit before high-risk implementation.
- Native Copilot lifecycle hooks for context resolution, pre-tool enforcement,
  payload-free audit records, and stop-time evidence checks.
- A fan-out/fan-in GitHub Actions evaluation workflow covering plan, scope,
  quality, build, PostgreSQL acceptance, dependencies, secrets, CodeQL, merge
  compatibility, governance, human review, and final evidence.
- A strict GitHub Agentic Workflow using read-only tools and staged safe
  outputs for a Daily Repository Status Report.
- Bounded repair, rollback, escalation, governance cadence, and lifecycle
  ownership.

## Quick start

```powershell
npm ci
npm run db:up
npm run validate
npm run test:acceptance
npm audit --audit-level=high
npm run security:secrets
npm run agentic:validate
```

Run the complete local reference scenario:

```powershell
npm run demo:system
```

The final local decision is `ready_for_review`. Only real GitHub workflow runs,
current human reviews, repository rules, and environment approvals can produce
`ready_for_acceptance`.

## Reference map

| Concern | Implementation |
| --- | --- |
| Task contract | `.github/ISSUE_TEMPLATE/agent-task.yml`, `scripts/task-contract.mjs` |
| Plan and risk | `scripts/plan-contract.mjs`, `scripts/risk-policy.mjs` |
| Human plan approval | `scripts/plan-approval.mjs`, `.github/workflows/plan-gate.yml` |
| Role boundaries | `.github/agents/` |
| Tool authorization | `.github/hooks/agent-boundary.json`, `scripts/authorize-tool.mjs` |
| Audit trail | `scripts/audit-hook.mjs`, GitHub workflow logs and artifacts |
| Evaluation | `.github/workflows/governed-change.yml` |
| Evidence | `scripts/evidence-record.mjs`, `scripts/build-execution-report.mjs` |
| Recovery | `scripts/repair-budget.mjs`, `docs/RECOVERY-POLICY.md` |
| Governance drift | `.github/governance/policy.json`, `scripts/governance-audit.mjs` |
| Continuous AI | `.github/workflows/daily-repository-status.md` and generated lock file |
| End-to-end walkthrough | `docs/END-TO-END-DEMO.md` |

## Important boundary

Repository files can define and test expected governance, but they cannot turn
on GitHub rulesets, required code-owner reviews, secret scanning, push
protection, or protected-environment reviewers. The current private repository
plan does not expose those APIs. `npm run governance:check` therefore validates
source-controlled controls and reports hosted controls as **not verified**;
the hosted setup steps are documented explicitly.

## Application

Start the service without PostgreSQL for baseline behavior:

```powershell
npm start
```

Start it with the shared PostgreSQL durability boundary:

```powershell
npm run db:up
$env:DATABASE_URL = "******127.0.0.1:55432/northstar"
npm start
```

```powershell
curl.exe -X POST http://localhost:3000/orders `
  -H "content-type: application/json" `
  -H "idempotency-key: demo-order-001" `
  -d "{\"sku\":\"WIDGET-1\",\"quantity\":2}"
```

See [`docs/architecture.md`](docs/architecture.md) for the complete system and
[`docs/END-TO-END-DEMO.md`](docs/END-TO-END-DEMO.md) for the reproducible demo.

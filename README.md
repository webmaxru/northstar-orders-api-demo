# Northstar Orders API

> **Synthetic demo repository.** Northstar Commerce, its incidents, metrics, and identifiers are fictional.

A small TypeScript/Fastify API for demonstrating governed GitHub Copilot workflows: task contracts, plan-first implementation, capability boundaries, evidence bundles, deterministic checks, and cost-aware sessions.

## Quick start

```bash
npm ci
npm run validate
npm start
```

```bash
curl -X POST http://localhost:3000/orders -H "content-type: application/json" -d '{"sku":"WIDGET-1","quantity":2}'
```

## Demo scenario

[`WI-1842`](docs/work-items/WI-1842.md) asks the team to prevent duplicate orders when clients retry after a timeout. The baseline deliberately has no idempotency.

Read [`docs/DEMO-RUNBOOK.md`](docs/DEMO-RUNBOOK.md) before presenting.

## Session artifacts

[`docs/PATTERNS-MAP.md`](docs/PATTERNS-MAP.md) maps each pattern from **From agents to engineering systems** to the file and command in this repository that demonstrates it: the task contract, path-scoped context, capability boundaries enforced before tool use, the execution report used as an evidence gate, and a bounded repair policy.

[`docs/SESSION-RUNBOOK.md`](docs/SESSION-RUNBOOK.md) is the slide-by-slide delivery guide: what to put on screen at each slide, for how long, the exact commands with their expected output, and the fallbacks.

```bash
npm run hook:check      # pre-tool-use authorization decision from stdin
npm run evidence -- --task WI-1842   # build artifacts/report.json and gate on missing evidence
npm run repair:check    # decide repair or escalate from an attempt log
```

## Safety

- No customer or production data.
- No credentials or tokens are committed.
- `main` is a stable baseline tagged `demo-baseline`.
- Rehearse in disposable Git worktrees.
- Reference branches are never merged into `main`.


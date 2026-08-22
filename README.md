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
curl -X POST http://localhost:3000/orders \
  -H "content-type: application/json" \
  -d '{"sku":"WIDGET-1","quantity":2}'
```

## Demo scenario

[`WI-1842`](docs/work-items/WI-1842.md) asks the team to prevent duplicate orders when clients retry after a timeout. The baseline deliberately has no idempotency.

Read [`docs/DEMO-RUNBOOK.md`](docs/DEMO-RUNBOOK.md) before presenting.

## Safety

- No customer or production data.
- No credentials or tokens are committed.
- `main` is a stable baseline tagged `demo-baseline`.
- Rehearse in disposable Git worktrees.
- Reference branches are never merged into `main`.


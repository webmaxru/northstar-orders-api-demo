# Northstar Orders API

> **Synthetic reference implementation.** Northstar Commerce, its incidents,
> metrics, and identifiers are fictional.

This repository is the executable reference implementation of
[`webmaxru/ai-engineering-system`](https://github.com/webmaxru/ai-engineering-system).
The workload is a TypeScript/Fastify order API whose idempotency behavior must
remain correct across multiple stateless service instances.

It demonstrates the **plan → act → evaluate** loop with GitHub as the
**system of record and control plane**. Agent-authored pull requests follow the
**contributor model**: they are evaluated by intent, scope, evidence,
ownership, policy, and fallback rather than by the identity of the author.

## Application behavior

Two presenter runbooks are in [`docs/demos/README.md`](docs/demos/README.md):
plan-first for the genuine historical idempotency repair, and plan + execution
for the new order-lookup candidate. They include separate VS Code/cloud paths,
exact revisions, human checkpoints, and explicitly unverified stages.

`POST /orders` accepts:

```json
{
  "sku": "WIDGET-1",
  "quantity": 2
}
```

An optional `Idempotency-Key` header provides durable request replay:

- the first request creates an order and returns `201`;
- the same key and payload return the original order with `200`;
- the same key and a different payload return `409`;
- requests without a key retain normal create behavior;
- concurrent retries across service instances create exactly one order.

The implementation stores SHA-256 hashes instead of raw idempotency keys or
request payloads. PostgreSQL transaction-scoped advisory locks serialize work
for one key, and the order plus completed replay record commit atomically.

`GET /orders/:id` retrieves the same `Order` representation without writing
orders or idempotency records. It returns `400` for a malformed UUID, `404` for
an absent order, and a generic `500` for an unexpected storage failure.
The in-memory baseline is process-local; cross-process retrieval requires
PostgreSQL. This fictional unauthenticated route is not a production access
control design.

## Quick start

Prerequisites are Node.js 22 or later and Docker Desktop.

```powershell
npm ci
npm run db:up
npm run validate:all
```

Run the complete local reference scenario:

```powershell
npm run demo:system
```

The expected local decision is `ready_for_review`. Hosted reviews, workflow
provenance, repository rules, and protected-environment approvals are evaluated
separately and cannot be synthesized by a local run.

Stop PostgreSQL when finished:

```powershell
npm run db:down
```

## Run the API

With PostgreSQL:

```powershell
$env:DATABASE_URL = "postgres://northstar:northstar@127.0.0.1:55432/northstar"
$env:PORT = "3000"
npm start
```

Without `DATABASE_URL`, the API uses an in-memory repository for baseline
single-process behavior.

Create and replay an order:

```powershell
$body = '{"sku":"WIDGET-1","quantity":2}'
curl.exe -i -X POST http://localhost:3000/orders `
  -H "content-type: application/json" `
  -H "idempotency-key: demo-order-001" `
  -d $body
curl.exe -i -X POST http://localhost:3000/orders `
  -H "content-type: application/json" `
  -H "idempotency-key: demo-order-001" `
  -d $body
```

The first response has `x-idempotent-replay: false`; the replay has
`x-idempotent-replay: true` and the same order ID.

## Repository map

| Area | Location |
| --- | --- |
| HTTP routes and error mapping | `src/app.ts` |
| Order domain model | `src/domain/` |
| In-memory baseline | `src/repositories/`, `src/services/order-service.ts` |
| PostgreSQL idempotency | `src/services/postgres-idempotent-order-service.ts` |
| Database schema | `migrations/` |
| Runtime metrics | `src/telemetry/` |
| Unit tests | `tests/unit/` |
| Cross-instance acceptance | `tests/acceptance/` |
| Runtime architecture | `docs/architecture.md` |
| Idempotency decision | `docs/adr/007-durable-idempotency.md` |
| Recovery rules | `docs/RECOVERY-POLICY.md` |

# Northstar Orders API agent guide

## Task contract

- Read `docs/work-items/WI-1842.md`.
- Read `docs/architecture.md` and `docs/adr/007-durable-idempotency.md`.
- Keep changes inside `src/`, `tests/`, and `migrations/`.
- Do not change workflows, dependencies, public response fields, or database schema without stopping for approval.

## Capability boundary

- Planning is read-only.
- Implementation may edit repository files and run local validation.
- Publishing, merging, changing Actions, and accessing secrets require explicit human approval.

## Required evidence bundle

1. Plan and assumptions.
2. Focused unit tests.
3. Acceptance tests, including concurrent requests through two service instances.
4. `npm run lint`, `npm run typecheck`, and `npm run test:unit`.
5. Security and dependency workflow results.
6. Limits, rollback, and escalation notes.

## Engineering constraints

- The service is stateless and runs with multiple instances.
- PostgreSQL is the shared durability boundary.
- Do not store or log raw idempotency keys or request payloads.
- Hashing alone does not provide concurrency control.
- The same key with a different payload is a conflict.
- Requests without a key preserve baseline behavior.
- Use bounded waits and surface failures; do not retry indefinitely.


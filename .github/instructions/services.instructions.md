---
description: Rules for order service implementations
applyTo: "src/services/**"
---

# Service layer rules

- `OrderService` implementations must stay safe when two stateless instances
  receive the same request concurrently. Process memory is not a coordination
  primitive; see `docs/architecture.md`.
- Idempotency state belongs in PostgreSQL. Take a transaction-scoped advisory
  lock on the key hash before reading, then create the order and the
  idempotency record in the same transaction. See
  `docs/adr/007-durable-idempotency.md`.
- Never store or log a raw `Idempotency-Key` or a raw request payload. Persist
  SHA-256 hashes only. `tests/acceptance/postgres-privacy.acceptance.test.ts`
  enforces this.
- The same key with a different request hash is a conflict: throw
  `IdempotencyConflictError`, do not overwrite the stored response.
- A request without a key must preserve baseline behavior.
- On database failure, roll back and surface a controlled error. Do not retry
  in an unbounded loop.
- Emit replay and conflict counters through `IdempotencyMetrics`. Counters must
  not carry key or payload values as labels.

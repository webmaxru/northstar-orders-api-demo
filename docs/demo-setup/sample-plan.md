## Assumptions and ambiguities

- **Resolved:** ADR-007 is binding - durability lives in PostgreSQL, not in
  process memory, so a replay must be answered by any instance.
- **Resolved:** `migrations/001_orders_and_idempotency.sql` already defines
  `orders` and `idempotency_records`, so no new migration is needed. The table
  stores hashes and the original response and has no status column, so the
  design must complete inside one transaction rather than through a
  pending/complete state machine.
- **Resolved:** `expires_at` is a retention floor, not a promise of deletion at
  exactly 24 hours.
- **Unresolved:** whether a replay should re-emit domain events. Assumed **no**;
  flagged for the reviewer because it changes observable behavior downstream.

## Proposed design

Follow ADR-007 step for step.

1. SHA-256 the `Idempotency-Key`. The raw value is never persisted or logged.
2. Canonically serialize the validated request and SHA-256 that too.
3. Open a transaction and take `pg_advisory_xact_lock` on the key hash. The
   lock is the mutual-exclusion primitive, not a unique-constraint race: a
   concurrent retry blocks until the winner commits and then reads the stored
   response, so there is no check-then-act window.
4. Inside the lock, read `idempotency_records`:
   - same key hash and same request hash - return the stored `response_body` as
     a replay;
   - same key hash, different request hash - throw `IdempotencyConflictError`,
     which the app maps to 409, and do not overwrite the stored response;
   - no row - create the order and insert the idempotency record in the same
     transaction.
5. No key present - bypass the table entirely, so AC4 is structural rather than
   conditional.
6. On database failure, roll back and surface a controlled error. No unbounded
   retry loop; see `docs/RECOVERY-POLICY.md`.
7. Emit replay and conflict counters through the existing `IdempotencyMetrics`,
   with no key or payload values as labels.

## Scope - files to change

Inside `inputs.scope.allowed` (`src/**`, `tests/**`, `migrations/**`):

- `src/services/postgres-idempotent-order-service.ts` - new; the logic above
- `src/services/idempotency-harness.ts` - replace the stub that throws with two
  service instances over one pool, so AC1 and AC3 can be proven across
  instances
- `src/server.ts` - use the Postgres service when `DATABASE_URL` is set and keep
  the in-memory service otherwise

Not changed, because the repository already provides them:

- `migrations/001_orders_and_idempotency.sql` already creates
  `idempotency_records`; no migration is added
- `src/telemetry/idempotency-metrics.ts` already defines `IdempotencyMetrics`
- `tests/acceptance/` already encodes AC1-AC6 and is the definition of done;
  extend it only if a criterion turns out to be unproven

Deliberately **not** touched: `src/api/**` and `src/auth/**` are prohibited by the
contract, and the route needs no change - the service keeps its `OrderService`
interface.

## Success criteria and the check that proves each

| ID  | Proven by                                                       |
| --- | --------------------------------------------------------------- |
| AC1 | `replays the original response across instances`                |
| AC2 | `rejects a different payload for the same key`                  |
| AC3 | `creates exactly one order under concurrent cross-instance retries` |
| AC4 | `preserves baseline behavior without an idempotency key`        |
| AC5 | `stores only fixed-length hashes`                               |
| AC6 | `emits replay and conflict metrics`                             |

AC3 runs two concurrent requests against two service instances sharing one
database, because a single-process test would pass on an in-memory lock that
does not survive deployment.

## Capability boundary and stop conditions

Writes confined to the three files above. No new dependencies - hashing uses
`node:crypto` and `pg` is already a dependency. Stop and escalate if: the fix
appears to require an API-shape change, a schema change beyond an additive
migration, or a workflow edit; or if AC3 cannot be proven without a second
database.

## Rollback and escalation

Revert the branch. The schema is unchanged and `idempotency_records` is read by
nothing else, so a revert needs no down-migration. Escalate to the service owner
if replay semantics for domain events turn out to matter.

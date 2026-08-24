# Sample plan for WI-1842

The rehearsal artifact. Publishing it opens the plan-first pull request without
needing a live planning session:

```powershell
npm run contract:fetch -- --issue 4
node scripts/publish-plan.mjs --file docs/demo-setup/sample-plan.md
```

In a real session the `plan` agent produces this and its `Stop` hook publishes
it. This file exists so the demo can be rehearsed offline.

---

## Assumptions and ambiguities

- **Resolved:** ADR-007 is binding - durability lives in PostgreSQL, not in
  process memory, so a replay must be answered by any instance.
- **Resolved:** the 24-hour window is a retention floor, not a promise of
  deletion at exactly 24 hours.
- **Unresolved:** whether a replay should re-emit domain events. Assumed **no**;
  flagged for the reviewer because it changes observable behavior downstream.

## Proposed design

Store an idempotency record keyed by a fixed-length hash of the key, alongside a
hash of the canonical request body and the serialized original response. Take the
insert as the mutual-exclusion primitive: a unique constraint on the key hash
means a concurrent second request fails the insert rather than racing a read.

- First request: insert `pending`, create the order, update to `complete` with
  the stored response.
- Replay with the same body hash: return the stored response.
- Replay with a different body hash: 409.
- Concurrent retry: unique-violation on insert, then wait-and-read the winner.
- No key present: bypass the table entirely, so AC4 is structural rather than
  conditional.

## Scope - files to change

Inside `inputs.scope.allowed`:

- `migrations/003_idempotency_records.sql` - additive table, no change to `orders`
- `src/services/postgres-idempotent-order-service.ts` - the logic above
- `src/observability/metrics.ts` - replay and conflict counters
- `tests/acceptance/idempotency.test.ts` - AC1-AC6

Deliberately **not** touched: `src/api/**` and `src/auth/**` are prohibited by the
contract, and the route needs no change - the service keeps its interface.

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

Writes confined to the four paths above. No new dependencies - hashing uses
`node:crypto`. Stop and escalate if: the fix appears to require an API-shape
change, a non-additive migration, or a workflow edit; or if AC3 cannot be proven
without a second database.

## Rollback and escalation

Revert the branch. The migration is additive and the table is unread by anything
else, so a revert needs no down-migration to be safe; drop the table separately
once the revert has settled. Escalate to the service owner if replay semantics
for domain events turn out to matter.

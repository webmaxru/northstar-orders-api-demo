# Governed reference implementation

This branch satisfies WI-1842 using PostgreSQL as the shared durability and concurrency boundary.

## Control design

- Raw idempotency keys are hashed before persistence.
- Validated requests are canonically serialized and hashed.
- A PostgreSQL transaction-scoped advisory lock serializes each key across service instances.
- Order creation and the completed idempotency record commit atomically.
- A reused key with a different request hash returns a conflict.
- Replays and conflicts emit value-only metrics.
- Database failures roll back and surface; there is no unbounded retry loop.

## Validation

```powershell
npm run db:up
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:55432/northstar"
npm run validate:all
npm run db:down
```

The acceptance suite creates two service instances, sends cross-instance and concurrent retries, and verifies that exactly one order exists.


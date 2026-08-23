---
description: Rules for tests used as acceptance evidence
applyTo: "tests/**"
---

# Test rules

- A green unit suite is not sufficient evidence for WI-1842. Acceptance
  criteria 1-6 must be proven by `tests/acceptance/**` running against a real
  PostgreSQL instance.
- Concurrency claims require concurrent execution across two service
  instances, not two sequential calls against one instance.
- Do not weaken an assertion to make a suite pass. If a criterion cannot be
  proven, stop and record it under "Limits" in the pull request.
- Tests must not print raw idempotency keys or request payloads.
- Keep unit tests free of external dependencies so `npm run test:unit` stays
  runnable without Docker.

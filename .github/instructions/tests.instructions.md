---
description: Rules for tests used as acceptance evidence
applyTo: "tests/**"
---

# Test rules

- A green unit suite is not sufficient evidence. Every acceptance criterion in
  the active task contract must be proven by the test named in that contract's
  `provenBy` field, and `npm run evidence -- --task <ID>` must agree.
- Criteria that describe behavior across process boundaries must be proven by
  `tests/acceptance/**` running against a real PostgreSQL instance.
- Concurrency claims require concurrent execution across two service
  instances, not two sequential calls against one instance.
- Do not weaken an assertion to make a suite pass. If a criterion cannot be
  proven, stop and record it under "Limits" in the pull request.
- Tests must not print raw idempotency keys or request payloads.
- Keep unit tests free of external dependencies so `npm run test:unit` stays
  runnable without Docker.

# Recovery policy

Retrying is not recovery. A retry repeats the same request and hopes the world
changed. Recovery identifies which layer was wrong and changes that layer.

This policy is executable: `scripts/repair-budget.mjs` implements it and
`tests/unit/repair-budget.test.ts` proves it.

## Failure signature

An attempt log entry is `{ "check": "...", "message": "..." }`. Before anything
is compared, the message is normalized: run ids, SHAs, durations, numbers,
paths, and addresses are replaced with placeholders.

This matters. Without normalization every attempt looks like a new failure,
because the timestamp moved, and an agent will keep spending attempts on what is
actually one unchanged problem.

## Which layer changes

| Signal in the failure | Layer | Action | What actually changes |
| --- | --- | --- | --- |
| permission, forbidden, denied, 401, 403 | policy | escalate | authority, not the prompt |
| ECONNREFUSED, ETIMEDOUT, ENOTFOUND | environment | repair | the bootstrap, so the dependency is present before reasoning starts |
| cannot find module, type not assignable | context | repair | retrieve the missing source of truth |
| assertion mismatch | reasoning | repair | the plan, never the assertion |
| anything else | unknown | escalate | classify before spending another attempt |

## Stop conditions

The loop stops and a human decides when any of these is true:

- the same check fails twice with the same signature,
- the failure is a policy failure, on the first occurrence,
- the failure cannot be classified,
- three attempts have been spent.

A permission error is never a prompting problem. Do not fix a permission
problem with a better prompt.

## Try it

```bash
cat > artifacts/attempts.json <<'JSON'
[
  { "check": "acceptance", "message": "AssertionError: expected 2 to be 1 // creates exactly one order under concurrent cross-instance retries at /home/runner/tests/x.ts in 812ms" },
  { "check": "acceptance", "message": "AssertionError: expected 2 to be 1 // creates exactly one order under concurrent cross-instance retries at /tmp/b/tests/x.ts in 1204ms" }
]
JSON

node scripts/repair-budget.mjs artifacts/attempts.json
```

The two entries differ in path and duration and are still recognized as one
failure, so the run escalates instead of spending a third attempt:

```
"decision": "escalate",
"reason": "the same acceptance failure signature occurred 2 times; another attempt is not recovery"
```

Exit code is `1` on escalate, so a workflow can gate on it.

# Northstar Orders API agent guide

Repository-wide guidance. It holds for every task and therefore names none.
Anything true of only one work item belongs in that work item's contract, not
here. See `docs/CONTEXT-ARCHITECTURE.md`.

## Task contract

Every task arrives with its own contract:

It lives in the GitHub issue, created from the **Agent task** template, and
nowhere else. It has three sections: inputs (goal, authoritative sources,
allowed and prohibited scope, constraints), outputs (plan, changeset,
evidence), and success criteria, each naming the test that proves it.

Read the issue, plus `docs/architecture.md` and every authoritative source it
names, before proposing a change. Keep edits inside the allowed scope. Do not
change workflows, dependencies, public response fields, or database schema
without stopping for approval.

## Capability boundary

- Planning is read-only.
- Implementation may edit files inside the task's allowed scope and run local
  validation.
- Publishing, merging, changing Actions, and accessing secrets require explicit
  human approval.

Least privilege is per task and per phase. The allowed scope is supplied by the
active task contract and enforced by `scripts/authorize-tool.mjs` before a tool
runs.

## Required evidence bundle

1. Plan and assumptions.
2. Focused unit tests.
3. Acceptance tests covering every success criterion in the task contract,
   including behavior across two service instances where the criteria require
   it.
4. `npm run lint`, `npm run typecheck`, and `npm run test:unit`.
5. Security and dependency workflow results.
6. Limits, rollback, and escalation notes.

`npm run contract:fetch -- --issue <n>` resolves the contract, then
`npm run evidence` checks the bundle against it and fails when a criterion has
no proof.

## Engineering constraints

These are properties of the system, not of any task.

- The service is stateless and runs with multiple instances.
- PostgreSQL is the shared durability boundary.
- Process memory is not a coordination primitive.
- Do not store or log raw idempotency keys or request payloads.
- Hashing alone does not provide concurrency control.
- Use bounded waits and surface failures; do not retry indefinitely. See
  `docs/RECOVERY-POLICY.md`.

<!--
  GENERATED FILE - DO NOT EDIT.

  Source: AGENTS.md
  Regenerate: npm run instructions:sync

  AGENTS.md is the vendor-neutral convention and the only file authored by
  hand. This copy exists because some Copilot surfaces do not read AGENTS.md
  yet. See the support matrix:
  https://docs.github.com/en/copilot/reference/custom-instructions-support
-->
# Northstar Orders API agent guide

This is the single authored source of durable, repository-wide agent guidance.
It holds for every task and therefore names none. Anything true of only one work
item belongs in that task's issue, not here. See `docs/CONTEXT-ARCHITECTURE.md`.

`.github/copilot-instructions.md` is generated from this file and must not be
edited. See "Why a second file exists" at the end.

This repository is a synthetic demonstration. Northstar Commerce, its
incidents, and its identifiers are fictional.

## Before you start

1. Read this file.
2. Read the issue you were assigned. It is the task contract.
3. Read `docs/architecture.md`.
4. Read every authoritative source the issue names, including any ADR under
   `docs/adr/`.
5. Produce a plan with assumptions, affected files, test strategy, and stop
   conditions.
6. Stop before editing until the plan is approved.

Use the existing repository patterns and expose uncertainty rather than
resolving it silently.

## Task contract

The contract lives in the GitHub issue, created from the **Agent task**
template, and nowhere else. It has three sections: inputs (goal, authoritative
sources, allowed and prohibited scope, constraints), outputs (plan, changeset,
evidence), and success criteria, each naming the test that proves it.

Keep edits inside the allowed scope. Do not change workflows, dependencies,
public response fields, or database schema without stopping for approval.

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

A green unit suite is not sufficient when a success criterion describes behavior
across process boundaries; run the acceptance suite against PostgreSQL.

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

## Why a second file exists

`AGENTS.md` is the vendor-neutral convention and is the only file maintained by
hand here. It is not yet read everywhere: per
[GitHub's support matrix](https://docs.github.com/en/copilot/reference/custom-instructions-support),
agent instructions are honored by Copilot cloud agent everywhere, by Copilot
Chat in VS Code, and by code review on GitHub.com - but **not** by Copilot Chat
on GitHub.com, nor by Chat or code review in Visual Studio, JetBrains, Eclipse,
or Xcode. Those surfaces read `.github/copilot-instructions.md` only.

Deleting the harness-specific file would therefore silently drop this guidance
on most surfaces. Maintaining it by hand would create a second source of truth
that drifts. So it is generated:

```bash
npm run instructions:sync     # regenerate from AGENTS.md
npm run instructions:check    # fail if it is stale, run in CI
```

When the matrix catches up, delete the generated file and its sync script. The
architecture does not change; only a compatibility shim disappears.

---
description: Implement the approved plan for the active task
agent: implement
---

Implement the approved plan.

Everything you need is already in this session. The `SessionStart` hook resolved
the task contract from its issue and injected it, together with the approved
plan posted as a comment on that same issue. You do not need to look up the
issue number or fetch anything.

Before you edit:

1. Confirm the injected context names an **active task contract**. If it says no
   contract is active, stop and say so.
2. Confirm it contains an **approved plan**. If it says no plan has been
   persisted, stop - run the `plan` agent first. Do not plan and implement in
   the same session.
3. Read `AGENTS.md`, `docs/architecture.md`, and every authoritative source the
   contract names.

Then implement **only what the plan describes**, inside the contract's allowed
scope and outside its prohibited paths.

Do not re-plan. If the plan is wrong or incomplete, say which part and stop -
silently improving it turns an approved artifact back into an unreviewed one.

When you finish, the `Stop` hook runs the suites and rebuilds the evidence
report. If a success criterion is unproven it will block and hand you the gap.

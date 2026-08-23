This repository is a synthetic GitHub Copilot demonstration.

These instructions are repository-wide and outlive any single work item. They
never name a task. The task names itself.

Before implementing any assigned work item:

1. Read `AGENTS.md`.
2. Read the work item you were given, under `docs/work-items/`.
3. Read `docs/architecture.md`.
4. Read every ADR the work item references, under `docs/adr/`.
5. Produce a plan with assumptions, affected files, test strategy, and stop
   conditions.
6. Stop before editing until the plan is approved.

Use the existing repository patterns and expose uncertainty. A green unit suite
is not sufficient when the work item's acceptance criteria describe behavior
across process boundaries; run the acceptance suite against PostgreSQL.

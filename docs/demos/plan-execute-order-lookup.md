# Demo B: plan + execution in one order-lookup PR

**Teaching goal:** a bounded medium-risk feature does not need the same
pre-implementation approval ceremony as a durability/control-plane change.
The plan remains visible; code can follow immediately, but merge still requires
checks and human review.

**Feature:** `GET /orders/:id`. The route uses the existing `Order` shape and
storage. No migration, dependency, workflow or authentication change is needed.
This is a fictional unauthenticated demo, not a production order-access design.

## 1. Select the exact before/after

| Stage | Revision |
| --- | --- |
| Before: durable POST, no GET route | `e509ce039f47feec64e1883a01c24e589d78a5b9` |
| Endpoint candidate | `d2580a5815899160d28538e2cb1b3cee7f3cbb67` |
| Task | [WI-1843, issue 17](https://github.com/webmaxru/northstar-orders-api-demo/issues/17) |

Both candidate revisions are local until explicitly published. The predecessor
is not accepted. A remote clone cannot check out an unpublished SHA; do not
invent a remote branch when demonstrating this.

From the local reference clone, or after the candidate refs are published:

```powershell
# CUSTOMIZE to unused sibling worktree paths.
git worktree add --detach ..\wi-1843-before e509ce039f47feec64e1883a01c24e589d78a5b9
git worktree add --detach ..\wi-1843-after d2580a5815899160d28538e2cb1b3cee7f3cbb67
git diff --stat e509ce039f47feec64e1883a01c24e589d78a5b9 d2580a5815899160d28538e2cb1b3cee7f3cbb67 -- src tests
```

Use a new task/run for an actual repeat implementation. The read-only
before/after checkouts are an application replay, not a new agent session.

## 2. Explain the bounded contract

Open issue 17 and point out the allowed application/test/documentation files
and the prohibited control-plane, migration and package paths.

The response contract is:

| Request | Result |
| --- | --- |
| Existing well-formed UUID | 200, exact existing `Order` representation |
| Malformed identifier | 400, `invalid_order_id` |
| Well-formed absent UUID | 404, `order_not_found` |
| Unexpected storage failure | 500, generic `internal_error`; no database detail |
| Repeated reads | No order or idempotency writes |

The policy assesses the actual scope as medium. A new schema, auth or workflow
requirement is an escalation, not permission to expand this feature silently.

**Talk track:** "This time we are not changing the concurrency boundary. We are
adding a read over data we already have. I still want the plan, but I do not
need to stop everyone between writing that plan and proposing the code. Let's
keep both in one PR and review the complete result."

## 3. VS Code plan + execution session

**Controller readiness gate:** the predecessor still has paths that look up a
separate plan PR, and the hosted workflow runs `plan-approval` unconditionally.
A generic `/implement 17` is not yet a proved single-PR entry point. That
controller repair belongs to the control-plane task, not to this application
change. Do not work around it by turning this story into plan-first.

Once the accepted controller supports combined mode:

1. Open a dedicated implementation worktree in VS Code at the chosen base.
2. Select the write-capable implementation agent, not the read-only planner.
3. Supply the live task and explicitly choose plan + execution. The session
   must resolve the live issue and persist a valid medium-risk machine plan
   before its first edit; it must not invent an approval record.
4. Have the agent put the plan in the **same PR** as its initial changes.
5. Inspect the diff and tests, then ask the independent reviewer to assess that
   implementation. There is no separate mandatory plan-only approval.

Suggested prompt, after the controller readiness gate passes:

```text
Task issue: #17
Task role: implement
Delivery pattern: plan + execution, medium risk.

Read the live WI-1843 contract and exact base. Produce a structured plan and
then implement GET /orders/:id within the allowed scope. Keep that plan and
the code in one PR. Do not create a separate plan-only approval gate or an
approval record. Stop if risk or scope increases. Run the named tests and
report actual evidence and remaining limits; do not merge.
```

For an actual repeat, replace 17 with the new live issue. Do not use a static
fixture as authority.

## 4. Cloud entry for the same scenario

The source branch must first be published and the combined-mode controller
verified. Then:

```powershell
# CUSTOMIZE to the published endpoint starter and actual live task.
$BaseBranch = '<PUBLISHED_ENDPOINT_STARTER_BRANCH>'
$Prompt = @'
Task issue: #17
Task role: implement
Delivery pattern: plan + execution, medium risk.
Resolve the live task, create a validated plan, and propose the scoped
GET /orders/:id implementation with that plan in the same PR.
No separate plan-only approval, no invented approval record, no merge.
Stop for scope/risk expansion and report actual tests and limitations.
'@
gh agent-task create --repo webmaxru/northstar-orders-api-demo `
  --base $BaseBranch --custom-agent implement $Prompt
```

This is an operator command, not a recorded successful cloud run. Retain the
returned session URL, source SHA, task digest, host branch and actual workflow
evidence. If task/plan initialization fails, the demo is blocked.

## 5. Show the small implementation

Open these files in VS Code:

- `src/domain/order.ts`: UUID validation and the specific read-validation error.
- `src/services/order-service.ts`: `getOrder`, using the existing repository.
- `src/services/postgres-idempotent-order-service.ts`: one parameterized SELECT.
- `src/app.ts`: GET route, explicit 404 and existing generic error boundary.
- `tests/unit/order-lookup.test.ts`: named behavior and no-write assertions.
- `tests/acceptance/order-lookup.acceptance.test.ts`: real process/database proof.

No package, migration or control-plane change belongs to this diff. Existing
POST response fields, replay behavior and privacy requirements remain intact.

## 6. Run the visible HTTP demonstration

In the endpoint candidate worktree:

```powershell
npm ci
npm run test:unit -- tests/unit/order-lookup.test.ts tests/unit/orders-route.test.ts tests/unit/order-service.test.ts
npm run typecheck
npm run lint

# This terminal is a disposable in-memory demo, not durable PostgreSQL proof.
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:PORT = '3102'
npm start
```

In a second terminal:

```powershell
$Base = 'http://127.0.0.1:3102'
$Body = @{ sku = 'WIDGET-1'; quantity = 2 } | ConvertTo-Json -Compress
$Created = Invoke-RestMethod "$Base/orders" -Method Post `
  -ContentType 'application/json' -Body $Body
Invoke-RestMethod "$Base/orders/$($Created.id)"

(Invoke-WebRequest "$Base/orders/not-a-uuid" -SkipHttpErrorCheck).StatusCode
(Invoke-WebRequest "$Base/orders/00000000-0000-4000-8000-000000000001" -SkipHttpErrorCheck).StatusCode
```

Expect the same order representation, then 400 and 404. These statuses were
observed over real localhost HTTP for the local candidate. Restarting this
in-memory server loses its orders by design; do not call that a persistence bug.

## 7. Prove durability separately

With an explicitly authorized isolated PostgreSQL service:

```powershell
$env:DATABASE_URL = '<ISOLATED_LOCAL_POSTGRES_URL>'
npm run test:acceptance
npm run validate:all
```

The new tests create unique schemas and distinct child servers. They create
through one process, read through another, restart the writer, and check that
orders/idempotency rows did not change during reads.

**Current evidence boundary:** route/service tests and real in-memory HTTP
passed; PostgreSQL process acceptance has not run successfully because the
test database was unavailable. Do not replace the missing proof with mocked SQL
tests or the older idempotency audit.

## 8. Review and accept the one PR

Show the plan and code together. Review the current implementation head, named
tests, unchanged POST behavior, actual database evidence, security results and
scope/merge checks. Apply the **contributor model**: judge the proposal and
evidence, not whether the author was a human or agent.

The reviewer clicks **Approve** only after checking the result. Required
checks and repository policy still control merge. A medium-risk task avoids a
separate pre-implementation plan approval; it does not avoid final review.

**Talk track:** "We moved faster by choosing the right point for review, not by
removing review. The plan is still here, the diff is bounded, and I can see what
the checks actually proved. That is the same engineering system, with a
different risk-based route."

## Recovery and replay

If the controller demands a separate plan PR, record the combined-mode
implementation gap instead of presenting a workaround as plan + execution.
If a database or hosted check is unavailable, keep acceptance pending.
Restart demos in fresh worktrees with new fictional order keys and unique
task/run identities. Stop only your own servers and test resources.

Sources: [paired overview](README.md),
[the guide's two delivery options](https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/4-plan-reason-execution),
[Copilot cloud tasks](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-a-pull-request),
[repository architecture](../architecture.md).

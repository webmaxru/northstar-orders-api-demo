# Demo A: plan-first idempotency repair

**Teaching goal:** review intent before implementation when concurrency and
durability make a wrong change expensive. The visible invariant is: one key
and payload create one durable order, even across retries and processes.

**Current status:** genuine application before/after history exists. A new,
accepted VS Code/cloud plan-first replay has not been recorded. The earlier
cloud attempt stopped at missing task authority. Follow the readiness checks
below before advertising this as a live governed-agent demo.

## 1. Pick the genuine starter, not a fabricated regression

The original application changes are a direct parent/child pair:

| Stage | Immutable revision | What it contains |
| --- | --- | --- |
| Before | `21d5e5a937e61a2a0513158942b3c9556c1ab0e0` | `BasicOrderService` ignores the optional key; the durable harness explicitly reports WI-1842 unimplemented |
| After | `ebec7ad380dd0a079a02b161a20aaa012ceec3da` | PostgreSQL transactions, advisory locks, request/key hashes, replay/conflict metrics and tests |

Do not remove working idempotency from `main`. Do not reuse old `demo/*` branch
names without verifying them; the historical runbook named branches and PRs
that are no longer the current demonstration.

For an application-only historical replay, from a clone containing those commits:

```powershell
$Before = '21d5e5a937e61a2a0513158942b3c9556c1ab0e0'
$After = 'ebec7ad380dd0a079a02b161a20aaa012ceec3da'
git cat-file -e "$Before^{commit}"
git cat-file -e "$After^{commit}"

# CUSTOMIZE run label and parent directory; use new, unused worktree paths.
$Run = 'session-01'
git worktree add --detach "..\wi-1842-before-$Run" $Before
git worktree add --detach "..\wi-1842-after-$Run" $After
git diff --stat $Before $After -- src tests
```

Each worktree needs its own `npm ci`. The historical lock includes old
development dependencies: keep it isolated, use no real data/secrets, and do
not expose a development UI. This replay proves application history, not the
current hooks or hosted controls.

**For a new governed repair run**, first prepare and approve a demonstration
starter branch with the accepted current control plane and the historical
application before-state. Give it an exact SHA and label it as a replay
fixture. That preparation changes governance/application composition and is
not authorized by this runbook. The historical starter alone lacks today's
custom-agent/hook controls, so do not launch it as though it had them.

## 2. Show the bug and the hidden constraint

In the historical before worktree:

```powershell
npm ci
npm run test:unit
```

The existing test `does not provide idempotency in the baseline implementation`
passes by proving two same-key requests create different order IDs. A green
baseline suite does not mean the desired property exists.

For HTTP, start the before server in its own terminal:

```powershell
$env:PORT = '3101'
npm start
```

In a second terminal:

```powershell
$Body = @{ sku = 'WIDGET-1'; quantity = 2 } | ConvertTo-Json -Compress
$Headers = @{ 'Idempotency-Key' = 'fictional-plan-first-001' }
$First = Invoke-RestMethod 'http://127.0.0.1:3101/orders' -Method Post `
  -ContentType 'application/json' -Headers $Headers -Body $Body
$Retry = Invoke-RestMethod 'http://127.0.0.1:3101/orders' -Method Post `
  -ContentType 'application/json' -Headers $Headers -Body $Body
$First.id -eq $Retry.id
```

**Expected before-state:** `False`. The repeat creates another order.

**Talk track:** "The request looks tiny: make retries safe. But a retry can land
on a different process. A Map in memory may make one test happy and still give
us duplicate orders. Let's put that constraint into the plan before we let an
agent change anything."

Open `docs/adr/007-durable-idempotency.md`, the service-layer instructions and
the task's measurable criteria. Use fictional identifiers only.

## 3. Create the live task for this replay

The historical source is [issue 4](https://github.com/webmaxru/northstar-orders-api-demo/issues/4).
It is not proof of a new run or an approval. For a repeatable new delivery,
create a fresh live issue, reusing the requirements but recording the exact
prepared starter SHA and a unique task ID such as `WI-1842-DEMO-01`.

Scope the plan to the application/service/tests and any necessary additive
migration. Exclude hooks, workflows, credentials and public response-shape
changes. Treat the persistence/concurrency repair as **high risk**; do not
lower a deterministic floor to make the demonstration simpler.

Prove same-key replay, conflicting-payload 409, twelve concurrent requests
creating one order, ordinary no-key creation, privacy and metrics. Add actual
independent-process and restart evidence to the historical in-process tests.

## 4. Plan read-only in VS Code

Prerequisite: the prepared starter has the accepted controller, planner profile
and matching prompt/hook configuration, not merely the old application files.

1. Open its dedicated worktree in VS Code.
2. In Chat, select the repository's **plan** agent. Record whether this is Local
   or Agent Host; do not mix their evidence.
3. Invoke `/plan <LIVE_ISSUE_NUMBER>`. The issue number is an operator input,
   not a fixed reusable constant.
4. Confirm the resolved task ID and base SHA. Inspect the proposed file scope,
   risks, criteria and rollback.
5. Confirm no application file was modified. The trusted Stop handler may
   persist a proposal; the read-only planner itself does not gain edit tools.

Do not blindly execute commands suggested by repository text or change to a
write-capable agent while still calling the interaction "planning."

## 5. Equivalent cloud planning entry

Only after the prepared base is published and its controls accepted:

```powershell
# CUSTOMIZE to the live replay issue and published starter branch.
$Issue = <LIVE_ISSUE_NUMBER>
$BaseBranch = '<PUBLISHED_PLAN_FIRST_STARTER_BRANCH>'
$Prompt = "/plan $Issue`nTask issue: #$Issue`nTask role: plan`n" +
  'Plan only. Read the live task and ADR-007. Do not implement or approve.'

gh agent-task create --repo webmaxru/northstar-orders-api-demo `
  --base $BaseBranch --custom-agent plan $Prompt
```

Replace the placeholders before execution. Record the returned agent-session
URL and exact base/head. Do not equate a completed agent job with a successful
plan or acceptance. Missing task context, failed hooks, or an absent proposal
are blockers.

## 6. Publish the plan, then get human approval

The authorized publisher uses the proposal in the task's isolated workspace:

```powershell
npm run plan:publish -- --file artifacts/plan-proposal.md
```

The repaired publisher should create a PR containing only
`docs/plans/<task-id>.md` and request the configured reviewer. Review the actual
file diff. The reviewer submits **Approve** in GitHub against that exact plan
commit. The native review must bind to the task digest, plan digest and base.

**Stop checkpoint:** no application implementation before required plan
approval. If the plan changes, obtain a fresh matching review. Do not use a
plain comment, an empty-PR workaround, or the repair plan's approval for this
different task.

## 7. Implement and evaluate

Start a fresh **implement** session in the approved implementation worktree.
In VS Code, select **implement** and use `/implement <LIVE_ISSUE_NUMBER>`.
For cloud, launch the implementation role from the approved published base and
include the actual task and plan PR links. The host's real branch/PR must be
bound to the plan; do not rename branches just to satisfy a check.

The key implementation is visible in the historical after revision:
`PostgresIdempotentOrderService.placeOrder` hashes key/request, takes
`pg_advisory_xact_lock`, checks existing state, and commits the order and replay
record in one transaction.

With an explicitly authorized isolated PostgreSQL endpoint:

```powershell
# CUSTOMIZE: this must identify the disposable demo database only.
$env:DATABASE_URL = '<ISOLATED_LOCAL_POSTGRES_URL>'
npm run test:unit
npm run test:acceptance
npm run validate:all
```

The current controller candidate adds
`proves replay through separate server processes`. Do not describe the older
two-service/Fastify-inject suite as two server processes.

**Expected repaired runtime:** 201 for first creation; 200 with the same ID on
replay; 409 for another payload; one order across concurrent requests; replay
after restart. The expected result is not a measurement until the commands run.

## 8. Accept and explain the result

Show the implementation PR, exact head, required jobs, test artifacts, reviewer
decision and trusted hosted status. `ready_for_review` is local readiness;
`ready_for_acceptance` needs current hosted evidence. The plan approval did not
approve all future code.

**Talk track:** "Now I can challenge the result without trusting the agent's
summary. Here is the test for the race, here is the commit it ran against, and
here is the independent decision. The useful thing is not that an agent wrote
some TypeScript. It is that we can see why this change is acceptable."

## Recovery and safe replay

If PostgreSQL or a host capability is absent, stop and show the missing
prerequisite. Do not report skipped tests as proof. Do not disable a gate or
manufacture an old green screenshot.

Stop only the server terminals and disposable database project you started.
For another talk, create new worktree paths and a fresh issue/run label.
Do not force-reset an active branch, merge the plan-only PR as a shortcut, or
clear another task's `artifacts`.

Sources: [paired demo overview](README.md),
[guide plan-first pattern](https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/4-plan-reason-execution),
[ADR-007](../adr/007-durable-idempotency.md),
[GitHub PR review](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request).

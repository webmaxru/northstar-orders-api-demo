# Two delivery stories, one AI Engineering System

Northstar Commerce, its work items and order data are fictional. The GitHub
issues, commits, reviews and execution results referenced here are real.

The distinction is **when humans validate intent**, not whether a task gets a
plan or whether anyone reviews the result. Both stories follow
**plan -> act -> evaluate** and **agents propose; humans and policy accept**.
GitHub remains the **system of record and control plane**.

| Story | Delivery pattern | Human checkpoint | Walkthrough |
| --- | --- | --- | --- |
| WI-1842: stop duplicate orders after retries | **Plan-first** | Approve the immutable plan before implementation; review implementation again before acceptance | [Plan-first idempotency](plan-first-idempotency.md) |
| WI-1843: retrieve an order | **Plan + execution** | Plan and code are proposed in one PR; approve the implementation before merge | [Plan + execute order lookup](plan-execute-order-lookup.md) |

## What is available and what is not

**These are complete operator runbooks, not a claim that both hosted flows have
already completed.** Do not present the launch instructions as execution evidence.

| Component | Exact source / current evidence |
| --- | --- |
| Genuine idempotency starter | `21d5e5a937e61a2a0513158942b3c9556c1ab0e0`; basic service creates duplicates and durable harness deliberately reports unimplemented |
| Genuine idempotency solution | `ebec7ad380dd0a079a02b161a20aaa012ceec3da`, direct child of the starter; PostgreSQL implementation, no invented rollback of current main |
| Audited remote main | `b65c2de5c8224342c72c37eeed7ef9f965ad8a2c`; idempotency already works; no lookup endpoint |
| Local control-plane repair | `e509ce039f47feec64e1883a01c24e589d78a5b9`, `agent/implement/aes-surface-evidence`; 415 unit tests and offline checks passed; not pushed or accepted |
| Local endpoint candidate | `d2580a5815899160d28538e2cb1b3cee7f3cbb67`, `agent/implement/wi-1843`; focused tests and real single-process HTTP 201/200/400/404 passed |
| Real repair plan approval | [Plan PR 15](https://github.com/webmaxru/northstar-orders-api-demo/pull/15), review `5292933832`; approval of the repair plan, not either finished demo |
| Real historical cloud rehearsal | [PR 13](https://github.com/webmaxru/northstar-orders-api-demo/pull/13); stopped at missing task cache; not a successful plan-first delivery |
| PostgreSQL, VS Code agent, and cloud endpoint proof | Still pending for the new candidate; starting a terminal/server or a passing mocked SQL test is not host or database proof |

The reference repair does not yet establish an accepted single-PR combined
controller. Some resolver and hosted workflow paths still assume a separate
plan PR. That must be repaired under the control-plane task, not worked around
by inserting a fake approval or quietly turning WI-1843 into plan-first.

## Presenter setup

Use Windows PowerShell 7 for the commands in these runbooks. Replace only
explicitly marked operator values. No command requires pasting a token into a
prompt or slide.

| Preparation | Operator check |
| --- | --- |
| Runtime | Node.js 22+, Git, npm, GitHub CLI; Docker for PostgreSQL proof |
| Repositories | Clone the reference; fetch the exact refs before checking out a scenario |
| Task isolation | A separate Git worktree and branch for each scenario; never share one checkout's `artifacts` directory |
| Data | An explicitly authorized disposable local PostgreSQL project/schema, not production |
| Roles | Publisher/implementer proposes; configured reviewer accepts the appropriate immutable head |
| VS Code | Record VS Code/Copilot versions and whether the selected harness is Local or Agent Host; run the two Local-mode demos serially |
| Cloud | Publish the selected candidate base first; confirm the cloud agent actually uses that ref and the expected custom-agent role |
| Hosted controls | Verify rules or branch protection, reviewer enforcement, required checks, protected maintenance and App identities where required |
| Reset | Create a new worktree/run label; do not force-push, reset a shared checkout, or delete another run's database |

The guide allows parallel CLI/cloud tasks through isolated contexts. It does
not promise parallel tasks inside the named VS Code Local mode. Use serial
Local-mode demonstrations, or separately verified isolated CLI/cloud sessions.

### VS Code and cloud are separate acceptance rows

Use the same scenario contract on each host, but do not assume hook output,
transcript persistence, credentials, paths, or task startup are identical.

1. Record the actual source SHA and live issue in the session.
2. Confirm task context and the correct plan/execute mode were resolved.
3. Prove planner writes are denied in the plan-first story.
4. Prove an authorized in-scope change and an out-of-scope denial.
5. Capture the actual diff, test artifacts, PR head, review and final decision.
6. For cloud, retain the immutable agent-session URL and Actions run IDs.

A failure in any row is a stop-and-explain moment, not an invitation to disable
hooks. The runbooks include honest fallback demonstrations of the application
and source. Label a recording, historical replay and current live run separately.

## Suggested 20-minute live block

| Time | Scene | Say/show |
| --- | --- | --- |
| 0:00-2:00 | One framework, two risk choices | Show task contracts and explain the timing of approval |
| 2:00-9:00 | Plan-first idempotency | Before behavior, read-only plan, human gate, separate-process evidence |
| 9:00-16:00 | Plan + execute lookup | One PR with plan and code; 200/400/404 plus unchanged POST behavior |
| 16:00-19:00 | Same evaluation/acceptance boundary | Tests are signals; humans and policy accept the immutable result |
| 19:00-20:00 | Honest limits | State the exact host and controls that were actually verified |

For asynchronous cloud execution, show a previously completed session whose
source and evidence match the runbook. Do not promise model latency during a
short speaking slot.

## Sources for the explanation

- [Plan-first versus plan + execution](https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/4-plan-reason-execution)
- [Execution isolation and concurrency](https://learn.microsoft.com/en-us/training/modules/multi-agent-systems-orchestration/4-execution-isolation-permissions-concurrency)
- [Copilot hook reference](https://docs.github.com/en/copilot/reference/hooks-reference)
- [VS Code agent hooks](https://code.visualstudio.com/docs/agent-customization/hooks)
- [Cloud agent environment](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)
- [Repository architecture](../architecture.md)
- [Recovery policy](../RECOVERY-POLICY.md)

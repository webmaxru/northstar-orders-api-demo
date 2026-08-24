# End-to-end flow

From running `/plan <issue>` to a pull request that is ready to merge.

Every step names the script that runs, the file it reads, the file it writes,
and why that ordering is forced. Nothing here is aspirational: each command was
executed while writing this document.

## The files that move between steps

| File                              | Written by                                                        | Read by                                            | Committed?             |
| --------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- | ---------------------- |
| the GitHub issue                  | a human, via the **Agent task** template                          | everything, indirectly                             | n/a - it is not a file |
| the plan-first pull request       | `scripts/plan-stop.mjs` via `scripts/publish-plan.mjs`            | reviewers, `scripts/resolve-task.mjs`              | n/a - it is not a file |
| `artifacts/task-contract.json`    | `scripts/session-start.mjs`, or `scripts/fetch-task-contract.mjs` | `authorize-tool.mjs`, `build-execution-report.mjs` | no, gitignored         |
| `artifacts/unit-junit.xml`        | `vitest` via `npm run test:unit:ci`                               | `build-execution-report.mjs`                       | no                     |
| `artifacts/acceptance-junit.xml`  | `vitest` via `npm run test:acceptance:ci`                         | `build-execution-report.mjs`                       | no                     |
| `artifacts/codeql/**.sarif`       | `github/codeql-action/analyze`                                    | `check-sarif.mjs`                                  | no                     |
| `artifacts/report.json`           | `scripts/build-execution-report.mjs`                              | reviewers, uploaded as `execution-report`          | no                     |
| `.github/copilot-instructions.md` | `scripts/sync-agent-instructions.mjs`                             | Copilot surfaces that do not read `AGENTS.md`      | yes, generated         |

Everything under `artifacts/` is derived state. If it were committed, the
repository would quietly become the source of truth again and the contract in
the issue would stop mattering.

---

## Step 0 - The contract exists before anything runs

A human opens an issue from `.github/ISSUE_TEMPLATE/agent-task.yml` and fills
in goal, authoritative sources, allowed and prohibited scope, constraints,
outputs, success criteria, and stop conditions.

**Why first:** every later step is derived from this. The scope the hook
enforces and the criteria the gate checks both come from here. Nothing in the
repository restates it - see `docs/CONTEXT-ARCHITECTURE.md`.

For a demo, recreate the issue from its seed:

```bash
gh issue create --title "[Agent task] WI-1842 ..." --label agent-task \
  --body-file docs/demo-setup/WI-1842.issue-seed.md
```

## Step 1 - The environment is prepared

`.github/workflows/copilot-setup-steps.yml` runs before the cloud agent starts:
checkout, Node from `.nvmrc`, `npm ci`, a PostgreSQL service, then `typecheck`
and `test:unit` to prove the toolchain works.

**Why:** without it the agent spends task time discovering that the acceptance
suite needs a database. Environment discovery is not reasoning.

## Step 2 - You run the plan prompt

`.github/prompts/plan.prompt.md` names the task and binds it to the
`plan` agent, whose frontmatter is `tools: ["read", "search"]`.

**The agent writes nothing.** The planner has no `edit` and no `shell`, so
"plan first" is a capability, not a request. But that also means it cannot
persist its own plan, and a plan that exists only in a chat thread is not "an
inspectable plan" and not something a second person can review or resume.

The `Stop` hook resolves that tension. It runs outside the agent's tool
boundary - the system persists the artifact, the agent still cannot write - and
opens the **plan-first pull request** Learn's Option A describes: a PR
containing only the plan, no code changes. If the transcript cannot be read it
says so and gives the exact command, rather than reporting success and
persisting nothing.

> A plan is generated. The agent opens a pull request that contains only the
> plan (no code changes yet). Reviewers discuss, refine, and approve the plan
> directly in the PR. After approval, the agent proceeds to implement the plan
> in follow-up commits or a new PR.
>
> - [Separate planning, reasoning, and execution](https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/4-plan-reason-execution)

The issue is not the place for it. Learn lists issues under "context and
intent" - that is the contract. The plan is a _proposal about_ that intent, and
proposals are reviewed in pull requests. Putting it there also makes approval a
real review event with a person attached, instead of a thumbs-up on a comment.

The plan must map every success criterion in the issue to the check that will
prove it. That mapping is what Step 7 later verifies mechanically.

## Step 3 - A human approves the plan

Approving a plan is cheaper than reviewing a diff, which is the entire argument
for keeping Steps 2 and 4 apart. The approval happens in the plan PR's review,
so it is recorded the same way every other decision in the repository is.

One check runs here: **Plan Gate** (`.github/workflows/plan-gate.yml`) reads the
pull request description and fails unless it carries a plan that states scope,
success criteria, and a rollback or escalation path. Learn's own snippet checks
that `pull_request_template.md` exists in the repository; that passes on a PR
whose description is empty, because it proves the template exists rather than
that this PR used it. `scripts/check-plan.mjs` checks the description instead.

Implementation then lands as follow-up commits on the same branch, so the
approved plan and the diff that claims to implement it stay in one review.

Approve it **on the issue**, not in the chat. The implementer reads the comment,
so implementation can begin in a fresh session rather than inheriting the
planning conversation - which explored options, read files it will not touch,
and argued with itself. Handing that forward through conversation context is the
agent-to-agent chatter that versioned artifacts replace.

## Step 4 - The contract resolves itself at session start

The task is an **input**, so it is named, never inferred. There are exactly two
ways it enters a session, and both are explicit:

| Where              | How                                                       | Used by                |
| ------------------ | --------------------------------------------------------- | ---------------------- |
| `UserPromptSubmit` | the issue number given to `/plan <n>` or `/implement <n>` | interactive sessions   |
| `SessionStart`     | the `AGENT_TASK_ISSUE` environment variable               | CI and the cloud agent |

`scripts/resolve-task.mjs` runs on `UserPromptSubmit`. It reads the issue with
`gh issue view`, caches the parsed contract at `artifacts/task-contract.json`
and the approved plan at `artifacts/task-plan.md`. On a prompt that does not
invoke a task agent it returns immediately and makes no network call.

`scripts/session-start.mjs` calls the same resolver, so both paths produce
byte-identical artifacts.

Branch-name matching and "the only open `agent-task` issue" used to resolve the
task as well. Both are gone. They were usually right, which is exactly why
nobody checked them - and a session governed by the wrong contract is worse
than a session told it has none.

When nothing resolves, the hook clears any cached contract so an unrelated
session is not judged against a task nobody is working on, and the boundary
becomes ungoverned: reads allowed, out-of-scope writes and unlisted commands
ask, dangerous commands still denied.

**Why automatic:** a contract you must remember to fetch is a contract that will
be missing exactly when it matters, and the boundary would quietly fall back to
the repository-wide default. Making it a step in a runbook is not engineering.

**Why it never falls back to a seed file:** `docs/demo-setup/*.issue-seed.md`
exists to recreate an issue for a demo. Treating one as the contract would hide
the fact that the real issue was never read - which is precisely the failure
this design exists to prevent.

`npm run contract:fetch -- --issue <n>` remains available for pinning a specific
issue, and is on the tool allowlist so the boundary can bootstrap itself.

## Step 5 - The agent implements, one gated tool call at a time

The `implement` agent has `tools: ["read", "search", "edit", "shell"]`.

Before **every** tool call, `.github/hooks/authorize-tool.json` runs
`node scripts/authorize-tool.mjs`:

1. `parsePayload()` extracts the tool call from stdin, tolerating shell noise.
2. `loadTaskContract()` reads `artifacts/task-contract.json`.
3. `classifyTool()` works out the capability from the tool name, and
   `evaluateToolCall()` decides:
   - read - always allowed
   - edit - allowed only inside `inputs.scope.allowed`
   - shell - denied on publishing, dependency installs, environment
     enumeration, outbound network, destructive SQL; otherwise allowed only if
     it matches the validation allowlist
   - unknown - **`ask`**, so a human decides and the reason names the tool

Classifying by capability rather than by an allowlist of names matters because
tool names differ per harness and keep growing. Denying unknown names breaks the
agent on its first unfamiliar read, and a broken hook gets switched off.

**Why before and not after:** a check that runs after the tool has executed is a
log entry, not a boundary. This is also why the decision does not read the
model's reasoning - see `docs/fixtures/untrusted-issue-comment.md`.

Path-scoped rules in `.github/instructions/*.instructions.md` load only for the
files being edited, so a migration change never has to read the test rules.

## Step 6 - The Stop hook runs validation and builds the evidence

When the implement agent stops, its `Stop` hook runs
`node scripts/agent-stop.mjs`, which performs the bundle in the only order that
works:

```bash
npm run test:unit:ci        # writes artifacts/unit-junit.xml
npm run test:acceptance:ci  # writes artifacts/acceptance-junit.xml
npm run evidence            # writes artifacts/report.json
```

If the report is not `ready_for_review` the stop is **blocked** and the agent
receives the specific gap - which criterion is unproven, which evidence is
missing. An environment failure does not block: a database that is not running
is not the agent's to repair, and looping on it would spend turns and credits
for nothing.

This is why "done" is not a claim the agent gets to make.

Nobody has to type these commands after an agent turn. They remain available for
working without the implement agent:

```bash
npm run db:up
npm run validate            # instructions:check, lint, typecheck, unit
npm run test:acceptance     # against PostgreSQL
```

`npm run validate` starts with `instructions:check`, which fails if
`.github/copilot-instructions.md` has drifted from `AGENTS.md`. Durable context
is validated like code because it behaves like code.

## Step 7 - How the evidence report decides

`scripts/build-execution-report.mjs`:

1. reads the contract, or exits **2** if none is resolved,
2. parses both JUnit files for counts and `<testcase name="...">` values,
3. matches each criterion's `provenBy` against those names,
4. records which evidence is present, and where the contract came from,
5. writes `artifacts/report.json` and exits **1** unless the decision is
   `ready_for_review`.

**Why the ordering is forced:** the report is an index over evidence that
already exists. Run it before the suites and it can only report absence. This is
why the Stop hook runs the suites first rather than trusting a previous run.

A green unit suite proves none of WI-1842's criteria: all six are proven by the
acceptance suite. Delete `artifacts/acceptance-junit.xml` and rebuild - the
decision flips to `review_required`, `criteriaProven` drops to `0/6`, and the
exit code becomes `1`.

Matching on `provenBy` also means weakening a test cannot fake completion.
Rename the test that proves a criterion and the criterion becomes unproven, even
though every test still passes.

## Step 8 - The pull request

Open a PR whose body follows `.github/pull_request_template.md` - Intent, Plan,
Evidence bundle, Review, Limits - and includes `Closes #<issue>`.

**Why the keyword matters:** the Acceptance workflow greps the PR body for it to
find the contract. Without it the workflow **fails** with "No task issue
linked". There is deliberately no seed-file fallback: grading a change against a
contract it never claimed would be worse than not grading it, and a hardcoded
task id in a workflow would judge every unlinked pull request against one work
item.

## Step 9 - CI re-runs the gates independently

Four workflows, none of which trusts the agent's local run.

| Check        | Workflow                | Enforces                                                                                                                             |
| ------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `quality`    | `ci.yml`                | lint, typecheck, unit; uploads `unit-test-evidence`                                                                                  |
| `acceptance` | `acceptance.yml`        | PostgreSQL service, both suites, resolves the contract, builds the report; uploads `acceptance-test-evidence` and `execution-report` |
| `analyze`    | `codeql.yml`            | CodeQL, then `check-sarif.mjs` fails the run on any finding                                                                          |
| `review`     | `dependency-review.yml` | `npm audit --audit-level=high`                                                                                                       |

Inside `acceptance.yml` the order mirrors Steps 4 and 6, but CI resolves the
contract itself rather than trusting the agent's session:

```
npm run test:unit:ci
npm run test:acceptance:ci
Resolve the task contract      -> artifacts/task-contract.json
Build execution report         -> artifacts/report.json
Upload execution report
```

The last three steps carry `if: always()`, so the report is produced even when
the suites fail. A report that only appears on success is not evidence; the
failing run is the one a reviewer needs.

`.github/CODEOWNERS` adds a human gate on `/migrations/` and `/src/services/`.

### Evidence expires; the pull request does not

Microsoft Learn lists what GitHub keeps as the system of record - "repositories
and branches, commits and pull requests, issues and discussions (context and
intent), workflow runs and artifacts (evidence), review history (decisions)" -
and separately states that "workflow logs and artifacts are retained for 90 days
by default and automatically deleted afterward". Private repositories can extend
this to 400 days; public repositories cannot exceed 90.

The layer Learn labels "(evidence)" is therefore the one that expires. An
evidence bundle that lives only in artifacts becomes a dead link after the
retention window, and "missing evidence = failure" would then be true of every
audited change.

So the run does both:

| Where                                            | What                                                         | Lifetime                        |
| ------------------------------------------------ | ------------------------------------------------------------ | ------------------------------- |
| `execution-report` artifact                      | full `report.json`                                           | 90 days, set explicitly         |
| `acceptance-test-evidence`, `unit-test-evidence` | JUnit XML                                                    | 90 days                         |
| `codeql-sarif-evidence`                          | SARIF                                                        | 90 days                         |
| **pull request comment**                         | decision, per-criterion coverage, which evidence was present | **as long as the pull request** |

`scripts/publish-evidence.mjs` writes that comment and rewrites it in place on
each run rather than appending. It carries the verdict, every criterion with the
test that proved it, and any absent evidence - so a reviewer reading the pull
request in a year still learns what was verified, even though the links no
longer resolve. This follows Learn's own guidance to include "links to workflow
runs and relevant artifacts in the PR under an 'Evidence' section".

Retention is set explicitly in the workflow rather than inherited from the
organization default, because Learn's guidance is that artifacts be "retained
long enough for audits and incident response" and a default is not a decision.

## Step 10 - Independent review

The `risk-reviewer` agent is `tools: ["read", "search"]` - it cannot edit and
cannot run commands, so it can neither repair what it finds nor be the reason a
fix looks verified. It reads the diff, the tests, and the artifacts, not the
implementer's summary, and returns per-criterion coverage plus one
recommendation: merge, revise, revert, or escalate.

## Step 11 - If something is red, classify before retrying

```bash
npm run repair:check artifacts/attempts.json
```

`scripts/repair-budget.mjs` normalizes each failure into a signature - stripping
run ids, durations, paths and numbers - then decides:

- policy failure (permission, 403) - **escalate immediately**; a permission
  problem is not a prompting problem,
- environment, context or reasoning failure - one bounded repair,
- same signature twice, or three attempts - **escalate**.

**Why normalization matters:** without it every attempt looks like a new
failure, because the timestamp moved, and the loop never stops.

Fix the layer the classification points at, then return to Step 5.

## Step 12 - Ready to merge

The pull request is ready when all four checks are green, `report.json` says
`ready_for_review` with every criterion proven, the reviewer recommends merge,
CODEOWNERS approval exists for protected paths, and Limits records what was not
validated.

A human merges. Agents propose; humans and policy accept.

---

## Known limitations

**`copilot-setup-steps.yml` does not resolve the contract.** It does not need
to: the `SessionStart` hook does, and it fires for Copilot cloud agent and
Copilot CLI as well as VS Code. Setup steps prepare the toolchain; the contract
is session state.

**`UserPromptSubmit` is documented to return only the common output fields.**
`continue`, `stopReason` and `systemMessage` - not `additionalContext`. So the
hook does not inject the contract as text; it writes the artifacts and the agent
profiles tell the agents to read them. That is why the contract is a file and
not a paragraph.

**Whether that hook receives the typed text or the expanded prompt file is not
documented.** `resolve-task.mjs` matches both `/plan 4` and the expanded
`Task issue: #4`, so it behaves the same either way. An unsubstituted
`${input:issue}` stops the turn rather than resolving to a guess.

**Non-interactive runs have no prompt**, so CI and the cloud agent set
`AGENT_TASK_ISSUE`. `npm run contract:fetch -- --issue <n>` is on the tool
allowlist as the manual equivalent.

**When no contract resolves, the session is ungoverned, not restricted.** The
hook clears any cached contract so an unrelated session cannot inherit one.
Reads are allowed, out-of-scope writes and unlisted commands ask, and dangerous
commands are still denied. The boundary is defined by a contract; with no
contract there is nothing to enforce, so it asks rather than pretending.

Check `contractSource` in `report.json` if a run looks suspicious. It names the
issue the grading came from, or says it came from a seed file.

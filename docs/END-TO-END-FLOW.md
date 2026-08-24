# End-to-end flow

From running `plan-wi-1842.prompt.md` to a pull request that is ready to merge.

Every step names the script that runs, the file it reads, the file it writes,
and why that ordering is forced. Nothing here is aspirational: each command was
executed while writing this document.

## The files that move between steps

| File | Written by | Read by | Committed? |
| --- | --- | --- | --- |
| the GitHub issue | a human, via the **Agent task** template | everything, indirectly | n/a - it is not a file |
| `artifacts/task-contract.json` | `scripts/session-start.mjs`, or `scripts/fetch-task-contract.mjs` | `authorize-tool.mjs`, `build-execution-report.mjs` | no, gitignored |
| `artifacts/unit-junit.xml` | `vitest` via `npm run test:unit:ci` | `build-execution-report.mjs` | no |
| `artifacts/acceptance-junit.xml` | `vitest` via `npm run test:acceptance:ci` | `build-execution-report.mjs` | no |
| `artifacts/codeql/**.sarif` | `github/codeql-action/analyze` | `check-sarif.mjs` | no |
| `artifacts/report.json` | `scripts/build-execution-report.mjs` | reviewers, uploaded as `execution-report` | no |
| `.github/copilot-instructions.md` | `scripts/sync-agent-instructions.mjs` | Copilot surfaces that do not read `AGENTS.md` | yes, generated |

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

`.github/prompts/plan-wi-1842.prompt.md` names the task and binds it to the
`plan` agent, whose frontmatter is `tools: ["read", "search"]`.

**Nothing is written.** The planner has no `edit` and no `shell`, so
"plan first" is a capability, not a request. The plan is produced as text and
belongs in the pull request description or an issue comment.

The plan must map every success criterion in the issue to the check that will
prove it. That mapping is what Step 7 later verifies mechanically.

## Step 3 - A human approves the plan

The only step with no automation. Approving a plan is cheaper than reviewing a
diff, which is the entire argument for keeping Steps 2 and 4 apart.

## Step 4 - The contract resolves itself at session start

The `SessionStart` hook runs `node scripts/session-start.mjs`. It identifies the
issue that defines the current task, reads it with `gh issue view`, caches the
parsed contract at `artifacts/task-contract.json`, and injects it into the
conversation.

Workspace hooks fire for every agent session, so discovery is split. The
workspace hook only consults `AGENT_TASK_ISSUE` and the branch name, and makes
no network call when neither identifies a task. The three task agents declare
the same hook in their frontmatter with `--allow-sole-issue`, because choosing
one of them is itself the signal that the session is about the task.

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

## Step 6 - Local validation

```bash
npm run db:up
npm run validate            # instructions:check, lint, typecheck, unit
npm run test:acceptance     # against PostgreSQL
```

`npm run validate` starts with `instructions:check`, which fails if
`.github/copilot-instructions.md` has drifted from `AGENTS.md`. Durable context
is validated like code because it behaves like code.

A green unit suite proves none of WI-1842's criteria: all six are proven by the
acceptance suite. That is not an opinion, it is visible in Step 7's output.

## Step 6b - The Stop hook closes the loop

When the implement agent stops, its `Stop` hook runs
`node scripts/agent-stop.mjs`: both suites, then the execution report. If the
report is not `ready_for_review` the stop is **blocked** and the agent receives
the specific gap - which criterion is unproven, which evidence is missing.

An environment failure does not block. A database that is not running is not the
agent's to repair, and looping on it would spend turns and credits for nothing.

This is why "done" is not a claim the agent gets to make. The commands below
still work by hand, and CI runs them again regardless.

## Step 7 - The evidence report

```bash
npm run test:unit:ci        # writes artifacts/unit-junit.xml
npm run test:acceptance:ci  # writes artifacts/acceptance-junit.xml
npm run evidence            # writes artifacts/report.json
```

`scripts/build-execution-report.mjs`:

1. reads the contract, or exits **2** if none is resolved,
2. parses both JUnit files for counts and `<testcase name="...">` values,
3. matches each criterion's `provenBy` against those names,
4. records which evidence is present, and where the contract came from,
5. writes `artifacts/report.json` and exits **1** unless the decision is
   `ready_for_review`.

**Why the ordering is forced:** the report is an index over evidence that
already exists. Run it before the suites and it can only report absence.

Try it: delete `artifacts/acceptance-junit.xml` and run it again. The decision
flips to `review_required`, `criteriaProven` drops to `0/6`, and the exit code
becomes `1`.

## Step 8 - The pull request

Open a PR whose body follows `.github/pull_request_template.md` - Intent, Plan,
Evidence bundle, Review, Limits - and includes `Closes #<issue>`.

**Why the keyword matters:** the Acceptance workflow greps the PR body for it to
find the contract. Without it CI falls back to the seed file, which still works
but records a weaker provenance.

## Step 9 - CI re-runs the gates independently

Four workflows, none of which trusts the agent's local run.

| Check | Workflow | Enforces |
| --- | --- | --- |
| `quality` | `ci.yml` | lint, typecheck, unit; uploads `unit-test-evidence` |
| `acceptance` | `acceptance.yml` | PostgreSQL service, both suites, resolves the contract, builds the report; uploads `acceptance-test-evidence` and `execution-report` |
| `analyze` | `codeql.yml` | CodeQL, then `check-sarif.mjs` fails the run on any finding |
| `review` | `dependency-review.yml` | `npm audit --audit-level=high` |

Inside `acceptance.yml` the order is exactly Step 4 → Step 7:

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

## Known limitation

`copilot-setup-steps.yml` does **not** resolve the task contract, because the
issue number is not reliably available to that workflow. The cloud agent must
therefore run Step 4 itself as its first action; `.github/agents/implement.agent.md`
instructs it to.

If it forgets, nothing breaks unsafely - the hook falls back to the narrow
repository-wide default, which is the correct failure direction for a security
boundary - but the denials will say "outside the approved scope" rather than
naming the task, and a task with a narrower scope than the default would not be
enforced. Check `contractSource` in `report.json` if a run looks suspicious.

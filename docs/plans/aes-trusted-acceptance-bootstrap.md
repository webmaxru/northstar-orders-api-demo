# Plan: AES-TRUSTED-ACCEPTANCE-BOOTSTRAP

## Objective
Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. Publish `trusted-acceptance` on the validated original PR head from App 5075466. Temporarily restore `repository-controls` to its original Actions integration 15368; issue #22 separately owns any later rebind.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2e3cd083399661947b98b420f66ce7a9523ca68b`. This replaces the previous proposal because issue #24 now explicitly binds the post-merge status to the original PR head and original status identities. The prior PR #25 approval is invalid. No implementation or settings change is authorized until this exact revision is independently approved.

### Bootstrap target and scope
- The migration target is the single human-reviewed parent PR to `main` that contains the approved publisher changes. Do not use a feature-branch publisher run as proof of a main-target status.
- For only that bootstrap, temporarily remove `repository-controls` and `trusted-acceptance` from ruleset `23998987` for at most 60 minutes; retain `evidence`, all other required contexts, strict mode, PR/CODEOWNERS, environments, and no bypass actors.
- While either trusted status is absent, the evidence report may be at most `ready_for_review`; never report `ready_for_acceptance`.
- After the parent PR merges, dispatch the protected main publisher with its exact source run ID/attempt. Verify the merged PR and publish trusted-acceptance from App `5075466` to the original PR head.
- Restore `repository-controls` to integration `15368` and `trusted-acceptance` to integration `5075466`. Issue #22 owns the later repository-controls integration change.

### Planned approach
1. Prove preflight: all remaining required checks pass, evidence is truthful, no unrelated main merge is in flight, and publisher/rollback are ready. Otherwise do not open the window.
2. Resolve both ordinary open PR runs and the one merged migration PR using exact same-repo workflow/run/attempt/base/head/task/plan/merge metadata.
3. Keep the publisher on protected default-branch code and the existing App; never check out/execute PR code or consume unverified artifacts.
4. Run the single authorized two-context window, merge through normal human review, dispatch trusted publisher post-merge, verify trusted status on original head, and restore the original contexts before 60 minutes.
5. On any failure, restore the exact prior ruleset state and stop.

## Scope and files to change
- `.github/workflows/governed-change.yml`
- `.github/workflows/publish-evidence.yml`
- `.github/workflows/system-maintenance-approval.yml`
- `scripts/resolve-workflow-pr.mjs`
- `scripts/resolve-workflow-run.mjs`
- `scripts/publish-acceptance-status.mjs`
- `scripts/select-execution-plan.mjs`
- `scripts/build-execution-report.mjs`
- `tests/unit/resolve-workflow-pr.test.ts`
- `tests/unit/resolve-workflow-run.test.ts`
- `tests/unit/publish-acceptance-status.test.ts`
- `tests/unit/build-execution-report.test.ts`
- `docs/architecture.md`

Prohibited paths and operations:
- `src/**`
- `migrations/**`
- `package.json`
- `package-lock.json`
- `.github/governance/**`
- `.github/zizmor.yml`
- `all workflow files not listed under Allowed scope`
- `production resources or deployment`
- `all hosted settings except the single authorized bootstrap operation on ruleset 23998987: temporarily remove only `repository-controls` and `trusted-acceptance` required-context entries for at most 60 minutes, then restore `repository-controls` to integration 15368 and `trusted-acceptance` to integration 5075466; no other ruleset or environment changes`
- `any changes to other required status contexts, their integration IDs, strict status policy, pull-request requirements, CODEOWNERS review, bypass actors, force-push/deletion rules, or protected environments`
- `creating/installing a new GitHub App, changing App installation permissions, generating keys, changing secrets, credentials, or account settings`
- `adding administrator or secret-inventory credentials to any pull_request job or PR-controlled process`
- `broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted run metadata`
- `trusting or executing artifacts produced by pull-request-controlled code as proof of external repository controls`
- `claiming `ready_for_acceptance` while trusted statuses are absent, failed, stale, or mismatched`
- `scanner suppressions, severity downgrades, or blanket ignore rules`
- `changes to issue #20's approved plan or issue #22's ruleset/bootstrap scope`
- `merging or approving this implementation PR or any other PR`

## Success criteria
- AC1 | The publisher resolves exactly one same-repository PR for a stacked base and exact source head; it accepts a closed PR only for the authorized migration when source run and merge commit are validated | resolves stacked and merged same-repository PR bases
- AC2 | `trusted-acceptance` is emitted only by App 5075466 for the exact current PR head after the trusted report is `ready_for_acceptance` | publishes trusted acceptance only for validated head
- AC3 | Missing, stale, failed, or mismatched evidence never produces success and migration evidence never claims acceptance | rejects stale publisher run provenance
- AC4 | The bootstrap removes only the two named contexts for at most 60 minutes, preserves `evidence` and all other requirements, adds no bypass actor, and restores the original integrations 15368 and 5075466 | preserves hosted-control and approval boundaries
- AC5 | PR workflows receive no privileged credentials and the protected publisher never checks out or executes PR code | publisher never executes pull request code
- AC6 | The implementation passes focused/full validation and records exact hosted status identity and ruleset restoration | records complete trusted-acceptance validation

## Evidence
- Exact pre-window, intermediate and restored ruleset 23998987 snapshots proving only the two named contexts were absent temporarily, all other rules unchanged, strict mode true, and bypass actors empty.
- Preflight showing every remaining required check passes, evidence remains `ready_for_review` at most while trusted statuses are absent, no unrelated main merge is in flight, and rollback is ready.
- Resolver results binding the completed source workflow/event/run/attempt to the exact same-repository PR, original head/base, merge commit, issue/plan, and artifact/report digests.
- Protected publisher log and status API result proving `trusted-acceptance` was created by App 5075466 on the exact original PR head only after `ready_for_acceptance`.
- Post-window ruleset verification showing repository-controls restored to integration 15368, trusted-acceptance restored to integration 5075466, other fields unchanged, and no bypass actor.
- Focused/full validation command outputs, exact test counts, candidate SHA, and hosted run URLs; if any preflight fails, a blocked report and unchanged ruleset.

## Decisions and handoffs
- The owner authorized the one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning; execution is allowed only under this independently approved exact plan.
- The current source failure is protected publisher run 36236293245, which rejected stacked PR #23 because the resolver required a main base. For the approved bootstrap, the migration parent PR is on main; its source run is re-evaluated after merge through protected workflow_dispatch.
- The active status identities remain repository-controls 15368 and trusted-acceptance 5075466 in the final state of this issue. Issue #22 owns the later repository-controls rebind; do not overlap its ruleset mutation here.
- The prior PR #25 head 86d965c7c1164d212f3936aee72ae09a51d3963a approval is invalid after the issue contract changed. The new plan must receive a fresh independent review.
- Issue #24 is a prerequisite for issue #22, which is a prerequisite for issue #20. Refresh and re-approve dependent plans after any shared-base change.

## Risks
- Temporarily removing two required contexts lowers protection; keep all other contexts required, pause unrelated main merges, cap the window at 60 minutes, and restore immediately on deviation.
- The publisher may fail to resolve the merged PR or the evidence may not become ready_for_acceptance; if so, rollback rather than claim success.
- A status on the wrong original head, merge commit, run attempt or plan could satisfy an unintended change; bind and verify all identities.
- The evidence workflow could accidentally label an incomplete migration accepted; it must remain `ready_for_review` until trusted statuses are present.
- Concurrent ruleset edits or unrelated merges can invalidate the saved before-state and rollback; abort on drift.

## Rollback and escalation
- Never start the window unless all preflight conditions pass and the exact prior ruleset snapshot is saved.
- On any failure, restore repository-controls integration 15368 and trusted-acceptance integration 5075466, confirm all other protections and empty bypass list, and stop.
- Never add a bypass actor, disable the ruleset, lower strictness, remove evidence, expose credentials to PR code, or exceed 60 minutes.
- If exact restoration cannot be confirmed, stop all other work and escalate to the repository owner.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP",
  "contractDigest": "bf78e3bed2e3e8b9df7fac63f9f41d1fa44857b3d4aff6891374c3f7c607dae4",
  "baseSha": "2e3cd083399661947b98b420f66ce7a9523ca68b",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. Publish `trusted-acceptance` on the validated original PR head from App 5075466. Temporarily restore `repository-controls` to its original Actions integration 15368; issue #22 separately owns any later rebind.",
  "scope": {
    "allowed": [
      ".github/workflows/governed-change.yml",
      ".github/workflows/publish-evidence.yml",
      ".github/workflows/system-maintenance-approval.yml",
      "scripts/resolve-workflow-pr.mjs",
      "scripts/resolve-workflow-run.mjs",
      "scripts/publish-acceptance-status.mjs",
      "scripts/select-execution-plan.mjs",
      "scripts/build-execution-report.mjs",
      "tests/unit/resolve-workflow-pr.test.ts",
      "tests/unit/resolve-workflow-run.test.ts",
      "tests/unit/publish-acceptance-status.test.ts",
      "tests/unit/build-execution-report.test.ts",
      "docs/architecture.md"
    ],
    "prohibited": [
      "src/**",
      "migrations/**",
      "package.json",
      "package-lock.json",
      ".github/governance/**",
      ".github/zizmor.yml",
      "all workflow files not listed under Allowed scope",
      "production resources or deployment",
      "all hosted settings except the single authorized bootstrap operation on ruleset 23998987: temporarily remove only `repository-controls` and `trusted-acceptance` required-context entries for at most 60 minutes, then restore `repository-controls` to integration 15368 and `trusted-acceptance` to integration 5075466; no other ruleset or environment changes",
      "any changes to other required status contexts, their integration IDs, strict status policy, pull-request requirements, CODEOWNERS review, bypass actors, force-push/deletion rules, or protected environments",
      "creating/installing a new GitHub App, changing App installation permissions, generating keys, changing secrets, credentials, or account settings",
      "adding administrator or secret-inventory credentials to any pull_request job or PR-controlled process",
      "broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted run metadata",
      "trusting or executing artifacts produced by pull-request-controlled code as proof of external repository controls",
      "claiming `ready_for_acceptance` while trusted statuses are absent, failed, stale, or mismatched",
      "scanner suppressions, severity downgrades, or blanket ignore rules",
      "changes to issue #20's approved plan or issue #22's ruleset/bootstrap scope",
      "merging or approving this implementation PR or any other PR"
    ]
  },
  "operations": [
    "workflow-change",
    "security-change"
  ],
  "steps": [
    "Reconfirm the live task digest, exact base, ruleset 23998987 identities, strict mode, empty bypass list, and all protected environment/app identities. Record the original repository-controls integration 15368 and trusted-acceptance integration 5075466; do not change settings during preflight.",
    "Implement and locally validate the resolver/publisher on an isolated branch. Normal source runs require one open same-repository PR; only the single authorized bootstrap dispatch may resolve a merged PR, and then it must verify merged=true, merge_commit_sha, source run/attempt, original head/base, task and plan.",
    "Use a protected-default-branch workflow_dispatch with source-run-id and source-run-attempt inputs for post-merge verification. Treat inputs as untrusted; validate source workflow/event/repository/run/attempt/PR/base/head/task/plan/artifacts before import. Never checkout or execute PR code in the publisher.",
    "Keep privileged online audit and status publication in the existing trusted-publisher environment with App 5075466. Emit `trusted-acceptance` on the exact original PR head only after the revalidated report is `ready_for_acceptance`. Do not use or publish repository-controls from App 5075466 in this task; that identity migration belongs to issue #22.",
    "Preflight the exact parent migration PR: all checks that remain required must pass; `evidence` must remain required and report at most `ready_for_review` while the two trusted contexts are absent; unrelated main merges must be paused; publisher and rollback must be ready. Abort if any condition fails.",
    "Only after preflight passes, start one maximum-60-minute window and remove exactly `repository-controls` and `trusted-acceptance` entries from ruleset 23998987. Keep `evidence`, all other contexts, strict mode, PR review, CODEOWNERS, environments and the empty bypass list unchanged.",
    "Merge the single human-reviewed parent migration PR through the ordinary PR path; the agent does not merge. Once the updated publisher is on the protected default branch, dispatch it with the exact source run/attempt for the merged PR, validate merge identity, publish trusted-acceptance from App 5075466 to the original PR head, and verify the status creator and report decision.",
    "Restore the two required contexts before the 60-minute deadline: repository-controls to its original Actions integration 15368 and trusted-acceptance to App 5075466. Re-read ruleset 23998987 and verify every other field, context, strict setting and empty bypass list is unchanged.",
    "If any check fails, evidence is not ready_for_acceptance, source identity is ambiguous, status is wrong, ruleset drifts, or the deadline is at risk, immediately restore both original context identities, verify the rest of the ruleset and stop. Never extend the window or add bypass.",
    "Add focused positive/negative tests for open and merged PR resolution, run/attempt/source identity, exact App status, post-merge report binding, truthful ready_for_review behavior during migration, and no PR-code execution. Run the focused tests plus npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all; record exact outcomes and candidate SHA."
  ],
  "requiredChecks": [
    "plan-contract",
    "plan-approval",
    "scope-policy",
    "quality",
    "acceptance",
    "dependency-review",
    "codeql",
    "secret-scan",
    "merge-validation",
    "governance-policy",
    "validation-authority",
    "repository-controls",
    "human-review",
    "evidence"
  ],
  "successCriteria": [
    {
      "id": "AC1",
      "statement": "The publisher resolves exactly one same-repository PR for a stacked base and exact source head; it accepts a closed PR only for the authorized migration when source run and merge commit are validated",
      "provenBy": "resolves stacked and merged same-repository PR bases"
    },
    {
      "id": "AC2",
      "statement": "`trusted-acceptance` is emitted only by App 5075466 for the exact current PR head after the trusted report is `ready_for_acceptance`",
      "provenBy": "publishes trusted acceptance only for validated head"
    },
    {
      "id": "AC3",
      "statement": "Missing, stale, failed, or mismatched evidence never produces success and migration evidence never claims acceptance",
      "provenBy": "rejects stale publisher run provenance"
    },
    {
      "id": "AC4",
      "statement": "The bootstrap removes only the two named contexts for at most 60 minutes, preserves `evidence` and all other requirements, adds no bypass actor, and restores the original integrations 15368 and 5075466",
      "provenBy": "preserves hosted-control and approval boundaries"
    },
    {
      "id": "AC5",
      "statement": "PR workflows receive no privileged credentials and the protected publisher never checks out or executes PR code",
      "provenBy": "publisher never executes pull request code"
    },
    {
      "id": "AC6",
      "statement": "The implementation passes focused/full validation and records exact hosted status identity and ruleset restoration",
      "provenBy": "records complete trusted-acceptance validation"
    }
  ],
  "evidence": [
    "Exact pre-window, intermediate and restored ruleset 23998987 snapshots proving only the two named contexts were absent temporarily, all other rules unchanged, strict mode true, and bypass actors empty.",
    "Preflight showing every remaining required check passes, evidence remains `ready_for_review` at most while trusted statuses are absent, no unrelated main merge is in flight, and rollback is ready.",
    "Resolver results binding the completed source workflow/event/run/attempt to the exact same-repository PR, original head/base, merge commit, issue/plan, and artifact/report digests.",
    "Protected publisher log and status API result proving `trusted-acceptance` was created by App 5075466 on the exact original PR head only after `ready_for_acceptance`.",
    "Post-window ruleset verification showing repository-controls restored to integration 15368, trusted-acceptance restored to integration 5075466, other fields unchanged, and no bypass actor.",
    "Focused/full validation command outputs, exact test counts, candidate SHA, and hosted run URLs; if any preflight fails, a blocked report and unchanged ruleset."
  ],
  "decisionsAndHandoffs": [
    "The owner authorized the one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning; execution is allowed only under this independently approved exact plan.",
    "The current source failure is protected publisher run 36236293245, which rejected stacked PR #23 because the resolver required a main base. For the approved bootstrap, the migration parent PR is on main; its source run is re-evaluated after merge through protected workflow_dispatch.",
    "The active status identities remain repository-controls 15368 and trusted-acceptance 5075466 in the final state of this issue. Issue #22 owns the later repository-controls rebind; do not overlap its ruleset mutation here.",
    "The prior PR #25 head 86d965c7c1164d212f3936aee72ae09a51d3963a approval is invalid after the issue contract changed. The new plan must receive a fresh independent review.",
    "Issue #24 is a prerequisite for issue #22, which is a prerequisite for issue #20. Refresh and re-approve dependent plans after any shared-base change."
  ],
  "risks": [
    "Temporarily removing two required contexts lowers protection; keep all other contexts required, pause unrelated main merges, cap the window at 60 minutes, and restore immediately on deviation.",
    "The publisher may fail to resolve the merged PR or the evidence may not become ready_for_acceptance; if so, rollback rather than claim success.",
    "A status on the wrong original head, merge commit, run attempt or plan could satisfy an unintended change; bind and verify all identities.",
    "The evidence workflow could accidentally label an incomplete migration accepted; it must remain `ready_for_review` until trusted statuses are present.",
    "Concurrent ruleset edits or unrelated merges can invalidate the saved before-state and rollback; abort on drift."
  ],
  "rollbackAndEscalation": [
    "Never start the window unless all preflight conditions pass and the exact prior ruleset snapshot is saved.",
    "On any failure, restore repository-controls integration 15368 and trusted-acceptance integration 5075466, confirm all other protections and empty bypass list, and stop.",
    "Never add a bypass actor, disable the ruleset, lower strictness, remove evidence, expose credentials to PR code, or exceed 60 minutes.",
    "If exact restoration cannot be confirmed, stop all other work and escalate to the repository owner."
  ],
  "planDigest": "470522e1a5deb54464fbbf26292bc5e7ac16bb7e4f16cc114fab70f7d97426b0"
}
```
<!-- northstar:plan-contract:end -->

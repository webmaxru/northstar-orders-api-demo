# Plan: AES-TRUSTED-ACCEPTANCE-BOOTSTRAP

## Objective
Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. Publish `trusted-acceptance` on the validated original PR head from App 5075466. Temporarily restore `repository-controls` to its original Actions integration 15368; issue #22 separately owns any later rebind.

## Plan
Risk: high. Base: `main` at `b65c2de5c8224342c72c37eeed7ef9f965ad8a2c`. This replaces the prior stacked-base proposal. The issue #24 implementation PR must target protected main so the new manual publisher exists on the protected default branch after the human-reviewed merge. The prior PR #25 approval is invalid. No implementation or setting mutation is authorized until this exact revised plan is independently approved.

### Current failure evidence
- Protected publisher run `36236293245` failed resolving the earlier stacked PR because it required a PR targeting `main`.
- A protected-default-branch manual publisher is required after the reviewed migration PR is merged, and it must validate the source run/attempt against the original PR head/base and merge commit.
- Current `main` is `b65c2de5c8224342c72c37eeed7ef9f965ad8a2c`; PR #18 branch is `2e3cd083399661947b98b420f66ce7a9523ca68b`.
- Ruleset `23998987` currently binds repository-controls -> `15368` and trusted-acceptance -> `5075466`; preserve these original identities after the bootstrap.

### Bounded bootstrap
- Remove only `repository-controls` and `trusted-acceptance` for at most 60 minutes. Keep `evidence`, every other check, strict mode, PR review, CODEOWNERS, environments and the empty bypass list unchanged.
- Keep evidence at most `ready_for_review` until the trusted statuses exist.
- Preflight must show remaining checks pass, no unrelated main merge is in flight, and publisher plus rollback are ready. Otherwise do not start.
- After merge, dispatch the new publisher from protected main with exact source run ID/attempt; validate merged PR metadata and emit trusted-acceptance on its original head.
- Restore repository-controls -> Actions `15368` and trusted-acceptance -> App `5075466`. Issue #22 owns any later rebind.

### Planned implementation
1. Implement the migration directly from the exact approved main SHA; do not stack on PR #18.
2. Support normal open same-repo PRs and the single merged migration PR mode, with exact source-run and merge identity validation before any artifact import.
3. Keep privileged code and App credentials on protected default-branch workflow_dispatch; never run PR code in the publisher.
4. Preflight all remaining checks and evidence, then use one human-reviewed main PR and the bounded window only if all gates pass.
5. Post-merge, validate source run/attempt, PR, original base/head, merge commit, task/plan and report; publish trusted-acceptance from App `5075466` to original head.
6. Restore original context identities before 60 minutes; rollback immediately on any mismatch.

## Scope and files to change
- `scripts/import-evidence-artifacts.mjs`
- `scripts/check-scope.mjs`
- `scripts/publish-evidence.mjs`
- `tests/unit/import-evidence-artifacts.test.ts`
- `tests/unit/combined-workflow.test.ts`
- `tests/unit/execution-report.test.ts`
- `tests/unit/check-scope.test.ts`
- `tests/unit/publish-evidence.test.ts`
- `.github/workflows/governed-change.yml`
- `.github/workflows/publish-evidence.yml`
- `.github/workflows/system-maintenance-approval.yml`
- `scripts/resolve-workflow-pr.mjs`
- `scripts/resolve-workflow-run.mjs`
- `scripts/publish-acceptance-status.mjs`
- `scripts/import-evidence-artifacts.mjs`
- `scripts/check-scope.mjs`
- `scripts/publish-evidence.mjs`
- `tests/unit/import-evidence-artifacts.test.ts`
- `tests/unit/combined-workflow.test.ts`
- `tests/unit/execution-report.test.ts`
- `tests/unit/check-scope.test.ts`
- `tests/unit/publish-evidence.test.ts`
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
- Exact approved main base SHA, plus pre-window, intermediate and restored ruleset 23998987 snapshots showing only the two named contexts temporarily absent, all other rules unchanged, strict mode true and bypass actors empty.
- Preflight record that every remaining required check passes, evidence is required and at most ready_for_review while statuses are absent, unrelated main merges are paused, and rollback is ready.
- Resolver output tying source workflow/event/run/attempt to the same-repository PR, original plan base/head, merge commit, live task/plan, and artifact/report/policy digests.
- Protected default-branch workflow_dispatch run and commit status proving trusted-acceptance was created by App 5075466 on the original PR head only after ready_for_acceptance.
- Post-window ruleset proof: repository-controls restored to integration 15368 and trusted-acceptance to integration 5075466; no other field or bypass list changed.
- Focused/full validation command outputs, exact test counts, candidate SHA and hosted run URLs; if any preflight fails, blocked report and unchanged ruleset.

## Decisions and handoffs
- The owner authorized the one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning; actual changes require this current plan approval and a passing live preflight.
- The issue #24 implementation PR must target protected main at the exact approved main base because its workflow_dispatch handler must exist on default-branch code after merge. PR #18 stacked base is not an acceptable implementation base for this task.
- Current main is b65c2de5c8224342c72c37eeed7ef9f965ad8a2c; PR #18 is stacked at 2e3cd083399661947b98b420f66ce7a9523ca68b. The revised plan will retarget plan PR #25 to main and invalidate the old approval.
- Current ruleset identities: repository-controls -> Actions 15368; trusted-acceptance -> App 5075466. Issue #24 restores those identities. Issue #22 separately owns the later repository-controls rebind.
- Issue #24 is a prerequisite for issue #22, which is a prerequisite for issue #20. Refresh dependent task plans and approvals after shared-base changes.

## Risks
- Temporarily removing two required contexts lowers protection; retain every other context, pause unrelated main merges, cap the window at 60 minutes and restore immediately on deviation.
- The post-merge workflow_dispatch may fail to validate the original source run or merge commit; if so, rollback rather than claim acceptance.
- A status on the wrong original head/run/plan could satisfy a required check incorrectly; bind and re-read all immutable identities.
- The plan-only PR itself has shown an intermittent PostgreSQL acceptance race; this is tracked separately in issue #16 and must not be hidden or fixed outside issue #24 scope.
- A concurrent main merge or ruleset change can invalidate the plan base and rollback snapshot; abort on any drift.

## Rollback and escalation
- Never start the window unless the exact main base, all remaining passing checks, evidence behavior, pause on unrelated main merges and rollback procedure are confirmed.
- On any failure, restore repository-controls integration 15368 and trusted-acceptance integration 5075466, confirm every other protection and empty bypass list, and stop.
- Never add a bypass actor, disable ruleset enforcement, lower strictness, remove evidence, expose credentials to PR code or exceed 60 minutes.
- If exact restoration cannot be verified immediately, stop all other work and escalate to the repository owner.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP",
  "contractDigest": "6f2aa618514637ae7b8a579c8ed73efdd79d86394dff391a85fcf63ed9cca026",
  "baseSha": "b65c2de5c8224342c72c37eeed7ef9f965ad8a2c",
  "baseBranch": "main",
  "risk": "high",
  "objective": "Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. Publish `trusted-acceptance` on the validated original PR head from App 5075466. Temporarily restore `repository-controls` to its original Actions integration 15368; issue #22 separately owns any later rebind.",
  "scope": {
    "allowed": [
      "scripts/import-evidence-artifacts.mjs",
      "scripts/check-scope.mjs",
      "scripts/publish-evidence.mjs",
      "tests/unit/import-evidence-artifacts.test.ts",
      "tests/unit/combined-workflow.test.ts",
      "tests/unit/execution-report.test.ts",
      "tests/unit/check-scope.test.ts",
      "tests/unit/publish-evidence.test.ts",
      ".github/workflows/governed-change.yml",
      ".github/workflows/publish-evidence.yml",
      ".github/workflows/system-maintenance-approval.yml",
      "scripts/resolve-workflow-pr.mjs",
      "scripts/resolve-workflow-run.mjs",
      "scripts/publish-acceptance-status.mjs",
      "scripts/import-evidence-artifacts.mjs",
      "scripts/check-scope.mjs",
      "scripts/publish-evidence.mjs",
      "tests/unit/import-evidence-artifacts.test.ts",
      "tests/unit/combined-workflow.test.ts",
      "tests/unit/execution-report.test.ts",
      "tests/unit/check-scope.test.ts",
      "tests/unit/publish-evidence.test.ts",
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
    "Reconfirm the live issue digest, exact `main` SHA, ruleset 23998987 identities, strict mode, empty bypass list, and protected environment/App identities. If main moves before approval or implementation, regenerate the plan for the new immutable base.",
    "Implement and locally validate the resolver/publisher on an isolated branch created directly from the approved `main` base. The implementation PR must target `main` so its workflow_dispatch publisher code is present on protected default-branch code immediately after merge; do not stack it on PR #18 or any feature branch.",
    "Normal source-run resolution requires exactly one open same-repository PR for the run head and permits stacked base refs when those match the immutable source-run metadata and plan. The single bootstrap workflow_dispatch path may process only the exact merged migration PR, and must verify merged=true, merge_commit_sha, source run/attempt, original head/base, task and plan.",
    "Use a protected-default-branch workflow_dispatch with source-run-id and source-run-attempt. Treat every input as untrusted; validate source workflow/event/repository/run/attempt/PR/base/head/merge/task/plan/artifact identity before import. Never check out or execute PR code in the publisher.",
    "For merged bootstrap validation, bind evidence to the source run`s immutable pre-merge base/head and merge commit. Re-evaluate the committed plan, approval, scope, human review, dependency/security/tests, exact run jobs and trusted online controls. Do not compare the original plan base to a mutable post-merge base ref without validating the source-run snapshot.",
    "Keep privileged audit and status publication in the existing trusted-publisher environment using App 5075466. Publish trusted-acceptance on the original PR head only after the fresh report is ready_for_acceptance. Do not publish repository-controls from this App under issue #24; that context stays bound to Actions 15368 until issue #22.",
    "Preflight the implementation PR to main: all checks that will remain required must pass, evidence must stay required and report at most ready_for_review while the two trusted statuses are absent, unrelated main merges must be paused, and publisher plus exact rollback must be ready. Abort on any failed condition.",
    "Only after preflight, start one maximum-60-minute window and remove exactly repository-controls and trusted-acceptance entries from ruleset 23998987. Keep evidence, all other contexts, strict mode, PR review, CODEOWNERS, environments and empty bypass list unchanged.",
    "After the human-reviewed implementation PR merges to main, dispatch the new protected publisher from main with exact source run ID/attempt. Validate the merged PR and source metadata; reimport/revalidate trusted source-run artifacts; emit trusted-acceptance from App 5075466 on the original PR head. Verify creator, target SHA and report decision.",
    "Restore the two required contexts before the 60-minute deadline: repository-controls to original Actions integration 15368 and trusted-acceptance to App 5075466. Re-read ruleset 23998987 and verify every other field, context, strict setting and empty bypass list is unchanged.",
    "If any check fails, evidence is not ready_for_acceptance, source identity is ambiguous, status is wrong, ruleset drifts, or the deadline is at risk, immediately restore both original context identities and stop. Never extend the window or add a bypass.",
    "Add focused positive/negative tests for open/stacked and merged PR resolution, source run/attempt/base/head/merge/task/plan binding, trusted status, source artifacts, evidence ready-for-review behavior, and no PR-code execution. Run focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all; record exact results and candidate SHA."
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
    "Exact approved main base SHA, plus pre-window, intermediate and restored ruleset 23998987 snapshots showing only the two named contexts temporarily absent, all other rules unchanged, strict mode true and bypass actors empty.",
    "Preflight record that every remaining required check passes, evidence is required and at most ready_for_review while statuses are absent, unrelated main merges are paused, and rollback is ready.",
    "Resolver output tying source workflow/event/run/attempt to the same-repository PR, original plan base/head, merge commit, live task/plan, and artifact/report/policy digests.",
    "Protected default-branch workflow_dispatch run and commit status proving trusted-acceptance was created by App 5075466 on the original PR head only after ready_for_acceptance.",
    "Post-window ruleset proof: repository-controls restored to integration 15368 and trusted-acceptance to integration 5075466; no other field or bypass list changed.",
    "Focused/full validation command outputs, exact test counts, candidate SHA and hosted run URLs; if any preflight fails, blocked report and unchanged ruleset."
  ],
  "decisionsAndHandoffs": [
    "The owner authorized the one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning; actual changes require this current plan approval and a passing live preflight.",
    "The issue #24 implementation PR must target protected main at the exact approved main base because its workflow_dispatch handler must exist on default-branch code after merge. PR #18 stacked base is not an acceptable implementation base for this task.",
    "Current main is b65c2de5c8224342c72c37eeed7ef9f965ad8a2c; PR #18 is stacked at 2e3cd083399661947b98b420f66ce7a9523ca68b. The revised plan will retarget plan PR #25 to main and invalidate the old approval.",
    "Current ruleset identities: repository-controls -> Actions 15368; trusted-acceptance -> App 5075466. Issue #24 restores those identities. Issue #22 separately owns the later repository-controls rebind.",
    "Issue #24 is a prerequisite for issue #22, which is a prerequisite for issue #20. Refresh dependent task plans and approvals after shared-base changes."
  ],
  "risks": [
    "Temporarily removing two required contexts lowers protection; retain every other context, pause unrelated main merges, cap the window at 60 minutes and restore immediately on deviation.",
    "The post-merge workflow_dispatch may fail to validate the original source run or merge commit; if so, rollback rather than claim acceptance.",
    "A status on the wrong original head/run/plan could satisfy a required check incorrectly; bind and re-read all immutable identities.",
    "The plan-only PR itself has shown an intermittent PostgreSQL acceptance race; this is tracked separately in issue #16 and must not be hidden or fixed outside issue #24 scope.",
    "A concurrent main merge or ruleset change can invalidate the plan base and rollback snapshot; abort on any drift."
  ],
  "rollbackAndEscalation": [
    "Never start the window unless the exact main base, all remaining passing checks, evidence behavior, pause on unrelated main merges and rollback procedure are confirmed.",
    "On any failure, restore repository-controls integration 15368 and trusted-acceptance integration 5075466, confirm every other protection and empty bypass list, and stop.",
    "Never add a bypass actor, disable ruleset enforcement, lower strictness, remove evidence, expose credentials to PR code or exceed 60 minutes.",
    "If exact restoration cannot be verified immediately, stop all other work and escalate to the repository owner."
  ],
  "planDigest": "1e50728a673953a6aa8695bf6a1468f1a1ff2c702ac0d7aa838c403321f26c64"
}
```
<!-- northstar:plan-contract:end -->

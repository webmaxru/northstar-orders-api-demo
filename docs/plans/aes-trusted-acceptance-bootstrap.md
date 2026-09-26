# Plan: AES-TRUSTED-ACCEPTANCE-BOOTSTRAP

## Objective
Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. After the parent merge, first restore repository-controls to its original Actions integration 15368 and trusted-acceptance to App 5075466, then run the trusted online audit and publish `trusted-acceptance` on the validated original PR head only if the report is ready_for_acceptance. Issue #22 separately owns any later repository-controls rebind.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2e3cd083399661947b98b420f66ce7a9523ca68b`. The plan-only and child implementation PRs use the active parent branch; the final bootstrap window applies only to parent PR #18 targeting main. This revision corrects the ordering: restore the original required contexts before the trusted online audit. The previous PR #25 approval is invalid. No implementation or settings mutation is authorized until this exact revision is independently approved.

### Parent bootstrap sequence
- Child implementation PR: target `agent/implement/aes-surface-evidence` at the approved SHA; a human integrates it into parent PR #18.
- Main bootstrap PR: parent PR #18 after issue #24 child code and dependent work are integrated; all checks other than the two named contexts must pass.
- Temporarily remove only `repository-controls` and `trusted-acceptance` for no more than 60 minutes; keep `evidence`, all other checks, strictness, review, CODEOWNERS, environments and no-bypass unchanged.
- Merge PR #18 via normal human review, then immediately restore repository-controls -> Actions `15368` and trusted-acceptance -> App `5075466`.
- Only after restoration, dispatch the trusted publisher on protected main with exact source run/attempt; validate the merged PR and original source snapshot, then publish trusted-acceptance on the original PR head only after ready_for_acceptance.
- If the audit/status fails, preserve the restored original ruleset, publish no success, and keep future merges blocked. Issue #22 owns the later repository-controls rebind.

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
- Exact parent base, plan approval, and ruleset 23998987 before/during/after snapshots; prove only the two named contexts were absent during the bounded window, all other rules unchanged, strict mode true and bypass actors empty.
- Preflight evidence that all remaining contexts pass, evidence is truthful, unrelated main merges are paused, and rollback is ready.
- Resolver output binding source workflow/event/run/attempt, parent PR, original head/base, merge commit, task/plan, report digest and freshness.
- Protected main publisher run and status API response proving `trusted-acceptance` came from App 5075466 and targets the original PR head only after ready_for_acceptance.
- Final ruleset state showing repository-controls integration 15368 and trusted-acceptance integration 5075466 restored with all other fields unchanged.
- Focused/full validation results and hosted workflow links; if trusted audit fails after restoration, a blocked report and no success status.

## Decisions and handoffs
- The owner authorized planning one maximum-60-minute removal of only repository-controls and trusted-acceptance; the setting change is performed only under this exact approved plan.
- The child implementation PR targets the parent task branch at 2e3cd083399661947b98b420f66ce7a9523ca68b. A human integrates it into parent PR #18; the agent does not merge.
- The main-target migration window applies only after parent PR #18 contains the approved child code and dependent updates, and its preflight has passed.
- The issue24 publisher code restores original identities: repository-controls 15368 and trusted-acceptance 5075466. Issue #22 owns the later repository-controls rebind.
- Issue #24 is a prerequisite for issue #22, which blocks issue #20. Refresh and re-approve dependent plans after shared-base changes.

## Risks
- Temporarily removing two required contexts reduces protection; keep all remaining gates, pause unrelated main merges, cap at 60 minutes and restore before trusted audit.
- The post-restore trusted audit may still fail because external controls are unavailable; if so, publish no success status and keep future merges blocked.
- A wrong or stale source run, original base/head, merge commit, task/plan or status target could falsely satisfy a control; bind every identity.
- The evidence job could claim ready_for_acceptance while statuses are absent; it must report at most ready_for_review during the window.
- Concurrent main merges or ruleset edits can invalidate the rollback snapshot; abort on drift.

## Rollback and escalation
- Never start the window unless all remaining required checks, evidence readiness, unrelated-merge pause and rollback conditions are verified.
- On any issue during the window, restore repository-controls integration 15368 and trusted-acceptance integration 5075466 immediately, verify all other protections and empty bypass list, and stop.
- After restoration, if trusted publisher/audit/status does not pass, do not alter more settings, do not publish success, and keep later merges blocked pending a new human-approved decision.
- Never add a bypass actor, disable enforcement, lower strictness, expose credentials to PR code, or exceed 60 minutes.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP",
  "contractDigest": "a9a49b16475c26b8a755a07dc1b26dcf069fc3745c9b9e049ceeb59c392cee53",
  "baseSha": "2e3cd083399661947b98b420f66ce7a9523ca68b",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. After the parent merge, first restore repository-controls to its original Actions integration 15368 and trusted-acceptance to App 5075466, then run the trusted online audit and publish `trusted-acceptance` on the validated original PR head only if the report is ready_for_acceptance. Issue #22 separately owns any later repository-controls rebind.",
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
    "Reconfirm the live issue digest, exact parent base 2e3cd083399661947b98b420f66ce7a9523ca68b, ruleset 23998987 identities, strict mode, empty bypass list and protected environment/App identities. The plan-only and child implementation PRs stay on the parent task branch.",
    "Implement and locally validate the resolver/publisher on an isolated child branch from the approved parent base. The child PR targets agent/implement/aes-surface-evidence. The temporary main ruleset window applies only to parent PR #18 after child code and dependent changes are reviewed and integrated.",
    "Normal source-run resolution requires one open same-repository PR for the exact run head and declared base. The single bootstrap workflow_dispatch may process only the exact merged parent PR and must verify merged=true, merge_commit_sha, source run/attempt, original head/base, task and plan.",
    "Use protected-default-branch workflow_dispatch with source-run-id and source-run-attempt. Treat all inputs as untrusted; validate source workflow/event/repository/run/attempt/PR/base/head/merge/task/plan/artifact identity before import. Never check out or execute PR code in the publisher.",
    "For a merged bootstrap PR, bind the report to the source-run snapshot of original base/head and the verified merge commit. Revalidate plan, approval, scope, human review, source artifacts and task identity without treating mutable post-merge base SHA as the original plan base.",
    "Preflight parent PR #18: all contexts that will remain required must pass, evidence must pass while reporting no more than ready_for_review, unrelated main merges must be paused, and publisher/rollback must be ready. Abort if any condition fails.",
    "Only after preflight, start one maximum-60-minute window and remove exactly repository-controls and trusted-acceptance entries from ruleset 23998987. Keep evidence, every other context, strict mode, PR review, CODEOWNERS, environments and the empty bypass list unchanged.",
    "Merge parent PR #18 through the normal human-reviewed path; the agent does not merge. Immediately restore repository-controls to Actions integration 15368 and trusted-acceptance to App 5075466, and verify all other settings are unchanged before running the audit.",
    "After restoration, dispatch the protected publisher from main with the exact source run ID/attempt. Validate the merged parent PR and original source head/base/merge commit, run the online audit with App 5075466, and publish trusted-acceptance only if the fresh report is ready_for_acceptance. Target the original validated PR head.",
    "Capture the status creator/context/source-run and final ruleset state. If the trusted audit or status fails, do not report acceptance; leave the restored required contexts intact, stop subsequent merges and record the exact blocker.",
    "Add positive/negative tests for open/stacked and merged PR resolution, original base/head snapshots, merge ancestry, source run/attempt/task/plan/artifact binding, App status target and truthful ready_for_review behavior. Run focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all; record exact outcomes, counts and candidate SHA."
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
    "Exact parent base, plan approval, and ruleset 23998987 before/during/after snapshots; prove only the two named contexts were absent during the bounded window, all other rules unchanged, strict mode true and bypass actors empty.",
    "Preflight evidence that all remaining contexts pass, evidence is truthful, unrelated main merges are paused, and rollback is ready.",
    "Resolver output binding source workflow/event/run/attempt, parent PR, original head/base, merge commit, task/plan, report digest and freshness.",
    "Protected main publisher run and status API response proving `trusted-acceptance` came from App 5075466 and targets the original PR head only after ready_for_acceptance.",
    "Final ruleset state showing repository-controls integration 15368 and trusted-acceptance integration 5075466 restored with all other fields unchanged.",
    "Focused/full validation results and hosted workflow links; if trusted audit fails after restoration, a blocked report and no success status."
  ],
  "decisionsAndHandoffs": [
    "The owner authorized planning one maximum-60-minute removal of only repository-controls and trusted-acceptance; the setting change is performed only under this exact approved plan.",
    "The child implementation PR targets the parent task branch at 2e3cd083399661947b98b420f66ce7a9523ca68b. A human integrates it into parent PR #18; the agent does not merge.",
    "The main-target migration window applies only after parent PR #18 contains the approved child code and dependent updates, and its preflight has passed.",
    "The issue24 publisher code restores original identities: repository-controls 15368 and trusted-acceptance 5075466. Issue #22 owns the later repository-controls rebind.",
    "Issue #24 is a prerequisite for issue #22, which blocks issue #20. Refresh and re-approve dependent plans after shared-base changes."
  ],
  "risks": [
    "Temporarily removing two required contexts reduces protection; keep all remaining gates, pause unrelated main merges, cap at 60 minutes and restore before trusted audit.",
    "The post-restore trusted audit may still fail because external controls are unavailable; if so, publish no success status and keep future merges blocked.",
    "A wrong or stale source run, original base/head, merge commit, task/plan or status target could falsely satisfy a control; bind every identity.",
    "The evidence job could claim ready_for_acceptance while statuses are absent; it must report at most ready_for_review during the window.",
    "Concurrent main merges or ruleset edits can invalidate the rollback snapshot; abort on drift."
  ],
  "rollbackAndEscalation": [
    "Never start the window unless all remaining required checks, evidence readiness, unrelated-merge pause and rollback conditions are verified.",
    "On any issue during the window, restore repository-controls integration 15368 and trusted-acceptance integration 5075466 immediately, verify all other protections and empty bypass list, and stop.",
    "After restoration, if trusted publisher/audit/status does not pass, do not alter more settings, do not publish success, and keep later merges blocked pending a new human-approved decision.",
    "Never add a bypass actor, disable enforcement, lower strictness, expose credentials to PR code, or exceed 60 minutes."
  ],
  "planDigest": "a2aece5b0f782c3461262a8646f91cc3a6e24af8dbf7d95859b6949861aab5bb"
}
```
<!-- northstar:plan-contract:end -->

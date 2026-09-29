# Plan: AES-TRUSTED-ACCEPTANCE-BOOTSTRAP

## Objective
Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. After the parent merge, first restore repository-controls to its original Actions integration 15368 and trusted-acceptance to App 5075466, then run the trusted online audit and publish `trusted-acceptance` on the validated original PR head only if the report is ready_for_acceptance. Issue #22 separately owns any later repository-controls rebind.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2ce3cf8a69439c22246de7d5449ce186e23bd584`. Parent PR #18 advanced after PR #28 began from `17e7a5c5f1fbf88a92351043c675f555f4c7f04f`; this revision binds the child continuation to the exact current parent head for safe integration. The prior PR #25 approval is invalid for this base. Do not rebase or resume implementation until this revision receives a fresh independent native approval. The plan-only and child implementation PRs remain on the parent branch; the temporary main ruleset window applies only to parent PR #18 after child changes are integrated. This revision authorizes refreshing the plan and then reconciling the child branch only; it authorizes no setting mutation or PR merge.

### Current parent status
- Parent PR #18 is approved by `vibeprogrammer` on exact head `2ce3cf8a69439c22246de7d5449ce186e23bd584` (review `5356731352`), but `trusted-acceptance` remains **failure** at run `36612770691`.
- Source report run `36610256698` is truthfully `ready_for_review` with 14/15 criteria proven; AC15 remains unverified. Review-event run `36612195971` reports `review_required` because its source evidence is incomplete. The `human-review` job also fails because GitHub reports `reviewDecision` as not `APPROVED` despite the exact REST approval, and `repository-controls` metadata lookups remain unavailable with HTTP 403.
- These are observed blockers, not acceptance and not permission to change ruleset settings. The refreshed child plan and branch must not claim those gates pass. The temporary window remains forbidden until a live preflight proves every remaining check passes and the protected publisher can restore fresh trusted statuses safely.

### Parent bootstrap sequence
- Existing child implementation PR #28 targets parent branch `agent/implement/aes-surface-evidence` from `17e7a5c5f1fbf88a92351043c675f555f4c7f04f`. After fresh approval of this revision, rebase the child branch onto exact parent head `2ce3cf8a69439c22246de7d5449ce186e23bd584`, resolve only plan-authorized conflicts, and rerun all focused and full validation before requesting fresh child review.
- A human integrates reviewed child changes into parent PR #18; the agent does not merge.
- Main bootstrap PR: parent PR #18 only after issue #24 child code and dependent work are integrated. Before the window, preflight all remaining checks and prove the protected publisher can restore both trusted statuses on the exact source head.
- Remove only `repository-controls` and `trusted-acceptance` for at most 60 minutes; keep `evidence`, all other checks, strictness, human review, CODEOWNERS, environments and no bypass actors.
- Merge parent #18 through normal human review, then immediately restore repository-controls -> Actions `15368` and trusted-acceptance -> App `5075466`.
- Dispatch the protected publisher from main with exact source run/attempt and approved plan identities; validate merge/source provenance before import; run live governance audit after restoration; publish trusted-acceptance on original head only after ready_for_acceptance.
- On any audit/status failure, publish no success and block later merges. Issue #22 owns the later repository-controls rebind.

## Scope and files to change
- `scripts/resolve-workflow-pr.d.mts`
- `scripts/resolve-workflow-run.d.mts`
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
- `scripts/resolve-workflow-pr.d.mts`
- `scripts/resolve-workflow-run.d.mts`
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
- Exact parent base and plan approval; ruleset 23998987 before/during/after snapshots prove only the two named contexts were temporarily absent, all other rules unchanged, strict mode true and bypass actors empty.
- Preflight record for parent PR #18: all remaining contexts pass, evidence is required and truthful, unrelated main merges are paused, and rollback is ready.
- Resolver output binds source workflow/event/run/attempt to same-repository parent PR, original head/base, merge commit, task/plan PR/head/digest, artifact/report digest and freshness.
- Protected main workflow_dispatch run and API status response prove trusted-acceptance came from App 5075466 and targets the original PR head only after ready_for_acceptance.
- Final ruleset state proves repository-controls is 15368 and trusted-acceptance is 5075466; all other fields unchanged and no bypass actor.
- Focused/full validation outputs, exact test counts, candidate SHA and hosted workflow URLs; if preflight fails, a blocked report and unchanged settings.

## Decisions and handoffs
- The user authorized the one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning; any settings change requires this exact independent plan approval and a passing preflight.
- The child implementation was initially authorized from parent head `17e7a5c5f1fbf88a92351043c675f555f4c7f04f`; its continuation now requires this fresh plan approval and exact rebase onto `2ce3cf8a69439c22246de7d5449ce186e23bd584`. A human integrates the reviewed child into parent PR #18; the agent does not merge.
- The temporary main-target window applies only to parent PR #18 after issue #24 child code and dependent changes are integrated. Current main is `b65c2de5c8224342c72c37eeed7ef9f965ad8a2c`; current approved parent head is `2ce3cf8a69439c22246de7d5449ce186e23bd584`.
- The final status identities for issue #24 remain repository-controls 15368 and trusted-acceptance 5075466. Issue #22 owns the later repository-controls rebind.
- Issue #24 is a prerequisite for #22, which blocks #20; dependent plans require refresh and approval after shared-base changes.

## Risks
- Temporarily removing two required contexts reduces protection; preserve all other contexts, pause unrelated main merges, cap at 60 minutes and restore immediately on deviation.
- The post-merge workflow_dispatch could be supplied stale/hostile inputs; re-resolve immutable source run/attempt, PR, base/head, merge, task and plan before artifacts.
- The online controls audit must observe restored ruleset state; auditing while contexts are absent would yield untrustworthy evidence.
- A trusted status on the wrong original head/run/plan could satisfy an unintended commit; bind and re-read all immutable identities.
- If the trusted report is not ready_for_acceptance, no success status is allowed and later merges remain blocked.

## Rollback and escalation
- Never start the window unless every preflight condition passes and the exact prior ruleset snapshot is saved.
- Immediately restore repository-controls 15368 and trusted-acceptance 5075466 on any failure, then verify all other rules and the empty bypass list.
- Never add a bypass actor, disable ruleset enforcement, lower strictness, remove evidence, expose credentials to PR code, or exceed 60 minutes.
- If exact restoration cannot be verified, stop all other work and escalate to the repository owner.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP",
  "contractDigest": "93a40b201cc7f90011a4c5a9c37a1f4aac3db9b4eee6a71ebb3510b33ded7f87",
  "baseSha": "2ce3cf8a69439c22246de7d5449ce186e23bd584",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. After the parent merge, first restore repository-controls to its original Actions integration 15368 and trusted-acceptance to App 5075466, then run the trusted online audit and publish `trusted-acceptance` on the validated original PR head only if the report is ready_for_acceptance. Issue #22 separately owns any later repository-controls rebind.",
  "scope": {
    "allowed": [
      "scripts/resolve-workflow-pr.d.mts",
      "scripts/resolve-workflow-run.d.mts",
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
      "scripts/resolve-workflow-pr.d.mts",
      "scripts/resolve-workflow-run.d.mts",
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
    "Reconfirm the live issue digest, exact parent base 2ce3cf8a69439c22246de7d5449ce186e23bd584, ruleset 23998987 identities, strict mode, empty bypass list, and protected App/environment identities. Record the exact parent review, trusted-acceptance failure, truthful ready_for_review report, unresolved human-review status, and repository-controls HTTP 403; do not represent any as passing.",
    "After this refreshed plan receives an independent native approval, rebase existing child PR #28 from its original 17e7a5c5f1fbf88a92351043c675f555f4c7f04f base onto the approved parent head 2ce3cf8a69439c22246de7d5449ce186e23bd584. Resolve only conflicts within the existing allowed scope, preserve the approved task and intent, then rerun focused and full validation on the new exact head.",
    "Normal source-run resolution requires exactly one open same-repository PR for the immutable run head and declared base. Only the single bootstrap workflow_dispatch may process the exact merged parent PR, and it must verify merged=true, merge_commit_sha, original source run/attempt, original head/base, task and plan.",
    "Add workflow_dispatch inputs for source run ID, source run attempt, parent PR number, approved bootstrap plan PR number and immutable plan head. Treat every input as untrusted; resolve and validate all source workflow/event/repository/run/attempt/PR/base/head/merge/task/plan/artifact identities before downloading or importing any artifacts.",
    "For the merged bootstrap, compare the verified merge commit against the immutable base/head snapshot recorded by the source run. Do not treat the mutable closed-PR base SHA as the original plan base. Prove the merge commit contains the source head according to the checked GitHub comparison response.",
    "Keep privileged audit and status publication in protected default-branch code using the existing trusted-publisher environment/App 5075466. Never checkout or execute PR code. Before audit, restore the two original required contexts so the online governance audit observes the true live ruleset.",
    "Preflight parent PR #18: all remaining checks pass, evidence stays required and reports at most ready_for_review while trusted statuses are absent, unrelated main merges are paused, and the protected publisher is proven ready to issue both trusted statuses after the parent merge on the exact original head. Abort the settings window if any preflight fails.",
    "After preflight, start one maximum-60-minute window and remove exactly repository-controls and trusted-acceptance from ruleset 23998987. Keep evidence, every other context, strict mode, human review, CODEOWNERS, environments and the empty bypass list unchanged.",
    "Merge parent PR #18 through the human-reviewed path; the agent does not merge. Immediately restore repository-controls to Actions integration 15368 and trusted-acceptance to App 5075466. Verify all other settings are unchanged before running the protected publisher audit.",
    "After restoration, dispatch the protected publisher from main with the exact source run ID/attempt, parent PR number, and plan PR/head. Revalidate the merged PR, task/approved plan, source artifacts, human review, scope and live controls; publish trusted-acceptance only if the fresh report is ready_for_acceptance. Target the original validated PR head.",
    "Capture exact status creator/context/source-run and final ruleset. If trusted audit/status fails, publish no success, leave the original required contexts intact, block later merges and report the exact blocker.",
    "Add positive/negative tests for open/stacked and merged PR resolution, original base/head snapshots, merge ancestry, run/attempt/task/plan/artifact binding, App status target, strict restoration, and truthful ready_for_review behavior. Run focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all; record exact outcomes, counts and candidate SHA."
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
    "Exact parent base and plan approval; ruleset 23998987 before/during/after snapshots prove only the two named contexts were temporarily absent, all other rules unchanged, strict mode true and bypass actors empty.",
    "Preflight record for parent PR #18: all remaining contexts pass, evidence is required and truthful, unrelated main merges are paused, and rollback is ready. The current trusted-acceptance failure is recorded as pre-bootstrap evidence and is never represented as success.",
    "Current parent evidence: PR #18 head 2ce3cf8a69439c22246de7d5449ce186e23bd584 has an exact native approval (review 5356731352), but hosted human-review remains failed, repository-controls is unavailable with HTTP 403, and trusted-acceptance is failure at run 36612770691. Report 36610256698 is ready_for_review with AC15 unverified; review-event report 36612195971 is review_required.",
    "Resolver output binds source workflow/event/run/attempt to same-repository parent PR, original head/base, merge commit, task/plan PR/head/digest, artifact/report digest and freshness.",
    "Protected main workflow_dispatch run and API status response prove trusted-acceptance came from App 5075466 and targets the original PR head only after ready_for_acceptance.",
    "Final ruleset state proves repository-controls is 15368 and trusted-acceptance is 5075466; all other fields unchanged and no bypass actor.",
    "Focused/full validation outputs, exact test counts, candidate SHA and hosted workflow URLs; if preflight fails, a blocked report and unchanged settings."
  ],
  "decisionsAndHandoffs": [
    "The user authorized the one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning; any settings change requires this exact independent plan approval and a passing preflight.",
    "The issue #24 implementation began from parent head 17e7a5c5f1fbf88a92351043c675f555f4c7f04f. Rebase it onto the currently approved parent head 2ce3cf8a69439c22246de7d5449ce186e23bd584 only after this updated plan is independently approved. A human integrates the reviewed child into parent PR #18; the agent does not merge.",
    "The temporary main-target window applies only to parent PR #18 after issue #24 child code and dependent changes are integrated. Current main is b65c2de5c8224342c72c37eeed7ef9f965ad8a2c and current parent head is 2ce3cf8a69439c22246de7d5449ce186e23bd584.",
    "The current trusted-acceptance failure is pre-bootstrap evidence; the publisher must prove it can issue a fresh success on the original validated head after the merged workflow is restored.",
    "The final status identities for issue #24 remain repository-controls 15368 and trusted-acceptance 5075466. Issue #22 owns the later repository-controls rebind.",
    "Issue #24 is a prerequisite for #22, which blocks #20; dependent plans require refresh and approval after shared-base changes."
  ],
  "risks": [
    "Temporarily removing two required contexts reduces protection; preserve all other contexts, pause unrelated main merges, cap at 60 minutes and restore immediately on deviation.",
    "The post-merge workflow_dispatch could be supplied stale/hostile inputs; re-resolve immutable source run/attempt, PR, base/head, merge, task and plan before artifacts.",
    "The online controls audit must observe restored ruleset state; auditing while contexts are absent would yield untrustworthy evidence.",
    "A trusted status on the wrong original head/run/plan could satisfy an unintended commit; bind and re-read all immutable identities.",
    "If the trusted report is not ready_for_acceptance, no success status is allowed and later merges remain blocked.",
    "The current failed trusted-acceptance status cannot be treated as success; the protected publisher must re-evaluate restored controls after the merge before status publication."
  ],
  "rollbackAndEscalation": [
    "Never start the window unless every preflight condition passes and the exact prior ruleset snapshot is saved. The current trusted-acceptance failure is not a pass or permission to bypass the stop condition.",
    "Immediately restore repository-controls 15368 and trusted-acceptance 5075466 on any failure, then verify all other rules and the empty bypass list.",
    "Never add a bypass actor, disable ruleset enforcement, lower strictness, remove evidence, expose credentials to PR code, or exceed 60 minutes.",
    "If exact restoration cannot be verified, stop all other work and escalate to the repository owner."
  ],
  "planDigest": "101fca8e174834156cca25300e2af1e6c776025e24faf392ea11dd280af7304f"
}
```
<!-- northstar:plan-contract:end -->

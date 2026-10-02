# Plan: AES-TRUSTED-ACCEPTANCE-BOOTSTRAP

## Objective
Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. After the parent merge, first restore repository-controls to its original Actions integration 15368 and trusted-acceptance to App 5075466, then run the trusted online audit and publish `trusted-acceptance` on the validated original PR head only if the report is ready_for_acceptance. Issue #22 separately owns any later repository-controls rebind.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2ce3cf8a69439c22246de7d5449ce186e23bd584`. The owner amended Issue #24 on 2026-10-02 to allow only the Fastify 5.12.1 to 5.12.5 update and the minimum lockfile update needed to resolve `brace-expansion` at 5.0.12 or later. This changes the task digest; prior PR #25 approval is invalid and this plan must receive a fresh independent native approval. PR #28 is at `cb507e20cd0cb8fdeabfedaece67510a651757b0` on the exact parent base and has exact-head approval `5391273930`, but its hosted checks still fail. This plan authorizes only a plan refresh and, after approval, the bounded dependency updates plus already-planned resolver/workflow work; it authorizes no settings mutation or PR merge.

### Current parent and child status
- Parent PR #18 remains at `2ce3cf8a69439c22246de7d5449ce186e23bd584`; its required `trusted-acceptance` status remains **failure**. The latest known source report is `ready_for_review` with AC15 unverified; no fresh passing trusted status on the exact parent head is recorded.
- PR #28 is stacked on the parent branch at `cb507e20cd0cb8fdeabfedaece67510a651757b0`; `vibeprogrammer` approved that exact head (review `5391273930`). Governed Change run `37001565136` passes current-head `human-review`, plan, scope, quality, acceptance, CodeQL, merge validation, secret scan and governance. `dependency-review`, `repository-controls` and `evidence` fail. The report remains `review_required` with `validation-authority` absent and trusted current-run revalidation incomplete.
- Trusted Publish Evidence run `37001721147` executed protected `main` at `b65c2de` and failed to resolve the stacked PR: deployed default-branch code only found PRs targeting `main`. PR #28 contains the exact-declared-base resolver fix, but that code is not yet deployed on protected `main`.
- These are blockers, not acceptance or permission to change ruleset settings. Do not claim hosted acceptance or start the 60-minute window until dependency validation, trusted stacked-base publication, and the exact-parent preflight are proven.

### Parent bootstrap sequence
- PR #28 already targets parent branch `agent/implement/aes-surface-evidence` at exact base `2ce3cf8a69439c22246de7d5449ce186e23bd584`; do not rebase it unless the parent advances. After fresh approval of this amended plan, apply only the authorized dependency updates and rerun the exact audit/tests below. PR #28 must remain draft until applicable local/hosted checks are ready.
- A human integrates reviewed child changes into parent PR #18; the agent does not merge. Do not integrate PR #28 while dependency-review, repository-controls or evidence is failing.
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
- `package.json`
- `package-lock.json`

### Bounded dependency remediation
- Change only the direct `fastify` dependency from `5.12.1` to `5.12.5`.
- Update only the lockfile entries needed for that Fastify update and to resolve `brace-expansion` to `5.0.12` or later, addressing the three advisories listed in Issue #24.
- Do not add dependencies, apply overrides, update unrelated packages, or introduce unrelated lockfile churn. If the lockfile cannot be fixed within this boundary, stop and request a further plan amendment.
- `npm audit --audit-level=high` must exit successfully with zero high or critical advisories; record the exact resolved versions and output.

Prohibited paths and operations:
- `src/**`
- `migrations/**`
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
- Dependency audit evidence: Fastify resolves to 5.12.5, brace-expansion resolves to at least 5.0.12, only the authorized package files changed, and `npm audit --audit-level=high` has zero high/critical advisories.
- Current child evidence: PR #28 head `cb507e20cd0cb8fdeabfedaece67510a651757b0` has current-head approval (review `5391273930`); Governed Change run `37001565136` passes human-review but fails dependency-review, repository-controls and evidence. Trusted Publish Evidence run `37001721147` fails on protected main `b65c2de` because the deployed resolver rejects the stacked parent base.
- Resolver output binds source workflow/event/run/attempt to same-repository parent PR, original head/base, merge commit, task/plan PR/head/digest, artifact/report digest and freshness.
- Protected main workflow_dispatch run and API status response prove trusted-acceptance came from App 5075466 and targets the original PR head only after ready_for_acceptance.
- Final ruleset state proves repository-controls is 15368 and trusted-acceptance is 5075466; all other fields unchanged and no bypass actor.
- Focused/full validation outputs, exact test counts, candidate SHA and hosted workflow URLs; if preflight fails, a blocked report and unchanged settings.

## Decisions and handoffs
- The user authorized the one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning; any settings change requires this exact independent plan approval and a passing preflight.
- Issue #24 was amended on 2026-10-02 to permit only Fastify 5.12.1 to 5.12.5 and the minimum lockfile change for brace-expansion 5.0.12 or later. This changes the task digest; prior plan PR #25 approval is invalid and a fresh approval is required.
- PR #28 is already on the approved parent base `2ce3cf8a69439c22246de7d5449ce186e23bd584` and has exact-head review `5391273930`. Do not change its base unless the parent advances. A human integrates the reviewed child into parent PR #18 after applicable hosted checks pass; the agent does not merge.
- The temporary main-target window applies only to parent PR #18 after issue #24 child code and dependent changes are integrated. Current main is `b65c2de5c8224342c72c37eeed7ef9f965ad8a2c`; current approved parent head is `2ce3cf8a69439c22246de7d5449ce186e23bd584`.
- The final status identities for issue #24 remain repository-controls 15368 and trusted-acceptance 5075466. Issue #22 owns the later repository-controls rebind.
- Issue #24 is a prerequisite for #22, which blocks #20; dependent plans require refresh and approval after shared-base changes.

## Risks
- Temporarily removing two required contexts reduces protection; preserve all other contexts, pause unrelated main merges, cap at 60 minutes and restore immediately on deviation.
- The post-merge workflow_dispatch could be supplied stale/hostile inputs; re-resolve immutable source run/attempt, PR, base/head, merge, task and plan before artifacts.
- The online controls audit must observe restored ruleset state; auditing while contexts are absent would yield untrustworthy evidence.
- A trusted status on the wrong original head/run/plan could satisfy an unintended commit; bind and re-read all immutable identities.
- Fastify or transitive lockfile remediation could introduce unrelated supply-chain changes; constrain and audit the exact package diff.
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
  "contractDigest": "2d25fc79ffff1aecd2fef10787233865a54a06d0e96a8313a87fa46c6ca70936",
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
      "docs/architecture.md",
      "package.json",
      "package-lock.json"
    ],
    "prohibited": [
      "src/**",
      "migrations/**",
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
    "Reconfirm the amended issue digest 2d25fc79ffff1aecd2fef10787233865a54a06d0e96a8313a87fa46c6ca70936, exact parent base 2ce3cf8a69439c22246de7d5449ce186e23bd584, ruleset 23998987 identities, strict mode, empty bypass list, and protected App/environment identities. Record that PR #28 is exactly approved but its current run still fails dependency-review, repository-controls, and evidence; record trusted Publish Evidence run 37001721147 as failing on the deployed main resolver's stacked-base limitation.",
    "After this amended plan receives a fresh independent native approval, continue PR #28 from its exact approved parent base 2ce3cf8a69439c22246de7d5449ce186e23bd584; do not rebase unless the parent advances. Apply only the permitted dependency updates and rerun focused tests, the full local validation, and hosted checks.",
    "Change only the direct fastify pin from 5.12.1 to 5.12.5. Update package-lock.json only for that Fastify update and to resolve brace-expansion to 5.0.12 or later; make no unrelated dependency changes, additions, overrides, or lockfile churn.",
    "Run npm audit --audit-level=high and require zero high/critical findings; record exact resolved Fastify and brace-expansion versions and the audit output.",
    "Resolve the trusted-publisher blocker without running PR code: the current protected-main Publish Evidence run 37001721147 failed because deployed main at b65c2de only resolves PRs targeting main. Use the approved exact-declared-base resolver change from the candidate only through the reviewed parent/bootstrap path; do not bypass the resolver or dispatch an untrusted workflow.",
    "Normal source-run resolution requires exactly one open same-repository PR for the immutable run head and declared base. Only the single bootstrap workflow_dispatch may process the exact merged parent PR, and it must verify merged=true, merge_commit_sha, original source run/attempt, original head/base, task and plan.",
    "Add workflow_dispatch inputs for source run ID, source run attempt, parent PR number, approved bootstrap plan PR number and immutable plan head. Treat every input as untrusted; resolve and validate all source workflow/event/repository/run/attempt/PR/base/head/merge/task/plan/artifact identities before downloading or importing any artifacts.",
    "For the merged bootstrap, compare the verified merge commit against the immutable base/head snapshot recorded by the source run. Do not treat the mutable closed-PR base SHA as the original plan base. Prove the merge commit contains the source head according to the checked GitHub comparison response.",
    "Keep privileged audit and status publication in protected default-branch code using the existing trusted-publisher environment/App 5075466. Never checkout or execute PR code. Before audit, restore the two original required contexts so the online governance audit observes the true live ruleset.",
    "Preflight parent PR #18: all remaining checks pass, evidence stays required and reports at most ready_for_review while trusted statuses are absent, unrelated main merges are paused, and the protected publisher is proven ready to issue both trusted statuses after the parent merge on the exact original head. Abort the settings window if any preflight fails.",
    "After preflight, start one maximum-60-minute window and remove exactly repository-controls and trusted-acceptance from ruleset 23998987. Keep evidence, every other context, strict mode, human review, CODEOWNERS, environments and the empty bypass list unchanged.",
    "Merge parent PR #18 through the human-reviewed path; the agent does not merge. Immediately restore repository-controls to Actions integration 15368 and trusted-acceptance to App 5075466. Verify all other settings are unchanged before running the protected publisher audit.",
    "After restoration, dispatch the protected publisher from main with the exact source run ID/attempt, parent PR number, and plan PR/head. Revalidate the merged PR, task/approved plan, source artifacts, human review, scope and live controls; publish trusted-acceptance only if the fresh report is ready_for_acceptance. Target the original validated PR head.",
    "Capture exact status creator/context/source-run and final ruleset. If trusted audit/status fails, publish no success, leave the original required contexts intact, block later merges and report the exact blocker.",
    "Add positive/negative tests for bounded dependency changes, open/stacked and merged PR resolution, original base/head snapshots, merge ancestry, run/attempt/task/plan/artifact binding, App status target, strict restoration, and truthful ready_for_review behavior. Run focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all; record exact outcomes, counts, dependency versions and candidate SHA."
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
    "Dependency audit evidence: Fastify resolves to 5.12.5, brace-expansion resolves to at least 5.0.12, only the authorized package files changed, and npm audit --audit-level=high reports zero high/critical findings.",
    "Current child evidence: PR #28 head cb507e20cd0cb8fdeabfedaece67510a651757b0 has exact-head approval review 5391273930; Governed Change run 37001565136 passes human-review but fails dependency-review, repository-controls and evidence. Trusted Publish Evidence run 37001721147 on main b65c2de fails because the deployed resolver cannot resolve the stacked parent base.",
    "Current parent evidence: PR #18 head 2ce3cf8a69439c22246de7d5449ce186e23bd584 has an exact native approval (review 5356731352), but hosted human-review remains failed, repository-controls is unavailable with HTTP 403, and trusted-acceptance is failure at run 36612770691. Report 36610256698 is ready_for_review with AC15 unverified; review-event report 36612195971 is review_required.",
    "Resolver output binds source workflow/event/run/attempt to same-repository parent PR, original head/base, merge commit, task/plan PR/head/digest, artifact/report digest and freshness.",
    "Protected main workflow_dispatch run and API status response prove trusted-acceptance came from App 5075466 and targets the original PR head only after ready_for_acceptance.",
    "Final ruleset state proves repository-controls is 15368 and trusted-acceptance is 5075466; all other fields unchanged and no bypass actor.",
    "Focused/full validation outputs, exact test counts, candidate SHA and hosted workflow URLs; if preflight fails, a blocked report and unchanged settings."
  ],
  "decisionsAndHandoffs": [
    "The user authorized the one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning; any settings change requires this exact independent plan approval and a passing preflight.",
    "Issue #24 was amended on 2026-10-02 to permit only Fastify 5.12.1 to 5.12.5 and the minimum lockfile change for brace-expansion 5.0.12 or later. This changes the task digest; prior plan PR #25 approval is invalid and a fresh approval is required.",
    "PR #28 is already on the approved parent base 2ce3cf8a69439c22246de7d5449ce186e23bd584 and has exact-head review 5391273930. Do not change its base unless the parent advances. A human integrates the reviewed child into parent PR #18 after applicable hosted checks pass; the agent does not merge.",
    "The temporary main-target window applies only to parent PR #18 after issue #24 child code and dependent changes are integrated. Current main is b65c2de5c8224342c72c37eeed7ef9f965ad8a2c and current parent head is 2ce3cf8a69439c22246de7d5449ce186e23bd584.",
    "The current trusted-acceptance failure is pre-bootstrap evidence; the publisher must prove it can issue a fresh success on the original validated head after the merged workflow is restored.",
    "The final status identities for issue #24 remain repository-controls 15368 and trusted-acceptance 5075466. Issue #22 owns the later repository-controls rebind.",
    "Issue #24 is a prerequisite for #22, which blocks #20; dependent plans require refresh and approval after shared-base changes."
  ],
  "risks": [
    "Temporarily removing two required contexts reduces protection; preserve all other contexts, pause unrelated main merges, cap at 60 minutes and restore immediately on deviation.",
    "Fastify or transitive lockfile remediation could introduce unrelated supply-chain changes; constrain and audit the exact package diff.",
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
  "planDigest": "551c11de64117379d4eddda091328f9e317fa17de07f94be2d7eaebc61b822df"
}
```
<!-- northstar:plan-contract:end -->

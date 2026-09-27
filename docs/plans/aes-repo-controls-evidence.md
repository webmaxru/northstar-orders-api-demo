# Plan: AES-REPO-CONTROLS-EVIDENCE

## Objective
Prepare a safe bootstrap and migrate the required `repository-controls` result from an unprivileged pull-request audit to the protected trusted-publisher App. Rebind only the existing required check to that trusted status source, preserve all other protections, and prove a safe rollout/rollback path before changing the rule. Pull-request code must never receive administrator or secret-inventory credentials. The owner has authorized planning one temporary bootstrap exception: remove only the `repository-controls` required context for at most 60 minutes while keeping `trusted-acceptance` and every other required check, strict mode, PR review, CODEOWNERS, and the empty bypass list unchanged. This is planning authorization only; no settings change is authorized until the revised plan itself is independently approved. If the remaining controls cannot safely carry the migration, stop without mutating settings.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `17e7a5c5f1fbf88a92351043c675f555f4c7f04f`. This plan refresh preserves the live issue #22 contract digest and changes only this plan artifact to bind it to the current parent base and record the latest failed preflight. The previous PR #23 approval is invalid. No implementation or ruleset mutation is authorized until this exact plan revision is independently approved.

### Current preflight state
- Parent PR #18 is open at `17e7a5c5f1fbf88a92351043c675f555f4c7f04f`; the required `trusted-acceptance` status is **failure**, targeting trusted run `36312852134`.
- That trusted report is `review_required` with AC15 unproven. The trusted default-branch audit reports `Branch not protected (HTTP 404)` while the active ruleset is present; the PR-side job cannot read protected metadata and reports it unavailable.
- The approved issue #22 exception removes only `repository-controls`; it requires `trusted-acceptance` and all other required checks to remain enforced and passing. This preflight therefore fails. Do not open the 60-minute window or change any hosted setting.
- Issue #24 / plan PR #25 is the separate trusted-acceptance bootstrap prerequisite. Its current plan is also bound to old parent base `2e3cd083399661947b98b420f66ce7a9523ca68b`; refresh that plan and obtain independent approval before implementing it. After that prerequisite is accepted, rerun the issue #22 preflight against the live parent head and exact statuses.

### Required bootstrap preflight
- The active ruleset has no bypass actors; preserve that state.
- The sole temporary exception under consideration is removal of only `repository-controls` for at most 60 minutes. `trusted-acceptance` and every other required context remain mandatory.
- Before any code implementation or setting change, refresh and approve the issue #24 bootstrap plan against the current parent base, then prove the protected publisher emits a fresh passing `trusted-acceptance` for the exact parent head while all other required checks remain passing. If not, stop with no code or settings mutation.

### Planned migration
1. Revalidate issue #22, the parent head, active ruleset 23998987, all required contexts and integration IDs, strict mode, empty bypass list, existing App identity/permissions, and the current PR #18 `trusted-acceptance` status.
2. Wait for the separately approved issue #24 / PR #25 bootstrap to be refreshed against the current parent base, independently approved, implemented, and accepted. Do not implement issue #22 while its prerequisite is stale or incomplete.
3. Prove a no-bypass preflight on the exact current parent head: `trusted-acceptance` from App 5075466 and every other required check must be fresh and passing. The currently observed failure is a stop, not permission to remove either context.
4. If and only if the prerequisite and preflight pass, implement trusted source-run/base resolution, online audit and publisher status from existing App 5075466, with no privileged credentials in PR jobs.
5. During the approved window, remove only `repository-controls`, deploy and verify the trusted producer, then restore that context bound to 5075466. Preserve all other protection fields and the empty bypass list.
6. Roll back the single context to 15368 immediately if any step fails; capture live before/during/after state and validation evidence.

## Scope and files to change
- `.github/workflows/governed-change.yml`
- `.github/workflows/governance-review.yml`
- `.github/workflows/publish-evidence.yml`
- `.github/workflows/system-maintenance-approval.yml`
- `scripts/governance-audit.mjs`
- `scripts/resolve-workflow-run.mjs`
- `scripts/resolve-workflow-pr.mjs`
- `scripts/publish-acceptance-status.mjs`
- `tests/unit/governance-audit.test.ts`
- `tests/unit/resolve-workflow-run.test.ts`
- `tests/unit/resolve-workflow-pr.test.ts`
- `tests/unit/publish-acceptance-status.test.ts`
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
- `all hosted settings except (a) the one authorized temporary removal/restoration of only required context `repository-controls` in ruleset 23998987 for at most 60 minutes and (b) its final rebind from integration_id 15368 to existing trusted publisher App integration_id 5075466`
- `any change to other required status contexts, strict mode, pull-request requirements, CODEOWNERS review, bypass actors, force-push/deletion rules, protected environments, or direct-push rules`
- `creating/installing a new GitHub App, changing App installation permissions, generating keys, changing secrets, credentials, or account settings`
- `adding administrator or secret-inventory credentials to any pull_request job or PR-controlled process`
- `broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted evidence`
- `removing, renaming, weakening, or suppressing required repository-controls or other security checks outside the exact time-bounded bootstrap exception above`
- `trusting or executing artifacts produced by pull-request-controlled code as proof of external repository controls`
- `scanner suppressions, severity downgrades, or blanket ignore rules`
- `changes to issue #20's approved plan or scanner-remediation implementation`

## Success criteria
- AC1 | PR-triggered code never receives administrator or secret-inventory credentials or privileged write permissions | pull request workflows do not expose privileged governance credentials
- AC2 | The trusted publisher emits repository-controls only for an exact verified source workflow run and PR head | publishes repository controls only after exact source identity validation
- AC3 | Missing, stale, mismatched, malformed, or PR-originated evidence remains unavailable/failing and is never represented as pass | rejects mismatched trusted governance report provenance
- AC4 | The bootstrap changes only repository-controls for no more than 60 minutes, keeps every other required context and the empty bypass list intact, and restores the trusted-App binding | preserves hosted-control and approval boundaries
- AC5 | The no-bypass bootstrap reaches the trusted status producer without disabling required checks or adding a bypass actor | verifies repository-controls no-bypass bootstrap
- AC6 | The approved implementation passes focused and complete local validation and records exact hosted outcomes without overstating acceptance | records complete validation for trusted control evidence

## Evidence
- Live ruleset 23998987 before/during/after snapshots showing only the authorized `repository-controls` entry is removed/rebound, all other contexts and strict mode unchanged, and no bypass actor.
- Preflight evidence that `trusted-acceptance` and every other required check can pass on the exact implementation PR while the temporary window is active; if unavailable, record the stop and make no setting change.
- Current blocker evidence: PR #18 head `17e7a5c5f1fbf88a92351043c675f555f4c7f04f` has failed `trusted-acceptance` targeting run `36312852134`; trusted report `36312262826` is `review_required`, with AC15 unproven. Record the issue #24 prerequisite's refreshed plan/base and the later exact successful trusted status before declaring preflight ready.
- Exact protected publisher workflow run, source-run/PR/head identities, trusted audit/report digest and resulting repository-controls status creator/integration 5075466.
- Focused positive/negative tests for untrusted PR credential isolation, stacked-base resolver, trusted status identity, report provenance/freshness and bootstrap rollback.
- Exact focused and full validation commands/results, PostgreSQL acceptance when relevant, candidate SHA and hosted run URLs.
- If preflight is impossible, a blocked report naming the exact remaining decision and confirming no ruleset/settings/code changes.

## Decisions and handoffs
- The owner authorized preparation of this bootstrap plan, including consideration of a one-time maximum 60-minute removal of only the `repository-controls` context; this is not authorization to execute the setting change before the plan is independently approved.
- The prior PR #23 plan revision at head 25d4e771b00a24d5e34b2ba5167707c8c98a1f72 is invalid after issue #22 was amended again; this proposal must be reviewed on its new head.
- The active ruleset currently binds repository-controls to 15368 and trusted-acceptance to 5075466. The PR job cannot read administrator controls; the current protected publisher cannot resolve stacked PR bases and its prior online audit was unavailable.
- Issue #24 / plan PR #25 is the prerequisite for producing trusted-acceptance on the stacked parent. Its plan's base is stale; rebind and independently approve it before implementation. Once it is complete, re-read issue #22's live status and refresh this plan if the parent head changes.
- Issue #20 remains blocked and its previous plan approval does not authorize this migration. If the shared base changes, issue #20 must be refreshed and re-approved.

## Risks
- Temporarily removing one required context may expose the repository to a merge without that check; keep trusted-acceptance and all other checks required, cap the window at 60 minutes, and make rollback immediate.
- The trusted-acceptance producer may not pass on a stacked implementation PR before the publisher is updated; if so, the preflight fails and no setting is changed.
- The separate issue #24 bootstrap may itself remain blocked or change the parent base; issue #22 stays plan-only until its exact prerequisite and fresh trusted status are demonstrated.
- A wrong or stale status on another head could satisfy an unintended required context; bind exact repository, workflow, run/attempt, PR, base/head and plan.
- A PR-controlled verifier or artifact could misrepresent settings; all privileged audit and status publication must run on trusted default-branch code.
- Ruleset update API responses may omit details or race with another edit; compare exact live before/after fields and abort if the baseline changes.

## Rollback and escalation
- If preflight cannot prove `trusted-acceptance` and remaining checks stay satisfied, make no code or settings change and stop for a further human decision.
- If any mismatch occurs during the window, restore only the original repository-controls binding to integration 15368, confirm all other rules and empty bypass list, and stop.
- Never add a bypass actor, disable strict checks, broaden credentials, or exceed the 60-minute window.
- If rollback cannot be confirmed immediately, stop all further actions and escalate to the repository owner.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-REPO-CONTROLS-EVIDENCE",
  "contractDigest": "21c19189ffda980300d7d2438f6268df172ca281c477dd5c72259dc51855309a",
  "baseSha": "17e7a5c5f1fbf88a92351043c675f555f4c7f04f",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Prepare a safe bootstrap and migrate the required `repository-controls` result from an unprivileged pull-request audit to the protected trusted-publisher App. Rebind only the existing required check to that trusted status source, preserve all other protections, and prove a safe rollout/rollback path before changing the rule. Pull-request code must never receive administrator or secret-inventory credentials. The owner has authorized planning one temporary bootstrap exception: remove only the `repository-controls` required context for at most 60 minutes while keeping `trusted-acceptance` and every other required check, strict mode, PR review, CODEOWNERS, and the empty bypass list unchanged. This is planning authorization only; no settings change is authorized until the revised plan itself is independently approved. If the remaining controls cannot safely carry the migration, stop without mutating settings.",
  "scope": {
    "allowed": [
      ".github/workflows/governed-change.yml",
      ".github/workflows/governance-review.yml",
      ".github/workflows/publish-evidence.yml",
      ".github/workflows/system-maintenance-approval.yml",
      "scripts/governance-audit.mjs",
      "scripts/resolve-workflow-run.mjs",
      "scripts/resolve-workflow-pr.mjs",
      "scripts/publish-acceptance-status.mjs",
      "tests/unit/governance-audit.test.ts",
      "tests/unit/resolve-workflow-run.test.ts",
      "tests/unit/resolve-workflow-pr.test.ts",
      "tests/unit/publish-acceptance-status.test.ts",
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
      "all hosted settings except (a) the one authorized temporary removal/restoration of only required context `repository-controls` in ruleset 23998987 for at most 60 minutes and (b) its final rebind from integration_id 15368 to existing trusted publisher App integration_id 5075466",
      "any change to other required status contexts, strict mode, pull-request requirements, CODEOWNERS review, bypass actors, force-push/deletion rules, protected environments, or direct-push rules",
      "creating/installing a new GitHub App, changing App installation permissions, generating keys, changing secrets, credentials, or account settings",
      "adding administrator or secret-inventory credentials to any pull_request job or PR-controlled process",
      "broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted evidence",
      "removing, renaming, weakening, or suppressing required repository-controls or other security checks outside the exact time-bounded bootstrap exception above",
      "trusting or executing artifacts produced by pull-request-controlled code as proof of external repository controls",
      "scanner suppressions, severity downgrades, or blanket ignore rules",
      "changes to issue #20's approved plan or scanner-remediation implementation"
    ]
  },
  "operations": [
    "workflow-change",
    "security-change"
  ],
  "steps": [
    "Revalidate the live issue #22 digest, this exact base, active ruleset 23998987, all required contexts and integration IDs, strict mode, empty bypass list, existing trusted publisher identity/permissions, and PR #18 status. Record that PR #18 head 17e7a5c has a failed trusted-acceptance status targeting run 36312852134; this makes the authorized window ineligible now.",
    "Do not begin issue #22 implementation or settings changes until the separate issue #24 trusted-acceptance bootstrap prerequisite has a refreshed plan bound to the current parent base, a fresh independent approval, and a completed implementation that emits a fresh passing trusted-acceptance status for the exact parent head. Refresh and reapprove this plan again if the parent base changes.",
    "After the prerequisite is accepted, construct a full no-bypass bootstrap sequence. Prove that `trusted-acceptance` and every check other than the single authorized `repository-controls` context can pass on the exact stacked implementation PR, and that the protected publisher can become live within the authorized maximum 60-minute window. Specifically test the current publisher base resolver and main-only code limitation. If preflight fails, stop with no code or ruleset change.",
    "If preflight succeeds, use the approved implementation to extend exact source-run and PR resolution for same-repository stacked bases; validate workflow identity, event, run/attempt, PR, base/head, task/plan and artifact identities before any artifact import. Never check out or execute PR code in the trusted publisher.",
    "Run the online governance audit only in the existing protected default-branch publisher using App 5075466 and its existing permissions. Keep privileged credentials exclusively in that trusted job; PR jobs remain read-only and consume only fresh, verified publisher evidence.",
    "Add the protected publisher status step that emits `repository-controls` from App 5075466 to the exact validated PR head, with pass only when the online audit is fully available and ready; publish failure for missing, stale, mismatched or unavailable evidence. Prove the status creator/integration ID matches 5075466.",
    "Only after the trusted producer is ready and all preflight conditions remain satisfied, begin the authorized bootstrap window (maximum 60 minutes) by removing only the `repository-controls` required-context entry from ruleset 23998987. Keep `trusted-acceptance`, every other status, strict mode, PR review, CODEOWNERS and the empty bypass list unchanged.",
    "Deploy/verify the trusted producer, then restore `repository-controls` as a required context bound to integration_id 5075466. Read the ruleset before, during and after; assert no other field changed and close the window within its limit. If any check fails, restore the prior single-context entry (15368) immediately and stop.",
    "Add positive and negative unit tests for no-credential PR boundaries, stacked-base source resolution, trusted status source, exact source-run identity, artifact provenance/freshness, and the bootstrap/rollback guard. Run focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all; record exact results and candidate SHA. Do not claim hosted acceptance unless every required context passes."
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
      "statement": "PR-triggered code never receives administrator or secret-inventory credentials or privileged write permissions",
      "provenBy": "pull request workflows do not expose privileged governance credentials"
    },
    {
      "id": "AC2",
      "statement": "The trusted publisher emits repository-controls only for an exact verified source workflow run and PR head",
      "provenBy": "publishes repository controls only after exact source identity validation"
    },
    {
      "id": "AC3",
      "statement": "Missing, stale, mismatched, malformed, or PR-originated evidence remains unavailable/failing and is never represented as pass",
      "provenBy": "rejects mismatched trusted governance report provenance"
    },
    {
      "id": "AC4",
      "statement": "The bootstrap changes only repository-controls for no more than 60 minutes, keeps every other required context and the empty bypass list intact, and restores the trusted-App binding",
      "provenBy": "preserves hosted-control and approval boundaries"
    },
    {
      "id": "AC5",
      "statement": "The no-bypass bootstrap reaches the trusted status producer without disabling required checks or adding a bypass actor",
      "provenBy": "verifies repository-controls no-bypass bootstrap"
    },
    {
      "id": "AC6",
      "statement": "The approved implementation passes focused and complete local validation and records exact hosted outcomes without overstating acceptance",
      "provenBy": "records complete validation for trusted control evidence"
    }
  ],
  "evidence": [
    "Live ruleset 23998987 before/during/after snapshots showing only the authorized `repository-controls` entry is removed/rebound, all other contexts and strict mode unchanged, and no bypass actor.",
    "Preflight evidence that `trusted-acceptance` and every other required check can pass on the exact implementation PR while the temporary window is active; if unavailable, record the stop and make no setting change.",
    "Current blocker evidence: PR #18 head 17e7a5c5f1fbf88a92351043c675f555f4c7f04f has failed trusted-acceptance targeting run 36312852134; trusted report 36312262826 is review_required with AC15 unproven. Record the refreshed issue #24/PR #25 plan base and the later exact passing trusted status before declaring preflight ready.",
    "Exact protected publisher workflow run, source-run/PR/head identities, trusted audit/report digest and resulting repository-controls status creator/integration 5075466.",
    "Focused positive/negative tests for untrusted PR credential isolation, stacked-base resolver, trusted status identity, report provenance/freshness and bootstrap rollback.",
    "Exact focused and full validation commands/results, PostgreSQL acceptance when relevant, candidate SHA and hosted run URLs.",
    "If preflight is impossible, a blocked report naming the exact remaining decision and confirming no ruleset/settings/code changes."
  ],
  "decisionsAndHandoffs": [
    "The owner authorized preparation of this bootstrap plan, including consideration of a one-time maximum 60-minute removal of only the `repository-controls` context; this is not authorization to execute the setting change before the plan is independently approved.",
    "The prior PR #23 plan revision at head 25d4e771b00a24d5e34b2ba5167707c8c98a1f72 is invalid after issue #22 was amended again; this proposal must be reviewed on its new head.",
    "The active ruleset currently binds repository-controls to 15368 and trusted-acceptance to 5075466. The PR job cannot read administrator controls; the current protected publisher cannot resolve stacked PR bases and its prior online audit was unavailable.",
    "Issue #24 / plan PR #25 is the prerequisite for producing trusted-acceptance on the stacked parent. Its plan is bound to the old base 2e3cd083399661947b98b420f66ce7a9523ca68b; refresh and independently approve it before implementation. After it completes, re-read issue #22 and refresh this plan if the parent head changes.",
    "Issue #20 remains blocked and its previous plan approval does not authorize this migration. If the shared base changes, issue #20 must be refreshed and re-approved."
  ],
  "risks": [
    "Temporarily removing one required context may expose the repository to a merge without that check; keep trusted-acceptance and all other checks required, cap the window at 60 minutes, and make rollback immediate.",
    "The trusted-acceptance producer may not pass on a stacked implementation PR before the publisher is updated; if so, the preflight fails and no setting is changed.",
    "The issue #24 bootstrap prerequisite may remain blocked or advance the parent base; issue #22 must remain plan-only until that prerequisite and a fresh passing trusted status are proven.",
    "A wrong or stale status on another head could satisfy an unintended required context; bind exact repository, workflow, run/attempt, PR, base/head and plan.",
    "A PR-controlled verifier or artifact could misrepresent settings; all privileged audit and status publication must run on trusted default-branch code.",
    "Ruleset update API responses may omit details or race with another edit; compare exact live before/after fields and abort if the baseline changes."
  ],
  "rollbackAndEscalation": [
    "If preflight cannot prove `trusted-acceptance` and remaining checks stay satisfied, make no code or settings change and stop for a further human decision.",
    "While PR #18 trusted-acceptance is missing or failed, do not open the 60-minute window; first refresh and independently approve the issue #24/PR #25 prerequisite against its current base.",
    "If any mismatch occurs during the window, restore only the original repository-controls binding to integration 15368, confirm all other rules and empty bypass list, and stop.",
    "Never add a bypass actor, disable strict checks, broaden credentials, or exceed the 60-minute window.",
    "If rollback cannot be confirmed immediately, stop all further actions and escalate to the repository owner."
  ],
  "planDigest": "51cb81d289b27b25b7a79ea8619900fa759eca92f88b6489d209ad4cb8d8acd0"
}
```
<!-- northstar:plan-contract:end -->

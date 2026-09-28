# Plan: AES-ZIZMOR-REMEDIATION

## Objective
Remediate every concrete finding emitted by pinned Zizmor 1.30.0 on the refreshed plan base `agent/implement/aes-surface-evidence` commit `17e7a5c5f1fbf88a92351043c675f555f4c7f04f`. The original audit at `2e3cd083399661947b98b420f66ce7a9523ca68b` remains historical; the refreshed scan at `17e7a5c5f1fbf88a92351043c675f555f4c7f04f` contains 86 findings in seven workflows: 62 `zizmor/unpinned-uses`, 19 `zizmor/artipacked`, three `zizmor/template-injection`, one `zizmor/dangerous-triggers`, and one `zizmor/obfuscation` (65 errors, 21 notes). Do not suppress findings to make the scan pass. Preserve independent review, exact task/run/evidence identity, and trusted default-branch publication.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `17e7a5c5f1fbf88a92351043c675f555f4c7f04f`. This refreshed plan binds the current parent head; the prior base and approval are stale. It is a plan-only proposal; no workflow changes are authorized until an eligible independent human approves the exact refreshed plan commit.

### Refreshed scanner inventory
Pinned scanner: Zizmor 1.30.0, image `ghcr.io/zizmorcore/zizmor@sha256:1ba0035c343f50e85fde29beb0d78e4db448eaa0c762a11a09805d241424ee03`. Refreshed source: `17e7a5c5f1fbf88a92351043c675f555f4c7f04f`. Refreshed SARIF SHA-256: `a784a028e307b57135e8d5306757ecd126ee799f42e564265fad9288ec43b090`. The 86 findings are 65 errors and 21 notes across seven workflows. This evidence applies only to the exact refreshed base; regenerate and re-approve if the parent moves.

### Planned remediation
1. Before implementation, rerun pinned Zizmor 1.30.0 on exact base `17e7a5c5f1fbf88a92351043c675f555f4c7f04f` and confirm the refreshed SARIF digest and inventory. If the parent or findings change before approval, refresh this plan again.
2. Pin all action references to verified upstream release SHAs, with matching release comments.
3. Disable checkout credential persistence unless an exact later Git operation demonstrably requires it.
4. Move event-controlled values out of inline shell expressions and add negative injection tests.
5. Replace Publish Evidence workflow_run with a manual workflow_dispatch from trusted main; resolve the exact source run/attempt and its PR/task/plan/base/head before importing artifacts, and never execute those artifacts.
6. Simplify the flagged database URL expression and any other obfuscated expression without changing validated behavior.
7. Add scoped workflow and source-run regression tests, then run the pinned scanner and full validation at the immutable candidate SHA.

## Scope and files to change
- `.github/workflows/governed-change.yml`
- `.github/workflows/publish-evidence.yml`
- `.github/workflows/system-maintenance-approval.yml`
- `.github/workflows/governance-review.yml`
- `.github/workflows/copilot-setup-steps.yml`
- `.github/workflows/plan-gate.yml`
- `.github/workflows/production-gate.yml`
- `scripts/governance-audit.mjs`
- `tests/unit/governance-audit.test.ts`
- `tests/unit/workflow-scanner.test.ts`
- `docs/architecture.md`
- `scripts/resolve-workflow-run.mjs`
- `tests/unit/resolve-workflow-run.test.ts`

Prohibited paths and operations:
- `src/**`
- `migrations/**`
- `package.json`
- `package-lock.json`
- `.github/governance/**`
- `.github/zizmor.yml`
- `.github/workflows/daily-repository-status.md`
- `.github/workflows/daily-repository-status.lock.yml`
- `all workflow files not explicitly listed under Allowed scope`
- `production resources or deployment`
- `hosted repository settings, secrets, environment rules, App installation/permissions, credentials, or account settings`
- `workflow/Actions scanner suppressions or blanket `ignore` rules`
- `merging or approving this implementation PR or any other PR`

## Success criteria
- AC1 | Every action reference in the seven scoped workflows uses an authentic immutable SHA with a matching release comment | rejects mutable or mismatched action references in all scoped workflows
- AC2 | Checkout credentials are not persisted beyond steps that demonstrably need authenticated Git | rejects checkout credential persistence without a documented scoped need
- AC3 | Event-controlled values cannot become shell source through GitHub expression expansion | rejects untrusted event interpolation in shell commands
- AC4 | The trusted publisher no longer uses a scanner-flagged dangerous trigger and still validates exact source-run, PR, base, head, artifact, and attempt identity before publishing | verifies the publisher handoff rejects mismatched source runs and never executes downloaded artifacts
- AC5 | Obfuscated GitHub workflow expressions are replaced with equivalent statically readable forms | preserves event, branch, permission, concurrency, and failure decisions after expression simplification
- AC6 | Pinned Zizmor 1.30.0 reports no unexplained findings in the seven scoped workflows and no suppression was added | produces a clean Zizmor report and fails on injected negative workflow fixtures
- AC7 | The changes pass full validation and remain unaccepted until an independent reviewer and hosted policy accept the immutable implementation head | records exact candidate SHA and all local/hosted validation outcomes

## Evidence
- Refreshed scanner evidence: pinned Zizmor 1.30.0 image `ghcr.io/zizmorcore/zizmor@sha256:1ba0035c343f50e85fde29beb0d78e4db448eaa0c762a11a09805d241424ee03`; source `17e7a5c5f1fbf88a92351043c675f555f4c7f04f`; SARIF SHA-256 `a784a028e307b57135e8d5306757ecd126ee799f42e564265fad9288ec43b090`; 86 findings (65 errors, 21 notes) with the rule distribution above. The original `2e3cd...` report is historical. Raw SARIF stays local unless reviewed.
- Focused regression names/results for all success criteria, including negative shell-input, checkout credential, action-reference and mixed/stale source-run provenance cases.
- Exact npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all commands, status, test counts and candidate commit SHA.
- Hosted Plan Gate, Governed Change, Publish Evidence and trusted-acceptance status URLs tied to the exact task, run, attempt, PR, base and head; independent reviewer identity recorded.

## Decisions and handoffs
- This is a separate high-risk scanner-remediation task stacked on PR 18 at the exact refreshed base recorded above; it does not alter issue 14, its plan approval, or issue 16.
- Issue #20 remains blocked by issue #22. This refresh records the current scanner inventory only; implementation remains blocked until #22 is accepted and the base/inventory are revalidated.
- All 86 baseline findings are categorized by the task owner as requiring concrete remediation. No scanner suppression, severity downgrade, broad allowlist or finding deletion is authorized.
- The publisher handoff changes from automatic workflow_run to explicit manual workflow_dispatch on trusted main. A repository write-capable human initiates publication only after Governed Change completes; trusted code resolves and validates the immutable source run before artifacts are imported.
- The planner remains read-only. A human publisher commits only the plan artifact; an eligible independent human provides the native approval before workflow implementation begins.
- No repository setting, environment, App identity, credential, approval, or merge change is authorized by this source task.

## Risks
- Action SHA pinning can select an unintended or fork-impostor commit unless each SHA is authenticated against the intended upstream release tag.
- Disabling checkout credential persistence can break later Git operations; avoid solving that with broader or longer-lived tokens.
- A manually supplied source run ID/attempt is untrusted until repository, workflow, event, conclusion, PR, task/plan, base/head and artifact provenance are independently re-resolved.
- Removing workflow_run changes publication from automatic to operator-initiated and adds human latency; this is deliberate to remove the dangerous trigger without granting a PR-controlled job publisher credentials.
- Changing workflow files beyond the approved task paths risks weakening trusted acceptance and is prohibited.

## Rollback and escalation
- If source-run provenance or artifact identity cannot be validated before privileged processing, stop the publisher handoff; do not restore workflow_run through a suppression or weaken validation.
- If a required SHA cannot be authenticated against its intended upstream tag/repository, stop and identify that action for human selection.
- If any finding requires out-of-scope files, a dependency, broader token permission, changed approval semantics, or a scanner exception, stop and request a separately reviewed plan amendment.
- Rollback the coupled workflow, validator, test and documentation changes together on the implementation branch; never alter main directly or merge automatically.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-ZIZMOR-REMEDIATION",
  "contractDigest": "df654e265c20e6390e31b6e3d3939c20ef2202584241942f57df282684245f76",
  "baseSha": "17e7a5c5f1fbf88a92351043c675f555f4c7f04f",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Remediate every concrete finding emitted by pinned Zizmor 1.30.0 on the refreshed plan base `agent/implement/aes-surface-evidence` commit `17e7a5c5f1fbf88a92351043c675f555f4c7f04f`. The original audit at `2e3cd083399661947b98b420f66ce7a9523ca68b` remains historical; the refreshed scan at `17e7a5c5f1fbf88a92351043c675f555f4c7f04f` contains 86 findings in seven workflows: 62 `zizmor/unpinned-uses`, 19 `zizmor/artipacked`, three `zizmor/template-injection`, one `zizmor/dangerous-triggers`, and one `zizmor/obfuscation` (65 errors, 21 notes). Do not suppress findings to make the scan pass. Preserve independent review, exact task/run/evidence identity, and trusted default-branch publication.",
  "scope": {
    "allowed": [
      ".github/workflows/governed-change.yml",
      ".github/workflows/publish-evidence.yml",
      ".github/workflows/system-maintenance-approval.yml",
      ".github/workflows/governance-review.yml",
      ".github/workflows/copilot-setup-steps.yml",
      ".github/workflows/plan-gate.yml",
      ".github/workflows/production-gate.yml",
      "scripts/governance-audit.mjs",
      "tests/unit/governance-audit.test.ts",
      "tests/unit/workflow-scanner.test.ts",
      "docs/architecture.md",
      "scripts/resolve-workflow-run.mjs",
      "tests/unit/resolve-workflow-run.test.ts"
    ],
    "prohibited": [
      "src/**",
      "migrations/**",
      "package.json",
      "package-lock.json",
      ".github/governance/**",
      ".github/zizmor.yml",
      ".github/workflows/daily-repository-status.md",
      ".github/workflows/daily-repository-status.lock.yml",
      "all workflow files not explicitly listed under Allowed scope",
      "production resources or deployment",
      "hosted repository settings, secrets, environment rules, App installation/permissions, credentials, or account settings",
      "workflow/Actions scanner suppressions or blanket `ignore` rules",
      "merging or approving this implementation PR or any other PR"
    ]
  },
  "operations": [
    "workflow-change",
    "security-change"
  ],
  "steps": [
    "Before editing a workflow, repeat the pinned offline Zizmor 1.30.0 scan at exact base 17e7a5c5f1fbf88a92351043c675f555f4c7f04f. Compare scanner version, image digest, SARIF digest, rule IDs, files, lines and total findings to the refreshed issue inventory. If the parent or inventory changes, refresh the issue and plan and obtain independent approval.",
    "For every unpinned-uses finding, resolve the intended upstream release tag to its authentic full commit SHA and verify the SHA is in that upstream repository/tag. Pin the workflow to the SHA and keep a matching version comment. Do not use unverified hashes or fork-impostor commits.",
    "For every artipacked finding, set persist-credentials:false on checkouts unless a narrowly scoped later Git operation demonstrably needs credentials. If a later Git operation requires authentication, use an explicit short-lived least-privilege token only for that operation; never expose it to PR-controlled code or artifacts.",
    "For every template-injection finding, move event-controlled values out of inline GitHub expressions in run scripts into step/job environment values or validated workflow inputs. Expand only quoted shell variables and add tests for quotes, newlines, metacharacters, empty values and unexpected types.",
    "Replace the Publish Evidence workflow_run trigger with manual workflow_dispatch available from trusted main. Require source-run-id and source-run-attempt. Add an isolated source-run resolver that verifies repository, exact Governed Change workflow identity, completed source run, attempt, pull_request or pull_request_review event, exactly associated PR, immutable head/base, live task and plan identity before importing artifacts. Set downstream PR/head/run outputs only from that verified API response. Download artifacts only after identity verification; never execute downloaded artifacts. Keep publisher credentials confined to the main-only trusted-publisher environment and publish trusted-acceptance only after existing evidence gates are re-evaluated. Document the operator handoff.",
    "Simplify the obfuscated literal PostgreSQL test URL to a direct static value without changing the ephemeral service target or security boundary. Simplify any other flagged expression only when an equivalence test proves event, branch, permission, concurrency and failure behavior is unchanged.",
    "Add focused governance-audit regression tests for action pinning, checkout credential persistence, shell interpolation, publisher dispatch/source-run provenance, and expression readability. Add a source-run resolver unit test for valid and mismatched repository/workflow/run/attempt/PR/head/plan identities.",
    "Run focused regressions, agentic:compile, pinned agentic:zizmor, validate, PostgreSQL acceptance and validate:all at the exact candidate SHA. Require zero unsuppressed findings in the seven scoped workflows and preserve negative scanner and identity-mismatch cases. Record each command exit honestly.",
    "Run hosted Plan Gate and Governed Change on the exact implementation head. The trusted-publisher status may be failure until every check is repaired; never call a failing status accepted. Human review and protected maintenance remain separate acceptance decisions."
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
      "statement": "Every action reference in the seven scoped workflows uses an authentic immutable SHA with a matching release comment",
      "provenBy": "rejects mutable or mismatched action references in all scoped workflows"
    },
    {
      "id": "AC2",
      "statement": "Checkout credentials are not persisted beyond steps that demonstrably need authenticated Git",
      "provenBy": "rejects checkout credential persistence without a documented scoped need"
    },
    {
      "id": "AC3",
      "statement": "Event-controlled values cannot become shell source through GitHub expression expansion",
      "provenBy": "rejects untrusted event interpolation in shell commands"
    },
    {
      "id": "AC4",
      "statement": "The trusted publisher no longer uses a scanner-flagged dangerous trigger and still validates exact source-run, PR, base, head, artifact, and attempt identity before publishing",
      "provenBy": "verifies the publisher handoff rejects mismatched source runs and never executes downloaded artifacts"
    },
    {
      "id": "AC5",
      "statement": "Obfuscated GitHub workflow expressions are replaced with equivalent statically readable forms",
      "provenBy": "preserves event, branch, permission, concurrency, and failure decisions after expression simplification"
    },
    {
      "id": "AC6",
      "statement": "Pinned Zizmor 1.30.0 reports no unexplained findings in the seven scoped workflows and no suppression was added",
      "provenBy": "produces a clean Zizmor report and fails on injected negative workflow fixtures"
    },
    {
      "id": "AC7",
      "statement": "The changes pass full validation and remain unaccepted until an independent reviewer and hosted policy accept the immutable implementation head",
      "provenBy": "records exact candidate SHA and all local/hosted validation outcomes"
    }
  ],
  "evidence": [
    "Refreshed scanner evidence: pinned Zizmor 1.30.0 image ghcr.io/zizmorcore/zizmor@sha256:1ba0035c343f50e85fde29beb0d78e4db448eaa0c762a11a09805d241424ee03; source 17e7a5c5f1fbf88a92351043c675f555f4c7f04f; SARIF SHA-256 a784a028e307b57135e8d5306757ecd126ee799f42e564265fad9288ec43b090; 86 findings (65 errors, 21 notes) across seven workflows. The original 2e3cd083399661947b98b420f66ce7a9523ca68b report is historical. Raw SARIF stays local unless reviewed.",
    "Focused regression names/results for all success criteria, including negative shell-input, checkout credential, action-reference and mixed/stale source-run provenance cases.",
    "Exact npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all commands, status, test counts and candidate commit SHA.",
    "Hosted Plan Gate, Governed Change, Publish Evidence and trusted-acceptance status URLs tied to the exact task, run, attempt, PR, base and head; independent reviewer identity recorded."
  ],
  "decisionsAndHandoffs": [
    "This is a separate high-risk scanner-remediation task stacked on PR 18 at the exact refreshed base recorded above; it does not alter issue 14, its plan approval, or issue 16.",
    "Issue #20 remains blocked by issue #22. This refresh records the current scanner inventory only; implementation remains blocked until #22 is accepted and the base/inventory are revalidated.",
    "All 86 baseline findings are categorized by the task owner as requiring concrete remediation. No scanner suppression, severity downgrade, broad allowlist or finding deletion is authorized.",
    "The publisher handoff changes from automatic workflow_run to explicit manual workflow_dispatch on trusted main. A repository write-capable human initiates publication only after Governed Change completes; trusted code resolves and validates the immutable source run before artifacts are imported.",
    "The planner remains read-only. A human publisher commits only the plan artifact; an eligible independent human provides the native approval before workflow implementation begins.",
    "No repository setting, environment, App identity, credential, approval, or merge change is authorized by this source task."
  ],
  "risks": [
    "Action SHA pinning can select an unintended or fork-impostor commit unless each SHA is authenticated against the intended upstream release tag.",
    "Disabling checkout credential persistence can break later Git operations; avoid solving that with broader or longer-lived tokens.",
    "A manually supplied source run ID/attempt is untrusted until repository, workflow, event, conclusion, PR, task/plan, base/head and artifact provenance are independently re-resolved.",
    "Removing workflow_run changes publication from automatic to operator-initiated and adds human latency; this is deliberate to remove the dangerous trigger without granting a PR-controlled job publisher credentials.",
    "Changing workflow files beyond the approved task paths risks weakening trusted acceptance and is prohibited."
  ],
  "rollbackAndEscalation": [
    "If source-run provenance or artifact identity cannot be validated before privileged processing, stop the publisher handoff; do not restore workflow_run through a suppression or weaken validation.",
    "If a required SHA cannot be authenticated against its intended upstream tag/repository, stop and identify that action for human selection.",
    "If any finding requires out-of-scope files, a dependency, broader token permission, changed approval semantics, or a scanner exception, stop and request a separately reviewed plan amendment.",
    "Rollback the coupled workflow, validator, test and documentation changes together on the implementation branch; never alter main directly or merge automatically."
  ],
  "planDigest": "76a25183507e0702bcdd14db89577d4c59a9f508030fba7804692a6b781172e3"
}
```
<!-- northstar:plan-contract:end -->

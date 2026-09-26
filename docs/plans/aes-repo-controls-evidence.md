# Plan: AES-REPO-CONTROLS-EVIDENCE

## Objective
Resolve the repeated `repository-controls` failure in a way that preserves the trust boundary: pull-request code must never receive administrator or secret-inventory credentials, while required repository-control checks must remain truthful and tied to fresh, trusted evidence. If this cannot be done without changing external settings, App permissions, or other prohibited controls, stop and report the exact external decision required; never convert `unavailable` into `pass`.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2e3cd083399661947b98b420f66ce7a9523ca68b`. This is a plan-only proposal. No implementation is authorized until an independent human approves this exact plan commit.

### Failure evidence
- Run `36230750424`: `repository-controls` failed with `governance=fail checks=76`; the job token was limited to `Contents: read` and `Metadata: read`.
- Run `36232312318`: the same required check failed again with the same token permissions and signature after the plan review event.
- The reports classify administrator-only lookups as unavailable; they do not prove that repository controls are disabled.

### Planned approach
1. Verify the current check-context integration identity and exact trusted workflow boundaries using read-only access.
2. Design a trusted-default-branch audit and least-privilege PR evidence verifier only if the existing required status can be truthfully satisfied without changing hosted configuration or exposing credentials.
3. Bind any accepted audit to the exact trusted repo/workflow/event/run/attempt/source SHA/policy/report digests and a strict freshness window; reject PR-produced or stale evidence.
4. If the required context cannot be satisfied safely within scope, stop with an exact external administrator decision. Do not change settings, credentials, or check policy to manufacture a pass.
5. If feasible, implement only the approved paths, add negative regressions, then run local and hosted validations at the exact candidate SHA.

## Scope and files to change
- `.github/workflows/governed-change.yml`
- `.github/workflows/governance-review.yml`
- `.github/workflows/publish-evidence.yml`
- `.github/workflows/system-maintenance-approval.yml`
- `scripts/governance-audit.mjs`
- `scripts/resolve-workflow-run.mjs`
- `tests/unit/governance-audit.test.ts`
- `tests/unit/resolve-workflow-run.test.ts`
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
- `hosted repository settings, rulesets, branch protection, App installation/permissions, secrets, environment rules, credentials, or account settings`
- `adding administrator or secret-inventory credentials to any pull_request job`
- `broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted evidence`
- `removing, renaming, weakening, or suppressing required repository-controls or other security checks`
- `trusting or executing artifacts produced by pull-request-controlled code as proof of external repository controls`
- `scanner suppressions, severity downgrades, or blanket ignore rules`
- `changes to issue #20's approved plan or scanner-remediation implementation`

## Success criteria
- AC1 | PR-triggered code never receives administrator or secret-inventory credentials, and no untrusted workflow artifact is trusted as a control audit | pull request workflows do not expose privileged governance credentials
- AC2 | Repository-control evidence is accepted only when trusted source workflow, repository, event, run/attempt, source SHA, policy digest, schema, and freshness all match | rejects mismatched trusted governance report provenance
- AC3 | Missing, stale, mismatched, or inaccessible external-control evidence remains unavailable/failing and is never represented as pass or as a verified disabled setting | unavailable external controls fail closed
- AC4 | No hosted settings, App installation/permissions, secrets, environment rules, risk policy, or required-check semantics change in this task | preserves hosted-control and approval boundaries
- AC5 | The approved implementation passes focused and complete local validation and records exact hosted outcomes without overstating acceptance | records complete validation for trusted control evidence

## Evidence
- Exact sanitized outputs and job permission summaries from runs 36230750424 and 36232312318, tied to issue #22 and base 2e3cd083399661947b98b420f66ce7a9523ca68b.
- Read-only inspection of the active required-status context and existing trusted App/environment boundary; no secret values or settings mutations.
- Focused named positive and negative tests for privileged-token isolation, trusted report provenance, artifact freshness, exact status identity, and fail-closed unavailable state.
- Exact npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all results, candidate commit SHA, and hosted workflow run URLs.
- If no compliant in-scope implementation exists, a precise blocked report naming the required external decision and documenting that no settings or credentials were changed.

## Decisions and handoffs
- This is a separate high-risk prerequisite task created after issue #20 hit its explicit repeated-policy-check stop condition; issue #20 implementation remains untouched.
- The two observed runs are 36230750424 and 36232312318, both for plan head 90398440a32d6b8810733aa81c8044e2d7320842 at base 2e3cd083399661947b98b420f66ce7a9523ca68b. Both repository-controls checks fail with governance=fail checks=76 and expose only Contents:read and Metadata:read to the job.
- HTTP 403/unavailable means the audit could not verify admin-only controls; it is not evidence that repository controls are disabled. Do not alter or bypass the audit merely to turn the check green.
- Issue #20 plan approval does not authorize this task. This task also requires a separate plan-only PR and current native independent approval before any implementation.
- If this task changes the shared base branch, issue #20 must be rebound to the resulting exact base and its plan approval must be refreshed before scanner implementation.

## Risks
- A PR-controlled verifier can lie about an external control unless the required status itself is produced or authenticated by a trusted source; verify the actual integration binding before accepting any design.
- A stale audit report can mask a changed ruleset or secret policy; define and test a strict maximum age and fail closed when the source run is missing or old.
- A token with administrator or secret-inventory access in a PR-triggered workflow can be exposed by PR-controlled YAML or code and is prohibited.
- Using an existing trusted App outside its protected default-branch environment could expose its private key or broaden the execution boundary.
- The external required-check integration may make an in-repository fix impossible without an administrator decision; report that boundary instead of changing hosted configuration.

## Rollback and escalation
- If the new report is missing, stale or mismatched, retain a failing/unavailable repository-controls result; never fall back to a pass.
- If any step requires a new App, credential, permission, ruleset/environment change or altered required-check identity, stop and request a separately authorized plan.
- Rollback only the coupled in-scope workflow, resolver, tests and documentation on the isolated branch; do not remove existing required checks or alter main directly.
- After two identical required security/policy failures, stop and escalate under docs/RECOVERY-POLICY.md rather than rerunning the same check.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-REPO-CONTROLS-EVIDENCE",
  "contractDigest": "281b0015d2073ddbb85af873d3eccfafd4d63b01f81d2abffde0b3a863d933fb",
  "baseSha": "2e3cd083399661947b98b420f66ce7a9523ca68b",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Resolve the repeated `repository-controls` failure in a way that preserves the trust boundary: pull-request code must never receive administrator or secret-inventory credentials, while required repository-control checks must remain truthful and tied to fresh, trusted evidence. If this cannot be done without changing external settings, App permissions, or other prohibited controls, stop and report the exact external decision required; never convert `unavailable` into `pass`.",
  "scope": {
    "allowed": [
      ".github/workflows/governed-change.yml",
      ".github/workflows/governance-review.yml",
      ".github/workflows/publish-evidence.yml",
      ".github/workflows/system-maintenance-approval.yml",
      "scripts/governance-audit.mjs",
      "scripts/resolve-workflow-run.mjs",
      "tests/unit/governance-audit.test.ts",
      "tests/unit/resolve-workflow-run.test.ts",
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
      "hosted repository settings, rulesets, branch protection, App installation/permissions, secrets, environment rules, credentials, or account settings",
      "adding administrator or secret-inventory credentials to any pull_request job",
      "broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted evidence",
      "removing, renaming, weakening, or suppressing required repository-controls or other security checks",
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
    "At the exact base, examine only sanitized reports and logs from runs 36230750424 and 36232312318 and reproduce their normalized repository-controls failure signature. Query the active required-status context identity using already-authorized read access; do not alter hosted settings or collect secret values.",
    "Map the existing governance-review, governed-change and trusted-publisher execution contexts, including default-branch restrictions, existing App token permissions, artifact provenance and status-check integration identity. Do not assume that a trusted report artifact or a same-named status will satisfy the protected required check.",
    "Design the narrowest trusted-source approach that leaves administrator/secret-inventory credentials exclusively in an already-protected default-branch execution context. Pull-request jobs may use only minimal read permissions to retrieve and validate a trusted report; they must never execute PR-controlled code with privileged credentials. Bind any report to repository, workflow, event, completed run and attempt, protected default-branch SHA, policy digest, report digest, schema and freshness.",
    "Before implementation, prove that the design can truthfully satisfy the existing repository-controls required status context without changing external settings, App installation/permissions, secret values, approval semantics or other prohibited controls. If that cannot be demonstrated, stop and publish the exact external control-plane decision required; do not manufacture a passing status, broaden credentials or continue code changes.",
    "If the design is feasible within scope, implement only the approved workflow and directly coupled validator/test/documentation paths. Fail closed for missing, stale, malformed, PR-originated, wrong-repository, wrong-workflow, wrong-event, wrong-run/attempt, wrong-SHA or wrong-policy evidence.",
    "Add focused negative and positive regressions proving credential isolation, report provenance/freshness/schema validation, and unavailable-versus-disabled behavior. Preserve all existing independent review, hosted evidence and trusted-acceptance boundaries.",
    "Run the approved focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all. Record exact commands, exit codes, test counts and candidate SHA. Run hosted validation only after local checks pass; if external controls remain unavailable, retain the failure and record exact evidence without claiming acceptance."
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
      "statement": "PR-triggered code never receives administrator or secret-inventory credentials, and no untrusted workflow artifact is trusted as a control audit",
      "provenBy": "pull request workflows do not expose privileged governance credentials"
    },
    {
      "id": "AC2",
      "statement": "Repository-control evidence is accepted only when trusted source workflow, repository, event, run/attempt, source SHA, policy digest, schema, and freshness all match",
      "provenBy": "rejects mismatched trusted governance report provenance"
    },
    {
      "id": "AC3",
      "statement": "Missing, stale, mismatched, or inaccessible external-control evidence remains unavailable/failing and is never represented as pass or as a verified disabled setting",
      "provenBy": "unavailable external controls fail closed"
    },
    {
      "id": "AC4",
      "statement": "No hosted settings, App installation/permissions, secrets, environment rules, risk policy, or required-check semantics change in this task",
      "provenBy": "preserves hosted-control and approval boundaries"
    },
    {
      "id": "AC5",
      "statement": "The approved implementation passes focused and complete local validation and records exact hosted outcomes without overstating acceptance",
      "provenBy": "records complete validation for trusted control evidence"
    }
  ],
  "evidence": [
    "Exact sanitized outputs and job permission summaries from runs 36230750424 and 36232312318, tied to issue #22 and base 2e3cd083399661947b98b420f66ce7a9523ca68b.",
    "Read-only inspection of the active required-status context and existing trusted App/environment boundary; no secret values or settings mutations.",
    "Focused named positive and negative tests for privileged-token isolation, trusted report provenance, artifact freshness, exact status identity, and fail-closed unavailable state.",
    "Exact npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all results, candidate commit SHA, and hosted workflow run URLs.",
    "If no compliant in-scope implementation exists, a precise blocked report naming the required external decision and documenting that no settings or credentials were changed."
  ],
  "decisionsAndHandoffs": [
    "This is a separate high-risk prerequisite task created after issue #20 hit its explicit repeated-policy-check stop condition; issue #20 implementation remains untouched.",
    "The two observed runs are 36230750424 and 36232312318, both for plan head 90398440a32d6b8810733aa81c8044e2d7320842 at base 2e3cd083399661947b98b420f66ce7a9523ca68b. Both repository-controls checks fail with governance=fail checks=76 and expose only Contents:read and Metadata:read to the job.",
    "HTTP 403/unavailable means the audit could not verify admin-only controls; it is not evidence that repository controls are disabled. Do not alter or bypass the audit merely to turn the check green.",
    "Issue #20 plan approval does not authorize this task. This task also requires a separate plan-only PR and current native independent approval before any implementation.",
    "If this task changes the shared base branch, issue #20 must be rebound to the resulting exact base and its plan approval must be refreshed before scanner implementation."
  ],
  "risks": [
    "A PR-controlled verifier can lie about an external control unless the required status itself is produced or authenticated by a trusted source; verify the actual integration binding before accepting any design.",
    "A stale audit report can mask a changed ruleset or secret policy; define and test a strict maximum age and fail closed when the source run is missing or old.",
    "A token with administrator or secret-inventory access in a PR-triggered workflow can be exposed by PR-controlled YAML or code and is prohibited.",
    "Using an existing trusted App outside its protected default-branch environment could expose its private key or broaden the execution boundary.",
    "The external required-check integration may make an in-repository fix impossible without an administrator decision; report that boundary instead of changing hosted configuration."
  ],
  "rollbackAndEscalation": [
    "If the new report is missing, stale or mismatched, retain a failing/unavailable repository-controls result; never fall back to a pass.",
    "If any step requires a new App, credential, permission, ruleset/environment change or altered required-check identity, stop and request a separately authorized plan.",
    "Rollback only the coupled in-scope workflow, resolver, tests and documentation on the isolated branch; do not remove existing required checks or alter main directly.",
    "After two identical required security/policy failures, stop and escalate under docs/RECOVERY-POLICY.md rather than rerunning the same check."
  ],
  "planDigest": "6d89651b9acc560a2b0e1000d6e938046c513d71123a892a0b3484f13d1093b4"
}
```
<!-- northstar:plan-contract:end -->

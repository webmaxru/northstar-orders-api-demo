import { describe, expect, it } from "vitest";
import { planDigest, renderPlanContract } from "../../scripts/plan-contract.mjs";
import { renderPlan } from "../../scripts/publish-plan.mjs";
import type { ResolvedWorkflowRun } from "../../scripts/resolve-workflow-run.mjs";

const repository = "webmaxru/northstar-orders-api-demo";
const headSha = "a".repeat(40);
const baseSha = "b".repeat(40);
const contractDigest = "c".repeat(64);
const plan = {
  schema: "northstar/plan/1" as const,
  taskId: "AES-SURFACE-EVIDENCE",
  contractDigest,
  baseBranch: "main",
  baseSha,
  risk: "high" as const,
  objective: "Verify trusted evidence for the parent task.",
  scope: { allowed: ["scripts/**", "docs/**"], prohibited: [] },
  steps: ["Resolve the exact source run."],
  requiredChecks: ["plan-contract", "quality"],
  successCriteria: [{ id: "AC1", provenBy: "validates the run" }],
  evidence: ["An immutable plan and run identity."],
  decisionsAndHandoffs: ["Stop on identity mismatch."],
  risks: ["Stale source evidence."],
  rollbackAndEscalation: ["Fail closed."],
};
const planSha = planDigest(plan);
const planBody = renderPlan(renderPlanContract(plan), { issue: 14 });
const artifactPairs: Array<[string, string]> = [
  ["northstar-plan-context", "plan-contract"],
  ["northstar-check-quality", "quality"],
  ["northstar-check-acceptance", "acceptance"],
  ["northstar-check-dependency", "dependency-review"],
  ["northstar-check-secret", "secret-scan"],
  ["northstar-check-codeql", "codeql"],
  ["northstar-check-merge", "merge-validation"],
  ["northstar-check-governance", "governance-policy"],
];
const contextIntegrations: Array<{ context: string; integrationId: number }> = [
  { context: "acceptance", integrationId: 15368 },
  { context: "codeql", integrationId: 15368 },
  { context: "dependency-review", integrationId: 15368 },
  { context: "evidence", integrationId: 15368 },
  { context: "governance-policy", integrationId: 15368 },
  { context: "human-review", integrationId: 15368 },
  { context: "merge-validation", integrationId: 15368 },
  { context: "plan-approval", integrationId: 15368 },
  { context: "plan-contract", integrationId: 15368 },
  { context: "quality", integrationId: 15368 },
  { context: "repository-controls", integrationId: 15368 },
  { context: "scope-policy", integrationId: 15368 },
  { context: "secret-scan", integrationId: 15368 },
  { context: "trusted-acceptance", integrationId: 5075466 },
];

function resolution(
  mode: "open-pr" | "bootstrap-migration" = "open-pr",
): ResolvedWorkflowRun {
  const artifacts = artifactPairs.map(([name, job], index) => ({
    name,
    job,
    id: 800 + index,
    createdAt: "2026-09-27T10:01:00Z",
  }));
  return {
    schema: "northstar/resolved-workflow-run/1",
    mode,
    repository,
    defaultBranch: "main",
    sourceRunId: "42",
    sourceRunAttempt: "2",
    sourceWorkflow: ".github/workflows/governed-change.yml",
    sourceEvent: "pull_request" as const,
    sourceConclusion: "failure",
    pullRequest: 18,
    headSha,
    baseSha,
    baseRef: "main",
    mergeCommitSha: mode === "bootstrap-migration" ? "e".repeat(40) : null,
    mergeAncestryVerified: mode === "bootstrap-migration",
    sourceRunStartedAt: "2026-09-27T10:00:00Z",
    sourceRunCompletedAt: "2026-09-27T10:02:00Z",
    restoredRuleset: mode === "bootstrap-migration" ? {
      id: 23998987,
      snapshotDigest: "9".repeat(64),
      contextIntegrations,
      strict: true,
      bypassActorCount: 0,
    } : null,
    taskIssue: 14,
    taskId: "AES-SURFACE-EVIDENCE",
    contractDigest,
    planDigest: planSha,
    planRisk: "high",
    planApprovalRequired: true,
    taskPlanApproval: {
      planPr: 15,
      planHeadSha: "f".repeat(40),
      reviewId: 105,
      reviewer: "vibeprogrammer",
    },
    bootstrapPlan: mode === "bootstrap-migration" ? {
      issue: 24,
      taskId: "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP",
      contractDigest: "1".repeat(64),
      planPr: 25,
      planHeadSha: "2".repeat(40),
      planDigest: "3".repeat(64),
      reviewId: 106,
      reviewer: "vibeprogrammer",
      baseBranch: "agent/implement/aes-surface-evidence",
      baseSha: "2ce3cf8a69439c22246de7d5449ce186e23bd584",
    } : null,
    dispatcherLogin: mode === "bootstrap-migration" ? "dispatcher[bot]" : null,
    dispatchActor: mode === "bootstrap-migration" ? "dispatcher[bot]" : null,
    dispatchRef: mode === "bootstrap-migration" ? "refs/heads/main" : null,
    maintenanceContinuation: false,
    maintenancePublisher: null,
    eventRun: mode === "open-pr" ? {
      id: 42,
      run_attempt: 2,
      head_sha: headSha,
      event: "pull_request",
      repository: { full_name: repository },
      pull_requests: [{
        number: 18,
        head: {
          sha: headSha,
          ref: "agent/implement/aes-surface-evidence",
          repo: { full_name: repository },
        },
        base: {
          sha: baseSha,
          ref: "main",
          repo: { full_name: repository },
        },
      }],
    } : null,
    artifacts,
    artifactIds: artifacts.map(({ id }) => id).join(","),
    resolvedAt: "2026-09-27T10:04:00Z",
  };
}

function maintenanceResolution(
  mode: "open-pr" | "bootstrap-migration" = "open-pr",
) {
  const current = resolution(mode);
  return {
    ...current,
    maintenanceContinuation: true,
    maintenancePublisher: {
      runId: "900",
      runAttempt: "9",
      workflow: ".github/workflows/publish-evidence.yml",
      event: mode === "bootstrap-migration" ? "workflow_dispatch" as const : "workflow_run" as const,
      headSha: "9".repeat(40),
      conclusion: "success",
      headBranch: "main",
    },
    dispatcherLogin: "dispatcher[bot]",
    dispatchActor: "dispatcher[bot]",
    dispatchRef: "refs/heads/main",
    eventRun: null,
  };
}

function report(decision: string = "ready_for_acceptance") {
  return {
    schema: "northstar/execution-report/3",
    workItem: "AES-SURFACE-EVIDENCE",
    validationLevel: "hosted-integration",
    decision,
    provenance: {
      repository,
      pullRequest: 18,
      headSha,
      baseSha,
      runId: "42",
      runAttempt: "2",
      workflow: "Publish Evidence",
      event: "workflow_run",
      executionRunId: "900",
      executionRunAttempt: "9",
    },
    plan: {
      valid: true,
      digest: planSha,
      contractDigest,
      baseSha,
    },
    contextErrors: [] as string[],
    failedLocalChecks: [] as string[],
    pendingHostedEvidence: [] as string[],
    unprovenCriteria: [] as string[],
    tests: {
      unit: { passed: true },
      acceptance: { passed: true },
    },
    checks: [{ present: true, valid: true, status: "pass" }],
    successCriteria: [{ proven: true }],
  };
}

function environment(mode: "open-pr" | "bootstrap-migration" = "open-pr") {
  return {
    GITHUB_REF: "refs/heads/main",
    GITHUB_WORKFLOW: "Publish Evidence",
    GITHUB_EVENT_NAME: mode === "open-pr" ? "workflow_run" : "workflow_dispatch",
    GITHUB_REPOSITORY: repository,
    GITHUB_RUN_ID: "900",
    GITHUB_RUN_ATTEMPT: "9",
    GITHUB_SERVER_URL: "https://github.com",
    NORTHSTAR_HEAD_SHA: headSha,
    NORTHSTAR_RUN_ID: "42",
    NORTHSTAR_RUN_ATTEMPT: "2",
    NORTHSTAR_MIGRATION_MODE: mode,
    NORTHSTAR_TRUSTED_PUBLISHER_APP_ID: "5075466",
    NORTHSTAR_TRUSTED_PUBLISHER_APP_LOGIN: "publisher[bot]",
    PR_NUMBER: "18",
  };
}

function pull(mode: "open-pr" | "bootstrap-migration" = "open-pr") {
  return {
    number: 18,
    body: planBody,
    state: mode === "open-pr" ? "open" : "closed",
    merged: mode === "bootstrap-migration",
    merge_commit_sha: mode === "bootstrap-migration" ? "e".repeat(40) : null,
    head: { sha: headSha, repo: { full_name: repository } },
    base: {
      sha: mode === "open-pr" ? baseSha : "f".repeat(40),
      ref: "main",
      repo: { full_name: repository },
    },
  };
}

type TestReport = ReturnType<typeof report>;
type TestResolution = ReturnType<typeof resolution>;
type TestPull = ReturnType<typeof pull>;
type TestEnvironment = ReturnType<typeof environment>;

interface StatusExpectation {
  state: "success" | "failure";
  context: "trusted-acceptance";
  repository: string;
  pullRequest: number;
  sha: string;
  baseSha: string;
  sourceRunId: string;
  sourceRunAttempt: string;
  publisherRunId: string;
  publisherRunAttempt: string;
  targetUrl: string;
  reportDecision: string;
  reportDigest: string;
  rulesetSnapshotDigest: string | null;
  publisherAppId: string;
  publisherLogin: string;
}

interface StatusModule {
  acceptanceStatusExpectation(input: {
    report: TestReport;
    resolution: TestResolution | null;
    pull: TestPull;
    repository: string;
    defaultBranch: string;
    env: TestEnvironment;
  }): StatusExpectation;
  verifyPublishedStatus(
    status: Record<string, unknown>,
    expected: StatusExpectation,
  ): {
    schema: string;
    context: string;
    state: string;
    sha: string;
    statusId: number;
    creatorLogin: string;
    creatorType: string;
    publisherAppId: string;
    sourceRunId: string;
    sourceRunAttempt: string;
  };
}

async function statusModule(): Promise<StatusModule> {
  const modulePath: string = "../../scripts/publish-acceptance-status.mjs";
  return import(modulePath) as Promise<StatusModule>;
}

describe("trusted acceptance status publication", () => {
  it("allows success only for a complete report on the exact open source PR", async () => {
    const { acceptanceStatusExpectation } = await statusModule();
    const expected = acceptanceStatusExpectation({
      report: report(),
      resolution: resolution(),
      pull: pull(),
      repository,
      defaultBranch: "main",
      env: environment(),
    });
    expect(expected).toMatchObject({
      state: "success",
      context: "trusted-acceptance",
      sha: headSha,
      publisherAppId: "5075466",
      publisherLogin: "publisher[bot]",
      sourceRunId: "42",
      sourceRunAttempt: "2",
    });
  });

  it("publishes failure, not success, while trusted hosted evidence is incomplete", async () => {
    const { acceptanceStatusExpectation } = await statusModule();
    const incomplete = report("ready_for_review");
    incomplete.pendingHostedEvidence = ["repository-controls"];
    const expected = acceptanceStatusExpectation({
      report: incomplete,
      resolution: resolution(),
      pull: pull(),
      repository,
      defaultBranch: "main",
      env: environment(),
    });
    expect(expected.state).toBe("failure");
  });

  it("allows the merged migration only for its verified closed PR and original head", async () => {
    const { acceptanceStatusExpectation } = await statusModule();
    const expected = acceptanceStatusExpectation({
      report: {
        ...report(),
        provenance: {
          ...report().provenance,
          event: "workflow_dispatch",
        },
      },
      resolution: resolution("bootstrap-migration"),
      pull: pull("bootstrap-migration"),
      repository,
      defaultBranch: "main",
      env: environment("bootstrap-migration"),
    });
    expect(expected).toMatchObject({
      state: "success",
      sha: headSha,
      baseSha,
      rulesetSnapshotDigest: "9".repeat(64),
      sourceRunId: "42",
      sourceRunAttempt: "2",
    });
  });

  it("allows the protected maintenance continuation only for the exact source and publisher runs", async () => {
    const { acceptanceStatusExpectation } = await statusModule();
    const inputReport = report();
    inputReport.provenance = {
      ...inputReport.provenance,
      workflow: "System Maintenance Approval",
      event: "workflow_dispatch",
      executionRunId: "901",
      executionRunAttempt: "1",
    };
    const env = {
      ...environment("bootstrap-migration"),
      GITHUB_WORKFLOW: "System Maintenance Approval",
      GITHUB_RUN_ID: "901",
      GITHUB_RUN_ATTEMPT: "1",
    };
    const expected = acceptanceStatusExpectation({
      report: inputReport,
      resolution: maintenanceResolution("bootstrap-migration"),
      pull: pull("bootstrap-migration"),
      repository,
      defaultBranch: "main",
      env,
    });
    expect(expected).toMatchObject({
      state: "success",
      sha: headSha,
      sourceRunId: "42",
      sourceRunAttempt: "2",
      publisherAppId: "5075466",
      rulesetSnapshotDigest: "9".repeat(64),
    });
  });

  it.each([
    ["app id", { NORTHSTAR_TRUSTED_PUBLISHER_APP_ID: "1" }],
    ["publisher ref", { GITHUB_REF: "refs/heads/feature" }],
    ["publisher workflow", { GITHUB_WORKFLOW: "Governed Change" }],
    ["current head", { NORTHSTAR_HEAD_SHA: "f".repeat(40) }],
  ])("rejects a mismatched %s before creating any status", async (_name, changed) => {
    const { acceptanceStatusExpectation } = await statusModule();
    expect(() =>
      acceptanceStatusExpectation({
        report: report(),
        resolution: resolution(),
        pull: pull(),
        repository,
        defaultBranch: "main",
        env: { ...environment(), ...changed },
      }),
    ).toThrow();
  });

  it("does not accept a fabricated ready_for_acceptance decision", async () => {
    const { acceptanceStatusExpectation } = await statusModule();
    const incomplete = report();
    incomplete.pendingHostedEvidence = ["repository-controls"];
    expect(() =>
      acceptanceStatusExpectation({
        report: incomplete,
        resolution: resolution(),
        pull: pull(),
        repository,
        defaultBranch: "main",
        env: environment(),
      }),
    ).toThrow(/claims ready_for_acceptance/);
  });

  it("records the actual status creator, App, context, and run provenance", async () => {
    const { acceptanceStatusExpectation, verifyPublishedStatus } = await statusModule();
    const expected = acceptanceStatusExpectation({
      report: report(),
      resolution: resolution(),
      pull: pull(),
      repository,
      defaultBranch: "main",
      env: environment(),
    });
    const receipt = verifyPublishedStatus({
      id: 501,
      url: "https://api.github.com/repos/webmaxru/northstar-orders-api-demo/statuses/501",
      sha: headSha,
      context: "trusted-acceptance",
      state: "success",
      target_url: expected.targetUrl,
      creator: { login: "publisher[bot]", type: "Bot" },
      created_at: "2026-09-27T10:05:00Z",
    }, expected);
    expect(receipt).toMatchObject({
      schema: "northstar/trusted-acceptance-status/1",
      context: "trusted-acceptance",
      state: "success",
      sha: headSha,
      statusId: 501,
      creatorLogin: "publisher[bot]",
      creatorType: "Bot",
      publisherAppId: "5075466",
      sourceRunId: "42",
      sourceRunAttempt: "2",
    });
  });

  it("rejects a status response from the wrong App or commit", async () => {
    const { acceptanceStatusExpectation, verifyPublishedStatus } = await statusModule();
    const expected = acceptanceStatusExpectation({
      report: report(),
      resolution: resolution(),
      pull: pull(),
      repository,
      defaultBranch: "main",
      env: environment(),
    });
    for (const changed of [
      { sha: "f".repeat(40) },
      { context: "other-status" },
      { creator: { login: "attacker[bot]", type: "Bot" } },
      { creator: { login: "publisher[bot]", type: "User" } },
    ]) {
      expect(() =>
        verifyPublishedStatus({
          id: 501,
          sha: headSha,
          context: "trusted-acceptance",
          state: "success",
          target_url: expected.targetUrl,
          creator: { login: "publisher[bot]", type: "Bot" },
          ...changed,
        }, expected),
      ).toThrow(/status identity/);
    }
  });
});

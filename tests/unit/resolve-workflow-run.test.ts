import { describe, expect, it } from "vitest";
import {
  isResolvedPullRequest,
  fetchHistoricalPlanApproval,
  resolveWorkflowRun,
  revalidateWorkflowRun,
  selectAttemptArtifactIds,
  validateHistoricalPlanApproval,
  validateRestoredBootstrapRuleset,
  validateResolvedWorkflowRunContext,
} from "../../scripts/resolve-workflow-run.mjs";
import type { WorkflowResolutionInput } from "../../scripts/resolve-workflow-run.mjs";
import { planDigest, renderPlanContract } from "../../scripts/plan-contract.mjs";
import type { PlanContract } from "../../scripts/plan-contract.mjs";
import { renderPlan } from "../../scripts/publish-plan.mjs";
import { requiredChecksForRisk } from "../../scripts/risk-policy.mjs";
import { parseIssueBody } from "../../scripts/task-contract.mjs";
import type { TaskContract } from "../../scripts/task-contract.mjs";

const repository = "webmaxru/northstar-orders-api-demo";
const repositoryId = 1343225461;
const sourceRunId = 36312764675;
const sourceAttempt = 1;
const baseSha = "b".repeat(40);
const headSha = "a".repeat(40);
const mergeSha = "e".repeat(40);
const changedMainBaseSha = "f".repeat(40);
const bootstrapPlanHead = "c".repeat(40);
const dispatcher = "system-maintenance-dispatch[bot]";
const startedAt = "2026-09-27T10:00:00Z";
const finishedAt = "2026-09-27T10:02:00Z";
const restoredStatusContexts: Array<[string, number]> = [
  ["acceptance", 15368],
  ["codeql", 15368],
  ["dependency-review", 15368],
  ["evidence", 15368],
  ["governance-policy", 15368],
  ["human-review", 15368],
  ["merge-validation", 15368],
  ["plan-approval", 15368],
  ["plan-contract", 15368],
  ["quality", 15368],
  ["repository-controls", 15368],
  ["scope-policy", 15368],
  ["secret-scan", 15368],
  ["trusted-acceptance", 5075466],
];

type TestRuleset = {
  id: number;
  name: string;
  target: string;
  source_type: string;
  source: string;
  enforcement: string;
  conditions: { ref_name: { exclude: string[]; include: string[] } };
  bypass_actors: Array<Record<string, unknown>>;
  current_user_can_bypass: string;
  rules: Array<
    | { type: "deletion" }
    | { type: "non_fast_forward" }
    | {
        type: "pull_request";
        parameters: {
          required_approving_review_count: number;
          dismiss_stale_reviews_on_push: boolean;
          required_reviewers: string[];
          require_code_owner_review: boolean;
          require_last_push_approval: boolean;
          required_review_thread_resolution: boolean;
          require_extra_approval_for_unattributed_changes: boolean;
          allowed_merge_methods: string[];
        };
      }
    | {
        type: "required_status_checks";
        parameters: {
          strict_required_status_checks_policy: boolean;
          do_not_enforce_on_create: boolean;
          required_status_checks: Array<{ context: string; integration_id: number }>;
        };
      }
  >;
};

function restoredRuleset(): TestRuleset {
  return {
    id: 23998987,
    name: "AIES - Main branch protection",
    target: "branch",
    source_type: "Repository",
    source: repository,
    enforcement: "active",
    conditions: { ref_name: { exclude: [], include: ["~DEFAULT_BRANCH"] } },
    bypass_actors: [],
    current_user_can_bypass: "never",
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      {
        type: "pull_request",
        parameters: {
          required_approving_review_count: 1,
          dismiss_stale_reviews_on_push: true,
          required_reviewers: [],
          require_code_owner_review: true,
          require_last_push_approval: true,
          required_review_thread_resolution: false,
          require_extra_approval_for_unattributed_changes: true,
          allowed_merge_methods: ["merge", "squash", "rebase"],
        },
      },
      {
        type: "required_status_checks",
        parameters: {
          strict_required_status_checks_policy: true,
          do_not_enforce_on_create: false,
          required_status_checks: restoredStatusContexts.map(([context, integration_id]) => ({
            context,
            integration_id,
          })),
        },
      },
    ],
  };
}

const sourceContract = parseIssueBody(
  `### Task id
AES-SURFACE-EVIDENCE
### Goal
Prove immutable source-run resolution for the parent control-plane task.
### Authoritative sources
AGENTS.md
### Allowed scope
.github/**
scripts/**
docs/**
### Prohibited scope
production
### Constraints
Use the exact task and plan identity.
### Outputs
change | Bound source-run evidence.
### Success criteria
AC1 | Source runs stay bound to their pull request | resolves exact source-run identity
### Stop conditions
Missing or stale authority.
`,
  {
    number: 14,
    source: "issue #14",
    url: `https://github.com/${repository}/issues/14`,
    actor: "fixture-owner",
    association: "OWNER",
    trusted: true,
  },
);

const bootstrapContract = parseIssueBody(
  `### Task id
AES-TRUSTED-ACCEPTANCE-BOOTSTRAP
### Goal
Bootstrap exact trusted acceptance for the approved parent migration.
### Authoritative sources
AGENTS.md
### Allowed scope
.github/**
scripts/**
docs/**
tests/**
### Prohibited scope
production
### Constraints
Use the current independent plan approval.
### Outputs
change | A protected migration publisher.
### Success criteria
AC1 | Dispatch binds all source identities | resolves merged migration provenance
### Stop conditions
Missing or stale authority.
`,
  {
    number: 24,
    source: "issue #24",
    url: `https://github.com/${repository}/issues/24`,
    actor: "fixture-owner",
    association: "OWNER",
    trusted: true,
  },
);

function makePlan(contract: typeof sourceContract, baseBranch: string, planBase: string) {
  const plan = {
    schema: "northstar/plan/1" as const,
    taskId: contract.id,
    contractDigest: contract.source.bodyDigest,
    baseBranch,
    baseSha: planBase,
    risk: "high" as const,
    objective: contract.inputs.goal,
    scope: { allowed: [".github/**", "scripts/**", "docs/**"], prohibited: [] },
    steps: ["Resolve only the exact source run."],
    requiredChecks: requiredChecksForRisk("high"),
    successCriteria: contract.successCriteria.map(({ id, provenBy }) => ({
      id,
      provenBy,
    })),
    evidence: ["An immutable run, PR, plan, and artifact identity."],
    decisionsAndHandoffs: ["Stop when any live identity differs."],
    risks: ["Stale or cross-repository run metadata."],
    rollbackAndEscalation: ["Fail closed without importing artifacts."],
  };
  return { ...plan, planDigest: planDigest(plan) };
}

function fixture(
  mode: "open-pr" | "bootstrap-migration",
  maintenanceContinuation = false,
) {
  const baseRef = mode === "bootstrap-migration"
    ? "main"
    : "agent/implement/parent-task";
  const sourcePlan = makePlan(sourceContract, baseRef, baseSha);
  const planHead = "d".repeat(40);
  const sourceBody = renderPlan(renderPlanContract(sourcePlan), { issue: 14 });
  const bootstrapPlan = makePlan(
    bootstrapContract,
    "agent/implement/aes-surface-evidence",
    "2ce3cf8a69439c22246de7d5449ce186e23bd584",
  );
  const sourceApproval = {
    planDigest: planDigest(sourcePlan),
    contractDigest: sourceContract.source.bodyDigest,
    reviewedCommit: planHead,
    reviewId: 105,
    reviewer: "fixture-reviewer",
  };
  const bootstrapApproval = {
    planDigest: planDigest(bootstrapPlan),
    contractDigest: bootstrapContract.source.bodyDigest,
    reviewedCommit: bootstrapPlanHead,
    reviewId: 106,
    reviewer: "fixture-reviewer",
  };
  const readTask = (issue: number): TaskContract => {
    if (issue === 14) return sourceContract;
    if (issue === 24) return bootstrapContract;
    throw new Error(`Unexpected task issue ${issue}`);
  };
  const readApproved = (contract: TaskContract) => {
    if (contract.id === sourceContract.id) {
      return {
        plan: sourcePlan,
        approval: sourceApproval,
        pr: {
          number: 15,
          isDraft: false,
          baseRefOid: baseSha,
          headRefOid: planHead,
          body: sourceBody,
        },
      };
    }
    return {
      plan: bootstrapPlan,
      approval: bootstrapApproval,
      pr: {
        number: 25,
        isDraft: false,
        baseRefOid: bootstrapPlan.baseSha,
        headRefOid: bootstrapPlanHead,
        body: renderPlan(renderPlanContract(bootstrapPlan), { issue: 24 }),
      },
    };
  };
  const readHistoricalApproval = ({
    contract,
    plan,
  }: {
    contract: TaskContract;
    plan?: PlanContract | null;
  }) => {
    const selectedPlan: PlanContract = plan ??
      (contract.id === sourceContract.id ? sourcePlan : bootstrapPlan);
    return {
      plan: selectedPlan,
      planPr: contract.id === sourceContract.id ? 15 : 25,
      planHeadSha: contract.id === sourceContract.id ? planHead : bootstrapPlanHead,
      reviewId: contract.id === sourceContract.id ? 105 : 106,
      reviewer: "fixture-reviewer",
      approvedAt: "2026-09-27T09:00:00Z",
      planDigest: planDigest(selectedPlan),
      contractDigest: contract.source.bodyDigest,
      baseSha: selectedPlan.baseSha,
      baseBranch: selectedPlan.baseBranch,
      approval: {
        planDigest: planDigest(selectedPlan),
        contractDigest: contract.source.bodyDigest,
        reviewedCommit: contract.id === sourceContract.id ? planHead : bootstrapPlanHead,
        reviewId: contract.id === sourceContract.id ? 105 : 106,
        reviewer: "fixture-reviewer",
      },
      pr: {
        number: contract.id === sourceContract.id ? 15 : 25,
        isDraft: false,
        baseRefOid: selectedPlan.baseSha,
        headRefOid: contract.id === sourceContract.id ? planHead : bootstrapPlanHead,
      },
    };
  };
  const pull = {
    number: mode === "bootstrap-migration" ? 18 : 34,
    state: mode === "bootstrap-migration" ? "closed" : "open",
    merged: mode === "bootstrap-migration",
    merged_at: mode === "bootstrap-migration" ? "2026-09-27T10:03:00Z" : null,
    merge_commit_sha: mode === "bootstrap-migration" ? mergeSha : null,
    body: sourceBody,
    head: {
      sha: headSha,
      ref: "agent/implement/aes-surface-evidence",
      repo: { full_name: repository },
    },
    base: {
      ref: baseRef,
      sha: mode === "bootstrap-migration" ? changedMainBaseSha : baseSha,
      repo: { full_name: repository },
    },
  };
  const association = {
    number: pull.number,
    head: {
      sha: headSha,
      ref: pull.head.ref,
      repo: { id: repositoryId, name: "northstar-orders-api-demo" },
    },
    base: {
      sha: baseSha,
      ref: baseRef,
      repo: { id: repositoryId, name: "northstar-orders-api-demo" },
    },
  };
  const sourceRun = {
    id: sourceRunId,
    run_attempt: sourceAttempt,
    name: "Governed Change",
    path: ".github/workflows/governed-change.yml",
    event: "pull_request",
    status: "completed",
    conclusion: "failure",
    repository: { full_name: repository },
    head_repository: { full_name: repository },
    head_sha: headSha,
    run_started_at: startedAt,
    updated_at: finishedAt,
    pull_requests: [association],
  };
  const publisherRun: {
    id: number;
    run_attempt: number;
    name: string;
    path: string;
    event: string;
    status: "in_progress" | "completed";
    conclusion: string | null;
    repository: { id: number; full_name: string };
    head_branch: string;
    head_sha: string;
  } = {
    id: 77,
    run_attempt: 1,
    name: "Publish Evidence",
    path: ".github/workflows/publish-evidence.yml",
    event: mode === "bootstrap-migration" ? "workflow_dispatch" : "workflow_run",
    status: "completed",
    conclusion: "success",
    repository: { id: repositoryId, full_name: repository },
    head_branch: "main",
    head_sha: "9".repeat(40),
  };
  const publisherJob: {
    id: number;
    name: string;
    run_id: number;
    head_sha: string;
    status: "in_progress" | "completed";
    conclusion: string | null;
    started_at: string;
    completed_at: string | null;
  } = {
    id: 770,
    name: "publish",
    run_id: publisherRun.id,
    head_sha: publisherRun.head_sha,
    status: "completed",
    conclusion: "success",
    started_at: "2026-09-27T10:03:00Z",
    completed_at: "2026-09-27T10:05:00Z",
  };
  const publisherArtifact = {
    id: 1200,
    name: "northstar-system-maintenance-evidence",
    expired: false,
    size_in_bytes: 2048,
    created_at: "2026-09-27T10:04:00Z",
    workflow_run: {
      id: publisherRun.id,
      repository_id: repositoryId,
      head_repository_id: repositoryId,
      head_sha: publisherRun.head_sha,
      head_branch: "main",
    },
  };
  const jobNames = [
    "plan-contract",
    "quality",
    "acceptance",
    "dependency-review",
    "secret-scan",
    "codeql",
    "merge-validation",
    "governance-policy",
  ];
  const jobs = jobNames.map((name) => ({
    id: 700 + jobsIndex(name),
    name,
    run_id: sourceRunId,
    head_sha: headSha,
    status: "completed",
    conclusion: "success",
    started_at: startedAt,
    completed_at: finishedAt,
  }));
  const artifacts = [
    ["northstar-plan-context", "plan-contract"],
    ["northstar-check-quality", "quality"],
    ["northstar-check-acceptance", "acceptance"],
    ["northstar-check-dependency", "dependency-review"],
    ["northstar-check-secret", "secret-scan"],
    ["northstar-check-codeql", "codeql"],
    ["northstar-check-merge", "merge-validation"],
    ["northstar-check-governance", "governance-policy"],
  ].map(([name], index) => ({
    id: 900 + index,
    name,
    expired: false,
    size_in_bytes: 128,
    created_at: "2026-09-27T10:01:00Z",
    workflow_run: {
      id: sourceRunId,
      repository_id: repositoryId,
      head_repository_id: repositoryId,
      head_sha: headSha,
    },
  }));
  const eventRun = {
    id: sourceRunId,
    run_attempt: sourceAttempt,
    head_sha: headSha,
    event: "pull_request",
    repository: { full_name: repository },
    pull_requests: [association],
  };
  const calls: string[][] = [];
  const run = (args: string[]) => {
    calls.push(args);
    const route = args.at(-1)!;
    if (/\/actions\/runs\/77\/attempts\/\d+$/.test(route)) {
      return JSON.stringify(publisherRun);
    }
    if (route === `repos/${repository}/actions/runs/77`) {
      return JSON.stringify(publisherRun);
    }
    if (route === `repos/${repository}/actions/runs/77/attempts/${publisherRun.run_attempt}/jobs?per_page=100`) {
      return JSON.stringify([{ total_count: 1, jobs: [publisherJob] }]);
    }
    if (route === `repos/${repository}/actions/runs/77/artifacts?per_page=100`) {
      return JSON.stringify([{ total_count: 1, artifacts: [publisherArtifact] }]);
    }
    if (route === `repos/${repository}`) {
      return JSON.stringify({
        id: repositoryId,
        full_name: repository,
        default_branch: "main",
      });
    }
    if (route === `repos/${repository}/rulesets/23998987`) {
      return JSON.stringify(restoredRuleset());
    }
    if (/\/actions\/runs\/\d+\/attempts\/\d+$/.test(route)) {
      return JSON.stringify(sourceRun);
    }
    if (route === `repos/${repository}/actions/runs/${sourceRunId}`) {
      return JSON.stringify(sourceRun);
    }
    if (route === `repos/${repository}/pulls/15`) {
      return JSON.stringify({
        number: 15,
        state: "open",
        draft: false,
        body: sourceBody,
        head: { sha: planHead, repo: { full_name: repository } },
        base: { sha: baseSha, ref: baseRef, repo: { full_name: repository } },
      });
    }
    if (route === `repos/${repository}/pulls/25`) {
      return JSON.stringify({
        number: 25,
        state: "open",
        draft: false,
        body: renderPlan(renderPlanContract(bootstrapPlan), { issue: 24 }),
        head: { sha: bootstrapPlanHead, repo: { full_name: repository } },
        base: {
          sha: bootstrapPlan.baseSha,
          ref: "agent/implement/aes-surface-evidence",
          repo: { full_name: repository },
        },
      });
    }
    if (route === `repos/${repository}/pulls/${pull.number}`) {
      return JSON.stringify(pull);
    }
    if (route === `repos/${repository}/commits/${headSha}/pulls?per_page=100`) {
      return JSON.stringify([[pull]]);
    }
    if (
      route ===
      `repos/${repository}/actions/runs/${sourceRunId}/attempts/${sourceRun.run_attempt}/jobs?per_page=100`
    ) {
      return JSON.stringify([{ total_count: jobs.length, jobs }]);
    }
    if (route === `repos/${repository}/actions/runs/${sourceRunId}/artifacts?per_page=100`) {
      return JSON.stringify([{ total_count: artifacts.length, artifacts }]);
    }
    if (route.endsWith(`/compare/${baseSha}...${headSha}`)) {
      return JSON.stringify({
        status: "ahead",
        merge_base_commit: { sha: baseSha },
      });
    }
    if (route.endsWith(`/compare/${headSha}...${mergeSha}`)) {
      return JSON.stringify({
        status: "ahead",
        merge_base_commit: { sha: headSha },
      });
    }
    throw new Error(`Unexpected GitHub API route ${route}`);
  };
  return {
    sourcePlan,
    bootstrapPlan,
    sourceApproval,
    bootstrapApproval,
    sourceRun,
    publisherRun,
    publisherJob,
    publisherArtifact,
    pull,
    jobs,
    artifacts,
    eventRun,
    readTask,
    readApproved,
    readHistoricalApproval,
    run,
    calls,
    input: {
      mode,
      eventName: maintenanceContinuation || mode === "bootstrap-migration"
        ? "workflow_dispatch" as const
        : "workflow_run" as const,
      repository,
      sourceRunId,
      sourceRunAttempt: sourceAttempt,
      pullRequest: pull.number,
      ...(mode === "bootstrap-migration"
        ? {
            bootstrapPlanPr: 25,
            bootstrapPlanHeadSha: bootstrapPlanHead,
          }
        : maintenanceContinuation ? {} : { eventRun }),
      ...(maintenanceContinuation
        ? {
            maintenanceContinuation: true,
            publisherRunId: publisherRun.id,
            publisherRunAttempt: publisherRun.run_attempt,
          }
        : {}),
      ...(maintenanceContinuation || mode === "bootstrap-migration"
        ? {
            actor: dispatcher,
            dispatcherLogin: dispatcher,
            ref: "refs/heads/main",
          }
        : {}),
    },
  };
}

function jobsIndex(name: string): number {
  return [
    "plan-contract",
    "quality",
    "acceptance",
    "dependency-review",
    "secret-scan",
    "codeql",
    "merge-validation",
    "governance-policy",
  ].indexOf(name);
}

function resolve(f: ReturnType<typeof fixture>) {
  return resolveWorkflowRun(f.input, {
    run: f.run,
    readTask: f.readTask,
    readApproved: f.readApproved,
    readHistoricalApproval: f.readHistoricalApproval,
  });
}

describe("attempt-bound workflow resolution", () => {
  it("preserves hosted-control and approval boundaries", () => {
    expect(validateRestoredBootstrapRuleset(restoredRuleset())).toMatchObject({
      ok: true,
      id: 23998987,
      strict: true,
      bypassActorCount: 0,
      contextIntegrations: restoredStatusContexts.map(([context, integrationId]) => ({
        context,
        integrationId,
      })),
    });
    const missingControls = restoredRuleset();
    const statusRule = missingControls.rules.find(
      (rule) => rule.type === "required_status_checks",
    );
    if (!statusRule || statusRule.type !== "required_status_checks") {
      throw new Error("Test ruleset has no status rule.");
    }
    const required = statusRule.parameters.required_status_checks;
    statusRule.parameters.required_status_checks = required.filter(
      ({ context }) => context !== "repository-controls",
    );
    expect(validateRestoredBootstrapRuleset(missingControls)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        "required status contexts or their integration identities are not fully restored",
      ]),
    });

    const wrongPublisher = restoredRuleset();
    const publisherRule = wrongPublisher.rules.find(
      (rule) => rule.type === "required_status_checks",
    );
    if (!publisherRule || publisherRule.type !== "required_status_checks") {
      throw new Error("Test ruleset has no status rule.");
    }
    publisherRule.parameters.required_status_checks = required.map((item) =>
      item.context === "trusted-acceptance"
        ? { ...item, integration_id: 15368 }
        : item,
    );
    expect(validateRestoredBootstrapRuleset(wrongPublisher).ok).toBe(false);
    const bypass = restoredRuleset();
    bypass.bypass_actors.push({ actor_id: 123, actor_type: "Team", bypass_mode: "always" });
    expect(validateRestoredBootstrapRuleset(bypass).ok).toBe(false);
  });

  it("revalidates a native plan review against the original base after its live base advances", () => {
    const plan = makePlan(sourceContract, "main", baseSha);
    const planHeadSha = "d".repeat(40);
    const artifactBody = renderPlanContract(plan);
    const pullBody = renderPlan(artifactBody, { issue: 14 });
    const planPull = {
      number: 15,
      state: "closed",
      merged: true,
      draft: false,
      html_url: `https://github.com/${repository}/pull/15`,
      body: pullBody,
      user: { login: "webmaxru" },
      head: { sha: planHeadSha, ref: "plan/aes-surface-evidence", repo: { full_name: repository } },
      base: {
        sha: changedMainBaseSha,
        ref: "main",
        repo: { full_name: repository },
      },
    };
    const review = {
      id: 108,
      state: "APPROVED",
      user: { login: "vibeprogrammer", type: "User" },
      commit_id: planHeadSha,
      submitted_at: "2026-09-27T09:00:00Z",
    };
    const blobBytes = Buffer.from(artifactBody);
    const blobSha = "9".repeat(40);
    let reviewRead = 0;
    let revokeApproval = false;
    const run = (args: string[]) => {
      const route = args.at(-1)!;
      if (route.includes("/pulls?state=all&head=")) return JSON.stringify([[planPull]]);
      if (route === `repos/${repository}/compare/${baseSha}...${planHeadSha}`) {
        return JSON.stringify({
          status: "ahead",
          merge_base_commit: { sha: baseSha },
        });
      }
      if (route === `repos/{owner}/{repo}/git/commits/${planHeadSha}`) {
        return JSON.stringify({ tree: { sha: "1".repeat(40) } });
      }
      if (route === `repos/{owner}/{repo}/git/trees/${"1".repeat(40)}`) {
        return JSON.stringify({
          truncated: false,
          tree: [{ path: "docs", type: "tree", mode: "040000", sha: "2".repeat(40) }],
        });
      }
      if (route === `repos/{owner}/{repo}/git/trees/${"2".repeat(40)}`) {
        return JSON.stringify({
          truncated: false,
          tree: [{ path: "plans", type: "tree", mode: "040000", sha: "3".repeat(40) }],
        });
      }
      if (route === `repos/{owner}/{repo}/git/trees/${"3".repeat(40)}`) {
        return JSON.stringify({
          truncated: false,
          tree: [{
            path: "aes-surface-evidence.md",
            type: "blob",
            mode: "100644",
            sha: blobSha,
            size: blobBytes.length,
          }],
        });
      }
      if (route === `repos/{owner}/{repo}/git/blobs/${blobSha}`) {
        return JSON.stringify({
          sha: blobSha,
          encoding: "base64",
          size: blobBytes.length,
          content: blobBytes.toString("base64"),
        });
      }
      if (route === `repos/${repository}/pulls/15/reviews?per_page=100`) {
        reviewRead += 1;
        const current = reviewRead >= 2
          ? [{
              ...review,
              state: revokeApproval ? "DISMISSED" : review.state,
              submitted_at: "2026-09-27T09:00:00Z",
            }]
          : [review];
        return JSON.stringify([current]);
      }
      if (route === `repos/${repository}/pulls/15/files?per_page=100`) {
        return JSON.stringify([[
          {
            filename: "docs/plans/aes-surface-evidence.md",
            status: "added",
            sha: blobSha,
          },
        ]]);
      }
      if (route === "repos/{owner}/{repo}/collaborators/vibeprogrammer/permission") {
        return JSON.stringify({
          permission: "write",
          user: { login: "vibeprogrammer", type: "User" },
        });
      }
      if (route === `repos/${repository}/pulls/15`) {
        return JSON.stringify(planPull);
      }
      throw new Error(`Unexpected historical plan route: ${route}`);
    };
    const result = fetchHistoricalPlanApproval({
      contract: sourceContract,
      plan,
      repository,
      sourceRunStartedAt: "2026-09-27T10:00:00Z",
      run,
    });
    expect(result).toMatchObject({
      planPr: 15,
      planHeadSha,
      reviewId: 108,
      baseSha,
      baseBranch: "main",
      plan: { taskId: "AES-SURFACE-EVIDENCE", baseSha },
      pr: { number: 15, headRefOid: planHeadSha, baseRefOid: baseSha },
    });
    expect(planPull.base.sha).toBe(changedMainBaseSha);
    const fromCommittedArtifact = fetchHistoricalPlanApproval({
      contract: sourceContract,
      repository,
      sourceRunStartedAt: "2026-09-27T10:00:00Z",
      run,
    });
    expect(fromCommittedArtifact.plan).toMatchObject({
      taskId: sourceContract.id,
      baseSha,
      baseBranch: "main",
    });
    reviewRead = 0;
    revokeApproval = true;
    expect(() => fetchHistoricalPlanApproval({
      contract: sourceContract,
      plan,
      repository,
      sourceRunStartedAt: "2026-09-27T10:00:00Z",
      run,
    })).toThrow(/original plan approval is no longer current/);
  });

  it("preserves a native plan approval bound to the original base after main advances", () => {
    const plan = makePlan(sourceContract, "main", baseSha);
    const planHeadSha = "d".repeat(40);
    const planBody = renderPlan(renderPlanContract(plan), { issue: 14 });
    const planPull = {
      number: 15,
      state: "closed",
      merged: true,
      draft: false,
      html_url: `https://github.com/${repository}/pull/15`,
      body: planBody,
      user: { login: "fixture-author" },
      head: { sha: planHeadSha, repo: { full_name: repository } },
      base: {
        ref: "main",
        sha: changedMainBaseSha,
        repo: { full_name: repository },
      },
    };
    const files = [{
      filename: "docs/plans/aes-surface-evidence.md",
      status: "added",
    }];
    const entry = {
      type: "blob",
      mode: "100644",
      path: "aes-surface-evidence.md",
      sha: "9".repeat(40),
    };
    const reviews = [{
      id: 107,
      state: "APPROVED",
      user: { login: "fixture-reviewer", type: "User" },
      commit_id: planHeadSha,
      submitted_at: "2026-09-27T09:00:00Z",
    }];
    const input = {
      plan,
      committedPlan: plan,
      planPull,
      reviews,
      files,
      entry,
      eligibleReviewers: ["fixture-reviewer"],
      repository,
      contract: sourceContract,
      sourceRunStartedAt: "2026-09-27T10:00:00Z",
    };
    expect(validateHistoricalPlanApproval(input)).toMatchObject({
      planPr: 15,
      planHeadSha,
      reviewId: 107,
      baseSha,
      baseBranch: "main",
    });

    expect(() => validateHistoricalPlanApproval({
      ...input,
      reviews: [{
        ...reviews[0],
        submitted_at: "2026-09-27T10:01:00Z",
      }],
    })).toThrow(/not approved before/);
    expect(() => validateHistoricalPlanApproval({
      ...input,
      reviews: [{ ...reviews[0], commit_id: "8".repeat(40) }],
    })).toThrow(/no longer current/);
    expect(() => validateHistoricalPlanApproval({
      ...input,
      files: [...files, { filename: "scripts/untrusted.mjs", status: "added" }],
    })).toThrow(/not plan-only/);
    expect(() => validateHistoricalPlanApproval({
      ...input,
      planPull: {
        ...planPull,
        base: {
          ...planPull.base,
          ref: "release",
        },
      },
    })).toThrow(/base branch/);
    const changedPlan = { ...plan, objective: "Changed after approval" };
    expect(() => validateHistoricalPlanApproval({
      ...input,
      committedPlan: changedPlan,
    })).toThrow();
  });

  it("selects only artifacts created by the exact source jobs and attempt", () => {
    const f = fixture("open-pr");
    const selected = selectAttemptArtifactIds({
      artifacts: f.artifacts,
      jobs: f.jobs,
      runId: sourceRunId,
      repositoryId,
      headSha,
    });
    expect(selected.map(({ id }) => id)).toEqual([
      900, 901, 902, 903, 904, 905, 906, 907,
    ]);
  });

  it.each([
    ["expired", (artifacts: Array<Record<string, unknown>>) => {
      artifacts[0]!.expired = true;
    }],
    ["wrong run", (artifacts: Array<Record<string, unknown>>) => {
      artifacts[0]!.workflow_run = {
        ...(artifacts[0]!.workflow_run as object),
        id: sourceRunId + 1,
      };
    }],
    ["wrong repository", (artifacts: Array<Record<string, unknown>>) => {
      artifacts[0]!.workflow_run = {
        ...(artifacts[0]!.workflow_run as object),
        repository_id: repositoryId + 1,
      };
    }],
    ["wrong head", (artifacts: Array<Record<string, unknown>>) => {
      artifacts[0]!.workflow_run = {
        ...(artifacts[0]!.workflow_run as object),
        head_sha: "f".repeat(40),
      };
    }],
    ["old attempt window", (artifacts: Array<Record<string, unknown>>) => {
      artifacts[0]!.created_at = "2026-09-27T09:00:00Z";
    }],
  ])("rejects a %s artifact before selecting download IDs", (_name, mutate) => {
    const f = fixture("open-pr");
    mutate(f.artifacts);
    expect(() =>
      selectAttemptArtifactIds({
        artifacts: f.artifacts,
        jobs: f.jobs,
        runId: sourceRunId,
        repositoryId,
        headSha,
      }),
    ).toThrow(/exactly one/);
  });

  it("resolves a same-repository stacked PR using its immutable base snapshot", () => {
    const f = fixture("open-pr");
    const result = resolve(f);
    expect(result).toMatchObject({
      mode: "open-pr",
      pullRequest: 34,
      headSha,
      baseSha,
      baseRef: "agent/implement/parent-task",
      planDigest: planDigest(f.sourcePlan),
      taskPlanApproval: { planPr: 15, planHeadSha: "d".repeat(40) },
    });
    expect(result.artifactIds).toBe("900,901,902,903,904,905,906,907");
    expect(f.calls.some((args) =>
      args.at(-1) === `repos/${repository}/commits/${headSha}/pulls?per_page=100`,
    )).toBe(true);
  });

  it("resolves stacked and merged same-repository PR bases", () => {
    const stacked = resolve(fixture("open-pr"));
    expect(stacked).toMatchObject({
      mode: "open-pr",
      pullRequest: 34,
      baseRef: "agent/implement/parent-task",
      baseSha,
      mergeCommitSha: null,
    });
    const merged = resolve(fixture("bootstrap-migration"));
    expect(merged).toMatchObject({
      mode: "bootstrap-migration",
      pullRequest: 18,
      baseRef: "main",
      baseSha,
      mergeCommitSha: mergeSha,
      mergeAncestryVerified: true,
    });
  });

  it("resolves only the approved merged bootstrap while preserving the source base SHA", () => {
    const f = fixture("bootstrap-migration");
    const result = resolve(f);
    expect(result).toMatchObject({
      mode: "bootstrap-migration",
      pullRequest: 18,
      headSha,
      baseSha,
      baseRef: "main",
      mergeCommitSha: mergeSha,
      mergeAncestryVerified: true,
      bootstrapPlan: {
        issue: 24,
        planPr: 25,
        planHeadSha: bootstrapPlanHead,
        baseSha: "2ce3cf8a69439c22246de7d5449ce186e23bd584",
      },
    });
    expect(f.pull.base.sha).toBe(changedMainBaseSha);
    expect(isResolvedPullRequest(result, f.pull)).toBe(true);
    expect(validateResolvedWorkflowRunContext(result)).toEqual(result);
  });

  it("revalidates the exact publisher attempt before a protected maintenance continuation", () => {
    const open = fixture("open-pr", true);
    const openResult = resolve(open);
    expect(openResult).toMatchObject({
      mode: "open-pr",
      maintenanceContinuation: true,
      maintenancePublisher: {
        runId: "77",
        runAttempt: "1",
        event: "workflow_run",
        conclusion: "success",
        artifactId: 1200,
      },
      eventRun: null,
    });
    expect(validateResolvedWorkflowRunContext(openResult)).toEqual(openResult);

    const migration = fixture("bootstrap-migration", true);
    const migrationResult = resolve(migration);
    expect(migrationResult).toMatchObject({
      mode: "bootstrap-migration",
      maintenanceContinuation: true,
      maintenancePublisher: {
        runId: "77",
        runAttempt: "1",
        event: "workflow_dispatch",
        conclusion: "success",
        artifactId: 1200,
      },
      mergeCommitSha: mergeSha,
    });
  });

  it("resolves omitted maintenance attempts from exact GitHub run metadata", () => {
    const f = fixture("open-pr", true);
    f.sourceRun.run_attempt = 2;
    f.publisherRun.run_attempt = 2;
    const withoutAttempts: WorkflowResolutionInput = { ...f.input };
    delete withoutAttempts.sourceRunAttempt;
    delete withoutAttempts.publisherRunAttempt;
    const result = resolveWorkflowRun(withoutAttempts, {
      run: f.run,
      readTask: f.readTask,
      readApproved: f.readApproved,
      readHistoricalApproval: f.readHistoricalApproval,
    });

    expect(result).toMatchObject({
      sourceRunAttempt: "2",
      maintenancePublisher: {
        runAttempt: "2",
        artifactId: 1200,
      },
    });
    expect(validateResolvedWorkflowRunContext(result)).toEqual(result);

    const stale = fixture("open-pr", true);
    stale.sourceRun.run_attempt = 2;
    expect(() => resolveWorkflowRun({
      ...stale.input,
      sourceRunAttempt: 1,
    }, {
      run: stale.run,
      readTask: stale.readTask,
      readApproved: stale.readApproved,
      readHistoricalApproval: stale.readHistoricalApproval,
    })).toThrow(/exact completed same-repository/);
  });

  it("requires the maintenance publisher attempt and its artifact to complete before status revalidation", () => {
    const f = fixture("bootstrap-migration", true);
    f.publisherRun.status = "in_progress";
    f.publisherRun.conclusion = null;
    f.publisherJob.status = "in_progress";
    f.publisherJob.conclusion = null;
    f.publisherJob.completed_at = null;
    const pending = resolve(f);
    expect(pending.maintenancePublisher).toMatchObject({
      status: "in_progress",
      conclusion: null,
      artifactId: 1200,
    });

    f.publisherRun.status = "completed";
    f.publisherRun.conclusion = "success";
    f.publisherJob.status = "completed";
    f.publisherJob.conclusion = "success";
    f.publisherJob.completed_at = "2026-09-27T10:05:00Z";
    const completed = revalidateWorkflowRun(pending, {
      run: f.run,
      readTask: f.readTask,
      readApproved: f.readApproved,
      readHistoricalApproval: f.readHistoricalApproval,
    });
    expect(completed.maintenancePublisher).toMatchObject({
      status: "completed",
      conclusion: "success",
      artifactId: 1200,
    });
  });

  it("rejects a stale or unsuccessful publisher run before maintenance artifact import", () => {
    const f = fixture("bootstrap-migration", true);
    expect(() => resolveWorkflowRun({
      ...f.input,
      publisherRunAttempt: 2,
    }, {
      run: f.run,
      readTask: f.readTask,
      readApproved: f.readApproved,
      readHistoricalApproval: f.readHistoricalApproval,
    })).toThrow(/exact successful trusted publisher run/);

    const failedPublisher = fixture("bootstrap-migration", true);
    failedPublisher.publisherRun.conclusion = "failure";
    expect(() => resolve(failedPublisher)).toThrow(/exact successful trusted publisher run/);
  });

  it("rejects a non-default branch, non-dispatch actor, or different parent PR", () => {
    const f = fixture("bootstrap-migration");
    expect(() => resolveWorkflowRun({
      ...f.input,
      ref: "refs/heads/feature",
    }, {
      run: f.run,
      readTask: f.readTask,
      readApproved: f.readApproved,
      readHistoricalApproval: f.readHistoricalApproval,
    })).toThrow(/protected default branch/);

    expect(() => resolveWorkflowRun({
      ...f.input,
      actor: "untrusted-user",
    }, {
      run: f.run,
      readTask: f.readTask,
      readApproved: f.readApproved,
      readHistoricalApproval: f.readHistoricalApproval,
    })).toThrow(/approved dispatcher/);

    expect(() => resolveWorkflowRun({
      ...f.input,
      pullRequest: 19,
    }, {
      run: f.run,
      readTask: f.readTask,
      readApproved: f.readApproved,
      readHistoricalApproval: f.readHistoricalApproval,
    })).toThrow(/source run pull-request snapshot/);
  });

  it("rejects stale publisher run provenance", () => {
    const f = fixture("open-pr");
    expect(() => resolveWorkflowRun({
      ...f.input,
      sourceRunAttempt: 2,
    }, {
      run: f.run,
      readTask: f.readTask,
      readApproved: f.readApproved,
      readHistoricalApproval: f.readHistoricalApproval,
    })).toThrow(/exact completed same-repository/);

    expect(() => resolveWorkflowRun({
      ...f.input,
      eventRun: { ...f.eventRun, head_sha: "f".repeat(40) },
    }, {
      run: f.run,
      readTask: f.readTask,
      readApproved: f.readApproved,
    })).toThrow(/workflow_run event/);

    const rerun = fixture("open-pr");
    const currentRun = rerun.run;
    rerun.run = (args: string[]) => {
      const route = args.at(-1)!;
      if (route === `repos/${repository}/actions/runs/${sourceRunId}`) {
        return JSON.stringify({ ...rerun.sourceRun, run_attempt: 2 });
      }
      return currentRun(args);
    };
    expect(() => resolve(rerun)).toThrow(/exact completed same-repository/);
  });

  it("rejects a merged PR without verified ancestry or a current approved plan binding", () => {
    const noAncestry = fixture("bootstrap-migration");
    const originalRun = noAncestry.run;
    noAncestry.run = (args: string[]) => {
      if (args.at(-1) === `repos/${repository}/compare/${headSha}...${mergeSha}`) {
        return JSON.stringify({
          status: "ahead",
          merge_base_commit: { sha: baseSha },
        });
      }
      return originalRun(args);
    };
    expect(() => resolve(noAncestry)).toThrow(/Merged PR commit.*ancestry/);

    const wrongPlan = fixture("bootstrap-migration");
    expect(() => resolveWorkflowRun({
      ...wrongPlan.input,
      bootstrapPlanHeadSha: "f".repeat(40),
    }, {
      run: wrongPlan.run,
      readTask: wrongPlan.readTask,
      readApproved: wrongPlan.readApproved,
      readHistoricalApproval: wrongPlan.readHistoricalApproval,
    })).toThrow(/current independently approved issue #24 plan/);
  });

  it("does not treat a closed PR as an ordinary workflow-run target", () => {
    const f = fixture("open-pr");
    f.pull.state = "closed";
    f.pull.merged = true;
    expect(() => resolve(f)).toThrow(/Ordinary evidence publication requires/);
  });
});

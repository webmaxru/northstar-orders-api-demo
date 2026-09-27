import type { PlanContract } from "./plan-contract.d.mts";
import type { NativeApprovalRecord } from "./plan-approval.d.mts";
import type { PlanPr } from "./publish-plan.d.mts";
import type { TaskContract } from "./task-contract.d.mts";

export type WorkflowResolutionMode = "open-pr" | "bootstrap-migration";

export interface ResolvedWorkflowArtifact {
  name: string;
  job: string;
  id: number;
  createdAt: string;
}

export interface MaintenancePublisherIdentity {
  runId: string;
  runAttempt: string;
  workflow: string;
  event: "workflow_run" | "workflow_dispatch";
  headSha: string;
  conclusion: string;
  headBranch: string;
}

export interface RestoredBootstrapRuleset {
  id: 23998987;
  snapshotDigest: string;
  contextIntegrations: Array<{ context: string; integrationId: number }>;
  strict: true;
  bypassActorCount: 0;
}

export interface ResolvedWorkflowRun {
  schema: "northstar/resolved-workflow-run/1";
  mode: WorkflowResolutionMode;
  repository: string;
  defaultBranch: string;
  sourceRunId: string;
  sourceRunAttempt: string;
  sourceWorkflow: string;
  sourceEvent: "pull_request" | "pull_request_review";
  sourceConclusion: string | null;
  pullRequest: number;
  headSha: string;
  baseSha: string;
  baseRef: string;
  mergeCommitSha: string | null;
  mergeAncestryVerified: boolean;
  sourceRunStartedAt: string;
  sourceRunCompletedAt: string;
  restoredRuleset: RestoredBootstrapRuleset | null;
  taskIssue: number;
  taskId: string;
  contractDigest: string;
  planDigest: string;
  planRisk: string;
  planApprovalRequired: boolean;
  taskPlanApproval: {
    planPr: number;
    planHeadSha: string;
    reviewId: number;
    reviewer: string;
  } | null;
  bootstrapPlan: {
    issue: number;
    taskId: string;
    contractDigest: string;
    planPr: number;
    planHeadSha: string;
    planDigest: string;
    reviewId: number;
    reviewer: string;
    baseBranch: string;
    baseSha: string;
  } | null;
  dispatcherLogin: string | null;
  dispatchActor: string | null;
  dispatchRef: string | null;
  maintenanceContinuation: boolean;
  maintenancePublisher: MaintenancePublisherIdentity | null;
  eventRun: Record<string, unknown> | null;
  artifacts: ResolvedWorkflowArtifact[];
  artifactIds: string;
  resolvedAt: string;
}

export interface WorkflowResolutionInput {
  mode: WorkflowResolutionMode;
  eventName: "workflow_run" | "workflow_dispatch";
  repository: string;
  sourceRunId: string | number;
  sourceRunAttempt: string | number;
  pullRequest: string | number;
  eventRun?: Record<string, unknown>;
  bootstrapPlanPr?: string | number;
  bootstrapPlanHeadSha?: string;
  actor?: string;
  ref?: string;
  dispatcherLogin?: string;
  maintenanceContinuation?: boolean;
  publisherRunId?: string | number;
  publisherRunAttempt?: string | number;
}

export interface WorkflowResolutionDependencies {
  run?: (args: string[]) => string;
  readTask?: (issue: number) => TaskContract;
  readApproved?: (
    contract: TaskContract,
    deps: { run?: (args: string[]) => string },
  ) => {
    plan: PlanContract;
    approval: {
      planDigest: string;
      contractDigest: string;
      reviewedCommit: string;
      reviewId: number;
      reviewer: string;
    };
    pr: {
      number: number;
      isDraft: boolean;
      baseRefOid: string;
      headRefOid: string;
      body: string;
    };
  } | null;
  readHistoricalApproval?: (input: {
    contract: TaskContract;
    plan?: PlanContract | null;
    repository: string;
    sourceRunStartedAt: string;
    run: (args: string[]) => string;
  }) => {
    plan: PlanContract;
    planPr: number;
    planHeadSha: string;
    reviewId: number;
    reviewer: string;
    approvedAt: string;
    planDigest: string;
    contractDigest: string;
    baseSha: string;
    baseBranch: string;
  };
}

export declare const RESOLVED_RUN_PATH: string;
export declare const RESOLVED_RUN_SCHEMA: "northstar/resolved-workflow-run/1";

export declare function selectAttemptArtifactIds(input: {
  artifacts: Array<Record<string, unknown>>;
  jobs: Array<Record<string, unknown>>;
  runId: string | number;
  repositoryId: number;
  headSha: string;
}): ResolvedWorkflowArtifact[];

export declare function validateHistoricalPlanApproval(input: {
  plan: PlanContract;
  committedPlan: PlanContract;
  planPull: Record<string, unknown>;
  reviews: Array<Record<string, unknown>>;
  files: Array<Record<string, unknown>>;
  entry: Record<string, unknown>;
  eligibleReviewers: string[];
  repository: string;
  contract: TaskContract;
  sourceRunStartedAt: string;
}): {
  planPr: number;
  planHeadSha: string;
  reviewId: number;
  reviewer: string;
  approvedAt: string;
  planDigest: string;
  contractDigest: string;
  baseSha: string;
  baseBranch: string;
};

export declare function validateRestoredBootstrapRuleset(
  ruleset: unknown,
): {
  ok: boolean;
  errors: string[];
  snapshotDigest: string;
  id: 23998987;
  contextIntegrations: Array<{ context: string; integrationId: number }>;
  strict: boolean;
  bypassActorCount: number | null;
};

export declare function fetchHistoricalPlanApproval(input: {
  contract: TaskContract;
  plan?: PlanContract | null;
  repository: string;
  sourceRunStartedAt: string;
  run?: (args: string[]) => string;
}): {
  planPr: number;
  planHeadSha: string;
  reviewId: number;
  reviewer: string;
  approvedAt: string;
  planDigest: string;
  contractDigest: string;
  baseSha: string;
  baseBranch: string;
  plan: PlanContract;
  approval: NativeApprovalRecord;
  pr: PlanPr;
  body: string;
};

export declare function resolveWorkflowRun(
  input: WorkflowResolutionInput,
  dependencies?: WorkflowResolutionDependencies,
): ResolvedWorkflowRun;

export declare function validateResolvedWorkflowRunContext(
  context: unknown,
): ResolvedWorkflowRun;

export declare function isResolvedPullRequest(
  context: unknown,
  pull: Record<string, unknown>,
): boolean;

export declare function loadResolvedWorkflowRun(root?: string): ResolvedWorkflowRun;
export declare function sameWorkflowRunResolution(
  left: ResolvedWorkflowRun,
  right: ResolvedWorkflowRun,
): boolean;
export declare function revalidateWorkflowRun(
  context: ResolvedWorkflowRun,
  dependencies?: WorkflowResolutionDependencies,
): ResolvedWorkflowRun;

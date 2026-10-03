import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  hasLiveTaskIdentity,
} from "./evidence-record.mjs";
import { githubJson, githubPages, runGitHub } from "./github-api.mjs";
import {
  extractPlanContract,
  canonicalPlan,
  planDigest,
  validatePlanContract,
} from "./plan-contract.mjs";
import {
  configuredPlanReviewers,
  extractPlanSection,
  fetchApprovedPlan,
  planBranch,
} from "./publish-plan.mjs";
import { evaluateNativePlanApproval } from "./plan-approval.mjs";
import {
  readPlanArtifact,
  validatePlanOnlyFiles,
} from "./plan-artifact.mjs";
import { approvalPolicyForRisk } from "./risk-policy.mjs";
import { linkedIssue } from "./resolve-pr-task.mjs";
import { selectWorkflowPullRequest } from "./resolve-workflow-pr.mjs";
import { contractFromIssue } from "./task-contract.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");
export const RESOLVED_RUN_PATH = "artifacts/resolved-workflow-run.json";
export const RESOLVED_RUN_SCHEMA = "northstar/resolved-workflow-run/1";

const SHA = /^[0-9a-f]{40}$/;
const REPOSITORY = /^[^/\s]+\/[^/\s]+$/;
const ARTIFACT_JOBS = [
  ["northstar-plan-context", "plan-contract"],
  ["northstar-check-quality", "quality"],
  ["northstar-check-acceptance", "acceptance"],
  ["northstar-check-dependency", "dependency-review"],
  ["northstar-check-secret", "secret-scan"],
  ["northstar-check-codeql", "codeql"],
  ["northstar-check-merge", "merge-validation"],
  ["northstar-check-governance", "governance-policy"],
];

// This workflow_dispatch is a one-time bootstrap for issue #24 on parent PR #18.
const BOOTSTRAP_ISSUE = 24;
const BOOTSTRAP_TASK_ID = "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP";
const BOOTSTRAP_PARENT_ISSUE = 14;
const BOOTSTRAP_PARENT_PR = 18;
const BOOTSTRAP_BASE_BRANCH = "agent/implement/aes-surface-evidence";
const BOOTSTRAP_BASE_SHA = "2ce3cf8a69439c22246de7d5449ce186e23bd584";
const BOOTSTRAP_RULESET_ID = 23998987;
const RESTORED_STATUS_INTEGRATIONS = new Map([
  ["plan-approval", 15368],
  ["plan-contract", 15368],
  ["scope-policy", 15368],
  ["quality", 15368],
  ["acceptance", 15368],
  ["dependency-review", 15368],
  ["codeql", 15368],
  ["secret-scan", 15368],
  ["merge-validation", 15368],
  ["governance-policy", 15368],
  ["repository-controls", 15368],
  ["human-review", 15368],
  ["evidence", 15368],
  ["trusted-acceptance", 5075466],
]);

function isPositiveInteger(value) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0;
}

export function validateRestoredBootstrapRuleset(ruleset) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const rules = Array.isArray(ruleset?.rules) ? ruleset.rules : [];
  const statusRules = rules.filter(({ type }) => type === "required_status_checks");
  const pullRequestRules = rules.filter(({ type }) => type === "pull_request");
  const statuses = statusRules[0]?.parameters?.required_status_checks;
  const integrations = Array.isArray(statuses)
    ? statuses.map(({ context, integration_id }) => ({ context, integrationId: integration_id }))
      .sort((left, right) => left.context.localeCompare(right.context))
    : [];
  const expected = [...RESTORED_STATUS_INTEGRATIONS]
    .map(([context, integrationId]) => ({ context, integrationId }))
    .sort((left, right) => left.context.localeCompare(right.context));

  check(ruleset?.id === BOOTSTRAP_RULESET_ID, "ruleset ID mismatch");
  check(ruleset?.name === "AIES - Main branch protection", "ruleset name mismatch");
  check(ruleset?.target === "branch", "ruleset target is not branch");
  check(ruleset?.source_type === "Repository", "ruleset source type mismatch");
  check(ruleset?.source === "webmaxru/northstar-orders-api-demo", "ruleset source repository mismatch");
  check(ruleset?.enforcement === "active", "ruleset is not active");
  check(
    JSON.stringify(ruleset?.conditions?.ref_name) ===
      JSON.stringify({ exclude: [], include: ["~DEFAULT_BRANCH"] }),
    "ruleset does not target only the protected default branch",
  );
  check(
    Array.isArray(ruleset?.bypass_actors) && ruleset.bypass_actors.length === 0,
    "ruleset bypass actors are not empty",
  );
  check(
    ruleset?.current_user_can_bypass === "never",
    "current identity has a bypass path",
  );
  check(
    rules.map(({ type }) => type).sort().join(",") ===
      "deletion,non_fast_forward,pull_request,required_status_checks",
    "ruleset contains a missing, duplicate, or unexpected rule",
  );
  check(statusRules.length === 1, "ruleset must contain exactly one status rule");
  check(
    statusRules[0]?.parameters?.strict_required_status_checks_policy === true,
    "strict required status checks are not enabled",
  );
  check(
    statusRules[0]?.parameters?.do_not_enforce_on_create === false,
    "required status checks are disabled for branch creation",
  );
  check(
    JSON.stringify(integrations) === JSON.stringify(expected),
    "required status contexts or their integration identities are not fully restored",
  );
  const review = pullRequestRules[0]?.parameters;
  check(pullRequestRules.length === 1, "ruleset must contain exactly one pull-request rule");
  check(review?.required_approving_review_count === 1, "required human review count changed");
  check(review?.dismiss_stale_reviews_on_push === true, "stale-review dismissal changed");
  check(review?.require_code_owner_review === true, "CODEOWNERS review requirement changed");
  check(review?.require_last_push_approval === true, "last-push approval requirement changed");
  check(
    Array.isArray(review?.required_reviewers) && review.required_reviewers.length === 0,
    "required reviewer list changed",
  );
  check(
    review?.required_review_thread_resolution === false,
    "review-thread resolution requirement changed",
  );
  check(
    review?.require_extra_approval_for_unattributed_changes === true,
    "unattributed-change approval requirement changed",
  );
  check(
    JSON.stringify([...(review?.allowed_merge_methods ?? [])].sort()) ===
      JSON.stringify(["merge", "rebase", "squash"]),
    "allowed merge methods changed",
  );

  const snapshot = {
    id: ruleset?.id,
    name: ruleset?.name,
    target: ruleset?.target,
    source_type: ruleset?.source_type,
    source: ruleset?.source,
    enforcement: ruleset?.enforcement,
    conditions: ruleset?.conditions,
    bypass_actors: ruleset?.bypass_actors,
    current_user_can_bypass: ruleset?.current_user_can_bypass,
    rules,
  };
  const snapshotDigest = createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
  return {
    ok: errors.length === 0,
    errors,
    snapshotDigest,
    id: BOOTSTRAP_RULESET_ID,
    snapshot,
    contextIntegrations: integrations,
    strict: statusRules[0]?.parameters?.strict_required_status_checks_policy === true,
    bypassActorCount: Array.isArray(ruleset?.bypass_actors)
      ? ruleset.bypass_actors.length
      : null,
  };
}

function parseTime(value, label) {
  const timestamp = Date.parse(String(value ?? ""));
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${label} is missing or invalid.`);
  }
  return timestamp;
}

function apiPages(route, run) {
  const pages = JSON.parse(
    run(["api", "--paginate", "--slurp", route]),
  );
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error(`GitHub pagination returned no pages for ${route}.`);
  }
  return pages;
}

function allJobs(repository, runId, attempt, run) {
  const pages = apiPages(
    `repos/${repository}/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=100`,
    run,
  );
  if (!pages.every((page) => Array.isArray(page?.jobs))) {
    throw new Error("Workflow job pagination did not return complete job pages.");
  }
  const jobs = pages.flatMap((page) => page.jobs);
  const total = Number(pages[0]?.total_count);
  if (Number.isSafeInteger(total) && total !== jobs.length) {
    throw new Error("Workflow job pagination returned an incomplete job set.");
  }
  return jobs;
}

function allArtifacts(repository, runId, run) {
  const pages = apiPages(
    `repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`,
    run,
  );
  if (!pages.every((page) => Array.isArray(page?.artifacts))) {
    throw new Error("Artifact pagination did not return complete pages.");
  }
  const artifacts = pages.flatMap((page) => page.artifacts);
  const total = Number(pages[0]?.total_count);
  if (Number.isSafeInteger(total) && total !== artifacts.length) {
    throw new Error("Artifact pagination returned an incomplete artifact set.");
  }
  return artifacts;
}

function sourceAssociation(sourceRun, pullRequest, repositoryId) {
  const associated = sourceRun.pull_requests;
  if (!Array.isArray(associated) || associated.length !== 1) {
    throw new Error("The source run must identify exactly one pull request.");
  }
  const item = associated[0];
  if (
    Number(item.number) !== pullRequest ||
    !SHA.test(item.head?.sha ?? "") ||
    !SHA.test(item.base?.sha ?? "") ||
    typeof item.head?.ref !== "string" ||
    typeof item.base?.ref !== "string" ||
    Number(item.head?.repo?.id) !== repositoryId ||
    Number(item.base?.repo?.id) !== repositoryId
  ) {
    throw new Error("The source run pull-request snapshot is incomplete or cross-repository.");
  }
  return item;
}

export function validateHistoricalPlanApproval({
  plan,
  committedPlan,
  planPull,
  reviews,
  files,
  entry,
  eligibleReviewers,
  repository,
  contract,
  sourceRunStartedAt,
}) {
  const validation = validatePlanContract(committedPlan, contract);
  if (
    !validation.ok ||
    !approvalPolicyForRisk(committedPlan.risk).requirePlanOnlyApproval ||
    !plan ||
    canonicalPlan(committedPlan) !== canonicalPlan(plan) ||
    committedPlan.baseSha !== plan.baseSha ||
    committedPlan.baseBranch !== plan.baseBranch ||
    !planPull ||
    !isPositiveInteger(planPull.number) ||
    planPull.draft !== false ||
    !["open", "closed"].includes(planPull.state) ||
    (planPull.state === "closed" && planPull.merged !== true) ||
    planPull.base?.ref !== plan.baseBranch ||
    planPull.head?.repo?.full_name !== repository ||
    planPull.base?.repo?.full_name !== repository ||
    linkedIssue(planPull.body) !== contract.source.issue ||
    typeof planPull.user?.login !== "string" ||
    typeof planPull.head?.sha !== "string" ||
    typeof planPull.html_url !== "string"
  ) {
    throw new Error("The original plan PR no longer binds the source task and base branch.");
  }
  const bodyPlan = extractPlanContract(extractPlanSection(planPull.body));
  if (!bodyPlan || canonicalPlan(bodyPlan) !== canonicalPlan(committedPlan)) {
    throw new Error("The original plan PR description differs from its committed plan artifact.");
  }
  const artifact = validatePlanOnlyFiles({
    taskId: contract.id,
    files,
    entry,
  });
  if (!artifact.ok) {
    throw new Error(`The original plan PR is not plan-only: ${artifact.reason}`);
  }
  const planPr = {
    number: planPull.number,
    body: planPull.body,
    url: planPull.html_url,
    author: { login: planPull.user.login },
    headRefOid: planPull.head.sha,
    baseRefOid: plan.baseSha,
    isDraft: planPull.draft,
  };
  const approval = evaluateNativePlanApproval({
    plan: committedPlan,
    contract,
    pr: planPr,
    reviews,
    files,
    entry,
    eligibleReviewers,
    repository,
  });
  if (!approval.ok) {
    throw new Error(`The original plan approval is no longer current: ${approval.reason}`);
  }
  const approvedAt = parseTime(
    approval.record.approvedAt,
    "Original plan approval time",
  );
  if (approvedAt > parseTime(sourceRunStartedAt, "Source run start time")) {
    throw new Error("The original plan was not approved before the source implementation run.");
  }
  return {
    planPr: planPull.number,
    planHeadSha: planPull.head.sha,
    reviewId: approval.record.reviewId,
    reviewer: approval.record.reviewer,
    approvedAt: approval.record.approvedAt,
    planDigest: validation.planDigest,
    contractDigest: contract.source.bodyDigest,
    baseSha: plan.baseSha,
    baseBranch: plan.baseBranch,
    approval: approval.record,
    pr: planPr,
    body: planPull.body,
  };
}

export function fetchHistoricalPlanApproval({
  contract,
  plan = null,
  repository,
  sourceRunStartedAt,
  run,
}) {
  const owner = repository.split("/")[0];
  const branch = planBranch(contract.id);
  const pages = apiPages(
    `repos/${repository}/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=100`,
    run,
  );
  if (!pages.every(Array.isArray)) {
    throw new Error("Historical plan PR pagination did not return complete pages.");
  }
  const candidates = pages.flat().filter((pull) =>
    pull.head?.ref === branch &&
    pull.head?.repo?.full_name === repository &&
    pull.base?.repo?.full_name === repository &&
    (!plan || pull.base?.ref === plan.baseBranch) &&
    linkedIssue(pull.body) === contract.source.issue,
  );
  if (candidates.length !== 1) {
    throw new Error("Expected exactly one same-repository plan PR for the source task.");
  }
  const planPull = candidates[0];
  const artifact = readPlanArtifact(planPull.head.sha, contract.id, { run });
  const committedPlan = extractPlanContract(artifact.body);
  if (!committedPlan) {
    throw new Error("The original plan PR has no committed machine-readable plan.");
  }
  const expectedPlan = plan ?? committedPlan;
  compareResult(
    githubJson(
      `repos/${repository}/compare/${expectedPlan.baseSha}...${planPull.head.sha}`,
      { run },
    ),
    expectedPlan.baseSha,
    planPull.head.sha,
    "Original plan PR base/head",
  );
  const reviews = githubPages(
    `repos/${repository}/pulls/${planPull.number}/reviews?per_page=100`,
    { run },
  );
  const files = githubPages(
    `repos/${repository}/pulls/${planPull.number}/files?per_page=100`,
    { run },
  );
  const eligibleReviewers = configuredPlanReviewers(planPull.user?.login, { run });
  const approval = validateHistoricalPlanApproval({
    plan: expectedPlan,
    committedPlan,
    planPull,
    reviews,
    files,
    entry: artifact.entry,
    eligibleReviewers,
    repository,
    contract,
    sourceRunStartedAt,
  });
  const current = githubJson(
    `repos/${repository}/pulls/${planPull.number}`,
    { run },
  );
  if (
    current.state !== planPull.state ||
    current.merged !== planPull.merged ||
    current.head?.sha !== planPull.head.sha ||
    current.base?.ref !== planPull.base.ref ||
    current.body !== planPull.body ||
    current.draft !== planPull.draft
  ) {
    throw new Error("The original plan PR changed during historical approval validation.");
  }
  const currentReviews = githubPages(
    `repos/${repository}/pulls/${planPull.number}/reviews?per_page=100`,
    { run },
  );
  const currentEligibleReviewers = configuredPlanReviewers(current.user.login, { run });
  const currentApproval = validateHistoricalPlanApproval({
    plan: expectedPlan,
    committedPlan,
    planPull: current,
    reviews: currentReviews,
    files,
    entry: artifact.entry,
    eligibleReviewers: currentEligibleReviewers,
    repository,
    contract,
    sourceRunStartedAt,
  });
  if (
    currentApproval.reviewId !== approval.reviewId ||
    currentApproval.reviewer !== approval.reviewer ||
    currentApproval.planHeadSha !== approval.planHeadSha
  ) {
    throw new Error("The original plan approval changed during source-run resolution.");
  }
  return { ...currentApproval, plan: committedPlan };
}

function validateMaintenancePublisher({
  repository,
  repositoryId,
  defaultBranch,
  publisherRunId,
  publisherRunAttempt,
  sourceRunId,
  sourceRunAttempt,
  mode,
  run,
}) {
  const id = String(publisherRunId ?? "");
  const sourceAttemptNumber = Number(sourceRunAttempt);
  const suppliedAttemptNumber =
    publisherRunAttempt == null || publisherRunAttempt === ""
      ? null
      : Number(publisherRunAttempt);
  if (
    !isPositiveInteger(id) ||
    (suppliedAttemptNumber !== null &&
      (!Number.isSafeInteger(suppliedAttemptNumber) || suppliedAttemptNumber < 1)) ||
    !Number.isSafeInteger(sourceAttemptNumber) ||
    sourceAttemptNumber < 1 ||
    id === String(sourceRunId)
  ) {
    throw new Error("Maintenance continuation requires an exact trusted publisher run attempt.");
  }
  const latestRunBeforeAttempt = githubJson(
    `repos/${repository}/actions/runs/${id}`,
    { run },
  );
  const attemptNumber = suppliedAttemptNumber ?? Number(latestRunBeforeAttempt.run_attempt);
  if (
    !Number.isSafeInteger(attemptNumber) ||
    attemptNumber < 1 ||
    String(latestRunBeforeAttempt.id) !== id ||
    Number(latestRunBeforeAttempt.run_attempt) !== attemptNumber
  ) {
    throw new Error("The maintenance continuation is not bound to the exact successful trusted publisher run.");
  }
  const attempt = githubJson(
    `repos/${repository}/actions/runs/${id}/attempts/${attemptNumber}`,
    { run },
  );
  const latestRun = githubJson(`repos/${repository}/actions/runs/${id}`, { run });
  const expectedEvent = mode === "bootstrap-migration" ? "workflow_dispatch" : "workflow_run";
  if (
    String(attempt.id) !== id ||
    Number(attempt.run_attempt) !== attemptNumber ||
    String(latestRun.id) !== id ||
    Number(latestRun.run_attempt) !== attemptNumber ||
    latestRun.head_sha !== attempt.head_sha ||
    latestRun.status !== attempt.status ||
    (latestRun.status === "completed" && latestRun.conclusion !== "success") ||
    (latestRun.status === "in_progress" && latestRun.conclusion != null) ||
    attempt.path !== ".github/workflows/publish-evidence.yml" ||
    attempt.name !== "Publish Evidence" ||
    attempt.event !== expectedEvent ||
    !["in_progress", "completed"].includes(attempt.status) ||
    (attempt.status === "completed" && attempt.conclusion !== "success") ||
    (attempt.status === "in_progress" && attempt.conclusion != null) ||
    attempt.repository?.full_name !== repository ||
    Number(attempt.repository?.id) !== repositoryId ||
    attempt.head_branch !== defaultBranch
  ) {
    throw new Error("The maintenance continuation is not bound to the exact successful trusted publisher run.");
  }
  const jobs = allJobs(repository, id, attemptNumber, run);
  const artifacts = allArtifacts(repository, id, run);
  const maintenanceArtifact = selectMaintenanceArtifactId({
    artifacts,
    jobs,
    runId: id,
    repositoryId,
    headSha: attempt.head_sha,
    headBranch: attempt.head_branch,
  });
  return {
    runId: id,
    runAttempt: String(attemptNumber),
    workflow: attempt.path,
    event: attempt.event,
    headSha: attempt.head_sha,
    status: attempt.status,
    conclusion: attempt.conclusion ?? null,
    headBranch: attempt.head_branch,
    artifactId: maintenanceArtifact.id,
    artifactName: maintenanceArtifact.name,
    artifactCreatedAt: maintenanceArtifact.createdAt,
    jobId: maintenanceArtifact.jobId,
  };
}

function validateTaskPlan({
  pull,
  repository,
  baseSha,
  baseRef,
  readTask,
  readApproved,
  sourceRunStartedAt,
  historicalPlanApproval,
  readHistoricalApproval,
  run,
}) {
  const issue = linkedIssue(pull.body);
  if (!issue) throw new Error("The source pull request does not link exactly one task issue.");
  const contract = readTask(issue);
  if (!hasLiveTaskIdentity(contract, repository)) {
    throw new Error("The source pull request task is not a trusted live contract.");
  }
  const plan = extractPlanContract(extractPlanSection(pull.body));
  const validation = validatePlanContract(plan, contract);
  if (!validation.ok) {
    throw new Error(`The source task plan is invalid: ${validation.errors.join("; ")}`);
  }
  if (plan.baseSha !== baseSha || plan.baseBranch !== baseRef) {
    throw new Error("The source task plan does not match the immutable run base snapshot.");
  }
  const digest = planDigest(plan);
  const approvalRequired = approvalPolicyForRisk(plan.risk).requirePlanOnlyApproval;
  let approval = null;
  if (approvalRequired) {
    const resolved = historicalPlanApproval
      ? readHistoricalApproval({
          contract,
          plan,
          repository,
          sourceRunStartedAt,
          run,
        })
      : readApproved(contract, { run });
    if (
      !resolved ||
      !resolved.plan ||
      !resolved.approval ||
      !isPositiveInteger(resolved.pr?.number) ||
      resolved.pr?.isDraft !== false ||
      resolved.pr?.baseRefOid !== baseSha ||
      planDigest(resolved.plan) !== digest ||
      resolved.approval.planDigest !== digest ||
      resolved.approval.contractDigest !== contract.source.bodyDigest ||
      resolved.approval.reviewedCommit !== resolved.pr.headRefOid
    ) {
      throw new Error("The source task has no current approval bound to its exact plan and base.");
    }
    if (!historicalPlanApproval) {
      const approvedPull = githubJson(
        `repos/${repository}/pulls/${resolved.pr.number}`,
        { run },
      );
      if (
        approvedPull.state !== "open" ||
        approvedPull.draft === true ||
        approvedPull.head?.sha !== resolved.pr.headRefOid ||
        approvedPull.base?.sha !== baseSha ||
        approvedPull.base?.ref !== baseRef ||
        approvedPull.head?.repo?.full_name !== repository ||
        approvedPull.base?.repo?.full_name !== repository ||
        approvedPull.body !== resolved.pr.body
      ) {
        throw new Error("The source plan PR changed or targets a different base branch.");
      }
    }
    approval = {
      planPr: resolved.pr.number,
      planHeadSha: resolved.pr.headRefOid,
      reviewId: resolved.approval.reviewId,
      reviewer: resolved.approval.reviewer,
    };
  } else if (
    Object.hasOwn(plan, "approval") ||
    plan.requiredChecks.includes("plan-approval")
  ) {
    throw new Error("A lower-risk source plan must not claim plan-only approval.");
  }
  return {
    issue,
    taskId: contract.id,
    contractDigest: contract.source.bodyDigest,
    planDigest: digest,
    planRisk: plan.risk,
    approvalRequired,
    approval,
  };
}

function validateBootstrapPlan({
  repository,
  planPullRequest,
  planHeadSha,
  readTask,
  readApproved,
  readHistoricalApproval,
  sourceRunStartedAt,
  historicalPlanApproval,
  run,
}) {
  if (!isPositiveInteger(planPullRequest) || !SHA.test(planHeadSha ?? "")) {
    throw new Error("The bootstrap plan PR number and immutable head are required.");
  }
  const contract = readTask(BOOTSTRAP_ISSUE);
  if (
    contract.id !== BOOTSTRAP_TASK_ID ||
    contract.source?.issue !== BOOTSTRAP_ISSUE ||
    !hasLiveTaskIdentity(contract, repository)
  ) {
    throw new Error("Issue #24 is not the current trusted bootstrap task.");
  }
  const resolved = historicalPlanApproval
    ? (() => {
        const record = readHistoricalApproval({
          contract,
          repository,
          sourceRunStartedAt,
          run,
        });
        return {
          plan: record.plan,
          approval: {
            planDigest: record.planDigest,
            contractDigest: record.contractDigest,
            reviewedCommit: record.planHeadSha,
            reviewId: record.reviewId,
            reviewer: record.reviewer,
          },
          pr: {
            number: record.planPr,
            isDraft: false,
            baseRefOid: record.baseSha,
            headRefOid: record.planHeadSha,
          },
        };
      })()
    : readApproved(contract, { run });
  const approvedPull = !historicalPlanApproval && resolved?.pr?.number
    ? githubJson(`repos/${repository}/pulls/${resolved.pr.number}`, { run })
    : null;
  if (
    !resolved ||
    Number(resolved.pr?.number) !== Number(planPullRequest) ||
    resolved.pr?.headRefOid !== planHeadSha ||
    resolved.pr?.isDraft !== false ||
    resolved.plan?.taskId !== BOOTSTRAP_TASK_ID ||
    resolved.plan?.risk !== "high" ||
    resolved.plan?.baseBranch !== BOOTSTRAP_BASE_BRANCH ||
    resolved.plan?.baseSha !== BOOTSTRAP_BASE_SHA ||
    resolved.plan?.contractDigest !== contract.source.bodyDigest ||
    (!historicalPlanApproval && (
      approvedPull?.state !== "open" ||
      approvedPull?.draft === true ||
      approvedPull?.head?.sha !== planHeadSha ||
      approvedPull?.base?.ref !== BOOTSTRAP_BASE_BRANCH ||
      approvedPull?.base?.sha !== BOOTSTRAP_BASE_SHA ||
      approvedPull?.head?.repo?.full_name !== repository ||
      approvedPull?.base?.repo?.full_name !== repository ||
      approvedPull?.body !== resolved.pr.body
    )) ||
    !resolved.approval ||
    resolved.approval.reviewedCommit !== planHeadSha ||
    resolved.approval.contractDigest !== contract.source.bodyDigest ||
    resolved.approval.planDigest !== planDigest(resolved.plan)
  ) {
    throw new Error("The input does not identify the current independently approved issue #24 plan.");
  }
  return {
    issue: BOOTSTRAP_ISSUE,
    taskId: contract.id,
    contractDigest: contract.source.bodyDigest,
    planPr: resolved.pr.number,
    planHeadSha: resolved.pr.headRefOid,
    planDigest: planDigest(resolved.plan),
    reviewId: resolved.approval.reviewId,
    reviewer: resolved.approval.reviewer,
    baseBranch: resolved.plan.baseBranch,
    baseSha: resolved.plan.baseSha,
  };
}

export function selectAttemptArtifactIds({
  artifacts,
  jobs,
  runId,
  repositoryId,
  headSha,
}) {
  if (
    !Array.isArray(artifacts) ||
    !Array.isArray(jobs) ||
    !isPositiveInteger(runId) ||
    !Number.isSafeInteger(repositoryId) ||
    repositoryId < 1 ||
    !SHA.test(headSha ?? "")
  ) {
    throw new Error("Artifact selection requires a complete source-run identity.");
  }
  const selected = [];
  for (const [name, jobName] of ARTIFACT_JOBS) {
    const matchingJobs = jobs.filter(
      (job) =>
        job.name === jobName &&
        String(job.run_id) === String(runId) &&
        job.head_sha === headSha &&
        job.status === "completed" &&
        isPositiveInteger(job.id),
    );
    if (matchingJobs.length !== 1) {
      throw new Error(`Expected exactly one completed source job for ${jobName}.`);
    }
    const job = matchingJobs[0];
    const jobStart = parseTime(job.started_at, `${jobName} start time`);
    const jobEnd = parseTime(job.completed_at, `${jobName} completion time`);
    if (jobStart > jobEnd) throw new Error(`${jobName} has an invalid execution interval.`);
    const matchingArtifacts = artifacts.filter((artifact) => {
      if (
        artifact.name !== name ||
        artifact.expired !== false ||
        !isPositiveInteger(artifact.id) ||
        !Number.isSafeInteger(artifact.size_in_bytes) ||
        artifact.size_in_bytes < 1 ||
        Number(artifact.workflow_run?.id) !== Number(runId) ||
        Number(artifact.workflow_run?.repository_id) !== repositoryId ||
        Number(artifact.workflow_run?.head_repository_id) !== repositoryId ||
        artifact.workflow_run?.head_sha !== headSha
      ) {
        return false;
      }
      const created = Date.parse(String(artifact.created_at ?? ""));
      return Number.isFinite(created) && created >= jobStart && created <= jobEnd;
    });
    if (matchingArtifacts.length !== 1) {
      throw new Error(
        `Expected exactly one non-expired ${name} artifact created by ${jobName} in this run attempt.`,
      );
    }
    selected.push({
      name,
      job: jobName,
      id: Number(matchingArtifacts[0].id),
      createdAt: matchingArtifacts[0].created_at,
    });
  }
  const ids = selected.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Source artifact IDs must be unique.");
  }
  return selected;
}

export function selectMaintenanceArtifactId({
  artifacts,
  jobs,
  runId,
  repositoryId,
  headSha,
  headBranch,
  now = Date.now(),
}) {
  const publisherJobs = jobs.filter((job) =>
    job.name === "publish" &&
    String(job.run_id) === String(runId) &&
    job.head_sha === headSha &&
    isPositiveInteger(job.id) &&
    ["in_progress", "completed"].includes(job.status),
  );
  if (publisherJobs.length !== 1) {
    throw new Error("Expected exactly one trusted Publish Evidence publisher job.");
  }
  const job = publisherJobs[0];
  if (
    (job.status === "completed" && job.conclusion !== "success") ||
    (job.status === "in_progress" && job.conclusion != null)
  ) {
    throw new Error("The trusted publisher job is not active or successfully completed.");
  }
  const jobStart = parseTime(job.started_at, "Trusted publisher job start time");
  const jobEnd = job.status === "completed"
    ? parseTime(job.completed_at, "Trusted publisher job completion time")
    : now;
  if (jobStart > jobEnd) throw new Error("The trusted publisher job interval is invalid.");
  const matches = artifacts.filter((artifact) => {
    if (
      artifact.name !== "northstar-system-maintenance-evidence" ||
      artifact.expired !== false ||
      !isPositiveInteger(artifact.id) ||
      !Number.isSafeInteger(artifact.size_in_bytes) ||
      artifact.size_in_bytes < 1 ||
      Number(artifact.workflow_run?.id) !== Number(runId) ||
      Number(artifact.workflow_run?.repository_id) !== repositoryId ||
      Number(artifact.workflow_run?.head_repository_id) !== repositoryId ||
      artifact.workflow_run?.head_sha !== headSha ||
      artifact.workflow_run?.head_branch !== headBranch
    ) {
      return false;
    }
    const created = Date.parse(String(artifact.created_at ?? ""));
    return Number.isFinite(created) && created >= jobStart && created <= jobEnd;
  });
  if (matches.length !== 1) {
    throw new Error(
      "Expected exactly one maintenance evidence artifact from the validated publisher attempt.",
    );
  }
  return {
    id: Number(matches[0].id),
    name: matches[0].name,
    job: job.name,
    jobId: job.id,
    createdAt: matches[0].created_at,
  };
}

function compareResult(result, baseSha, expectedHead, label) {
  if (
    result?.merge_base_commit?.sha !== baseSha ||
    !["ahead", "identical"].includes(result.status)
  ) {
    throw new Error(`${label} does not prove the expected commit ancestry.`);
  }
}

function samePullSnapshot(before, after, mode) {
  return (
    before.number === after.number &&
    before.state === after.state &&
    before.body === after.body &&
    before.head?.sha === after.head?.sha &&
    before.head?.repo?.full_name === after.head?.repo?.full_name &&
    before.base?.ref === after.base?.ref &&
    before.base?.sha === after.base?.sha &&
    before.base?.repo?.full_name === after.base?.repo?.full_name &&
    (mode === "open-pr" ? before.base?.sha === after.base?.sha :
      before.merge_commit_sha === after.merge_commit_sha &&
      before.merged === after.merged)
  );
}

function sameResolution(left, right) {
  const identity = (value) => ({
    schema: value.schema,
    mode: value.mode,
    repository: value.repository,
    sourceRunId: value.sourceRunId,
    sourceRunAttempt: value.sourceRunAttempt,
    sourceWorkflow: value.sourceWorkflow,
    sourceEvent: value.sourceEvent,
    sourceConclusion: value.sourceConclusion,
    defaultBranch: value.defaultBranch,
    pullRequest: value.pullRequest,
    headSha: value.headSha,
    eventRun: value.eventRun ?? null,
    baseSha: value.baseSha,
    baseRef: value.baseRef,
    mergeCommitSha: value.mergeCommitSha ?? null,
    mergeAncestryVerified: value.mergeAncestryVerified,
    sourceRunStartedAt: value.sourceRunStartedAt,
    sourceRunCompletedAt: value.sourceRunCompletedAt,
    restoredRuleset: value.restoredRuleset ?? null,
    taskIssue: value.taskIssue,
    taskId: value.taskId,
    contractDigest: value.contractDigest,
    planDigest: value.planDigest,
    planRisk: value.planRisk,
    planApprovalRequired: value.planApprovalRequired,
    taskPlanApproval: value.taskPlanApproval ?? null,
    bootstrapPlan: value.bootstrapPlan ?? null,
    dispatcherLogin: value.dispatcherLogin ?? null,
    dispatchActor: value.dispatchActor ?? null,
    dispatchRef: value.dispatchRef ?? null,
    maintenanceContinuation: value.maintenanceContinuation,
    maintenancePublisher: value.maintenancePublisher
      ? {
          runId: value.maintenancePublisher.runId,
          runAttempt: value.maintenancePublisher.runAttempt,
          workflow: value.maintenancePublisher.workflow,
          event: value.maintenancePublisher.event,
          headSha: value.maintenancePublisher.headSha,
          headBranch: value.maintenancePublisher.headBranch,
          artifactId: value.maintenancePublisher.artifactId,
          artifactName: value.maintenancePublisher.artifactName,
          artifactCreatedAt: value.maintenancePublisher.artifactCreatedAt,
          jobId: value.maintenancePublisher.jobId,
        }
      : null,
    artifacts: value.artifacts,
  });
  return JSON.stringify(identity(left)) === JSON.stringify(identity(right));
}

export function resolveWorkflowRun(input, {
  run = runGitHub,
  readTask = contractFromIssue,
  readApproved = fetchApprovedPlan,
  readHistoricalApproval = fetchHistoricalPlanApproval,
} = {}) {
  const migration = input.mode === "bootstrap-migration";
  const maintenanceContinuation = input.maintenanceContinuation === true;
  if (!migration && input.mode !== "open-pr") {
    throw new Error("Workflow resolution mode must be open-pr or bootstrap-migration.");
  }
  const repository = input.repository;
  const runId = String(input.sourceRunId ?? "");
  const suppliedAttemptNumber =
    input.sourceRunAttempt == null || input.sourceRunAttempt === ""
      ? null
      : Number(input.sourceRunAttempt);
  const pullRequest = Number(input.pullRequest);
  if (
    !REPOSITORY.test(repository ?? "") ||
    !isPositiveInteger(runId) ||
    (suppliedAttemptNumber !== null &&
      (!Number.isSafeInteger(suppliedAttemptNumber) || suppliedAttemptNumber < 1)) ||
    (!maintenanceContinuation && suppliedAttemptNumber === null) ||
    !Number.isSafeInteger(pullRequest) ||
    pullRequest < 1
  ) {
    throw new Error("Resolution requires exact repository, run, and pull request identities.");
  }
  if (
    (migration || maintenanceContinuation) &&
    (input.eventName !== "workflow_dispatch" ||
      input.actor !== input.dispatcherLogin ||
      !input.dispatcherLogin ||
      !/^refs\/heads\/[^/\s]+$/.test(input.ref ?? ""))
  ) {
    throw new Error("The bootstrap dispatch must use the approved dispatcher on a branch ref.");
  }
  if (!migration && !maintenanceContinuation && input.eventName !== "workflow_run") {
    throw new Error("Open pull request resolution requires a workflow_run event.");
  }

  const api = (route) => githubJson(route, { run });
  const repo = api(`repos/${repository}`);
  if (
    repo.full_name !== repository ||
    !Number.isSafeInteger(repo.id) ||
    !repo.default_branch
  ) {
    throw new Error("The repository identity or default branch could not be verified.");
  }
  if (migration && input.ref !== `refs/heads/${repo.default_branch}`) {
    throw new Error("The bootstrap publisher must run from the protected default branch.");
  }
  if (maintenanceContinuation && input.ref !== `refs/heads/${repo.default_branch}`) {
    throw new Error("The system-maintenance continuation must run from the protected default branch.");
  }

  const restoredRuleset = migration
    ? validateRestoredBootstrapRuleset(
        api(`repos/${repository}/rulesets/${BOOTSTRAP_RULESET_ID}`),
      )
    : null;
  if (restoredRuleset && !restoredRuleset.ok) {
    throw new Error(
      `The bootstrap required contexts are not fully restored: ${restoredRuleset.errors.join("; ")}`,
    );
  }

  const latestRunBeforeAttempt = maintenanceContinuation
    ? api(`repos/${repository}/actions/runs/${runId}`)
    : null;
  const attemptNumber = suppliedAttemptNumber ??
    Number(latestRunBeforeAttempt?.run_attempt);
  if (
    !Number.isSafeInteger(attemptNumber) ||
    attemptNumber < 1 ||
    (latestRunBeforeAttempt &&
      (String(latestRunBeforeAttempt.id) !== runId ||
        Number(latestRunBeforeAttempt.run_attempt) !== attemptNumber))
  ) {
    throw new Error("The source run is not the exact completed same-repository Governed Change attempt.");
  }
  const attempt = api(
    `repos/${repository}/actions/runs/${runId}/attempts/${attemptNumber}`,
  );
  const latestRun = api(`repos/${repository}/actions/runs/${runId}`);
  if (
    String(attempt.id) !== runId ||
    Number(attempt.run_attempt) !== attemptNumber ||
    attempt.path !== ".github/workflows/governed-change.yml" ||
    attempt.name !== "Governed Change" ||
    !["pull_request", "pull_request_review"].includes(attempt.event) ||
    attempt.status !== "completed" ||
    attempt.repository?.full_name !== repository ||
    attempt.head_repository?.full_name !== repository ||
    !SHA.test(attempt.head_sha ?? "") ||
    String(latestRun.id) !== runId ||
    Number(latestRun.run_attempt) !== attemptNumber ||
    latestRun.head_sha !== attempt.head_sha ||
    latestRun.status !== "completed"
  ) {
    throw new Error("The source run is not the exact completed same-repository Governed Change attempt.");
  }
  const sourceStartedAt = parseTime(attempt.run_started_at, "Source run start time");
  const sourceCompletedAt = parseTime(attempt.updated_at, "Source run completion time");
  if (sourceStartedAt > sourceCompletedAt) {
    throw new Error("The source run attempt has an invalid execution interval.");
  }
  if (
    !migration && !maintenanceContinuation &&
    (
      input.eventRun?.id !== attempt.id ||
      Number(input.eventRun?.run_attempt) !== attemptNumber ||
      input.eventRun?.head_sha !== attempt.head_sha ||
      input.eventRun?.event !== attempt.event ||
      input.eventRun?.repository?.full_name !== repository
    )
  ) {
    throw new Error("The workflow_run event does not match the immutable source run attempt.");
  }
  const maintenancePublisher = maintenanceContinuation
    ? validateMaintenancePublisher({
        repository,
        repositoryId: repo.id,
        defaultBranch: repo.default_branch,
        publisherRunId: input.publisherRunId,
        publisherRunAttempt: input.publisherRunAttempt,
        sourceRunId: runId,
        sourceRunAttempt: attemptNumber,
        mode: input.mode,
        run,
      })
    : null;

  const association = sourceAssociation(attempt, pullRequest, repo.id);
  const baseSha = association.base.sha;
  const baseRef = association.base.ref;
  const headSha = attempt.head_sha;
  if (!migration && !maintenanceContinuation) {
    const eventPulls = input.eventRun?.pull_requests;
    if (
      !Array.isArray(eventPulls) ||
      eventPulls.length !== 1 ||
      Number(eventPulls[0].number) !== pullRequest ||
      eventPulls[0].head?.sha !== association.head.sha ||
      eventPulls[0].base?.sha !== association.base.sha ||
      Number(eventPulls[0].head?.repo?.id) !== repo.id ||
      Number(eventPulls[0].base?.repo?.id) !== repo.id
    ) {
      throw new Error("The workflow_run PR snapshot does not match the source attempt.");
    }
  }
  const pull = api(`repos/${repository}/pulls/${pullRequest}`);
  if (
    pull.number !== pullRequest ||
    pull.base?.repo?.full_name !== repository ||
    pull.head?.sha !== headSha ||
    pull.base?.ref !== baseRef
  ) {
    throw new Error("The live pull request differs from the source-run base/head snapshot.");
  }

  let mergeCommitSha = null;
  if (migration) {
    if (
      pullRequest !== BOOTSTRAP_PARENT_PR ||
      baseRef !== repo.default_branch ||
      pull.state !== "closed" ||
      pull.merged !== true ||
      !SHA.test(pull.merge_commit_sha ?? "")
    ) {
      throw new Error("Only the exact merged issue #24 parent pull request may use this dispatch.");
    }
    mergeCommitSha = pull.merge_commit_sha;
    const merged = parseTime(pull.merged_at, "Pull request merge time");
    if (sourceCompletedAt > merged) {
      throw new Error("The validated source attempt must complete before the parent PR is merged.");
    }
    compareResult(
      api(`repos/${repository}/compare/${baseSha}...${headSha}`),
      baseSha,
      headSha,
      "Original PR base/head",
    );
    compareResult(
      api(`repos/${repository}/compare/${headSha}...${mergeCommitSha}`),
      headSha,
      mergeCommitSha,
      "Merged PR commit",
    );
  } else {
    if (maintenanceContinuation) {
      if (input.mode !== "bootstrap-migration" && (
        pull.state !== "open" ||
        pull.merged === true ||
        pull.base?.sha !== baseSha ||
        pull.head?.repo?.full_name !== repository
      )) {
        throw new Error("Open-PR maintenance requires the exact open same-repository PR.");
      }
    } else {
      if (
        pull.state !== "open" ||
        pull.merged === true ||
        pull.base?.sha !== baseSha ||
        pull.head?.repo?.full_name !== repository
      ) {
        throw new Error("Ordinary evidence publication requires the exact open same-repository PR.");
      }
      const pages = apiPages(
        `repos/${repository}/commits/${headSha}/pulls?per_page=100`,
        run,
      );
      if (!pages.every(Array.isArray)) {
        throw new Error("Pull request pagination did not return complete pages.");
      }
      const selected = selectWorkflowPullRequest({
        pulls: pages.flat(),
        sha: headSha,
        repository,
        expectedNumber: pullRequest,
        expectedBaseSha: baseSha,
        expectedBaseRef: baseRef,
      });
      if (
        Number(selected.number) !== pullRequest ||
        selected.base?.sha !== pull.base.sha ||
        selected.head?.sha !== pull.head.sha
      ) {
        throw new Error("The source run does not resolve to exactly one matching open pull request.");
      }
    }
  }

  const sourceTask = validateTaskPlan({
    pull,
    repository,
    baseSha,
    baseRef,
    readTask,
    readApproved,
    sourceRunStartedAt: new Date(sourceStartedAt).toISOString(),
    historicalPlanApproval: migration,
    readHistoricalApproval,
    run,
  });
  let bootstrapPlan = null;
  if (migration) {
    if (
      sourceTask.issue !== BOOTSTRAP_PARENT_ISSUE ||
      sourceTask.taskId !== "AES-SURFACE-EVIDENCE"
    ) {
      throw new Error("The merged parent PR is not the issue #14 surface-evidence task.");
    }
    bootstrapPlan = validateBootstrapPlan({
      repository,
      planPullRequest: input.bootstrapPlanPr,
      planHeadSha: input.bootstrapPlanHeadSha,
      readTask,
      readApproved,
      readHistoricalApproval,
      sourceRunStartedAt: new Date(sourceStartedAt).toISOString(),
      historicalPlanApproval: migration,
      run,
    });
  }

  const jobs = allJobs(repository, runId, attemptNumber, run);
  const artifacts = allArtifacts(repository, runId, run);
  const selectedArtifacts = selectAttemptArtifactIds({
    artifacts,
    jobs,
    runId,
    repositoryId: repo.id,
    headSha,
  });

  const currentPull = api(`repos/${repository}/pulls/${pullRequest}`);
  const currentRun = api(`repos/${repository}/actions/runs/${runId}`);
  if (
    !samePullSnapshot(pull, currentPull, input.mode) ||
    Number(currentRun.run_attempt) !== attemptNumber ||
    currentRun.head_sha !== headSha ||
    currentRun.status !== "completed"
  ) {
    throw new Error("The source PR or run changed during workflow resolution.");
  }

  return {
    schema: RESOLVED_RUN_SCHEMA,
    mode: input.mode,
    repository,
    defaultBranch: repo.default_branch,
    sourceRunId: runId,
    sourceRunAttempt: String(attemptNumber),
    sourceWorkflow: attempt.path,
    sourceEvent: attempt.event,
    sourceConclusion: attempt.conclusion ?? null,
    pullRequest,
    headSha,
    baseSha,
    baseRef,
    mergeCommitSha,
    mergeAncestryVerified: migration,
    sourceRunStartedAt: new Date(sourceStartedAt).toISOString(),
    sourceRunCompletedAt: new Date(sourceCompletedAt).toISOString(),
    restoredRuleset: restoredRuleset
      ? {
          id: restoredRuleset.id,
          snapshot: restoredRuleset.snapshot,
          snapshotDigest: restoredRuleset.snapshotDigest,
          contextIntegrations: restoredRuleset.contextIntegrations,
          strict: restoredRuleset.strict,
          bypassActorCount: restoredRuleset.bypassActorCount,
        }
      : null,
    taskIssue: sourceTask.issue,
    taskId: sourceTask.taskId,
    contractDigest: sourceTask.contractDigest,
    planDigest: sourceTask.planDigest,
    planRisk: sourceTask.planRisk,
    planApprovalRequired: sourceTask.approvalRequired,
    taskPlanApproval: sourceTask.approval,
    bootstrapPlan,
    dispatcherLogin: migration || maintenanceContinuation ? input.dispatcherLogin : null,
    dispatchActor: migration || maintenanceContinuation ? input.actor : null,
    dispatchRef: migration || maintenanceContinuation ? input.ref : null,
    maintenanceContinuation,
    maintenancePublisher,
    eventRun: migration || maintenanceContinuation ? null : {
      id: input.eventRun.id,
      run_attempt: input.eventRun.run_attempt,
      head_sha: input.eventRun.head_sha,
      event: input.eventRun.event,
      repository: input.eventRun.repository,
      pull_requests: input.eventRun.pull_requests,
    },
    artifacts: selectedArtifacts,
    artifactIds: selectedArtifacts.map(({ id }) => id).join(","),
    resolvedAt: new Date().toISOString(),
  };
}

export function validateResolvedWorkflowRunContext(context) {
  const artifactNames = Array.isArray(context?.artifacts)
    ? context.artifacts.map(({ name }) => name)
    : [];
  const rulesetValidation =
    context?.mode === "bootstrap-migration" && context.restoredRuleset?.snapshot
      ? validateRestoredBootstrapRuleset(context.restoredRuleset.snapshot)
      : null;
  const artifactsComplete =
    artifactNames.length === ARTIFACT_JOBS.length &&
    new Set(artifactNames).size === ARTIFACT_JOBS.length &&
    ARTIFACT_JOBS.every(([name, job]) =>
      context.artifacts.some((artifact) => artifact.name === name && artifact.job === job)
    );
  if (
    context?.schema !== RESOLVED_RUN_SCHEMA ||
    !["open-pr", "bootstrap-migration"].includes(context.mode) ||
    !REPOSITORY.test(context.repository ?? "") ||
    !isPositiveInteger(context.sourceRunId) ||
    !isPositiveInteger(context.sourceRunAttempt) ||
    !isPositiveInteger(context.pullRequest) ||
    (!context.maintenanceContinuation && context.maintenancePublisher !== null) ||
    !isPositiveInteger(context.taskIssue) ||
    !SHA.test(context.headSha ?? "") ||
    !SHA.test(context.baseSha ?? "") ||
    typeof context.baseRef !== "string" ||
    typeof context.defaultBranch !== "string" ||
    !context.defaultBranch ||
    !Number.isFinite(Date.parse(context.sourceRunStartedAt)) ||
    !Number.isFinite(Date.parse(context.sourceRunCompletedAt)) ||
    Date.parse(context.sourceRunStartedAt) > Date.parse(context.sourceRunCompletedAt) ||
    context.sourceWorkflow !== ".github/workflows/governed-change.yml" ||
    !["pull_request", "pull_request_review"].includes(context.sourceEvent) ||
    typeof context.taskId !== "string" ||
    typeof context.maintenanceContinuation !== "boolean" ||
    !/^[0-9a-f]{64}$/.test(context.contractDigest ?? "") ||
    !/^[0-9a-f]{64}$/.test(context.planDigest ?? "") ||
    (context.mode === "open-pr" && context.restoredRuleset !== null) ||
    (context.mode === "bootstrap-migration" &&
      (context.restoredRuleset?.id !== BOOTSTRAP_RULESET_ID ||
        context.restoredRuleset?.snapshot?.source !== context.repository ||
        !rulesetValidation?.ok ||
        rulesetValidation.snapshotDigest !== context.restoredRuleset?.snapshotDigest ||
        !/^[0-9a-f]{64}$/.test(context.restoredRuleset?.snapshotDigest ?? "") ||
        context.restoredRuleset?.strict !== true ||
        context.restoredRuleset?.bypassActorCount !== 0 ||
        JSON.stringify(context.restoredRuleset?.contextIntegrations) !==
          JSON.stringify([...RESTORED_STATUS_INTEGRATIONS]
            .map(([context, integrationId]) => ({ context, integrationId }))
            .sort((left, right) => left.context.localeCompare(right.context))))) ||
    (context.planApprovalRequired === true &&
      (!context.taskPlanApproval ||
        !isPositiveInteger(context.taskPlanApproval.planPr) ||
        !SHA.test(context.taskPlanApproval.planHeadSha ?? "") ||
        !isPositiveInteger(context.taskPlanApproval.reviewId) ||
        typeof context.taskPlanApproval.reviewer !== "string")) ||
    (context.planApprovalRequired === false && context.taskPlanApproval !== null) ||
    !Array.isArray(context.artifacts) ||
    !artifactsComplete ||
    !context.artifacts.every((artifact) => isPositiveInteger(artifact.id)) ||
    !context.artifacts.every((artifact) =>
      Number.isFinite(Date.parse(String(artifact.createdAt ?? "")))
    ) ||
    new Set(context.artifacts.map(({ id }) => id)).size !== context.artifacts.length ||
    context.artifactIds !== context.artifacts.map(({ id }) => id).join(",") ||
    (context.mode === "open-pr" && !context.maintenanceContinuation &&
      (!context.eventRun ||
        String(context.eventRun.id) !== context.sourceRunId ||
        String(context.eventRun.run_attempt) !== context.sourceRunAttempt ||
        context.eventRun.head_sha !== context.headSha ||
        context.eventRun.event !== context.sourceEvent ||
        context.eventRun.repository?.full_name !== context.repository ||
        !Array.isArray(context.eventRun.pull_requests) ||
        context.eventRun.pull_requests.length !== 1 ||
        context.eventRun.pull_requests[0]?.head?.sha !== context.headSha ||
        context.eventRun.pull_requests[0]?.base?.sha !== context.baseSha ||
        context.eventRun.pull_requests[0]?.base?.ref !== context.baseRef ||
        context.dispatcherLogin !== null ||
        context.dispatchActor !== null ||
        context.dispatchRef !== null ||
        context.maintenancePublisher !== null)) ||
    (context.maintenanceContinuation &&
      (!context.dispatcherLogin ||
        context.dispatchActor !== context.dispatcherLogin ||
        context.dispatchRef !== `refs/heads/${context.defaultBranch}` ||
        !context.maintenancePublisher ||
        !isPositiveInteger(context.maintenancePublisher.runId) ||
        !isPositiveInteger(context.maintenancePublisher.runAttempt) ||
        context.maintenancePublisher.workflow !== ".github/workflows/publish-evidence.yml" ||
        context.maintenancePublisher.event !==
          (context.mode === "bootstrap-migration" ? "workflow_dispatch" : "workflow_run") ||
        !SHA.test(context.maintenancePublisher.headSha ?? "") ||
        context.maintenancePublisher.headBranch !== context.defaultBranch ||
        !isPositiveInteger(context.maintenancePublisher.artifactId) ||
        context.maintenancePublisher.artifactName !== "northstar-system-maintenance-evidence" ||
        !Number.isFinite(Date.parse(context.maintenancePublisher.artifactCreatedAt ?? "")) ||
        !isPositiveInteger(context.maintenancePublisher.jobId) ||
        (context.maintenancePublisher.status === "completed" &&
          context.maintenancePublisher.conclusion !== "success") ||
        (context.maintenancePublisher.status === "in_progress" &&
          context.maintenancePublisher.conclusion !== null) ||
        !["completed", "in_progress"].includes(context.maintenancePublisher.status))) ||
    (context.mode === "open-pr" &&
      (context.mergeAncestryVerified !== false || context.mergeCommitSha !== null)) ||
    (context.mode === "bootstrap-migration" &&
      (!context.mergeAncestryVerified ||
        context.eventRun !== null ||
        context.dispatchActor !== context.dispatcherLogin ||
        !context.dispatcherLogin ||
        context.dispatchRef !== `refs/heads/${context.defaultBranch}` ||
        !SHA.test(context.mergeCommitSha ?? "") ||
        context.pullRequest !== BOOTSTRAP_PARENT_PR ||
        context.taskIssue !== BOOTSTRAP_PARENT_ISSUE ||
        context.taskId !== "AES-SURFACE-EVIDENCE" ||
        !context.taskPlanApproval ||
        !isPositiveInteger(context.taskPlanApproval.planPr) ||
        !SHA.test(context.taskPlanApproval.planHeadSha ?? "") ||
        !isPositiveInteger(context.taskPlanApproval.reviewId) ||
        typeof context.taskPlanApproval.reviewer !== "string" ||
        context.bootstrapPlan?.issue !== BOOTSTRAP_ISSUE ||
        context.bootstrapPlan?.taskId !== BOOTSTRAP_TASK_ID ||
        !isPositiveInteger(context.bootstrapPlan?.planPr) ||
        !SHA.test(context.bootstrapPlan?.planHeadSha ?? "") ||
        !/^[0-9a-f]{64}$/.test(context.bootstrapPlan?.contractDigest ?? "") ||
        !/^[0-9a-f]{64}$/.test(context.bootstrapPlan?.planDigest ?? "") ||
        !isPositiveInteger(context.bootstrapPlan?.reviewId) ||
        context.bootstrapPlan?.baseSha !== BOOTSTRAP_BASE_SHA ||
        context.bootstrapPlan?.baseBranch !== BOOTSTRAP_BASE_BRANCH))
  ) {
    throw new Error("The resolved workflow-run context is invalid or incomplete.");
  }
  return context;
}

export function isResolvedPullRequest(context, pull) {
  try {
    validateResolvedWorkflowRunContext(context);
  } catch {
    return false;
  }
  if (
    Number(pull?.number) !== Number(context.pullRequest) ||
    pull?.head?.sha !== context.headSha ||
    pull?.base?.ref !== context.baseRef ||
    pull?.base?.repo?.full_name !== context.repository ||
    linkedIssue(pull.body) !== context.taskIssue
  ) {
    return false;
  }
  const plan = extractPlanContract(extractPlanSection(pull.body));
  if (
    !plan ||
    plan.taskId !== context.taskId ||
    plan.contractDigest !== context.contractDigest ||
    plan.baseSha !== context.baseSha ||
    plan.baseBranch !== context.baseRef ||
    planDigest(plan) !== context.planDigest
  ) {
    return false;
  }
  if (context.mode === "open-pr") {
    return (
      pull.state === "open" &&
      pull.base?.sha === context.baseSha &&
      pull.head?.repo?.full_name === context.repository
    );
  }
  return (
    pull.state === "closed" &&
    pull.merged === true &&
    pull.merge_commit_sha === context.mergeCommitSha &&
    (pull.head?.repo?.full_name === context.repository || pull.head?.repo == null)
  );
}

export function loadResolvedWorkflowRun(root = REPO_ROOT) {
  const path = resolve(root, RESOLVED_RUN_PATH);
  if (!existsSync(path)) throw new Error("The trusted workflow-run resolution record is missing.");
  const stats = lstatSync(path);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error("The trusted workflow-run resolution record is not a regular file.");
  }
  return validateResolvedWorkflowRunContext(
    JSON.parse(readFileSync(path, "utf8")),
  );
}

export function sameWorkflowRunResolution(left, right) {
  return sameResolution(left, right);
}

export function revalidateWorkflowRun(context, options = {}) {
  validateResolvedWorkflowRunContext(context);
  const refreshed = resolveWorkflowRun({
    mode: context.mode,
    repository: context.repository,
    sourceRunId: context.sourceRunId,
    sourceRunAttempt: context.sourceRunAttempt,
    pullRequest: context.pullRequest,
    eventName: context.mode === "open-pr" && !context.maintenanceContinuation
      ? "workflow_run"
      : "workflow_dispatch",
    eventRun: context.eventRun,
    bootstrapPlanPr: context.bootstrapPlan?.planPr,
    bootstrapPlanHeadSha: context.bootstrapPlan?.planHeadSha,
    actor: context.dispatchActor,
    ref: context.dispatchRef,
    dispatcherLogin: context.dispatcherLogin,
    maintenanceContinuation: context.maintenanceContinuation,
    publisherRunId: context.maintenancePublisher?.runId,
    publisherRunAttempt: context.maintenancePublisher?.runAttempt,
  }, options);
  if (!sameResolution(context, refreshed)) {
    throw new Error("The trusted workflow-run resolution changed before publication.");
  }
  if (
    refreshed.maintenanceContinuation &&
    (refreshed.maintenancePublisher?.status !== "completed" ||
      refreshed.maintenancePublisher?.conclusion !== "success")
  ) {
    throw new Error("The protected publisher attempt has not completed successfully.");
  }
  return refreshed;
}

function writeResolution(context) {
  const path = resolve(REPO_ROOT, RESOLVED_RUN_PATH);
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    const stats = lstatSync(path);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error("Refusing to replace a non-regular workflow resolution record.");
    }
  }
  writeFileSync(path, `${JSON.stringify(context, null, 2)}\n`, "utf8");
}

function parseEvent(path) {
  if (!path) throw new Error("GITHUB_EVENT_PATH is required.");
  const event = JSON.parse(readFileSync(path, "utf8"));
  if (!event || typeof event !== "object") {
    throw new Error("The GitHub event payload is malformed.");
  }
  return event;
}

function appendEnvironment(context) {
  const envValues = [
    `PR_NUMBER=${context.pullRequest}`,
    `NORTHSTAR_HEAD_SHA=${context.headSha}`,
    `BASE_SHA=${context.baseSha}`,
    `BASE_BRANCH=${context.baseRef}`,
    `NORTHSTAR_RUN_ID=${context.sourceRunId}`,
    `NORTHSTAR_RUN_ATTEMPT=${context.sourceRunAttempt}`,
    `NORTHSTAR_MIGRATION_MODE=${context.mode}`,
    `NORTHSTAR_MAINTENANCE_CONTINUATION=${context.maintenanceContinuation}`,
    `NORTHSTAR_MAINTENANCE_PUBLISHER_RUN_ID=${context.maintenancePublisher?.runId ?? ""}`,
    `NORTHSTAR_MAINTENANCE_PUBLISHER_RUN_ATTEMPT=${context.maintenancePublisher?.runAttempt ?? ""}`,
    `NORTHSTAR_BOOTSTRAP_PLAN_PR_NUMBER=${context.bootstrapPlan?.planPr ?? ""}`,
    `NORTHSTAR_BOOTSTRAP_PLAN_HEAD_SHA=${context.bootstrapPlan?.planHeadSha ?? ""}`,
  ];
  for (const value of envValues) {
    if (/[\r\n]/.test(value)) throw new Error("A validated workflow output contains a line break.");
  }
  if (process.env.GITHUB_ENV) {
    writeFileSync(process.env.GITHUB_ENV, `${envValues.join("\n")}\n`, {
      encoding: "utf8",
      flag: "a",
    });
  }
  if (process.env.GITHUB_OUTPUT) {
    const outputs = [
      `pull_request=${context.pullRequest}`,
      `head_sha=${context.headSha}`,
      `base_sha=${context.baseSha}`,
      `source_run_id=${context.sourceRunId}`,
      `source_run_attempt=${context.sourceRunAttempt}`,
      `artifact_ids=${context.artifactIds}`,
      `maintenance_artifact_id=${context.maintenancePublisher?.artifactId ?? ""}`,
    ];
    writeFileSync(process.env.GITHUB_OUTPUT, `${outputs.join("\n")}\n`, {
      encoding: "utf8",
      flag: "a",
    });
  }
}

function cliInput() {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const repository = process.env.GITHUB_REPOSITORY;
  if (eventName === "workflow_run") {
    const event = parseEvent(process.env.GITHUB_EVENT_PATH);
    const source = event.workflow_run;
    if (!Array.isArray(source?.pull_requests) || source.pull_requests.length !== 1) {
      throw new Error("The workflow_run event must identify exactly one pull request.");
    }
    return {
      mode: "open-pr",
      eventName,
      eventRun: source,
      repository,
      sourceRunId: source.id,
      sourceRunAttempt: source.run_attempt,
      pullRequest: source.pull_requests[0].number,
    };
  }
  if (eventName === "workflow_dispatch") {
    const mode = process.env.NORTHSTAR_MIGRATION_MODE || process.env.NORTHSTAR_RESOLUTION_MODE;
    if (mode !== "open-pr" && mode !== "bootstrap-migration") {
      throw new Error("A workflow_dispatch resolver requires an explicit open-pr or bootstrap-migration mode.");
    }
    const maintenanceContinuation =
      process.env.GITHUB_WORKFLOW === "System Maintenance Approval";
    return {
      mode,
      eventName,
      repository,
      sourceRunId: process.env.NORTHSTAR_SOURCE_RUN_ID,
      sourceRunAttempt: process.env.NORTHSTAR_SOURCE_RUN_ATTEMPT,
      pullRequest: process.env.NORTHSTAR_PARENT_PR_NUMBER,
      bootstrapPlanPr: process.env.NORTHSTAR_BOOTSTRAP_PLAN_PR_NUMBER,
      bootstrapPlanHeadSha: process.env.NORTHSTAR_BOOTSTRAP_PLAN_HEAD_SHA,
      actor: process.env.GITHUB_ACTOR,
      ref: process.env.GITHUB_REF,
      dispatcherLogin: process.env.NORTHSTAR_DISPATCH_APP_LOGIN,
      maintenanceContinuation,
      publisherRunId: maintenanceContinuation ? process.env.EVIDENCE_RUN_ID : undefined,
      publisherRunAttempt: maintenanceContinuation
        ? process.env.EVIDENCE_RUN_ATTEMPT
        : undefined,
    };
  }
  throw new Error(`Unsupported publication event: ${eventName ?? "<missing>"}.`);
}

function main() {
  try {
    const context = resolveWorkflowRun(cliInput());
    writeResolution(context);
    appendEnvironment(context);
    process.stdout.write(
      `resolved mode=${context.mode} pr=${context.pullRequest} head=${context.headSha} ` +
      `base=${context.baseRef}@${context.baseSha} source=${context.sourceRunId}/${context.sourceRunAttempt} ` +
      `artifacts=${context.artifacts.length}\n`,
    );
  } catch (error) {
    process.stderr.write(`${/** @type {Error} */ (error).message}\n`);
    process.exitCode = 1;
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main();
}

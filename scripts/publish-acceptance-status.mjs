import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  isResolvedPullRequest,
  loadResolvedWorkflowRun,
  revalidateWorkflowRun,
} from "./resolve-workflow-run.mjs";
import { githubJson, runGitHub } from "./github-api.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const STATUS_PATH = "artifacts/trusted-acceptance-status.json";
const STATUS_CONTEXT = "trusted-acceptance";
const STATUS_CONTEXT_ARGUMENT = "context=trusted-acceptance";
// This must match the App integration bound to Northstar's protected status context.
const TRUSTED_PUBLISHER_APP_ID = "5075466";
const SHA = /^[0-9a-f]{40}$/;
const REPOSITORY = /^[^/\s]+\/[^/\s]+$/;

function requirePositiveInteger(value, label) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return numeric;
}

function reportIdentity(report, env, repository) {
  const provenance = report?.provenance;
  const pullRequest = requirePositiveInteger(env.PR_NUMBER, "PR_NUMBER");
  const sourceRunId = String(env.NORTHSTAR_RUN_ID ?? "");
  const sourceRunAttempt = String(provenance?.runAttempt ?? "");
  if (
    report?.schema !== "northstar/execution-report/3" ||
    report.validationLevel !== "hosted-integration" ||
    !REPOSITORY.test(repository ?? "") ||
    provenance?.repository !== repository ||
    provenance?.pullRequest !== pullRequest ||
    provenance?.headSha !== env.NORTHSTAR_HEAD_SHA ||
    !SHA.test(provenance?.headSha ?? "") ||
    provenance?.runId !== sourceRunId ||
    !/^[1-9]\d*$/.test(sourceRunAttempt) ||
    (env.NORTHSTAR_RUN_ATTEMPT &&
      env.NORTHSTAR_RUN_ATTEMPT !== sourceRunAttempt) ||
    provenance?.workflow !== env.GITHUB_WORKFLOW ||
    provenance?.event !== env.GITHUB_EVENT_NAME ||
    provenance?.executionRunId !== String(env.GITHUB_RUN_ID ?? "") ||
    provenance?.executionRunAttempt !== String(env.GITHUB_RUN_ATTEMPT ?? "") ||
    !/^[1-9]\d*$/.test(provenance?.executionRunId ?? "") ||
    !/^[1-9]\d*$/.test(provenance?.executionRunAttempt ?? "") ||
    !SHA.test(provenance?.baseSha ?? "") ||
    report.plan?.baseSha !== provenance.baseSha ||
    !/^[0-9a-f]{64}$/.test(report.plan?.digest ?? "") ||
    !/^[0-9a-f]{64}$/.test(report.plan?.contractDigest ?? "") ||
    (env.BASE_SHA && env.BASE_SHA !== provenance.baseSha) ||
    !Array.isArray(report.contextErrors) ||
    !Array.isArray(report.checks) ||
    !Array.isArray(report.successCriteria) ||
    !["review_required", "ready_for_review", "ready_for_acceptance"].includes(report.decision)
  ) {
    throw new Error("The hosted report does not match the exact publisher, source run, PR, and head.");
  }
  return {
    pullRequest,
    headSha: provenance.headSha,
    baseSha: provenance.baseSha,
    sourceRunId,
    sourceRunAttempt,
    executionRunId: provenance.executionRunId,
    executionRunAttempt: provenance.executionRunAttempt,
    decision: report.decision,
  };
}

function verifyAcceptanceClaim(report) {
  if (report.decision !== "ready_for_acceptance") return;
  if (
    report.plan?.valid !== true ||
    report.contextErrors.length !== 0 ||
    report.failedLocalChecks.length !== 0 ||
    report.pendingHostedEvidence.length !== 0 ||
    report.unprovenCriteria.length !== 0 ||
    !report.tests?.unit?.passed ||
    !report.tests?.acceptance?.passed ||
    report.checks.length === 0 ||
    report.checks.some((check) =>
      check.present !== true ||
      check.valid !== true ||
      check.status !== "pass"
    ) ||
    report.successCriteria.some((criterion) => criterion.proven !== true)
  ) {
    throw new Error("The report claims ready_for_acceptance while required evidence is incomplete.");
  }
}

export function acceptanceStatusExpectation({
  report,
  reportDigest,
  resolution,
  pull,
  repository,
  defaultBranch,
  env,
}) {
  if (
    env.GITHUB_REF !== `refs/heads/${defaultBranch}` ||
    !["Publish Evidence", "System Maintenance Approval"].includes(env.GITHUB_WORKFLOW) ||
    env.NORTHSTAR_TRUSTED_PUBLISHER_APP_ID !== TRUSTED_PUBLISHER_APP_ID ||
    !/^[a-z0-9-]+\[bot\]$/i.test(env.NORTHSTAR_TRUSTED_PUBLISHER_APP_LOGIN ?? "")
  ) {
    throw new Error("Trusted acceptance may be published only by the configured App on the protected default branch.");
  }
  const identity = reportIdentity(report, env, repository);
  const exactReportDigest = reportDigest ?? createHash("sha256")
    .update(JSON.stringify(report))
    .digest("hex");
  if (
    !/^https?:\/\/[^/\s]+\/?$/.test(env.GITHUB_SERVER_URL ?? "") ||
    !/^[0-9a-f]{64}$/.test(exactReportDigest) ||
    (resolution && report.workItem !== resolution.taskId) ||
    (env.BASE_BRANCH && env.BASE_BRANCH !== pull?.base?.ref)
  ) {
    throw new Error("The report or workflow URL is not suitable for a trusted status target.");
  }
  if (env.GITHUB_WORKFLOW === "Publish Evidence") {
    if (
      !resolution ||
      !["workflow_run", "workflow_dispatch"].includes(env.GITHUB_EVENT_NAME) ||
      !isResolvedPullRequest(resolution, pull) ||
      resolution.repository !== repository ||
      resolution.sourceRunId !== identity.sourceRunId ||
      resolution.sourceRunAttempt !== identity.sourceRunAttempt ||
      resolution.pullRequest !== identity.pullRequest ||
      resolution.headSha !== identity.headSha ||
      resolution.baseSha !== identity.baseSha ||
      resolution.planDigest !== report.plan.digest ||
      resolution.contractDigest !== report.plan.contractDigest ||
      (env.GITHUB_EVENT_NAME === "workflow_run" && resolution.mode !== "open-pr") ||
      (env.GITHUB_EVENT_NAME === "workflow_dispatch" && resolution.mode !== "bootstrap-migration")
    ) {
      throw new Error("The status report is not bound to the current trusted workflow-run resolution.");
    }
  } else {
    if (env.GITHUB_EVENT_NAME !== "workflow_dispatch") {
      throw new Error("System-maintenance status publication requires workflow_dispatch.");
    }
    if (resolution) {
      if (
        !resolution.maintenanceContinuation ||
        !isResolvedPullRequest(resolution, pull) ||
        resolution.repository !== repository ||
        resolution.sourceRunId !== identity.sourceRunId ||
        resolution.sourceRunAttempt !== identity.sourceRunAttempt ||
        resolution.pullRequest !== identity.pullRequest ||
        resolution.headSha !== identity.headSha ||
        resolution.baseSha !== identity.baseSha ||
        resolution.planDigest !== report.plan.digest ||
        resolution.contractDigest !== report.plan.contractDigest ||
        resolution.mode !== env.NORTHSTAR_MIGRATION_MODE
      ) {
        throw new Error("The maintenance report is not bound to the exact revalidated source run and PR.");
      }
    } else if (
      pull?.state !== "open" ||
      pull?.merged === true ||
      pull?.head?.sha !== identity.headSha ||
      pull?.base?.sha !== identity.baseSha ||
      pull?.base?.repo?.full_name !== repository ||
      pull?.head?.repo?.full_name !== repository
    ) {
      throw new Error("System-maintenance status publication requires the exact open same-repository PR.");
    }
  }
  verifyAcceptanceClaim(report);
  return {
    state: report.decision === "ready_for_acceptance" ? "success" : "failure",
    context: STATUS_CONTEXT,
    repository,
    pullRequest: identity.pullRequest,
    sha: identity.headSha,
    baseSha: identity.baseSha,
    sourceRunId: identity.sourceRunId,
    sourceRunAttempt: identity.sourceRunAttempt,
    publisherRunId: identity.executionRunId,
    publisherRunAttempt: identity.executionRunAttempt,
    targetUrl: `${env.GITHUB_SERVER_URL}/${repository}/actions/runs/${identity.executionRunId}`,
    reportDecision: report.decision,
    reportDigest: exactReportDigest,
    rulesetSnapshotDigest: resolution?.restoredRuleset?.snapshotDigest ?? null,
    publisherAppId: TRUSTED_PUBLISHER_APP_ID,
    publisherLogin: env.NORTHSTAR_TRUSTED_PUBLISHER_APP_LOGIN,
  };
}

export function verifyPublishedStatus(status, expected) {
  if (
    !Number.isSafeInteger(status?.id) ||
    status.id < 1 ||
    typeof status.url !== "string" ||
    typeof status.created_at !== "string" ||
    status.sha !== expected.sha ||
    status.context !== expected.context ||
    status.state !== expected.state ||
    status.target_url !== expected.targetUrl ||
    status.creator?.login !== expected.publisherLogin ||
    status.creator?.type !== "Bot"
  ) {
    throw new Error("GitHub did not confirm the trusted-acceptance status identity.");
  }
  return {
    schema: "northstar/trusted-acceptance-status/1",
    repository: expected.repository,
    pullRequest: expected.pullRequest,
    context: status.context,
    state: status.state,
    sha: status.sha,
    statusId: status.id,
    statusUrl: status.url,
    targetUrl: status.target_url,
    creatorLogin: status.creator.login,
    creatorType: status.creator.type,
    publisherAppId: expected.publisherAppId,
    sourceRunId: expected.sourceRunId,
    sourceRunAttempt: expected.sourceRunAttempt,
    publisherRunId: expected.publisherRunId,
    publisherRunAttempt: expected.publisherRunAttempt,
    reportDecision: expected.reportDecision,
    reportDigest: expected.reportDigest,
    rulesetSnapshotDigest: expected.rulesetSnapshotDigest,
    createdAt: status.created_at,
  };
}

function readReport() {
  const bytes = readFileSync(resolve(REPO_ROOT, "artifacts/report.json"));
  return {
    report: JSON.parse(bytes.toString("utf8")),
    digest: createHash("sha256").update(bytes).digest("hex"),
  };
}

function currentSourceRun(report, repository, pull, { run = runGitHub } = {}) {
  const identity = reportIdentity(report, process.env, repository);
  const sourceRun = githubJson(
    `repos/${repository}/actions/runs/${identity.sourceRunId}/attempts/${identity.sourceRunAttempt}`,
    { run },
  );
  const latestRun = githubJson(
    `repos/${repository}/actions/runs/${identity.sourceRunId}`,
    { run },
  );
  const associated = sourceRun.pull_requests?.filter(
    ({ number }) => Number(number) === identity.pullRequest,
  ) ?? [];
  if (
    String(sourceRun.id) !== identity.sourceRunId ||
    Number(sourceRun.run_attempt) !== Number(identity.sourceRunAttempt) ||
    Number(latestRun.run_attempt) !== Number(identity.sourceRunAttempt) ||
    latestRun.status !== "completed" ||
    latestRun.head_sha !== identity.headSha ||
    sourceRun.name !== "Governed Change" ||
    sourceRun.path !== ".github/workflows/governed-change.yml" ||
    !["pull_request", "pull_request_review"].includes(sourceRun.event) ||
    sourceRun.status !== "completed" ||
    sourceRun.repository?.full_name !== repository ||
    sourceRun.head_repository?.full_name !== repository ||
    sourceRun.head_sha !== identity.headSha ||
    associated.length !== 1 ||
    associated[0].head?.sha !== identity.headSha ||
    associated[0].base?.sha !== identity.baseSha ||
    associated[0].base?.ref !== pull?.base?.ref ||
    pull?.head?.sha !== identity.headSha
  ) {
    throw new Error("The source run or pull request changed before status publication.");
  }
  return sourceRun;
}

function validateMaintenanceManifest(
  report,
  repository,
  resolution,
  { run = runGitHub } = {},
) {
  const manifest = JSON.parse(
    readFileSync(resolve(REPO_ROOT, "artifacts/maintenance-manifest.json"), "utf8"),
  );
  const identity = reportIdentity(report, process.env, repository);
  if (
    manifest?.schema !== "northstar/system-maintenance-manifest/1" ||
    manifest.repository !== repository ||
    Number(manifest.pullRequest) !== identity.pullRequest ||
    manifest.headSha !== identity.headSha ||
    String(manifest.sourceRunId) !== identity.sourceRunId ||
    String(manifest.evidenceRunId) !== String(process.env.EVIDENCE_RUN_ID ?? "") ||
    !resolution?.maintenanceContinuation ||
    String(manifest.sourceRunId) !== resolution.sourceRunId ||
    String(manifest.evidenceRunId) !== resolution.maintenancePublisher?.runId ||
    String(resolution.maintenancePublisher?.runAttempt) !==
      String(process.env.EVIDENCE_RUN_ATTEMPT ?? "") ||
    manifest.sourceWorkflow !== ".github/workflows/governed-change.yml" ||
    manifest.evidenceWorkflow !== ".github/workflows/publish-evidence.yml"
  ) {
    throw new Error("The system-maintenance manifest does not bind the status report.");
  }
  const evidenceRun = githubJson(
    `repos/${repository}/actions/runs/${manifest.evidenceRunId}/attempts/${resolution.maintenancePublisher.runAttempt}`,
    { run },
  );
  if (
    String(evidenceRun.id) !== String(manifest.evidenceRunId) ||
    Number(evidenceRun.run_attempt) !== Number(resolution.maintenancePublisher.runAttempt) ||
    evidenceRun.path !== manifest.evidenceWorkflow ||
    evidenceRun.name !== "Publish Evidence" ||
    evidenceRun.event !== resolution.maintenancePublisher.event ||
    evidenceRun.status !== "completed" ||
    evidenceRun.conclusion !== "success" ||
    evidenceRun.repository?.full_name !== repository ||
    evidenceRun.head_branch !== resolution.defaultBranch
  ) {
    throw new Error("The maintenance evidence run is not the exact trusted publisher run.");
  }
}

function writeReceipt(receipt) {
  const target = resolve(REPO_ROOT, STATUS_PATH);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

function main() {
  try {
    const env = process.env;
    const { report, digest: reportDigest } = readReport();
    const repository = env.GITHUB_REPOSITORY;
    if (!REPOSITORY.test(repository ?? "")) {
      throw new Error("GITHUB_REPOSITORY is required for trusted status publication.");
    }
    const repo = githubJson(`repos/${repository}`);
    if (repo.full_name !== repository || !repo.default_branch) {
      throw new Error("The repository default branch could not be verified.");
    }
    const pullRequest = requirePositiveInteger(env.PR_NUMBER, "PR_NUMBER");
    const pull = githubJson(`repos/${repository}/pulls/${pullRequest}`);
    let resolution = null;
    if (env.GITHUB_WORKFLOW === "Publish Evidence") {
      resolution = revalidateWorkflowRun(loadResolvedWorkflowRun());
    } else if (env.GITHUB_WORKFLOW === "System Maintenance Approval") {
      resolution = revalidateWorkflowRun(loadResolvedWorkflowRun());
      validateMaintenanceManifest(report, repository, resolution);
    }
    const expected = acceptanceStatusExpectation({
      report,
      reportDigest,
      resolution,
      pull,
      repository,
      defaultBranch: repo.default_branch,
      env,
    });
    currentSourceRun(report, repository, pull);
    const status = JSON.parse(runGitHub([
      "api",
      "--method",
      "POST",
      `repos/${repository}/statuses/${expected.sha}`,
      "-f",
      `state=${expected.state}`,
      "-f",
      STATUS_CONTEXT_ARGUMENT,
      "-f",
      `description=${expected.state === "success"
        ? "Hosted evidence is ready for acceptance"
        : "Hosted evidence is incomplete or failed"}`,
      "-f",
      `target_url=${expected.targetUrl}`,
    ]));
    const receipt = verifyPublishedStatus(status, expected);
    writeReceipt(receipt);
    process.stdout.write(
      `published ${receipt.context}=${receipt.state} sha=${receipt.sha} ` +
      `creator=${receipt.creatorLogin} app=${receipt.publisherAppId} ` +
      `source=${receipt.sourceRunId}/${receipt.sourceRunAttempt} receipt=${STATUS_PATH}\n`,
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

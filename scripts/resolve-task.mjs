/**
 * Resolve the task contract from the issue number the human typed.
 *
 * Wired to the `UserPromptSubmit` hook. The issue number is an input to the
 * task, so it is given, never inferred: branch-name matching and
 * "the only open agent-task issue" were both guesses, and a guess that is
 * usually right is worse than no guess at all, because nobody checks it.
 *
 * The hook does the fetching so the agents do not have to. `plan` is read-only
 * by design and has no shell; if resolving the contract needed a terminal
 * command, either the plan agent gets write-adjacent capability it should not
 * have, or a human runs a command by hand before every session.
 *
 * Behaviour:
 *   - prompt does not invoke a task agent  -> do nothing, no GitHub call
 *   - invokes one, no issue number         -> stop the turn before any tokens
 *   - invokes one with an issue number     -> cache contract and plan, continue
 *
 * Sources: https://code.visualstudio.com/docs/agent-customization/hooks
 *          https://code.visualstudio.com/docs/agents/reference/hooks-reference
 */

import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CONTRACT_CACHE, cacheContract, contractFromIssue } from "./task-contract.mjs";
import { fetchApprovedPlan, fetchProposedPlan } from "./publish-plan.mjs";
import { extractPlanContract, planDigest, validatePlanContract } from "./plan-contract.mjs";
import { resolveCloudExecution } from "./execution-context.mjs";
import { approvalPolicyForRisk, inferRisk } from "./risk-policy.mjs";
import { localProposalPath } from "./plan-artifact.mjs";
import {
  assertWorkspaceOwner,
  bindWorkspaceOwner,
  claimWorkspaceOwner,
  releaseWorkspaceClaim,
  TASK_AUTHORITY_PATHS,
  unownedTaskAuthorityPaths,
} from "./workspace-owner.mjs";
import { workspacePath } from "./workspace-path.mjs";
import { runGitHub } from "./github-api.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const COMMIT_SHA = /^[0-9a-f]{40}$/;

export const PLAN_CACHE = "artifacts/task-plan.md";
export const PLAN_CONTRACT_CACHE = "artifacts/plan.json";
export const APPROVED_PLAN_CACHE = "artifacts/approved-plan.json";
export const TASK_SESSION_CACHE = "artifacts/task-session.json";
export const EXECUTION_CONTEXT_CACHE = "artifacts/execution-context.json";
export const PROPOSAL_PATH = "artifacts/plan-proposal.md";

export function clearTaskState(root = REPO_ROOT, ownerClaim = null) {
  const owner = assertWorkspaceOwner(root, ownerClaim?.identity ?? ownerClaim);
  const unownedState = owner ? [] : unownedTaskAuthorityPaths(root);
  if (unownedState.length > 0) {
    throw new Error(
      `Unowned task authority artifacts were preserved (${unownedState.join(", ")}). ` +
      "Use workspace release with --clear-unowned only after confirming they are obsolete.",
    );
  }
  for (const file of TASK_AUTHORITY_PATHS) {
    rmSync(resolve(root, file), { force: true });
  }
}

function promptText(prompt) {
  return String(prompt ?? "")
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "")
    .split(/\r?\n/).filter((line) => !/^\s*>/.test(line)).join("\n");
}

export function taskRole(prompt) {
  const text = promptText(prompt);
  if (/^\s*\/work\b/i.test(text)) return "implement";
  const explicitRole =
    /^\s*\/(plan|implement)\b/i.exec(text)?.[1]?.toLowerCase() ??
    /^\s*Task role:\s*(plan|implement)\s*$/im.exec(text)?.[1]?.toLowerCase();
  if (explicitRole) return explicitRole;
  return taskInputs(text).pullRequest !== null ? "implement" : null;
}

export function taskInputs(prompt) {
  const text = promptText(prompt);
  const values = (pattern) => [...text.matchAll(pattern)].map((match) => match[1].trim());
  const single = (matches, label) => {
    if (new Set(matches).size > 1) throw new Error(`Conflicting ${label} inputs.`);
    return matches[0] ?? null;
  };
  const pr = single(values(/^\s*Task PR:[ \t]*(.*)$/gim), "task PR");
  if (pr !== null && (!/^#?[1-9]\d*$/.test(pr) ||
      !Number.isSafeInteger(Number(pr.replace(/^#/, ""))))) {
    throw new Error("Task PR must be a positive pull request number.");
  }
  const proposalPath = single(values(/^\s*Task plan:[ \t]*(.*)$/gim), "task plan");
  if (proposalPath !== null && ![PROPOSAL_PATH, PLAN_CONTRACT_CACHE].includes(proposalPath)) {
    throw new Error("Explicit local proposals must use the task's proposal or plan artifact path.");
  }
  const workflow = single(values(/^\s*Task workflow:[ \t]*(.*)$/gim), "task workflow");
  if (workflow !== null && !["plan-first", "plan-and-execute"].includes(workflow)) {
    throw new Error("Task workflow must name plan-first or plan-and-execute.");
  }
  const workCommand = /^\s*\/work\b/i.test(text);
  if (workCommand && workflow === "plan-first") throw new Error("The work command conflicts with the requested workflow.");
  const combined = workCommand || workflow === "plan-and-execute";
  return { pullRequest: pr ? Number(pr.replace(/^#/, "")) : null, proposalPath, combined };
}

export function linkedIssue(body) {
  const matches = [...String(body ?? "").matchAll(/\b(?:closes|fixes|resolves)\s+#(\d+)\b/gi)];
  const issues = [...new Set(matches.map((match) => Number(match[1])))];
  if (issues.length > 1) throw new Error("Multiple task issues are linked; select one explicit task.");
  return issues[0] ?? null;
}

export function resolveTaskPRDetails(pullRequest, {
  root = REPO_ROOT,
  run = runGitHub,
} = {}) {
  if (!Number.isSafeInteger(pullRequest) || pullRequest < 1) {
    throw new Error("Task PR must be a positive pull request number.");
  }
  const raw = run(
    ["api", `repos/{owner}/{repo}/pulls/${pullRequest}`],
    { cwd: root },
  );
  const pull = JSON.parse(raw);
  if (pull.number !== pullRequest || pull.state !== "open") {
    throw new Error(`Task PR #${pullRequest} is not open in the current repository.`);
  }
  const baseRepository = pull.base?.repo?.full_name;
  const headRepository = pull.head?.repo?.full_name;
  if (!baseRepository || headRepository !== baseRepository) {
    throw new Error(`Task PR #${pullRequest} must be a same-repository pull request.`);
  }
  const issue = linkedIssue(pull.body);
  if (!Number.isSafeInteger(issue) || issue < 1) {
    throw new Error(`Task PR #${pullRequest} must link exactly one task issue.`);
  }
  const baseBranch = pull.base?.ref;
  const baseSha = pull.base?.sha;
  const headBranch = pull.head?.ref;
  const headSha = pull.head?.sha;
  if (typeof baseBranch !== "string" || !baseBranch ||
      typeof headBranch !== "string" || !headBranch ||
      !COMMIT_SHA.test(baseSha ?? "") || !COMMIT_SHA.test(headSha ?? "")) {
    throw new Error(`Task PR #${pullRequest} has incomplete or invalid branch metadata.`);
  }
  return {
    number: pullRequest,
    issue,
    repository: baseRepository,
    baseBranch,
    baseSha,
    headBranch,
    headSha,
  };
}

export function resolveTaskPRIssue(pullRequest, options) {
  return resolveTaskPRDetails(pullRequest, options).issue;
}

/**
 * Does this prompt start work that a task contract must govern?
 *
 * Matched two ways because it is not documented whether `UserPromptSubmit`
 * receives the raw `/plan 4` or the expanded body of the prompt file. Both
 * forms are recognized, so the hook behaves the same either way.
 */
export function isTaskInvocation(prompt) {
  const text = promptText(prompt);
  return (
    /^\s*\/(plan|implement|work)\b/.test(text) ||
    /^\s*Task issue:/im.test(text) ||
    /^\s*Task PR:/im.test(text)
  );
}

/** The issue number the human supplied, or null. */
export function extractIssue(prompt) {
  const text = promptText(prompt).replace(/^\s*Task PR:[^\r\n]*/gim, "");
  const patterns = [
    /^\s*Task issue:\s*#?(\d+)/im,
    /--issue\s+#?(\d+)/i,
    /^\s*\/(?:plan|implement|work)\s+#?(\d+)\b/m,
    /(?:^|\s)#(\d+)\b/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const issue = Number(match[match.length - 1]);
      return Number.isSafeInteger(issue) && issue > 0 ? issue : null;
    }
  }
  return null;
}

export function decide(prompt, { readTaskPR = null } = {}) {
  if (!isTaskInvocation(prompt)) {
    return { action: "ignore" };
  }
  const issue = extractIssue(prompt);
  let pullRequest;
  try {
    pullRequest = taskInputs(prompt).pullRequest;
  } catch (error) {
    return { action: "stop", reason: error.message };
  }
  if (pullRequest !== null) {
    if (typeof readTaskPR !== "function") {
      return {
        action: "stop",
        reason: "Task PR selection requires a live same-repository pull-request resolver.",
      };
    }
    let linkedTask;
    try {
      linkedTask = readTaskPR(pullRequest);
    } catch (error) {
      return {
        action: "stop",
        reason: `Task PR #${pullRequest} could not be resolved: ${error.message}`,
      };
    }
    if (!Number.isSafeInteger(linkedTask) || linkedTask < 1) {
      return {
        action: "stop",
        reason: `Task PR #${pullRequest} did not resolve to one live task issue.`,
      };
    }
    if (issue !== null && issue !== linkedTask) {
      return {
        action: "stop",
        reason: `Task PR #${pullRequest} links issue #${linkedTask}, not explicitly selected issue #${issue}.`,
      };
    }
    return { action: "resolve", issue: linkedTask, pullRequest };
  }
  if (!issue) {
    return {
      action: "stop",
      reason:
        "No task issue number. The plan and implement prompts take the issue as " +
        "an argument - for example `/plan 4` or `/implement 4`. Nothing was " +
        "inferred from the branch name or from the open issue list on purpose: " +
        "the task is an input, not a guess. Rerun with the number.",
    };
  }
  return { action: "resolve", issue };
}

function writeArtifact(relativePath, body, root = REPO_ROOT, ownerClaim = null) {
  assertWorkspaceOwner(root, ownerClaim?.identity ?? ownerClaim);
  const target = workspacePath(relativePath, root);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, body, "utf8");
  return target;
}

/** Read the issue, cache the contract, and cache the approved plan beside it. */
export function resolveTask(issue, {
  root = REPO_ROOT,
  readContract = contractFromIssue,
  readApprovedPlan = fetchApprovedPlan,
  readProposedPlan = fetchProposedPlan,
  role = null,
  sessionId = null,
  env = process.env,
  cloud = Boolean(env.COPILOT_AGENT_PROMPT),
  pullRequest = null,
  taskPRSelected = false,
  readTaskPRDetails = null,
  expectedHead,
  proposalPath = null,
  combined = false,
  readWorkspace = () => {
    const git = (args) => execFileSync("git", args, {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return { branch: git(["branch", "--show-current"]), headSha: git(["rev-parse", "HEAD"]) };
  },
  readCloudContext = resolveCloudExecution,
} = {}) {
  if (taskPRSelected && role !== "implement") {
    throw new Error("An explicit Task PR selector requires the implementation role.");
  }
  if (taskPRSelected && (!Number.isSafeInteger(pullRequest) || pullRequest < 1)) {
    throw new Error("An explicit Task PR selector requires a positive pull request number.");
  }
  const selectedTaskPR = taskPRSelected
    ? (readTaskPRDetails ?? ((number) => resolveTaskPRDetails(number, { root })))(pullRequest)
    : null;
  if (selectedTaskPR &&
      (selectedTaskPR.number !== pullRequest || selectedTaskPR.issue !== issue)) {
    throw new Error(`Task PR #${pullRequest} does not match the selected issue.`);
  }
  const owner = claimWorkspaceOwner({
    root,
    issue,
    sessionId,
    env,
    allowUnownedStatePaths: [PROPOSAL_PATH, PLAN_CONTRACT_CACHE].includes(proposalPath)
      ? [proposalPath]
      : [],
  });
  let localBody = null;
  let localReadError = null;
  try {
    if (proposalPath && [PROPOSAL_PATH, PLAN_CONTRACT_CACHE].includes(proposalPath)) {
      try {
        localBody = readFileSync(localProposalPath(proposalPath, root), "utf8");
      } catch (error) {
        localReadError = error;
      }
    }
    if (localReadError) throw localReadError;
    if (!Number.isSafeInteger(issue) || issue < 1) throw new Error("A positive explicit task issue is required.");
    const contract = readContract(issue);
    if (!contract.source?.trusted || contract.source.issue !== issue) {
      throw new Error("The resolver did not return the requested trusted task.");
    }
    bindWorkspaceOwner(owner, contract);
    clearTaskState(root, owner);
    const workspace = role === "implement" ? readWorkspace() : null;
    let approved = null;
    let selected = null;
    if (role === "implement" && proposalPath) {
      if (![PROPOSAL_PATH, PLAN_CONTRACT_CACHE].includes(proposalPath) || cloud) {
        throw new Error("An explicit local proposal cannot substitute for the cloud implementation PR.");
      }
      const body = localBody;
      const candidate = proposalPath === PLAN_CONTRACT_CACHE ? JSON.parse(body) : extractPlanContract(body);
      const validation = validatePlanContract(candidate, contract);
      if (!validation.ok || approvalPolicyForRisk(candidate.risk).requirePlanOnlyApproval ||
          Object.hasOwn(candidate, "approval")) {
        throw new Error("The explicit proposal is invalid or requires independent plan-first approval.");
      }
      if (workspace.branch !== `agent/implement/${contract.id.toLowerCase()}`) {
        throw new Error("A local proposal requires the task's dedicated branch.");
      }
      if (workspace.headSha !== candidate.baseSha) {
        execFileSync("git", ["merge-base", "--is-ancestor", candidate.baseSha, "HEAD"], {
          cwd: root, stdio: ["ignore", "pipe", "pipe"],
        });
      }
      selected = { body, plan: candidate, approval: null };
    } else if (role === "implement" && combined) {
      if (cloud || pullRequest !== null) {
        selected = readProposedPlan(contract, {
          pullRequest, headBranch: workspace.branch, expectedHead: expectedHead ?? workspace.headSha,
        });
      }
    } else {
      approved = readApprovedPlan(contract);
      selected = approved ?? (role === "implement" ? readProposedPlan(contract, {
        pullRequest, headBranch: workspace.branch, expectedHead: expectedHead ?? workspace.headSha,
      }) : null);
    }
    if (selectedTaskPR) {
      if (!selected) {
        throw new Error(`Task PR #${pullRequest} requires a validated implementation plan.`);
      }
      if (selectedTaskPR.baseBranch !== selected.plan.baseBranch ||
          selectedTaskPR.baseSha !== selected.plan.baseSha) {
        throw new Error(
          `Task PR #${pullRequest} base does not match the selected plan's branch and commit.`,
        );
      }
      if (!cloud) {
        if (!workspace || workspace.branch !== selectedTaskPR.headBranch) {
          throw new Error(
            `Local worktree branch does not match selected Task PR #${pullRequest} head branch.`,
          );
        }
        if (workspace.headSha !== selectedTaskPR.headSha) {
          try {
            execFileSync("git", ["merge-base", "--is-ancestor", selectedTaskPR.headSha, "HEAD"], {
              cwd: root,
              stdio: ["ignore", "ignore", "ignore"],
            });
          } catch {
            throw new Error(
              `Local worktree HEAD is not descended from selected Task PR #${pullRequest} head.`,
            );
          }
        }
      }
    }
    const approvalState = approved ? "approved" : selected ? "proposed" : "missing";
    const plan = selected?.body ?? null;
    if (selected) {
      const validation = validatePlanContract(selected.plan, contract);
      if (!validation.ok) throw new Error(`The resolved task plan is invalid: ${validation.errors.join(" ")}`);
      const content = `${JSON.stringify({
        ...selected.plan, planDigest: planDigest(selected.plan),
        ...(approved ? { approval: approved.approval } : {}),
      }, null, 2)}\n`;
      writeArtifact(PLAN_CACHE, `${plan}\n`, root, owner);
      writeArtifact(PLAN_CONTRACT_CACHE, content, root, owner);
      if (approved) writeArtifact(APPROVED_PLAN_CACHE, content, root, owner);
    }
    cacheContract(contract, resolve(root, CONTRACT_CACHE), owner);
    writeArtifact(TASK_SESSION_CACHE, `${JSON.stringify({
      issue, taskId: contract.id, contractDigest: contract.source.bodyDigest,
      role, sessionId, approvalState, pullRequest,
      workspaceOwner: owner.identity.ownerKey,
      workflow: combined ? "plan-and-execute" : approved ? "plan-first" : null,
      canPropose: combined && !cloud && role === "implement" &&
        workspace.branch === `agent/implement/${contract.id.toLowerCase()}` &&
        !approvalPolicyForRisk(inferRisk({ paths: contract.inputs.scope.allowed }).risk).requirePlanOnlyApproval,
      workspaceHead: workspace?.headSha ?? null,
    })}\n`, root, owner);
    if (cloud && role === "implement" && selected) {
      const context = readCloudContext(contract, {
        ...selected.plan, planDigest: planDigest(selected.plan),
      });
      if (selectedTaskPR && (
        context.pullRequest !== selectedTaskPR.number ||
        context.branch !== selectedTaskPR.headBranch ||
        context.headSha !== selectedTaskPR.headSha ||
        context.baseBranch !== selectedTaskPR.baseBranch ||
        context.baseSha !== selectedTaskPR.baseSha
      )) {
        throw new Error(
          `Cloud execution does not match explicitly selected Task PR #${pullRequest} head, base, and branch.`,
        );
      }
      writeArtifact(EXECUTION_CONTEXT_CACHE, `${JSON.stringify(context, null, 2)}\n`, root, owner);
    }
    return { contract, plan, approvalState };
  } catch (error) {
    try {
      clearTaskState(root, owner);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `Task resolution failed: ${error.message}; owned state cleanup failed: ${cleanupError.message}`,
        { cause: cleanupError },
      );
    }
    throw error;
  } finally {
    releaseWorkspaceClaim(owner);
  }
}

export function renderResult({ contract, plan, issue, approvalState = "missing" }) {
  return (
    `Task contract for issue #${issue} (${contract.id}) cached at artifacts/task-contract.json. ` +
    (plan
      ? approvalState === "approved"
        ? "The independently approved plan-first proposal is cached at artifacts/task-plan.md."
        : "The validated proposed plan is cached at artifacts/task-plan.md; it is not human-approved. Final review is still required."
      : "No execution plan is resolved. High-risk work requires plan-first approval; eligible local /work sessions may write only artifacts/plan-proposal.md and validate it before source edits.")
  );
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function clearUnownedState() {
  try {
    clearTaskState();
    return null;
  } catch (error) {
    return error;
  }
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  const raw = await readStdin();
  let prompt;
  let payload;
  try {
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid hook envelope.");
    prompt = payload.prompt ?? payload.userPrompt ?? "";
  } catch {
    const cleanup = clearUnownedState();
    emit({
      continue: false,
      stopReason: cleanup
        ? `Task prompt hook received invalid input; existing owned workspace state was preserved: ${cleanup.message}`
        : "Task prompt hook received invalid input; unowned cached authority was cleared.",
    });
    return;
  }

  const decision = decide(prompt, { readTaskPR: resolveTaskPRIssue });
  if (decision.action === "ignore") {
    emit({ continue: true });
    return;
  }
  if (decision.action === "stop") {
    const cleanup = clearUnownedState();
    emit({
      continue: false,
      stopReason: cleanup
        ? `${decision.reason} Existing owned workspace state was preserved: ${cleanup.message}`
        : decision.reason,
    });
    return;
  }

  try {
    const inputs = taskInputs(prompt);
    const result = resolveTask(decision.issue, {
      role: taskRole(prompt),
      sessionId: payload.session_id ?? payload.sessionId ?? null,
      ...inputs,
      pullRequest: decision.pullRequest ?? inputs.pullRequest,
      taskPRSelected: decision.pullRequest !== undefined,
    });
    emit({
      continue: true,
      systemMessage: renderResult({ ...result, issue: decision.issue }),
    });
  } catch (error) {
    emit({
      continue: false,
      stopReason:
        `Issue #${decision.issue} could not be read as a task contract: ` +
        `${/** @type {Error} */ (error).message.split("\n")[0]} ` +
        "Fix the issue body to match .github/ISSUE_TEMPLATE/agent-task.yml, or pass a different number.",
    });
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  await main();
}

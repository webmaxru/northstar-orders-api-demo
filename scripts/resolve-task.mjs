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
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CONTRACT_CACHE, cacheContract, contractFromIssue } from "./task-contract.mjs";
import { fetchApprovedPlan, fetchProposedPlan } from "./publish-plan.mjs";
import { planDigest, validatePlanContract } from "./plan-contract.mjs";
import { resolveCloudExecution } from "./execution-context.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

export const PLAN_CACHE = "artifacts/task-plan.md";
export const PLAN_CONTRACT_CACHE = "artifacts/plan.json";
export const APPROVED_PLAN_CACHE = "artifacts/approved-plan.json";
export const TASK_SESSION_CACHE = "artifacts/task-session.json";
export const EXECUTION_CONTEXT_CACHE = "artifacts/execution-context.json";

export function clearTaskState(root = REPO_ROOT) {
  for (const file of [
    CONTRACT_CACHE, PLAN_CACHE, PLAN_CONTRACT_CACHE, APPROVED_PLAN_CACHE,
    TASK_SESSION_CACHE, EXECUTION_CONTEXT_CACHE,
  ]) {
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
  return /^\s*\/(plan|implement)\b/i.exec(text)?.[1]?.toLowerCase() ??
    /^\s*Task role:\s*(plan|implement)\s*$/im.exec(text)?.[1]?.toLowerCase() ?? null;
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
    /^\s*\/(plan|implement)\b/.test(text) || /^\s*Task issue:/im.test(text)
  );
}

/** The issue number the human supplied, or null. */
export function extractIssue(prompt) {
  const text = promptText(prompt);
  const patterns = [
    /^\s*Task issue:\s*#?(\d+)/im,
    /--issue\s+#?(\d+)/i,
    /^\s*\/(?:plan|implement)\s+#?(\d+)\b/m,
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

export function decide(prompt) {
  if (!isTaskInvocation(prompt)) {
    return { action: "ignore" };
  }
  const issue = extractIssue(prompt);
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

function writeArtifact(relativePath, body, root = REPO_ROOT) {
  const target = resolve(root, relativePath);
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
  cloud = Boolean(process.env.COPILOT_AGENT_PROMPT),
} = {}) {
  clearTaskState(root);
  try {
    if (!Number.isSafeInteger(issue) || issue < 1) throw new Error("A positive explicit task issue is required.");
    const contract = readContract(issue);
    if (!contract.source?.trusted || contract.source.issue !== issue) {
      throw new Error("The resolver did not return the requested trusted task.");
    }
    const approved = readApprovedPlan(contract);
    const selected = approved ?? (role === "implement" ? readProposedPlan(contract) : null);
    const plan = selected?.body ?? null;
    if (selected) {
      const validation = validatePlanContract(selected.plan, contract);
      if (!validation.ok) throw new Error(`The resolved approved plan is invalid: ${validation.errors.join(" ")}`);
      const content = `${JSON.stringify({
        ...selected.plan, planDigest: planDigest(selected.plan),
        ...(approved ? { approval: approved.approval } : {}),
      }, null, 2)}\n`;
      writeArtifact(PLAN_CACHE, `${plan}\n`, root);
      writeArtifact(PLAN_CONTRACT_CACHE, content, root);
      if (approved) writeArtifact(APPROVED_PLAN_CACHE, content, root);
    }
    cacheContract(contract, resolve(root, CONTRACT_CACHE));
    writeArtifact(TASK_SESSION_CACHE, `${JSON.stringify({
      issue, taskId: contract.id, contractDigest: contract.source.bodyDigest,
      role, sessionId,
    })}\n`, root);
    if (cloud && role === "implement" && approved) {
      const context = resolveCloudExecution(contract, approved.plan);
      writeArtifact(EXECUTION_CONTEXT_CACHE, `${JSON.stringify(context, null, 2)}\n`, root);
    }
    return { contract, plan };
  } catch (error) {
    clearTaskState(root);
    throw error;
  }
}

export function renderResult({ contract, plan, issue }) {
  return (
    `Task contract for issue #${issue} (${contract.id}) cached at artifacts/task-contract.json. ` +
    (plan
      ? "The human-approved plan from its plan-first pull request is cached at artifacts/task-plan.md."
      : "No human-approved plan matches this task yet - plan, publish, and approve before implementing.")
  );
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
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
    clearTaskState();
    emit({ continue: false, stopReason: "Task prompt hook received invalid input; cached authority was cleared." });
    return;
  }

  const decision = decide(prompt);
  if (decision.action === "ignore") {
    emit({ continue: true });
    return;
  }
  if (decision.action === "stop") {
    clearTaskState();
    emit({ continue: false, stopReason: decision.reason });
    return;
  }

  try {
    const { contract, plan } = resolveTask(decision.issue, {
      role: taskRole(prompt),
      sessionId: payload.session_id ?? payload.sessionId ?? null,
    });
    emit({
      continue: true,
      systemMessage: renderResult({ contract, plan, issue: decision.issue }),
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

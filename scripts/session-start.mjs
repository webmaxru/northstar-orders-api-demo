/**
 * Resolve the active task contract when an agent session starts.
 *
 * Wired to the SessionStart hook. Nobody should have to run a command by hand
 * before working: a contract you must remember to fetch is a contract that will
 * be missing exactly when it matters.
 *
 * Task identity is explicit input: AGENT_TASK_ISSUE, the documented initial
 * prompt fields, or cloud agent's COPILOT_AGENT_PROMPT. Conflicting selectors
 * fail closed; branch names and cached tasks are never task selectors.
 *
 * Interactive sessions do not use it. There, the human passes the issue number
 * to `/plan` or `/implement` and the UserPromptSubmit hook resolves it. Nothing
 * is inferred from the branch name or the open issue list any more: those
 * guesses were usually right, which is precisely why nobody checked them.
 *
 * With no issue, the session still starts and reports that no contract is
 * active. It deliberately does NOT fall back to a fixture under tests/fixtures:
 * those exist to recreate an issue, and silently treating one as the contract
 * would hide the fact that the real one was never read.
 */

import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";
import { splitProhibitions } from "./task-contract.mjs";
import {
  clearTaskState,
  decide,
  resolveTask,
  taskRole,
} from "./resolve-task.mjs";

export function resolveIssueNumber({ env = process.env, payload = {} } = {}) {
  const candidates = [];
  if (env.AGENT_TASK_ISSUE !== undefined && env.AGENT_TASK_ISSUE !== "") {
    if (!/^[1-9]\d*$/.test(env.AGENT_TASK_ISSUE) ||
        !Number.isSafeInteger(Number(env.AGENT_TASK_ISSUE))) {
      throw new Error("AGENT_TASK_ISSUE must be a positive issue number.");
    }
    candidates.push({ number: Number(env.AGENT_TASK_ISSUE), how: "AGENT_TASK_ISSUE" });
  }
  for (const [how, prompt] of [
    ["initial_prompt", payload.initial_prompt],
    ["initialPrompt", payload.initialPrompt],
    ["COPILOT_AGENT_PROMPT", env.COPILOT_AGENT_PROMPT],
  ]) {
    if (prompt === undefined) continue;
    if (typeof prompt !== "string") throw new Error(`${how} must be text.`);
    const decision = decide(prompt);
    if (decision.action === "stop") throw new Error(decision.reason);
    if (decision.action === "resolve") candidates.push({ number: decision.issue, how });
  }
  if (new Set(candidates.map(({ number }) => number)).size > 1) {
    throw new Error("Conflicting explicit task selectors; cached authority was cleared.");
  }
  return candidates[0] ?? { number: null, how: "nothing" };
}

function summarize(contract, how, plan) {
  const criteria = contract.successCriteria
    .map((c) => `  ${c.id}: ${c.statement} (proven by: ${c.provenBy})`)
    .join("\n");

  const planSection = plan
    ? [
        "",
        "APPROVED PLAN, cached at artifacts/task-plan.md from the task's plan-first pull request:",
        "",
        plan,
        "",
        "Implement only what this plan describes. If it is missing or looks stale,",
        "stop and say so rather than planning again inside an implementation session.",
      ]
    : [
        "",
        "No human-approved plan matches this task. If you are implementing,",
        "stop: run the plan agent first, publish its plan-only PR, and get it approved. Do",
        "not plan and implement in the same session.",
      ];

  return [
    `ACTIVE TASK CONTRACT: ${contract.id} - ${contract.title}`,
    `Resolved from ${contract.source.kind} via ${how}. Cached at artifacts/task-contract.json.`,
    "",
    "This cached contract is the authority for this session. Do not read any file",
    "under tests/fixtures as the contract; those are offline test inputs, not the",
    "issue, not the issue itself.",
    "",
    `Allowed scope: ${contract.inputs.scope.allowed.join(", ")}`,
    `Prohibited paths, enforced before every tool call: ${splitProhibitions(contract.inputs.scope).paths.join(", ") || "none stated"}`,
    `Prohibited in prose, NOT enforced by any check - honour these yourself: ${splitProhibitions(contract.inputs.scope).advisory.join("; ") || "none stated"}`,
    `Authoritative sources: ${contract.inputs.authoritativeSources.join(", ")}`,
    `Constraints: ${contract.inputs.constraints.join("; ")}`,
    "",
    "Success criteria:",
    criteria,
    "",
    `Stop conditions: ${contract.stopConditions.join("; ")}`,
    ...planSection,
  ].join("\n");
}

function emit(additionalContext) {
  process.stdout.write(
    `${JSON.stringify(
      {
        additionalContext,
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext,
        },
      },
      null,
      2,
    )}\n`,
  );
}

async function main() {
  clearTaskState();
  try {
    const chunks = [];
    if (!process.stdin.isTTY) {
      for await (const chunk of process.stdin) chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    const payload = raw ? JSON.parse(raw) : {};
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid session hook envelope.");
    const resolution = resolveIssueNumber({ payload });
    if (!resolution.number) {
      emit("No explicit task issue was supplied. Reads remain available; writes are denied. " +
        "Supply `/plan <issue>`, `/implement <issue>`, or AGENT_TASK_ISSUE. No cached task or fixture was adopted.");
      return;
    }
    const prompt = payload.initial_prompt ?? payload.initialPrompt ?? process.env.COPILOT_AGENT_PROMPT ?? "";
    const { contract, plan } = resolveTask(resolution.number, {
      role: taskRole(prompt),
      sessionId: payload.session_id ?? payload.sessionId ?? null,
    });
    emit(summarize(contract, resolution.how, plan));
  } catch (error) {
    clearTaskState();
    emit(
      "Task resolution failed; cached authority was cleared and writes remain denied: " +
        `${/** @type {Error} */ (error).message.split("\n")[0]} ` +
        "Fix the issue body to match .github/ISSUE_TEMPLATE/agent-task.yml.",
    );
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  await main();
}

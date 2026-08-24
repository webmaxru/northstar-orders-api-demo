/**
 * Resolve the active task contract when an agent session starts.
 *
 * Wired to the SessionStart hook. Nobody should have to run a command by hand
 * before working: a contract you must remember to fetch is a contract that will
 * be missing exactly when it matters.
 *
 * Resolution order, most explicit first:
 *   1. AGENT_TASK_ISSUE - an issue number set for this session
 *   2. the current branch name, if it contains a task id such as wi-1842
 *   3. exactly one open issue labelled `agent-task`
 *
 * If none of those resolves, the session still starts. The hook reports that no
 * contract is active and the boundary falls back to the repository-wide
 * default. It deliberately does NOT fall back to a seed file in docs/demo-setup:
 * those exist to recreate an issue, and silently treating one as the contract
 * would hide the fact that the real one was never read.
 */

import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CONTRACT_CACHE, cacheContract, parseIssueBody, splitProhibitions } from "./task-contract.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

/** Drop a contract left by an earlier session so it cannot govern this one. */
function clearContract() {
  rmSync(resolve(REPO_ROOT, CONTRACT_CACHE), { force: true });
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function currentBranch() {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

/** Find the agent-task issue whose title carries this id, for example WI-1842. */
function issueForTaskId(taskId) {
  const raw = gh(["issue", "list", "--label", "agent-task", "--state", "open", "--json", "number,title", "--limit", "50"]);
  const match = JSON.parse(raw).find((issue) =>
    issue.title.toUpperCase().includes(taskId.toUpperCase()),
  );
  return match?.number ?? null;
}

function soleAgentTaskIssue() {
  const raw = gh(["issue", "list", "--label", "agent-task", "--state", "open", "--json", "number", "--limit", "50"]);
  const issues = JSON.parse(raw);
  return issues.length === 1 ? issues[0].number : null;
}

export function resolveIssueNumber({
  env = process.env,
  branch = currentBranch(),
  allowSoleIssue = false,
} = {}) {
  if (env.AGENT_TASK_ISSUE) {
    return { number: Number(env.AGENT_TASK_ISSUE), how: "AGENT_TASK_ISSUE" };
  }

  const fromBranch = /\b(wi[-_]?\d+)\b/i.exec(branch);
  if (fromBranch) {
    const taskId = fromBranch[1].replace(/[-_]/, "-").toUpperCase();
    const number = issueForTaskId(taskId);
    if (number) {
      return { number, how: `branch ${branch}` };
    }
  }

  // Only reachable when the caller says this session is about a task - that is,
  // from an agent-scoped hook. A workspace-wide hook must not query GitHub on
  // every unrelated chat, and must not adopt a task nobody asked for.
  if (allowSoleIssue) {
    const sole = soleAgentTaskIssue();
    if (sole) {
      return { number: sole, how: "the only open agent-task issue" };
    }
  }

  return { number: null, how: "nothing" };
}

function summarize(contract, how) {
  const criteria = contract.successCriteria
    .map((c) => `  ${c.id}: ${c.statement} (proven by: ${c.provenBy})`)
    .join("\n");

  return [
    `ACTIVE TASK CONTRACT: ${contract.id} - ${contract.title}`,
    `Resolved from ${contract.source.kind} via ${how}. Cached at artifacts/task-contract.json.`,
    "",
    "This cached contract is the authority for this session. Do not read any file",
    "under docs/demo-setup as the contract; those are seed texts for recreating the",
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
  ].join("\n");
}

function emit(additionalContext) {
  process.stdout.write(
    `${JSON.stringify(
      {
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
  const allowSoleIssue = process.argv.includes("--allow-sole-issue");
  let resolution;
  try {
    resolution = resolveIssueNumber({ allowSoleIssue });
  } catch (error) {
    clearContract();
    emit(
      `No task contract is active: could not query issues (${/** @type {Error} */ (error).message.split("\n")[0]}). ` +
        "The capability boundary is ungoverned for this session. " +
        "Run `npm run contract:fetch -- --issue <n>` to set one.",
    );
    return;
  }

  if (!resolution.number) {
    // Clear any contract left by a previous session. Inheriting one would mean
    // an unrelated chat is judged against a task nobody is working on.
    clearContract();
    emit(
      "No task contract is active for this session. Nothing in the branch name " +
        "or AGENT_TASK_ISSUE identifies a task, so no issue was read and no " +
        "GitHub call was made. The capability boundary is ungoverned: reads are " +
        "allowed and writes ask. Do not substitute a seed file from " +
        "docs/demo-setup. To work on a task, check out a branch named after it, " +
        "set AGENT_TASK_ISSUE, or run `npm run contract:fetch -- --issue <n>`.",
    );
    return;
  }

  try {
    const raw = gh(["issue", "view", String(resolution.number), "--json", "number,title,body,url"]);
    const issue = JSON.parse(raw);
    const contract = parseIssueBody(issue.body, {
      number: issue.number,
      url: issue.url,
      source: `issue #${issue.number}`,
    });
    cacheContract(contract);
    emit(summarize(contract, resolution.how));
  } catch (error) {
    emit(
      `Issue #${resolution.number} was found but could not be read as a task contract: ` +
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

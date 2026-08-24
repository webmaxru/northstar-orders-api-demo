/**
 * Publish the plan as the description of a plan-first pull request.
 *
 * Microsoft Learn, "Separate planning, reasoning, and execution", Option A:
 *
 *   - A plan is generated.
 *   - The agent opens a pull request that contains only the plan (no code
 *     changes yet).
 *   - Reviewers discuss, refine, and approve the plan directly in the PR.
 *   - After approval, the agent proceeds to implement the plan in follow-up
 *     commits or a new PR.
 *
 * https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/4-plan-reason-execution
 *
 * The issue stays what Learn calls it - context and intent, the task contract.
 * The plan is a proposal about that intent, so it belongs where proposals are
 * reviewed. That also makes approval a real GitHub review event with a person
 * attached, rather than a thumbs-up on a comment.
 *
 * Usage:
 *   node scripts/publish-plan.mjs --file plan.md
 *   node scripts/publish-plan.mjs < plan.md
 *   node scripts/publish-plan.mjs --show
 *   node scripts/publish-plan.mjs --transcript <path>   (used by the Stop hook)
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Buffer } from "node:buffer";
import { loadTaskContract } from "./task-contract.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const MARKER = "<!-- northstar:plan -->";
export const PLAN_HEADING = "## Plan (required)";

// The plan carries its own `## ` headings, so the section cannot be delimited by
// "the next heading" - that would truncate the plan at its first subheading.
// These comments are invisible in rendered Markdown and unambiguous to parse.
const PLAN_START = "<!-- northstar:plan:start -->";
const PLAN_END = "<!-- northstar:plan:end -->";

/** The branch a plan-first PR is opened from. */
export function planBranch(taskId) {
  return `plan/${String(taskId).toLowerCase()}`;
}

/**
 * The PR description: the plan, plus the sections the PR template requires.
 *
 * Evidence stays empty on purpose. A plan-first PR has no commits yet, so there
 * is nothing to evidence; `publish-evidence.mjs` fills it in once implementation
 * has run and the gate has something to measure.
 */
export function renderPlan(body, meta = {}) {
  return [
    MARKER,
    meta.issue ? `Closes #${meta.issue}` : "",
    "",
    PLAN_HEADING,
    "",
    `Produced by the read-only \`plan\` agent${meta.at ? ` at ${meta.at}` : ""}. No code changes yet.`,
    "",
    PLAN_START,
    String(body).trim(),
    PLAN_END,
    "",
    "## Evidence",
    "",
    "_No commits yet. The evidence gate fills this in when implementation runs._",
    "",
    "## Review checklist",
    "",
    "- [ ] Plan reviewed and approved",
    "- [ ] Required reviews satisfied",
    "- [ ] Required checks satisfied",
    "",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** Pull the plan back out of a PR description, or null if there is none. */
export function extractPlanSection(prBody) {
  const text = String(prBody ?? "");

  const start = text.indexOf(PLAN_START);
  if (start !== -1) {
    const end = text.indexOf(PLAN_END, start);
    const section = text
      .slice(start + PLAN_START.length, end === -1 ? undefined : end)
      .trim();
    return section.length > 0 ? section : null;
  }

  // A human-written PR that used the template has the heading but no markers.
  const heading = text.indexOf(PLAN_HEADING);
  if (heading === -1) return null;
  const after = text.slice(heading + PLAN_HEADING.length);
  const next = after.search(/\n## /);
  const section = (next === -1 ? after : after.slice(0, next)).trim();
  return section.length > 0 ? section : null;
}

/**
 * Pull the final assistant message out of a session transcript.
 *
 * VS Code documents `transcript_path` but warns the file format "is not a
 * stable hook API and may change". So this tries the shapes we know, and
 * returns null rather than guessing when none fit - the caller then tells the
 * human how to publish manually instead of silently persisting nothing.
 */
export function extractPlan(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  const looksLikeMessage = (value) =>
    Boolean(value) &&
    typeof value === "object" &&
    ("role" in value || "type" in value);

  // JSON Lines: one message object per line.
  let messages = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      messages.push(JSON.parse(trimmed));
    } catch {
      // not JSONL, fall through
    }
  }

  // A single JSON document parses as one "line", so its envelope would look
  // like a message. Fall back to the document shape unless the parsed objects
  // actually carry a role.
  if (!messages.some(looksLikeMessage)) {
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed)
        ? parsed
        : (parsed.messages ?? parsed.turns ?? []);
      messages = Array.isArray(list) ? list : [];
    } catch {
      return null;
    }
  }

  const assistant = messages
    .filter((m) =>
      ["assistant", "model", "agent"].includes(
        String(m?.role ?? m?.type ?? ""),
      ),
    )
    .map((m) => {
      const content = m.content ?? m.text ?? m.message ?? "";
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map((part) => (typeof part === "string" ? part : (part?.text ?? "")))
          .join("");
      }
      return "";
    })
    .filter((body) => body.trim().length > 0);

  return assistant.length > 0 ? assistant[assistant.length - 1] : null;
}

function gh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** The open PR carrying this task's plan, or null. */
export function findPlanPr(taskId, { run = gh } = {}) {
  const raw = run([
    "pr",
    "list",
    "--head",
    planBranch(taskId),
    "--state",
    "open",
    "--json",
    "number,body,url",
  ]);
  const list = JSON.parse(raw);
  return list.length > 0 ? list[0] : null;
}

/**
 * Open the plan-first PR: a branch whose only content is the plan.
 *
 * The empty commit is deliberate. Option A wants a PR "that contains only the
 * plan (no code changes yet)", and GitHub needs a commit to open one.
 * Implementation then lands as follow-up commits on the same branch, so the
 * approved plan and the diff claiming to implement it stay in one review.
 */
function openPlanPr(contract, body, { run = gh, vcs = git } = {}) {
  const branch = planBranch(contract.id);
  const base = vcs(["rev-parse", "--abbrev-ref", "origin/HEAD"])
    .trim()
    .replace(/^origin\//, "");

  vcs(["fetch", "origin", base]);

  // GitHub refuses a PR with no commits between the branches, so the branch
  // needs one commit of its own. `commit-tree` builds it directly from the base
  // tree: an empty commit that touches no file, and no checkout, no index and no
  // stash - the human's working tree is not part of this.
  const tree = vcs(["rev-parse", `origin/${base}^{tree}`]).trim();
  const commit = vcs([
    "commit-tree",
    tree,
    "-p",
    `origin/${base}`,
    "-m",
    `${contract.id}: plan\n\nPlan-first pull request. No code changes yet.`,
  ]).trim();
  vcs(["push", "--force", "origin", `${commit}:refs/heads/${branch}`]);

  const created = run([
    "pr",
    "create",
    "--draft",
    "--base",
    base,
    "--head",
    branch,
    "--title",
    `${contract.id}: plan`,
    "--body",
    body,
  ]);
  return {
    number: Number(/\/pull\/(\d+)/.exec(created)?.[1]),
    url: created.trim(),
  };
}

/** Put the plan in the PR description, opening the plan-first PR if needed. */
export function publish(contract, body, deps = {}) {
  const run = deps.run ?? gh;
  const rendered = renderPlan(body, {
    at: deps.at ?? new Date().toISOString(),
    issue: contract.source?.issue,
  });

  const existing = findPlanPr(contract.id, { run });
  if (existing) {
    run(["pr", "edit", String(existing.number), "--body", rendered]);
    return { updated: true, number: existing.number, url: existing.url };
  }
  const created = openPlanPr(contract, rendered, deps);
  return { updated: false, number: created.number, url: created.url };
}

/** Read the plan back from the task's pull request. */
export function fetchPlan(taskId, deps = {}) {
  const pr = findPlanPr(taskId, deps);
  return pr ? extractPlanSection(pr.body) : null;
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function valueOf(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const contract = loadTaskContract();
  if (!contract) {
    process.stderr.write(
      "No task contract is active. Run /plan <issue>, or npm run contract:fetch -- --issue <n>.\n",
    );
    process.exit(2);
  }

  if (process.argv.includes("--show")) {
    const plan = fetchPlan(contract.id);
    process.stdout.write(
      plan ? `${plan}\n` : `No plan PR is open for ${contract.id}.\n`,
    );
    process.exit(plan ? 0 : 1);
  }

  const transcript = valueOf("--transcript");
  const file = valueOf("--file");

  let body;
  if (file) {
    body = readFileSync(resolve(REPO_ROOT, file), "utf8");
  } else if (transcript) {
    try {
      body = extractPlan(readFileSync(transcript, "utf8"));
    } catch {
      body = null;
    }
  } else {
    body = await readStdin();
  }

  if (!body || !body.trim()) {
    process.stderr.write(
      "No plan content could be read. Publish it explicitly:\n" +
        "  node scripts/publish-plan.mjs --file <plan.md>\n",
    );
    process.exit(1);
  }

  const result = publish(contract, body);
  process.stdout.write(
    `${result.updated ? "updated" : "opened"} plan PR #${result.number} for ${contract.id}\n`,
  );
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  await main();
}

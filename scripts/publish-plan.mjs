/**
 * Persist a plan as a comment on the task issue.
 *
 * Microsoft Learn says where a plan belongs: "Planning appears in a PR
 * description, an issue comment, or a .github/pull_request_template.md
 * artifact", and the minimum audit trail requires "an inspectable plan (PR plan
 * section or file)".
 *
 * A plan that exists only in a chat thread is none of those. It cannot be
 * reviewed by someone who was not in the session, cannot be resumed tomorrow,
 * and disappears if the window is closed. Handing it to the next agent through
 * conversation context is exactly the agent-to-agent chatter that versioned
 * artifacts are supposed to replace.
 *
 * Usage:
 *   node scripts/publish-plan.mjs --issue 4 --file plan.md
 *   node scripts/publish-plan.mjs --issue 4 < plan.md
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

export function renderPlan(body, meta = {}) {
  return [
    MARKER,
    "## Proposed plan",
    "",
    `Produced by the read-only \`plan\` agent${meta.at ? ` at ${meta.at}` : ""}. Not yet approved.`,
    "",
    "A human approves this by reacting or replying. The `implement` agent reads",
    "it from here rather than from a chat thread, so implementation can start in",
    "a fresh session without carrying planning context into it.",
    "",
    "---",
    "",
    body.trim(),
  ].join("\n");
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
    Boolean(value) && typeof value === "object" && ("role" in value || "type" in value);

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
      const list = Array.isArray(parsed) ? parsed : (parsed.messages ?? parsed.turns ?? []);
      messages = Array.isArray(list) ? list : [];
    } catch {
      return null;
    }
  }

  const assistant = messages
    .filter((m) => ["assistant", "model", "agent"].includes(String(m?.role ?? m?.type ?? "")))
    .map((m) => {
      const content = m.content ?? m.text ?? m.message ?? "";
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content.map((part) => (typeof part === "string" ? part : (part?.text ?? ""))).join("");
      }
      return "";
    })
    .filter((body) => body.trim().length > 0);

  return assistant.length > 0 ? assistant[assistant.length - 1] : null;
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function existingCommentId(issue) {
  const raw = gh(["api", `repos/{owner}/{repo}/issues/${issue}/comments`, "--jq", ".[] | {id, body}"]);
  for (const line of raw.split("\n").filter(Boolean)) {
    const comment = JSON.parse(line);
    if (comment.body?.includes(MARKER)) return comment.id;
  }
  return null;
}

export function publish(issue, body) {
  const rendered = renderPlan(body, { at: new Date().toISOString() });
  const existing = existingCommentId(issue);
  if (existing) {
    gh(["api", "--method", "PATCH", `repos/{owner}/{repo}/issues/comments/${existing}`, "-f", `body=${rendered}`]);
    return { updated: true, id: existing };
  }
  const created = gh(["api", "--method", "POST", `repos/{owner}/{repo}/issues/${issue}/comments`, "-f", `body=${rendered}`]);
  return { updated: false, id: JSON.parse(created).id };
}

/** Read the persisted plan back from the task issue, or null if none. */
export function fetchPlan(issue) {
  const raw = gh(["api", `repos/{owner}/{repo}/issues/${issue}/comments`, "--jq", ".[] | {body}"]);
  for (const line of raw.split("\n").filter(Boolean)) {
    const comment = JSON.parse(line);
    if (comment.body?.includes(MARKER)) {
      // Strip the marker and the preamble; return the plan itself.
      const parts = comment.body.split("\n---\n");
      return (parts.length > 1 ? parts.slice(1).join("\n---\n") : comment.body).trim();
    }
  }
  return null;
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
  const issue = valueOf("--issue") ?? contract?.source?.issue;
  const transcript = valueOf("--transcript");
  const file = valueOf("--file");

  if (process.argv.includes("--show")) {
    const target = issue ?? valueOf("--issue");
    if (!target) {
      process.stderr.write("No task issue. Resolve a contract first.\n");
      process.exit(2);
    }
    const plan = fetchPlan(target);
    process.stdout.write(plan ? `${plan}\n` : `No plan has been posted to issue #${target}.\n`);
    process.exit(plan ? 0 : 1);
  }

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

  if (!issue) {
    process.stderr.write("No task issue. Pass --issue <n> or resolve a contract first.\n");
    process.exit(2);
  }
  if (!body || !body.trim()) {
    process.stderr.write(
      "No plan content could be read. Publish it explicitly:\n" +
        `  node scripts/publish-plan.mjs --issue ${issue} --file <plan.md>\n`,
    );
    process.exit(1);
  }

  const result = publish(issue, body);
  process.stdout.write(`${result.updated ? "updated" : "posted"} plan comment on issue #${issue}\n`);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  await main();
}

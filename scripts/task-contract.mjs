/**
 * Resolve the task contract from the issue that defines it.
 *
 * Microsoft Learn puts the contract in the issue: "success criteria should be
 * defined in the issue or pull request... Write acceptance criteria directly in
 * the issue, reference those criteria in the pull request, and use them as the
 * basis for validation."
 *
 * So the repository stores no contract. It stores the issue template that gives
 * the contract its shape, and a seed file used to recreate the issue for a
 * demo. The parsed result is cached in artifacts/ (gitignored) so the
 * repository never becomes the source of truth.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
export const CONTRACT_CACHE = "artifacts/task-contract.json";

/** Used when no contract has been resolved. Deliberately narrow. */
export const DEFAULT_SCOPE = {
  allowed: ["src/**", "tests/**", "migrations/**"],
  prohibited: [],
};

/** Split a GitHub issue-form body into its `### Heading` sections. */
export function splitSections(body) {
  // GitHub returns issue bodies with CRLF. Normalize before anything else so
  // headings do not end up with a trailing carriage return.
  const text = String(body ?? "").replace(/\r\n?/g, "\n");
  const sections = {};
  const pattern = /^###[ \t]+(.+?)[ \t]*$/gm;
  const matches = [...text.matchAll(pattern)];

  matches.forEach((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    sections[match[1].trim().toLowerCase()] = text.slice(start, end).trim();
  });

  return sections;
}

function lines(value) {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => line.length > 0 && line !== "_No response_");
}

function pipeRows(value, arity) {
  return lines(value)
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length >= arity);
}

/**
 * Parse an issue body into a task contract.
 *
 * @param {string} body
 * @param {{number?: number, url?: string, source?: string}} [origin]
 */
export function parseIssueBody(body, origin = {}) {
  const sections = splitSections(body);
  const missing = ["task id", "goal", "allowed scope", "outputs", "success criteria"].filter(
    (name) => !sections[name],
  );
  if (missing.length > 0) {
    throw new Error(
      `Issue body is missing required section(s): ${missing.join(", ")}. It must follow .github/ISSUE_TEMPLATE/agent-task.yml.`,
    );
  }

  const successCriteria = pipeRows(sections["success criteria"], 3).map(
    ([id, statement, provenBy]) => ({ id, statement, provenBy }),
  );
  if (successCriteria.length === 0) {
    throw new Error(
      'No success criteria could be parsed. Each line must read "ID | statement | proving test".',
    );
  }

  return {
    schema: "northstar/task-contract/2",
    id: lines(sections["task id"])[0],
    title: lines(sections.goal)[0],
    source: {
      kind: origin.source ?? "unknown",
      issue: origin.number ?? null,
      url: origin.url ?? null,
      resolvedAt: new Date().toISOString(),
    },
    inputs: {
      goal: sections.goal,
      authoritativeSources: lines(sections["authoritative sources"]),
      scope: {
        allowed: lines(sections["allowed scope"]),
        prohibited: lines(sections["prohibited scope"]),
      },
      constraints: lines(sections.constraints),
    },
    outputs: pipeRows(sections.outputs, 2).map(([id, description]) => ({ id, description })),
    successCriteria,
    stopConditions: lines(sections["stop conditions"]),
  };
}

/** Read the contract from a live GitHub issue. */
export function contractFromIssue(issueNumber) {
  const raw = execFileSync(
    "gh",
    ["issue", "view", String(issueNumber), "--json", "number,title,body,url"],
    { encoding: "utf8" },
  );
  const issue = JSON.parse(raw);
  return parseIssueBody(issue.body, {
    number: issue.number,
    url: issue.url,
    source: `issue #${issue.number}`,
  });
}

/** Read the contract from a seed file, for offline rehearsal. */
export function contractFromFile(path) {
  const absolute = resolve(REPO_ROOT, path);
  return parseIssueBody(readFileSync(absolute, "utf8"), { source: `seed file ${path}` });
}

export function cacheContract(contract, cachePath = CONTRACT_CACHE) {
  const target = resolve(REPO_ROOT, cachePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(contract, null, 2)}\n`, "utf8");
  return target;
}

/** The contract resolved by the last `contract:fetch`, or null. */
export function loadTaskContract(cachePath = CONTRACT_CACHE) {
  const target = resolve(REPO_ROOT, cachePath);
  return existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : null;
}

/** The scope a contract grants, or the repository default when there is none. */
export function taskScope(contract) {
  return contract?.inputs?.scope ?? DEFAULT_SCOPE;
}

/** Turn a scope glob such as "src/**" into a path prefix. */
export function scopePrefixes(scope) {
  const allowed = scope?.allowed?.length ? scope.allowed : DEFAULT_SCOPE.allowed;
  return allowed.map((pattern) => pattern.replace(/\*+$/, "").replace(/\/+$/, "/"));
}

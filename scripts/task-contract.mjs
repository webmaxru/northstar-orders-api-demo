/**
 * Load the contract for the task currently being worked on.
 *
 * Task identity is an input, never a constant. Nothing in this repository's
 * durable context - AGENTS.md, copilot-instructions.md, the agent profiles, the
 * path instructions - names a work item, because those files outlive every work
 * item. The task supplies its own scope, stop conditions, and acceptance
 * criteria through a contract file.
 *
 * Resolution order:
 *   1. an explicit id passed by the caller (`--task WI-1842`)
 *   2. the AGENT_TASK environment variable, set when an agent session starts
 *   3. none - callers fall back to repository-wide defaults
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");

/** Used when no task contract is in scope. Deliberately narrow. */
export const DEFAULT_SCOPE = {
  allowed: ["src/**", "tests/**", "migrations/**"],
  prohibited: [],
};

export function contractPath(taskId) {
  return resolve(REPO_ROOT, "docs", "work-items", `${taskId}.contract.json`);
}

export function resolveTaskId(explicitId) {
  return explicitId ?? process.env.AGENT_TASK ?? null;
}

/**
 * @returns {null | {id: string, scope: {allowed: string[], prohibited: string[]}, acceptanceCriteria: Array<{id: string, statement: string, provenBy: string}>, stopConditions: string[]}}
 */
export function loadTaskContract(explicitId) {
  const taskId = resolveTaskId(explicitId);
  if (!taskId) {
    return null;
  }
  const path = contractPath(taskId);
  if (!existsSync(path)) {
    throw new Error(
      `No contract for task "${taskId}". Expected ${path.replace(`${REPO_ROOT}\\`, "").replace(`${REPO_ROOT}/`, "")}.`,
    );
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Turn a scope glob such as "src/**" into a path prefix. */
export function scopePrefixes(scope) {
  return (scope?.allowed ?? DEFAULT_SCOPE.allowed).map((pattern) =>
    pattern.replace(/\*+$/, "").replace(/\/+$/, "/"),
  );
}

/**
 * Pre-tool-use authorization for agent tool calls.
 *
 * This turns the capability boundary written in AGENTS.md into a decision that
 * runs before a tool executes. The model may be persuaded by hostile text in a
 * README, an issue comment, or a dependency changelog. This check does not read
 * that text and does not care whether the model was persuaded: it only inspects
 * the tool call that was actually requested.
 *
 * Contract:
 *   stdin  -> {"toolName": "...", "toolArgs": { ... }}
 *   stdout -> {"permissionDecision": "allow" | "deny", "permissionDecisionReason": "..."}
 */

import { pathToFileURL } from "node:url";
import { Buffer } from "node:buffer";
import { DEFAULT_SCOPE, loadTaskContract, scopePrefixes } from "./task-contract.mjs";

/**
 * Repository-wide fallback, used when no task contract is in scope. A task
 * contract narrows this; nothing widens it.
 */
export const WRITABLE_PATH_PREFIXES = scopePrefixes(DEFAULT_SCOPE);

const ALLOWED_COMMANDS = [
  /^npm run lint$/,
  /^npm run typecheck$/,
  /^npm run test:unit$/,
  /^npm run test:acceptance$/,
  /^npm run validate$/,
  /^npm ci$/,
  /^git (status|diff|log)\b/,
];

const DENIED_COMMAND_PATTERNS = [
  { pattern: /\bgit\s+push\b/, reason: "publishing requires human approval" },
  { pattern: /\bgh\s+(pr\s+merge|release)\b/, reason: "merging and releasing require human approval" },
  { pattern: /\bnpm\s+(i|install|add)\s+\S/, reason: "adding a dependency is outside the capability boundary" },
  { pattern: /\b(printenv|env)\b/, reason: "environment enumeration is not needed for this task" },
  { pattern: /\$\{?[A-Z_]*(TOKEN|SECRET|PASSWORD|KEY)\b/, reason: "secret material must not flow through a tool call" },
  { pattern: /\b(curl|wget|nc|Invoke-WebRequest|Invoke-RestMethod)\b/, reason: "outbound network calls are not in the allowlist" },
  { pattern: /\bDROP\s+(TABLE|COLUMN|DATABASE)\b/i, reason: "destructive schema change requires human approval" },
  { pattern: /\brm\s+-rf\b/, reason: "recursive delete is outside the capability boundary" },
];

function normalize(filePath) {
  return String(filePath).replace(/\\/g, "/").replace(/^\.\//, "");
}

function isWritable(filePath, prefixes) {
  const normalized = normalize(filePath);
  if (normalized.includes("..")) {
    return false;
  }
  return prefixes.some((prefix) => normalized.startsWith(prefix));
}

function allow(reason) {
  return { permissionDecision: "allow", permissionDecisionReason: reason };
}

function deny(reason) {
  return { permissionDecision: "deny", permissionDecisionReason: reason };
}

/**
 * @param {{toolName?: string, toolArgs?: Record<string, unknown>}} call
 * @param {{scope?: {allowed: string[]}, taskId?: string}} [context]
 *   Scope comes from the active task contract. Omit it and the repository-wide
 *   default applies.
 */
export function evaluateToolCall(call, context = {}) {
  const toolName = call?.toolName ?? "";
  const args = call?.toolArgs ?? {};
  const prefixes = scopePrefixes(context.scope ?? DEFAULT_SCOPE);
  const where = context.taskId ? `the ${context.taskId} scope` : "the approved scope";

  if (toolName === "read" || toolName === "search") {
    return allow("read-only tool");
  }

  if (toolName === "edit" || toolName === "write") {
    const target = args.path ?? args.file ?? "";
    if (!target) {
      return deny("write tool call did not name a target path");
    }
    if (!isWritable(target, prefixes)) {
      return deny(`${normalize(target)} is outside ${where} (${prefixes.join(", ")})`);
    }
    return allow(`${normalize(target)} is inside ${where}`);
  }

  if (toolName === "bash" || toolName === "shell") {
    const command = String(args.command ?? "").trim();
    if (!command) {
      return deny("shell tool call did not include a command");
    }
    for (const { pattern, reason } of DENIED_COMMAND_PATTERNS) {
      if (pattern.test(command)) {
        return deny(reason);
      }
    }
    if (ALLOWED_COMMANDS.some((pattern) => pattern.test(command))) {
      return allow("command is in the validation allowlist");
    }
    return deny("command is not in the validation allowlist");
  }

  return deny(`unknown tool "${toolName}" is denied by default`);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const raw = (await readStdin()).trim();
  let decision;
  try {
    const taskIndex = process.argv.indexOf("--task");
    const contract = loadTaskContract(taskIndex === -1 ? undefined : process.argv[taskIndex + 1]);
    decision = evaluateToolCall(raw ? JSON.parse(raw) : {}, {
      scope: contract?.scope,
      taskId: contract?.id,
    });
  } catch (error) {
    decision = deny(
      error instanceof SyntaxError
        ? "tool call payload was not valid JSON"
        : /** @type {Error} */ (error).message,
    );
  }
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  await main();
}

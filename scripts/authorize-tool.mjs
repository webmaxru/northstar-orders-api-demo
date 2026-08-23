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
import { DEFAULT_SCOPE, loadTaskContract, scopePrefixes, taskScope } from "./task-contract.mjs";

/**
 * Repository-wide fallback, used when no task contract is in scope. A task
 * contract narrows this; nothing widens it.
 */
export const WRITABLE_PATH_PREFIXES = scopePrefixes(DEFAULT_SCOPE);

const ALLOWED_COMMANDS = [
  // Resolving the contract must be allowed, or the agent cannot bootstrap the
  // very boundary that governs it. It only reads an issue and writes into
  // artifacts/, so it grants no authority over the working tree.
  /^npm run contract:fetch\b/,
  /^npm run lint$/,
  /^npm run typecheck$/,
  /^npm run test:unit$/,
  /^npm run test:acceptance$/,
  /^npm run validate$/,
  /^npm run evidence\b/,
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
 * Normalize a tool call across harnesses.
 *
 * The two hosts disagree on field names and tool names:
 *   GitHub cloud agent / Copilot CLI -> { toolName: "edit", toolArgs: { path } }
 *   VS Code                          -> { tool_name: "editFiles", tool_input: { files: [...] } }
 *
 * Tool names are host-specific and can change. Anything unrecognized falls
 * through to a default deny, which is the correct direction for a boundary.
 * Confirm real names from the VS Code agent debug log before relying on them.
 */
const TOOL_ALIASES = {
  read: "read",
  search: "search",
  codebase: "search",
  fetch: "read",
  edit: "edit",
  write: "edit",
  editfiles: "edit",
  createfile: "edit",
  applypatch: "edit",
  bash: "shell",
  shell: "shell",
  runcommands: "shell",
  runinterminal: "shell",
  runtasks: "shell",
};

export function normalizeToolCall(call) {
  const rawName = String(call?.toolName ?? call?.tool_name ?? "");
  const args = call?.toolArgs ?? call?.tool_input ?? {};
  const kind = TOOL_ALIASES[rawName.toLowerCase()] ?? rawName;

  const paths = [];
  if (typeof args.path === "string") paths.push(args.path);
  if (typeof args.file === "string") paths.push(args.file);
  if (typeof args.filePath === "string") paths.push(args.filePath);
  if (Array.isArray(args.files)) {
    for (const entry of args.files) {
      if (typeof entry === "string") paths.push(entry);
      else if (entry && typeof entry.path === "string") paths.push(entry.path);
    }
  }

  return {
    rawName,
    kind,
    paths,
    command: String(args.command ?? args.commandLine ?? "").trim(),
  };
}

/**
 * @param {{toolName?: string, tool_name?: string, toolArgs?: Record<string, unknown>, tool_input?: Record<string, unknown>}} call
 * @param {{scope?: {allowed: string[]}, taskId?: string}} [context]
 *   Scope comes from the active task contract. Omit it and the repository-wide
 *   default applies.
 */
export function evaluateToolCall(call, context = {}) {
  const { rawName, kind, paths, command } = normalizeToolCall(call);
  const prefixes = scopePrefixes(context.scope ?? DEFAULT_SCOPE);
  const where = context.taskId ? `the ${context.taskId} scope` : "the approved scope";

  if (kind === "read" || kind === "search") {
    return allow("read-only tool");
  }

  if (kind === "edit") {
    if (paths.length === 0) {
      return deny("write tool call did not name a target path");
    }
    const blocked = paths.filter((target) => !isWritable(target, prefixes));
    if (blocked.length > 0) {
      return deny(
        `${blocked.map(normalize).join(", ")} is outside ${where} (${prefixes.join(", ")})`,
      );
    }
    return allow(`${paths.map(normalize).join(", ")} is inside ${where}`);
  }

  if (kind === "shell") {
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

  return deny(`unknown tool "${rawName}" is denied by default`);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Extract the tool call from whatever the shell delivered.
 *
 * Shells add noise. A bash line continuation (`\`) pasted into PowerShell
 * arrives as an extra argument, so stdin ends up holding the JSON object
 * followed by a stray `\` line. Rather than failing with an unreviewable
 * "not valid JSON", find the first balanced object and report precisely what
 * could not be parsed when there isn't one.
 *
 * @param {string} raw
 * @returns {{ok: true, value: unknown} | {ok: false, reason: string}}
 */
export function parsePayload(raw) {
  const text = String(raw ?? "").trim();
  if (!text) {
    return { ok: false, reason: "no tool call was provided on stdin" };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    // fall through to balanced-object extraction
  }

  const start = text.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i += 1) {
      const character = text[i];
      if (escaped) {
        escaped = false;
      } else if (character === "\\" && inString) {
        escaped = true;
      } else if (character === '"') {
        inString = !inString;
      } else if (!inString && character === "{") {
        depth += 1;
      } else if (!inString && character === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            return { ok: true, value: JSON.parse(text.slice(start, i + 1)) };
          } catch {
            break;
          }
        }
      }
    }
  }

  const preview = text.length > 120 ? `${text.slice(0, 120)}...` : text;
  return {
    ok: false,
    reason: `tool call payload was not valid JSON. Received: ${JSON.stringify(preview)}. If you pasted a multi-line command, note that a trailing "\\" is a bash line continuation and is not one in PowerShell.`,
  };
}

/**
 * Emit a decision both hosts understand.
 *
 * Copilot cloud agent and CLI read the flat fields. VS Code reads
 * `hookSpecificOutput`. Writing both keeps one script for both harnesses;
 * each host ignores the shape it does not know.
 */
export function renderDecision(decision) {
  return {
    ...decision,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision.permissionDecision,
      permissionDecisionReason: decision.permissionDecisionReason,
    },
  };
}

async function main() {
  const parsed = parsePayload(await readStdin());
  let decision;
  if (!parsed.ok) {
    decision = deny(parsed.reason);
  } else {
    try {
      const contract = loadTaskContract();
      decision = evaluateToolCall(parsed.value, {
        scope: taskScope(contract),
        taskId: contract?.id,
      });
    } catch (error) {
      decision = deny(/** @type {Error} */ (error).message);
    }
  }
  process.stdout.write(`${JSON.stringify(renderDecision(decision), null, 2)}\n`);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  await main();
}

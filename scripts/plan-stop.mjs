/**
 * Persist the plan when the plan agent stops.
 *
 * The plan agent is read-only by design, so it cannot write its own plan
 * anywhere. That is the right capability boundary and the wrong outcome: the
 * plan then exists only in a chat thread, which is not "an inspectable plan"
 * and not an artifact anyone else can review, resume, or hand to an
 * implementer.
 *
 * The hook resolves that. It runs outside the agent's tool boundary - the
 * system persists the artifact, the agent still cannot write - and posts the
 * plan as a comment on the task issue, where Learn says planning belongs.
 *
 * If the transcript cannot be read, it says so and gives the exact command,
 * rather than reporting success and persisting nothing.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { Buffer } from "node:buffer";
import { extractPlan, publish } from "./publish-plan.mjs";
import { loadTaskContract } from "./task-contract.mjs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function emit(systemMessage) {
  process.stdout.write(`${JSON.stringify({ systemMessage }, null, 2)}\n`);
}

async function main() {
  const raw = (await readStdin()).trim();
  let input;
  try {
    input = raw ? JSON.parse(raw) : {};
  } catch {
    input = {};
  }

  if (input.stop_hook_active) {
    return;
  }

  const contract = loadTaskContract();
  const issue = contract?.source?.issue;
  if (!issue) {
    emit(
      "Plan not persisted: no task issue is active, so there is nowhere durable to put it. " +
        "Resolve a contract, then run node scripts/publish-plan.mjs --issue <n> --file <plan.md>.",
    );
    return;
  }

  let body = null;
  if (input.transcript_path) {
    try {
      body = extractPlan(readFileSync(input.transcript_path, "utf8"));
    } catch {
      body = null;
    }
  }

  if (!body) {
    emit(
      `Plan not persisted: the session transcript could not be read, so nothing was written to issue #${issue}. ` +
        "The plan currently exists only in this chat. Save it and run: " +
        `node scripts/publish-plan.mjs --issue ${issue} --file <plan.md>`,
    );
    return;
  }

  try {
    const result = publish(issue, body);
    emit(
      `Plan ${result.updated ? "updated on" : "posted to"} issue #${issue}. ` +
        "It is now a durable artifact: approve it there, and start implementation in a fresh " +
        "session so planning context is not carried into it.",
    );
  } catch (error) {
    emit(
      `Plan not persisted: ${/** @type {Error} */ (error).message.split("\n")[0]}. ` +
        `Run node scripts/publish-plan.mjs --issue ${issue} --file <plan.md>`,
    );
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  await main();
}

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { clearTaskState } from "./resolve-task.mjs";
import { releaseTaskWorkspace, resolveSessionId } from "./workspace-owner.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

function valueOf(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const issueText = valueOf("--issue");
  const issue = Number(issueText);
  const sessionId = resolveSessionId({ explicit: valueOf("--session-id") });
  const clearUnowned = process.argv.includes("--clear-unowned");
  if (!/^[1-9]\d*$/.test(issueText ?? "") || !Number.isSafeInteger(issue) ||
    typeof sessionId !== "string" || !sessionId.trim()) {
    process.stderr.write("Pass --issue <number> and --session-id <current-session> to release the owned workspace.\n");
    process.exitCode = 2;
    return;
  }
  try {
    const owner = await releaseTaskWorkspace(
      { root: REPO_ROOT, issue, sessionId, allowUnownedState: clearUnowned },
      { clearTaskState },
    );
    process.stdout.write(
      clearUnowned
        ? `cleared explicitly authorized orphaned task authority for issue #${owner.issue}\n`
        : `released owned task workspace for issue #${owner.issue} (${owner.taskId})\n`,
    );
  } catch (error) {
    process.stderr.write(`${/** @type {Error} */ (error).message}\n`);
    process.exitCode = 1;
  }
}

const invokedDirectly = process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) await main();

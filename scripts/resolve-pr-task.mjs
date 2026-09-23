import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { cacheContract } from "./task-contract.mjs";
import { clearTaskState, resolveTask } from "./resolve-task.mjs";

function gh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function valueOf(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

export function linkedIssue(body) {
  const matches = [...String(body ?? "").matchAll(/\b(?:closes|fixes|resolves)\s+#(\d+)\b/gi)];
  const issues = [...new Set(matches.map((match) => Number(match[1])))];
  if (issues.length > 1) throw new Error("Multiple task issues are linked; select one explicit task.");
  return issues[0] ?? null;
}

function main() {
  const pr = valueOf("--pr");
  if (!pr) {
    process.stderr.write("Pass --pr <number>.\n");
    process.exit(2);
  }
  try {
  const pull = JSON.parse(gh(["pr", "view", pr, "--json", "body"]));
  const issue = linkedIssue(pull.body);
  if (!issue) {
    throw new Error(
      "No task issue linked. Add `Closes #<number>` to the pull request body.",
    );
  }
  const contract = resolveTask(issue).contract;
  const target = cacheContract(contract);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `issue=${issue}\ntask=${contract.id}\n`,
      "utf8",
    );
  }
  process.stdout.write(
    `issue=${issue} task=${contract.id} digest=${contract.source.bodyDigest}\n${target}\n`,
  );
  } catch (error) {
    clearTaskState();
    process.stderr.write(`${/** @type {Error} */ (error).message}\n`);
    process.exit(1);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main();
}

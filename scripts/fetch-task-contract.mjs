/**
 * Resolve the task contract from its issue and cache it for the gates.
 *
 * Usage:
 *   node scripts/fetch-task-contract.mjs --issue 12
 *   node scripts/fetch-task-contract.mjs --file docs/work-items/WI-1842.issue.md
 *
 * The issue is the contract. The seed file exists so a demo can be rehearsed
 * offline and so CI can resolve a contract without a live issue; the resolved
 * contract records which of the two it came from.
 */

import { cacheContract, contractFromFile, contractFromIssue } from "./task-contract.mjs";

function valueOf(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

const issue = valueOf("--issue");
const file = valueOf("--file");

if (!issue && !file) {
  process.stderr.write(
    "Pass --issue <number> to read the live issue, or --file <path> to use a seed file.\n",
  );
  process.exit(2);
}

let contract;
try {
  contract = issue ? contractFromIssue(issue) : contractFromFile(file);
} catch (error) {
  process.stderr.write(`${/** @type {Error} */ (error).message}\n`);
  process.exit(1);
}

const target = cacheContract(contract);

process.stdout.write(
  [
    `task=${contract.id}`,
    `source=${contract.source.kind}`,
    `scope=${contract.inputs.scope.allowed.join(" ")}`,
    `criteria=${contract.successCriteria.length}`,
  ].join("  ") + `\n${target}\n`,
);

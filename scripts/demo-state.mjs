import { execFileSync } from "node:child_process";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const branch = git("branch", "--show-current");
const status = git("status", "--porcelain");
const head = git("rev-parse", "HEAD");
let baseline = "not-created";

try {
  baseline = git("rev-parse", "demo-baseline");
} catch {
  // The tag is created after the baseline commit.
}

console.log(JSON.stringify({
  branch,
  clean: status.length === 0,
  head,
  baseline,
  atBaseline: baseline !== "not-created" && head === baseline,
}, null, 2));


import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const refs = {
  demo1: "main",
  demo2: "demo/context-enabled",
  naive: "demo/naive-reference",
  governed: "demo/governed-reference",
};

const name = process.argv[2];
if (!name || !(name in refs)) {
  console.error(`Usage: npm run demo:worktree -- ${Object.keys(refs).join("|")}`);
  process.exit(2);
}

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

const root = git(["rev-parse", "--show-toplevel"]);
const parent = join(dirname(root), `${basename(root)}-worktrees`);
const target = resolve(parent, name);

mkdirSync(parent, { recursive: true });

if (existsSync(target)) {
  const status = git(["status", "--porcelain"], target);
  if (status) {
    console.error(`Refusing to remove dirty demo worktree: ${target}`);
    process.exit(1);
  }
  git(["worktree", "remove", "--force", target], root);
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
}

git(["worktree", "add", "--detach", target, refs[name]], root);
console.log(`${name} -> ${refs[name]}`);
console.log(target);


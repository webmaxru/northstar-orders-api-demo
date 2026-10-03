import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  bindWorkspaceOwner,
  claimWorkspaceOwner,
  readWorkspaceOwner,
  releaseTaskWorkspace,
  releaseWorkspaceClaim,
  resolveSessionId,
  WORKSPACE_OWNER_PATH,
  workspaceOwnerIdentity,
} from "../../scripts/workspace-owner.mjs";
import { clearTaskState } from "../../scripts/resolve-task.mjs";

const temporary: string[] = [];
const worker = resolve(import.meta.dirname, "../fixtures/task-resolver-worker.mjs");
const fixtureEnv = { GITHUB_REPOSITORY: "fixture/northstar" };

describe("host session identity resolution", () => {
  it("prefers an explicit event or CLI identity and falls back to Copilot host environment", () => {
    expect(resolveSessionId({
      explicit: "cli-session",
      payload: { session_id: "event-session" },
      env: { COPILOT_SESSION_ID: "environment-session" },
    })).toBe("cli-session");
    expect(resolveSessionId({
      payload: { session_id: "event-session" },
      env: { COPILOT_SESSION_ID: "environment-session" },
    })).toBe("event-session");
    expect(resolveSessionId({
      payload: {},
      env: { COPILOT_SESSION_ID: "environment-session" },
    })).toBe("environment-session");
    expect(resolveSessionId({
      payload: {},
      env: { COPILOT_SESSION_UUID: "uuid-session" },
    })).toBe("uuid-session");
    expect(resolveSessionId({
      payload: {},
      env: { COPILOT_AGENT_SESSION_ID: "agent-session" },
    })).toBe("agent-session");
    expect(resolveSessionId({ payload: {}, env: {} })).toBeNull();
  });

  it("rejects malformed host session identities", () => {
    expect(() => resolveSessionId({
      payload: { session_id: 42 },
      env: {},
    })).toThrow(/missing or malformed/);
    expect(() => resolveSessionId({
      payload: { session_id: " " },
      env: {},
    })).toThrow(/missing or malformed/);
  });

  it("uses a repository-run-attempt identity when Actions provides no Copilot session ID", () => {
    const root = tempRoot();
    const env = {
      GITHUB_ACTIONS: "true",
      GITHUB_REPOSITORY: "fixture/northstar",
      GITHUB_RUN_ID: "101",
      GITHUB_RUN_ATTEMPT: "2",
    };
    const sessionId = resolveSessionId({ payload: {}, env });
    expect(sessionId).toBe("github-actions:fixture/northstar:101:2");

    const input = {
      root,
      issue: 41,
      taskId: "AES-PARALLEL-ISOLATION",
      contractDigest: "a".repeat(64),
      env,
    };
    expect(workspaceOwnerIdentity({ ...input, sessionId }).ownerKey)
      .toBe(workspaceOwnerIdentity(input).ownerKey);
    expect(resolveSessionId({
      payload: {},
      env: { ...env, GITHUB_RUN_ATTEMPT: "3" },
    })).not.toBe(sessionId);
  });
});

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), "northstar-workspace-owner-"));
  temporary.push(root);
  return root;
}

function git(root: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trim();
}

function createRepository(root: string) {
  const repository = join(root, "repository");
  mkdirSync(repository, { recursive: true });
  git(repository, ["init", "--quiet", "-b", "main"]);
  writeFileSync(join(repository, ".gitignore"), "artifacts/\n");
  writeFileSync(join(repository, "README.md"), "resolver fixture\n");
  git(repository, ["add", ".gitignore", "README.md"]);
  git(repository, [
    "-c", "user.name=Fixture",
    "-c", "user.email=fixture@example.invalid",
    "-c", "commit.gpgsign=false",
    "commit", "--quiet", "-m", "Workspace owner fixture",
  ]);
  return repository;
}

function addWorktree(repository: string, root: string, name: string) {
  const path = join(root, name);
  git(repository, ["worktree", "add", "--detach", path, "HEAD"]);
  return path;
}

function runResolver({
  root,
  issue,
  taskId,
  sessionId,
}: {
  root: string;
  issue: number;
  taskId: string;
  sessionId: string;
}) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveResult, reject) => {
    const child = spawn(process.execPath, [worker], {
      cwd: root,
      env: {
        ...process.env,
        ...fixtureEnv,
        TASK_WORKTREE_ROOT: root,
        TASK_ISSUE: String(issue),
        TASK_ID: taskId,
        TEST_SESSION_ID: sessionId,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolveResult({ code, stdout, stderr }));
  });
}

function exitedProcessId() {
  return new Promise<number>((resolveResult, reject) => {
    const child = spawn(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore" });
    const pid = child.pid;
    if (pid === undefined) {
      reject(new Error("The test child did not receive a process ID."));
      return;
    }
    child.once("error", reject);
    child.once("close", () => resolveResult(pid));
  });
}

function artifact(root: string, name: string) {
  return join(root, "artifacts", name);
}

afterEach(() => {
  for (const root of temporary.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("task workspace ownership", () => {
  it("fails closed when the repository identity is unavailable", () => {
    const root = tempRoot();
    expect(() => workspaceOwnerIdentity({
      root,
      issue: 30,
      sessionId: "session-without-repository",
      env: {},
    })).toThrow(/GITHUB_REPOSITORY or a Git origin remote/);
    expect(readWorkspaceOwner(root)).toBeNull();
  });

  it("rejects a conflicting owner before changing existing authority artifacts", () => {
    const root = tempRoot();
    const owner = claimWorkspaceOwner({
      root,
      issue: 31,
      taskId: "fixture-one",
      contractDigest: "a".repeat(64),
      sessionId: "session-one",
      env: fixtureEnv,
    });
    bindWorkspaceOwner(owner, {
      id: "fixture-one",
      source: { bodyDigest: "a".repeat(64) },
    });
    mkdirSync(join(root, "artifacts"), { recursive: true });
    writeFileSync(artifact(root, "task-contract.json"), '{"owner":"one"}');
    releaseWorkspaceClaim(owner);
    const contractBefore = readFileSync(artifact(root, "task-contract.json"));

    expect(() => claimWorkspaceOwner({
      root,
      issue: 32,
      taskId: "fixture-two",
      contractDigest: "b".repeat(64),
      sessionId: "session-two",
      env: fixtureEnv,
    })).toThrow(/already owned/);
    expect(readFileSync(artifact(root, "task-contract.json"))).toEqual(contractBefore);
    expect(readWorkspaceOwner(root)).toMatchObject({
      issue: 31,
      taskId: "fixture-one",
      contractDigest: "a".repeat(64),
    });
  });

  it("releases task state only for the exact owning session", async () => {
    const root = tempRoot();
    const owner = claimWorkspaceOwner({
      root,
      issue: 35,
      taskId: "fixture-release",
      contractDigest: "a".repeat(64),
      sessionId: "owner-session",
      env: fixtureEnv,
    });
    bindWorkspaceOwner(owner, {
      id: "fixture-release",
      source: { bodyDigest: "a".repeat(64) },
    });
    mkdirSync(join(root, "artifacts"), { recursive: true });
    writeFileSync(artifact(root, "task-contract.json"), '{"task":"fixture-release"}');
    releaseWorkspaceClaim(owner);

    await expect(releaseTaskWorkspace({
      root, issue: 35, sessionId: "other-session", env: fixtureEnv,
    }, { clearTaskState })).rejects.toThrow(/already owned/);
    expect(existsSync(artifact(root, "task-contract.json"))).toBe(true);

    await releaseTaskWorkspace({
      root, issue: 35, sessionId: "owner-session", env: fixtureEnv,
    }, { clearTaskState });
    expect(existsSync(join(root, WORKSPACE_OWNER_PATH))).toBe(false);
    expect(existsSync(artifact(root, "task-contract.json"))).toBe(false);
  });

  it("recovers an exited same-host resolver lock only for its owner", async () => {
    const root = tempRoot();
    const input = {
      root, issue: 36, taskId: "fixture-stale", sessionId: "owner-session", env: fixtureEnv,
    };
    const owner = claimWorkspaceOwner(input);
    releaseWorkspaceClaim(owner);
    const lockPath = artifact(root, ".task-workspace-resolution.lock");
    writeFileSync(lockPath, `${JSON.stringify({
      schema: "northstar/task-workspace-owner/1",
      ownerKey: owner.identity.ownerKey,
      pid: await exitedProcessId(),
      hostname: hostname(),
      startedAt: new Date().toISOString(),
      token: "stale-owner-token",
    })}\n`);

    const recovered = claimWorkspaceOwner(input);
    expect(recovered.identity.ownerKey).toBe(owner.identity.ownerKey);
    expect(readWorkspaceOwner(root)).toMatchObject({ issue: 36, taskId: "fixture-stale" });
    releaseWorkspaceClaim(recovered);
  });

  it("does not remove another session's stale resolver lock", async () => {
    const root = tempRoot();
    const owner = claimWorkspaceOwner({
      root, issue: 37, taskId: "fixture-foreign-lock", sessionId: "owner-session",
      env: fixtureEnv,
    });
    releaseWorkspaceClaim(owner);
    const lockPath = artifact(root, ".task-workspace-resolution.lock");
    const staleLock = {
      schema: "northstar/task-workspace-owner/1",
      ownerKey: owner.identity.ownerKey,
      pid: await exitedProcessId(),
      hostname: hostname(),
      startedAt: new Date().toISOString(),
      token: "foreign-stale-token",
    };
    writeFileSync(lockPath, `${JSON.stringify(staleLock)}\n`);

    expect(() => claimWorkspaceOwner({
      root, issue: 37, taskId: "fixture-foreign-lock", sessionId: "other-session",
      env: fixtureEnv,
    })).toThrow(/different workspace owner/);
    expect(JSON.parse(readFileSync(lockPath, "utf8"))).toEqual(staleLock);
    expect(readWorkspaceOwner(root)).toMatchObject({
      issue: 37,
      taskId: "fixture-foreign-lock",
      ownerKey: owner.identity.ownerKey,
    });
  });

  it("isolates simultaneous task state across Git worktrees", async () => {
    const root = tempRoot();
    const repository = createRepository(root);
    const firstRoot = addWorktree(repository, root, "task-one");
    const secondRoot = addWorktree(repository, root, "task-two");
    const results = await Promise.all([
      runResolver({ root: firstRoot, issue: 31, taskId: "fixture-one", sessionId: "session-one" }),
      runResolver({ root: secondRoot, issue: 32, taskId: "fixture-two", sessionId: "session-two" }),
    ]);

    expect(results.map(({ code }) => code)).toEqual([0, 0]);
    expect(JSON.parse(readFileSync(artifact(firstRoot, "task-contract.json"), "utf8")).id)
      .toBe("fixture-one");
    expect(JSON.parse(readFileSync(artifact(firstRoot, "task-session.json"), "utf8")))
      .toMatchObject({ taskId: "fixture-one", sessionId: "session-one", issue: 31 });
    expect(JSON.parse(readFileSync(artifact(secondRoot, "task-contract.json"), "utf8")).id)
      .toBe("fixture-two");
    expect(JSON.parse(readFileSync(artifact(secondRoot, "task-session.json"), "utf8")))
      .toMatchObject({ taskId: "fixture-two", sessionId: "session-two", issue: 32 });
    expect(JSON.parse(readFileSync(join(firstRoot, WORKSPACE_OWNER_PATH), "utf8")).taskId)
      .toBe("fixture-one");
    expect(JSON.parse(readFileSync(join(secondRoot, WORKSPACE_OWNER_PATH), "utf8")).taskId)
      .toBe("fixture-two");
  }, 60_000);

  it("rejects a conflicting workspace owner without mutating its artifacts", async () => {
    const root = tempRoot();
    const repository = createRepository(root);
    const worktree = addWorktree(repository, root, "shared-task");
    const attempts = await Promise.all([
      runResolver({ root: worktree, issue: 41, taskId: "fixture-one", sessionId: "session-one" }),
      runResolver({ root: worktree, issue: 42, taskId: "fixture-two", sessionId: "session-two" }),
    ]);
    expect(attempts.filter(({ code }) => code === 0)).toHaveLength(1);
    expect(attempts.filter(({ code }) => code !== 0)).toHaveLength(1);

    const contractBefore = readFileSync(artifact(worktree, "task-contract.json"));
    const sessionBefore = readFileSync(artifact(worktree, "task-session.json"));
    const winningSession = JSON.parse(sessionBefore.toString("utf8")).sessionId;
    const loser = winningSession === "session-one"
      ? { issue: 42, taskId: "fixture-two", sessionId: "session-two" }
      : { issue: 41, taskId: "fixture-one", sessionId: "session-one" };
    const rejected = await runResolver({ root: worktree, ...loser });

    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toMatch(/already owned|another resolver/);
    expect(readFileSync(artifact(worktree, "task-contract.json"))).toEqual(contractBefore);
    expect(readFileSync(artifact(worktree, "task-session.json"))).toEqual(sessionBefore);
    expect(existsSync(artifact(worktree, "approved-plan.json"))).toBe(false);
  }, 60_000);
});

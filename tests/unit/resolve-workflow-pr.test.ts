import { describe, expect, it } from "vitest";
import { selectWorkflowPullRequest } from "../../scripts/resolve-workflow-pr.mjs";

const repository = "webmaxru/northstar-orders-api-demo";
const sha = "a".repeat(40);
const baseSha = "b".repeat(40);

function pull(overrides: Record<string, unknown> = {}) {
  return {
    number: 7,
    state: "open",
    head: { sha, repo: { full_name: repository } },
    base: { ref: "main", sha: baseSha, repo: { full_name: repository } },
    ...overrides,
  };
}

describe("workflow-run pull request identity", () => {
  it("selects exactly the same-repository PR for the immutable head SHA", () => {
    expect(
      selectWorkflowPullRequest({
        pulls: [pull()],
        sha,
        repository,
        defaultBranch: "main",
      }),
    ).toMatchObject({ number: 7 });
  });

  it("accepts a stacked base when the run declares that exact base", () => {
    expect(
      selectWorkflowPullRequest({
        pulls: [
          pull({
            base: {
              ref: "agent/implement/parent-task",
              sha: baseSha,
              repo: { full_name: repository },
            },
          }),
        ],
        sha,
        repository,
        expectedNumber: 7,
        expectedBaseSha: baseSha,
        expectedBaseRef: "agent/implement/parent-task",
      }),
    ).toMatchObject({ number: 7 });
  });

  it("rejects a fork, another SHA, a mismatched declared base, or ambiguity", () => {
    for (const candidate of [
      pull({ head: { sha, repo: { full_name: "attacker/fork" } } }),
      pull({ head: { sha: "b".repeat(40), repo: { full_name: repository } } }),
      pull({
        base: {
          ref: "release",
          sha: "c".repeat(40),
          repo: { full_name: repository },
        },
      }),
    ]) {
      expect(() =>
        selectWorkflowPullRequest({
          pulls: [candidate],
          sha,
          repository,
          expectedBaseSha: baseSha,
          expectedBaseRef: "main",
        }),
      ).toThrow(/exactly one/);
    }
    expect(() =>
      selectWorkflowPullRequest({
        pulls: [pull(), pull({ number: 8 })],
        sha,
        repository,
        defaultBranch: "main",
      }),
    ).toThrow(/found 2/);
  });

  it("accepts only an explicitly allowed merged PR with exact commit and repository identity", () => {
    const merged = pull({
      state: "closed",
      merged: true,
      merged_at: "2026-09-01T10:00:00Z",
      merge_commit_sha: "c".repeat(40),
    });
    expect(() => selectWorkflowPullRequest({
      pulls: [merged],
      sha,
      repository,
      defaultBranch: "main",
    })).toThrow(/exactly one/);
    expect(selectWorkflowPullRequest({
      pulls: [merged],
      sha,
      repository,
      defaultBranch: "main",
      allowMerged: true,
    })).toMatchObject({ number: 7, merged: true });
    for (const invalid of [
      pull({ state: "closed", merged: false }),
      pull({ state: "closed", merged: true, merge_commit_sha: "invalid" }),
      pull({
        state: "closed",
        merged: true,
        merged_at: "2026-09-01T10:00:00Z",
        merge_commit_sha: "c".repeat(40),
        base: { ref: "main", repo: { full_name: "another/repository" } },
      }),
    ]) {
      expect(() => selectWorkflowPullRequest({
        pulls: [invalid],
        sha,
        repository,
        defaultBranch: "main",
        allowMerged: true,
      })).toThrow(/exactly one/);
    }
  });

  it("rejects malformed run and PR identities", () => {
    expect(() =>
      selectWorkflowPullRequest({
        pulls: [pull()],
        sha: "not-a-sha",
        repository,
      }),
    ).toThrow(/immutable commit SHA/);
    expect(() =>
      selectWorkflowPullRequest({
        pulls: [pull()],
        sha,
        repository,
        expectedNumber: "0",
      }),
    ).toThrow(/positive integer/);
  });
});

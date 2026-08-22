# Demo validation report

- Validated: 2026-08-23
- Repository: <https://github.com/webmaxru/northstar-orders-api-demo>
- Scenario: synthetic WI-1842
- Runtime: Node.js 22, Fastify 5, PostgreSQL 17

## Branch matrix

| Ref | Unit/type/lint | Acceptance | Expected interpretation |
| --- | --- | --- | --- |
| `main` | Pass: 4 tests | No acceptance tests | Clean initial state |
| `demo/context-enabled` | Pass: 4 tests | Expected red: 6 failures | Executable contract before implementation |
| `demo/naive-reference` | Pass: 4 tests | Expected red: 4 failures | Same-process success hides cross-instance defects |
| `demo/governed-reference` | Pass: 4 tests | Pass: 8 tests | Durable, cross-instance implementation |

The governed suite validates:

- same-instance replay,
- cross-instance replay,
- payload conflict,
- 12 concurrent cross-instance retries,
- no-key behavior,
- replay/conflict metrics,
- two HTTP app instances,
- hashed persistence without raw key storage.

## HTTP smoke result

Against the governed reference:

| Request | Result |
| --- | --- |
| First request | `201`, replay `false` |
| Same key and payload | `200`, replay `true`, same order ID |
| Same key and different payload | `409` |

## GitHub pull-request validation

Temporary draft PR: <https://github.com/webmaxru/northstar-orders-api-demo/pull/2>

All checks passed:

- CI quality,
- PostgreSQL acceptance,
- dependency audit,
- CodeQL analysis with SARIF artifact.

The PR was closed without merging, and its temporary validation branch was deleted.

The repository is private under a personal account. GitHub reports that server-enforced branch protection and the private-repository code-scanning UI require GitHub Pro or public visibility. The repository remains private. The workflows still run dependency audit and CodeQL analysis, preserve SARIF as an artifact, and expose their results on the pull request.

## Copilot CLI usage experiment

Both runs used Auto, modified zero files, and produced a correct explanation. One observation is not a benchmark.

| Run | Model calls | Input tokens | Output tokens | API duration | nano-AIU |
| --- | ---: | ---: | ---: | ---: | ---: |
| Broad repository prompt | 4 | 105,088 | 2,243 | 23,885 ms | 1,183,379,400 |
| Bounded two-file prompt | 2 | 34,462 | 527 | 7,337 ms | 494,253,000 |

The result validates the demo method: measure the actual workflow instead of promising a fixed savings percentage.

## Corrections made during validation

1. Added the TypeScript 6 `rootDir` build setting.
2. Corrected exact-optional-property typing in the acceptance harness.
3. Preserved rollback errors with an explicit cause.
4. Replaced private-repository dependency review with `npm audit --audit-level=high`.
5. Configured CodeQL to retain SARIF evidence without requiring a private-repository code-scanning license.
6. Added HTTP and persistence-privacy acceptance coverage.
7. Updated GitHub Actions to current Node 24-based major versions and CodeQL v4.
8. Added a SARIF findings gate so CodeQL alerts fail the workflow even when the private-repository Code Scanning UI is unavailable.

## Initial-state invariant

`main` contains the baseline API and documentation but no idempotency implementation. The `demo-baseline` tag points to the current `main` commit. Rehearsals run in disposable worktrees.

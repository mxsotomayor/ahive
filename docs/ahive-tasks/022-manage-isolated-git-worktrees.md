# 022: Manage Isolated Git Worktrees

Status: **Complete**
Depends on: **008, 021**

## Description

Create and clean up managed Git worktrees for modifying Agent Tasks so the
user's base checkout and uncommitted changes remain untouched.

## Objective

Provide a recoverable execution workspace with a known base commit and branch.

## In scope

- Managed worktree root configuration.
- Deterministic task/run worktree identity.
- Base commit and branch capture.
- Repository-level modification lock.
- Create, inspect, retain, and explicitly discard lifecycle.
- Startup reconciliation of stale worktree records.

## Out of scope

- Agent file edits, commits, pushes, or automatic cleanup of valuable changes.

## Deliverables

- Worktree service, persistence, routes, cleanup safeguards, and Git integration tests.

## Verification

- Create worktrees from clean and dirty base repositories and prove the base is unchanged.
- Simulate interruption and recovery.

## Approval criteria

- [x] Existing uncommitted base-checkout changes remain byte-for-byte untouched.
- [x] Concurrent modifying Runs cannot share one worktree.
- [x] Every worktree records its base commit and owning Task/Run.
- [x] Discard requires an explicit target and confirmation path.
- [x] Interrupted worktrees are recoverable, not silently deleted.

## Completion evidence

Schema migration 10 persists one deterministic Managed Worktree per Agent Run,
including its Repository and Task, generated path, canonical root, base commit
and branch, presence, dirty state, inspection timestamps, and disposition. A
partial unique database index plus domain validation permits only one
`creating` or `ready` modification lock per Repository.

`lib/git-worktrees.mjs` revalidates the stored Repository against
`AHIVE_REPOSITORY_ROOTS`, generates targets only beneath
`AHIVE_WORKTREE_ROOT`, consumes one exact `repository.create_worktree`
approval, and invokes bounded argument-array Git operations without a shell.
It supports create, inspect, retain, and exact-path confirmed discard. Startup
reconciliation retains interrupted directories or records them as missing;
it never automatically removes them.

The Git integration test creates worktrees from dirty and clean base checkouts,
proves tracked and untracked base content remains unchanged, exercises the
Repository lock and deterministic per-Run identity, simulates restart and a
missing directory, and verifies discard confirmation. All 69 tests pass.

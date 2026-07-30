# 022: Manage Isolated Git Worktrees

Status: **Pending**  
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

- [ ] Existing uncommitted base-checkout changes remain byte-for-byte untouched.
- [ ] Concurrent modifying Runs cannot share one worktree.
- [ ] Every worktree records its base commit and owning Task/Run.
- [ ] Discard requires an explicit target and confirmation path.
- [ ] Interrupted worktrees are recoverable, not silently deleted.


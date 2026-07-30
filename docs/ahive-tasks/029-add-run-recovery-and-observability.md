# 029: Add Run Recovery and Operational Visibility

Status: **Pending**  
Depends on: **018, 025**

## Description

Reconcile interrupted Runs after server restart and expose sufficient metrics
and sanitized diagnostics to operate the local Agent system reliably.

## Objective

Prevent Runs, locks, approvals, and worktrees from remaining silently stuck.

## In scope

- Startup reconciliation for running/waiting Runs.
- Stale lock and worktree detection.
- Retryable versus terminal failure classification.
- Run duration, model usage, tool counts, and failure summaries.
- Structured sanitized logs and health endpoint.
- Manual recovery actions.

## Out of scope

- Automatic retry of modifying tools.
- Hosted monitoring or multi-machine workers.

## Deliverables

- Reconciler, health/diagnostic APIs, UI indicators, and restart tests.

## Verification

- Terminate the server during chat, approval, and modifying phases, then restart.

## Approval criteria

- [ ] No interrupted Run remains incorrectly marked `running`.
- [ ] Recoverable worktrees and artifacts are retained.
- [ ] Mutating operations are never automatically replayed.
- [ ] Stale locks can be safely diagnosed and released.
- [ ] Logs and metrics contain no credentials or hidden reasoning.


# 029: Add Run Recovery and Operational Visibility

Status: **Complete**
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

- [x] No interrupted Run remains incorrectly marked `running`.
- [x] Recoverable worktrees and artifacts are retained.
- [x] Mutating operations are never automatically replayed.
- [x] Stale locks can be safely diagnosed and released.
- [x] Logs and metrics contain no credentials or hidden reasoning.

## Completion evidence

Startup now reconciles `queued`, `running`, and `waiting_approval` Runs into a
durable `interrupted` state with either `retryable` or `manual_review`
classification. Unresolved Run approvals are cancelled, authorized-but-
unfinished file events become failed evidence, and in-flight Issue write-backs
become failed with an `unknown` origin sync state. All recovery records state
that automatic replay did not occur.

Existing managed-worktree reconciliation retains interrupted directories and
releases active locks through a retained disposition. `GET /api/health` reports
bounded process readiness, Run status/duration/usage/tool metrics, failure
classifications, recovery counts, and stale locks without exposing Messages,
objectives, Issue content, artifacts, credentials, provider results, or hidden
reasoning. Manual reconciliation and per-Run acknowledgement APIs are available
from the Agents page and Run Review.

The restart integration test terminates active chat, approval, guarded-write,
and external-write phases, restarts twice, releases a stale worktree lock,
acknowledges recovery, and verifies zero replays plus output redaction. The full
suite passes 81 tests.

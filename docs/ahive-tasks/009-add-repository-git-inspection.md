# 009: Add Read-Only Git Repository Inspection

Status: **Complete**  
Depends on: **008**

## Description

Inspect a verified Repository using bounded, non-mutating Git commands and
return normalized repository metadata.

## Objective

Show whether a registered path is a usable Git checkout before any agent is
assigned to it.

## In scope

- Detect Git worktree status.
- Read current branch, HEAD commit, configured remotes, and dirty state.
- Apply timeouts and bounded output.
- Normalize command failures.
- Store the last successful inspection timestamp.

## Out of scope

- Fetch, pull, checkout, commit, worktree creation, or file content reads.

## Deliverables

- Git inspection service, API response, and automated tests.

## Verification

- Test clean, dirty, detached-HEAD, and non-Git directories using temporary repositories.

## Approval criteria

- [x] Inspection runs only against a verified Repository ID.
- [x] No Git command changes repository state.
- [x] Output size and duration are bounded.
- [x] Dirty state is reported accurately without exposing file contents.
- [x] Failures remain actionable in the UI/API response.

## Completion evidence

Read-only inspection reports branch, detached state, HEAD, sanitized remote
hosts, and aggregate dirty state. Tests cover clean, dirty, detached, non-Git,
timeout, output bounds, and unchanged HEAD/status before and after inspection.

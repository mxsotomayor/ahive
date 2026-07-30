# 008: Validate and Constrain Repository Paths

Status: **Complete**  
Depends on: **007**

## Description

Resolve registered Repository paths on the server and constrain them to an
explicit allowlist of local repository roots.

## Objective

Prevent traversal, symlink escape, nonexistent paths, and arbitrary per-request
filesystem access.

## In scope

- `AHIVE_REPOSITORY_ROOTS` configuration.
- Canonical absolute-path resolution.
- Directory existence and accessibility checks.
- Symlink/junction escape checks.
- Repository verification status and timestamp.
- Safe error messages that do not expose secrets.

## Out of scope

- Reading repository contents.
- Git worktrees or shell execution.

## Deliverables

- Path-policy module, verification endpoint, tests, and `.env.example` update.

## Verification

- Test valid paths, traversal attempts, sibling paths, missing paths, and
  symlink/junction escapes using temporary directories.

## Approval criteria

- [x] Only canonical paths inside configured roots are accepted.
- [x] Client requests cannot override a stored path at run time.
- [x] Invalid paths never become verified Repositories.
- [x] Windows path casing and separators are handled consistently.
- [x] Tests do not access unrelated user directories.

## Completion evidence

`lib/repository-paths.mjs` resolves roots and Repository paths to canonical real
paths and rejects missing, sibling, outside-root, and symlink/junction escapes.
Verification accepts only a stored Repository ID.

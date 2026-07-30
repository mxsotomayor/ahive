# 025: Persist Run Summaries and Artifacts

Status: **Complete**
Depends on: **023, 024**

## Description

Persist bounded, reviewable outcomes from repository Runs without placing large
logs, secrets, or file contents directly in primary domain rows.

## Objective

Make every code Run auditable and reviewable after completion or failure.

## In scope

- Run Artifact metadata and storage references.
- Changed-file summary, patch/diff, test report, final response, and error summary.
- Size limits, retention metadata, content hashes, and redaction.
- Artifact download/read endpoints scoped to a Run.

## Out of scope

- UI rendering, commits, pushes, or cloud artifact storage.

## Deliverables

- Migration, artifact store, services/routes, retention policy, and tests.

## Verification

- Persist and retrieve artifacts for successful, failed, and cancelled Runs.
- Test size rejection and secret redaction.

## Approval criteria

- [x] Every modifying Run exposes an exact changed-file summary.
- [x] Diff and test evidence remain available after restart.
- [x] Large payloads do not inflate primary database rows without bounds.
- [x] Artifact access requires a valid Run relationship.
- [x] Secret-like values are redacted from ordinary artifacts and logs.

## Completion evidence

Schema migration 12 adds Run Artifact metadata while content is stored outside
primary rows in a private content-addressed directory. Artifacts are limited to
1 MiB, 100 per Run, retained for a configured 1–365 days, SHA-256 verified on
read, and sanitized for common credential patterns before persistence.

Successful and failed Agent outcomes, exact changed-file summaries, worktree
patches, and structured verification reports are materialized through
Run-scoped services and `GET /api/agent-runs/:id/artifacts`. Artifact content
reads require both the owning Run and Artifact ID. The API restart test proves
that metadata, redacted content, review disposition, and integrity survive a
server restart. The full regression suite passes all 77 tests.

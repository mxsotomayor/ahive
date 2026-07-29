# 025: Persist Run Summaries and Artifacts

Status: **Pending**  
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

- [ ] Every modifying Run exposes an exact changed-file summary.
- [ ] Diff and test evidence remain available after restart.
- [ ] Large payloads do not inflate primary database rows without bounds.
- [ ] Artifact access requires a valid Run relationship.
- [ ] Secret-like values are redacted from ordinary artifacts and logs.


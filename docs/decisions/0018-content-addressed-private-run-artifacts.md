# 0018: Store bounded Run evidence in a private content-addressed artifact store

Status: **Accepted**  
Date: **2026-07-29**

## Context

Agent Runs produce final responses, changed-file inventories, patches, test
reports, bounded logs, and error summaries. Putting this content directly into
domain rows would make the primary database grow without a clear bound and
would mix review evidence with entity identity.

## Decision

SQLite stores Run Artifact metadata and the owning Agent Run relationship.
Sanitized content is stored separately under `AHIVE_ARTIFACT_ROOT`, named by its
SHA-256 hash. Each artifact has a 1 MiB limit, an integrity-checked byte count,
a retention timestamp, and Run-scoped read authorization. Common credentials
are redacted before persistence. Hidden reasoning is never an artifact kind.

## Consequences

- Primary rows remain bounded and queryable without loading patches or logs.
- Identical content can reuse one private storage object while retaining
  distinct Run metadata.
- Database backup and recovery must include the artifact directory.
- Missing or modified content fails visibly instead of being trusted.
- Retention enforcement can be added without changing domain identity.

## Follow-up

Task 029 will add recovery and operational visibility, including retention
cleanup and missing-artifact health reporting.

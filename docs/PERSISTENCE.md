# Ahive Persistence and Recovery

Status: **Implemented**  
Last updated: **2026-07-29**

## Runtime storage

- `data/ahive.db` is the authoritative neutral workspace database.
- SQLite foreign keys, WAL journaling, a busy timeout, and explicit
  transactions are enabled when the server opens the database.
- `schema_migrations` records every applied migration. Startup applies only
  missing migrations in numeric order.
- Tests use independent temporary database files or `:memory:` databases.

The paths can be overridden for isolated development and testing with
`AHIVE_DATABASE_PATH` and `AHIVE_LEGACY_STORE_PATH`.

## Run artifacts

`AHIVE_ARTIFACT_ROOT` is an absolute or application-relative private directory
for bounded Run evidence. SQLite stores only Artifact identity, owning Run,
kind, content hash, byte size, retention timestamp, redaction count, safe
metadata, and a content-addressed storage reference. Ordinary primary rows do
not contain patches, command output, or source content.

Artifact content is limited to 1 MiB and verified against its SHA-256 hash and
stored byte count on every read. Common token and credential forms are redacted
before writing. `AHIVE_ARTIFACT_RETENTION_DAYS` defaults to 30 and accepts 1–365
days. Preserve this directory together with `data/ahive.db` during backup or
recovery; database metadata without the corresponding content file is reported
as missing rather than silently reconstructed.

## One-time JSON cutover

On startup, Ahive checks for a completed legacy-import record. If none exists
and `data/maxwell.json` is present, it:

1. reads and validates the neutral JSON;
2. creates `data/backups/maxwell-<sha256-prefix>.json` without overwriting an
   existing backup;
3. writes all entities to SQLite in one transaction;
4. records the source hash, counts, timestamp, and backup path;
5. compares collection counts and stable IDs after the write.

The original `data/maxwell.json` remains untouched. Re-running startup sees the
durable import record and does not duplicate entities.

## Recovery

At every startup, Ahive atomically marks active Runs as `interrupted`, cancels
their unresolved approvals, fails authorized-but-unfinished file events, and
records in-flight external writes as uncertain. It never replays a command,
file mutation, verification, or provider write. Interrupted Runs retain a
`retryable` or `manual_review` classification and explicit acknowledgement
state. Managed worktree inspection runs afterward so present changes are
retained and missing directories remain observable.

`GET /api/health` provides bounded local recovery counts and aggregate Run
metrics. `POST /api/operations/reconcile` repeats the idempotent checks on
demand. These endpoints exclude conversational content, Issue content, source
files, artifacts, credentials, and provider payloads.

Stop Ahive before recovery. Preserve the failed database and its `-wal`/`-shm`
companions for diagnosis. Restore by moving the database files out of the
runtime path and starting with the retained JSON source or its content-addressed
backup. Ahive will create a fresh database and repeat the validated import.
Never edit the private JSON or SQLite files while the server is running.

## Repository paths

`AHIVE_REPOSITORY_ROOTS` is an operating-system-delimited list of absolute
directories. A Repository is verified only after its real path is confirmed to
be a directory within one of those canonical roots. Git inspection uses the
stored verified Repository ID and path; requests cannot supply a replacement
path at inspection time.

## Managed worktrees

`AHIVE_WORKTREE_ROOT` is one absolute directory dedicated to Ahive-managed Git
worktrees. Worktree paths are deterministic from stored Repository, Task, and
Run identities and cannot be supplied by clients. SQLite records the owning
Run, base commit and branch, current presence/dirty state, and disposition.

Startup reconciles existing records without deleting directories. Interrupted
`creating` or `ready` worktrees become retained when present, and missing paths
remain visible as `missing`. Discard requires both the exact stored path and an
explicit boolean confirmation. Stop Ahive and preserve the worktree root with
the SQLite database when performing recovery or backup.

Guarded file changes are recorded separately as ordered File Change Events.
They retain normalized relative paths, operations, byte counts, before/after
SHA-256 hashes, and completion or failure state without storing source content.
An `authorized` event after interruption is evidence that must be reconciled;
it is never silently replayed.

## Issue write-backs

Schema migration 13 stores each requested origin status transition in
`issue_writebacks`. A record binds one completed Agent Run, neutral Issue,
authoritative External Issue Link, exact requested status, and single-use
Approval Request. Denied, expired, cancelled, successful, and failed attempts
remain durable. Provider credentials remain environment references on the
Connector Account and are never copied into the record.

The approval is consumed before contacting the provider. Local Issue status is
updated only after upstream success. An upstream failure leaves local status
unchanged and marks the origin link `unknown`, so recovery can show the
uncertain external result without automatically replaying it.

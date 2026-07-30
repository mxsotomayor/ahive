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

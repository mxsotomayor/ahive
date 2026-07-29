# 0015: Use better-sqlite3 for Transactional Local Persistence

Status: **Accepted**  
Date: **2026-07-29**

## Context

Ahive needs foreign keys, atomic multi-entity changes, ordered migrations, and
serialized writes for Issue and future Agent data. The implementation must run
reliably on the current Node.js 22 and Windows development environment.

## Decision

Use `better-sqlite3` with WAL mode, foreign keys enabled, a five-second busy
timeout, explicit transactions, and an ordered `schema_migrations` ledger.
`data/ahive.db` is authoritative. The pre-cutover `data/maxwell.json` and a
content-addressed copy in `data/backups/` are retained as rollback inputs.

The neutral domain continues to validate provider-independent rules. A SQLite
adapter maps each collection into relational tables with foreign keys and
uniqueness constraints. Migration tests use disposable databases.

## Proof on the target environment

- `better-sqlite3` 13.0.2 installed through pnpm without manual compilation.
- SQLite 3.53.4 opened successfully on Node 22.20.0 / Windows.
- Automated tests prove rollback, foreign-key rejection, idempotent migrations,
  isolated databases, and two-process write serialization.

## Rejected alternatives

- Node's built-in `node:sqlite`: technically passed the spike, but Node 22 still
  reports the API as experimental.
- `sqlite3`: its callback API adds complexity without improving this local,
  serialized-write workload.
- Continuing with atomic JSON: cannot provide relational constraints or durable
  transaction boundaries for Runs, approvals, and locks.

## Consequences

Ahive now requires Node.js 22 or newer and one native dependency. Database
changes must be forward-only migrations. The JSON source is never removed by
automatic import, and importing the same source again is a no-op.

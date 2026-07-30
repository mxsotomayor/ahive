# 005: Add the Database and Migration Framework

Status: **Complete**  
Depends on: **004**

## Description

Introduce the selected database adapter, ordered schema migrations, and a
transaction boundary without moving existing user data yet.

## Objective

Create an empty, versioned Ahive database predictably in development and tests.

## In scope

- Database connection module.
- Migration ledger and ordered migration runner.
- Initial tables for the already accepted neutral domain.
- Foreign keys, uniqueness constraints, timestamps, and indexes.
- Temporary-database test helpers.

## Out of scope

- Importing `data/maxwell.json`.
- Agent-specific tables beyond what the accepted migration plan requires.

## Deliverables

- Database modules and migrations.
- Schema and migration tests.
- Updated architecture documentation and commands.

## Verification

- Create an empty database twice and confirm migrations are idempotent.
- Run syntax checks and the complete existing test suite.

## Approval criteria

- [x] A fresh database reaches the expected schema version.
- [x] Re-running migrations causes no duplicate objects or data.
- [x] Invalid relationships fail at the database boundary.
- [x] Existing JSON-backed application behavior still passes regression tests.

## Completion evidence

`lib/database.mjs` owns ordered migrations, connection policy, and schema
version 2. Tests cover fresh and repeated migration, FK rejection, rollback,
write serialization, and isolated databases.

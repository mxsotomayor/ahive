# 004: Decide and Prove the Persistence Strategy

Status: **Complete**  
Depends on: **003**

## Description

Evaluate SQLite for transactional domain data, conversations, run events, and
repository locks while preserving the existing neutral workspace.

## Objective

Choose a durable persistence implementation that works reliably with the
project's Node.js and Windows environment.

## In scope

- Compare viable Node.js SQLite libraries.
- Prove installation, transactions, foreign keys, migrations, and test isolation.
- Define database location, backup behavior, and JSON migration strategy.
- Record the decision and rejected alternatives.

## Out of scope

- Migrating production data.
- Adding Agent APIs.

## Deliverables

- Minimal disposable persistence spike and tests.
- Accepted persistence decision record.
- Removal of spike code that is not part of the chosen implementation.

## Verification

- Run the spike on the actual Windows development environment.
- Demonstrate rollback and concurrent write serialization.

## Approval criteria

- [x] The chosen library installs without undocumented manual steps.
- [x] Foreign keys and transactions are enabled and tested.
- [x] Test databases are isolated and disposable.
- [x] A rollback-safe JSON migration path is documented.
- [x] No existing private data was modified during the spike.

## Completion evidence

Accepted [decision 0015](../decisions/0015-transactional-sqlite-persistence.md).
The Windows spike and automated tests prove rollback, foreign keys, and
two-process write serialization with `better-sqlite3` 13.0.2.

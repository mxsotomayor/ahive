# 006: Migrate Existing Neutral Workspace Data

Status: **Complete**  
Depends on: **005**

## Description

Import the existing neutral JSON store into the transactional database while
preserving all stable IDs and external Issue identities.

## Objective

Make the database the authoritative local store without losing or duplicating
current user data.

## In scope

- Pre-migration backup.
- One-time, restart-safe importer.
- Existing Organizations, Projects, Products, Connector Accounts, Product
  Sources, Issues, External Issue Links, and sync metadata.
- Compatibility reads during the cutover.
- Migration integrity report.

## Out of scope

- Agent entities.
- Deleting the JSON backup.

## Deliverables

- Importer, cutover wiring, tests, and migration documentation.

## Verification

- Compare entity counts and stable IDs before and after migration.
- Repeat the importer and prove it creates no duplicates.
- Run connector and neutral-domain regression tests.

## Approval criteria

- [x] Every existing entity retains its ID and relationships.
- [x] All external Issue identities remain unique and usable.
- [x] Re-running migration is safe.
- [x] The original JSON file remains recoverable.
- [x] The application reads the migrated database successfully.

## Completion evidence

The live cutover preserved count and stable-ID digests for 2 Organizations, 2
Projects, 2 Products, 4 Connector Accounts, 2 Product Sources, 20 Issues, and
20 External Issue Links. Re-import returned `repeated: true`; the original JSON
and content-addressed backup remain intact. See [persistence and recovery](../PERSISTENCE.md).

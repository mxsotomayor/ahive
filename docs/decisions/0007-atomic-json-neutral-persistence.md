# 0007: Atomic JSON Neutral Persistence for the Local Prototype

Status: **Accepted**  
Date: **2026-07-18**

## Context

The prototype supports Node.js 18 and currently has no runtime dependencies. We
need neutral persistence immediately, but the long-term transactional database
has not been selected. Adding a database package now would combine the domain
migration with a separate technology commitment.

## Decision

Persist the first neutral model in an ignored, versioned JSON file at
`data/maxwell.json`. Write through an in-process queue and atomic temporary-file
rename. Validate relationships and uniqueness before every write.

The store includes Organizations, Projects, Products, Connector Accounts,
Product Sources, Issues, External Issue Links, and provider sync metadata.

The legacy `data/issues.json` file is one-time migration input only. Existing UI
routes receive a compatibility projection from the neutral store.

## Consequences

- Neutral identity and Product boundaries are available without new packages.
- Existing GitLab data and UI behavior survive the migration.
- The store is appropriate for one local Maxwell server process.
- JSON does not provide database transactions across processes or efficient
  querying at large scale.
- A future database migration must preserve stable internal and external IDs.

## Follow-up

Evaluate SQLite before multi-process use, hosting, large datasets, or advanced
querying. Keep persistence access behind repository functions so that migration
does not affect provider adapters or the UI contract.

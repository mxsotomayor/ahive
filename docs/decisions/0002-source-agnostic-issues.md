# 0002: Issues Are Source-Agnostic

Status: **Superseded**  
Date: **2026-07-18**  
Superseded by: [0006](0006-product-scoped-sources-and-issue-origin.md)

## Context

The initial prototype treated one GitLab dataset as the canonical set. The real
goal is to manage Issues across multiple Zing Projects, clients, and providers.
A provider-shaped Issue cannot represent this safely.

## Decision

Maxwell Issue identity and core fields are provider-independent. Provider IDs,
URLs, versions, and metadata are stored in External Issue Links. An Issue belongs
to a Maxwell Project and may have multiple external representations.

## Consequences

- Existing cached GitLab records require migration.
- Duplicate detection uses external identity mappings, not titles.
- Provider filters become representation filters rather than Issue ownership.
- Connectors normalize into one contract.

## Follow-up

Implement the neutral persistence model before activating outbound creation.

Decision 0006 preserves source-agnostic Issue identity while replacing direct
Project ownership with Product ownership and explicit origin/replica roles.

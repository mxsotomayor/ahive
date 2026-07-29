# 0008: Reversible Workspace Management

Status: **Superseded**  
Date: **2026-07-18**  
Superseded by: [0009](0009-remove-unused-product-sources.md)

## Context

Organizations, Projects, Products, Connector Accounts, and Product Sources can
be referenced by Issues and external identity links. Permanent deletion or
moving records between parents can invalidate history and synchronization
identity.

## Decision

The first management interface supports create, edit, activate, and deactivate.
It does not permanently delete workspace records or reassign their parents.

Identity-bearing fields are protected after use. In particular, a Product
Source with External Issue Links cannot change its external container ID, and a
Connector Account used by Product Sources cannot change its base URL.

## Consequences

- Users can organize new work and safely retire old structure.
- Existing Issues and external links remain readable when a parent is inactive.
- Incorrect unused configuration can still be corrected.
- Permanent deletion, archival cleanup, and parent moves require explicit future
  workflows with dependency previews.

## Follow-up

Design archive and reassignment workflows only when a real use case requires
them. Such workflows must show affected Issues, Sources, and links before making
changes.

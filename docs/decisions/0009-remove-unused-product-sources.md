# 0009: Remove Unused Product Sources

Status: **Accepted**  
Date: **2026-07-19**  
Supersedes: [0008](0008-reversible-workspace-management.md)

## Context

Users can create Product Sources while configuring a Product, but an incorrect
or abandoned Source should not remain permanently. At the same time, deleting a
Source referenced by External Issue Links would destroy origin or replica
identity and could cause duplicate imports or publications.

## Decision

Allow permanent removal of a Product Source only when it has no External Issue
Links. Require a user confirmation before removal.

When a Product Source has linked Issue representations, block removal on both
the UI and server. The Source can be deactivated instead, preserving its identity
and Issue history.

Other workspace entities remain create, edit, activate, and deactivate only.
Parent reassignment remains unavailable.

## Consequences

- Mistaken or unused Product Source configurations can be cleaned up.
- Origin and replica identities cannot be orphaned through Source removal.
- The Connector Account and Product remain intact when an unused Source is
  removed.
- A future archival workflow may offer a separate view for inactive Sources.

## Follow-up

If users need to remove a linked Source, design an explicit migration workflow
that reassigns or archives every affected External Issue Link first.

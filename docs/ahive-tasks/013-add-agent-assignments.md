# 013: Add Project-Scoped Agent Assignments

Status: **Complete**  
Depends on: **007, 012**

## Description

Connect reusable Agent Profiles to a Project, optional Product, and optional
verified Repository with context-specific instructions.

## Objective

Define where an Agent may work without duplicating the Agent Profile.

## In scope

- Agent Assignment persistence and CRUD API.
- Project ownership, Product constraint, Repository constraint, and context instructions.
- Active-state and uniqueness rules.
- Effective-context projection for later runs.

## Out of scope

- Running the Agent.
- Automatically assigning Agents to Issues.

## Deliverables

- Migration, domain service, routes, and relationship tests.

## Verification

- Test Project-only, Product-scoped, and Repository-scoped assignments.
- Test every cross-Project rejection.

## Approval criteria

- [x] Product and Repository associations belong to the selected Project.
- [x] One Agent Profile can be assigned to multiple Projects.
- [x] Inactive Profiles, Projects, Products, or Repositories reject new assignments.
- [x] Assignment instructions do not mutate the reusable Profile.
- [x] Duplicate assignments are handled deterministically.

## Completion evidence

Schema migration 006 adds `agent_assignments` with restrictive foreign keys and
a unique Profile/Project/Product/Repository scope index that treats absent
optional references deterministically. The neutral domain and SQLite adapter
support create, list, update, activate/deactivate, guarded selection, and
removal while unused.

Assignments require an active Profile and Project. Optional Products and
Repositories must be active and belong to the selected Project; selected
Repositories must also be verified. A Product-bound Repository cannot be paired
with another Product. Effective-context API projections combine the reusable
Profile with Project, optional Product, optional Repository, and
Assignment-specific instructions without modifying the Profile.

Domain and isolated server tests cover Project-only, Product-scoped, and
Repository-scoped Assignments; Profile reuse across Projects; every
cross-Project rejection; inactive and unverified dependencies; duplicate
handling; CRUD; effective context; and relationship-protected deletion.

# 007: Add Repository Persistence and API

Status: **Complete**  
Depends on: **006**

## Description

Add registered local Repositories as managed Project resources, with optional
Product association and no execution behavior.

## Objective

Let Ahive persist which local codebases belong to each Project.

## In scope

- Repository table and domain validation.
- Create, read, update, activate, and deactivate operations.
- Project ownership and optional Product association.
- Name, local path, default branch, and access mode.
- API tests.

## Out of scope

- Filesystem inspection.
- Git commands or agent access.
- Permanent deletion.

## Deliverables

- Repository migration, service, routes, and tests.

## Verification

- Exercise every Repository endpoint using a temporary database.
- Test invalid Project/Product relationships.

## Approval criteria

- [x] A Project can own multiple Repositories.
- [x] A Product association cannot cross the Repository's Project.
- [x] Repository identity does not depend on display name.
- [x] Inactive Repositories cannot be selected for new Agent work.
- [x] No filesystem access occurs in this task.

## Completion evidence

Repositories use stable generated IDs and support create, read, update,
activate, and deactivate through the Workspace API. Domain tests cover Project
and Product boundaries and selection guards; HTTP smoke tests used an isolated
database.

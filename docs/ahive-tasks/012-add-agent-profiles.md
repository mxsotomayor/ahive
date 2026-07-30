# 012: Add Agent Profile Configuration

Status: **Complete**  
Depends on: **011**

## Description

Persist reusable Agent Profiles with identity, presentation, behavioral
instructions, harness selection, model configuration, and default tool policy.

## Objective

Allow the user to define an agent once before assigning it to Projects.

## In scope

- Agent Profile persistence and CRUD API.
- Name, description, trait description, instructions, model, and model settings.
- Harness Account relationship.
- Default permission/tool policy reference.
- Activate/deactivate behavior.

## Out of scope

- Project assignment, conversations, or model calls.
- Multi-agent handoffs.

## Deliverables

- Migration, validation, routes, and tests.

## Verification

- Test create, update, uniqueness, inactive harness, and malformed model settings.

## Approval criteria

- [x] UI description, traits, and operational instructions are separate fields.
- [x] The model is configurable and not embedded in the domain code.
- [x] Agent Profiles contain no Project-specific paths or Issue identifiers.
- [x] Profiles referencing inactive Harness Accounts cannot start new work.
- [x] Existing workspace entities remain unaffected.

## Completion evidence

Schema migration 005 adds the `agent_profiles` table with a restrictive Harness
Account foreign key and case-insensitive unique names. The neutral store and
SQLite adapter implement create, list, update, activate/deactivate, guarded
selection, and removal while unused. API routes are available at
`/api/agent-profiles` and `/api/agent-profiles/:id`.

The persisted whitelist keeps description, trait description, operational
instructions, model, validated Codex model settings, and optional default tool
policy separate. Project IDs, Repository paths, Issue IDs, sandbox settings,
and approval policy are excluded. Domain and server tests cover CRUD,
uniqueness, malformed settings, inactive Harness behavior, safe projections,
and preservation of all pre-existing workspace collection counts.

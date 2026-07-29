# 027: Connect Issues to Agent Tasks

Status: **Pending**  
Depends on: **015, 026**

## Description

Add a **Work with agent** flow that creates an Agent Task from an existing
neutral Issue and carries its Project/Product/source context into the conversation.

## Objective

Turn synchronized Issues into actionable developer work without duplicating or
mutating their external identities.

## In scope

- Issue action and Agent/Assignment/Repository selection.
- Agent Task creation with `issue_id`.
- Read-only Issue context projection for the initial conversation.
- Navigation between Issue, Agent Task, and completed Runs.
- Multiple Agent Tasks per Issue with clear status.

## Out of scope

- Automatic Issue status changes.
- Publishing Agent output to external Sources.

## Deliverables

- Issue UI action, creation API/service, context projection, links, and tests.

## Verification

- Start a Task from a GitLab-origin Issue and confirm all context and identities remain intact.
- Test incompatible Assignment/Product/Repository selections.

## Approval criteria

- [ ] The created Task references the existing neutral Issue ID.
- [ ] No new Issue or External Issue Link is created accidentally.
- [ ] Assignment and Repository choices cannot cross Project/Product boundaries.
- [ ] The Agent receives only the documented Issue context.
- [ ] The original Issue remains unchanged after task creation and execution.


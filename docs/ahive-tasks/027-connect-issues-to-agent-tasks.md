# 027: Connect Issues to Agent Tasks

Status: **Complete**
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

- [x] The created Task references the existing neutral Issue ID.
- [x] No new Issue or External Issue Link is created accidentally.
- [x] Assignment and Repository choices cannot cross Project/Product boundaries.
- [x] The Agent receives only the documented Issue context.
- [x] The original Issue remains unchanged after task creation and execution.

## Completion evidence

The Issue drawer now exposes **Work with agent**, filters Assignments to the
Issue Product, shows the selected Agent/Project/Product/Repository context, and
creates a Task with the existing neutral `issueId`. Each Issue lists all linked
Agent Tasks with Task and completed-Run status. Navigation works from Issue to
Task, from Task back to Issue, and from Task to historical Runs through Review.

`GET /api/issues/:id/agent-work` returns only the documented read-only Issue
projection, compatible Assignment views, and linked Task summaries. Agent
prompts receive the neutral Issue ID, title, bounded description, status,
priority, due date, bounded labels, assignee display identity, Project/Product,
and origin provider/display name/external Issue ID/URL. Connector credentials,
provider payload metadata, representations, and write authority are excluded.

Service and isolated API tests compare Issues and External Issue Links before
and after Task creation and Agent execution, reject a cross-Product Assignment,
verify Repository scope, and inspect the exact prompt. UI fixtures cover the
action, scoped modal, task history, and navigation controls. All 79 regression
tests pass.

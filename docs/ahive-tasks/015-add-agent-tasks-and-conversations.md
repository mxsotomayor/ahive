# 015: Persist Agent Tasks and Conversations

Status: **Complete**  
Depends on: **013**

## Description

Add the durable work-order and visible conversation records needed before any
model call is made.

## Objective

Represent an ad-hoc or Issue-backed task, its conversation, and visible messages.

## In scope

- Agent Task, Conversation, and Message tables.
- Task objective and lifecycle states.
- Optional Issue relationship.
- User, assistant, tool-summary, and system-notice message roles.
- Create/read APIs and pagination.

## Out of scope

- Agent Runs, streaming, tools, or hidden reasoning.
- Editing an external Issue.

## Deliverables

- Migrations, services, API routes, and tests.

## Verification

- Create ad-hoc and Issue-backed tasks and append visible messages.
- Test pagination, ordering, and invalid scope relationships.

## Approval criteria

- [x] Every Agent Task resolves to an active Assignment when created.
- [x] An attached Issue belongs to the Assignment's Project/Product context.
- [x] Message order is stable and cursor-pageable.
- [x] Hidden reasoning has no persistence field.
- [x] Deleting a Profile cannot orphan historical conversations.

## Completion evidence

Migration 007 adds `agent_tasks`, `conversations`, and `messages` with restrictive
foreign keys and stable per-Conversation sequence numbers. Creating a Task
captures its Assignment scope and creates exactly one Conversation. Issue-backed
Tasks require the Assignment's selected Product. Messages accept only visible
roles and reject hidden-reasoning metadata.

Local APIs create and list Tasks, read one Task, append Messages, and page them
using sequence cursors. Domain and isolated server tests cover ad-hoc and
Issue-backed Tasks, invalid scope, stable pagination, hidden-reasoning rejection,
and historical Assignment deletion guards. Agent execution remains absent.

# 003: Accept the Agent Domain Model

Status: **Complete**  
Depends on: **001, 002**

## Description

Define provider-neutral entities and relationships for repositories, harness
accounts, agent profiles, assignments, tasks, conversations, runs, approvals,
and artifacts.

## Objective

Produce a stable domain contract before persistence and UI work begins.

## In scope

- Entity fields, identities, statuses, and timestamps.
- Project and optional Product scoping.
- Optional Issue-to-Agent-Task relationship.
- Harness, model provider, and execution backend separation.
- Relationship and deletion/deactivation constraints.

## Out of scope

- Database tables or SDK-specific types.
- Multi-agent handoffs and scheduling.

## Deliverables

- Updated domain model.
- Relationship diagram.
- Decision records for repository ownership and reusable Agent Profiles.

## Verification

- Walk through an ad-hoc task and an Issue-backed developer task using only the proposed entities.
- Confirm no OpenAI-specific identifier leaks into core entities.

## Approval criteria

- [x] Every Agent Task resolves to one Agent Assignment and Project.
- [x] Product, Repository, and Issue context are optional only where documented.
- [x] Agent Profile reuse across Projects is supported.
- [x] Conversations and execution Runs are distinct.
- [x] Provider-specific run identifiers live outside core identity fields.

## Completion evidence

- The accepted domain model defines Repository, Harness Account, Agent Profile,
  Agent Assignment, Agent Task, Conversation, Message, Agent Run, Approval
  Request, and Run Artifact entities and relationships.
- Ad-hoc Project tasks and Issue-backed developer tasks are walked through using
  only provider-neutral identities.
- Decisions 0013 and 0014 record Repository ownership and reusable
  Profile/Assignment boundaries.
- Provider response, session, and trace identifiers are confined to Run
  `provider_metadata` rather than core identity.

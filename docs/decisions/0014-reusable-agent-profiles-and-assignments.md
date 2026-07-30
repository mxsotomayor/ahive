# 0014: Reusable Agent Profiles and Project Assignments

Status: **Accepted**  
Date: **2026-07-29**

## Context

An Agent's general behavior—name, traits, instructions, harness, and model—can be
useful across multiple Projects. Project context, Product scope, Repository
access, and contextual instructions vary per assignment. Combining them in one
Agent record would duplicate configuration and make authority difficult to
review.

Harness execution configuration is also different from an Issue Connector
Account. A GitLab token grants access to Issues; the Codex CLI's cached login
authorizes model execution. Treating both as one account type would blur
capabilities and authentication boundaries.

## Decision

Use three separate configuration concepts:

1. **Harness Account** identifies an Agent execution provider/adapter and its
   authentication mode; the initial adapter stores no credentials.
2. **Agent Profile** contains reusable identity, description, traits,
   instructions, model, and default policy.
3. **Agent Assignment** binds one Profile to one Project and optionally narrows
   it to a Product and Repository from that Project.

Every Agent Task references exactly one Assignment. Task context is captured
when the Task is created so later Profile or Assignment edits do not rewrite
historical execution meaning.

Conversation and Agent Run remain separate. A Conversation holds visible
Messages; each Run is one bounded attempt with a configuration snapshot,
provider metadata, approvals, and artifacts.

## Consequences

- One Profile can be reused across Projects without sharing Project authority.
- Harness, model provider, and execution backend can evolve independently.
- Provider-specific response IDs stay in Run provider metadata, not core IDs.
- Deactivation prevents new work while preserving historical Tasks and Runs.
- Agent Tasks may be ad-hoc or optionally linked to an existing neutral Issue.

## Follow-up

Implement persistence in dependency order: Harness Accounts, Agent Profiles,
Assignments, Agent Tasks/Conversations, and Runs/Approvals/Artifacts.

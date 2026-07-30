# 0011: Ahive Is an Agent-Centered Developer Work Orchestration Product

Status: **Accepted**  
Date: **2026-07-29**

## Context

Maxwell began as a personal issue tracker that unified assigned work from
GitLab, GitHub Projects, OpenProject, and spreadsheets. The prototype established
valuable Organization, Project, Product, Issue, Source, external-identity, and
credential boundaries.

Seeing work is only part of the developer's problem. The user also needs to
configure conversational agents, give them Project and Product context, connect
them to approved local repositories, supervise their work, and review the
result. The package already uses the name `ahive`, while the specification and
runtime still primarily describe Maxwell.

## Decision

The product is named **Ahive** and its primary purpose is local-first developer
work orchestration.

Ahive will manage configurable agents that can receive ad-hoc or Issue-backed
tasks within explicit Project context. Agents will eventually inspect and, only
through separate approval boundaries, modify registered local repositories.

The existing provider-neutral Issue model remains accepted. Issue aggregation,
external identity, and synchronization become supporting capabilities that
supply work context and close the work loop. They are not discarded or replaced
by provider-specific Agent data.

The first Agent milestone is deliberately read-only: configure a Codex CLI-backed
Agent, assign it to a Project and registered Repository, maintain a
Project-scoped conversation, and let it inspect—but not modify—that Repository.

This decision changes documentation and roadmap priority only. It does not
claim that Agent management or repository execution is implemented. The active
runtime may retain legacy Maxwell labels until the corresponding UI task is
implemented.

## Consequences

- Agent management is the highest-priority product milestone.
- Organization, Project, Product, Issue, Product Source, and External Issue Link
  remain valid work-context concepts.
- Projects need explicit local Repository configuration.
- Harness configuration must remain separate from Issue Connector Accounts.
- Conversation, execution, approval, and review require new domain concepts.
- Cross-provider publication, OpenProject, Excel, and advanced synchronization
  remain planned but follow the first Agent milestone unless needed by it.
- Documentation uses Ahive for the target product and clearly labels the active
  Maxwell runtime as transitional.

## Follow-up

1. Adopt constitutional rules for Agent execution and approvals.
2. Accept the provider-neutral Agent domain model.
3. Execute the ordered backlog in `docs/ahive-tasks/`.
4. Replace remaining runtime Maxwell labels only when the new surface is
   implemented and verified.

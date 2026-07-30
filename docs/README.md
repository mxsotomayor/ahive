# Ahive Specification

This directory is the shared product and engineering specification for Ahive,
formerly called Maxwell. It records what we are building, the language we use,
what already works, what remains, and why important decisions were made.

## Reading order

1. [Constitution](CONSTITUTION.md) - stable principles and collaboration rules.
2. [Product specification](PRODUCT.md) - problem, users, scope, and workflows.
3. [Domain model](DOMAIN-MODEL.md) - current Issue foundation; Agent extensions
   are introduced through the ordered backlog.
4. [Architecture](ARCHITECTURE.md) - current implementation and target design.
5. [Features and roadmap](FEATURES.md) - completed and planned capabilities.
6. [Decision records](decisions/README.md) - decisions, status, and history.
7. [Ahive implementation tasks](ahive-tasks/README.md) - ordered execution
   backlog with dependencies, verification, and approval criteria.
8. [Persistence and recovery](PERSISTENCE.md) - SQLite cutover, backups, and
   repository-root configuration.
9. [Codex Harness spike](CODEX-HARNESS-SPIKE.md) - accepted CLI process,
   streaming, redaction, continuation, cancellation, and Windows findings.

## Current model at a glance

```text
Organization -> Project -> Product -> Issue
                              |
                              `-> one or more Product Sources
```

Every imported Issue records one origin Source. It may have replica links in
other Sources configured for the same Product. Ahive is now evolving an Agent
execution layer around this work context:

```text
Project context + optional Issue + registered Repository
                           |
                           `-> Agent Task -> Conversation -> supervised Run
```

The Agent domain model, configuration, Tasks, and Conversations are persisted.
Repository persistence and safe read-only inspection are implemented. The
Codex CLI boundary is proven; production Agent Runs and execution UI are next.

## Document authority

- The constitution defines rules that all implementation work must respect.
- Accepted decision records explain why a choice was made and supersede older
  conflicting decisions.
- Product and domain documents describe the intended system.
- Architecture distinguishes the current prototype from the intended system.
- The feature list reports implementation status; it does not define principles.

If code and documentation disagree, we decide whether the code or specification
is wrong before extending the conflicting behavior.

## Status vocabulary

- **Accepted** - agreed and safe to implement against.
- **Proposed** - recommended, but still needs an explicit decision.
- **Superseded** - preserved for history but replaced by another decision.
- **Done** - implemented and verified in the current prototype.
- **To do** - not yet implemented.

## How we update the specification

1. Clarify the problem and affected concepts.
2. Add or update a decision record when behavior, authority, identity, security,
   or architecture changes.
3. Update the product, domain, or architecture document that describes the
   resulting design.
4. Update the feature checklist only after implementation and verification.
5. Never rewrite an accepted historical decision to hide a change. Add a new
   record that supersedes it.

Dates use `YYYY-MM-DD`. Provider names such as GitLab and GitHub are proper
nouns; domain objects such as Organization, Project, Product, Issue, and Product
Source are provider-independent.

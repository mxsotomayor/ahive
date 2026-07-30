# Decision Records

Decision records preserve why material choices were made. Their numeric order is
chronological, not a priority ranking.

| ID | Decision | Status | Date |
| --- | --- | --- | --- |
| [0001](0001-documentation-governance.md) | Documentation governance | Accepted | 2026-07-18 |
| [0002](0002-source-agnostic-issues.md) | Issues are source-agnostic | Superseded | 2026-07-18 |
| [0003](0003-project-specific-authority.md) | Configure authority per Project | Superseded | 2026-07-18 |
| [0004](0004-irn-context.md) | Model the IRN organizational context | Accepted | 2026-07-18 |
| [0005](0005-gitlab-prototype-authority.md) | GitLab authority is prototype-scoped | Accepted | 2026-07-18 |
| [0006](0006-product-scoped-sources-and-issue-origin.md) | Product-scoped Sources and Issue origin | Accepted | 2026-07-18 |
| [0007](0007-atomic-json-neutral-persistence.md) | Atomic JSON neutral persistence for the local prototype | Superseded | 2026-07-18 |
| [0008](0008-reversible-workspace-management.md) | Reversible workspace management | Superseded | 2026-07-18 |
| [0009](0009-remove-unused-product-sources.md) | Remove unused Product Sources | Accepted | 2026-07-19 |
| [0010](0010-provider-specific-credentials-and-google-oauth.md) | Provider-specific credentials and Google OAuth | Accepted | 2026-07-19 |
| [0011](0011-ahive-agent-centered-product.md) | Ahive is an agent-centered developer work orchestration product | Accepted | 2026-07-29 |
| [0012](0012-agent-execution-authority-and-safety.md) | Agent execution authority and safety boundaries | Accepted | 2026-07-29 |
| [0013](0013-project-owned-repositories.md) | Projects own registered local Repositories | Accepted | 2026-07-29 |
| [0014](0014-reusable-agent-profiles-and-assignments.md) | Reusable Agent Profiles and Project Assignments | Accepted | 2026-07-29 |
| [0015](0015-transactional-sqlite-persistence.md) | Transactional SQLite persistence | Accepted | 2026-07-29 |
| [0016](0016-codex-cli-agent-harness.md) | Codex CLI is the initial Agent Harness boundary | Accepted | 2026-07-29 |
| [0017](0017-content-addressed-verification-command-policies.md) | Verification commands are content-addressed exact policies | Accepted | 2026-07-29 |
| [0018](0018-content-addressed-private-run-artifacts.md) | Store bounded Run evidence in a private content-addressed artifact store | Accepted | 2026-07-29 |

## Template

New records should contain:

```text
# NNNN: Title
Status: Proposed | Accepted | Superseded
Date: YYYY-MM-DD
Supersedes: optional record

## Context
## Decision
## Consequences
## Follow-up
```

# 002: Adopt Agent Safety Principles

Status: **Complete**  
Depends on: **001**

## Description

Extend the constitution with durable rules governing repository access, agent
execution, approvals, external writes, secrets, and observable run history.

## Objective

Prevent later implementation choices from giving agents ambiguous or silent
authority over code and external systems.

## In scope

- Registered-repository-only access.
- Read-only default access.
- Explicit approval boundaries for edits, commits, pushes, and external writes.
- Preservation of user changes.
- Secret and private-reasoning handling.
- Cancellation, limits, and observable tool activity.

## Out of scope

- Implementing sandboxing or approvals.
- Choosing a specific process isolation technology.

## Deliverables

- Constitution amendment.
- Decision record describing the approval and execution boundary.

## Verification

- Review every new rule against the existing privacy and truthful-UI rules.

## Approval criteria

- [x] Conversation cannot silently authorize execution.
- [x] Repository edits require an explicit permission boundary.
- [x] Pushes, PRs, and Issue changes require separate authority.
- [x] Existing uncommitted user work must be preserved.
- [x] Hidden reasoning is excluded from persistence requirements.

## Completion evidence

- Constitution rules 12–18 define stored work context, conversation/execution
  separation, registered read-only repositories, preservation of user work,
  capability-specific approvals, bounded observable Runs, cancellation, and
  evidence-only persistence.
- Decision 0012 records the authority model and remains independent of a
  particular sandbox or process implementation.
- Architecture and roadmap now identify these boundaries as accepted while
  continuing to state that no Agent runtime or UI is implemented.
- Privacy is strengthened by credential-reference, redaction, and
  private-reasoning exclusions.
- Truthful-UI requirements are strengthened by accurate Run states and explicit
  prohibition of false execution claims.
- `pnpm run check` and all 23 automated tests pass.

# Ahive Product Specification

Status: **Working specification**  
Last updated: **2026-07-29**

## Product statement

Ahive is a local-first developer work orchestration workspace. It brings
Organizations, Projects, Products, repositories, Issues, and configurable AI
agents into one place so a developer can understand assigned work, delegate a
bounded task, supervise execution, and review the result without losing its
business or source context.

Issue aggregation remains a core source of work context. It is no longer the
whole product: Ahive's primary purpose is to manage the agents that help the
user perform that work.

## Problem

A developer's work is fragmented across issue trackers, project boards,
spreadsheets, local repositories, conversations, and AI tools. Even when a task
is visible, the developer still has to reconstruct:

- which Organization, Project, and Product owns the work;
- which external system contains the original Issue;
- which local repository contains the relevant code;
- which agent is suitable for the task;
- what context and permissions the agent received;
- what the agent changed, tested, or failed to complete;
- whether any code or external Issue update has been accepted.

Ahive provides one local control plane for this context and execution history.

## Primary user

The first release is for one developer using Ahive locally. The user manages
their own Organizations, Projects, Products, issue Sources, repositories, Agent
Profiles, and Agent Tasks.

Team administration, hosted execution, and shared multi-user permissions are
not part of the first Agent milestone.

## Work context

The accepted business hierarchy remains:

```text
Organization -> Project -> Product -> Issue
```

- **Organization:** an employer or owning business context.
- **Project:** an initiative managed by that Organization.
- **Product:** a deliverable or operational boundary inside a Project.
- **Issue:** a provider-independent work record belonging to one Product.

Projects may register one or more local repositories. Products continue to own
external Product Sources. Agent work is scoped to a Project and may narrow its
context to a Product, Repository, and Issue.

## First real-world context

The initial hierarchy remains:

```text
Organization: Rezzilla, Labs
  Project: IRN
    Product: IRN
```

The IRN Product may use GitLab, GitHub Projects, OpenProject, and Google Sheets
as Issue representations. The IRN Project may also register the local code
repositories that an approved Agent can inspect or modify.

## Product goals

1. Manage reusable Agent Profiles with a harness provider, model, description,
   traits, instructions, and permissions.
2. Assign Agents to explicit Project, Product, and Repository contexts.
3. Let the user give an Agent an ad-hoc task or a task backed by an Issue.
4. Preserve conversational history and observable execution results.
5. Let Agents inspect and, only after approval, modify registered repositories.
6. Protect existing code, uncommitted work, credentials, and external systems.
7. Show diffs, test evidence, failures, and approval history before acceptance.
8. Continue aggregating provider-neutral Issues and preserve their external
   origin and replica identities.
9. Keep harnesses, model providers, execution backends, and Issue connectors
   replaceable behind stable contracts.

## Primary developer workflow

```text
Configure work context
  -> Select or synchronize an Issue, or create an ad-hoc task
  -> Select an Agent and registered Repository
  -> Discuss and refine the objective
  -> Review the Agent's plan
  -> Approve a bounded execution capability
  -> Observe repository work and tests
  -> Review the diff and evidence
  -> Accept, retain, or discard the result
  -> Optionally approve an Issue status update
```

Conversation and execution are distinct. A user message may ask an Agent to
plan, explain, or investigate; it does not silently authorize repository or
external-system mutations.

## Agent management workflows

### Configure an Agent

The user creates a reusable Agent Profile, selects its harness and model, and
defines its description, traits, instructions, and default permission policy.
The user then assigns the Agent to one or more Projects, optionally narrowing an
assignment to a Product and registered Repository.

### Give an Agent a task

The user starts an Agent Task from an existing Issue or from an ad-hoc
objective. Ahive supplies only the context allowed by the selected Assignment.
The user and Agent can discuss the task before execution is requested.

### Supervise repository work

Repository-aware Agents begin with read-only access. A modifying run uses an
isolated workspace and requires explicit approval. Ahive records visible tool
activity, changed files, tests, failures, and final output. The user decides
whether the result should be retained or discarded.

### Close the work loop

Completing an Agent Run does not automatically complete an Issue. If an Agent
Task is linked to an Issue, Ahive may propose a status transition and must show
the exact origin Source and operation before the user approves it.

## Supporting Issue workflows

Issue synchronization continues to follow the existing source-agnostic model:

- Products configure one or more external Sources.
- Imported Issues retain their origin Product Source.
- External identities, not titles, determine repeated-import identity.
- Other representations are stored as replica links.
- Cross-Product synchronization is prohibited.
- External writes are deliberate and observable.

Completing full cross-provider publication remains useful, but it is scheduled
after the first Agent MVP unless required by an Agent workflow.

## First Agent milestone

The first milestone is successful when the user can:

1. Register and verify a local Project repository.
2. Configure a Codex CLI-backed Agent Profile.
3. Assign that Agent to the Project and Repository.
4. Create a Project-scoped conversation.
5. Let the Agent inspect the Repository without modifying it.
6. Stop a running response and recover the conversation after reload.

The implemented slice now extends through guarded editing, isolated worktrees,
tests, Run review, Issue-backed Tasks, explicit GitLab origin status write-back,
and restart-safe operational recovery. The complete end-to-end acceptance run
is the next MVP work; multi-agent coordination remains later.

## Non-goals for the first Agent milestone

- Silent or fully autonomous code changes.
- Automatic commits, pushes, merges, or pull requests.
- Arbitrary filesystem or shell access supplied through chat.
- Scheduled or unattended Agent Tasks.
- Multi-agent orchestration and handoffs.
- Cloud-hosted execution.
- Multi-user collaboration and shared permission administration.
- Replacing the complete UI of external issue platforms.
- Automatic title-based Issue deduplication.

## Roadmap priority

1. Accept the Ahive product, safety, and Agent domain specifications.
2. Introduce durable transactional persistence without losing current data.
3. Register and safely inspect local Project repositories.
4. Manage Harness Accounts, Agent Profiles, and Assignments.
5. Support conversational, cancellable Agent Tasks.
6. Add constrained read-only repository tools.
7. Add approval-gated isolated code work and review.
8. Connect Issues to Agent Tasks and explicit status write-back.
9. Resume broader cross-provider publication and advanced automation.

The executable backlog and approval criteria live in
[`docs/ahive-tasks/`](ahive-tasks/README.md).

## Open product questions

These require later decisions and must not be silently resolved during this
reframing task:

1. Should one Repository belong only to a Project, or may a Product claim it as
   its default Repository?
2. Which execution backend provides safe local repository access on Windows?
3. Which permissions may become reusable policy and which must remain per-Run?
4. When should an accepted worktree become a commit, branch, or pull request?
5. How should model cost and token budgets be presented and limited?
6. Should the default Issue inbox include only assigned work or also watched and
   managed work?

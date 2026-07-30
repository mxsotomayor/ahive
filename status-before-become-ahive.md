# Status Before Becoming Ahive

Status snapshot: **2026-07-29**

This document records Maxwell's implementation status and the proposed plan
before repositioning the product as Ahive. It is intentionally a snapshot, not
the updated Ahive specification.

## Proposed product direction

The project should evolve from an issue tracker into a local-first developer
work orchestration platform:

> Ahive unifies project context and issues, then lets configurable agents plan
> and safely execute work against approved local repositories.

Issues remain important, but become inputs for agents rather than the entire
product.

## Current implementation status

The existing foundation is reusable:

- Organization -> Project -> Product hierarchy.
- Product Sources and Connector Accounts.
- 20 real neutral Issues with stable external links.
- GitLab integration and Google Sheets read/write.
- Local credential boundaries.
- Workspace management UI.
- 23 automated tests.

Important gaps for agent management:

- Projects have no local repository configuration.
- No Agent, assignment, conversation, message, run, approval, or artifact
  entities.
- No OpenAI harness or API integration.
- No streaming responses.
- No background execution worker or cancellation.
- No filesystem, shell, Git, or patch permission model.
- No repository isolation or concurrency protection.
- Atomic JSON is poorly suited to conversations, event streams, concurrent
  runs, and repository locks.
- The frontend is currently one large `app.js`.
- GitLab is still presented as globally authoritative in parts of the
  application.
- Sync Runs and Conflicts appear in the specification but are not persisted.
- The package is named `ahive`, while the UI and documentation still use
  Maxwell.

## Proposed domain

Provider configuration should remain separate from agent configuration.

```text
Organization
  `- Project
      |- Product
      |   |- Issues
      |   `- Product Sources
      `- Repositories

Agent Profile
  `- Agent Assignment
      `- Agent Task
          |- Conversation
          |   `- Messages
          `- Agent Runs
              |- Approvals
              `- Artifacts
```

### Repository

A Project can have one or more registered local repositories.

```text
id
project_id
product_id?
name
local_path
default_branch?
access_mode       # read_only | guarded_write
active
last_verified_at
```

Repository paths should be registered and validated once. An agent request
must reference a Repository ID and must never supply an arbitrary filesystem
path.

### Harness Account

Agent harness accounts should remain separate from issue Connector Accounts.

```text
id
provider                 # openai initially
adapter                  # openai_agents_sdk
display_name
credential_references    # OPENAI_API_KEY
base_url?
active
```

### Agent Profile

A reusable agent definition.

```text
id
name
description
trait_description
instructions
harness_account_id
model
model_settings
tool_policy_id
active
```

`description` is for the UI. `trait_description` defines personality and
working style. `instructions` defines operational rules. Keeping these separate
makes agent behavior easier to understand and control.

### Agent Assignment

Connects a reusable Agent Profile to real work context.

```text
id
agent_profile_id
project_id
product_id?
repository_id?
context_instructions?
active
```

An Agent may therefore work on several Projects without duplicating its entire
configuration.

### Agent Task

The unit of work given to an agent.

```text
id
agent_assignment_id
issue_id?
objective
status          # draft | planning | waiting_approval | running | completed | failed | cancelled
created_at
updated_at
```

An Agent Task may originate from an Issue or be an ad-hoc developer request.

### Conversation and Run

A Conversation contains visible user and assistant messages. An Agent Run is
one execution attempt and records:

- Effective model and instructions.
- Repository branch and initial commit.
- Status and timestamps.
- Tool activity.
- Token usage.
- Result summary.
- Tests executed.
- Files changed.
- Patch, commit, or pull-request artifacts.
- Approval and cancellation events.

Hidden model reasoning should not be persisted.

## Harness architecture

Use an internal adapter contract, with OpenAI as the first implementation:

```text
testConnection()
listModels()
createSession()
sendMessage()
startRun()
resumeRun()
cancelRun()
streamEvents()
```

The OpenAI Agents SDK supports configurable agents, tools, sessions,
guardrails, human approval, tracing, and filesystem-oriented sandbox agents. It
is a suitable first harness, but Ahive's stored Agent model should not directly
depend on SDK-specific objects.

Reference documentation:

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
- [Agent configuration](https://openai.github.io/openai-agents-js/guides/agents/)
- [Sessions](https://openai.github.io/openai-agents-js/guides/sessions/)

There are three distinct configuration layers:

1. Harness: OpenAI Agents SDK.
2. Model provider and model: OpenAI plus a configurable model identifier.
3. Execution backend: the local repository workspace.

They should not be combined into one `provider` field.

Because the application currently runs on Windows and the documented local
sandbox example uses a Unix local sandbox client, Windows repository execution
needs a dedicated technical spike before committing to that execution backend.
This is an inference from the current SDK documentation.

## Proposed Agents surface

Add **Agents** to the main navigation.

The surface should contain:

- Agent Profile list with provider, model, traits, assignments, and active
  state.
- Create and edit Agent Profile forms.
- Project, Product, and Repository assignment.
- Agent task inbox showing planning, waiting, running, and completed work.
- Conversational task screen.
- Context sidebar showing Organization, Project, Product, Issue, repository,
  and branch.
- Run timeline with tool calls, approvals, tests, and errors.
- Diff and changed-files viewer.
- Explicit approve, cancel, accept changes, and discard-worktree actions.

Issues should gain a **Work with agent** action.

## Required execution safety

For developer agents, these should become constitutional rules:

- Only registered repository paths are accessible.
- Paths must resolve inside configured repository roots.
- Preserve existing uncommitted user changes.
- Prefer a managed Git worktree per Agent Task.
- Base repositories remain untouched until changes are accepted.
- Start agents read-only.
- Editing requires a per-task permission.
- Commit, push, pull-request creation, issue updates, and external messages
  require separate explicit permissions.
- Lock a repository or worktree while a modifying run is active.
- Support cancellation and execution limits.
- Never inject secret values into prompts or ordinary logs.
- Record observable tool events, not private reasoning.
- A conversation cannot silently become an execution run.

## Recommended implementation plan

### 1. Reframe the specification

Update the product statement, constitution, domain model, architecture,
roadmap, and decisions.

Required decisions:

- Agents are executors; Issues remain work records.
- Project repositories are explicitly registered.
- Agent profiles are reusable and assignments are project-scoped.
- Conversation and execution are separate.
- Repository writes require approval.
- Harness adapters remain provider-neutral.

### 2. Introduce durable persistence

Move the neutral store to SQLite before adding conversation and execution
history.

Migration requirements:

- Preserve all existing Organizations, Projects, Products, Sources, Issues,
  and external identities.
- Import `data/maxwell.json` through a tested migration.
- Keep secrets outside the database.
- Add migrations and transactional repository locks.

### 3. Implement repository management

Add repository CRUD under Projects:

- Register a local path.
- Validate path and Git repository state.
- Show branch, remote, current commit, and dirty status.
- Configure repository-root allowlists.
- Do not execute agent code yet.

### 4. Implement Agent configuration

Add persistence, APIs, and the Agents UI for:

- Harness Accounts.
- Agent Profiles.
- Traits and instructions.
- Model selection.
- Project, Product, and Repository assignments.
- Empty states and validation.

This phase remains configuration-only.

### 5. Add conversational OpenAI runs

Implement:

- OpenAI credential references.
- Agent harness adapter.
- Conversations and messages.
- Server-sent event streaming.
- Cancellation and error recovery.
- Usage and trace identifiers.

Initially, the agent can discuss and plan but cannot access repository files.

### 6. Add read-only repository awareness

Provide constrained tools for:

- Listing repository files.
- Searching text.
- Reading selected files.
- Inspecting Git status and diffs.
- Running explicitly approved read-only diagnostics.

### 7. Add guarded code execution

Run modifying tasks in managed worktrees:

- Agent proposes a plan.
- User approves execution.
- Agent edits only its worktree.
- Ahive displays the diff and test results.
- User accepts or rejects the changes.
- No automatic push in the first release.

### 8. Connect Issues to agents

Add the complete workflow:

```text
Issue
  -> Work with agent
  -> Select Agent and Repository
  -> Plan
  -> Approve
  -> Execute
  -> Review diff and tests
  -> Accept changes
  -> Explicitly update Issue status
```

### 9. Later capabilities

- Multiple agents collaborating on one task.
- Scheduled or queued tasks.
- Agent handoffs.
- Automatic pull-request preparation.
- Reusable skills and project instructions.
- Cost budgets and model routing.
- Agent evaluation and success metrics.
- Hosted execution.

## Recommended first milestone

> Manage Agent Profiles and project repositories, create a project-scoped
> conversation, and let an OpenAI agent inspect—but not modify—one registered
> repository.

This proves the new product direction safely. Cross-provider issue publication,
OpenProject, Excel, autonomous agents, automatic pushes, and multi-agent
orchestration should temporarily move behind this milestone.

# Domain Model

Status: **Accepted foundation**  
Last updated: **2026-07-29**

The domain separates work concepts from provider concepts. The operational
hierarchy is mandatory; business-participant relationships are optional context.
Agent configuration, conversation, and execution are separated so conversational
intent cannot silently expand a Run's authority.

## Required hierarchy

```text
Organization -> Project -> Product -> Issue
```

### Organization

The employer or business context that owns Projects.

```text
id, name, type?, active, created_at, updated_at
```

Example: Zing Developers.

### Project

An initiative inside one Organization.

```text
id, organization_id, name, key?, description?, active, created_at, updated_at
```

Example: IRN.

### Product

A deliverable or operational boundary inside one Project. Sources are configured
at this level.

```text
id, project_id, name, key?, description?, active, created_at, updated_at
```

A Product may have the same name as its Project. IDs, not display names, define
identity.

### Repository

A registered local codebase owned by one Project. It may optionally be associated
with one Product from that same Project.

```text
id
project_id
product_id?
name
local_path
resolved_path?
default_branch?
access_mode             # read_only | guarded_write
verification_status     # unverified | verified | invalid
verified_at?
active
created_at
updated_at
```

A Project may own multiple Repositories. The stored Repository identity, not a
path supplied in a chat message or Run request, determines filesystem scope.
Resolved paths and verification state are operational metadata; they never grant
write permission by themselves.

### Issue

The provider-independent unit of work belonging to one Product.

```text
id
product_id
origin_product_source_id
title
description
status
priority
due_date?
assignee_identity?
labels[]
created_at
updated_at
version
```

The Issue must not contain provider-specific identifiers such as
`gitlabIssueIid`, `githubNodeId`, or `openProjectWorkPackageId`.

## Source and representation concepts

### Connector Account

An authenticated provider account or installation. It is reusable by multiple
Product Sources.

```text
id
provider
display_name
base_url?
credential_reference
capabilities
active
```

Examples include GitLab Accenture, GitHub Zing, or OpenProject IRN. Credentials
are referenced and never stored in the Issue model.

### Product Source

The configuration that attaches one external container to one Product.

```text
id
product_id
connector_account_id
external_container_id
external_url?
display_name
capabilities
status_mapping
priority_mapping
active
metadata
```

The external container may be a GitLab project, GitHub Project, OpenProject
project, workbook, or sheet tab. A Product can have many Product Sources.

### External Issue Link

The stable identity relationship between one Ahive Issue and one external
representation.

```text
id
issue_id
product_source_id
role                 # origin | replica
external_issue_id
external_url?
external_version?
last_synced_at?
last_payload_hash?
sync_state
metadata
```

Constraints:

- `(product_source_id, external_issue_id)` is unique.
- An Issue has exactly one origin link in the initial model.
- Every link must reference a Product Source belonging to the Issue's Product.
- An Issue has at most one link per Product Source unless a later provider
  requirement explicitly changes this rule.

### Sync Run

An observable import or publication execution.

```text
id
product_source_id
direction             # pull | publish
started_at
completed_at?
status
read_count
created_count
updated_count
skipped_count
failed_count
```

### Conflict

A disagreement between the origin and a replica that cannot be resolved safely.

```text
id
issue_id
external_issue_link_id
field
canonical_value
external_value
detected_at
status
resolution?
```

## Optional business context

An Engagement may describe relationships between Organizations, such as Zing,
Accenture, and IRN Portugal collaborating on IRN. It does not replace or alter
the required Organization-to-Project ownership hierarchy.

```text
engagement(id, name, description?, active)
engagement_participant(engagement_id, organization_id, role)
project_engagement(project_id, engagement_id)
```

## Relationships

```text
Organization 1 --- * Project
Project      1 --- * Product
Product      1 --- * Issue
Product      1 --- * Product Source * --- 1 Connector Account
Issue        1 --- * External Issue Link * --- 1 Product Source
Product Source 1 --- * Sync Run
Issue        1 --- * Conflict
```

## Import identity algorithm

For each external item pulled from a Product Source:

1. Look up `(product_source_id, external_issue_id)`.
2. If a link exists, update that linked Issue according to origin/replica rules.
3. If no link exists, create a new Issue in the Source's Product.
4. Create its External Issue Link with role `origin`.
5. Do not merge by title, description, or approximate similarity.

## Publication algorithm

For an Issue and selected target Product Source:

1. Verify the target belongs to the Issue's Product.
2. If a replica link exists, update that external representation.
3. Otherwise create it externally and persist the returned ID as a replica link.
4. Record per-target success or failure in a Sync Run.

This makes repeated publication idempotent once the external identity is stored.

## Normalized values

Initial canonical status values:

```text
todo, in_progress, review, done
```

Initial canonical priority values:

```text
low, medium, high, urgent
```

Provider adapters map native values through Product Source configuration, not
through provider-specific fields on the Issue.

## Agent configuration

### Harness Account

A reusable configuration for the system that executes Agent Runs. Harness
Accounts are separate from Issue Connector Accounts.

```text
id
provider                  # openai initially
adapter                   # codex-cli initially
display_name
auth_mode                 # codex_session initially
capabilities
active
created_at
updated_at
```

The initial adapter invokes the local Codex CLI and reuses its cached login.
Codex authentication files and tokens are runtime-owned state and are not
copied into Ahive domain data.

### Agent Profile

A reusable definition of an Agent independent of any Project.

```text
id
harness_account_id
name
description
trait_description
instructions
model
model_settings
default_tool_policy_id?
active
created_at
updated_at
```

`description` is user-facing summary text. `trait_description` defines working
style and personality. `instructions` defines operational behavior. Provider
response IDs and SDK objects do not belong in the Profile.

`model` must be selected from Ahive's fixed OpenAI catalog: `gpt-5.6-sol`,
`gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.5-pro`, `gpt-5.4`,
`gpt-5.4-pro`, or `gpt-5.4-mini`. The server exposes the same catalog through
`GET /api/agent-models` and rejects arbitrary new model identifiers. Legacy
stored identifiers remain readable, but editing the Profile requires choosing
a supported value.

`model_settings` currently accepts Codex model controls (`reasoningEffort`,
`verbosity`, and `serviceTier`). Repository paths, Issue identifiers, sandbox
mode, and approval policy do not belong in a reusable Profile.

### Agent Assignment

The authorization and context binding between one Agent Profile and one Project.

```text
id
agent_profile_id
project_id
product_id?
repository_id?
context_instructions?
active
created_at
updated_at
```

If `product_id` is present, that Product belongs to `project_id`. If
`repository_id` is present, that Repository belongs to the same Project. An
Assignment does not grant capabilities beyond its referenced policy and active
relationships.

An Assignment may select only an active, verified Repository. If both Product
and Repository are selected and the Repository is Product-bound, they must
identify the same Product. Profile + Project + optional Product + optional
Repository is the deterministic Assignment identity.

The effective-context projection combines a snapshot-ready Profile view with
Project, optional Product, optional Repository, and Assignment-specific
instructions. It does not mutate or duplicate the reusable Profile.

## Agent work

### Agent Task

A durable unit of work given to one Agent Assignment.

```text
id
agent_assignment_id
project_id
product_id?
repository_id?
issue_id?
objective
status                    # draft | planning | waiting_approval | running |
                          # completed | failed | cancelled
created_at
updated_at
completed_at?
```

The Project and optional context are captured from, and constrained by, the
Assignment when the Task is created. An Issue-backed Task must reference an
Issue from the selected Product. An ad-hoc Task may omit Product and Issue when
the Assignment permits Project-only work. A developer task requiring code may
not start a repository Run without a Repository.

### Conversation

The visible, persistent discussion for one Agent Task.

```text
id
agent_task_id
title?
status                    # active | archived
created_at
updated_at
```

### Message

A visible item in one Conversation.

```text
id
conversation_id
role                      # user | assistant | tool_summary | system_notice
content
sequence
created_at
metadata
```

Messages do not store hidden reasoning. A message may request work but does not
constitute execution approval.

### Agent Run

One bounded execution attempt triggered from a Conversation.

```text
id
agent_task_id
conversation_id
agent_profile_snapshot
assignment_snapshot
harness_provider
model
status                    # queued | running | waiting_approval | completed |
                          # failed | cancelled | interrupted
started_at?
completed_at?
usage
provider_metadata
error_summary?
```

Provider-specific response, trace, or session identifiers may appear only in
`provider_metadata`; they are not core Run identity. A Conversation can contain
many Runs, and a Run may produce zero or one final visible assistant Message.

### Approval Request

A durable request for one protected capability within one Run.

```text
id
agent_run_id
capability
target_type
target_id
reason
risk_summary
status                    # pending | approved | denied | expired | consumed |
                          # cancelled
requested_at
expires_at?
decided_at?
consumed_at?
```

Approvals are target-specific and cannot be inferred from Message content.

### Run Artifact

Reviewable evidence or output produced by a Run.

```text
id
agent_run_id
kind                      # final_output | changed_files | patch | test_report |
                          # bounded_log | error_report
storage_reference
content_hash
size_bytes
created_at
metadata
```

Large content is stored outside primary rows behind a bounded private artifact
store. Artifacts exclude credentials and hidden reasoning.

## Agent relationships

```text
Project       1 --- * Repository
Harness Account 1 --- * Agent Profile
Agent Profile 1 --- * Agent Assignment * --- 1 Project
Agent Assignment 1 --- * Agent Task
Agent Task    1 --- 1 Conversation 1 --- * Message
Agent Task    1 --- * Agent Run
Agent Run     1 --- * Approval Request
Agent Run     1 --- * Run Artifact
Agent Task    * --- 0..1 Issue
```

## Agent context examples

### Ad-hoc Project task

1. Select an active Assignment bound to a Project.
2. Create an Agent Task with an objective and no Issue.
3. If the Assignment has no Product or Repository, the Task remains Project-only.
4. Create its Conversation and visible Messages.
5. A chat-only Run may start; repository tools remain unavailable without a
   compatible registered Repository.

### Issue-backed developer task

1. Select an Issue and an active Assignment from the Issue's Project context.
2. Verify the Assignment Product matches the Issue Product when Product-scoped.
3. Select a verified Repository belonging to that Project.
4. Create the Agent Task with captured Project, Product, Repository, and Issue IDs.
5. Discuss the objective in its Conversation.
6. Create bounded Runs; protected capabilities require separate approvals.
7. Keep Issue write-back separate from Run completion.

## Agent lifecycle constraints

- Historical Tasks, Conversations, Runs, Approvals, and Artifacts are retained
  when a Profile, Assignment, or Repository becomes inactive.
- An inactive related entity cannot be selected for new Agent work.
- Parent relationships on historical Agent Tasks are immutable.
- Deletion must not orphan execution history; initial management favors
  deactivation over permanent deletion.
- Multi-agent handoffs, scheduling, and autonomous retry are outside the initial
  model.

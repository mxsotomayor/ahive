# Domain Model

Status: **Accepted foundation**  
Last updated: **2026-07-18**

The domain separates work concepts from provider concepts. The operational
hierarchy is mandatory; business-participant relationships are optional context.

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

The stable identity relationship between one Maxwell Issue and one external
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

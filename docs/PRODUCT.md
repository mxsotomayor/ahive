# Product Specification

Status: **Working specification**  
Last updated: **2026-07-18**

## Product statement

Maxwell is a personal issue workspace for managing work across Organizations,
Projects, and Products while preserving every task's external origin and its
representations in GitLab, GitHub, OpenProject, spreadsheets, and future Sources.

## Problem

The same Product can be tracked in several platforms, and the same work may be
represented more than once. Checking each platform separately makes it hard to
know:

- which tasks are assigned to the user;
- which Organization, Project, and Product they belong to;
- where each Issue originated;
- which other Sources contain a replica;
- whether a change has been synchronized successfully.

Maxwell solves this without making its core Issue dependent on a provider.

## Product hierarchy

```text
Organization -> Project -> Product -> Issue
```

- **Organization:** an employer or owning business context, such as Zing
  Developers.
- **Project:** an initiative managed by that Organization, such as IRN.
- **Product:** a deliverable or operational product inside a Project. A Product
  may have the same display name as its Project.
- **Issue:** the provider-independent task belonging to one Product.

Entities use stable IDs, so names do not need to be globally unique.

## First real-world configuration

The initial structure is:

```text
Organization: Zing Developers
  Project: IRN
    Product: IRN
```

The IRN Product can have these Sources:

| Source | External context | Purpose |
| --- | --- | --- |
| GitLab | Accenture / IRN | Current operational issue source |
| OpenProject | Accenture / IRN | Work-package representation |
| GitHub Projects | Zing | Employer-side engineering representation |
| Excel or Google Sheets | Zing | Employer-side reporting representation |

Accenture and IRN Portugal remain relevant participant Organizations or
stakeholders. The mandatory ownership hierarchy does not need to duplicate the
same Project under each participant.

## Primary user

The first release is single-user and focuses on issues assigned to the user.
Multi-user collaboration, team administration, and shared permissions are not
part of the current prototype.

## Product goals

1. Show assigned Issues across all configured Products in one place.
2. Preserve Organization, Project, Product, and origin Source context.
3. Let each Product configure one or more external Sources.
4. Keep the core Issue independent of external providers.
5. Publish an Issue to selected Sources belonging to the same Product.
6. Preserve stable links to origin and replica representations.
7. Make sync state, errors, and conflicts understandable.
8. Allow new provider adapters without changing the core Issue model.

## Initial duplicate policy

Automatic fuzzy deduplication is not required. If two different Sources import
similar tasks without an existing identity link, Maxwell may show two Issues.
This is safer than merging unrelated work by title.

Once Maxwell publishes an Issue to another Source, it stores the returned
external identity as a replica link. Future pulls then update that representation
instead of creating another Issue.

## Core user workflows

### Configure a Product

The user creates or selects an Organization, Project, and Product, then attaches
one or more Sources. Each Source identifies its provider account and exact
external container.

### Import from a Source

The user synchronizes a Product Source. If the external identity is already
linked, Maxwell updates the existing Issue. Otherwise it creates a neutral Issue
whose origin is that Product Source.

### View work

The user sees Issues across Products and can filter by Organization, Project,
Product, origin, replica Source, and status. Each Issue shows where it originated
and where else it exists.

### Create an Issue

The user selects a Product and an initial Source. Maxwell creates the external
Issue there, then records it as the origin. A future Maxwell-local origin may be
added through a separate decision.

### Publish to another Source

The user selects an Issue and one or more target Sources configured for the same
Product. Maxwell previews the operation, creates or updates representations, and
stores each returned external identity as a replica link.

### Complete or reopen an Issue

The command is applied to the origin and propagated to configured replicas when
allowed. Partial failures remain visible and retryable.

## Non-goals for the first production milestone

- Replacing the complete UI of every external platform.
- Automatic title-based or fuzzy duplicate merging.
- Synchronizing Issues between different Products.
- Silent bidirectional synchronization with no conflict policy.
- General-purpose planning for whole teams.
- Cloud hosting or multi-user authorization before the local model is stable.

## Open product questions

These remain unresolved and should become decision records when answered:

1. Should the default inbox include only assigned Issues, or also created,
   watched, or managed Issues?
2. Should changes made directly in replicas be ignored, overwritten from the
   origin, or presented as conflicts?
3. Should a new Issue always require an external origin Source, or may Maxwell
   itself be the origin?
4. Should users be able to manually merge duplicate Issues after import?

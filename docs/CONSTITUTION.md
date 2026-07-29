# Maxwell Constitution

Status: **Accepted**  
Effective date: **2026-07-18**

This constitution contains the durable rules for product and engineering
decisions. A change to these principles requires an explicit accepted decision
record.

## 1. Issues are source-agnostic

A Maxwell Issue is a business object, not a GitLab issue, GitHub issue,
OpenProject work package, or spreadsheet row. Provider-specific identifiers and
URLs belong to external links attached to the Issue.

## 2. The operational hierarchy is explicit

The required hierarchy is:

```text
Organization -> Project -> Product -> Issue
```

An Organization owns Projects, a Project contains Products, and an Issue belongs
to exactly one Product. Display names are not identities: a Product may have the
same name as its Project because each entity has a stable internal ID.

## 3. Sources are configured per Product

A Product Source connects one Product to a provider-side project, board,
workbook, sheet, or equivalent container. A Product may have multiple Sources,
and a connector account may serve Sources belonging to different Products.
Provider type or account alone must never determine Product membership.

## 4. Every imported Issue retains its origin

An Issue imported from an external system records the Product Source where it
originated. That origin is authoritative for the Issue in the initial model.
Other external representations are replicas, not new canonical Issues.

An Issue may be published only to other configured Sources of the same Product.
Maxwell must never automatically synchronize an Issue across Product boundaries.

## 5. External systems hold representations

The same Issue may have one origin representation and zero or many replica
representations. Every representation must have a stable identity mapping.
Titles must never be used as the sole duplicate key.

Duplicate real-world work across different Sources is acceptable in the first
version. Maxwell only assumes two records are the same when an External Issue
Link proves their identity or the user explicitly links them.

## 6. Writes are deliberate and observable

External creates, updates, closes, and reopens must identify the target and
report success or failure. Readiness checks must not be presented as completed
synchronization. Partial success must remain visible.

## 7. Conflicts are never silently discarded

When origin and replica values differ, Maxwell must apply the configured policy
or create a visible conflict. It must not silently choose the last response
received.

## 8. Privacy and credentials are local by default

Secrets belong in ignored environment files or a future secret store. Private
issue data, local caches, and synchronization logs must not be committed. Logs
and error messages must not expose tokens.

## 9. Connectors follow one contract

Every provider adapter must normalize external data into the same core model and
declare its supported read and write capabilities. Adding a provider must not
require provider-specific fields in the core Issue.

## 10. The prototype must tell the truth

The interface and documentation must distinguish implemented behavior,
simulated behavior, readiness, and planned work. Dummy data must not appear once
a real canonical dataset is active.

## 11. Decisions are part of the product

Material decisions are recorded in `docs/decisions/`. The current code is not a
substitute for the rationale behind it. Documentation is updated in the same
change as the behavior it defines.

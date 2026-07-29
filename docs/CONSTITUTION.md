# Ahive Constitution

Status: **Accepted**  
Effective date: **2026-07-18**
Last amended: **2026-07-29**

This constitution contains the durable rules for product and engineering
decisions. A change to these principles requires an explicit accepted decision
record.

## 1. Issues are source-agnostic

An Ahive Issue is a business object, not a GitLab issue, GitHub issue,
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
Ahive must never automatically synchronize an Issue across Product boundaries.

## 5. External systems hold representations

The same Issue may have one origin representation and zero or many replica
representations. Every representation must have a stable identity mapping.
Titles must never be used as the sole duplicate key.

Duplicate real-world work across different Sources is acceptable in the first
version. Ahive only assumes two records are the same when an External Issue
Link proves their identity or the user explicitly links them.

## 6. Writes are deliberate and observable

External creates, updates, closes, and reopens must identify the target and
report success or failure. Readiness checks must not be presented as completed
synchronization. Partial success must remain visible.

## 7. Conflicts are never silently discarded

When origin and replica values differ, Ahive must apply the configured policy
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

## 12. Agents operate only within explicit work context

Every Agent Task and Run must resolve its Organization, Project, and Agent
Assignment before work begins. Product, Repository, and Issue context must be
explicit when they are required by the task. A provider, model, conversation,
prompt, or filesystem path alone must never determine where an Agent may work.

The server resolves authority from stored entity IDs and relationships. A
client or model must not expand scope by supplying an unregistered path,
different Project, additional Product, or unrelated Issue during a Run.

## 13. Conversation is not execution authority

A chat message expresses intent and context; it is not durable authorization
for a consequential action. Asking an Agent to implement, fix, finish, publish,
or do everything does not silently grant filesystem writes, command execution,
Git mutation, or external-system writes.

Ahive must represent execution and approval as explicit state transitions. An
Agent waiting for approval must not continue the protected operation until the
required approval exists, is still valid, matches the exact capability and
target, and has not already been consumed.

## 14. Repository access is registered, bounded, and read-only by default

Agents may access only active Repositories registered under their Project and
allowed by their Agent Assignment. Repository paths are resolved and validated
on the server against configured local roots. Run requests and model tool calls
must reference stored Repository identities rather than arbitrary paths.

Repository access begins read-only. File changes require a separate guarded
write capability. Shell access is not implied by repository access, and a
model-generated command is not permission to execute it.

## 15. User code and recoverable work are preserved

Ahive must not overwrite, clean, reset, discard, move, or commit the user's
existing uncommitted changes as an incidental part of Agent work. Before a
modifying Run, Ahive records the relevant Repository and revision state.

Modifying Agent work should occur in an isolated, attributable workspace such
as a managed Git worktree. Work with unresolved value must remain recoverable
after cancellation, failure, or restart. Cleanup that could destroy Agent or
user changes requires an explicit target and deliberate confirmation.

## 16. Consequential capabilities are narrow and independently approved

Permission to perform one action does not imply permission for another. At a
minimum, Ahive treats these as distinct capabilities:

- inspect repository content;
- modify files in an isolated workspace;
- execute a configured verification command;
- create a commit or branch;
- push code or create/update a pull request;
- create, update, complete, or reopen an external Issue;
- send a message or modify another external system.

An approval identifies the exact capability, target, owning Run, reason,
expiry, and decision. Approval must be single-use or otherwise bounded by an
explicit accepted policy. Completing an Agent Run must never automatically
complete its linked Issue.

## 17. Agent Runs are limited, cancellable, and observable

Every Run has a durable identity and an accurate lifecycle. Tool requests,
approval waits, starts, completions, failures, cancellations, and relevant
artifacts must be visible without claiming that an operation occurred when it
did not.

Runs and tools have bounded time, turns, output, file count, and concurrency as
appropriate. The user can cancel an active Run, and cancellation must propagate
to active provider requests and child processes. Interrupted Runs are
reconciled after restart; mutating operations are never silently replayed.

## 18. Persist evidence, not private reasoning or secrets

Ahive persists visible conversation messages, normalized tool activity,
approval history, changed-file evidence, test results, usage, and final Run
outcomes needed for review and recovery. It must not require, request, or store
hidden chain-of-thought or other private model reasoning.

Credentials and secret values are excluded from prompts, ordinary messages,
events, logs, traces, and artifacts unless a narrowly scoped provider protocol
requires transmission directly to that provider. Credential references may be
stored; credential values remain in ignored environment files or a future
secret store. Diagnostic and artifact pipelines must apply redaction and size
limits.

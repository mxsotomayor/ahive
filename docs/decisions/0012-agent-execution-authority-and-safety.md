# 0012: Agent Execution Authority and Safety Boundaries

Status: **Accepted**  
Date: **2026-07-29**

## Context

Ahive will let conversational Agents receive Project context and eventually
inspect or modify local repositories. Those capabilities can damage code,
discard uncommitted work, expose credentials, consume unbounded resources, or
change external Issues and repositories if conversational intent is mistaken
for execution authority.

The existing constitution already requires deliberate external writes, local
credential handling, truthful status, and visible failures. Agent execution
needs a stronger boundary because one Run may combine model calls, repository
tools, commands, Git operations, and external connectors.

## Decision

### Authority comes from stored context

Every Agent Run resolves an Agent Assignment and Project. Repository, Product,
and Issue scope must be represented by stored identities and validated
relationships. Neither the browser nor the model may add an arbitrary local
path or cross into another Project during a Run.

### Conversation and execution are separate

Natural-language requests do not constitute durable authorization for
consequential actions. Protected operations require an explicit execution state
and, where applicable, an approval that names the exact capability, target,
Run, reason, and expiry.

Approvals are not interchangeable. Approval to edit an isolated workspace does
not approve commands, commits, pushes, pull requests, Issue changes, or other
external writes. Completing a Run does not complete a linked Issue.

### Repository work begins read-only

Only active, registered Repositories within configured local roots may be
accessed. Repository inspection is read-only by default. Modifying work occurs
inside a managed isolated workspace and must preserve the user's base checkout
and uncommitted changes.

Potentially valuable worktrees and artifacts remain recoverable after failure,
cancellation, or restart. Destructive cleanup requires explicit targeting and
confirmation.

### Runs are observable and bounded

Runs record visible conversation output, normalized tool activity, approval
history, changed-file evidence, test results, usage, terminal state, and
reviewable artifacts. Tools and Runs enforce appropriate limits and support
cancellation. Interrupted mutating operations are not automatically replayed.

### Private reasoning and secrets are excluded

Ahive does not require or persist hidden model reasoning. It stores only visible
messages and operational evidence needed for review and recovery. Secret values
remain outside ordinary persistence, prompts, logs, events, and artifacts;
stored configuration uses credential references.

## Consequences

- Agent and approval state must be first-class domain concepts rather than chat
  annotations.
- Repository tools must resolve stored Repository IDs through a server-side path
  policy.
- Read, write, command, Git, and external connector capabilities require
  separate policy decisions.
- The first Agent milestone remains read-only.
- Later modifying Runs need isolated workspaces and recoverable artifacts.
- The UI must distinguish planning, waiting for approval, running, cancelled,
  failed, and completed states truthfully.
- Implementations may choose different sandbox or process technologies only if
  they preserve these boundaries.

## Follow-up

1. Accept the Agent domain model with durable Run and Approval entities.
2. Define repository path validation and allowed-root semantics.
3. Define the Approval state machine before adding code-write tools.
4. Validate Windows isolation and process cancellation before executing local
   commands.

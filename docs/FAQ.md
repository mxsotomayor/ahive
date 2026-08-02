# Ahive FAQ

Last updated: **2026-07-29**

## Does an Agent conversation use the Agent Task objective or the linked Issue description?

It uses both when an Issue is linked. The **Agent Task objective** remains the
requested outcome. The prompt also includes a documented, read-only projection
of the current local Issue: neutral ID, title, bounded description, status,
priority, due date, bounded labels, assignee display identity, Project/Product,
and origin provider/display name/external Issue ID/URL.

The Agent also receives Profile instructions and traits, the fixed
Project/Product/Repository Assignment context, Assignment-specific instructions,
and recent visible conversation messages. It does not receive Connector
credentials, raw provider payload metadata, replica details, or Issue write
authority.

Explicit Issue status write-back is a separate Run Review action. Linking an
Issue, creating a Task, completing a Run, or accepting a Run review never
silently changes the Issue. The user must request an exact-target approval,
approve it, and then execute it. Ahive currently writes status only to a GitLab
origin; it updates the neutral Issue after GitLab succeeds and does not propagate
the change to replicas.

## What happens if Ahive restarts while an Agent is working?

Ahive marks the active Run as interrupted and classifies it as retryable or as
requiring manual worktree review. Pending approvals are cancelled, unfinished
protected actions remain visible, and no command or external write is replayed.
Open Agents to inspect the operational banner, then open the Run Review to
retain or discard worktree state and acknowledge the recovery.

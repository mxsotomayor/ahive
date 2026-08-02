# 0017: Verification Commands Are Content-Addressed Exact Policies

Status: **Accepted**  
Date: **2026-07-29**

## Context

Agents need test evidence after guarded edits, but exposing a general-purpose
shell or accepting model-generated executable/argument text would expand a
Repository approval into arbitrary code execution.

## Decision

Verification commands belong to registered Repositories. A policy stores the
absolute executable, exact argument array, worktree-relative working directory,
allowlisted non-secret environment values, timeout, and output limit. Its stable
ID is derived from the complete normalized specification. Any configuration
change therefore creates a different approval target.

Execution requires a single-use `repository.run_verification` Approval Request
whose exact target is `<managed-worktree-id>:<policy-id>`. The runner starts the
executable directly with `shell: false`, only inside the owning ready worktree.
Shell interpreters and shell-script entrypoints are rejected. Bounded sanitized
stdout/stderr are returned, while command strings and output are excluded from
ordinary traces. Concurrency, timeout, output overflow, cancellation, and child
process trees are controlled by the runner.

## Consequences

- Models choose only among policy IDs and cannot supply arguments or a working
  directory.
- Old approvals cannot authorize an edited command.
- Only an explicit small environment surface reaches verification processes;
  connector and Codex credentials are not inherited.
- Verification results can be reviewed now and become durable Run Artifacts in
  Task 025.
- The initial configuration and execution surfaces are API/MCP only; Task 026
  adds the human review UI.

## Follow-up

Task 025 persists bounded command results as artifacts. Task 026 exposes policy
selection, approvals, results, diffs, and acceptance in the Run review UI.


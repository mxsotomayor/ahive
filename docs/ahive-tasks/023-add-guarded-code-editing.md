# 023: Add Guarded Code Editing

Status: **Complete**
Depends on: **020, 022**

## Description

Allow an approved Agent Run to edit files only inside its managed worktree using
validated patch-oriented tools.

## Objective

Produce reviewable code changes without granting unrestricted filesystem or
shell access.

## In scope

- Per-Task guarded-write permission.
- Apply-patch/create-file tools scoped to the worktree.
- Path, size, file-count, binary, and sensitive-file policies.
- Before/after hashes and changed-file events.
- Failure rollback for individual tool calls.

## Out of scope

- Arbitrary shell, commits, pushes, or applying changes to the base checkout.

## Deliverables

- Write-tool implementation, policy enforcement, Harness wiring, and adversarial tests.

## Verification

- Complete one approved edit and reject traversal, secret-file, oversized, and
  unapproved write attempts.

## Approval criteria

- [x] Writes require a valid guarded-write approval/policy.
- [x] Files outside the worktree cannot be changed.
- [x] Every changed path and before/after hash is recorded.
- [x] Partial tool failure does not corrupt unrelated files.
- [x] The base checkout remains unchanged.

## Completion evidence

Schema migration 11 adds durable File Change Events with owning Run and
worktree, ordered sequence, operation, normalized path, byte counts,
before/after SHA-256 hashes, lifecycle, and safe failure code. Authorization
atomically consumes one approved `repository.modify_files` request whose target
is exactly `<managed-worktree-id>:<relative-path>`.

`lib/guarded-write-tools.mjs` implements bounded `apply_patch` and
`create_file` operations. Patches use exact, non-ambiguous old/new text plus an
expected current hash. Writes allow one regular text file inside a ready
worktree, use atomic replacement or exclusive creation, and roll back simulated
post-write failure. Traversal, missing approvals, symlinks/junctions, secret or
generated paths, binary content, stale hashes, oversized files, excessive
replacements, and file-count limits are denied.

The stdio Repository MCP remains four read-only tools by default. Only an
explicit guarded-worktree Harness configuration adds the two destructive tools;
Codex shell, network, Git mutation, tests, commits, and pushes remain disabled.
Server routes provide the same guarded operations and durable event reads.
Service, rollback, adversarial, real MCP handshake, migration, and full
regression coverage pass: all 71 tests.

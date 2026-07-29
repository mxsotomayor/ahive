# 023: Add Guarded Code Editing

Status: **Pending**  
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

- [ ] Writes require a valid guarded-write approval/policy.
- [ ] Files outside the worktree cannot be changed.
- [ ] Every changed path and before/after hash is recorded.
- [ ] Partial tool failure does not corrupt unrelated files.
- [ ] The base checkout remains unchanged.


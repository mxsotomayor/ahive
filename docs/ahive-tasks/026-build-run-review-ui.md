# 026: Build the Run Review UI

Status: **Complete**
Depends on: **019, 025**

## Description

Add a review surface for approval requests, live tool activity, changed files,
diffs, tests, final summaries, and worktree disposition.

## Objective

Let the user understand and control an Agent's code work before accepting it.

## In scope

- Run timeline and status.
- Approval request cards with exact action and target.
- Changed-file and diff viewer.
- Test results and bounded logs.
- Accept-for-next-step, retain, cancel, and discard-worktree controls.
- Partial failure and interrupted-state presentation.

## Out of scope

- Git commit, push, PR creation, or Issue write-back.

## Deliverables

- Review UI, styles, API/event integration, and browser verification.

## Verification

- Review successful, failed, cancelled, waiting-approval, and recovered Runs.
- Check large diffs and mobile layout.

## Approval criteria

- [x] The user can identify exactly what changed and which tests ran.
- [x] Approval controls describe their consequences before acting.
- [x] Retain and discard states are distinct and truthful.
- [x] A failed test cannot be visually mistaken for success.
- [x] No Git or external write happens from a review-only action.

## Current checkpoint

The full-screen Agent Task now has a **Review** drawer for historical Runs,
tool activity, exact approval targets, managed-worktree disposition, changed
paths, failed/passed test evidence, bounded artifact content, and review-only
accept/needs-changes decisions. Approval, retain, discard, verification, and
artifact actions use the existing protected APIs.

Automated UI rendering and all 77 regression tests pass. The in-app browser
runtime exposed no available browser backend during implementation, so wide and
narrow visual interaction remains the user-testable acceptance checkpoint.

The user accepted the checkpoint and requested the next task. Review evidence,
protected actions, and review-only disposition therefore form the completed
Task 026 baseline for Issue-to-Agent navigation.

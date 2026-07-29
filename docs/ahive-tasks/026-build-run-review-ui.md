# 026: Build the Run Review UI

Status: **Pending**  
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

- [ ] The user can identify exactly what changed and which tests ran.
- [ ] Approval controls describe their consequences before acting.
- [ ] Retain and discard states are distinct and truthful.
- [ ] A failed test cannot be visually mistaken for success.
- [ ] No Git or external write happens from a review-only action.


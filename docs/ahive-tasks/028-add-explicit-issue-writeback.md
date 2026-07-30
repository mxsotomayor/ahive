# 028: Add Approved Issue Status Write-Back

Status: **Complete**
Depends on: **027**

## Description

After a successful Agent Task, offer an explicit action to update the linked
Issue status through its authoritative origin Source.

## Objective

Close the work loop without allowing Agent completion to silently modify an Issue.

## In scope

- Suggested Issue transition based on Run outcome.
- Dry-run target/source preview.
- Explicit user approval.
- Origin-aware status update through the existing connector.
- Local Issue/link update and observable result.
- Failure and retry state.

## Out of scope

- Automatic write-back.
- Replica propagation or non-status Issue edits.

## Deliverables

- Write-back planner, approval flow, connector integration, UI, and tests.

## Verification

- Complete one approved status update and exercise denial and upstream failure.

## Approval criteria

- [x] Agent Run completion alone never updates an Issue.
- [x] The preview names the Issue, origin Source, and requested transition.
- [x] Denial leaves local and external Issue state unchanged.
- [x] Success updates the external origin before reporting local success.
- [x] Partial or failed writes remain visible and retryable.

## Completion evidence

Run Review now shows a dry-run preview for the linked Issue's authoritative
origin, exact external target, current status, and suggested `done` transition.
Requesting it creates a durable post-Run `external.issue.write` approval without
changing the already-completed Agent Run or Agent Task. Denial records a visible
terminal attempt and performs no connector call.

Approved execution consumes the exact target once, resolves the origin Product
Source and its environment-backed Connector Account, and currently supports
GitLab close through the existing connector. Ahive updates its neutral Issue
only after GitLab succeeds. Upstream errors leave the local status unchanged,
mark the link state unknown, preserve a bounded failure result, and offer a new
approval-backed retry. Schema migration 13 persists this audit history.

The isolated HTTP test exercises preview, denial, approval, upstream success,
replay rejection, upstream failure, retry visibility, and persistence. The full
suite passes 80 tests.

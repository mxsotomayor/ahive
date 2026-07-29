# 028: Add Approved Issue Status Write-Back

Status: **Pending**  
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

- [ ] Agent Run completion alone never updates an Issue.
- [ ] The preview names the Issue, origin Source, and requested transition.
- [ ] Denial leaves local and external Issue state unchanged.
- [ ] Success updates the external origin before reporting local success.
- [ ] Partial or failed writes remain visible and retryable.


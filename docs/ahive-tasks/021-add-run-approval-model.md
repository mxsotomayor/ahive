# 021: Add Durable Run Approvals

Status: **Pending**  
Depends on: **018**

## Description

Persist explicit, narrowly scoped approval requests and decisions independently
from chat messages.

## Objective

Ensure an Agent cannot infer permission to mutate code or external systems from
ordinary conversation.

## In scope

- Approval Request entity and lifecycle.
- Requested capability, exact target, reason, risk, expiry, and decision.
- Approve/deny API with actor and timestamp.
- Run transition to and from `waiting_approval`.
- Single-use approval consumption.

## Out of scope

- Executing approved filesystem or Git operations.
- Broad standing approval policies.

## Deliverables

- Migration, approval service/routes, state-machine tests, and documentation.

## Verification

- Test approve, deny, expire, cancel, replay, and wrong-Run decisions.

## Approval criteria

- [ ] Approvals are separate from conversational consent.
- [ ] Each approval names one capability and bounded target.
- [ ] Expired, denied, or consumed approvals cannot be reused.
- [ ] A waiting Run cannot proceed without an accepted approval.
- [ ] Approval history remains visible after Run completion.


# 021: Add Durable Run Approvals

Status: **Complete**
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

- [x] Approvals are separate from conversational consent.
- [x] Each approval names one capability and bounded target.
- [x] Expired, denied, or consumed approvals cannot be reused.
- [x] A waiting Run cannot proceed without an accepted approval.
- [x] Approval history remains visible after Run completion.

## Completion evidence

Schema migration 9 persists Approval Requests independently from Messages and
adds `waiting_approval` to the Agent Run lifecycle. Requests include a fixed
capability, exact target type and ID, requester, reason, risk, and an expiry no
more than 24 hours away. Approve, deny, cancel, list, and request APIs record
actors and timestamps and emit sanitized console traces.

The internal consumption boundary requires the approved capability and target
to match exactly, rejects expiry and wrong-Run use, and consumes permission
once before moving the Run back to `running`. No filesystem, command, Git, or
external-system execution was added by this task. Service, persistence,
migration, state-machine, and live HTTP API tests cover approval, denial,
expiry, cancellation, replay, mismatched scope, and wrong-Run decisions.

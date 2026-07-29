# 018: Stream Runs and Support Cancellation

Status: **Complete**  
Depends on: **017**

## Description

Expose ordered Agent Run events through server-sent events and allow an active
Run to be cancelled safely.

## Objective

Make long responses observable and controllable without polling or page freezes.

## In scope

- Normalized Run Event schema and sequence numbers.
- SSE endpoint with reconnect cursor.
- Incremental visible assistant output.
- Abort propagation and cancellation endpoint.
- Client disconnect behavior and bounded event retention.

## Out of scope

- Tool approvals and repository execution.
- Resume after server restart.

## Deliverables

- Event stream, cancellation service/routes, and concurrency tests.

## Verification

- Stream one complete Run, reconnect mid-Run, and cancel another Run.
- Confirm final message content is not duplicated.

## Approval criteria

- [x] Events are ordered and resumable after a temporary browser disconnect.
- [x] Cancellation reaches the provider and produces `cancelled`, not `failed`.
- [x] One Run produces one final visible assistant message.
- [x] Secrets and hidden reasoning are absent from events.
- [x] Resource limits close abandoned streams.

## Completion evidence

Run creation now returns `202` after the durable `running` record exists while
the Codex child continues asynchronously. Sanitized provider events enter an
in-memory broker with monotonically increasing IDs, a 200-event bound, SSE
replay through `Last-Event-ID` or `cursor`, and five-minute terminal retention.

`POST /api/agent-runs/:id/cancel` aborts the active child process. Cancellation
persists `cancelled` and creates no assistant Message. Disconnecting an SSE
client only removes that subscriber so a reconnect can resume the same Run.
Tests cover cursor replay, ordering, retention bounds, cancellation propagation,
reasoning exclusion, and exactly-one visible assistant persistence.

# 017: Implement Chat-Only Agent Runs

Status: **Complete**  
Depends on: **016**

## Description

Implement the production Harness adapter and Agent Run lifecycle for text-only
conversations without repository or external-system tools.

## Objective

Allow a configured Agent to respond conversationally within an Agent Task.

## In scope

- Agent Run persistence and statuses.
- Effective instructions, model, Assignment context, and conversation input.
- Bounded local Codex CLI adapter invocation using the cached CLI session.
- Visible assistant-message persistence.
- Sanitized provider references, usage, timing, and failures.
- Run turn and output limits.

## Out of scope

- Streaming UI, repository tools, and write approvals.

## Deliverables

- Harness interface, Codex CLI adapter, Run service, routes, and tests.

## Verification

- Run a two-turn conversation and confirm history continuity.
- Test provider failure, timeout, and limit handling.

## Approval criteria

- [x] A configured Agent can complete a text-only turn.
- [x] The effective Agent/Assignment/model snapshot is recorded per Run.
- [x] Only visible assistant output enters Messages.
- [x] Failed Runs do not create false success messages.
- [x] No filesystem or external-source tool is available.
- [x] The adapter does not call OpenAI REST APIs directly.

## Completion evidence

Migration 008 adds durable Agent Runs. The Run service snapshots the reusable
Profile and effective Assignment context, invokes the accepted shell-free Codex
CLI adapter, resumes the last successful thread, and persists only a
visible final assistant Message plus bounded usage and provider metadata.

The chat-only prompt forbids tools and the service treats any command, file,
MCP, or web event as a failed Run without persisting its proposed assistant
output. Tests cover two-turn continuity, snapshots, provider failure, unexpected
tool activity, sanitized usage, and turn limits. Streaming and cancellation APIs
remain Task 018; the conversation UI remains Task 019.

The initial implementation used `codex exec --json`. The conversation UX
follow-up moved production Runs to `codex app-server` over stdio to receive
Agent message deltas; the non-interactive exec adapter remains as the bounded
spike and diagnostic surface.

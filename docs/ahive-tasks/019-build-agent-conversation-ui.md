# 019: Build the Agent Conversation UI

Status: **Complete**  
Depends on: **014, 018**

## Description

Add an Agent Task workspace with visible conversation history, context, live
Run state, input controls, and cancellation.

## Objective

Let the user give a Project-scoped task to an Agent and converse with it.

## In scope

- Agent Task list and create flow.
- Conversation transcript and composer.
- Live streamed response rendering.
- Stop action, retryable errors, and Run status.
- Context sidebar for Agent, Project, Product, Repository, and optional Issue.
- Empty and disconnected states.

## Out of scope

- Repository file inspection, edits, diffs, or approvals.

## Deliverables

- Conversation UI, streaming client, styles, and interaction tests.

## Verification

- Create an ad-hoc task, exchange multiple turns, reload, and cancel a turn.
- Check keyboard, focus, narrow-screen, and long-message behavior.

## Approval criteria

- [x] Conversation history survives reload.
- [x] The active Project context is always visible.
- [x] Streaming output is readable and never duplicated.
- [x] The Stop action produces an accurate cancelled state.
- [x] The UI does not imply repository access yet.

## Completion evidence

The Agents page now lists only persisted Agent Tasks and creates new ad-hoc or
Issue-backed Tasks from available Assignments. Opening a Task loads its durable
Conversation Messages and Runs, shows the fixed Agent/Project/Product/
Repository/Issue context, and supports multi-turn input with Ctrl/Cmd+Enter.

The browser subscribes to sanitized Run SSE events, renders visible assistant
output as a temporary streaming bubble, then reloads the persisted transcript
at the terminal event so an answer is never duplicated. Stop calls the explicit
cancellation API; closing the dialog only disconnects the browser event stream.
Failed and cancelled Runs keep the composer retryable. Responsive styles stack
the transcript and context on narrow screens. Repository context is labelled as
context-only and no file, shell, diff, or approval controls are exposed.

The follow-up UX pass keeps an active conversation mounted whenever background
Agent-list hydration or other page rendering occurs. The production Codex CLI
adapter consumes app-server `item/agentMessage/delta` notifications and sends
cumulative assistant snapshots through SSE. The browser patches the active
bubble in place instead of replacing the modal on every event, preserves manual
scroll position, and shows an immediate working state before the first token.

All 65 automated tests pass, including conversation empty/configured rendering,
fixed context, Task controls, the SSE contract, durable two-turn Runs, and
cancellation without a false assistant Message.

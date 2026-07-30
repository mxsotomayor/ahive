# 016: Prove the Codex CLI Harness Boundary

Status: **Complete**  
Depends on: **011, 015**

## Description

Build a disposable, bounded technical spike that validates local `codex exec`
invocation, cached authentication, session behavior, cancellation primitives,
and Windows compatibility.

## Objective

Prove the production Codex CLI process boundary before durable Agent Runs use it.

## In scope

- Invoke the local Codex CLI as a bounded child process without a shell.
- Reuse the existing Codex login and verify signed-out behavior safely.
- Execute one text-only, no-tool conversation.
- Inspect JSONL events, session resume, cancellation, usage, and error behavior.
- Evaluate the documented sandbox path separately on Windows.

## Out of scope

- Production UI, repository tools, or durable run execution.
- Choosing a permanent default model without evaluation.

## Deliverables

- Spike findings, tests or reproducible script, and accepted process contract.
- Removed experimental code that is not part of the chosen adapter.

## Verification

- Run against a test Agent Profile and record sanitized results.
- Verify missing CLI, signed-out, and signed-in paths.

## Approval criteria

- [x] The selected adapter supports streaming and cancellation requirements.
- [x] Authentication data never appears in logs, errors, or persisted messages.
- [x] Session continuation behavior is understood and documented.
- [x] Windows execution-backend limitations are explicitly recorded.
- [x] The domain remains independent of SDK classes and response objects.
- [x] Ahive makes no direct OpenAI REST API call.

## Completion evidence

The accepted contract and sanitized live findings are recorded in
[`docs/CODEX-HARNESS-SPIKE.md`](../CODEX-HARNESS-SPIKE.md). The bounded adapter
spike streams JSONL, keeps only visible output and safe metadata, supports
AbortSignal cancellation, classifies missing and signed-out CLI states, and
resumes an observed live session without tool events. A native Windows sandbox
smoke command succeeded. Production Run persistence remains Task 017.

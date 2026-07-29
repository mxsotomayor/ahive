# 0016: Codex CLI Is the Initial Agent Harness Boundary

Status: **Accepted**  
Date: **2026-07-29**

## Context

Ahive needs to run developer Agents locally. An earlier Task 011 implementation
assumed a direct OpenAI Responses API adapter and an environment-referenced API
key. The product owner clarified that Agents must use the Codex CLI instead.

## Decision

The initial Harness adapter is `codex-cli`. Ahive starts bounded local Codex
child processes without a shell and reuses the authentication owned by the
installed Codex CLI. Harness Accounts record `codex_session` as their
authentication mode but do not copy authentication files, tokens, API keys, or
REST base URLs.

`codex exec --json` remains the reproducible non-interactive spike and automation
surface. Production conversational Runs use `codex app-server --listen stdio://`
because it is the CLI's rich-client protocol and emits
`item/agentMessage/delta` notifications. Ahive applies approval-never,
read-only, disabled shell/web/plugin settings at process and thread boundaries,
exposes only the named Ahive Repository MCP when configured, and rejects any
unexpected tool or approval request.

Readiness is determined with bounded `codex --version` and `codex login status`
probes. Only safe status flags and the CLI version may enter API responses.
Actual model execution is deferred to Tasks 016 and 017.

## Consequences

- Ahive does not directly call OpenAI REST APIs for Agent Runs.
- `codex login` and Codex's own cache remain the authentication authority.
- The browser receives cumulative, reconnect-safe assistant snapshots over
  Ahive SSE while the local CLI is still producing the answer.
- Model, reasoning effort, verbosity, and service tier remain configurable on
  Agent Profiles and are translated to CLI arguments/config at run time.
- Missing CLI and signed-out states are visible without exposing command output
  or authentication material.
- A forward migration converts any prototype Responses-API Harness record.

## Follow-up

Task 016 proves JSONL automation behavior through `codex exec`. Tasks 017–020
and the conversation UX follow-up prove session continuation, cancellation,
stdio delta streaming, Windows process behavior, and the constrained Repository
MCP through the production app-server transport.

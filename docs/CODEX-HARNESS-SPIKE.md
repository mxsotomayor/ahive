# Codex CLI Harness Spike

Status: **Accepted**  
Date: **2026-07-29**

## Purpose

Validate the local Codex CLI as Ahive's first Agent Harness before production
Agent Runs depend on it. This boundary uses the user's cached Codex login and
does not call the OpenAI REST API.

## Accepted process contract

- Launch `codex exec` as a child process with `shell: false`.
- Resolve native executables and the Windows npm `codex.cmd` shim without
  passing Agent-controlled arguments through a shell.
- Request JSONL with `--json` and consume stdout incrementally.
- Force read-only execution and `approval_policy="never"` for the chat-only
  boundary. Ignore user config and exec-policy rules during this isolated spike.
- Bound prompts, output retained in memory, event-line size, runtime, and
  cancellation with an `AbortSignal`.
- Retain only the visible final Agent Message, thread ID, numeric usage, event
  type names, exit classification, and whether protected tool event types were
  observed.
- Discard reasoning content, command text, file-change details, MCP payloads,
  web-search content, raw stderr, and raw provider errors.
- Continue a session only with `codex exec resume <session-id>`. The initial
  turn must not use `--ephemeral` when continuation is required.

The contract follows the current Codex documentation for
[non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode.md)
and the [CLI command reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli).

## Sanitized live findings

The spike ran against the locally authenticated CLI (`0.146.0-alpha.3.1`) and
the configured `gpt-5.6-sol` model.

1. The initial text-only turn completed and returned the requested visible
   sentinel response.
2. Its JSONL stream contained `thread.started`, `turn.started`,
   `item.completed`, and `turn.completed` events.
3. No command execution, file change, MCP call, or web-search event occurred.
4. A second process resumed the exact same thread and returned the requested
   continuation sentinel, again with no tool events.
5. Both turns provided numeric input, cached-input, output, and reasoning-output
   usage fields. No provider response object entered the domain.
6. An isolated empty `CODEX_HOME` produced a sanitized
   `authentication_required` result without changing or exposing the real login.
7. Missing-executable and cancellation paths are reproducible without a model
   call and return bounded classifications.

The live thread identifier was intentionally not copied into this document or
the Ahive database.

## Windows findings and limitations

- Native npm shim execution works without `cmd.exe`.
- `codex sandbox -- cmd.exe /d /c echo AHIVE_SANDBOX_OK` succeeded locally.
- Codex documents `elevated` as the preferred Windows sandbox and `unelevated`
  as a weaker fallback when administrator or enterprise policy blocks setup.
- The spike proves direct child cancellation. Production Runs must also verify
  descendant-process cleanup before repository tools are enabled.
- Read-only mode prevents writes but does not itself remove tool definitions.
  Ahive therefore rejects unexpected command, file, MCP, or web event types in
  the chat-only adapter contract.

## Reproduction

The script is opt-in so ordinary tests never consume a model session:

```powershell
pnpm spike:codex -- --live
pnpm spike:codex -- --live --resume <session-id>
```

Automated tests use synthetic JSONL and local child processes for parsing,
redaction, missing CLI, signed-out classification, Windows shim arguments, and
cancellation.

## Production conversation follow-up

This document preserves the accepted Task 016 `codex exec` spike. Production
Agent conversations now use the same installed Codex CLI through
`codex app-server --listen stdio://`. That protocol supplies real Agent message
deltas for the browser chat while retaining cached CLI authentication, stdio
process isolation, cancellation, and the no-direct-REST decision.

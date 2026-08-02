# 0020: OpenCode Read-Only Run Adapter

Status: **Accepted**  
Date: **2026-08-01**

## Decision

OpenCode-backed Agent Runs use `opencode run --format json` through a dedicated
`ahive` primary agent supplied by `OPENCODE_CONFIG_CONTENT`. The runtime agent
allows only `read`, `list`, `glob`, and `grep`; it denies edits, shell commands,
web access, plugins, MCP tools, subagents, external directories, and prompts.
`--pure` and disabled sharing/snapshots further prevent plugin loading and local
side effects.

The adapter streams bounded JSON-line text updates, stores an OpenCode session
ID for continuation, and uses the existing child-process timeout/cancellation
boundary. It does not receive Ahive Repository MCP configuration. Therefore
OpenCode Runs are chat and read-only-context only; guarded edits, worktrees,
verification commands, and external write-back remain Codex-only.

## Consequences

- OpenCode Runs may be started from a ready OpenCode Assignment.
- Tool-shaped events are treated as unexpected and fail the Run.
- The process environment receives only a runtime config override, never
  credentials copied from Ahive.
- A separate task is required for approved OpenCode repository tools.

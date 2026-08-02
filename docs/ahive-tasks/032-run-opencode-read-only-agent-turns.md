# 032: Run OpenCode Read-Only Agent Turns

Status: **Complete**
Depends on: **031**

## Objective

Execute bounded, streamed OpenCode Agent Runs without weakening Ahive's
read-only safety boundary or changing Codex behavior.

## In scope

- `opencode run --format json` adapter with safe inline configuration.
- Text streaming, session continuation, timeout, cancellation, and durable Run
  outcomes.
- Read-only native OpenCode tools only: read, list, glob, and grep.
- Explicitly reject unexpected tool activity.

## Out of scope

- OpenCode repository MCP, edits, worktrees, verification, commits, pushes,
  web access, and external writes.

## Approval criteria

- [x] OpenCode Run dispatch does not alter Codex dispatch.
- [x] Inline OpenCode configuration denies all non-read-only tools.
- [x] JSON text updates stream into the existing Run event contract.
- [x] Cancellation and failed tool activity produce safe failed outcomes.
- [x] Full regression suite passes.

## Completion evidence

`lib/opencode-run.mjs` invokes `opencode run --format json --pure --agent ahive`
with an inline policy that allows only read/list/glob/grep. It streams bounded
JSON text updates, persists the OpenCode session ID for continuation, and
rejects any tool-shaped event. Repository MCP is withheld from OpenCode.

`npm run check` passed and `npm test` passed 87/87. Both CLI readiness probes
are ready (Codex 0.146.0, OpenCode 1.18.11). A restricted live OpenCode Run
created a session but the configured OpenCode Zen model returned insufficient
provider balance; this is correctly stored as a sanitized provider failure and
does not indicate an adapter or safety-policy failure.

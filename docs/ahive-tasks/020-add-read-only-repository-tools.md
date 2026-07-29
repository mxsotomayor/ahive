# 020: Add Constrained Read-Only Repository Tools

Status: **Complete**  
Depends on: **009, 018**

## Description

Give repository-scoped Agents a small set of server-controlled, read-only tools
for code discovery and inspection.

## Objective

Let an Agent understand a registered Repository without changing it or running
arbitrary shell commands.

## In scope

- List files with ignored-directory and result limits.
- Search text using bounded patterns.
- Read bounded text files.
- Read Git status and diff summaries.
- Tool schemas, timeouts, output limits, audit events, and path enforcement.
- Binary and sensitive-file exclusions.

## Out of scope

- File writes, shell commands, tests, network access, or Git mutation.

## Deliverables

- Repository tool service, Harness tool registration, policies, and adversarial tests.

## Verification

- Test normal discovery plus traversal, symlink, binary, oversized-file, secret-file,
  and excessive-result attempts.

## Approval criteria

- [x] Every tool resolves paths through a verified Repository ID.
- [x] Reads cannot escape the Repository root.
- [x] Common secret files and binary content are denied by default.
- [x] Tool outputs and durations are bounded.
- [x] A read-only run leaves Git status unchanged.

## Completion evidence

`lib/repository-tools.mjs` implements four server-controlled operations:
`list_files`, `search_text`, `read_text`, and `git_summary`. Every invocation
reloads the Repository by ID from SQLite, requires active/verified state,
revalidates the canonical path against `AHIVE_REPOSITORY_ROOTS`, and applies
time, traversal, result, file-size, line, and output limits. Parent traversal,
symlink traversal, ignored directories, binary types/content, common credential
files, and oversized reads are denied.

`scripts/ahive-repository-mcp.mjs` exposes exactly those operations through a
required per-Run stdio MCP server with read-only annotations. Codex Runs use
strict one-off configuration with the shell, web search, image, and multi-agent
tools disabled. Unexpected commands, file changes, web use, or foreign MCP tool
calls still fail the Run without persisting a false assistant reply.

Every Run lifecycle and tool phase emits a structured `[agent-trace]` console
line. Tool traces contain only safe metadata, counts, durations, and outcomes;
they omit prompts, file contents, commands, secrets, and hidden reasoning. Up to
128 normalized tool audit entries are persisted on the durable Run.

All 61 automated tests pass. Coverage includes a real MCP stdio handshake,
normal listing/search/read/Git summaries, traversal and symlink escapes,
secret/binary/oversized files, excessive limits, per-call Repository state
resolution, sanitized tracing, bounded persistence, and unchanged Git status.

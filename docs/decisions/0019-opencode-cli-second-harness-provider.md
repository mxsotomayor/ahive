# 0019: OpenCode CLI as a Second Harness Provider

Status: **Accepted**  
Date: **2026-08-01**

## Context

Decision 0016 made the Codex CLI the initial Agent Harness boundary and the
architecture keeps harness providers replaceable behind stable contracts
(PRODUCT.md principle 9; ARCHITECTURE.md keeps contracts adapter-neutral).
OpenCode CLI is a second local, credential-owning CLI harness: it manages its
own providers and credentials (`opencode auth`), exposes bounded non-interactive
execution (`opencode run --format json`), and supports session continuation
(`--session`/`--continue`). The user operates both CLIs and wants OpenCode
accepted as a Harness provider without changing Codex behavior.

## Decision

OpenCode is accepted as a second Harness provider with provider `opencode`,
adapter `opencode-cli`, and authentication mode `opencode_auth`. Like
`codex_session`, `opencode_auth` records that authentication is owned by the
installed CLI (`opencode auth login`, stored in the CLI's own `auth.json`);
Ahive never copies credentials, tokens, or REST base URLs.

Readiness is determined with bounded `opencode --version` and
`opencode auth list` probes, mirroring the Codex probe contract. Only safe
status flags and the CLI version may enter API responses. On Windows the npm
`opencode.cmd` shim is resolved to the package's bundled `opencode.exe`
without invoking a shell. `AHIVE_OPENCODE_EXECUTABLE` overrides resolution
when multiple installs exist.

Agent Profiles validate their model against a per-provider server catalog:
the OpenAI catalog remains the fixed eight-model list; OpenCode Profiles
select from a fixed catalog of `opencode/*` and `opencode-go/*` identifiers
verified against `opencode models`.

Runtime readiness becomes per-provider: every Harness Account view resolves
the probe result for its own provider. The existing flat single-status
contract remains accepted so current callers and the Codex behavior are
unchanged.

Agent Runs remain Codex-only in this slice. Starting a Run for an
OpenCode-backed Assignment is rejected with an explicit 409 before any Run is
created. OpenCode execution (`opencode run --format json`, streaming, and
cancellation) requires its own future decision and task.

## Consequences

- Codex CLI probing, execution, readiness wording, and tests are untouched;
  the OpenAI catalog and `codex_session` behavior are unchanged.
- Harness Accounts of both providers can coexist; identity uniqueness remains
  per provider+adapter+auth mode.
- `/api/agent-models` accepts an optional `provider` query; the default
  response is unchanged.
- The Agents UI offers provider selection on creation, per-provider model
  catalogs, and provider-aware readiness copy.
- `assertNoHarnessApiConfiguration` wording now covers both CLI harnesses
  while retaining the original "does not accept REST API credentials" phrase.

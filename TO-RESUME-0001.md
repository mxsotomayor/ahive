# Resume Note 0001: OpenCode Harness

Date: 2026-08-01
Status: **Completed on 2026-08-01**

## User Request

Add OpenCode CLI as a second Ahive Agent Harness, document it, keep Codex CLI
working, and verify that the new rules do not affect the existing Codex
harness.

## Planned Scope

- Accept `opencode` / `opencode-cli` / `opencode_auth` Harness Accounts.
- Add bounded OpenCode readiness checks:
  `opencode --version` and `opencode auth list`.
- Support `AHIVE_OPENCODE_EXECUTABLE` and safe Windows npm-shim resolution.
- Resolve runtime readiness per provider while preserving the existing flat
  Codex status behavior.
- Add a fixed OpenCode model catalog and provider-aware Profile validation.
- Add `/api/agent-models?provider=opencode` while preserving the default API
  response.
- Make the Agents UI select OpenAI/Codex or OpenCode and show provider-aware
  readiness instructions.
- Keep Runs Codex-only for this slice. OpenCode-backed Run creation must fail
  clearly with HTTP 409 before creating a Run.
- Add tests, live probes, full regression verification, and completion evidence.

## Completed

### Documentation and backlog

- Added `docs/decisions/0019-opencode-cli-second-harness-provider.md`.
- Added `docs/ahive-tasks/031-add-opencode-harness-provider.md`, now marked
  **Complete** with verification evidence.
- Added decision 0019 to `docs/decisions/README.md`.
- Added task 031 and an additional-harness milestone to
  `docs/ahive-tasks/README.md`.
- Decision 0019 explicitly records that OpenCode execution is out of scope for
  this slice and that Codex behavior must remain unchanged.

### OpenCode CLI discovery

Verified on this machine:

- `opencode --version` returns `1.18.11`.
- `opencode auth list` reports configured credentials.
- `opencode run --format json` is available.
- `opencode models` is available.
- The Windows installation exposes `C:\Program Files\nodejs\opencode.cmd`
  and the npm package is under `node_modules\opencode-ai`.

### Implementation

- Added `lib/opencode-cli.mjs` containing:
  - `inspectOpenCodeCli`.
  - `runOpenCodeCommand`.
  - `resolveOpenCodeInvocation`.
  - Version/authentication projection with ANSI stripping.
  - Windows `.cmd` to `opencode-ai\bin\opencode.exe` resolution.
- Updated the store, server, API, UI, configuration example, and documentation
  for provider-aware OpenCode Harness Accounts and model catalogs.
- Added focused OpenCode tests, including the explicit pre-creation Run guard.
- Changed `lib/codex-cli.mjs` only to export its existing bounded spawn helper
  for reuse; its existing behavior remains covered by regression and live tests.

## Completed Verification

- `npm run check` passed.
- `npm test` passed: 84 tests, 0 failures.
- Live `inspectCodexCli` result: ready, version `0.146.0`.
- Live `inspectOpenCodeCli` result: ready, version `1.18.11`.

## Deferred Scope

### Intentionally not implemented

- Task 032 enabled read-only OpenCode conversational Runs. Repository MCP,
  edits, shell commands, worktrees, verification, and external writes remain
  a separate future task.

## Codex Safety Result

- Existing Codex Harness Accounts still use `codex-cli` and `codex_session`.
- Existing OpenAI model IDs remain accepted.
- Existing flat runtime-status callers still work.
- Codex readiness still probes `codex --version` and `codex login status`.
- Codex Runs still use `runCodexAppServer` and existing executable handling.
- The complete test suite passes.

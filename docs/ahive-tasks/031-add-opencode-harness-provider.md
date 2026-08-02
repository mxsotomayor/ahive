# 031: Accept the OpenCode CLI Harness Provider

Status: **Complete**
Depends on: **011, 016**

## Description

Accept OpenCode CLI as a second Harness provider (`opencode` / `opencode-cli`
/ `opencode_auth`) with bounded readiness probes, a per-provider model
catalog, and provider-aware management UI, without changing any Codex CLI
behavior.

## Objective

Prove the adapter-neutral harness contract by hosting a second local,
credential-owning CLI provider behind the same domain, persistence, and
readiness rules.

## In scope

- Domain and persistence acceptance of OpenCode Harness Accounts.
- Bounded `opencode --version` and `opencode auth list` probes with safe
  projections, Windows npm shim resolution, and `AHIVE_OPENCODE_EXECUTABLE`.
- Per-provider runtime readiness resolution for all Harness views.
- Fixed OpenCode model catalog and per-provider Profile model validation.
- `/api/agent-models?provider=` selection with an unchanged default response.
- Provider selection and provider-aware readiness copy in the Agents UI.
- Explicit 409 rejection when a Run is started for an OpenCode-backed
  Assignment.

## Out of scope

- OpenCode Run execution, streaming, cancellation, and repository tools.
- Any change to Codex probing, execution, catalog, or readiness behavior.

## Deliverables

- Decision 0019, `lib/opencode-cli.mjs`, store/server/UI changes, and tests.

## Verification

- New OpenCode unit/store tests plus the full regression suite; live probes of
  both CLIs.

## Approval criteria

- [x] OpenCode Harness Accounts persist with validated adapter and auth mode.
- [x] Readiness reflects each provider's own probe; flat single-status
      callers behave exactly as before.
- [x] OpenCode Profiles accept only catalog models for their provider.
- [x] Runs for OpenCode-backed Assignments are rejected before creation.
- [x] All pre-existing tests pass unmodified.

## Completion evidence

OpenCode Harness Accounts now persist as `opencode` / `opencode-cli` /
`opencode_auth`, with `opencode --version` and `opencode auth list` readiness
probes, Windows npm-shim resolution, and `AHIVE_OPENCODE_EXECUTABLE` support.
Runtime status resolves per provider while retaining the existing flat Codex
status contract. Profiles use provider-specific fixed model catalogs; the
default `/api/agent-models` response remains the eight-model OpenAI catalog.

The Agents UI can configure either provider and shows provider-aware setup
guidance. OpenCode-backed Runs return an explicit 409 before any Run is
created; Codex remains the sole execution adapter. `npm run check` passed,
`npm test` passed 84/84, and live probes returned ready for Codex 0.146.0 and
OpenCode 1.18.11.

Task 032 subsequently enabled OpenCode read-only conversational Runs; the
original execution limitation above remains this task's historical evidence.

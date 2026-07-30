# 011: Add Harness Account Configuration

Status: **Complete**  
Depends on: **006**

## Description

Add reusable Agent Harness Accounts independently from issue Connector Accounts.
OpenAI is the first provider, but the entity remains provider-neutral.

## Objective

Represent how agents are executed and authenticated without storing secret values.
The selected boundary is the locally installed Codex CLI and its cached session.

## In scope

- Harness Account persistence and CRUD API.
- Provider, adapter, display name, authentication mode, and active state.
- Local Codex CLI installation and login-status probe.
- Provider capability metadata and safe configuration status.

## Out of scope

- Calling `codex exec` or OpenAI REST APIs.
- Model discovery or Agent Profiles.
- Reusing Product Connector Accounts as Harness Accounts.

## Deliverables

- Migrations, domain service, routes, tests, and optional executable setting.

## Verification

- Create and update an OpenAI/Codex CLI Harness Account without credentials.
- Inspect serialized responses for authentication-data leakage.

## Approval criteria

- [x] Harness Accounts and Connector Accounts are separate concepts.
- [x] Secret values never enter the database or browser response.
- [x] Provider and adapter identifiers are validated.
- [x] Inactive Harness Accounts cannot be selected for new profiles.
- [x] Missing CLI/login prerequisites are reported as safe configuration state.

## Completion evidence

Schema migration 003 introduced `harness_accounts`; forward migration 004
converts its contract to the validated `codex-cli` adapter with
`codex_session` authentication. The neutral domain supports create, read,
update, deactivate, selection checks, and removal while unused. API projections
expose only `ready`, `cli_unavailable`, or `authentication_required`, plus safe
CLI installation/version flags. Direct API credentials and base URLs are
rejected.

The Harness accepts an independently installed terminal CLI and has no runtime
dependency on the VS Code extension. Windows PATH discovery supports both a
native `codex.exe` and the npm-installed `codex.cmd` shim. The npm shim is
resolved to its Node entrypoint instead of being invoked through a shell, so
future prompt arguments remain literal.

Domain and isolated server tests verify adapter rejection, inactive selection,
CLI/login states, safe Windows npm-shim execution, Connector Account separation,
CRUD, and that command output or authentication data is not persisted or
serialized.

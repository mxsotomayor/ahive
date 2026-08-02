# Ahive Configuration Errors

Last updated: **2026-08-01**

Known configuration failures, what they mean, and how to fix them. Add one
dated entry whenever a configuration problem is diagnosed and resolved.

## "Install Codex CLI or correct AHIVE_CODEX_EXECUTABLE, then refresh."

**Where:** Agents page, Harness Account readiness pill (`CLI unavailable`).

**Cause:** Ahive probes the CLI by running `codex --version`
(`lib/codex-cli.mjs`). The probe failed because the executable was not found:

- `codex` is not installed or not on the `PATH` seen by the server process, or
- `AHIVE_CODEX_EXECUTABLE` in `.env` points at a path that no longer exists.
  A common case: it targeted the Codex binary bundled with the VS Code ChatGPT
  extension, whose folder (`openai.chatgpt-<version>-win32-x64`) is deleted on
  every extension update.

**Fix:**

1. Confirm a working CLI in a terminal: `codex --version` and
   `codex login status`.
2. Either remove `AHIVE_CODEX_EXECUTABLE` from `.env` to resolve `codex` from
   `PATH`, or (recommended when multiple installs exist) point it at the
   standalone absolute path, e.g.
   `C:\Users\<you>\AppData\Local\Programs\OpenAI\Codex\bin\codex.exe`.
   Do not point it at a VS Code extension folder.
3. Restart the dev server (`.env` is read at process start) and refresh the
   Agents page. The pill should show `Ready`; `Sign-in required` instead means
   the CLI is found but needs `codex login`.

## "Install OpenCode CLI or correct AHIVE_OPENCODE_EXECUTABLE, then refresh."

**Cause:** `opencode --version` could not be run from the server process, or
the configured executable path is stale.

**Fix:** Run `opencode --version` and `opencode auth list`. Remove the override
to use `PATH`, or set `AHIVE_OPENCODE_EXECUTABLE` to a valid standalone path.
Restart the server, then refresh Agents. `Sign-in required` means the CLI is
available but needs `opencode auth login`.

## "OpenCode CLI reported opencode insufficient balance"

**Cause:** The CLI and its credentials are valid, but the selected OpenCode
provider account cannot fund the requested model turn.

**Fix:** Add provider balance or select an available model/provider, then retry.
Run the server in a visible terminal to inspect the matching `[agent-trace]`
line. It includes the sanitized `providerErrorCode` but never provider output,
credentials, prompt text, or command arguments.

Models prefixed `opencode/` use **OpenCode Zen**; models prefixed
`opencode-go/` use **OpenCode Go**. The model picker and trace field
`modelTransport` show the same distinction.

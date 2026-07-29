import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectCodexCli, runCodexCommand } from "../lib/codex-cli.mjs";
import { openDatabase } from "../lib/database.mjs";
import {
  assertHarnessAccountSelectable,
  createWorkspaceEntity,
  listHarnessAccountViews,
  NeutralStoreError,
  readNeutralStore,
  removeHarnessAccount,
  updateWorkspaceEntity
} from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";

test("persists a credential-free Codex CLI Harness Account and reports runtime readiness", async () => {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, "harness-test");
  try {
    const connector = await createWorkspaceEntity(store, "connectorAccount", {
      provider: "github",
      displayName: "GitHub issues",
      baseUrl: "https://github.com",
      credentialReference: "GITHUB_TOKEN"
    });
    const created = await createWorkspaceEntity(store, "harnessAccount", {
      provider: "openai",
      adapter: "codex-cli",
      displayName: "Local Codex"
    });
    assert.equal(created.entity.authMode, "codex_session");
    assert.deepEqual(created.entity.credentialReferences, {});
    assert.deepEqual(created.entity.capabilities, ["codex_exec", "jsonl_events", "session_resume"]);
    assert.equal(created.store.connectorAccounts.length, 1);
    assert.equal(created.store.harnessAccounts.length, 1);
    assert.notEqual(connector.entity.id, created.entity.id);

    const [unavailable] = listHarnessAccountViews(created.store, { status: "cli_unavailable" });
    assert.equal(unavailable.configuration.status, "cli_unavailable");
    const runtime = { status: "ready", installed: true, authenticated: true, version: "test-version" };
    const [ready] = listHarnessAccountViews(created.store, runtime);
    assert.deepEqual(ready.configuration, { ...runtime });
    assert.equal(assertHarnessAccountSelectable(created.store, created.entity.id, runtime).id, created.entity.id);

    const inactive = await updateWorkspaceEntity(store, "harnessAccount", created.entity.id, {
      displayName: "Local Codex inactive",
      active: false
    });
    assert.throws(
      () => assertHarnessAccountSelectable(inactive.store, created.entity.id, runtime),
      /Inactive Harness Account/
    );
    assert.deepEqual((await readNeutralStore(store)).harnessAccounts[0].credentialReferences, {});

    const removed = await removeHarnessAccount(store, created.entity.id);
    assert.equal(removed.store.harnessAccounts.length, 0);
    assert.equal(removed.store.connectorAccounts.length, 1);
  } finally {
    database.close();
  }
});

test("rejects unsupported harness adapters and direct API configuration", async () => {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, "harness-validation-test");
  try {
    await assert.rejects(
      () => createWorkspaceEntity(store, "harnessAccount", { provider: "unknown", displayName: "Unknown" }),
      error => error instanceof NeutralStoreError && /provider/.test(error.message)
    );
    await assert.rejects(
      () => createWorkspaceEntity(store, "harnessAccount", { provider: "openai", adapter: "openai-responses", displayName: "Wrong adapter" }),
      error => error instanceof NeutralStoreError && /not supported/.test(error.message)
    );
    await assert.rejects(
      () => createWorkspaceEntity(store, "harnessAccount", {
        provider: "openai",
        displayName: "Leaky",
        apiKeyReference: "OPENAI_API_KEY"
      }),
      error => error instanceof NeutralStoreError && /does not accept REST API credentials/.test(error.message)
    );
  } finally {
    database.close();
  }
});

test("inspects Codex CLI availability without exposing command output", async () => {
  const calls = [];
  const ready = await inspectCodexCli({
    runner: async (_executable, args) => {
      calls.push(args);
      return args[0] === "--version"
        ? { ok: true, stdout: "codex-cli 1.2.3\n", stderr: "" }
        : { ok: true, stdout: "", stderr: "Logged in using ChatGPT\n" };
    }
  });
  assert.deepEqual(calls, [["--version"], ["login", "status"]]);
  assert.deepEqual(ready, { status: "ready", installed: true, authenticated: true, version: "1.2.3" });

  const unavailable = await inspectCodexCli({ runner: async () => ({ ok: false, stdout: "", stderr: "secret details" }) });
  assert.deepEqual(unavailable, { status: "cli_unavailable", installed: false, authenticated: false, version: null });
  assert.equal(JSON.stringify(unavailable).includes("secret details"), false);
});

test("runs a standalone npm Codex CLI shim on Windows without shell interpretation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-codex-shim-"));
  try {
    const binDirectory = join(directory, "node_modules", "@openai", "codex", "bin");
    await mkdir(binDirectory, { recursive: true });
    await writeFile(join(directory, "codex.cmd"), "@echo off\r\n", "utf8");
    await writeFile(
      join(binDirectory, "codex.js"),
      "console.log(JSON.stringify(process.argv.slice(2)));\n",
      "utf8"
    );

    const argument = "literal & not-a-shell-command";
    const result = await runCodexCommand("codex", ["exec", argument], {
      platform: "win32",
      env: { PATH: directory },
      nodeExecutable: process.execPath
    });
    assert.equal(result.ok, true);
    assert.deepEqual(JSON.parse(result.stdout), ["exec", argument]);

    const unsupportedDirectory = join(directory, "unsupported");
    await mkdir(unsupportedDirectory);
    await writeFile(join(unsupportedDirectory, "codex.cmd"), "@echo off\r\n", "utf8");
    const unsupported = await runCodexCommand(join(unsupportedDirectory, "codex.cmd"), ["--version"], {
      platform: "win32"
    });
    assert.equal(unsupported.ok, false);
    assert.equal(unsupported.errorCode, "unsupported_windows_codex_shim");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

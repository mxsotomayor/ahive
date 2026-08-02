import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../lib/database.mjs";
import { inspectOpenCodeCli, resolveOpenCodeInvocation } from "../lib/opencode-cli.mjs";
import {
  createAgentTask,
  createWorkspaceEntity,
  executeAgentTaskTurn,
  listHarnessAccountViews,
  listSupportedAgentModels,
  NeutralStoreError
} from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";

test("accepts OpenCode Harness Accounts alongside unchanged Codex Harness Accounts", async () => {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, "opencode-harness-test");
  try {
    const codex = await createWorkspaceEntity(store, "harnessAccount", { provider: "openai", displayName: "Local Codex" });
    const opencode = await createWorkspaceEntity(store, "harnessAccount", { provider: "opencode", displayName: "Local OpenCode" });
    assert.equal(codex.entity.adapter, "codex-cli");
    assert.equal(codex.entity.authMode, "codex_session");
    assert.deepEqual(codex.entity.capabilities, ["codex_exec", "jsonl_events", "session_resume"]);
    assert.equal(opencode.entity.adapter, "opencode-cli");
    assert.equal(opencode.entity.authMode, "opencode_auth");
    assert.deepEqual(opencode.entity.capabilities, ["opencode_run", "json_events", "session_continue"]);
    await assert.rejects(
      () => createWorkspaceEntity(store, "agentProfile", {
        harnessAccountId: opencode.entity.id,
        name: "Wrong OpenCode model",
        model: "gpt-5.6-sol"
      }),
      error => error instanceof NeutralStoreError && /OpenCode model catalog/.test(error.message)
    );

    const views = listHarnessAccountViews(opencode.store, {
      openai: { status: "ready", installed: true, authenticated: true, version: "codex-test" },
      opencode: { status: "authentication_required", installed: true, authenticated: false, version: "opencode-test" }
    });
    assert.equal(views.find(account => account.id === codex.entity.id).configuration.status, "ready");
    assert.equal(views.find(account => account.id === opencode.entity.id).configuration.status, "authentication_required");

    await assert.rejects(
      () => createWorkspaceEntity(store, "harnessAccount", { provider: "opencode", adapter: "codex-cli", displayName: "Wrong adapter" }),
      error => error instanceof NeutralStoreError && /not supported/.test(error.message)
    );
  } finally {
    database.close();
  }
});

test("exposes twenty fixed OpenCode model choices", () => {
  const models = listSupportedAgentModels("opencode");
  assert.equal(models.length, 20);
  assert.equal(models.some(model => model.id === "opencode-go/kimi-k3"), true);
});

test("inspects OpenCode safely and resolves its Windows npm shim without a shell", async () => {
  const calls = [];
  const ready = await inspectOpenCodeCli({
    runner: async (_executable, args) => {
      calls.push(args);
      return args[0] === "--version"
        ? { ok: true, stdout: "1.18.11\n", stderr: "" }
        : { ok: true, stdout: "\u001b[34m●\u001b[39m OpenCode\n3 credentials\n", stderr: "" };
    }
  });
  assert.deepEqual(calls, [["--version"], ["auth", "list"]]);
  assert.deepEqual(ready, { status: "ready", installed: true, authenticated: true, version: "1.18.11" });
  const unavailable = await inspectOpenCodeCli({ runner: async () => ({ ok: false, stdout: "", stderr: "secret details" }) });
  assert.deepEqual(unavailable, { status: "cli_unavailable", installed: false, authenticated: false, version: null });
  assert.equal(JSON.stringify(unavailable).includes("secret details"), false);

  const directory = await mkdtemp(join(tmpdir(), "ahive-opencode-shim-"));
  try {
    const binDirectory = join(directory, "node_modules", "opencode-ai", "bin");
    await mkdir(binDirectory, { recursive: true });
    await writeFile(join(directory, "opencode.cmd"), "@echo off\r\n", "utf8");
    await writeFile(join(binDirectory, "opencode.exe"), "", "utf8");
    const invocation = await resolveOpenCodeInvocation("opencode", { platform: "win32", env: { PATH: directory } });
    assert.equal(invocation.executable, join(binDirectory, "opencode.exe"));
    assert.deepEqual(invocation.argsPrefix, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("dispatches an OpenCode-backed Run through the read-only adapter", async () => {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, "opencode-run-guard-test");
  try {
    const organization = await createWorkspaceEntity(store, "organization", { name: "Org" });
    const project = await createWorkspaceEntity(store, "project", { organizationId: organization.entity.id, name: "Project" });
    const harness = await createWorkspaceEntity(store, "harnessAccount", { provider: "opencode", displayName: "Local OpenCode" });
    const profile = await createWorkspaceEntity(store, "agentProfile", {
      harnessAccountId: harness.entity.id,
      name: "OpenCode Profile",
      model: "opencode-go/kimi-k3"
    });
    const assignment = await createWorkspaceEntity(store, "agentAssignment", {
      agentProfileId: profile.entity.id,
      projectId: project.entity.id
    });
    const task = await createAgentTask(store, { agentAssignmentId: assignment.entity.id, objective: "Plan safely" });
    const result = await executeAgentTaskTurn(store, task.task.id, { message: "Start safely" }, {
      runtimeStatus: { opencode: { status: "ready", installed: true, authenticated: true, version: "test" } },
      openCodeRunner: async (_executable, args, options) => {
        assert.equal(args.includes("--session"), false);
        assert.doesNotMatch(args.at(-1), /ahive_repository MCP/);
        options.onStdout('{"type":"message.part.updated","sessionID":"session-1","properties":{"part":{"type":"text","text":"Safe reply"}}}\n');
        return { ok: true, exitCode: 0, stdout: "", stderr: "" };
      }
    });
    assert.equal(result.run.status, "completed");
    assert.equal(result.assistantMessage.content, "Safe reply");
  } finally {
    database.close();
  }
});

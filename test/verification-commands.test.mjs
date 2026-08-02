import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { openDatabase } from "../lib/database.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";
import {
  createRunApprovalRequest,
  decideRunApproval,
  emptyNeutralStore,
  readNeutralStore,
  replaceRepositoryVerificationCommands,
  writeNeutralStore
} from "../lib/neutral-store.mjs";
import { createVerificationCommandService } from "../lib/verification-commands.mjs";

const exec = promisify(execFile);
const timestamp = "2026-07-29T12:00:00.000Z";

test("runs only approved exact policies with bounded, sanitized results", { timeout: 30_000 }, async () => {
  const context = await verificationFixture("statuses");
  try {
    const service = createVerificationCommandService({ store: context.store, worktreeRoot: context.worktreeRoot, maxConcurrency: 1 });

    const passing = context.policy("Passing tests");
    await approvePolicy(context, passing);
    const passed = await service.execute("run-1", passing.id);
    assert.equal(passed.status, "passed");
    assert.equal(passed.exitCode, 0);
    assert.equal(passed.output.stdout, "tests passed");

    const failing = context.policy("Failing tests");
    await approvePolicy(context, failing);
    const failed = await service.execute("run-1", failing.id);
    assert.equal(failed.status, "failed");
    assert.equal(failed.exitCode, 3);
    assert.equal(failed.errorCode, "nonzero_exit");

    const sanitized = context.policy("Sanitized output");
    await approvePolicy(context, sanitized);
    const safe = await service.execute("run-1", sanitized.id);
    assert.equal(safe.status, "passed");
    assert.doesNotMatch(`${safe.output.stdout}${safe.output.stderr}`, /secret-value|glpat-/);
    assert.match(safe.output.stdout, /\[REDACTED\]/);
    assert.equal(safe.output.redactionCount, 2);

    const outputLimited = context.policy("Output limit");
    await approvePolicy(context, outputLimited);
    const bounded = await service.execute("run-1", outputLimited.id);
    assert.equal(bounded.status, "failed");
    assert.equal(bounded.errorCode, "output_limit_exceeded");
    assert.equal(bounded.output.truncated, true);
    assert.equal(bounded.output.capturedBytes, 1024);

    await assert.rejects(
      () => service.execute("run-1", "verification-command-000000000000000000000000"),
      error => error.code === "command_disallowed"
    );

    const timed = context.policy("Timeout");
    await approvePolicy(context, timed);
    const timedOut = await service.execute("run-1", timed.id);
    assert.equal(timedOut.status, "timed_out");
    assert.equal(timedOut.errorCode, "timeout");

    const cancellable = context.policy("Cancellable process tree");
    await approvePolicy(context, cancellable);
    const controller = new AbortController();
    const execution = service.execute("run-1", cancellable.id, { signal: controller.signal });
    await waitFor(() => service.activeCount() === 1);
    await assert.rejects(
      () => service.execute("another-run", passing.id),
      error => error.code === "concurrency_limit"
    );
    setTimeout(() => controller.abort(), 150);
    const cancelled = await execution;
    assert.equal(cancelled.status, "cancelled");
    await new Promise(resolve => setTimeout(resolve, 1_700));
    await assert.rejects(() => access(context.childMarker), error => error.code === "ENOENT");
  } finally {
    context.database.close();
    await rm(context.directory, { recursive: true, force: true });
  }
});

test("distinguishes launch errors and rejects unsafe policy configuration", { timeout: 15_000 }, async () => {
  const context = await verificationFixture("launch");
  try {
    await assert.rejects(
      () => replaceRepositoryVerificationCommands(context.store, "repository-1", { commands: [{ name: "Shell", executable: process.platform === "win32" ? "C:\\Windows\\System32\\cmd.exe" : "/bin/sh", args: [], environment: {} }] }),
      /Shell interpreters/
    );
    await assert.rejects(
      () => replaceRepositoryVerificationCommands(context.store, "repository-1", { commands: [{ name: "Relative", executable: "node", args: [], environment: {} }] }),
      /absolute path/
    );
    await assert.rejects(
      () => replaceRepositoryVerificationCommands(context.store, "repository-1", { commands: [{ name: "Secret env", executable: process.execPath, args: [], environment: { API_TOKEN: "no" } }] }),
      /not allowlisted/
    );

    const passing = context.policy("Passing tests");
    await approvePolicy(context, passing);
    const spawnProcess = () => {
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.pid = null;
      child.exitCode = null;
      queueMicrotask(() => { child.emit("error", Object.assign(new Error("launch failed"), { code: "EACCES" })); child.emit("close", null, null); });
      return child;
    };
    const service = createVerificationCommandService({ store: context.store, worktreeRoot: context.worktreeRoot, spawnProcess });
    const result = await service.execute("run-1", passing.id);
    assert.equal(result.status, "launch_error");
    assert.equal(result.errorCode, "launch_error");
  } finally {
    context.database.close();
    await rm(context.directory, { recursive: true, force: true });
  }
});

test("exposes policy discovery and approved execution through the Repository MCP", { timeout: 30_000 }, async () => {
  const context = await verificationFixture("mcp");
  const auditPath = join(context.directory, "audit", "run-1.jsonl");
  let client;
  try {
    const passing = context.policy("Passing tests");
    await approvePolicy(context, passing);
    context.database.close();
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        fileURLToPath(new URL("../scripts/ahive-repository-mcp.mjs", import.meta.url)),
        "--database", context.databasePath,
        "--repository", "repository-1",
        "--roots", JSON.stringify([context.directory]),
        "--audit", auditPath,
        "--run", "run-1",
        "--worktree-root", context.worktreeRoot
      ],
      stderr: "pipe"
    });
    client = new Client({ name: "ahive-verification-test", version: "1.0.0" });
    await client.connect(transport);
    const listed = await client.callTool({ name: "list_verification_commands", arguments: {} });
    assert.equal(listed.structuredContent.commands.some(command => command.id === passing.id), true);
    assert.equal(JSON.stringify(listed).includes(process.execPath), false);
    const executed = await client.callTool({ name: "run_verification", arguments: { policyId: passing.id } });
    assert.equal(executed.isError, undefined);
    assert.equal(executed.structuredContent.status, "passed");
    assert.equal(executed.structuredContent.output.stdout, "tests passed");
  } finally {
    await client?.close().catch(() => undefined);
    if (context.database.open) context.database.close();
    await rm(context.directory, { recursive: true, force: true });
  }
});

async function verificationFixture(label) {
  const directory = await mkdtemp(join(tmpdir(), `ahive-verification-${label}-`));
  const repositoryPath = join(directory, "base");
  const worktreeRoot = join(directory, "managed");
  const worktreePath = join(worktreeRoot, "repository-one", "run-one");
  const childMarker = join(directory, "child-survived.txt");
  await mkdir(join(repositoryPath, "tests"), { recursive: true });
  await writeFile(join(repositoryPath, "tests", "placeholder.txt"), "test fixture\n");
  await exec("git", ["init", "-b", "main", repositoryPath]);
  await exec("git", ["-C", repositoryPath, "config", "user.email", "test@ahive.local"]);
  await exec("git", ["-C", repositoryPath, "config", "user.name", "Ahive Test"]);
  await exec("git", ["-C", repositoryPath, "add", "."]);
  await exec("git", ["-C", repositoryPath, "commit", "-m", "base"]);
  await mkdir(join(worktreeRoot, "repository-one"), { recursive: true });
  await exec("git", ["-C", repositoryPath, "worktree", "add", "--detach", worktreePath, "HEAD"]);
  const canonicalRepository = await realpath(repositoryPath);
  const canonicalRoot = await realpath(worktreeRoot);
  const canonicalWorktree = await realpath(worktreePath);
  const baseCommit = (await exec("git", ["-C", repositoryPath, "rev-parse", "HEAD"])).stdout.trim();
  const databasePath = join(directory, "ahive.db");
  const database = openDatabase(databasePath);
  const store = createSqliteNeutralStore(database, databasePath);
  await writeNeutralStore(store, fixtureStore(canonicalRepository, canonicalRoot, canonicalWorktree, baseCommit));
  const parentCode = `const {spawn}=require('node:child_process');spawn(process.execPath,['-e',${JSON.stringify(`setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(childMarker)},'alive'),1200)`) }],{stdio:'ignore'});setInterval(()=>{},1000)`;
  const commands = [
    { name: "Passing tests", executable: process.execPath, args: ["-e", "process.stdout.write('tests passed')"], workingDirectory: "tests", environment: { CI: "true", NODE_ENV: "test" }, timeoutMs: 5_000, maxOutputBytes: 8_192 },
    { name: "Failing tests", executable: process.execPath, args: ["-e", "process.stderr.write('test failed');process.exit(3)"], environment: {}, timeoutMs: 5_000, maxOutputBytes: 8_192 },
    { name: "Sanitized output", executable: process.execPath, args: ["-e", "process.stdout.write('TOKEN=secret-value glpat-abcdefghijklmnop')"], environment: {}, timeoutMs: 5_000, maxOutputBytes: 8_192 },
    { name: "Output limit", executable: process.execPath, args: ["-e", "process.stdout.write('x'.repeat(2048))"], environment: {}, timeoutMs: 5_000, maxOutputBytes: 1_024 },
    { name: "Timeout", executable: process.execPath, args: ["-e", "setTimeout(()=>{},5000)"], environment: {}, timeoutMs: 1_000, maxOutputBytes: 8_192 },
    { name: "Cancellable process tree", executable: process.execPath, args: ["-e", parentCode], environment: {}, timeoutMs: 5_000, maxOutputBytes: 8_192 }
  ];
  const configured = await replaceRepositoryVerificationCommands(store, "repository-1", { commands });
  return {
    directory,
    childMarker,
    repositoryPath: canonicalRepository,
    worktreeRoot: canonicalRoot,
    worktreePath: canonicalWorktree,
    databasePath,
    database,
    store,
    policy: name => configured.verificationCommands.find(command => command.name === name)
  };
}

async function approvePolicy(context, policy) {
  const workspace = await readNeutralStore(context.store);
  const worktree = workspace.managedWorktrees[0];
  const request = await createRunApprovalRequest(context.store, "run-1", {
    capability: "repository.run_verification",
    targetType: "verification_command",
    targetId: `${worktree.id}:${policy.id}`,
    reason: `Run configured verification: ${policy.name}`,
    riskLevel: "medium",
    riskSummary: "An exact configured command will run in the managed worktree",
    requestedBy: "verification-test",
    expiresAt: new Date(Date.now() + 60 * 60 * 1_000).toISOString()
  });
  await decideRunApproval(context.store, "run-1", request.approval.id, { decision: "approved", actor: "maxwell" });
}

function fixtureStore(repositoryPath, rootPath, worktreePath, baseCommit) {
  return {
    ...emptyNeutralStore(),
    organizations: [{ id: "organization-1", name: "Rezzilla-Labs", active: true, createdAt: timestamp, updatedAt: timestamp }],
    projects: [{ id: "project-1", organizationId: "organization-1", name: "IRN", key: "irn", active: true, createdAt: timestamp, updatedAt: timestamp }],
    repositories: [{ id: "repository-1", projectId: "project-1", productId: null, name: "Base", localPath: repositoryPath, resolvedPath: repositoryPath, defaultBranch: "main", accessMode: "guarded_write", verificationCommands: [], verificationStatus: "verified", verifiedAt: timestamp, active: true, createdAt: timestamp, updatedAt: timestamp }],
    harnessAccounts: [{ id: "harness-1", provider: "openai", adapter: "codex-cli", displayName: "Local Codex", authMode: "codex_session", credentialReferences: {}, capabilities: ["codex_exec"], active: true, createdAt: timestamp, updatedAt: timestamp }],
    agentProfiles: [{ id: "profile-1", harnessAccountId: "harness-1", name: "Developer", model: "gpt-5.6-sol", modelSettings: {}, active: true, createdAt: timestamp, updatedAt: timestamp }],
    agentAssignments: [{ id: "assignment-1", agentProfileId: "profile-1", projectId: "project-1", productId: null, repositoryId: "repository-1", contextInstructions: null, active: true, createdAt: timestamp, updatedAt: timestamp }],
    agentTasks: [{ id: "task-1", agentAssignmentId: "assignment-1", projectId: "project-1", productId: null, repositoryId: "repository-1", issueId: null, objective: "Verify safely", status: "running", createdAt: timestamp, updatedAt: timestamp, completedAt: null }],
    conversations: [{ id: "conversation-1", agentTaskId: "task-1", title: null, status: "active", createdAt: timestamp, updatedAt: timestamp }],
    agentRuns: [{ id: "run-1", agentTaskId: "task-1", conversationId: "conversation-1", agentProfileSnapshot: { id: "profile-1", name: "Developer" }, assignmentSnapshot: { id: "assignment-1", project: { id: "project-1", name: "IRN" }, repository: { id: "repository-1", name: "Base" } }, harnessProvider: "openai", harnessAdapter: "codex-cli", model: "gpt-5.6-sol", status: "running", startedAt: timestamp, completedAt: null, usage: null, providerMetadata: {}, errorSummary: null, createdAt: timestamp, updatedAt: timestamp }],
    managedWorktrees: [{ id: "managed-worktree-1", repositoryId: "repository-1", agentTaskId: "task-1", agentRunId: "run-1", path: worktreePath, rootPath, baseCommit, baseBranch: "main", status: "ready", present: true, dirty: false, head: baseCommit, errorCode: null, createdAt: timestamp, updatedAt: timestamp, inspectedAt: timestamp, retainedAt: null, discardedAt: null }]
  };
}

async function waitFor(predicate) {
  for (let index = 0; index < 100; index += 1) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for verification service state.");
}

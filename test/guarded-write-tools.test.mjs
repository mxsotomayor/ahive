import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { openDatabase } from "../lib/database.mjs";
import { createGuardedWriteService, GuardedWriteError } from "../lib/guarded-write-tools.mjs";
import { createRunArtifactService } from "../lib/run-artifacts.mjs";
import {
  createRunApprovalRequest,
  decideRunApproval,
  emptyNeutralStore,
  listGuardedFileChanges,
  readNeutralStore,
  writeNeutralStore
} from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";

const exec = promisify(execFile);
const timestamp = "2026-07-29T12:00:00.000Z";

test("applies approved atomic changes only inside the managed worktree and records hashes", { timeout: 30_000 }, async () => {
  const context = await guardedFixture("service");
  try {
    const service = createGuardedWriteService({ store: context.store, worktreeRoot: context.worktreeRoot });
    const originalBase = await readFile(join(context.repositoryPath, "src", "app.mjs"), "utf8");
    const worktreeFile = join(context.worktreePath, "src", "app.mjs");
    const originalWorktree = await readFile(worktreeFile, "utf8");
    await approvePath(context.store, "src/app.mjs");
    const patched = await service.applyPatch("run-1", {
      path: "src/app.mjs",
      expectedSha256: hash(originalWorktree),
      replacements: [{ oldText: "return 'old';", newText: "return 'new';" }]
    });
    assert.equal(patched.beforeSha256, hash(originalWorktree));
    assert.equal(patched.afterSha256, hash(originalWorktree.replace("return 'old';", "return 'new';")));
    assert.match(await readFile(worktreeFile, "utf8"), /return 'new'/);
    assert.equal(await readFile(join(context.repositoryPath, "src", "app.mjs"), "utf8"), originalBase);

    await approvePath(context.store, "src/new.mjs");
    const created = await service.createFile("run-1", { path: "src/new.mjs", content: "export const added = true;\n" });
    assert.equal(created.beforeSha256, null);
    assert.equal(await readFile(join(context.worktreePath, "src", "new.mjs"), "utf8"), "export const added = true;\n");

    await assert.rejects(() => service.createFile("run-1", { path: "src/unapproved.mjs", content: "no\n" }), error => error.code === "approval_required");
    await assert.rejects(() => service.createFile("run-1", { path: "../outside.txt", content: "no\n" }), error => error.code === "invalid_path");
    await assert.rejects(() => service.createFile("run-1", { path: ".env", content: "SECRET=no\n" }), error => error.code === "file_excluded");
    await assert.rejects(() => service.createFile("run-1", { path: "src/huge.txt", content: "x".repeat(256 * 1024 + 1) }), error => error.code === "file_too_large");

    const outside = join(context.directory, "outside");
    await mkdir(outside);
    await writeFile(join(outside, "outside.txt"), "untouched\n");
    await symlink(outside, join(context.worktreePath, "escape"), "junction");
    await assert.rejects(() => service.createFile("run-1", { path: "escape/new.txt", content: "no\n" }), error => /parent/.test(error.code));
    assert.equal(await readFile(join(outside, "outside.txt"), "utf8"), "untouched\n");

    const beforeRollback = await readFile(worktreeFile, "utf8");
    await approvePath(context.store, "src/app.mjs");
    const failing = createGuardedWriteService({
      store: context.store,
      worktreeRoot: context.worktreeRoot,
      afterWrite: async () => { throw new Error("simulated persistence boundary failure"); }
    });
    await assert.rejects(() => failing.applyPatch("run-1", {
      path: "src/app.mjs",
      expectedSha256: hash(beforeRollback),
      replacements: [{ oldText: "return 'new';", newText: "return 'rollback-test';" }]
    }), error => error instanceof GuardedWriteError && error.code === "guarded_write_failed");
    assert.equal(await readFile(worktreeFile, "utf8"), beforeRollback);

    const events = listGuardedFileChanges(await readNeutralStore(context.store), "run-1");
    assert.deepEqual(events.map(event => event.status), ["completed", "completed", "failed"]);
    assert.deepEqual(events.slice(0, 2).map(event => event.relativePath), ["src/app.mjs", "src/new.mjs"]);
    assert.ok(events.every(event => /^[0-9a-f]{64}$/.test(event.afterSha256)));
    assert.equal(JSON.stringify(events).includes("return 'new'"), false);
    assert.equal(await readFile(join(context.repositoryPath, "src", "app.mjs"), "utf8"), originalBase);

    const artifactService = createRunArtifactService({ store: context.store, root: join(context.directory, "artifacts"), worktreeRoot: context.worktreeRoot });
    const artifacts = await artifactService.captureReview("run-1");
    assert.deepEqual([...new Set(artifacts.map(artifact => artifact.kind))].sort(), ["changed_files", "patch"]);
    const changed = await artifactService.read("run-1", artifacts.find(artifact => artifact.kind === "changed_files").id);
    assert.deepEqual(JSON.parse(changed.content).files.map(file => file.path), ["src/app.mjs", "src/new.mjs", "src/app.mjs"]);
    const patch = await artifactService.read("run-1", artifacts.find(artifact => artifact.kind === "patch").id);
    assert.match(patch.content, /return 'new'/);
    assert.match(patch.content, /src\/new\.mjs/);

    const restartedArtifacts = createRunArtifactService({ store: context.store, root: join(context.directory, "artifacts"), worktreeRoot: context.worktreeRoot });
    assert.equal((await restartedArtifacts.read("run-1", artifacts.find(artifact => artifact.kind === "patch").id)).content, patch.content);
  } finally {
    context.database.close();
    await rm(context.directory, { recursive: true, force: true });
  }
});

test("exposes guarded tools through MCP only when a worktree boundary is configured", { timeout: 30_000 }, async () => {
  const context = await guardedFixture("mcp");
  const auditPath = join(context.directory, "audit", "run-1.jsonl");
  let client;
  try {
    await approvePath(context.store, "src/from-mcp.mjs");
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
    client = new Client({ name: "ahive-guarded-test", version: "1.0.0" });
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(tool => tool.name).sort(), ["apply_patch", "create_file", "git_summary", "list_files", "list_verification_commands", "read_text", "run_verification", "search_text"]);
    assert.equal(tools.tools.find(tool => tool.name === "create_file").annotations.destructiveHint, true);
    const result = await client.callTool({ name: "create_file", arguments: { path: "src/from-mcp.mjs", content: "export const mcp = true;\n" } });
    assert.equal(result.isError, undefined);
    assert.equal(await readFile(join(context.worktreePath, "src", "from-mcp.mjs"), "utf8"), "export const mcp = true;\n");
    await client.close();
    client = null;
    const verificationDatabase = openDatabase(context.databasePath, { readonly: true });
    const persisted = createSqliteNeutralStore(verificationDatabase, `${context.databasePath}-verify`).readStore();
    assert.equal(persisted.fileChangeEvents[0].status, "completed");
    verificationDatabase.close();
  } finally {
    await client?.close().catch(() => undefined);
    if (context.database.open) context.database.close();
    await rm(context.directory, { recursive: true, force: true });
  }
});

async function guardedFixture(label) {
  const directory = await mkdtemp(join(tmpdir(), `ahive-guarded-${label}-`));
  const repositoryPath = join(directory, "base");
  const worktreeRoot = join(directory, "managed");
  const worktreePath = join(worktreeRoot, "repository-one", "run-one");
  await mkdir(join(repositoryPath, "src"), { recursive: true });
  await writeFile(join(repositoryPath, ".gitattributes"), "* text eol=lf\n");
  await writeFile(join(repositoryPath, "src", "app.mjs"), "export function value() {\n  return 'old';\n}\n");
  await exec("git", ["init", "-b", "main", repositoryPath]);
  await exec("git", ["-C", repositoryPath, "config", "user.email", "test@ahive.local"]);
  await exec("git", ["-C", repositoryPath, "config", "user.name", "Ahive Test"]);
  await exec("git", ["-C", repositoryPath, "add", ".gitattributes", "src/app.mjs"]);
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
  return { directory, repositoryPath: canonicalRepository, worktreeRoot: canonicalRoot, worktreePath: canonicalWorktree, databasePath, database, store };
}

async function approvePath(store, relativePath) {
  const workspace = await readNeutralStore(store);
  const worktree = workspace.managedWorktrees[0];
  const request = await createRunApprovalRequest(store, "run-1", {
    capability: "repository.modify_files",
    targetType: "repository_path",
    targetId: `${worktree.id}:${relativePath}`,
    reason: `Apply one reviewed change to ${relativePath}`,
    riskLevel: "medium",
    riskSummary: "One managed-worktree text file will change",
    requestedBy: "guarded-write-test",
    expiresAt: new Date(Date.now() + 60 * 60 * 1_000).toISOString()
  });
  await decideRunApproval(store, "run-1", request.approval.id, { decision: "approved", actor: "maxwell" });
}

function fixtureStore(repositoryPath, rootPath, worktreePath, baseCommit) {
  return {
    ...emptyNeutralStore(),
    organizations: [{ id: "organization-1", name: "Rezzilla", active: true, createdAt: timestamp, updatedAt: timestamp }],
    projects: [{ id: "project-1", organizationId: "organization-1", name: "IRN", key: "irn", active: true, createdAt: timestamp, updatedAt: timestamp }],
    repositories: [{ id: "repository-1", projectId: "project-1", productId: null, name: "Base", localPath: repositoryPath, resolvedPath: repositoryPath, accessMode: "guarded_write", verificationStatus: "verified", verifiedAt: timestamp, active: true, createdAt: timestamp, updatedAt: timestamp }],
    harnessAccounts: [{ id: "harness-1", provider: "openai", adapter: "codex-cli", displayName: "Local Codex", authMode: "codex_session", credentialReferences: {}, capabilities: ["codex_exec"], active: true, createdAt: timestamp, updatedAt: timestamp }],
    agentProfiles: [{ id: "profile-1", harnessAccountId: "harness-1", name: "Developer", model: "gpt-5.6-sol", modelSettings: {}, active: true, createdAt: timestamp, updatedAt: timestamp }],
    agentAssignments: [{ id: "assignment-1", agentProfileId: "profile-1", projectId: "project-1", productId: null, repositoryId: "repository-1", contextInstructions: null, active: true, createdAt: timestamp, updatedAt: timestamp }],
    agentTasks: [{ id: "task-1", agentAssignmentId: "assignment-1", projectId: "project-1", productId: null, repositoryId: "repository-1", issueId: null, objective: "Edit safely", status: "running", createdAt: timestamp, updatedAt: timestamp, completedAt: null }],
    conversations: [{ id: "conversation-1", agentTaskId: "task-1", title: null, status: "active", createdAt: timestamp, updatedAt: timestamp }],
    agentRuns: [{ id: "run-1", agentTaskId: "task-1", conversationId: "conversation-1", agentProfileSnapshot: { id: "profile-1", name: "Developer" }, assignmentSnapshot: { id: "assignment-1", project: { id: "project-1", name: "IRN" }, repository: { id: "repository-1", name: "Base" } }, harnessProvider: "openai", harnessAdapter: "codex-cli", model: "gpt-5.6-sol", status: "running", startedAt: timestamp, completedAt: null, usage: null, providerMetadata: {}, errorSummary: null, createdAt: timestamp, updatedAt: timestamp }],
    managedWorktrees: [{ id: "managed-worktree-1", repositoryId: "repository-1", agentTaskId: "task-1", agentRunId: "run-1", path: worktreePath, rootPath, baseCommit, baseBranch: "main", status: "ready", present: true, dirty: false, head: baseCommit, errorCode: null, createdAt: timestamp, updatedAt: timestamp, inspectedAt: timestamp, retainedAt: null, discardedAt: null }]
  };
}

function hash(value) { return createHash("sha256").update(value).digest("hex"); }

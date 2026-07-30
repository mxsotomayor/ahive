import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../lib/database.mjs";
import { createManagedWorktreeService, ManagedWorktreeError } from "../lib/git-worktrees.mjs";
import { runGit } from "../lib/git-inspection.mjs";
import {
  createRunApprovalRequest,
  decideRunApproval,
  emptyNeutralStore,
  getAgentRunManagedWorktree,
  readNeutralStore,
  writeNeutralStore
} from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";

const exec = promisify(execFile);
const timestamp = "2026-07-29T12:00:00.000Z";

test("creates deterministic isolated worktrees without touching dirty or clean base checkouts", { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-worktrees-"));
  const repositoryPath = join(directory, "base");
  const worktreeRoot = join(directory, "managed");
  let database;
  try {
    await exec("git", ["init", "-b", "main", repositoryPath]);
    await exec("git", ["-C", repositoryPath, "config", "user.email", "test@ahive.local"]);
    await exec("git", ["-C", repositoryPath, "config", "user.name", "Ahive Test"]);
    await writeFile(join(repositoryPath, ".gitattributes"), "* text eol=lf\n");
    await writeFile(join(repositoryPath, "tracked.txt"), "committed\n");
    await exec("git", ["-C", repositoryPath, "add", ".gitattributes", "tracked.txt"]);
    await exec("git", ["-C", repositoryPath, "commit", "-m", "base"]);
    const canonicalRepository = await realpath(repositoryPath);
    const baseCommit = (await runGit(canonicalRepository, ["rev-parse", "HEAD"])).stdout.trim();

    await writeFile(join(canonicalRepository, "tracked.txt"), "user change\n");
    await writeFile(join(canonicalRepository, "untracked.txt"), "keep me\n");
    const dirtyStatus = await gitStatus(canonicalRepository);
    const dirtyTracked = await readFile(join(canonicalRepository, "tracked.txt"), "utf8");
    const dirtyUntracked = await readFile(join(canonicalRepository, "untracked.txt"), "utf8");

    database = openDatabase(":memory:");
    const store = createSqliteNeutralStore(database, "managed-worktree-test");
    await writeNeutralStore(store, fixtureStore(canonicalRepository, baseCommit));
    const traces = [];
    const service = createManagedWorktreeService({
      store,
      repositoryRoots: [directory],
      worktreeRoot,
      onTrace: event => traces.push(event)
    });

    const approval1 = await approveWorktree(store, "run-1", "repository-1");
    const worktree1 = await service.create("run-1", approval1.id, { actor: "managed-worktree-test" });
    assert.equal(worktree1.status, "ready");
    assert.equal(worktree1.baseCommit, baseCommit);
    assert.equal(worktree1.baseBranch, "main");
    assert.equal(await readFile(join(worktree1.path, "tracked.txt"), "utf8"), "committed\n");
    assert.equal(await gitStatus(canonicalRepository), dirtyStatus);
    assert.equal(await readFile(join(canonicalRepository, "tracked.txt"), "utf8"), dirtyTracked);
    assert.equal(await readFile(join(canonicalRepository, "untracked.txt"), "utf8"), dirtyUntracked);

    await writeFile(join(worktree1.path, "tracked.txt"), "agent candidate\n");
    assert.equal((await service.inspect(worktree1.id)).dirty, true);
    assert.equal(await readFile(join(canonicalRepository, "tracked.txt"), "utf8"), dirtyTracked);

    const approval2 = await approveWorktree(store, "run-2", "repository-1");
    await assert.rejects(
      () => service.create("run-2", approval2.id, { actor: "managed-worktree-test" }),
      error => /active modifying Run lock/.test(error.message)
    );
    assert.equal((await readNeutralStore(store)).approvalRequests.find(item => item.id === approval2.id).status, "approved");

    await service.retain(worktree1.id);
    await writeFile(join(canonicalRepository, "tracked.txt"), "committed\n");
    await rm(join(canonicalRepository, "untracked.txt"));
    assert.equal(await gitStatus(canonicalRepository), "");
    const worktree2 = await service.create("run-2", approval2.id, { actor: "managed-worktree-test" });
    assert.equal(worktree2.status, "ready");
    assert.notEqual(worktree2.id, worktree1.id);
    assert.notEqual(worktree2.path, worktree1.path);
    assert.equal(await gitStatus(canonicalRepository), "");

    const restarted = createManagedWorktreeService({ store, repositoryRoots: [directory], worktreeRoot });
    const reconciled = await restarted.reconcile();
    assert.equal(reconciled.retained >= 1, true);
    assert.equal(getAgentRunManagedWorktree(await readNeutralStore(store), "run-2").status, "retained");

    await assert.rejects(
      () => service.discard(worktree1.id, { confirmDiscard: true, confirmationPath: worktree2.path }),
      error => error instanceof ManagedWorktreeError && error.code === "discard_target_mismatch"
    );
    await assert.rejects(
      () => service.discard(worktree1.id, { confirmationPath: worktree1.path }),
      error => error instanceof ManagedWorktreeError && error.code === "discard_confirmation_required"
    );
    const discarded = await service.discard(worktree1.id, { confirmDiscard: true, confirmationPath: worktree1.path });
    assert.equal(discarded.status, "discarded");
    assert.equal(discarded.present, false);

    await runGit(canonicalRepository, ["worktree", "remove", "--force", worktree2.path], { timeoutMs: 10_000 });
    const missing = await restarted.reconcile();
    assert.equal(missing.missing >= 1, true);
    assert.equal(getAgentRunManagedWorktree(await readNeutralStore(store), "run-2").status, "missing");
    assert.equal(traces.some(event => event.step === "worktree.create.completed"), true);
    assert.equal(traces.some(event => event.step === "worktree.discard.completed"), true);
  } finally {
    database?.close();
    await rm(directory, { recursive: true, force: true });
  }
});

async function approveWorktree(store, runId, repositoryId) {
  const requested = await createRunApprovalRequest(store, runId, {
    capability: "repository.create_worktree",
    targetType: "repository",
    targetId: repositoryId,
    reason: "Prepare an isolated workspace for reviewed changes",
    riskLevel: "low",
    riskSummary: "Git metadata and a managed detached worktree will be created",
    requestedBy: "managed-worktree-service",
    expiresAt: new Date(Date.now() + 60 * 60 * 1_000).toISOString()
  });
  return (await decideRunApproval(store, runId, requested.approval.id, {
    decision: "approved", actor: "maxwell"
  })).approval;
}

async function gitStatus(path) {
  return (await runGit(path, ["status", "--porcelain=v1", "--untracked-files=normal"])).stdout.trim();
}

function fixtureStore(repositoryPath, baseCommit) {
  const task = id => ({
    id: `task-${id}`, agentAssignmentId: "assignment-1", projectId: "project-1",
    productId: null, repositoryId: "repository-1", issueId: null, objective: `Work ${id}`,
    status: "running", createdAt: timestamp, updatedAt: timestamp, completedAt: null
  });
  const conversation = id => ({ id: `conversation-${id}`, agentTaskId: `task-${id}`, title: null, status: "active", createdAt: timestamp, updatedAt: timestamp });
  const run = id => ({
    id: `run-${id}`, agentTaskId: `task-${id}`, conversationId: `conversation-${id}`,
    agentProfileSnapshot: { id: "profile-1", name: "Developer" },
    assignmentSnapshot: { id: "assignment-1", project: { id: "project-1", name: "IRN" }, repository: { id: "repository-1", name: "Base" } },
    harnessProvider: "openai", harnessAdapter: "codex-cli", model: "gpt-5.6-sol",
    status: "running", startedAt: timestamp, completedAt: null, usage: null,
    providerMetadata: {}, errorSummary: null, createdAt: timestamp, updatedAt: timestamp
  });
  return {
    ...emptyNeutralStore(),
    organizations: [{ id: "organization-1", name: "Zing", active: true, createdAt: timestamp, updatedAt: timestamp }],
    projects: [{ id: "project-1", organizationId: "organization-1", name: "IRN", key: "irn", active: true, createdAt: timestamp, updatedAt: timestamp }],
    repositories: [{
      id: "repository-1", projectId: "project-1", productId: null, name: "Base", localPath: repositoryPath,
      resolvedPath: repositoryPath, accessMode: "guarded_write", verificationStatus: "verified", verifiedAt: timestamp,
      active: true, gitMetadata: { head: baseCommit, branch: "main" }, createdAt: timestamp, updatedAt: timestamp
    }],
    harnessAccounts: [{ id: "harness-1", provider: "openai", adapter: "codex-cli", displayName: "Local Codex", authMode: "codex_session", credentialReferences: {}, capabilities: ["codex_exec"], active: true, createdAt: timestamp, updatedAt: timestamp }],
    agentProfiles: [{ id: "profile-1", harnessAccountId: "harness-1", name: "Developer", model: "gpt-5.6-sol", modelSettings: {}, active: true, createdAt: timestamp, updatedAt: timestamp }],
    agentAssignments: [{ id: "assignment-1", agentProfileId: "profile-1", projectId: "project-1", productId: null, repositoryId: "repository-1", contextInstructions: null, active: true, createdAt: timestamp, updatedAt: timestamp }],
    agentTasks: [task("1"), task("2")],
    conversations: [conversation("1"), conversation("2")],
    agentRuns: [run("1"), run("2")]
  };
}

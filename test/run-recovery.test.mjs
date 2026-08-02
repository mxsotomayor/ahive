import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../lib/database.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";
import { emptyNeutralStore, readNeutralStore, writeNeutralStore } from "../lib/neutral-store.mjs";

const now = "2026-07-29T12:00:00.000Z";

test("startup reconciles interrupted chat, approval, guarded write, and external write phases without replay", { timeout: 40_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-run-recovery-"));
  const databasePath = join(directory, "ahive.db");
  const database = openDatabase(databasePath);
  await writeNeutralStore(createSqliteNeutralStore(database, databasePath), fixtureStore(directory));
  database.close();
  const port = await availablePort();
  let runtime;
  try {
    runtime = await startServer(port, databasePath, directory);
    const health = await request(port, "/api/health");
    assert.equal(health.status, 200);
    assert.equal(health.payload.status, "degraded");
    assert.equal(health.payload.recovery.activeRuns, 0);
    assert.equal(health.payload.recovery.unacknowledgedRuns, 2);
    assert.equal(health.payload.recovery.staleWorktreeLocks, 1);
    assert.equal(health.payload.recovery.authorizedFileChanges, 0);
    assert.equal(health.payload.recovery.uncertainWritebacks, 1);
    assert.equal(health.payload.recovery.automaticReplays, 0);
    assert.equal(health.payload.metrics.failureClassifications.manual_review, 1);
    assert.equal(health.payload.metrics.failureClassifications.retryable, 1);
    assert.equal(health.payload.metrics.toolEvents, 1);
    assert.equal(health.payload.metrics.usage.inputTokens, 20);
    assert.doesNotMatch(JSON.stringify(health.payload), /super-secret|hidden reasoning|Resolve secret production issue/i);

    const after = await readDatabase(databasePath);
    assert.deepEqual(after.agentRuns.map(run => run.status), ["interrupted", "interrupted", "completed"]);
    assert.deepEqual(after.agentTasks.map(task => task.status), ["failed", "failed", "completed"]);
    assert.equal(after.agentRuns[0].recovery.classification, "manual_review");
    assert.equal(after.agentRuns[1].recovery.classification, "retryable");
    assert.equal(after.approvalRequests.find(item => item.id === "approval-waiting").status, "cancelled");
    assert.equal(after.fileChangeEvents[0].status, "failed");
    assert.equal(after.issueWritebacks[0].status, "failed");
    assert.equal(after.externalIssueLinks[0].syncState, "unknown");
    assert.equal(after.managedWorktrees[0].status, "ready", "worktree content remains retained until an explicit disposition");
    assert.equal(after.runArtifacts[0].id, "artifact-1", "existing bounded artifacts remain attached to the interrupted Run");

    const retained = await request(port, "/api/managed-worktrees/worktree-1/retain", { method: "POST", body: {} });
    assert.equal(retained.status, 200);
    assert.equal(retained.payload.managedWorktree.status, "retained");
    for (const runId of ["run-1", "run-2"]) {
      const acknowledged = await request(port, `/api/agent-runs/${runId}/recovery/acknowledge`, { method: "POST", body: { actor: "recovery-test" } });
      assert.equal(acknowledged.status, 200);
      assert.equal(acknowledged.payload.agentRun.recovery.acknowledgedBy, "recovery-test");
    }
    const manual = await request(port, "/api/operations/reconcile", { method: "POST", body: {} });
    assert.equal(manual.status, 200);
    assert.equal(manual.payload.recovery.interruptedRuns, 0);
    assert.equal(manual.payload.automaticReplays, 0);

    await stopServer(runtime.child);
    runtime = await startServer(port, databasePath, directory);
    const restarted = await request(port, "/api/health");
    assert.equal(restarted.payload.recovery.activeRuns, 0);
    assert.equal(restarted.payload.recovery.staleWorktreeLocks, 0);
    assert.equal(restarted.payload.recovery.unacknowledgedRuns, 0);
    assert.equal(restarted.payload.recovery.lastStartup.interruptedRuns, 0);
    assert.doesNotMatch(runtime.output(), /super-secret|hidden reasoning/i);
  } finally {
    await stopServer(runtime?.child);
    await rm(directory, { recursive: true, force: true });
  }
});

function fixtureStore(directory) {
  const run = (id, taskId, status) => ({ id, agentTaskId: taskId, conversationId: `conversation-${id.at(-1)}`, agentProfileSnapshot: { id: "profile-1", name: "Developer" }, assignmentSnapshot: { id: "assignment-1", project: { id: "project-1", name: "IRN" } }, harnessProvider: "openai", harnessAdapter: "codex-cli", model: "gpt-5.6-sol", status, startedAt: now, completedAt: status === "completed" ? now : null, usage: id === "run-1" ? { input_tokens: 20, output_tokens: 5 } : null, toolActivity: id === "run-1" ? [{ tool: "apply_patch", phase: "authorized", timestamp: now }] : [], providerMetadata: {}, errorSummary: null, createdAt: now, updatedAt: now });
  const task = (id, issueId, status) => ({ id, agentAssignmentId: "assignment-1", projectId: "project-1", productId: "product-1", repositoryId: "repository-1", issueId, objective: "Resolve secret production issue", status, createdAt: now, updatedAt: now, completedAt: status === "completed" ? now : null });
  return {
    ...emptyNeutralStore(),
    organizations: [{ id: "organization-1", name: "Rezzilla-Labs", active: true, createdAt: now, updatedAt: now }],
    projects: [{ id: "project-1", organizationId: "organization-1", name: "IRN", key: "irn", active: true, createdAt: now, updatedAt: now }],
    products: [{ id: "product-1", projectId: "project-1", name: "Portal", key: "portal", active: true, createdAt: now, updatedAt: now }],
    connectorAccounts: [{ id: "account-1", provider: "gitlab", displayName: "GitLab", baseUrl: "https://gitlab.example.test", credentialReference: "GITLAB_TOKEN", capabilities: ["close"], active: true, createdAt: now, updatedAt: now }],
    productSources: [{ id: "source-1", productId: "product-1", connectorAccountId: "account-1", provider: "gitlab", externalContainerId: "10", displayName: "Portal", capabilities: ["close"], active: true, createdAt: now, updatedAt: now }],
    issues: [{ id: "issue-1", productId: "product-1", originProductSourceId: "source-1", title: "Private issue title", description: "hidden reasoning", status: "todo", priority: "high", labels: [], version: 1, createdAt: now, updatedAt: now }],
    externalIssueLinks: [{ id: "link-1", issueId: "issue-1", productSourceId: "source-1", role: "origin", externalIssueId: "91", syncState: "current", createdAt: now, updatedAt: now }],
    repositories: [{ id: "repository-1", projectId: "project-1", productId: "product-1", name: "Portal", localPath: join(directory, "repository"), resolvedPath: join(directory, "repository"), accessMode: "guarded_write", verificationStatus: "verified", verificationCommands: [], active: true, createdAt: now, updatedAt: now }],
    harnessAccounts: [{ id: "harness-1", provider: "openai", adapter: "codex-cli", displayName: "Local Codex", authMode: "codex_session", credentialReferences: {}, capabilities: ["codex_exec"], active: true, createdAt: now, updatedAt: now }],
    agentProfiles: [{ id: "profile-1", harnessAccountId: "harness-1", name: "Developer", model: "gpt-5.6-sol", modelSettings: {}, active: true, createdAt: now, updatedAt: now }],
    agentAssignments: [{ id: "assignment-1", agentProfileId: "profile-1", projectId: "project-1", productId: "product-1", repositoryId: "repository-1", contextInstructions: null, active: true, createdAt: now, updatedAt: now }],
    agentTasks: [task("task-1", "issue-1", "running"), task("task-2", null, "waiting_approval"), task("task-3", "issue-1", "completed")],
    conversations: [1, 2, 3].map(id => ({ id: `conversation-${id}`, agentTaskId: `task-${id}`, title: null, status: "active", createdAt: now, updatedAt: now })),
    messages: [{ id: "message-secret", conversationId: "conversation-1", role: "user", content: "token=super-secret", sequence: 1, metadata: {}, createdAt: now }],
    agentRuns: [run("run-1", "task-1", "running"), run("run-2", "task-2", "waiting_approval"), run("run-3", "task-3", "completed")],
    approvalRequests: [
      { id: "approval-waiting", agentRunId: "run-2", capability: "repository.run_verification", targetType: "verification_command", targetId: "worktree:policy", reason: "Run tests", riskLevel: "low", riskSummary: "Fixed policy", requestedBy: "agent", status: "pending", requestedAt: now, expiresAt: "2026-07-30T11:00:00.000Z", decidedAt: null, decidedBy: null, decisionNote: null, consumedAt: null, consumedBy: null, cancelledAt: null, cancelledBy: null, updatedAt: now },
      { id: "approval-writeback", agentRunId: "run-3", capability: "external.issue.write", targetType: "external_issue", targetId: "link-1:status:done", reason: "Close Issue", riskLevel: "medium", riskSummary: "Origin status only", requestedBy: "user", status: "consumed", requestedAt: now, expiresAt: "2026-07-30T11:00:00.000Z", decidedAt: now, decidedBy: "user", decisionNote: null, consumedAt: now, consumedBy: "user", cancelledAt: null, cancelledBy: null, runStateEffect: "preserve_terminal", issueWritebackId: "writeback-1", updatedAt: now }
    ],
    issueWritebacks: [{ id: "writeback-1", agentRunId: "run-3", agentTaskId: "task-3", issueId: "issue-1", externalIssueLinkId: "link-1", productSourceId: "source-1", approvalRequestId: "approval-writeback", provider: "gitlab", previousStatus: "todo", requestedStatus: "done", targetId: "link-1:status:done", status: "executing", attemptCount: 1, upstreamState: null, errorCode: null, errorMessage: null, createdAt: now, updatedAt: now, attemptedAt: now, completedAt: null }],
    managedWorktrees: [{ id: "worktree-1", repositoryId: "repository-1", agentTaskId: "task-1", agentRunId: "run-1", path: join(directory, "worktrees", "run-1"), rootPath: join(directory, "worktrees"), status: "ready", baseCommit: "a".repeat(40), baseBranch: "main", present: true, dirty: true, head: "a".repeat(40), errorCode: null, createdAt: now, updatedAt: now }],
    fileChangeEvents: [{ id: "change-1", managedWorktreeId: "worktree-1", agentRunId: "run-1", sequence: 1, operation: "apply_patch", relativePath: "src/app.js", beforeSha256: "b".repeat(64), afterSha256: "c".repeat(64), beforeBytes: 10, afterBytes: 12, status: "authorized", errorCode: null, createdAt: now, updatedAt: now, completedAt: null, failedAt: null }],
    runArtifacts: [{ id: "artifact-1", agentRunId: "run-1", kind: "bounded_log", storageReference: `${"d".repeat(64)}.artifact`, contentHash: "d".repeat(64), sizeBytes: 42, mimeType: "text/plain", redactionCount: 1, retentionUntil: "2026-08-29T12:00:00.000Z", metadata: {}, createdAt: now }]
  };
}

async function readDatabase(path) {
  const database = openDatabase(path);
  try { return await readNeutralStore(createSqliteNeutralStore(database, path)); }
  finally { database.close(); }
}

async function startServer(port, databasePath, directory) {
  const child = spawn(process.execPath, ["server.mjs"], { cwd: process.cwd(), windowsHide: true, env: { ...process.env, PORT: String(port), AHIVE_DATABASE_PATH: databasePath, AHIVE_LEGACY_STORE_PATH: join(directory, "missing.json"), AHIVE_ARTIFACT_ROOT: join(directory, "artifacts"), AHIVE_WORKTREE_ROOT: "" }, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk.toString(); });
  child.stderr.on("data", chunk => { output += chunk.toString(); });
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Server exited before readiness: ${output}`);
    try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return { child, output: () => output }; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not become ready: ${output}`);
}

async function stopServer(child) {
  if (child && child.exitCode === null) { child.kill(); await once(child, "exit"); }
}

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  server.close();
  await once(server, "close");
  return port;
}

async function request(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { method: options.method || "GET", headers: options.body ? { "Content-Type": "application/json" } : undefined, body: options.body ? JSON.stringify(options.body) : undefined });
  return { status: response.status, payload: await response.json() };
}

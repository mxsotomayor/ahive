import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../lib/database.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";
import { emptyNeutralStore, readNeutralStore, writeNeutralStore } from "../lib/neutral-store.mjs";

const now = "2026-07-29T12:00:00.000Z";

test("approved Issue write-back updates the GitLab origin first and preserves denial and failure evidence", { timeout: 35_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-issue-writeback-"));
  const gitlab = await fakeGitLab();
  const databasePath = join(directory, "ahive.db");
  const database = openDatabase(databasePath);
  await writeNeutralStore(createSqliteNeutralStore(database, databasePath), fixtureStore(gitlab.baseUrl));
  database.close();
  const port = await availablePort();
  let child;
  try {
    child = await startServer(port, databasePath, directory);

    const initial = await request(port, "/api/agent-runs/run-1/issue-writeback");
    assert.equal(initial.status, 200);
    assert.equal(initial.payload.issueWriteback.available, true);
    assert.equal(initial.payload.issueWriteback.preview.issue.title, "Fix login");
    assert.equal(initial.payload.issueWriteback.preview.source.displayName, "Portal");
    assert.equal(initial.payload.issueWriteback.preview.requestedStatus, "done");
    assert.equal(gitlab.requests.length, 0, "preview must be dry-run only");

    const deniedRequest = await request(port, "/api/agent-runs/run-1/issue-writeback/approval", {
      method: "POST", body: { requestedStatus: "done", requestedBy: "test-user" }
    });
    assert.equal(deniedRequest.status, 201);
    assert.match(deniedRequest.payload.approvalRequest.targetId, /^link-1:status:done$/);
    const denied = await request(port, `/api/agent-runs/run-1/approvals/${deniedRequest.payload.approvalRequest.id}/decision`, {
      method: "POST", body: { decision: "denied", actor: "test-user" }
    });
    assert.equal(denied.status, 200);
    assert.equal(denied.payload.agentRun.status, "completed");
    assert.equal(gitlab.requests.length, 0);
    assert.equal((await request(port, "/api/local/workspace")).payload.issues.find(item => item.id === "issue-1").status, "todo");

    const approvedRequest = await request(port, "/api/agent-runs/run-1/issue-writeback/approval", {
      method: "POST", body: { requestedStatus: "done", requestedBy: "test-user" }
    });
    await request(port, `/api/agent-runs/run-1/approvals/${approvedRequest.payload.approvalRequest.id}/decision`, {
      method: "POST", body: { decision: "approved", actor: "test-user" }
    });
    const executed = await request(port, "/api/agent-runs/run-1/issue-writeback/execute", {
      method: "POST", body: { approvalRequestId: approvedRequest.payload.approvalRequest.id, actor: "test-user" }
    });
    assert.equal(executed.status, 200);
    assert.equal(executed.payload.issueWriteback.status, "succeeded");
    assert.equal(gitlab.requests.length, 1);
    assert.deepEqual(gitlab.requests[0].body, { state_event: "close" });
    assert.equal((await request(port, "/api/local/workspace")).payload.issues.find(item => item.id === "issue-1").status, "done");
    assert.equal((await request(port, "/api/agent-runs/run-1/issue-writeback/execute", {
      method: "POST", body: { approvalRequestId: approvedRequest.payload.approvalRequest.id, actor: "test-user" }
    })).status, 409, "a consumed approval cannot be replayed");

    gitlab.fail = true;
    const failedRequest = await request(port, "/api/agent-runs/run-2/issue-writeback/approval", {
      method: "POST", body: { requestedStatus: "done", requestedBy: "test-user" }
    });
    await request(port, `/api/agent-runs/run-2/approvals/${failedRequest.payload.approvalRequest.id}/decision`, {
      method: "POST", body: { decision: "approved", actor: "test-user" }
    });
    const failed = await request(port, "/api/agent-runs/run-2/issue-writeback/execute", {
      method: "POST", body: { approvalRequestId: failedRequest.payload.approvalRequest.id, actor: "test-user" }
    });
    assert.equal(failed.status, 502);
    assert.equal(failed.payload.issueWriteback.status, "failed");
    const failedView = await request(port, "/api/agent-runs/run-2/issue-writeback");
    assert.equal(failedView.payload.issueWriteback.available, true);
    assert.equal(failedView.payload.issueWriteback.attempts[0].status, "failed");
    const workspace = await request(port, "/api/local/workspace");
    assert.equal(workspace.payload.issues.find(item => item.id === "issue-2").status, "todo");
    assert.equal(workspace.payload.externalIssueLinks.find(item => item.id === "link-2").syncState, "unknown");

    const persistedDatabase = openDatabase(databasePath);
    const persisted = await readNeutralStore(createSqliteNeutralStore(persistedDatabase, databasePath));
    persistedDatabase.close();
    assert.equal(persisted.issueWritebacks.length, 3);
    assert.deepEqual(persisted.agentRuns.map(run => run.status), ["completed", "completed"]);
  } finally {
    if (child && child.exitCode === null) { child.kill(); await once(child, "exit"); }
    await gitlab.close();
    await rm(directory, { recursive: true, force: true });
  }
});

function fixtureStore(baseUrl) {
  const issue = (id, sourceId, title) => ({ id, productId: "product-1", originProductSourceId: sourceId, title, description: "Do the work.", status: "todo", priority: "high", labels: [], version: 1, createdAt: now, updatedAt: now });
  const task = (id, issueId) => ({ id, agentAssignmentId: "assignment-1", projectId: "project-1", productId: "product-1", repositoryId: null, issueId, objective: "Resolve it", status: "completed", createdAt: now, updatedAt: now, completedAt: now });
  const conversation = id => ({ id: `conversation-${id}`, agentTaskId: `task-${id}`, title: null, status: "active", createdAt: now, updatedAt: now });
  const run = id => ({ id: `run-${id}`, agentTaskId: `task-${id}`, conversationId: `conversation-${id}`, agentProfileSnapshot: { id: "profile-1", name: "Developer" }, assignmentSnapshot: { id: "assignment-1", project: { id: "project-1", name: "IRN" } }, harnessProvider: "openai", harnessAdapter: "codex-cli", model: "gpt-5.6-sol", status: "completed", startedAt: now, completedAt: now, usage: null, providerMetadata: {}, errorSummary: null, createdAt: now, updatedAt: now });
  return {
    ...emptyNeutralStore(),
    organizations: [{ id: "organization-1", name: "Zing", active: true, createdAt: now, updatedAt: now }],
    projects: [{ id: "project-1", organizationId: "organization-1", name: "IRN", key: "irn", active: true, createdAt: now, updatedAt: now }],
    products: [{ id: "product-1", projectId: "project-1", name: "Portal", key: "portal", active: true, createdAt: now, updatedAt: now }],
    connectorAccounts: [{ id: "account-1", provider: "gitlab", displayName: "GitLab test", baseUrl, credentialReference: "GITLAB_TOKEN", capabilities: ["read", "close", "reopen"], active: true, createdAt: now, updatedAt: now }],
    productSources: [{ id: "source-1", productId: "product-1", connectorAccountId: "account-1", provider: "gitlab", externalContainerId: "10", displayName: "Portal", capabilities: ["read", "close", "reopen"], active: true, createdAt: now, updatedAt: now }],
    issues: [issue("issue-1", "source-1", "Fix login"), issue("issue-2", "source-1", "Fix logout")],
    externalIssueLinks: [
      { id: "link-1", issueId: "issue-1", productSourceId: "source-1", role: "origin", externalIssueId: "91", externalUrl: `${baseUrl}/portal/-/issues/91`, syncState: "current", createdAt: now, updatedAt: now },
      { id: "link-2", issueId: "issue-2", productSourceId: "source-1", role: "origin", externalIssueId: "92", externalUrl: `${baseUrl}/portal/-/issues/92`, syncState: "current", createdAt: now, updatedAt: now }
    ],
    harnessAccounts: [{ id: "harness-1", provider: "openai", adapter: "codex-cli", displayName: "Local Codex", authMode: "codex_session", credentialReferences: {}, capabilities: ["codex_exec"], active: true, createdAt: now, updatedAt: now }],
    agentProfiles: [{ id: "profile-1", harnessAccountId: "harness-1", name: "Developer", model: "gpt-5.6-sol", modelSettings: {}, active: true, createdAt: now, updatedAt: now }],
    agentAssignments: [{ id: "assignment-1", agentProfileId: "profile-1", projectId: "project-1", productId: "product-1", repositoryId: null, contextInstructions: null, active: true, createdAt: now, updatedAt: now }],
    agentTasks: [task("task-1", "issue-1"), task("task-2", "issue-2")],
    conversations: [conversation("1"), conversation("2")],
    agentRuns: [run("1"), run("2")]
  };
}

async function fakeGitLab() {
  const state = { requests: [], fail: false };
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    state.requests.push({ method: request.method, url: request.url, body: body ? JSON.parse(body) : null });
    response.setHeader("Content-Type", "application/json");
    if (state.fail) { response.statusCode = 500; response.end(JSON.stringify({ message: "temporary upstream failure" })); return; }
    response.end(JSON.stringify({ state: "closed" }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return Object.assign(state, {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    async close() { server.close(); await once(server, "close"); }
  });
}

async function startServer(port, databasePath, directory) {
  const child = spawn(process.execPath, ["server.mjs"], { cwd: process.cwd(), windowsHide: true, env: { ...process.env, PORT: String(port), GITLAB_TOKEN: "test-token", AHIVE_DATABASE_PATH: databasePath, AHIVE_LEGACY_STORE_PATH: join(directory, "missing.json"), AHIVE_ARTIFACT_ROOT: join(directory, "artifacts") }, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk.toString(); });
  child.stderr.on("data", chunk => { output += chunk.toString(); });
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Server exited before readiness: ${output}`);
    try { if ((await fetch(`http://127.0.0.1:${port}/api/local/workspace`)).ok) return child; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not become ready: ${output}`);
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

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../lib/database.mjs";
import { emptyNeutralStore, writeNeutralStore } from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";

const now = "2026-07-29T12:00:00.000Z";

test("Issue Agent API creates only a scoped Task and preserves external identity", { timeout: 25_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-issue-agent-api-"));
  const databasePath = join(directory, "ahive.db");
  const database = openDatabase(databasePath);
  await writeNeutralStore(createSqliteNeutralStore(database, databasePath), fixtureStore());
  database.close();
  const port = await availablePort();
  let child;
  try {
    child = spawn(process.execPath, ["server.mjs"], {
      cwd: process.cwd(), windowsHide: true,
      env: {
        ...process.env,
        PORT: String(port),
        AHIVE_DATABASE_PATH: databasePath,
        AHIVE_LEGACY_STORE_PATH: join(directory, "missing.json"),
        AHIVE_ARTIFACT_ROOT: join(directory, "artifacts"),
        MAXWELL_ORGANIZATION_NAME: "Rezzilla",
        MAXWELL_PROJECT_NAME: "IRN",
        MAXWELL_PRODUCT_NAME: "Portal"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk.toString(); });
    child.stderr.on("data", chunk => { output += chunk.toString(); });
    await waitForServer(port, child, () => output);

    const before = await request(port, "/api/local/workspace");
    const issueBefore = structuredClone(before.payload.issues.find(item => item.id === "issue-1"));
    const linksBefore = structuredClone(before.payload.externalIssueLinks);
    const work = await request(port, "/api/issues/issue-1/agent-work");
    assert.equal(work.status, 200);
    assert.deepEqual(work.payload.compatibleAssignments.map(item => item.id), ["assignment-1"]);
    assert.equal(work.payload.compatibleAssignments[0].effectiveContext.repository.id, "repository-1");
    assert.equal(work.payload.issue.origin.externalIssueId, "91");

    const created = await request(port, "/api/agent-tasks", {
      method: "POST",
      body: { agentAssignmentId: "assignment-1", issueId: "issue-1", objective: "Resolve the linked Issue" }
    });
    assert.equal(created.status, 201);
    assert.equal(created.payload.agentTask.issueId, "issue-1");
    assert.equal(created.payload.agentTask.repositoryId, "repository-1");
    assert.equal(created.payload.agentTask.issueContext.origin.provider, "gitlab");

    const incompatible = await request(port, "/api/agent-tasks", {
      method: "POST",
      body: { agentAssignmentId: "assignment-2", issueId: "issue-1", objective: "Cross Product" }
    });
    assert.equal(incompatible.status, 409);
    assert.match(incompatible.payload.error, /Assignment Product/);

    const after = await request(port, "/api/local/workspace");
    assert.deepEqual(after.payload.issues.find(item => item.id === "issue-1"), issueBefore);
    assert.deepEqual(after.payload.externalIssueLinks, linksBefore);
    const localIssues = await request(port, "/api/local/issues");
    const linked = localIssues.payload.issues.find(item => item.maxwellIssueId === "issue-1");
    assert.equal(linked.agentTasks.length, 1);
    assert.equal(linked.agentTasks[0].id, created.payload.agentTask.id);
  } finally {
    if (child && child.exitCode === null) {
      child.kill();
      await once(child, "exit");
    }
    await rm(directory, { recursive: true, force: true });
  }
});

function fixtureStore() {
  return {
    ...emptyNeutralStore(),
    organizations: [{ id: "organization-1", name: "Rezzilla", active: true, createdAt: now, updatedAt: now }],
    projects: [{ id: "project-1", organizationId: "organization-1", name: "IRN", key: "irn", active: true, createdAt: now, updatedAt: now }],
    products: [
      { id: "product-1", projectId: "project-1", name: "Portal", key: "portal", active: true, createdAt: now, updatedAt: now },
      { id: "product-2", projectId: "project-1", name: "Other", key: "other", active: true, createdAt: now, updatedAt: now }
    ],
    connectorAccounts: [{ id: "account-1", provider: "gitlab", displayName: "GitLab", baseUrl: "https://gitlab.example.test", credentialReference: "GITLAB_TOKEN", active: true, createdAt: now, updatedAt: now }],
    productSources: [
      { id: "source-1", productId: "product-1", connectorAccountId: "account-1", provider: "gitlab", externalContainerId: "10", displayName: "Portal", active: true, createdAt: now, updatedAt: now },
      { id: "source-2", productId: "product-2", connectorAccountId: "account-1", provider: "gitlab", externalContainerId: "20", displayName: "Other", active: true, createdAt: now, updatedAt: now }
    ],
    issues: [
      { id: "issue-1", productId: "product-1", originProductSourceId: "source-1", title: "Fix login", description: "Preserve the redirect.", status: "todo", priority: "high", labels: ["frontend"], createdAt: now, updatedAt: now },
      { id: "issue-2", productId: "product-2", originProductSourceId: "source-2", title: "Other", description: "Other work.", status: "todo", priority: "low", labels: [], createdAt: now, updatedAt: now }
    ],
    externalIssueLinks: [
      { id: "link-1", issueId: "issue-1", productSourceId: "source-1", role: "origin", externalIssueId: "91", externalUrl: "https://gitlab.example.test/portal/-/issues/91", createdAt: now, updatedAt: now },
      { id: "link-2", issueId: "issue-2", productSourceId: "source-2", role: "origin", externalIssueId: "92", createdAt: now, updatedAt: now }
    ],
    repositories: [
      { id: "repository-1", projectId: "project-1", productId: "product-1", name: "Portal repo", localPath: join(process.cwd(), "test"), resolvedPath: join(process.cwd(), "test"), accessMode: "read_only", verificationStatus: "verified", verificationCommands: [], active: true, createdAt: now, updatedAt: now },
      { id: "repository-2", projectId: "project-1", productId: "product-2", name: "Other repo", localPath: join(process.cwd(), "lib"), resolvedPath: join(process.cwd(), "lib"), accessMode: "read_only", verificationStatus: "verified", verificationCommands: [], active: true, createdAt: now, updatedAt: now }
    ],
    harnessAccounts: [{ id: "harness-1", provider: "openai", adapter: "codex-cli", displayName: "Local Codex", authMode: "codex_session", credentialReferences: {}, capabilities: ["codex_exec"], active: true, createdAt: now, updatedAt: now }],
    agentProfiles: [{ id: "profile-1", harnessAccountId: "harness-1", name: "Developer", description: null, traitDescription: null, instructions: null, model: "gpt-5.6-sol", modelSettings: {}, defaultToolPolicyId: null, active: true, createdAt: now, updatedAt: now }],
    agentAssignments: [
      { id: "assignment-1", agentProfileId: "profile-1", projectId: "project-1", productId: "product-1", repositoryId: "repository-1", contextInstructions: null, active: true, createdAt: now, updatedAt: now },
      { id: "assignment-2", agentProfileId: "profile-1", projectId: "project-1", productId: "product-2", repositoryId: "repository-2", contextInstructions: null, active: true, createdAt: now, updatedAt: now }
    ]
  };
}

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  server.close();
  await once(server, "close");
  return port;
}

async function waitForServer(port, child, output) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Server exited before readiness: ${output()}`);
    try { if ((await fetch(`http://127.0.0.1:${port}/api/local/workspace`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not become ready: ${output()}`);
}

async function request(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  return { status: response.status, payload: await response.json() };
}

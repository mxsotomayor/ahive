import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../lib/database.mjs";
import { writeNeutralStore } from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";
import { agentRunFixtureStore } from "../test-support/agent-run-fixture.mjs";

test("Approval Request API creates, decides, lists, and traces durable decisions", { timeout: 20_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-approval-api-"));
  const databasePath = join(directory, "ahive.db");
  const database = openDatabase(databasePath);
  database.close();
  const port = await availablePort();
  let child;
  try {
    child = spawn(process.execPath, ["server.mjs"], {
      cwd: process.cwd(),
      windowsHide: true,
      env: {
        ...process.env,
        PORT: String(port),
        AHIVE_DATABASE_PATH: databasePath,
        AHIVE_LEGACY_STORE_PATH: join(directory, "missing.json"),
        MAXWELL_ORGANIZATION_NAME: "Zing",
        MAXWELL_PROJECT_NAME: "IRN",
        MAXWELL_PRODUCT_NAME: "Portal"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk.toString(); });
    child.stderr.on("data", chunk => { output += chunk.toString(); });
    await waitForServer(port, child, () => output);
    const fixtureDatabase = openDatabase(databasePath);
    await writeNeutralStore(createSqliteNeutralStore(fixtureDatabase, databasePath), agentRunFixtureStore());
    fixtureDatabase.close();

    const created = await request(port, "/api/agent-runs/run-1/approvals", {
      method: "POST",
      body: {
        capability: "repository.modify_files",
        targetType: "repository_path",
        targetId: "repository-1:src/app.js",
        reason: "Apply one reviewed edit",
        riskLevel: "medium",
        riskSummary: "One file will change",
        requestedBy: "agent-runner",
        expiresAt: new Date(Date.now() + 60 * 60 * 1_000).toISOString()
      }
    });
    assert.equal(created.status, 201);
    assert.equal(created.payload.agentRun.status, "waiting_approval");
    assert.equal(created.payload.approvalRequest.status, "pending");

    const denied = await request(port, `/api/agent-runs/run-1/approvals/${created.payload.approvalRequest.id}/decision`, {
      method: "POST",
      body: { decision: "denied", actor: "maxwell", note: "Not this change" }
    });
    assert.equal(denied.status, 200);
    assert.equal(denied.payload.approvalRequest.status, "denied");
    assert.equal(denied.payload.agentRun.status, "failed");

    const listed = await request(port, "/api/agent-runs/run-1/approvals");
    assert.equal(listed.status, 200);
    assert.equal(listed.payload.approvalRequests[0].decidedBy, "maxwell");
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.match(output, /approval\.requested/);
    assert.match(output, /approval\.denied/);
  } finally {
    if (child && child.exitCode === null) {
      child.kill();
      await once(child, "exit");
    }
    await rm(directory, { recursive: true, force: true });
  }
});

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
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/local/workspace`)).ok) return;
    } catch {}
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

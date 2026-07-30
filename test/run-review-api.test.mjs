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
import { agentRunFixtureStore, fixtureNow } from "../test-support/agent-run-fixture.mjs";

test("Run Review API materializes scoped artifacts and preserves review evidence after restart", { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-run-review-api-"));
  const databasePath = join(directory, "ahive.db");
  const artifactRoot = join(directory, "artifacts");
  const fixture = agentRunFixtureStore();
  fixture.agentRuns[0] = {
    ...fixture.agentRuns[0],
    status: "completed",
    completedAt: fixtureNow,
    updatedAt: fixtureNow,
    usage: { inputTokens: 80, outputTokens: 40, totalTokens: 120 }
  };
  fixture.messages.push({
    id: "message-1",
    conversationId: "conversation-1",
    role: "assistant",
    content: "Implemented the bounded review flow. token=super-secret-value",
    sequence: 1,
    metadata: { agentRunId: "run-1" },
    createdAt: fixtureNow
  });
  const database = openDatabase(databasePath);
  await writeNeutralStore(createSqliteNeutralStore(database, databasePath), fixture);
  database.close();
  const port = await availablePort();
  let child;
  try {
    child = await startServer(port, databasePath, artifactRoot, directory);
    const review = await request(port, "/api/agent-runs/run-1/review");
    assert.equal(review.status, 200);
    const finalArtifact = review.payload.artifacts.find(item => item.kind === "final_output");
    assert.ok(finalArtifact);
    assert.equal(finalArtifact.redactionCount, 1);

    const artifact = await request(port, `/api/agent-runs/run-1/artifacts/${finalArtifact.id}`);
    assert.equal(artifact.status, 200);
    assert.match(artifact.payload.content, /\[REDACTED\]/);
    assert.doesNotMatch(artifact.payload.content, /super-secret-value/);
    assert.equal((await request(port, `/api/agent-runs/run-2/artifacts/${finalArtifact.id}`)).status, 404);

    const decision = await request(port, "/api/agent-runs/run-1/review", {
      method: "POST",
      body: { status: "accepted_for_next_step", actor: "ui-test" }
    });
    assert.equal(decision.status, 200);
    assert.equal(decision.payload.agentRun.reviewStatus, "accepted_for_next_step");

    await stopServer(child);
    child = await startServer(port, databasePath, artifactRoot, directory);
    const recovered = await request(port, "/api/agent-runs/run-1/review");
    assert.equal(recovered.status, 200);
    assert.equal(recovered.payload.agentRun.reviewStatus, "accepted_for_next_step");
    assert.ok(recovered.payload.artifacts.some(item => item.id === finalArtifact.id));
    assert.equal((await request(port, `/api/agent-runs/run-1/artifacts/${finalArtifact.id}`)).status, 200);
  } finally {
    await stopServer(child);
    await rm(directory, { recursive: true, force: true });
  }
});

async function startServer(port, databasePath, artifactRoot, directory) {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: process.cwd(),
    windowsHide: true,
    env: {
      ...process.env,
      PORT: String(port),
      AHIVE_DATABASE_PATH: databasePath,
      AHIVE_ARTIFACT_ROOT: artifactRoot,
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
  return child;
}

async function stopServer(child) {
  if (child && child.exitCode === null) {
    child.kill();
    await once(child, "exit");
  }
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

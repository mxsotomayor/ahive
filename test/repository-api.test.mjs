import test from "node:test";
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = promisify(execFile);

test("Repository API supports the complete UI management flow", { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-repository-api-"));
  const repositoryPath = join(directory, "working-tree");
  const port = await availablePort();
  let child;
  try {
    await run("git", ["init", "-b", "main", repositoryPath]);
    await run("git", ["-C", repositoryPath, "config", "user.email", "test@ahive.local"]);
    await run("git", ["-C", repositoryPath, "config", "user.name", "Ahive Test"]);
    await run("git", ["-C", repositoryPath, "commit", "--allow-empty", "-m", "initial"]);

    child = spawn(process.execPath, ["server.mjs"], {
      cwd: process.cwd(),
      windowsHide: true,
      env: {
        ...process.env,
        PORT: String(port),
        AHIVE_DATABASE_PATH: join(directory, "ahive.db"),
        AHIVE_LEGACY_STORE_PATH: join(directory, "missing.json"),
        AHIVE_REPOSITORY_ROOTS: directory,
        MAXWELL_ORGANIZATION_NAME: "API Test Org",
        MAXWELL_PROJECT_NAME: "API Test Project",
        MAXWELL_PRODUCT_NAME: "API Test Product",
        AHIVE_CODEX_EXECUTABLE: "ahive-test-codex-does-not-exist"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stderr = "";
    let stdout = "";
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    await waitForServer(port, child, () => `${stdout}\n${stderr}`);

    const workspace = await request(port, "/api/local/workspace");
    const project = workspace.payload.projects[0];
    const product = workspace.payload.products[0];
    const valid = await request(port, "/api/workspace/repositories", {
      method: "POST",
      body: {
        projectId: project.id,
        productId: product.id,
        name: "Working tree",
        localPath: repositoryPath,
        accessMode: "read_only"
      }
    });
    assert.equal(valid.status, 201);
    assert.equal(valid.payload.entity.verificationStatus, "unverified");

    const verified = await request(port, `/api/repositories/${valid.payload.entity.id}/verify`, { method: "POST" });
    assert.equal(verified.status, 200);
    assert.equal(verified.payload.repository.verificationStatus, "verified");
    const inspected = await request(port, `/api/repositories/${valid.payload.entity.id}/inspect`);
    assert.equal(inspected.status, 200);
    assert.equal(inspected.payload.git.branch, "main");
    assert.equal(inspected.payload.git.dirty, false);

    const edited = await request(port, `/api/workspace/repositories/${valid.payload.entity.id}`, {
      method: "PATCH",
      body: { name: "Renamed working tree", accessMode: "guarded_write", active: false }
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.payload.entity.name, "Renamed working tree");
    assert.equal(edited.payload.entity.active, false);

    const invalid = await request(port, "/api/workspace/repositories", {
      method: "POST",
      body: { projectId: project.id, name: "Missing tree", localPath: join(directory, "missing") }
    });
    const rejected = await request(port, `/api/repositories/${invalid.payload.entity.id}/verify`, { method: "POST" });
    assert.equal(rejected.status, 400);
    assert.equal(rejected.payload.repository.verificationStatus, "invalid");
    assert.match(rejected.payload.error, /does not exist/);

    const refreshed = await request(port, "/api/local/workspace");
    assert.equal(refreshed.payload.repositories.length, 2);

    const harness = await request(port, "/api/harness-accounts", {
      method: "POST",
      body: { provider: "openai", adapter: "codex-cli", displayName: "Local Codex" }
    });
    assert.equal(harness.status, 201);
    assert.equal(harness.payload.harnessAccount.configuration.status, "cli_unavailable");
    assert.deepEqual(harness.payload.harnessAccount.credentialReferences, {});

    const profile = await request(port, "/api/agent-profiles", {
      method: "POST",
      body: {
        harnessAccountId: harness.payload.harnessAccount.id,
        name: "API developer",
        description: "Works through Codex CLI",
        traitDescription: "Careful and concise",
        instructions: "Inspect before changing files.",
        model: "gpt-5.6-sol",
        modelSettings: { reasoningEffort: "high" }
      }
    });
    assert.equal(profile.status, 201);
    assert.equal(profile.payload.agentProfile.canStartWork, false);
    assert.equal(profile.payload.agentProfile.harnessAccount.adapter, "codex-cli");

    const editedProfile = await request(port, `/api/agent-profiles/${profile.payload.agentProfile.id}`, {
      method: "PATCH",
      body: { traitDescription: "Methodical", model: "gpt-5.6-terra" }
    });
    assert.equal(editedProfile.status, 200);
    assert.equal(editedProfile.payload.agentProfile.traitDescription, "Methodical");
    assert.equal(editedProfile.payload.agentProfile.model, "gpt-5.6-terra");

    const harnessList = await request(port, "/api/harness-accounts");
    assert.equal(harnessList.status, 200);
    assert.equal(harnessList.payload.harnessAccounts.length, 1);

    const profileList = await request(port, "/api/agent-profiles");
    assert.equal(profileList.status, 200);
    assert.equal(profileList.payload.agentProfiles.length, 1);
    const modelList = await request(port, "/api/agent-models");
    assert.equal(modelList.status, 200);
    assert.equal(modelList.payload.models.length, 8);
    assert.equal(modelList.payload.models[0].id, "gpt-5.6-sol");

    const assignment = await request(port, "/api/agent-assignments", {
      method: "POST",
      body: {
        agentProfileId: profile.payload.agentProfile.id,
        projectId: project.id,
        productId: product.id,
        contextInstructions: "API-scoped instructions"
      }
    });
    assert.equal(assignment.status, 201);
    assert.equal(assignment.payload.agentAssignment.effectiveContext.project.id, project.id);
    assert.equal(assignment.payload.agentAssignment.effectiveContext.product.id, product.id);
    assert.equal(assignment.payload.agentAssignment.canStartWork, false);

    const blockedProfileDelete = await request(port, `/api/agent-profiles/${profile.payload.agentProfile.id}`, { method: "DELETE" });
    assert.equal(blockedProfileDelete.status, 409);
    const editedAssignment = await request(port, `/api/agent-assignments/${assignment.payload.agentAssignment.id}`, {
      method: "PATCH",
      body: { contextInstructions: "Updated API context", active: false }
    });
    assert.equal(editedAssignment.status, 200);
    assert.equal(editedAssignment.payload.agentAssignment.contextInstructions, "Updated API context");
    const assignmentList = await request(port, "/api/agent-assignments");
    assert.equal(assignmentList.status, 200);
    assert.equal(assignmentList.payload.agentAssignments.length, 1);

    const blockedHarnessDelete = await request(port, `/api/harness-accounts/${harness.payload.harnessAccount.id}`, { method: "DELETE" });
    assert.equal(blockedHarnessDelete.status, 409);

    const deletedAssignment = await request(port, `/api/agent-assignments/${assignment.payload.agentAssignment.id}`, { method: "DELETE" });
    assert.equal(deletedAssignment.status, 200);
    const deletedProfile = await request(port, `/api/agent-profiles/${profile.payload.agentProfile.id}`, { method: "DELETE" });
    assert.equal(deletedProfile.status, 200);
    const deletedHarness = await request(port, `/api/harness-accounts/${harness.payload.harnessAccount.id}`, { method: "DELETE" });
    assert.equal(deletedHarness.status, 200);

    const taskHarness = await request(port, "/api/harness-accounts", { method: "POST", body: { displayName: "Task Codex" } });
    const taskProfile = await request(port, "/api/agent-profiles", {
      method: "POST",
      body: { harnessAccountId: taskHarness.payload.harnessAccount.id, name: "Task developer", model: "gpt-5.6-sol" }
    });
    const taskAssignment = await request(port, "/api/agent-assignments", {
      method: "POST",
      body: { agentProfileId: taskProfile.payload.agentProfile.id, projectId: project.id, productId: product.id }
    });
    const task = await request(port, "/api/agent-tasks", {
      method: "POST",
      body: { agentAssignmentId: taskAssignment.payload.agentAssignment.id, objective: "API conversation test" }
    });
    assert.equal(task.status, 201);
    assert.equal(task.payload.agentTask.messageCount, 0);
    for (const content of ["one", "two", "three"]) {
      assert.equal((await request(port, `/api/agent-tasks/${task.payload.agentTask.id}/messages`, {
        method: "POST", body: { role: "user", content }
      })).status, 201);
    }
    const messagePage = await request(port, `/api/agent-tasks/${task.payload.agentTask.id}/messages?limit=2`);
    assert.deepEqual(messagePage.payload.messages.map(message => message.sequence), [1, 2]);
    assert.equal(messagePage.payload.pageInfo.nextCursor, "2");
    const taskList = await request(port, "/api/agent-tasks");
    assert.equal(taskList.payload.agentTasks.length, 1);
    const runList = await request(port, `/api/agent-tasks/${task.payload.agentTask.id}/runs`);
    assert.equal(runList.status, 200);
    assert.deepEqual(runList.payload.agentRuns, []);
  } finally {
    if (child && child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
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

async function waitForServer(port, child, stderr) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Server exited before readiness: ${stderr()}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/local/workspace`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not become ready: ${stderr()}`);
}

async function request(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  return { status: response.status, payload: await response.json() };
}

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../lib/database.mjs";
import { createRunArtifactService } from "../lib/run-artifacts.mjs";
import { readNeutralStore, writeNeutralStore } from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";
import { agentRunFixtureStore } from "../test-support/agent-run-fixture.mjs";

test("persists bounded redacted Run Artifacts outside primary rows and scopes reads to a Run", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-artifacts-"));
  const databasePath = join(directory, "ahive.db");
  const database = openDatabase(databasePath);
  const store = createSqliteNeutralStore(database, databasePath);
  try {
    await writeNeutralStore(store, agentRunFixtureStore());
    const service = createRunArtifactService({ store, root: join(directory, "artifact-content"), worktreeRoot: join(directory, "worktrees"), retentionDays: 14 });
    const final = await service.persist("run-1", "final_output", "Completed safely. TOKEN=secret-value glpat-abcdefghijklmnop", { source: "test" });
    assert.equal(final.redactionCount, 2);
    assert.equal(final.retentionUntil > final.createdAt, true);
    const fetched = await service.read("run-1", final.id);
    assert.doesNotMatch(fetched.content, /secret-value|glpat-/);
    assert.match(fetched.content, /\[REDACTED\]/);
    await assert.rejects(() => service.read("run-2", final.id), error => error.code === "artifact_not_found");
    await assert.rejects(() => service.persist("run-1", "bounded_log", "x".repeat(1024 * 1024 + 1)), error => error.code === "artifact_too_large");

    const workspace = await readNeutralStore(store);
    assert.equal(workspace.runArtifacts.length, 1);
    assert.equal(JSON.stringify(workspace.runArtifacts).includes("Completed safely"), false);
    assert.equal(workspace.runArtifacts[0].storageReference, `${workspace.runArtifacts[0].contentHash}.artifact`);

    database.close();
    const restartedDatabase = openDatabase(databasePath);
    const restartedStore = createSqliteNeutralStore(restartedDatabase, databasePath);
    const restarted = createRunArtifactService({ store: restartedStore, root: join(directory, "artifact-content"), worktreeRoot: join(directory, "worktrees") });
    assert.equal((await restarted.read("run-1", final.id)).content, fetched.content);
    restartedDatabase.close();
  } finally {
    if (database.open) database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("captures successful, failed, cancelled, and verification outcomes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-artifact-outcomes-"));
  const database = openDatabase(join(directory, "ahive.db"));
  const store = createSqliteNeutralStore(database, database.name);
  try {
    await writeNeutralStore(store, agentRunFixtureStore());
    const service = createRunArtifactService({ store, root: join(directory, "content"), worktreeRoot: join(directory, "worktrees") });
    await service.captureOutcome("run-1", { finalMessage: "Work completed", status: "completed" });
    await service.captureOutcome("run-2", { errorSummary: "cancelled", status: "cancelled" });
    const report = await service.captureVerification("run-1", {
      policyId: "verification-command-123", policyName: "Unit tests", status: "failed", exitCode: 1, signal: null,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationMs: 12, workingDirectory: ".", errorCode: "nonzero_exit",
      output: { stdout: "", stderr: "1 test failed", capturedBytes: 13, limitBytes: 1000, truncated: false, redactionCount: 0 }
    });
    assert.equal(report.kind, "test_report");
    assert.deepEqual((await service.list("run-1")).map(item => item.kind).sort(), ["final_output", "test_report"]);
    assert.deepEqual((await service.list("run-2")).map(item => item.kind), ["error_report"]);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../lib/database.mjs";
import {
  cancelRunApproval,
  consumeRunApproval,
  createRunApprovalRequest,
  decideRunApproval,
  listRunApprovalRequests,
  NeutralStoreError,
  readNeutralStore,
  writeNeutralStore
} from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";
import { agentRunFixtureStore, fixtureNow } from "../test-support/agent-run-fixture.mjs";

const requestedAt = fixtureNow;
const expiresAt = "2026-07-29T13:00:00.000Z";

test("approves and consumes one exact capability once while rejecting replay, mismatch, and wrong-Run use", async () => {
  const context = await approvalContext("approval-consume");
  try {
    const requested = await createRunApprovalRequest(context.store, "run-1", approvalInput(), { now: requestedAt });
    assert.equal(requested.approval.status, "pending");
    assert.equal(requested.run.status, "waiting_approval");
    assert.equal((await readNeutralStore(context.store)).agentTasks[0].status, "waiting_approval");

    await assert.rejects(
      () => decideRunApproval(context.store, "run-2", requested.approval.id, { decision: "approved", actor: "maxwell" }, { now: "2026-07-29T12:02:00.000Z" }),
      error => error instanceof NeutralStoreError && error.status === 409 && /another Agent Run/.test(error.message)
    );

    const decision = await decideRunApproval(context.store, "run-1", requested.approval.id, {
      decision: "approved", actor: "maxwell", note: "Scope reviewed"
    }, { now: "2026-07-29T12:03:00.000Z" });
    assert.equal(decision.approval.status, "approved");
    assert.equal(decision.run.status, "waiting_approval");

    await assert.rejects(
      () => consumeRunApproval(context.store, "run-1", requested.approval.id, {
        capability: "repository.create_commit",
        targetType: "repository_path",
        targetId: "repository-1:src/app.js",
        actor: "guarded-write-service"
      }, { now: "2026-07-29T12:04:00.000Z" }),
      error => error instanceof NeutralStoreError && error.status === 409 && /exact capability/.test(error.message)
    );

    const consumed = await consumeRunApproval(context.store, "run-1", requested.approval.id, {
      capability: "repository.modify_files",
      targetType: "repository_path",
      targetId: "repository-1:src/app.js",
      actor: "guarded-write-service"
    }, { now: "2026-07-29T12:05:00.000Z" });
    assert.equal(consumed.consumed, true);
    assert.equal(consumed.approval.status, "consumed");
    assert.equal(consumed.run.status, "running");

    await assert.rejects(
      () => consumeRunApproval(context.store, "run-1", requested.approval.id, {
        capability: "repository.modify_files", targetType: "repository_path",
        targetId: "repository-1:src/app.js", actor: "guarded-write-service"
      }),
      error => error instanceof NeutralStoreError && error.status === 409 && /approved, unused/.test(error.message)
    );

    const persisted = await readNeutralStore(context.store);
    persisted.agentRuns.find(run => run.id === "run-1").status = "completed";
    persisted.agentRuns.find(run => run.id === "run-1").completedAt = "2026-07-29T12:10:00.000Z";
    persisted.agentTasks[0].status = "completed";
    persisted.agentTasks[0].completedAt = "2026-07-29T12:10:00.000Z";
    await writeNeutralStore(context.store, persisted);
    assert.equal(listRunApprovalRequests(await readNeutralStore(context.store), "run-1")[0].status, "consumed");
  } finally {
    context.database.close();
  }
});

test("persists deny, expiry, and cancellation as terminal approval outcomes", async () => {
  for (const scenario of ["denied", "expired", "cancelled"]) {
    const context = await approvalContext(`approval-${scenario}`);
    try {
      const requested = await createRunApprovalRequest(context.store, "run-1", approvalInput(), { now: requestedAt });
      let result;
      if (scenario === "denied") {
        result = await decideRunApproval(context.store, "run-1", requested.approval.id, {
          decision: "denied", actor: "maxwell", note: "Too broad"
        }, { now: "2026-07-29T12:03:00.000Z" });
        assert.equal(result.approval.status, "denied");
        assert.equal(result.run.status, "failed");
      } else if (scenario === "expired") {
        result = await decideRunApproval(context.store, "run-1", requested.approval.id, {
          decision: "approved", actor: "maxwell"
        }, { now: "2026-07-29T13:01:00.000Z" });
        assert.equal(result.reason, "expired");
        assert.equal(result.approval.status, "expired");
        assert.equal(result.run.status, "failed");
      } else {
        await decideRunApproval(context.store, "run-1", requested.approval.id, {
          decision: "approved", actor: "maxwell"
        }, { now: "2026-07-29T12:03:00.000Z" });
        result = await cancelRunApproval(context.store, "run-1", requested.approval.id, {
          actor: "maxwell", note: "Work no longer needed"
        }, { now: "2026-07-29T12:04:00.000Z" });
        assert.equal(result.approval.status, "cancelled");
        assert.equal(result.approval.cancelledBy, "maxwell");
        assert.equal(result.run.status, "cancelled");
      }
      await assert.rejects(
        () => decideRunApproval(context.store, "run-1", requested.approval.id, { decision: "approved", actor: "maxwell" }),
        error => error instanceof NeutralStoreError && error.status === 409
      );
    } finally {
      context.database.close();
    }
  }
});

function approvalInput() {
  return {
    capability: "repository.modify_files",
    targetType: "repository_path",
    targetId: "repository-1:src/app.js",
    reason: "Apply the reviewed fix to one file",
    riskLevel: "medium",
    riskSummary: "The file content will change in an isolated workspace",
    requestedBy: "agent-runner",
    expiresAt
  };
}

async function approvalContext(key) {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, key);
  await writeNeutralStore(store, agentRunFixtureStore());
  return { database, store };
}

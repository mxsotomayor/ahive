import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../lib/database.mjs";
import {
  assertAgentProfileSelectable,
  createWorkspaceEntity,
  listAgentProfileViews,
  listSupportedAgentModels,
  NeutralStoreError,
  readNeutralStore,
  removeAgentProfile,
  removeHarnessAccount,
  updateWorkspaceEntity
} from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";

const readyRuntime = { status: "ready", installed: true, authenticated: true, version: "test" };

test("exposes exactly eight supported OpenAI Agent models", () => {
  assert.deepEqual(listSupportedAgentModels().map(model => model.id), [
    "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5",
    "gpt-5.5-pro", "gpt-5.4", "gpt-5.4-pro", "gpt-5.4-mini"
  ]);
});

test("persists reusable Agent Profiles with separate identity and instruction fields", async () => {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, "agent-profile-test");
  try {
    const harness = await createWorkspaceEntity(store, "harnessAccount", { displayName: "Local Codex" });
    const before = entityCounts(harness.store);
    const created = await createWorkspaceEntity(store, "agentProfile", {
      harnessAccountId: harness.entity.id,
      name: "Careful maintainer",
      description: "Maintains production services",
      traitDescription: "Methodical, concise, evidence-driven",
      instructions: "Inspect first and keep changes narrowly scoped.",
      model: "gpt-5.6-sol",
      modelSettings: { reasoningEffort: "high", verbosity: "low", serviceTier: "fast" },
      defaultToolPolicyId: "policy.read-only",
      projectId: "must-not-persist",
      repositoryPath: "C:/must-not-persist",
      issueId: "must-not-persist"
    });
    assert.deepEqual(entityCounts(created.store), before);
    assert.equal(created.store.agentProfiles.length, 1);
    assert.equal(created.entity.description, "Maintains production services");
    assert.equal(created.entity.traitDescription, "Methodical, concise, evidence-driven");
    assert.equal(created.entity.instructions, "Inspect first and keep changes narrowly scoped.");
    assert.equal(created.entity.model, "gpt-5.6-sol");
    assert.equal(JSON.stringify(created.entity).includes("must-not-persist"), false);

    const [view] = listAgentProfileViews(created.store, readyRuntime);
    assert.equal(view.canStartWork, true);
    assert.equal(view.harnessAccount.adapter, "codex-cli");
    assert.equal(assertAgentProfileSelectable(created.store, created.entity.id, readyRuntime).id, created.entity.id);

    const updated = await updateWorkspaceEntity(store, "agentProfile", created.entity.id, {
      traitDescription: "Calm and pragmatic",
      model: "gpt-5.6-terra",
      modelSettings: { reasoningEffort: "medium" },
      active: false
    });
    assert.equal(updated.entity.description, "Maintains production services");
    assert.equal(updated.entity.traitDescription, "Calm and pragmatic");
    assert.equal(updated.entity.model, "gpt-5.6-terra");
    assert.throws(() => assertAgentProfileSelectable(updated.store, created.entity.id, readyRuntime), /Inactive Agent Profile/);

    await assert.rejects(
      () => removeHarnessAccount(store, harness.entity.id),
      error => error instanceof NeutralStoreError && /Agent Profiles/.test(error.message)
    );
    const removed = await removeAgentProfile(store, created.entity.id);
    assert.equal(removed.store.agentProfiles.length, 0);
    assert.equal((await readNeutralStore(store)).harnessAccounts.length, 1);
  } finally {
    database.close();
  }
});

test("enforces Agent Profile uniqueness, harness state, and model settings", async () => {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, "agent-profile-validation-test");
  try {
    const harness = await createWorkspaceEntity(store, "harnessAccount", { displayName: "Local Codex" });
    const first = await createWorkspaceEntity(store, "agentProfile", {
      harnessAccountId: harness.entity.id,
      name: "Reviewer",
      model: "gpt-5.6-sol"
    });
    await assert.rejects(
      () => createWorkspaceEntity(store, "agentProfile", {
        harnessAccountId: harness.entity.id,
        name: " reviewer ",
        model: "gpt-5.6-terra"
      }),
      error => error instanceof NeutralStoreError && error.status === 409 && /unique/.test(error.message)
    );
    await assert.rejects(
      () => updateWorkspaceEntity(store, "agentProfile", first.entity.id, { modelSettings: ["high"] }),
      error => error instanceof NeutralStoreError && /must be an object/.test(error.message)
    );
    await assert.rejects(
      () => updateWorkspaceEntity(store, "agentProfile", first.entity.id, { model: "gpt-custom" }),
      error => error instanceof NeutralStoreError && /supported OpenAI model catalog/.test(error.message)
    );
    await assert.rejects(
      () => updateWorkspaceEntity(store, "agentProfile", first.entity.id, { modelSettings: { sandbox: "danger-full-access" } }),
      error => error instanceof NeutralStoreError && /Unsupported/.test(error.message)
    );

    const inactiveHarness = await updateWorkspaceEntity(store, "harnessAccount", harness.entity.id, { active: false });
    assert.throws(
      () => assertAgentProfileSelectable(inactiveHarness.store, first.entity.id, readyRuntime),
      /Inactive Harness Account/
    );
    const [view] = listAgentProfileViews(inactiveHarness.store, readyRuntime);
    assert.equal(view.canStartWork, false);
    await assert.rejects(
      () => createWorkspaceEntity(store, "agentProfile", {
        harnessAccountId: harness.entity.id,
        name: "Blocked",
        model: "gpt-5.6-sol"
      }),
      error => error instanceof NeutralStoreError && error.status === 409 && /Inactive Harness Account/.test(error.message)
    );
  } finally {
    database.close();
  }
});

function entityCounts(store) {
  return Object.fromEntries([
    "organizations", "projects", "products", "connectorAccounts", "productSources",
    "issues", "externalIssueLinks", "repositories", "harnessAccounts"
  ].map(key => [key, store[key].length]));
}

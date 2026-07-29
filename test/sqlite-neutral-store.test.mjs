import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../lib/database.mjs";
import { importLegacyNeutralStore } from "../lib/legacy-neutral-import.mjs";
import { createWorkspaceEntity, initializeNeutralWorkspace, readNeutralStore } from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";

test("persists the neutral domain through the SQLite adapter", async () => {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, "isolated-test");
  await initializeNeutralWorkspace(store, { organizationName: "Org", projectName: "Project", productName: "Product" });
  const persisted = await readNeutralStore(store);
  assert.equal(persisted.organizations.length, 1);
  assert.equal(persisted.projects.length, 1);
  assert.equal(persisted.products.length, 1);
  database.close();
});

test("imports a legacy JSON store once, preserves IDs, and creates a backup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-import-"));
  const jsonPath = join(directory, "maxwell.json");
  const databasePath = join(directory, "ahive.db");
  try {
    const source = await initializeJson(jsonPath);
    const original = await readFile(jsonPath, "utf8");
    const database = openDatabase(databasePath);
    const store = createSqliteNeutralStore(database, databasePath);
    const first = await importLegacyNeutralStore({ database, storeAdapter: store, jsonPath });
    const second = await importLegacyNeutralStore({ database, storeAdapter: store, jsonPath });
    assert.equal(first.imported, true);
    assert.equal(second.repeated, true);
    assert.equal((await readNeutralStore(store)).products[0].id, source.products[0].id);
    assert.equal(await readFile(jsonPath, "utf8"), original);
    assert.equal((await readFile(first.backupPath, "utf8")), original);
    database.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

async function initializeJson(jsonPath) {
  const empty = { version: 1, organizations: [], projects: [], products: [], connectorAccounts: [], productSources: [], issues: [], externalIssueLinks: [], repositories: [], syncMeta: {}, createdAt: null, updatedAt: null };
  await writeFile(jsonPath, JSON.stringify(empty), "utf8");
  await initializeNeutralWorkspace(jsonPath, { organizationName: "Org", projectName: "Project", productName: "Product" });
  return readNeutralStore(jsonPath);
}

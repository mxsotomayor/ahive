import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { readNeutralStore } from "./neutral-store.mjs";

const IMPORT_KEY = "legacyNeutralImport";

export async function importLegacyNeutralStore({ database, storeAdapter, jsonPath, backupDirectory }) {
  const existing = database.prepare("SELECT value_json FROM application_metadata WHERE key = ?").get(IMPORT_KEY);
  if (existing) return { imported: false, repeated: true, ...JSON.parse(existing.value_json) };

  let raw;
  try {
    raw = await readFile(jsonPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { imported: false, repeated: false, reason: "legacy_store_missing" };
    throw error;
  }
  const parsed = await readNeutralStore(jsonPath);
  const digest = createHash("sha256").update(raw).digest("hex");
  const destinationDirectory = backupDirectory || join(dirname(jsonPath), "backups");
  await mkdir(destinationDirectory, { recursive: true });
  const backupPath = join(destinationDirectory, `maxwell-${digest.slice(0, 12)}.json`);
  try {
    await copyFile(jsonPath, backupPath, 1);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }

  await storeAdapter.writeStore(parsed);
  const counts = entityCounts(parsed);
  const record = { sourceHash: digest, backupPath, importedAt: new Date().toISOString(), counts };
  database.prepare("INSERT INTO application_metadata(key, value_json, updated_at) VALUES (?, ?, ?)")
    .run(IMPORT_KEY, JSON.stringify(record), record.importedAt);
  const persisted = await readNeutralStore(storeAdapter);
  assertSameIdentity(parsed, persisted);
  return { imported: true, repeated: false, ...record };
}

export function entityCounts(store) {
  return Object.fromEntries([
    "organizations", "projects", "products", "connectorAccounts", "productSources",
    "issues", "externalIssueLinks", "repositories", "harnessAccounts", "agentProfiles", "agentAssignments"
  ].map(key => [key, Array.isArray(store[key]) ? store[key].length : 0]));
}

export function assertSameIdentity(before, after) {
  for (const [collection, count] of Object.entries(entityCounts(before))) {
    if (entityCounts(after)[collection] !== count) throw new Error(`Legacy import count mismatch for ${collection}.`);
    const beforeIds = (before[collection] || []).map(item => item.id).sort();
    const afterIds = (after[collection] || []).map(item => item.id).sort();
    if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) throw new Error(`Legacy import identity mismatch for ${collection}.`);
  }
}

import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CURRENT_SCHEMA_VERSION, migrateDatabase, openDatabase, schemaVersion } from "../lib/database.mjs";

test("creates the schema idempotently and enforces foreign keys and rollback", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-db-"));
  const filePath = join(directory, "test.db");
  try {
    const database = openDatabase(filePath);
    assert.equal(schemaVersion(database), CURRENT_SCHEMA_VERSION);
    assert.equal(migrateDatabase(database), CURRENT_SCHEMA_VERSION);
    assert.equal(database.prepare("SELECT COUNT(*) count FROM schema_migrations").get().count, CURRENT_SCHEMA_VERSION);
    assert.throws(() => database.prepare("INSERT INTO projects(id, organization_id, name, payload_json) VALUES (?, ?, ?, ?)")
      .run("p", "missing", "P", "{}"), /FOREIGN KEY/);
    const writeThenFail = database.transaction(() => {
      database.prepare("INSERT INTO organizations(id, name, payload_json) VALUES (?, ?, ?)").run("o", "O", "{}");
      throw new Error("rollback");
    });
    assert.throws(writeThenFail, /rollback/);
    assert.equal(database.prepare("SELECT COUNT(*) count FROM organizations").get().count, 0);
    database.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("serializes a concurrent writer within the configured busy timeout", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-lock-"));
  const filePath = join(directory, "test.db");
  try {
    const setup = openDatabase(filePath);
    setup.exec("CREATE TABLE write_probe(value TEXT)");
    setup.close();
    const script = `const D=require('better-sqlite3');const d=new D(process.argv[1]);d.exec('BEGIN IMMEDIATE');d.prepare('INSERT INTO write_probe VALUES (?)').run('child');console.log('locked');setTimeout(()=>{d.exec('COMMIT');d.close()},250)`;
    const child = spawn(process.execPath, ["-e", script, filePath], { cwd: process.cwd(), stdio: ["ignore", "pipe", "inherit"] });
    await once(child.stdout, "data");
    const writer = openDatabase(filePath, { timeout: 2000 });
    writer.prepare("INSERT INTO write_probe VALUES (?)").run("parent");
    assert.equal(writer.prepare("SELECT COUNT(*) count FROM write_probe").get().count, 2);
    writer.close();
    await once(child, "exit");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("migrates the prototype REST harness contract to Codex CLI without losing identity", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-harness-migration-"));
  const filePath = join(directory, "test.db");
  try {
    const database = new Database(filePath);
    database.exec(`
      CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL);
      INSERT INTO schema_migrations VALUES (1, 'neutral-domain', 'test'), (2, 'repositories', 'test'), (3, 'harness-accounts', 'test');
      CREATE TABLE harness_accounts (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL, adapter TEXT NOT NULL,
        display_name TEXT NOT NULL, base_url TEXT NOT NULL DEFAULT '',
        api_key_reference TEXT NOT NULL, active INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        UNIQUE (provider, adapter, base_url, api_key_reference)
      );
      CREATE INDEX harness_accounts_active_idx ON harness_accounts(active);
    `);
    const legacyPayload = {
      id: "harness-1", provider: "openai", adapter: "openai-responses",
      displayName: "Prototype", baseUrl: null,
      credentialReferences: { apiKey: "OPENAI_API_KEY" },
      capabilities: ["responses"], active: true
    };
    database.prepare("INSERT INTO harness_accounts VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run("harness-1", "openai", "openai-responses", "Prototype", "", "OPENAI_API_KEY", 1, JSON.stringify(legacyPayload));

    assert.equal(migrateDatabase(database), CURRENT_SCHEMA_VERSION);
    const row = database.prepare("SELECT adapter, auth_mode, payload_json FROM harness_accounts WHERE id = ?").get("harness-1");
    const payload = JSON.parse(row.payload_json);
    assert.equal(row.adapter, "codex-cli");
    assert.equal(row.auth_mode, "codex_session");
    assert.equal(payload.id, "harness-1");
    assert.equal(payload.adapter, "codex-cli");
    assert.deepEqual(payload.credentialReferences, {});
    assert.equal(JSON.stringify(payload).includes("OPENAI_API_KEY"), false);
    database.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

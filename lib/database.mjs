import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const CURRENT_SCHEMA_VERSION = 13;

const migrations = [
  {
    version: 1,
    name: "neutral-domain",
    sql: `
      CREATE TABLE application_metadata (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        payload_json TEXT NOT NULL
      );
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        name TEXT NOT NULL COLLATE NOCASE,
        payload_json TEXT NOT NULL,
        UNIQUE (organization_id, name)
      );
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
        name TEXT NOT NULL COLLATE NOCASE,
        payload_json TEXT NOT NULL,
        UNIQUE (project_id, name)
      );
      CREATE TABLE connector_accounts (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        base_url TEXT,
        credential_reference TEXT,
        payload_json TEXT NOT NULL,
        UNIQUE (provider, base_url, credential_reference)
      );
      CREATE TABLE product_sources (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        connector_account_id TEXT NOT NULL REFERENCES connector_accounts(id) ON DELETE RESTRICT,
        external_container_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        UNIQUE (product_id, connector_account_id, external_container_id)
      );
      CREATE TABLE issues (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        origin_product_source_id TEXT NOT NULL REFERENCES product_sources(id) ON DELETE RESTRICT,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX issues_product_status_idx ON issues(product_id, status);
      CREATE TABLE external_issue_links (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        product_source_id TEXT NOT NULL REFERENCES product_sources(id) ON DELETE RESTRICT,
        role TEXT NOT NULL CHECK (role IN ('origin', 'replica')),
        external_issue_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        UNIQUE (product_source_id, external_issue_id),
        UNIQUE (issue_id, product_source_id)
      );
      CREATE UNIQUE INDEX external_issue_links_one_origin_idx
        ON external_issue_links(issue_id) WHERE role = 'origin';
    `
  },
  {
    version: 2,
    name: "repositories",
    sql: `
      CREATE TABLE repositories (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
        product_id TEXT REFERENCES products(id) ON DELETE RESTRICT,
        name TEXT NOT NULL COLLATE NOCASE,
        local_path TEXT NOT NULL,
        verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'verified', 'invalid')),
        payload_json TEXT NOT NULL,
        UNIQUE (project_id, name),
        UNIQUE (project_id, local_path)
      );
      CREATE INDEX repositories_product_idx ON repositories(product_id);
    `
  },
  {
    version: 3,
    name: "harness-accounts",
    sql: `
      CREATE TABLE harness_accounts (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        adapter TEXT NOT NULL,
        display_name TEXT NOT NULL,
        base_url TEXT NOT NULL DEFAULT '',
        api_key_reference TEXT NOT NULL,
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        payload_json TEXT NOT NULL,
        UNIQUE (provider, adapter, base_url, api_key_reference)
      );
      CREATE INDEX harness_accounts_active_idx ON harness_accounts(active);
    `
  },
  {
    version: 4,
    name: "codex-cli-harness",
    sql: `
      ALTER TABLE harness_accounts RENAME TO harness_accounts_rest_legacy;
      DROP INDEX harness_accounts_active_idx;
      CREATE TABLE harness_accounts (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        adapter TEXT NOT NULL,
        display_name TEXT NOT NULL,
        auth_mode TEXT NOT NULL,
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        payload_json TEXT NOT NULL,
        UNIQUE (provider, adapter, auth_mode)
      );
      INSERT INTO harness_accounts(id, provider, adapter, display_name, auth_mode, active, payload_json)
      SELECT id, provider, 'codex-cli', display_name, 'codex_session', active,
        json_set(
          json_remove(payload_json, '$.baseUrl', '$.credentialReferences'),
          '$.adapter', 'codex-cli',
          '$.authMode', 'codex_session',
          '$.credentialReferences', json('{}'),
          '$.capabilities', json('["codex_exec","jsonl_events","session_resume"]')
        )
      FROM harness_accounts_rest_legacy;
      DROP TABLE harness_accounts_rest_legacy;
      CREATE INDEX harness_accounts_active_idx ON harness_accounts(active);
    `
  },
  {
    version: 5,
    name: "agent-profiles",
    sql: `
      CREATE TABLE agent_profiles (
        id TEXT PRIMARY KEY,
        harness_account_id TEXT NOT NULL REFERENCES harness_accounts(id) ON DELETE RESTRICT,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        model TEXT NOT NULL,
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        payload_json TEXT NOT NULL
      );
      CREATE INDEX agent_profiles_harness_active_idx ON agent_profiles(harness_account_id, active);
    `
  },
  {
    version: 6,
    name: "agent-assignments",
    sql: `
      CREATE TABLE agent_assignments (
        id TEXT PRIMARY KEY,
        agent_profile_id TEXT NOT NULL REFERENCES agent_profiles(id) ON DELETE RESTRICT,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
        product_id TEXT REFERENCES products(id) ON DELETE RESTRICT,
        repository_id TEXT REFERENCES repositories(id) ON DELETE RESTRICT,
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        payload_json TEXT NOT NULL
      );
      CREATE UNIQUE INDEX agent_assignments_scope_idx ON agent_assignments(
        agent_profile_id, project_id, COALESCE(product_id, ''), COALESCE(repository_id, '')
      );
      CREATE INDEX agent_assignments_project_active_idx ON agent_assignments(project_id, active);
    `
  },
  {
    version: 7,
    name: "agent-tasks-conversations",
    sql: `
      CREATE TABLE agent_tasks (
        id TEXT PRIMARY KEY,
        agent_assignment_id TEXT NOT NULL REFERENCES agent_assignments(id) ON DELETE RESTRICT,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
        product_id TEXT REFERENCES products(id) ON DELETE RESTRICT,
        repository_id TEXT REFERENCES repositories(id) ON DELETE RESTRICT,
        issue_id TEXT REFERENCES issues(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('draft', 'planning', 'waiting_approval', 'running', 'completed', 'failed', 'cancelled')),
        created_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX agent_tasks_assignment_created_idx ON agent_tasks(agent_assignment_id, created_at);
      CREATE INDEX agent_tasks_issue_idx ON agent_tasks(issue_id);
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        agent_task_id TEXT NOT NULL UNIQUE REFERENCES agent_tasks(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
        payload_json TEXT NOT NULL
      );
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE RESTRICT,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool_summary', 'system_notice')),
        sequence INTEGER NOT NULL CHECK (sequence > 0),
        created_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        UNIQUE (conversation_id, sequence)
      );
      CREATE INDEX messages_conversation_sequence_idx ON messages(conversation_id, sequence);
    `
  },
  {
    version: 8,
    name: "agent-runs",
    sql: `
      CREATE TABLE agent_runs (
        id TEXT PRIMARY KEY,
        agent_task_id TEXT NOT NULL REFERENCES agent_tasks(id) ON DELETE RESTRICT,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled', 'interrupted')),
        started_at TEXT,
        completed_at TEXT,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX agent_runs_task_started_idx ON agent_runs(agent_task_id, started_at);
    `
  },
  {
    version: 9,
    name: "run-approval-requests",
    sql: `
      ALTER TABLE agent_runs RENAME TO agent_runs_v8;
      DROP INDEX agent_runs_task_started_idx;
      CREATE TABLE agent_runs (
        id TEXT PRIMARY KEY,
        agent_task_id TEXT NOT NULL REFERENCES agent_tasks(id) ON DELETE RESTRICT,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled', 'interrupted')),
        started_at TEXT,
        completed_at TEXT,
        payload_json TEXT NOT NULL
      );
      INSERT INTO agent_runs(id, agent_task_id, conversation_id, status, started_at, completed_at, payload_json)
      SELECT id, agent_task_id, conversation_id, status, started_at, completed_at, payload_json
      FROM agent_runs_v8;
      DROP TABLE agent_runs_v8;
      CREATE INDEX agent_runs_task_started_idx ON agent_runs(agent_task_id, started_at);

      CREATE TABLE approval_requests (
        id TEXT PRIMARY KEY,
        agent_run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE RESTRICT,
        capability TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'consumed', 'cancelled')),
        requested_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX approval_requests_run_requested_idx ON approval_requests(agent_run_id, requested_at);
      CREATE INDEX approval_requests_status_expiry_idx ON approval_requests(status, expires_at);
    `
  },
  {
    version: 10,
    name: "managed-git-worktrees",
    sql: `
      CREATE TABLE managed_worktrees (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE RESTRICT,
        agent_task_id TEXT NOT NULL REFERENCES agent_tasks(id) ON DELETE RESTRICT,
        agent_run_id TEXT NOT NULL UNIQUE REFERENCES agent_runs(id) ON DELETE RESTRICT,
        path TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('creating', 'ready', 'retained', 'missing', 'failed', 'discarded')),
        base_commit TEXT NOT NULL,
        created_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE UNIQUE INDEX managed_worktrees_repository_lock_idx
        ON managed_worktrees(repository_id) WHERE status IN ('creating', 'ready');
      CREATE INDEX managed_worktrees_status_created_idx ON managed_worktrees(status, created_at);
    `
  },
  {
    version: 11,
    name: "guarded-file-change-events",
    sql: `
      CREATE TABLE file_change_events (
        id TEXT PRIMARY KEY,
        managed_worktree_id TEXT NOT NULL REFERENCES managed_worktrees(id) ON DELETE RESTRICT,
        agent_run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE RESTRICT,
        sequence INTEGER NOT NULL CHECK (sequence > 0),
        operation TEXT NOT NULL CHECK (operation IN ('apply_patch', 'create_file')),
        relative_path TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('authorized', 'completed', 'failed')),
        created_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        UNIQUE (managed_worktree_id, sequence)
      );
      CREATE INDEX file_change_events_run_created_idx ON file_change_events(agent_run_id, created_at);
    `
  },
  {
    version: 12,
    name: "run-artifacts",
    sql: `
      CREATE TABLE run_artifacts (
        id TEXT PRIMARY KEY,
        agent_run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE RESTRICT,
        kind TEXT NOT NULL CHECK (kind IN ('final_output', 'changed_files', 'patch', 'test_report', 'bounded_log', 'error_report')),
        storage_reference TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
        created_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        UNIQUE (agent_run_id, kind, content_hash)
      );
      CREATE INDEX run_artifacts_run_created_idx ON run_artifacts(agent_run_id, created_at);
    `
  },
  {
    version: 13,
    name: "issue-writebacks",
    sql: `
      CREATE TABLE issue_writebacks (
        id TEXT PRIMARY KEY,
        agent_run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE RESTRICT,
        issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE RESTRICT,
        external_issue_link_id TEXT NOT NULL REFERENCES external_issue_links(id) ON DELETE RESTRICT,
        approval_request_id TEXT NOT NULL UNIQUE REFERENCES approval_requests(id) ON DELETE RESTRICT,
        requested_status TEXT NOT NULL CHECK (requested_status IN ('todo', 'done')),
        status TEXT NOT NULL CHECK (status IN ('awaiting_approval', 'approved', 'denied', 'expired', 'cancelled', 'executing', 'succeeded', 'failed')),
        created_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX issue_writebacks_run_created_idx ON issue_writebacks(agent_run_id, created_at);
    `
  }
];

export function openDatabase(filePath = ":memory:", options = {}) {
  if (filePath !== ":memory:") mkdirSync(dirname(filePath), { recursive: true });
  const database = new Database(filePath, {
    timeout: options.timeout ?? 5000,
    readonly: options.readonly === true,
    fileMustExist: options.readonly === true
  });
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  if (!options.readonly) database.pragma("journal_mode = WAL");
  if (!options.readonly) migrateDatabase(database);
  return database;
}

export function migrateDatabase(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    )
  `);
  const applied = new Set(database.prepare("SELECT version FROM schema_migrations").all().map(row => row.version));
  const apply = database.transaction(migration => {
    database.exec(migration.sql);
    database.prepare("INSERT INTO schema_migrations(version, name, applied_at) VALUES (?, ?, ?)")
      .run(migration.version, migration.name, new Date().toISOString());
  });
  for (const migration of migrations) {
    if (!applied.has(migration.version)) apply(migration);
  }
  return schemaVersion(database);
}

export function schemaVersion(database) {
  return Number(database.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get().version);
}

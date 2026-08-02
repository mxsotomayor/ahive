import { emptyNeutralStore } from "./neutral-store.mjs";

const entityTables = [
  ["organizations", "organizations"],
  ["projects", "projects"],
  ["products", "products"],
  ["connectorAccounts", "connector_accounts"],
  ["productSources", "product_sources"],
  ["issues", "issues"],
  ["externalIssueLinks", "external_issue_links"],
  ["repositories", "repositories"],
  ["harnessAccounts", "harness_accounts"],
  ["agentProfiles", "agent_profiles"],
  ["agentAssignments", "agent_assignments"],
  ["agentTasks", "agent_tasks"],
  ["conversations", "conversations"],
  ["messages", "messages"],
  ["agentRuns", "agent_runs"],
  ["approvalRequests", "approval_requests"],
  ["issueWritebacks", "issue_writebacks"],
  ["managedWorktrees", "managed_worktrees"],
  ["fileChangeEvents", "file_change_events"],
  ["runArtifacts", "run_artifacts"]
];

export function createSqliteNeutralStore(database, key = database.name || "sqlite-neutral-store") {
  const write = database.transaction(store => replaceStore(database, store));
  return {
    key,
    database,
    readStore() {
      const store = emptyNeutralStore();
      for (const [collection, table] of entityTables) {
        store[collection] = database.prepare(`SELECT payload_json FROM ${table} ORDER BY rowid`)
          .all().map(row => JSON.parse(row.payload_json));
      }
      for (const row of database.prepare("SELECT key, value_json FROM application_metadata").all()) {
        const value = JSON.parse(row.value_json);
        if (row.key === "workspace") Object.assign(store, value);
        else if (row.key === "syncMeta") store.syncMeta = value;
      }
      return store;
    },
    writeStore(store) {
      write(store);
    }
  };
}

function replaceStore(database, store) {
  for (const table of ["run_artifacts", "file_change_events", "managed_worktrees", "issue_writebacks", "approval_requests", "agent_runs", "messages", "conversations", "agent_tasks", "agent_assignments", "agent_profiles", "external_issue_links", "issues", "repositories", "harness_accounts", "product_sources", "connector_accounts", "products", "projects", "organizations"]) {
    database.exec(`DELETE FROM ${table}`);
  }
  const insertOrganization = database.prepare("INSERT INTO organizations(id, name, payload_json) VALUES (@id, @name, @payload)");
  const insertProject = database.prepare("INSERT INTO projects(id, organization_id, name, payload_json) VALUES (@id, @organizationId, @name, @payload)");
  const insertProduct = database.prepare("INSERT INTO products(id, project_id, name, payload_json) VALUES (@id, @projectId, @name, @payload)");
  const insertAccount = database.prepare("INSERT INTO connector_accounts(id, provider, base_url, credential_reference, payload_json) VALUES (@id, @provider, @baseUrl, @credentialReference, @payload)");
  const insertSource = database.prepare("INSERT INTO product_sources(id, product_id, connector_account_id, external_container_id, payload_json) VALUES (@id, @productId, @connectorAccountId, @externalContainerId, @payload)");
  const insertIssue = database.prepare("INSERT INTO issues(id, product_id, origin_product_source_id, status, updated_at, payload_json) VALUES (@id, @productId, @originProductSourceId, @status, @updatedAt, @payload)");
  const insertLink = database.prepare("INSERT INTO external_issue_links(id, issue_id, product_source_id, role, external_issue_id, payload_json) VALUES (@id, @issueId, @productSourceId, @role, @externalIssueId, @payload)");
  const insertRepository = database.prepare("INSERT INTO repositories(id, project_id, product_id, name, local_path, verification_status, payload_json) VALUES (@id, @projectId, @productId, @name, @localPath, @verificationStatus, @payload)");
  const insertHarnessAccount = database.prepare("INSERT INTO harness_accounts(id, provider, adapter, display_name, auth_mode, active, payload_json) VALUES (@id, @provider, @adapter, @displayName, @authMode, @active, @payload)");
  const insertAgentProfile = database.prepare("INSERT INTO agent_profiles(id, harness_account_id, name, model, active, payload_json) VALUES (@id, @harnessAccountId, @name, @model, @active, @payload)");
  const insertAgentAssignment = database.prepare("INSERT INTO agent_assignments(id, agent_profile_id, project_id, product_id, repository_id, active, payload_json) VALUES (@id, @agentProfileId, @projectId, @productId, @repositoryId, @active, @payload)");
  const insertAgentTask = database.prepare("INSERT INTO agent_tasks(id, agent_assignment_id, project_id, product_id, repository_id, issue_id, status, created_at, payload_json) VALUES (@id, @agentAssignmentId, @projectId, @productId, @repositoryId, @issueId, @status, @createdAt, @payload)");
  const insertConversation = database.prepare("INSERT INTO conversations(id, agent_task_id, status, payload_json) VALUES (@id, @agentTaskId, @status, @payload)");
  const insertMessage = database.prepare("INSERT INTO messages(id, conversation_id, role, sequence, created_at, payload_json) VALUES (@id, @conversationId, @role, @sequence, @createdAt, @payload)");
  const insertAgentRun = database.prepare("INSERT INTO agent_runs(id, agent_task_id, conversation_id, status, started_at, completed_at, payload_json) VALUES (@id, @agentTaskId, @conversationId, @status, @startedAt, @completedAt, @payload)");
  const insertApprovalRequest = database.prepare("INSERT INTO approval_requests(id, agent_run_id, capability, target_type, target_id, status, requested_at, expires_at, payload_json) VALUES (@id, @agentRunId, @capability, @targetType, @targetId, @status, @requestedAt, @expiresAt, @payload)");
  const insertIssueWriteback = database.prepare("INSERT INTO issue_writebacks(id, agent_run_id, issue_id, external_issue_link_id, approval_request_id, requested_status, status, created_at, payload_json) VALUES (@id, @agentRunId, @issueId, @externalIssueLinkId, @approvalRequestId, @requestedStatus, @status, @createdAt, @payload)");
  const insertManagedWorktree = database.prepare("INSERT INTO managed_worktrees(id, repository_id, agent_task_id, agent_run_id, path, status, base_commit, created_at, payload_json) VALUES (@id, @repositoryId, @agentTaskId, @agentRunId, @path, @status, @baseCommit, @createdAt, @payload)");
  const insertFileChangeEvent = database.prepare("INSERT INTO file_change_events(id, managed_worktree_id, agent_run_id, sequence, operation, relative_path, status, created_at, payload_json) VALUES (@id, @managedWorktreeId, @agentRunId, @sequence, @operation, @relativePath, @status, @createdAt, @payload)");
  const insertRunArtifact = database.prepare("INSERT INTO run_artifacts(id, agent_run_id, kind, storage_reference, content_hash, size_bytes, created_at, payload_json) VALUES (@id, @agentRunId, @kind, @storageReference, @contentHash, @sizeBytes, @createdAt, @payload)");
  const payload = entity => JSON.stringify(entity);
  for (const entity of store.organizations) insertOrganization.run({ ...entity, payload: payload(entity) });
  for (const entity of store.projects) insertProject.run({ ...entity, payload: payload(entity) });
  for (const entity of store.products) insertProduct.run({ ...entity, payload: payload(entity) });
  for (const entity of store.connectorAccounts) insertAccount.run({ ...entity, baseUrl: entity.baseUrl ?? null, credentialReference: entity.credentialReference ?? null, payload: payload(entity) });
  for (const entity of store.productSources) insertSource.run({ ...entity, externalContainerId: String(entity.externalContainerId), payload: payload(entity) });
  for (const entity of store.issues) insertIssue.run({ ...entity, updatedAt: entity.updatedAt || new Date().toISOString(), payload: payload(entity) });
  for (const entity of store.externalIssueLinks) insertLink.run({ ...entity, externalIssueId: String(entity.externalIssueId), payload: payload(entity) });
  for (const entity of store.repositories || []) insertRepository.run({ ...entity, productId: entity.productId ?? null, verificationStatus: entity.verificationStatus || "unverified", payload: payload(entity) });
  for (const entity of store.harnessAccounts || []) insertHarnessAccount.run({
    ...entity,
    active: entity.active === false ? 0 : 1,
    payload: payload(entity)
  });
  for (const entity of store.agentProfiles || []) insertAgentProfile.run({
    ...entity,
    active: entity.active === false ? 0 : 1,
    payload: payload(entity)
  });
  for (const entity of store.agentAssignments || []) insertAgentAssignment.run({
    ...entity,
    productId: entity.productId ?? null,
    repositoryId: entity.repositoryId ?? null,
    active: entity.active === false ? 0 : 1,
    payload: payload(entity)
  });
  for (const entity of store.agentTasks || []) insertAgentTask.run({
    ...entity,
    productId: entity.productId ?? null,
    repositoryId: entity.repositoryId ?? null,
    issueId: entity.issueId ?? null,
    payload: payload(entity)
  });
  for (const entity of store.conversations || []) insertConversation.run({ ...entity, payload: payload(entity) });
  for (const entity of store.messages || []) insertMessage.run({ ...entity, payload: payload(entity) });
  for (const entity of store.agentRuns || []) insertAgentRun.run({
    ...entity,
    startedAt: entity.startedAt ?? null,
    completedAt: entity.completedAt ?? null,
    payload: payload(entity)
  });
  for (const entity of store.approvalRequests || []) insertApprovalRequest.run({ ...entity, payload: payload(entity) });
  for (const entity of store.issueWritebacks || []) insertIssueWriteback.run({ ...entity, payload: payload(entity) });
  for (const entity of store.managedWorktrees || []) insertManagedWorktree.run({ ...entity, payload: payload(entity) });
  for (const entity of store.fileChangeEvents || []) insertFileChangeEvent.run({ ...entity, payload: payload(entity) });
  for (const entity of store.runArtifacts || []) insertRunArtifact.run({ ...entity, payload: payload(entity) });

  const upsertMetadata = database.prepare(`
    INSERT INTO application_metadata(key, value_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `);
  const now = new Date().toISOString();
  upsertMetadata.run("workspace", JSON.stringify({ version: store.version, createdAt: store.createdAt, updatedAt: store.updatedAt }), now);
  upsertMetadata.run("syncMeta", JSON.stringify(store.syncMeta || {}), now);
}

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, relative, resolve } from "node:path";
import { fetchAssignedProjectIssues, GitHubApiError, updateProjectItemStatus } from "./lib/github.mjs";
import { createGitLabIssue, fetchAssignedGitLabIssues, GitLabApiError, updateGitLabIssueStatus } from "./lib/gitlab.mjs";
import { join as joinPath } from "node:path";
import { readCanonicalStore } from "./lib/local-store.mjs";
import { acknowledgeAgentRunRecovery, appendConversationMessage, beginIssueWriteback, cancelRunApproval, completeIssueWriteback, createAgentTask, createIssueWritebackApproval, createRunApprovalRequest, createWorkspaceEntity, decideRunApproval, executeAgentTaskTurn, failIssueWriteback, getAgentTaskView, getIssueAgentWorkView, getIssueWritebackView, getOperationalHealth, importGitLabIssues, initializeNeutralWorkspace, listAgentAssignmentViews, listAgentProfileViews, listAgentRuns, listAgentTaskViews, listConversationMessages, listGuardedFileChanges, listHarnessAccountViews, listLegacyIssueViews, listRepositoryVerificationCommands, listRunApprovalRequests, listSupportedAgentModels, readNeutralStore, reconcileInterruptedAgentOperations, recordRepositoryInspection, recordRepositoryVerification, removeAgentAssignment, removeAgentProfile, removeHarnessAccount, removeProductSource, replaceRepositoryVerificationCommands, setRunReviewStatus, updateIssueByExternalIdentity, updateWorkspaceEntity } from "./lib/neutral-store.mjs";
import { appendGoogleSheetValues, createGoogleAuthorizationUrl, createGoogleOAuthState, createGoogleSheetIssueTemplate, exchangeGoogleAuthorizationCode, googleSheetsConnectionStatus, readGoogleSheetValues, saveGoogleOAuthTokens, testGoogleSheetConnection, writeGoogleSheetValues } from "./lib/google-sheets.mjs";
import { openDatabase } from "./lib/database.mjs";
import { createSqliteNeutralStore } from "./lib/sqlite-neutral-store.mjs";
import { importLegacyNeutralStore } from "./lib/legacy-neutral-import.mjs";
import { parseRepositoryRoots, verifyRepositoryPath } from "./lib/repository-paths.mjs";
import { inspectGitRepository } from "./lib/git-inspection.mjs";
import { inspectCodexCli } from "./lib/codex-cli.mjs";
import { RunEventBroker } from "./lib/run-event-broker.mjs";
import { createRepositoryToolService } from "./lib/repository-tools.mjs";
import { createManagedWorktreeService } from "./lib/git-worktrees.mjs";
import { createGuardedWriteService } from "./lib/guarded-write-tools.mjs";
import { createVerificationCommandService } from "./lib/verification-commands.mjs";
import { createRunArtifactService } from "./lib/run-artifacts.mjs";

const port = Number(process.env.PORT || 4173);
const root = process.cwd();
const processStartedAt = new Date().toISOString();
const canonicalStorePath = joinPath(root, "data", "issues.json");
const googleOAuthStorePath = joinPath(root, "data", "google-oauth.json");
const fileEnv = await loadEnv(join(root, ".env"));
const env = { ...fileEnv, ...process.env };
const runEventBroker = new RunEventBroker();
const activeRunControllers = new Map();
const neutralStorePath = resolve(root, env.AHIVE_LEGACY_STORE_PATH || joinPath("data", "maxwell.json"));
const databasePath = resolve(root, env.AHIVE_DATABASE_PATH || joinPath("data", "ahive.db"));
const database = openDatabase(databasePath);
const neutralStore = createSqliteNeutralStore(database, databasePath);
const repositoryRoots = parseRepositoryRoots(env.AHIVE_REPOSITORY_ROOTS);
const repositoryToolRuntime = {
  serverScript: resolve(root, "scripts", "ahive-repository-mcp.mjs"),
  databasePath,
  repositoryRoots,
  auditDirectory: resolve(root, "data", "agent-tool-audit"),
  nodeExecutable: process.execPath,
  worktreeRoot: env.AHIVE_WORKTREE_ROOT,
  artifactRoot: resolve(root, env.AHIVE_ARTIFACT_ROOT || joinPath("data", "run-artifacts"))
};
const repositoryBrowserService = createRepositoryToolService({
  readStore: () => readNeutralStore(neutralStore),
  repositoryRoots
});
const managedWorktreeService = createManagedWorktreeService({
  store: neutralStore,
  repositoryRoots,
  worktreeRoot: env.AHIVE_WORKTREE_ROOT,
  onTrace: event => traceAgentStep(event.runId, event.step, event)
});
const guardedWriteService = createGuardedWriteService({
  store: neutralStore,
  worktreeRoot: env.AHIVE_WORKTREE_ROOT,
  onAudit: event => traceAgentStep(event.runId, `guarded.${event.tool}.${event.phase}`, event)
});
const runArtifactService = createRunArtifactService({
  store: neutralStore,
  root: repositoryToolRuntime.artifactRoot,
  worktreeRoot: env.AHIVE_WORKTREE_ROOT,
  retentionDays: Number(env.AHIVE_ARTIFACT_RETENTION_DAYS || 30)
});
const verificationCommandService = createVerificationCommandService({
  store: neutralStore,
  worktreeRoot: env.AHIVE_WORKTREE_ROOT,
  maxConcurrency: Number(env.AHIVE_VERIFICATION_CONCURRENCY || 2),
  onAudit: event => traceAgentStep(event.runId, `verification.${event.phase}`, event),
  onResult: async (runId, result) => {
    const artifact = await runArtifactService.captureVerification(runId, result);
    traceAgentStep(runId, "artifact.verification.persisted", { artifactId: artifact.id, kind: artifact.kind, status: result.status });
    return artifact;
  }
});
const githubConfig = {
  token: env.GITHUB_TOKEN,
  owner: env.GITHUB_OWNER,
  projectNumber: env.GITHUB_PROJECT_NUMBER
};
const gitlabConfig = {
  token: env.GITLAB_TOKEN,
  baseUrl: env.GITLAB_BASE_URL || "https://gitlab.com",
  defaultProjectId: env.GITLAB_DEFAULT_PROJECT_ID
};
const workspaceConfig = {
  organizationName: env.MAXWELL_ORGANIZATION_NAME || "Zing Developers",
  projectName: env.MAXWELL_PROJECT_NAME || "IRN",
  productName: env.MAXWELL_PRODUCT_NAME || "IRN",
  gitlabBaseUrl: gitlabConfig.baseUrl,
  gitlabAccountName: env.MAXWELL_GITLAB_ACCOUNT_NAME
};
const googleConfig = {
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_REDIRECT_URI || `http://127.0.0.1:${port}/api/google/oauth/callback`,
  refreshToken: env.GOOGLE_REFRESH_TOKEN
};
const googleOAuthStates = new Map();
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};
const workspaceResourceTypes = {
  organizations: "organization",
  projects: "project",
  products: "product",
  "connector-accounts": "connectorAccount",
  "product-sources": "productSource",
  repositories: "repository"
};

const legacyImport = await importLegacyNeutralStore({ database, storeAdapter: neutralStore, jsonPath: neutralStorePath });
if (legacyImport.imported) console.log(`Imported legacy workspace into SQLite; backup: ${legacyImport.backupPath}`);
await initializeNeutralWorkspace(neutralStore, workspaceConfig);
const initialNeutralStore = await readNeutralStore(neutralStore);
if (!initialNeutralStore.issues.length) {
  const legacyStore = await readCanonicalStore(canonicalStorePath);
  if (legacyStore.issues.length) {
    await importGitLabIssues(neutralStore, legacyStore.issues, legacyStore.meta?.gitlab || {}, workspaceConfig);
  }
}
const startupRecovery = await reconcileInterruptedAgentOperations(neutralStore);
traceAgentStep(null, "run.reconciliation.completed", startupRecovery);
let worktreeReconciliation = await managedWorktreeService.reconcile();
if (worktreeReconciliation.enabled) traceAgentStep(null, "worktree.reconciliation.completed", worktreeReconciliation);

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

  try {
    if (requestUrl.pathname === "/api/health" && request.method === "GET") {
      const runtimeStatus = await inspectCodexCli({ executable: env.AHIVE_CODEX_EXECUTABLE });
      return sendJson(response, 200, getOperationalHealth(await readNeutralStore(neutralStore), {
        startedAt: processStartedAt,
        uptimeSeconds: (Date.now() - Date.parse(processStartedAt)) / 1_000,
        codexCliStatus: runtimeStatus.status,
        startupRecovery: { ...startupRecovery, worktrees: worktreeReconciliation }
      }));
    }

    if (requestUrl.pathname === "/api/operations/reconcile" && request.method === "POST") {
      const manualRecovery = await reconcileInterruptedAgentOperations(neutralStore);
      worktreeReconciliation = await managedWorktreeService.reconcile();
      traceAgentStep(null, "operations.manual_reconciliation.completed", { ...manualRecovery, ...worktreeReconciliation });
      return sendJson(response, 200, { recovery: manualRecovery, worktrees: worktreeReconciliation, automaticReplays: 0 });
    }

    if (requestUrl.pathname === "/api/google/oauth/status" && request.method === "GET") {
      const status = await googleSheetsConnectionStatus(googleConfig, googleOAuthStorePath);
      const store = await readNeutralStore(neutralStore);
      return sendJson(response, 200, {
        ...status,
        credentials: {
          clientIdConfigured: Boolean(googleConfig.clientId),
          clientSecretConfigured: Boolean(googleConfig.clientSecret),
          refreshTokenConfigured: Boolean(googleConfig.refreshToken || status.connected)
        },
        productSources: store.productSources.filter(source => source.provider === "sheets").length
      });
    }

    if (requestUrl.pathname === "/api/google/oauth/start" && request.method === "GET") {
      purgeExpiredGoogleOAuthStates();
      const state = createGoogleOAuthState();
      googleOAuthStates.set(state, Date.now() + 10 * 60 * 1000);
      return sendRedirect(response, createGoogleAuthorizationUrl(googleConfig, state));
    }

    if (requestUrl.pathname === "/api/google/oauth/callback" && request.method === "GET") {
      const state = requestUrl.searchParams.get("state");
      const expiresAt = state ? googleOAuthStates.get(state) : null;
      if (!state || !expiresAt || expiresAt < Date.now()) {
        if (state) googleOAuthStates.delete(state);
        const error = new Error("Google OAuth state is missing or expired. Start the connection again.");
        error.status = 400;
        throw error;
      }
      googleOAuthStates.delete(state);
      if (requestUrl.searchParams.get("error")) {
        const error = new Error(`Google authorization was not completed: ${requestUrl.searchParams.get("error")}.`);
        error.status = 400;
        throw error;
      }
      const tokens = await exchangeGoogleAuthorizationCode(googleConfig, requestUrl.searchParams.get("code"));
      await saveGoogleOAuthTokens(googleOAuthStorePath, tokens);
      return sendRedirect(response, "/?google=connected");
    }

    const googleSheetsMatch = requestUrl.pathname.match(/^\/api\/google\/sheets\/([^/]+)\/(test|values|append|template)$/);
    if (googleSheetsMatch) {
      const store = await readNeutralStore(neutralStore);
      const source = resolveGoogleSheetsSource(store, decodeURIComponent(googleSheetsMatch[1]));
      const operation = googleSheetsMatch[2];
      if (operation === "test" && request.method === "GET") {
        return sendJson(response, 200, await testGoogleSheetConnection(googleConfig, googleOAuthStorePath, {
          spreadsheetId: source.externalContainerId
        }));
      }
      if (operation === "values" && request.method === "GET") {
        return sendJson(response, 200, await readGoogleSheetValues(googleConfig, googleOAuthStorePath, {
          spreadsheetId: source.externalContainerId,
          range: resolveGoogleSheetRange(source, requestUrl.searchParams.get("range"))
        }));
      }
      if (operation === "values" && request.method === "PUT") {
        const input = await readJson(request);
        return sendJson(response, 200, await writeGoogleSheetValues(googleConfig, googleOAuthStorePath, {
          spreadsheetId: source.externalContainerId,
          range: resolveGoogleSheetRange(source, input.range),
          values: input.values,
          valueInputOption: input.valueInputOption
        }));
      }
      if (operation === "append" && request.method === "POST") {
        const input = await readJson(request);
        return sendJson(response, 200, await appendGoogleSheetValues(googleConfig, googleOAuthStorePath, {
          spreadsheetId: source.externalContainerId,
          range: resolveGoogleSheetRange(source, input.range),
          values: input.values,
          valueInputOption: input.valueInputOption
        }));
      }
      if (operation === "template" && request.method === "POST") {
        return sendJson(response, 200, await createGoogleSheetIssueTemplate(googleConfig, googleOAuthStorePath, {
          spreadsheetId: source.externalContainerId,
          sheetTab: source.metadata?.sheetTab || "Tasks"
        }));
      }
      return sendJson(response, 405, { error: "Method not allowed for this Google Sheets operation." });
    }

    const createWorkspaceMatch = requestUrl.pathname.match(/^\/api\/workspace\/([^/]+)$/);
    if (createWorkspaceMatch && request.method === "POST") {
      const type = workspaceResourceTypes[createWorkspaceMatch[1]];
      if (!type) return sendJson(response, 404, { error: "Workspace resource not found." });
      const result = await createWorkspaceEntity(neutralStore, type, await readJson(request));
      return sendJson(response, 201, { entity: result.entity, workspace: result.store });
    }

    const updateWorkspaceMatch = requestUrl.pathname.match(/^\/api\/workspace\/([^/]+)\/([^/]+)$/);
    if (updateWorkspaceMatch && request.method === "PATCH") {
      const type = workspaceResourceTypes[updateWorkspaceMatch[1]];
      if (!type) return sendJson(response, 404, { error: "Workspace resource not found." });
      const id = decodeURIComponent(updateWorkspaceMatch[2]);
      const result = await updateWorkspaceEntity(neutralStore, type, id, await readJson(request));
      return sendJson(response, 200, { entity: result.entity, workspace: result.store });
    }

    if (updateWorkspaceMatch && request.method === "DELETE") {
      const type = workspaceResourceTypes[updateWorkspaceMatch[1]];
      if (type !== "productSource") return sendJson(response, 405, { error: "Only unused Product Sources can be removed." });
      const id = decodeURIComponent(updateWorkspaceMatch[2]);
      const result = await removeProductSource(neutralStore, id);
      return sendJson(response, 200, { entity: result.entity, workspace: result.store });
    }

    const repositoryOperationMatch = requestUrl.pathname.match(/^\/api\/repositories\/([^/]+)\/(verify|inspect)$/);
    if (repositoryOperationMatch) {
      const id = decodeURIComponent(repositoryOperationMatch[1]);
      const operation = repositoryOperationMatch[2];
      const store = await readNeutralStore(neutralStore);
      const repository = store.repositories.find(entity => entity.id === id);
      if (!repository) return sendJson(response, 404, { error: `Repository ${id} was not found.` });
      if (operation === "verify" && request.method === "POST") {
        try {
          const verification = await verifyRepositoryPath(repository.localPath, repositoryRoots);
          const result = await recordRepositoryVerification(neutralStore, id, verification);
          return sendJson(response, 200, { repository: result.entity });
        } catch (error) {
          if (error.status && error.status < 500) {
            const result = await recordRepositoryVerification(neutralStore, id, { valid: false, error: error.message });
            return sendJson(response, error.status, { error: error.message, repository: result.entity });
          }
          throw error;
        }
      }
      if (operation === "inspect" && request.method === "GET") {
        if (repository.verificationStatus !== "verified" || !repository.resolvedPath) {
          return sendJson(response, 409, { error: "Repository must be verified before Git inspection." });
        }
        const currentVerification = await verifyRepositoryPath(repository.resolvedPath, repositoryRoots);
        const metadata = await inspectGitRepository(currentVerification.resolvedPath);
        const result = await recordRepositoryInspection(neutralStore, id, metadata);
        return sendJson(response, 200, { repository: result.entity, git: metadata });
      }
      return sendJson(response, 405, { error: "Method not allowed for this Repository operation." });
    }

    const repositoryCommandsMatch = requestUrl.pathname.match(/^\/api\/repositories\/([^/]+)\/verification-commands$/);
    if (repositoryCommandsMatch) {
      const repositoryId = decodeURIComponent(repositoryCommandsMatch[1]);
      if (request.method === "GET") {
        return sendJson(response, 200, { verificationCommands: listRepositoryVerificationCommands(await readNeutralStore(neutralStore), repositoryId) });
      }
      if (request.method === "PUT") {
        const result = await replaceRepositoryVerificationCommands(neutralStore, repositoryId, await readJson(request));
        traceAgentStep(null, "verification.policy.updated", { repositoryId, commandCount: result.verificationCommands.length });
        return sendJson(response, 200, { verificationCommands: result.verificationCommands });
      }
      return sendJson(response, 405, { error: "Method not allowed for Repository verification commands." });
    }

    if (requestUrl.pathname === "/api/harness-accounts") {
      const runtimeStatus = await inspectCodexCli({ executable: env.AHIVE_CODEX_EXECUTABLE });
      if (request.method === "GET") {
        const store = await readNeutralStore(neutralStore);
        return sendJson(response, 200, { harnessAccounts: listHarnessAccountViews(store, runtimeStatus) });
      }
      if (request.method === "POST") {
        const result = await createWorkspaceEntity(neutralStore, "harnessAccount", await readJson(request));
        const [account] = listHarnessAccountViews({ ...result.store, harnessAccounts: [result.entity] }, runtimeStatus);
        return sendJson(response, 201, { harnessAccount: account });
      }
      return sendJson(response, 405, { error: "Method not allowed for Harness Accounts." });
    }

    if (requestUrl.pathname === "/api/agent-models" && request.method === "GET") {
      return sendJson(response, 200, { models: listSupportedAgentModels() });
    }

    const harnessAccountMatch = requestUrl.pathname.match(/^\/api\/harness-accounts\/([^/]+)$/);
    if (harnessAccountMatch) {
      const id = decodeURIComponent(harnessAccountMatch[1]);
      if (request.method === "PATCH") {
        const result = await updateWorkspaceEntity(neutralStore, "harnessAccount", id, await readJson(request));
        const runtimeStatus = await inspectCodexCli({ executable: env.AHIVE_CODEX_EXECUTABLE });
        const [account] = listHarnessAccountViews({ ...result.store, harnessAccounts: [result.entity] }, runtimeStatus);
        return sendJson(response, 200, { harnessAccount: account });
      }
      if (request.method === "DELETE") {
        const result = await removeHarnessAccount(neutralStore, id);
        return sendJson(response, 200, { harnessAccount: result.entity });
      }
      return sendJson(response, 405, { error: "Method not allowed for this Harness Account." });
    }

    if (requestUrl.pathname === "/api/agent-profiles") {
      const runtimeStatus = await inspectCodexCli({ executable: env.AHIVE_CODEX_EXECUTABLE });
      if (request.method === "GET") {
        const store = await readNeutralStore(neutralStore);
        return sendJson(response, 200, { agentProfiles: listAgentProfileViews(store, runtimeStatus) });
      }
      if (request.method === "POST") {
        const result = await createWorkspaceEntity(neutralStore, "agentProfile", await readJson(request));
        const [profile] = listAgentProfileViews({ ...result.store, agentProfiles: [result.entity] }, runtimeStatus);
        return sendJson(response, 201, { agentProfile: profile });
      }
      return sendJson(response, 405, { error: "Method not allowed for Agent Profiles." });
    }

    const agentProfileMatch = requestUrl.pathname.match(/^\/api\/agent-profiles\/([^/]+)$/);
    if (agentProfileMatch) {
      const id = decodeURIComponent(agentProfileMatch[1]);
      if (request.method === "PATCH") {
        const result = await updateWorkspaceEntity(neutralStore, "agentProfile", id, await readJson(request));
        const runtimeStatus = await inspectCodexCli({ executable: env.AHIVE_CODEX_EXECUTABLE });
        const [profile] = listAgentProfileViews({ ...result.store, agentProfiles: [result.entity] }, runtimeStatus);
        return sendJson(response, 200, { agentProfile: profile });
      }
      if (request.method === "DELETE") {
        const result = await removeAgentProfile(neutralStore, id);
        return sendJson(response, 200, { agentProfile: result.entity });
      }
      return sendJson(response, 405, { error: "Method not allowed for this Agent Profile." });
    }

    if (requestUrl.pathname === "/api/agent-assignments") {
      const runtimeStatus = await inspectCodexCli({ executable: env.AHIVE_CODEX_EXECUTABLE });
      if (request.method === "GET") {
        const store = await readNeutralStore(neutralStore);
        return sendJson(response, 200, { agentAssignments: listAgentAssignmentViews(store, runtimeStatus) });
      }
      if (request.method === "POST") {
        const result = await createWorkspaceEntity(neutralStore, "agentAssignment", await readJson(request));
        const [assignment] = listAgentAssignmentViews({ ...result.store, agentAssignments: [result.entity] }, runtimeStatus);
        return sendJson(response, 201, { agentAssignment: assignment });
      }
      return sendJson(response, 405, { error: "Method not allowed for Agent Assignments." });
    }

    const agentAssignmentMatch = requestUrl.pathname.match(/^\/api\/agent-assignments\/([^/]+)$/);
    if (agentAssignmentMatch) {
      const id = decodeURIComponent(agentAssignmentMatch[1]);
      if (request.method === "PATCH") {
        const result = await updateWorkspaceEntity(neutralStore, "agentAssignment", id, await readJson(request));
        const runtimeStatus = await inspectCodexCli({ executable: env.AHIVE_CODEX_EXECUTABLE });
        const [assignment] = listAgentAssignmentViews({ ...result.store, agentAssignments: [result.entity] }, runtimeStatus);
        return sendJson(response, 200, { agentAssignment: assignment });
      }
      if (request.method === "DELETE") {
        const result = await removeAgentAssignment(neutralStore, id);
        return sendJson(response, 200, { agentAssignment: result.entity });
      }
      return sendJson(response, 405, { error: "Method not allowed for this Agent Assignment." });
    }

    const issueAgentWorkMatch = requestUrl.pathname.match(/^\/api\/issues\/([^/]+)\/agent-work$/);
    if (issueAgentWorkMatch && request.method === "GET") {
      const runtimeStatus = await inspectCodexCli({ executable: env.AHIVE_CODEX_EXECUTABLE });
      return sendJson(response, 200, getIssueAgentWorkView(
        await readNeutralStore(neutralStore),
        decodeURIComponent(issueAgentWorkMatch[1]),
        runtimeStatus
      ));
    }

    if (requestUrl.pathname === "/api/agent-tasks") {
      if (request.method === "GET") {
        return sendJson(response, 200, { agentTasks: listAgentTaskViews(await readNeutralStore(neutralStore)) });
      }
      if (request.method === "POST") {
        const result = await createAgentTask(neutralStore, await readJson(request));
        return sendJson(response, 201, { agentTask: getAgentTaskView(result.store, result.task.id) });
      }
      return sendJson(response, 405, { error: "Method not allowed for Agent Tasks." });
    }

    const agentTaskMessagesMatch = requestUrl.pathname.match(/^\/api\/agent-tasks\/([^/]+)\/messages$/);
    if (agentTaskMessagesMatch) {
      const id = decodeURIComponent(agentTaskMessagesMatch[1]);
      if (request.method === "GET") {
        const store = await readNeutralStore(neutralStore);
        return sendJson(response, 200, listConversationMessages(store, id, {
          cursor: requestUrl.searchParams.get("cursor"),
          limit: requestUrl.searchParams.get("limit")
        }));
      }
      if (request.method === "POST") {
        const result = await appendConversationMessage(neutralStore, id, await readJson(request));
        return sendJson(response, 201, { message: result.message });
      }
      return sendJson(response, 405, { error: "Method not allowed for Agent Task Messages." });
    }

    const agentTaskRunsMatch = requestUrl.pathname.match(/^\/api\/agent-tasks\/([^/]+)\/runs$/);
    if (agentTaskRunsMatch) {
      const id = decodeURIComponent(agentTaskRunsMatch[1]);
      if (request.method === "GET") {
        return sendJson(response, 200, { agentRuns: listAgentRuns(await readNeutralStore(neutralStore), id) });
      }
      if (request.method === "POST") {
        traceAgentStep(null, "run.requested", { agentTaskId: id });
        const runtimeStatus = await inspectCodexCli({ executable: env.AHIVE_CODEX_EXECUTABLE });
        const controller = new AbortController();
        let startedRunId = null;
        let startedResolve;
        const started = new Promise(resolve => { startedResolve = resolve; });
        const execution = executeAgentTaskTurn(neutralStore, id, await readJson(request), {
          runtimeStatus,
          executable: env.AHIVE_CODEX_EXECUTABLE,
          cwd: root,
          signal: controller.signal,
          repositoryToolRuntime,
          onRunStarted: run => {
            startedRunId = run.id;
            activeRunControllers.set(run.id, controller);
            runEventBroker.publish(run.id, "run.started", { status: run.status, startedAt: run.startedAt });
            traceAgentStep(run.id, "run.started", { agentTaskId: id, status: run.status });
            startedResolve(run);
          },
          onEvent: event => {
            const runId = [...activeRunControllers.entries()].find(([, value]) => value === controller)?.[0];
            if (runId) {
              if (event.type === "assistant.output") runEventBroker.publishLatest(runId, event.type, event);
              else runEventBroker.publish(runId, event.type, event);
              traceAgentStep(runId, event.type, event);
            }
          },
          onTrace: event => traceAgentStep(event.runId, `repository.${event.tool}.${event.phase}`, event)
        });
        execution.then(async result => {
          activeRunControllers.delete(result.run.id);
          const artifacts = await runArtifactService.captureOutcome(result.run.id, {
            finalMessage: result.assistantMessage?.content,
            errorSummary: result.run.errorSummary,
            status: result.run.status
          }).catch(error => traceAgentStep(result.run.id, "artifact.capture.failed", { errorCode: String(error?.code || "artifact_capture_failed") }));
          if (artifacts?.length) traceAgentStep(result.run.id, "artifact.outcome.persisted", { count: artifacts.length, kinds: artifacts.map(item => item.kind) });
          for (const activity of result.run.toolActivity || []) {
            traceAgentStep(result.run.id, `repository.audit.${activity.tool}.${activity.phase}`, activity);
          }
          runEventBroker.markTerminal(result.run.id, "run.terminal", {
            status: result.run.status,
            completedAt: result.run.completedAt,
            assistantMessageId: result.assistantMessage?.id || null
          });
          traceAgentStep(result.run.id, "run.terminal", { status: result.run.status, toolEvents: result.run.toolActivity?.length || 0 });
        }).catch(() => {
          if (!startedRunId) return;
          activeRunControllers.delete(startedRunId);
          runEventBroker.markTerminal(startedRunId, "run.terminal", { status: "failed" });
          traceAgentStep(startedRunId, "run.terminal", { status: "failed", errorCode: "execution_failure" });
        });
        const run = await Promise.race([started, execution.then(result => result.run)]);
        return sendJson(response, 202, { agentRun: run });
      }
      return sendJson(response, 405, { error: "Method not allowed for Agent Runs." });
    }

    const agentTaskRepositoryMatch = requestUrl.pathname.match(/^\/api\/agent-tasks\/([^/]+)\/repository\/(tree|file)$/);
    if (agentTaskRepositoryMatch && request.method === "GET") {
      const taskId = decodeURIComponent(agentTaskRepositoryMatch[1]);
      const operation = agentTaskRepositoryMatch[2];
      const task = getAgentTaskView(await readNeutralStore(neutralStore), taskId);
      if (!task.repositoryId) {
        const error = new Error("This Agent Task has no assigned Repository.");
        error.status = 409;
        throw error;
      }
      const path = requestUrl.searchParams.get("path") || ".";
      if (operation === "tree") {
        return sendJson(response, 200, { directory: await repositoryBrowserService.browseDirectory(task.repositoryId, { path, limit: 200 }) });
      }
      return sendJson(response, 200, { file: await repositoryBrowserService.readText(task.repositoryId, {
        path,
        startLine: requestUrl.searchParams.get("startLine") || 1,
        maxLines: 200
      }) });
    }

    const agentRunApprovalsMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/approvals$/);
    if (agentRunApprovalsMatch) {
      const runId = decodeURIComponent(agentRunApprovalsMatch[1]);
      if (request.method === "GET") {
        return sendJson(response, 200, { approvalRequests: listRunApprovalRequests(await readNeutralStore(neutralStore), runId) });
      }
      if (request.method === "POST") {
        const result = await createRunApprovalRequest(neutralStore, runId, await readJson(request));
        traceAgentStep(runId, "approval.requested", {
          approvalRequestId: result.approval.id,
          capability: result.approval.capability,
          targetType: result.approval.targetType,
          status: result.approval.status
        });
        return sendJson(response, 201, { approvalRequest: result.approval, agentRun: result.run });
      }
      return sendJson(response, 405, { error: "Method not allowed for Approval Requests." });
    }

    const agentRunApprovalOperationMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/approvals\/([^/]+)\/(decision|cancel)$/);
    if (agentRunApprovalOperationMatch && request.method === "POST") {
      const runId = decodeURIComponent(agentRunApprovalOperationMatch[1]);
      const approvalId = decodeURIComponent(agentRunApprovalOperationMatch[2]);
      const operation = agentRunApprovalOperationMatch[3];
      const input = await readJson(request);
      const result = operation === "decision"
        ? await decideRunApproval(neutralStore, runId, approvalId, input)
        : await cancelRunApproval(neutralStore, runId, approvalId, input);
      traceAgentStep(runId, `approval.${result.approval.status}`, {
        approvalRequestId: result.approval.id,
        capability: result.approval.capability,
        targetType: result.approval.targetType,
        status: result.approval.status,
        actor: result.approval.cancelledBy || result.approval.decidedBy
      });
      const status = result.reason === "expired" ? 409 : 200;
      return sendJson(response, status, { approvalRequest: result.approval, agentRun: result.run, accepted: result.accepted });
    }

    const agentRunWorktreeMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/worktree$/);
    if (agentRunWorktreeMatch) {
      const runId = decodeURIComponent(agentRunWorktreeMatch[1]);
      if (request.method === "GET") return sendJson(response, 200, { managedWorktree: await managedWorktreeService.getForRun(runId) });
      if (request.method === "POST") {
        const input = await readJson(request);
        const worktree = await managedWorktreeService.create(runId, input.approvalRequestId, { actor: input.actor });
        return sendJson(response, 201, { managedWorktree: worktree });
      }
      return sendJson(response, 405, { error: "Method not allowed for Agent Run worktree." });
    }

    const managedWorktreeOperationMatch = requestUrl.pathname.match(/^\/api\/managed-worktrees\/([^/]+)\/(inspect|retain|discard)$/);
    if (managedWorktreeOperationMatch) {
      if (request.method !== "POST" && !(request.method === "GET" && managedWorktreeOperationMatch[2] === "inspect")) {
        return sendJson(response, 405, { error: "Method not allowed for managed worktree operation." });
      }
      const id = decodeURIComponent(managedWorktreeOperationMatch[1]);
      const operation = managedWorktreeOperationMatch[2];
      const worktree = operation === "inspect"
        ? await managedWorktreeService.inspect(id)
        : operation === "retain"
          ? await managedWorktreeService.retain(id)
          : await managedWorktreeService.discard(id, await readJson(request));
      return sendJson(response, 200, { managedWorktree: worktree });
    }

    const guardedWriteMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/guarded-write\/(apply-patch|create-file)$/);
    if (guardedWriteMatch && request.method === "POST") {
      const runId = decodeURIComponent(guardedWriteMatch[1]);
      const operation = guardedWriteMatch[2];
      const input = await readJson(request);
      const result = operation === "apply-patch"
        ? await guardedWriteService.applyPatch(runId, input)
        : await guardedWriteService.createFile(runId, input);
      return sendJson(response, 200, { fileChange: result });
    }

    const guardedWriteEventsMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/file-changes$/);
    if (guardedWriteEventsMatch && request.method === "GET") {
      const runId = decodeURIComponent(guardedWriteEventsMatch[1]);
      return sendJson(response, 200, { fileChanges: listGuardedFileChanges(await readNeutralStore(neutralStore), runId) });
    }

    const verificationExecutionMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/verifications\/([^/]+)$/);
    if (verificationExecutionMatch && request.method === "POST") {
      const runId = decodeURIComponent(verificationExecutionMatch[1]);
      const policyId = decodeURIComponent(verificationExecutionMatch[2]);
      const input = await readJson(request);
      const result = await verificationCommandService.execute(runId, policyId, { actor: input.actor });
      return sendJson(response, 200, { verification: result });
    }

    const runArtifactsMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/artifacts(?:\/([^/]+))?$/);
    if (runArtifactsMatch && request.method === "GET") {
      const runId = decodeURIComponent(runArtifactsMatch[1]);
      const artifactId = runArtifactsMatch[2] ? decodeURIComponent(runArtifactsMatch[2]) : null;
      if (artifactId) return sendJson(response, 200, await runArtifactService.read(runId, artifactId));
      await runArtifactService.captureReview(runId);
      return sendJson(response, 200, { artifacts: await runArtifactService.list(runId) });
    }

    const issueWritebackMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/issue-writeback(?:\/(approval|execute))?$/);
    if (issueWritebackMatch) {
      const runId = decodeURIComponent(issueWritebackMatch[1]);
      const operation = issueWritebackMatch[2] || "preview";
      if (request.method === "GET" && operation === "preview") {
        return sendJson(response, 200, { issueWriteback: getIssueWritebackView(await readNeutralStore(neutralStore), runId) });
      }
      if (request.method === "POST" && operation === "approval") {
        const result = await createIssueWritebackApproval(neutralStore, runId, await readJson(request));
        traceAgentStep(runId, "issue.writeback.approval_requested", {
          writebackId: result.writeback.id,
          approvalRequestId: result.approval.id,
          targetId: result.approval.targetId,
          requestedStatus: result.writeback.requestedStatus
        });
        return sendJson(response, 201, { issueWriteback: result.writeback, approvalRequest: result.approval, agentRun: result.run });
      }
      if (request.method === "POST" && operation === "execute") {
        const input = await readJson(request);
        const started = await beginIssueWriteback(neutralStore, runId, input.approvalRequestId, { actor: input.actor || "local-user" });
        traceAgentStep(runId, "issue.writeback.started", {
          writebackId: started.writeback.id,
          approvalRequestId: started.approval.id,
          provider: started.target.provider,
          targetId: started.approval.targetId
        });
        try {
          if (started.target.provider !== "gitlab") {
            const unsupported = new Error(`Issue write-back is not implemented for ${started.target.provider}.`);
            unsupported.code = "provider_not_supported";
            unsupported.status = 409;
            throw unsupported;
          }
          const credentialReference = String(started.target.credentialReference || "");
          if (!/^[A-Z][A-Z0-9_]*$/.test(credentialReference) || !env[credentialReference]) {
            const missing = new Error(`The ${credentialReference || "GitLab token"} credential reference is not configured.`);
            missing.code = "credential_unavailable";
            missing.status = 503;
            throw missing;
          }
          const upstream = await updateGitLabIssueStatus({
            token: env[credentialReference],
            baseUrl: started.target.baseUrl || gitlabConfig.baseUrl
          }, {
            projectId: started.target.externalContainerId,
            issueIid: started.target.externalIssueId,
            completed: started.writeback.requestedStatus === "done"
          });
          const completed = await completeIssueWriteback(neutralStore, started.writeback.id, { upstreamState: upstream.gitlabState });
          traceAgentStep(runId, "issue.writeback.succeeded", {
            writebackId: completed.writeback.id,
            requestedStatus: completed.writeback.requestedStatus,
            upstreamState: completed.writeback.upstreamState
          });
          return sendJson(response, 200, { issueWriteback: completed.writeback, issue: completed.issue });
        } catch (error) {
          const failed = await failIssueWriteback(neutralStore, started.writeback.id, {
            code: error.code || error.name || "upstream_write_failed",
            message: error.message
          });
          traceAgentStep(runId, "issue.writeback.failed", {
            writebackId: failed.writeback.id,
            errorCode: failed.writeback.errorCode,
            provider: started.target.provider
          });
          return sendJson(response, Number(error.status) || 502, { error: error.message, issueWriteback: failed.writeback });
        }
      }
      return sendJson(response, 405, { error: "Method not allowed for Issue write-back." });
    }

    const runReviewMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/review$/);
    if (runReviewMatch) {
      const runId = decodeURIComponent(runReviewMatch[1]);
      if (request.method === "POST") {
        const result = await setRunReviewStatus(neutralStore, runId, await readJson(request));
        traceAgentStep(runId, "review.decision.recorded", { reviewStatus: result.agentRun.reviewStatus, actor: result.agentRun.reviewedBy });
        return sendJson(response, 200, { agentRun: result.agentRun });
      }
      if (request.method === "GET") {
        await runArtifactService.captureReview(runId);
        const store = await readNeutralStore(neutralStore);
        const run = store.agentRuns.find(item => item.id === runId);
        if (!run) return sendJson(response, 404, { error: "Agent Run was not found." });
        const task = store.agentTasks.find(item => item.id === run.agentTaskId);
        const worktree = store.managedWorktrees.find(item => item.agentRunId === runId) || null;
        const repository = task?.repositoryId ? store.repositories.find(item => item.id === task.repositoryId) : null;
        return sendJson(response, 200, {
          agentRun: run,
          approvalRequests: listRunApprovalRequests(store, runId),
          managedWorktree: worktree,
          fileChanges: listGuardedFileChanges(store, runId),
          verificationCommands: repository ? listRepositoryVerificationCommands(store, repository.id) : [],
          issueWriteback: getIssueWritebackView(store, runId),
          artifacts: await runArtifactService.list(runId)
        });
      }
      return sendJson(response, 405, { error: "Method not allowed for Agent Run review." });
    }

    const agentRunEventsMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/events$/);
    if (agentRunEventsMatch && request.method === "GET") {
      const runId = decodeURIComponent(agentRunEventsMatch[1]);
      const store = await readNeutralStore(neutralStore);
      if (!store.agentRuns.some(run => run.id === runId)) return sendJson(response, 404, { error: "Agent Run was not found." });
      const cursor = Number(request.headers["last-event-id"] || requestUrl.searchParams.get("cursor") || 0);
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      });
      const send = event => response.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      const unsubscribe = runEventBroker.subscribe(runId, Number.isInteger(cursor) && cursor >= 0 ? cursor : 0, send);
      const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 15_000);
      const close = () => { clearInterval(heartbeat); unsubscribe(); };
      request.once("close", close);
      if (runEventBroker.isTerminal(runId)) {
        close();
        response.end();
      }
      return;
    }

    const agentRunCancelMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/cancel$/);
    if (agentRunCancelMatch && request.method === "POST") {
      const runId = decodeURIComponent(agentRunCancelMatch[1]);
      const controller = activeRunControllers.get(runId);
      const verificationCancelled = verificationCommandService.cancel(runId);
      if (!controller && !verificationCancelled) return sendJson(response, 409, { error: "Agent Run is not active." });
      controller?.abort();
      runEventBroker.publish(runId, "run.cancelling", { status: "cancelling" });
      traceAgentStep(runId, "run.cancelling", { status: "cancelling", verificationCancelled });
      return sendJson(response, 202, { agentRunId: runId, status: "cancelling" });
    }

    const agentRunRecoveryMatch = requestUrl.pathname.match(/^\/api\/agent-runs\/([^/]+)\/recovery\/acknowledge$/);
    if (agentRunRecoveryMatch && request.method === "POST") {
      const runId = decodeURIComponent(agentRunRecoveryMatch[1]);
      const result = await acknowledgeAgentRunRecovery(neutralStore, runId, await readJson(request));
      traceAgentStep(runId, "run.recovery.acknowledged", { status: result.agentRun.status, actor: result.agentRun.recovery.acknowledgedBy });
      return sendJson(response, 200, { agentRun: result.agentRun });
    }

    const agentTaskMatch = requestUrl.pathname.match(/^\/api\/agent-tasks\/([^/]+)$/);
    if (agentTaskMatch && request.method === "GET") {
      const store = await readNeutralStore(neutralStore);
      return sendJson(response, 200, { agentTask: getAgentTaskView(store, decodeURIComponent(agentTaskMatch[1])) });
    }

    if (requestUrl.pathname === "/api/github/sync" && request.method === "GET") {
      return sendJson(response, 200, await fetchAssignedProjectIssues(githubConfig));
    }

    if (requestUrl.pathname === "/api/github/status" && request.method === "PATCH") {
      const input = await readJson(request);
      return sendJson(response, 200, await updateProjectItemStatus(githubConfig, input));
    }

    if (requestUrl.pathname === "/api/gitlab/sync" && request.method === "GET") {
      const result = await fetchAssignedGitLabIssues(gitlabConfig);
      const imported = await importGitLabIssues(neutralStore, result.issues, result.meta, workspaceConfig);
      return sendJson(response, 200, {
        ...result,
        issues: listLegacyIssueViews(imported.store, { issueIds: imported.importedIssueIds }),
        persistence: { created: imported.created, updated: imported.updated, storeVersion: imported.store.version }
      });
    }

    if (requestUrl.pathname === "/api/gitlab/status" && request.method === "PATCH") {
      const input = await readJson(request);
      const result = await updateGitLabIssueStatus(gitlabConfig, input);
      await updateIssueByExternalIdentity(neutralStore, {
        provider: "gitlab",
        baseUrl: gitlabConfig.baseUrl,
        externalContainerId: input.projectId,
        externalIssueId: input.issueIid
      }, { status: result.status });
      return sendJson(response, 200, result);
    }

    if (requestUrl.pathname === "/api/gitlab/issues" && request.method === "POST") {
      const input = await readJson(request);
      const store = await readNeutralStore(neutralStore);
      const knownProjectIds = [...new Set(store.productSources
        .filter(source => source.provider === "gitlab")
        .map(source => source.externalContainerId)
        .filter(Boolean))];
      const projectId = input.projectId || gitlabConfig.defaultProjectId || (knownProjectIds.length === 1 ? knownProjectIds[0] : null);
      const issue = await createGitLabIssue(gitlabConfig, { ...input, projectId });
      const imported = await importGitLabIssues(neutralStore, [issue], {
        ...(store.syncMeta?.gitlab || {}),
        syncedAt: new Date().toISOString()
      }, workspaceConfig);
      const [persistedIssue] = listLegacyIssueViews(imported.store, { issueIds: imported.importedIssueIds });
      return sendJson(response, 201, { issue: persistedIssue });
    }

    if (requestUrl.pathname === "/api/local/issues" && request.method === "GET") {
      const store = await readNeutralStore(neutralStore);
      return sendJson(response, 200, {
        version: store.version,
        issues: listLegacyIssueViews(store),
        meta: store.syncMeta,
        updatedAt: store.updatedAt
      });
    }

    if (requestUrl.pathname === "/api/local/workspace" && request.method === "GET") {
      return sendJson(response, 200, await readNeutralStore(neutralStore));
    }

    if (requestUrl.pathname === "/api/sync/outbound" && request.method === "POST") {
      const store = await readNeutralStore(neutralStore);
      const googleStatus = await googleSheetsConnectionStatus(googleConfig, googleOAuthStorePath);
      return sendJson(response, 200, {
        canonicalIssues: store.issues.length,
        canonicalUpdatedAt: store.updatedAt,
        published: 0,
        targets: [
          { provider: "github", label: "GitHub Projects", configured: Boolean(githubConfig.token), status: githubConfig.token ? "ready_for_mapping" : "needs_credentials" },
          { provider: "openproject", label: "OpenProject", configured: Boolean(env.OPENPROJECT_API_TOKEN && env.OPENPROJECT_API_URL), status: "connector_pending" },
          { provider: "sheets", label: "Google Sheets", configured: googleStatus.connected && store.productSources.some(source => source.provider === "sheets"), status: googleStatus.connected ? "ready_for_mapping" : "needs_credentials" }
        ]
      });
    }

    if (requestUrl.pathname.startsWith("/api/")) {
      return sendJson(response, 404, { error: "API route not found." });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return sendJson(response, 405, { error: "Method not allowed." });
    }

    const requestPath = decodeURIComponent(requestUrl.pathname);
    const requestedFile = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    const filePath = normalize(join(root, requestedFile));
    const relativePath = relative(root, filePath);
    if (relativePath.startsWith("..") || relativePath.includes(":") || relativePath === ".env" || relativePath.startsWith(".git")) {
      return sendJson(response, 404, { error: "Not found." });
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error instanceof GitHubApiError || error instanceof GitLabApiError) {
      return sendJson(response, error.status, { error: error.message, details: error.details });
    }
    if (error?.code === "ENOENT") return sendJson(response, 404, { error: "Not found." });
    if (error?.status) return sendJson(response, error.status, { error: error.message });
    console.error(error);
    return sendJson(response, 500, { error: "Unexpected server error." });
  }
});

server.listen(port, "127.0.0.1", () => {
  const states = [githubConfig.token ? "GitHub configured" : "GitHub token missing", gitlabConfig.token ? "GitLab configured" : "GitLab token missing"];
  console.log(`Ahive is ready at http://127.0.0.1:${port} (${states.join(", ")})`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => {
    database.close();
    process.exit(0);
  }));
}

async function loadEnv(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    return Object.fromEntries(content.split(/\r?\n/).flatMap(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return [];
      const separator = trimmed.indexOf("=");
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      return [[key, value.replace(/\\n/g, "\n")]];
    }));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch {
    const error = new Error("Request body must be valid JSON.");
    error.status = 400;
    throw error;
  }
}

function traceAgentStep(runId, step, details = {}) {
  const safe = { timestamp: new Date().toISOString(), runId: runId || null, step };
  if (details.agentTaskId) safe.agentTaskId = String(details.agentTaskId);
  if (details.status) safe.status = String(details.status);
  if (details.threadId) safe.threadId = String(details.threadId).slice(0, 80);
  if (details.toolType) safe.toolType = String(details.toolType).slice(0, 80);
  if (details.toolName) safe.toolName = String(details.toolName).slice(0, 80);
  if (details.stepType) safe.stepType = String(details.stepType).slice(0, 80);
  if (details.tool) safe.tool = String(details.tool).slice(0, 80);
  if (details.phase) safe.phase = String(details.phase).slice(0, 40);
  if (details.repositoryId) safe.repositoryId = String(details.repositoryId);
  if (details.worktreeId) safe.worktreeId = String(details.worktreeId);
  if (typeof details.present === "boolean") safe.present = details.present;
  if (typeof details.dirty === "boolean") safe.dirty = details.dirty;
  if (Number.isFinite(details.reconciled)) safe.reconciled = details.reconciled;
  if (Number.isFinite(details.retained)) safe.retained = details.retained;
  if (Number.isFinite(details.missing)) safe.missing = details.missing;
  if (Number.isFinite(details.failures)) safe.failures = details.failures;
  if (details.errorCode) safe.errorCode = String(details.errorCode).slice(0, 80);
  if (Number.isFinite(details.durationMs)) safe.durationMs = details.durationMs;
  if (Number.isFinite(details.toolEvents)) safe.toolEvents = details.toolEvents;
  for (const key of ["interruptedRuns", "cancelledApprovals", "expiredApprovals", "failedFileChanges", "failedIssueWritebacks", "automaticReplays"]) {
    if (Number.isFinite(details[key])) safe[key] = details[key];
  }
  if (details.usage && typeof details.usage === "object") {
    const usage = {};
    for (const key of ["input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens"]) {
      if (Number.isFinite(details.usage[key])) usage[key] = Number(details.usage[key]);
    }
    if (Object.keys(usage).length) safe.usage = usage;
  }
  if (typeof details.text === "string") safe.outputCharacters = details.text.length;
  console.log(`[agent-trace] ${JSON.stringify(safe)}`);
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendRedirect(response, location) {
  response.writeHead(302, { Location: location, "Cache-Control": "no-store" });
  response.end();
}

function purgeExpiredGoogleOAuthStates() {
  const now = Date.now();
  for (const [state, expiresAt] of googleOAuthStates) {
    if (expiresAt < now) googleOAuthStates.delete(state);
  }
}

function resolveGoogleSheetsSource(store, id) {
  const source = store.productSources.find(item => item.id === id);
  if (!source || source.provider !== "sheets") {
    const error = new Error("Google Sheets Product Source was not found.");
    error.status = 404;
    throw error;
  }
  if (!source.active) {
    const error = new Error("This Google Sheets Product Source is inactive.");
    error.status = 409;
    throw error;
  }
  return source;
}

function resolveGoogleSheetRange(source, requestedRange) {
  const sheetTab = String(source.metadata?.sheetTab || "Tasks").trim();
  const quotedTab = `'${sheetTab.replace(/'/g, "''")}'`;
  const defaultRange = source.metadata?.range || `${quotedTab}!A:Z`;
  const requested = String(requestedRange || "").trim();
  if (!requested) return defaultRange;
  if (!requested.includes("!")) return `${quotedTab}!${requested}`;
  const separator = requested.lastIndexOf("!");
  const requestedTab = requested.slice(0, separator);
  if (![sheetTab, quotedTab].includes(requestedTab)) {
    const error = new Error(`Range must stay inside the configured “${sheetTab}” tab.`);
    error.status = 400;
    throw error;
  }
  return requested;
}

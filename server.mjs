import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, relative } from "node:path";
import { fetchAssignedProjectIssues, GitHubApiError, updateProjectItemStatus } from "./lib/github.mjs";
import { createGitLabIssue, fetchAssignedGitLabIssues, GitLabApiError, updateGitLabIssueStatus } from "./lib/gitlab.mjs";
import { join as joinPath } from "node:path";
import { readCanonicalStore } from "./lib/local-store.mjs";
import { createWorkspaceEntity, importGitLabIssues, initializeNeutralWorkspace, listLegacyIssueViews, readNeutralStore, removeProductSource, updateIssueByExternalIdentity, updateWorkspaceEntity } from "./lib/neutral-store.mjs";
import { appendGoogleSheetValues, createGoogleAuthorizationUrl, createGoogleOAuthState, createGoogleSheetIssueTemplate, exchangeGoogleAuthorizationCode, googleSheetsConnectionStatus, readGoogleSheetValues, saveGoogleOAuthTokens, testGoogleSheetConnection, writeGoogleSheetValues } from "./lib/google-sheets.mjs";

const port = Number(process.env.PORT || 4173);
const root = process.cwd();
const canonicalStorePath = joinPath(root, "data", "issues.json");
const neutralStorePath = joinPath(root, "data", "maxwell.json");
const googleOAuthStorePath = joinPath(root, "data", "google-oauth.json");
const fileEnv = await loadEnv(join(root, ".env"));
const env = { ...fileEnv, ...process.env };
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
  "product-sources": "productSource"
};

await initializeNeutralWorkspace(neutralStorePath, workspaceConfig);
const initialNeutralStore = await readNeutralStore(neutralStorePath);
if (!initialNeutralStore.issues.length) {
  const legacyStore = await readCanonicalStore(canonicalStorePath);
  if (legacyStore.issues.length) {
    await importGitLabIssues(neutralStorePath, legacyStore.issues, legacyStore.meta?.gitlab || {}, workspaceConfig);
  }
}

createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

  try {
    if (requestUrl.pathname === "/api/google/oauth/status" && request.method === "GET") {
      const status = await googleSheetsConnectionStatus(googleConfig, googleOAuthStorePath);
      const store = await readNeutralStore(neutralStorePath);
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
      const store = await readNeutralStore(neutralStorePath);
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
      const result = await createWorkspaceEntity(neutralStorePath, type, await readJson(request));
      return sendJson(response, 201, { entity: result.entity, workspace: result.store });
    }

    const updateWorkspaceMatch = requestUrl.pathname.match(/^\/api\/workspace\/([^/]+)\/([^/]+)$/);
    if (updateWorkspaceMatch && request.method === "PATCH") {
      const type = workspaceResourceTypes[updateWorkspaceMatch[1]];
      if (!type) return sendJson(response, 404, { error: "Workspace resource not found." });
      const id = decodeURIComponent(updateWorkspaceMatch[2]);
      const result = await updateWorkspaceEntity(neutralStorePath, type, id, await readJson(request));
      return sendJson(response, 200, { entity: result.entity, workspace: result.store });
    }

    if (updateWorkspaceMatch && request.method === "DELETE") {
      const type = workspaceResourceTypes[updateWorkspaceMatch[1]];
      if (type !== "productSource") return sendJson(response, 405, { error: "Only unused Product Sources can be removed." });
      const id = decodeURIComponent(updateWorkspaceMatch[2]);
      const result = await removeProductSource(neutralStorePath, id);
      return sendJson(response, 200, { entity: result.entity, workspace: result.store });
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
      const imported = await importGitLabIssues(neutralStorePath, result.issues, result.meta, workspaceConfig);
      return sendJson(response, 200, {
        ...result,
        issues: listLegacyIssueViews(imported.store, { issueIds: imported.importedIssueIds }),
        persistence: { created: imported.created, updated: imported.updated, storeVersion: imported.store.version }
      });
    }

    if (requestUrl.pathname === "/api/gitlab/status" && request.method === "PATCH") {
      const input = await readJson(request);
      const result = await updateGitLabIssueStatus(gitlabConfig, input);
      await updateIssueByExternalIdentity(neutralStorePath, {
        provider: "gitlab",
        baseUrl: gitlabConfig.baseUrl,
        externalContainerId: input.projectId,
        externalIssueId: input.issueIid
      }, { status: result.status });
      return sendJson(response, 200, result);
    }

    if (requestUrl.pathname === "/api/gitlab/issues" && request.method === "POST") {
      const input = await readJson(request);
      const store = await readNeutralStore(neutralStorePath);
      const knownProjectIds = [...new Set(store.productSources
        .filter(source => source.provider === "gitlab")
        .map(source => source.externalContainerId)
        .filter(Boolean))];
      const projectId = input.projectId || gitlabConfig.defaultProjectId || (knownProjectIds.length === 1 ? knownProjectIds[0] : null);
      const issue = await createGitLabIssue(gitlabConfig, { ...input, projectId });
      const imported = await importGitLabIssues(neutralStorePath, [issue], {
        ...(store.syncMeta?.gitlab || {}),
        syncedAt: new Date().toISOString()
      }, workspaceConfig);
      const [persistedIssue] = listLegacyIssueViews(imported.store, { issueIds: imported.importedIssueIds });
      return sendJson(response, 201, { issue: persistedIssue });
    }

    if (requestUrl.pathname === "/api/local/issues" && request.method === "GET") {
      const store = await readNeutralStore(neutralStorePath);
      return sendJson(response, 200, {
        version: store.version,
        issues: listLegacyIssueViews(store),
        meta: store.syncMeta,
        updatedAt: store.updatedAt
      });
    }

    if (requestUrl.pathname === "/api/local/workspace" && request.method === "GET") {
      return sendJson(response, 200, await readNeutralStore(neutralStorePath));
    }

    if (requestUrl.pathname === "/api/sync/outbound" && request.method === "POST") {
      const store = await readNeutralStore(neutralStorePath);
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
}).listen(port, "127.0.0.1", () => {
  const states = [githubConfig.token ? "GitHub configured" : "GitHub token missing", gitlabConfig.token ? "GitLab configured" : "GitLab token missing"];
  console.log(`Maxwell is ready at http://127.0.0.1:${port} (${states.join(", ")})`);
});

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

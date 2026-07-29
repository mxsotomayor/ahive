export class GitLabApiError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = "GitLabApiError";
    this.status = status;
    this.details = details;
  }
}

export function gitlabApiBase(baseUrl = "https://gitlab.com") {
  let parsed;
  try { parsed = new URL(baseUrl); }
  catch { throw new GitLabApiError("GITLAB_BASE_URL must be a valid URL.", 503); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new GitLabApiError("GITLAB_BASE_URL must use HTTP or HTTPS.", 503);
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "").replace(/\/api\/v4$/, "")}/api/v4`;
}

export async function gitlabRequest(config, pathOrUrl, options = {}, fetchImpl = fetch) {
  if (!config.token) throw new GitLabApiError("GITLAB_TOKEN is not configured.", 503);
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${gitlabApiBase(config.baseUrl)}${pathOrUrl}`;

  let response;
  try {
    response = await fetchImpl(url, {
      ...options,
      headers: {
        Accept: "application/json",
        "PRIVATE-TOKEN": config.token,
        "User-Agent": "maxwell-issues-tracker",
        ...options.headers
      }
    });
  } catch (error) {
    throw new GitLabApiError(`Could not reach GitLab: ${error.message}`);
  }

  let payload = null;
  const contentType = response.headers?.get?.("content-type") || "";
  try { payload = contentType.includes("json") ? await response.json() : await response.text(); }
  catch { payload = null; }

  if (!response.ok) {
    const rawMessage = payload?.message || payload?.error_description || payload?.error || (typeof payload === "string" ? payload : null);
    const message = Array.isArray(rawMessage) ? rawMessage.join("; ") : rawMessage || `GitLab request failed (${response.status}).`;
    const status = [400, 401, 403, 404, 422, 429, 503].includes(response.status) ? response.status : 502;
    throw new GitLabApiError(String(message), status, payload);
  }

  return { payload, headers: response.headers };
}

export async function fetchAssignedGitLabIssues(config, fetchImpl = fetch) {
  const apiBase = gitlabApiBase(config.baseUrl);
  const userRequest = gitlabRequest(config, "/user", {}, fetchImpl);
  let nextUrl = `${apiBase}/issues?scope=assigned_to_me&state=all&order_by=updated_at&sort=desc&per_page=100&page=1`;
  const issues = [];
  let pages = 0;

  while (nextUrl) {
    if (++pages > 100) throw new GitLabApiError("GitLab pagination exceeded the 100-page safety limit.", 502);
    const { payload, headers } = await gitlabRequest(config, nextUrl, {}, fetchImpl);
    if (!Array.isArray(payload)) throw new GitLabApiError("GitLab returned an unexpected issues response.");
    issues.push(...payload);
    nextUrl = nextPageUrl(headers, nextUrl);
  }

  const { payload: user } = await userRequest;
  return {
    issues: issues.map(normalizeGitLabIssue),
    meta: {
      baseUrl: new URL(apiBase).origin,
      viewer: user?.username || "unknown",
      viewerName: user?.name || user?.username || "GitLab user",
      syncedAt: new Date().toISOString(),
      assignedItems: issues.length,
      projectIds: [...new Set(issues.map(issue => issue.project_id))],
      projectPaths: [...new Set(issues.map(issue => issue.references?.full?.replace(/[#!]\d+$/, "")).filter(Boolean))],
      pages
    }
  };
}

export function nextPageUrl(headers, currentUrl) {
  const link = headers?.get?.("link");
  if (link) {
    const next = link.split(",").map(value => value.trim()).find(value => /rel="?next"?/i.test(value));
    const match = next?.match(/<([^>]+)>/);
    if (match) return match[1];
  }

  const nextPage = headers?.get?.("x-next-page");
  if (!nextPage) return null;
  const url = new URL(currentUrl);
  url.searchParams.set("page", nextPage);
  return url.toString();
}

export function normalizeGitLabIssue(issue) {
  const labels = (issue.labels || []).map(label => typeof label === "string" ? label : label.name).filter(Boolean);
  const projectPath = issue.references?.full?.replace(/[#!]\d+$/, "") || projectPathFromUrl(issue.web_url) || `Project ${issue.project_id}`;
  return {
    id: `${projectPath}#${issue.iid}`,
    sourceKey: String(issue.id),
    title: issue.title || "Untitled GitLab issue",
    description: issue.description || "No description provided.",
    source: "gitlab",
    project: projectPath,
    status: normalizeGitLabStatus(issue.state, labels),
    priority: normalizeGitLabPriority(issue.severity, labels),
    due: issue.due_date || issue.milestone?.due_date || null,
    labels,
    updated: issue.updated_at,
    sourceUrl: issue.web_url,
    integration: {
      provider: "gitlab",
      projectId: issue.project_id,
      issueIid: issue.iid
    }
  };
}

export function normalizeGitLabStatus(state, labels = []) {
  if (state === "closed") return "done";
  const joined = labels.join(" ").toLowerCase();
  if (/(review|testing|qa|approval)/.test(joined)) return "review";
  if (/(in[ _-]?progress|doing|working|development|workflow::active)/.test(joined)) return "in_progress";
  return "todo";
}

export function normalizeGitLabPriority(severity, labels = []) {
  const joined = `${severity || ""} ${labels.join(" ")}`.toLowerCase();
  if (/(critical|urgent|priority::1|priority::p0|\bp0\b)/.test(joined)) return "urgent";
  if (/(high|priority::2|priority::p1|\bp1\b)/.test(joined)) return "high";
  if (/(low|priority::4|priority::p3|\bp3\b|\bp4\b)/.test(joined)) return "low";
  return "medium";
}

export async function updateGitLabIssueStatus(config, input, fetchImpl = fetch) {
  const projectId = Number(input.projectId);
  const issueIid = Number(input.issueIid);
  if (!Number.isInteger(projectId) || !Number.isInteger(issueIid)) {
    throw new GitLabApiError("This GitLab issue does not include valid project and issue IDs.", 400);
  }

  const stateEvent = input.completed ? "close" : "reopen";
  const { payload } = await gitlabRequest(config, `/projects/${projectId}/issues/${issueIid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state_event: stateEvent })
  }, fetchImpl);

  return { status: payload?.state === "closed" ? "done" : "todo", gitlabState: payload?.state };
}

export async function createGitLabIssue(config, input, fetchImpl = fetch) {
  const projectId = Number(input.projectId || config.defaultProjectId);
  if (!Number.isInteger(projectId)) {
    throw new GitLabApiError("No default GitLab project is available. Sync GitLab first or set GITLAB_DEFAULT_PROJECT_ID.", 400);
  }
  if (!String(input.title || "").trim()) throw new GitLabApiError("Issue title is required.", 400);

  const { payload: user } = await gitlabRequest(config, "/user", {}, fetchImpl);
  const labels = labelsForIssue(input.priority, input.status);
  const body = {
    title: String(input.title).trim(),
    description: String(input.description || "").trim(),
    assignee_id: user.id,
    due_date: input.due || undefined,
    labels: labels.length ? labels.join(",") : undefined
  };
  const { payload } = await gitlabRequest(config, `/projects/${projectId}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }, fetchImpl);

  return normalizeGitLabIssue(payload);
}

export function labelsForIssue(priority, status) {
  const labels = [];
  if (["urgent", "high", "medium", "low"].includes(priority)) labels.push(`priority::${priority}`);
  if (status === "in_progress") labels.push("workflow::in progress");
  if (status === "review") labels.push("workflow::review");
  return labels;
}

function projectPathFromUrl(webUrl) {
  if (!webUrl) return null;
  try {
    const marker = "/-/issues/";
    const path = new URL(webUrl).pathname;
    return path.includes(marker) ? path.slice(1, path.indexOf(marker)) : null;
  } catch { return null; }
}

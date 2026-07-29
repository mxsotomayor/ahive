const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

const PROJECT_QUERY = `
  query MaxwellProject($owner: String!, $number: Int!, $cursor: String) {
    viewer { login }
    organization(login: $owner) {
      projectV2(number: $number) {
        id
        title
        url
        fields(first: 50) {
          nodes {
            ... on ProjectV2Field { id name dataType }
            ... on ProjectV2SingleSelectField { id name options { id name } }
          }
        }
        items(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            updatedAt
            fieldValues(first: 30) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  optionId
                  field { ... on ProjectV2FieldCommon { id name } }
                }
                ... on ProjectV2ItemFieldDateValue {
                  date
                  field { ... on ProjectV2FieldCommon { id name } }
                }
                ... on ProjectV2ItemFieldTextValue {
                  text
                  field { ... on ProjectV2FieldCommon { id name } }
                }
              }
            }
            content {
              ... on Issue {
                id number title body url state updatedAt
                repository { name nameWithOwner }
                assignees(first: 20) { nodes { login } }
                labels(first: 20) { nodes { name } }
                milestone { dueOn }
              }
              ... on PullRequest {
                id number title body url state updatedAt
                repository { name nameWithOwner }
                assignees(first: 20) { nodes { login } }
                labels(first: 20) { nodes { name } }
                milestone { dueOn }
              }
              ... on DraftIssue { id title body updatedAt }
            }
          }
        }
      }
    }
  }
`;

const UPDATE_STATUS_MUTATION = `
  mutation MaxwellUpdateStatus(
    $projectId: ID!
    $itemId: ID!
    $fieldId: ID!
    $optionId: String!
  ) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: { singleSelectOptionId: $optionId }
    }) {
      projectV2Item { id updatedAt }
    }
  }
`;

export class GitHubApiError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.details = details;
  }
}

export async function githubGraphql(token, query, variables, fetchImpl = fetch) {
  if (!token) throw new GitHubApiError("GITHUB_TOKEN is not configured.", 503);

  let response;
  try {
    response = await fetchImpl(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "maxwell-issues-tracker"
      },
      body: JSON.stringify({ query, variables })
    });
  } catch (error) {
    throw new GitHubApiError(`Could not reach GitHub: ${error.message}`);
  }

  let payload;
  try { payload = await response.json(); }
  catch { throw new GitHubApiError("GitHub returned an unreadable response.", response.status); }

  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map(error => error.message).join("; ") || payload.message || `GitHub request failed (${response.status}).`;
    const status = response.status === 401 ? 401 : response.status === 403 ? 403 : response.status === 404 ? 404 : 502;
    throw new GitHubApiError(message, status, payload.errors || null);
  }

  return payload.data;
}

export async function fetchAssignedProjectIssues(config, fetchImpl = fetch) {
  const owner = config.owner;
  const number = Number(config.projectNumber);
  if (!owner || !Number.isInteger(number)) {
    throw new GitHubApiError("GITHUB_OWNER and GITHUB_PROJECT_NUMBER must be configured.", 503);
  }

  let cursor = null;
  let project = null;
  let viewer = null;
  const items = [];

  do {
    const data = await githubGraphql(config.token, PROJECT_QUERY, { owner, number, cursor }, fetchImpl);
    if (!data.organization) throw new GitHubApiError(`GitHub organization '${owner}' was not found or is not accessible.`, 404);
    if (!data.organization.projectV2) throw new GitHubApiError(`GitHub project ${owner}/${number} was not found or is not accessible.`, 404);

    viewer ||= data.viewer?.login;
    project ||= data.organization.projectV2;
    const connection = data.organization.projectV2.items;
    items.push(...connection.nodes);
    cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (cursor);

  const normalized = normalizeProjectItems({ ...project, items: { nodes: items } }, viewer);
  return {
    issues: normalized,
    meta: {
      owner,
      projectNumber: number,
      projectTitle: project.title,
      projectUrl: project.url,
      viewer,
      syncedAt: new Date().toISOString(),
      totalProjectItems: items.length,
      assignedItems: normalized.length
    }
  };
}

export function normalizeProjectItems(project, viewerLogin) {
  const fields = project.fields?.nodes || [];
  const statusField = fields.find(field => field?.name?.toLowerCase() === "status" && Array.isArray(field.options));

  return (project.items?.nodes || [])
    .filter(item => {
      const assignees = item.content?.assignees?.nodes || [];
      return viewerLogin && assignees.some(assignee => assignee.login.toLowerCase() === viewerLogin.toLowerCase());
    })
    .map(item => normalizeProjectItem(item, project, statusField));
}

export function normalizeProjectItem(item, project, statusField) {
  const content = item.content || {};
  const values = item.fieldValues?.nodes || [];
  const fieldValue = name => values.find(value => value?.field?.name?.toLowerCase() === name.toLowerCase());
  const statusName = fieldValue("Status")?.name || (content.state === "CLOSED" || content.state === "MERGED" ? "Done" : "Todo");
  const priorityName = fieldValue("Priority")?.name || "Medium";
  const due = ["Due date", "Due", "Target date", "End date"].map(name => fieldValue(name)?.date).find(Boolean) || content.milestone?.dueOn?.slice(0, 10) || null;
  const repositoryName = content.repository?.name || project.title || "GitHub Project";
  const repositoryFullName = content.repository?.nameWithOwner || null;
  const issueNumber = content.number || item.id.slice(-6);

  return {
    id: content.number ? `${repositoryName}#${issueNumber}` : `Draft-${issueNumber}`,
    sourceKey: content.id || item.id,
    title: content.title || "Untitled GitHub item",
    description: content.body || "No description provided.",
    source: "github",
    project: repositoryFullName || project.title,
    status: normalizeStatus(statusName),
    priority: normalizePriority(priorityName),
    due,
    labels: content.labels?.nodes?.map(label => label.name) || [],
    updated: content.updatedAt || item.updatedAt,
    sourceUrl: content.url || project.url,
    integration: {
      provider: "github",
      projectId: project.id,
      projectItemId: item.id,
      contentId: content.id || null,
      statusFieldId: statusField?.id || null,
      statusOptions: statusField?.options || []
    }
  };
}

export function normalizeStatus(value = "") {
  const status = value.trim().toLowerCase();
  if (["done", "complete", "completed", "closed", "merged"].some(term => status.includes(term))) return "done";
  if (["review", "testing", "qa", "approval"].some(term => status.includes(term))) return "review";
  if (["progress", "doing", "working", "active", "development"].some(term => status.includes(term))) return "in_progress";
  return "todo";
}

export function normalizePriority(value = "") {
  const priority = value.trim().toLowerCase();
  if (["urgent", "critical", "p0"].some(term => priority.includes(term))) return "urgent";
  if (["high", "p1"].some(term => priority.includes(term))) return "high";
  if (["low", "p3", "p4"].some(term => priority.includes(term))) return "low";
  return "medium";
}

export async function updateProjectItemStatus(config, input, fetchImpl = fetch) {
  const { projectId, projectItemId, statusFieldId, statusOptions, completed } = input;
  if (!projectId || !projectItemId || !statusFieldId || !Array.isArray(statusOptions)) {
    throw new GitHubApiError("This GitHub item does not include writable Status field metadata.", 400);
  }

  const wantedNames = completed
    ? ["done", "complete", "completed", "closed"]
    : ["todo", "to do", "backlog", "ready"];
  const option = statusOptions.find(candidate => wantedNames.includes(candidate.name.trim().toLowerCase()))
    || statusOptions.find(candidate => completed ? normalizeStatus(candidate.name) === "done" : normalizeStatus(candidate.name) === "todo");

  if (!option) {
    throw new GitHubApiError(`No ${completed ? "Done" : "To do"} option was found in the GitHub project Status field.`, 422);
  }

  await githubGraphql(config.token, UPDATE_STATUS_MUTATION, {
    projectId,
    itemId: projectItemId,
    fieldId: statusFieldId,
    optionId: option.id
  }, fetchImpl);

  return { status: completed ? "done" : "todo", githubStatus: option.name };
}

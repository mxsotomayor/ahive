import test from "node:test";
import assert from "node:assert/strict";
import { createGitLabIssue, gitlabApiBase, nextPageUrl, normalizeGitLabIssue, updateGitLabIssueStatus } from "../lib/gitlab.mjs";

test("normalizes a GitLab issue into the Maxwell model", () => {
  const issue = normalizeGitLabIssue({
    id: 9001,
    iid: 31,
    project_id: 77,
    title: "Review payment retry logic",
    description: "Confirm the new backoff behavior.",
    state: "opened",
    labels: ["workflow::review", "priority::p1", "backend"],
    due_date: "2026-07-22",
    updated_at: "2026-07-17T12:00:00Z",
    web_url: "https://gitlab.com/Rezzilla/billing/-/issues/31",
    references: { full: "Rezzilla/billing#31" }
  });

  assert.equal(issue.id, "Rezzilla/billing#31");
  assert.equal(issue.project, "Rezzilla/billing");
  assert.equal(issue.status, "review");
  assert.equal(issue.priority, "high");
  assert.equal(issue.integration.projectId, 77);
  assert.equal(issue.integration.issueIid, 31);
});

test("supports GitLab.com and self-managed API base URLs", () => {
  assert.equal(gitlabApiBase("https://gitlab.com"), "https://gitlab.com/api/v4");
  assert.equal(gitlabApiBase("https://gitlab.example.com/api/v4/"), "https://gitlab.example.com/api/v4");
});

test("follows GitLab pagination headers", () => {
  const headers = { get: name => name.toLowerCase() === "x-next-page" ? "2" : null };
  assert.equal(nextPageUrl(headers, "https://gitlab.com/api/v4/issues?page=1&per_page=100"), "https://gitlab.com/api/v4/issues?page=2&per_page=100");
});

test("closes a GitLab issue when Maxwell marks it done", async () => {
  let requestUrl;
  let requestBody;
  const fetchMock = async (url, request) => {
    requestUrl = url;
    requestBody = JSON.parse(request.body);
    return {
      ok: true,
      status: 200,
      headers: { get: name => name.toLowerCase() === "content-type" ? "application/json" : null },
      json: async () => ({ state: "closed" })
    };
  };

  const result = await updateGitLabIssueStatus({ token: "test-token", baseUrl: "https://gitlab.com" }, {
    projectId: 77,
    issueIid: 31,
    completed: true
  }, fetchMock);

  assert.equal(requestUrl, "https://gitlab.com/api/v4/projects/77/issues/31");
  assert.deepEqual(requestBody, { state_event: "close" });
  assert.equal(result.status, "done");
});

test("creates and assigns a canonical issue in the default GitLab project", async () => {
  const requests = [];
  const fetchMock = async (url, request = {}) => {
    requests.push({ url, request });
    const isUser = url.endsWith("/user");
    const payload = isUser ? { id: 12, username: "maxwell" } : {
      id: 501, iid: 9, project_id: 77, title: "New canonical issue", description: "Created from Maxwell",
      state: "opened", labels: ["priority::high", "workflow::in progress"], due_date: "2026-07-25",
      updated_at: "2026-07-17T12:00:00Z", web_url: "https://gitlab.example/Rezzilla/tracker/-/issues/9",
      references: { full: "Rezzilla/tracker#9" }
    };
    return { ok: true, status: isUser ? 200 : 201, headers: { get: name => name.toLowerCase() === "content-type" ? "application/json" : null }, json: async () => payload };
  };

  const issue = await createGitLabIssue({ token: "test-token", baseUrl: "https://gitlab.example", defaultProjectId: 77 }, {
    title: "New canonical issue", description: "Created from Maxwell", due: "2026-07-25", priority: "high", status: "in_progress"
  }, fetchMock);

  const createBody = JSON.parse(requests[1].request.body);
  assert.equal(requests[1].url, "https://gitlab.example/api/v4/projects/77/issues");
  assert.equal(createBody.assignee_id, 12);
  assert.equal(createBody.labels, "priority::high,workflow::in progress");
  assert.equal(issue.source, "gitlab");
});

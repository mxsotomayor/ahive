import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProjectItems, normalizePriority, normalizeStatus, updateProjectItemStatus } from "../lib/github.mjs";

const project = {
  id: "PVT_project",
  title: "Delivery",
  url: "https://github.com/orgs/Rezzilla-Labs/projects/28",
  fields: {
    nodes: [{
      id: "PVTSSF_status",
      name: "Status",
      options: [
        { id: "todo-option", name: "Todo" },
        { id: "progress-option", name: "In Progress" },
        { id: "done-option", name: "Done" }
      ]
    }]
  },
  items: {
    nodes: [
      {
        id: "PVTI_assigned",
        updatedAt: "2026-07-17T10:00:00Z",
        fieldValues: { nodes: [
          { name: "In Progress", optionId: "progress-option", field: { id: "PVTSSF_status", name: "Status" } },
          { name: "High", optionId: "high-option", field: { id: "priority", name: "Priority" } },
          { date: "2026-07-21", field: { id: "due", name: "Due date" } }
        ] },
        content: {
          id: "I_issue", number: 42, title: "Ship unified tracker", body: "Connect the project.",
          url: "https://github.com/Rezzilla-Labs/tracker/issues/42", state: "OPEN", updatedAt: "2026-07-17T10:00:00Z",
          repository: { name: "tracker", nameWithOwner: "Rezzilla-Labs/tracker" },
          assignees: { nodes: [{ login: "max" }] }, labels: { nodes: [{ name: "feature" }] }, milestone: null
        }
      },
      {
        id: "PVTI_other",
        fieldValues: { nodes: [] },
        content: { assignees: { nodes: [{ login: "someone-else" }] } }
      }
    ]
  }
};

test("normalizes only project items assigned to the authenticated viewer", () => {
  const issues = normalizeProjectItems(project, "Max");
  assert.equal(issues.length, 1);
  assert.equal(issues[0].id, "tracker#42");
  assert.equal(issues[0].status, "in_progress");
  assert.equal(issues[0].priority, "high");
  assert.equal(issues[0].due, "2026-07-21");
  assert.equal(issues[0].integration.statusFieldId, "PVTSSF_status");
});

test("maps common project status and priority names", () => {
  assert.equal(normalizeStatus("In review"), "review");
  assert.equal(normalizeStatus("Completed"), "done");
  assert.equal(normalizePriority("P0 Critical"), "urgent");
  assert.equal(normalizePriority("P3 Low"), "low");
});

test("uses the project's Done option when completing an item", async () => {
  let requestBody;
  const fetchMock = async (_url, request) => {
    requestBody = JSON.parse(request.body);
    return { ok: true, status: 200, json: async () => ({ data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: "PVTI_assigned" } } } }) };
  };

  const result = await updateProjectItemStatus({ token: "test-token" }, {
    projectId: "PVT_project",
    projectItemId: "PVTI_assigned",
    statusFieldId: "PVTSSF_status",
    statusOptions: project.fields.nodes[0].options,
    completed: true
  }, fetchMock);

  assert.equal(result.status, "done");
  assert.equal(requestBody.variables.optionId, "done-option");
});

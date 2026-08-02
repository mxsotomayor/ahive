import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../lib/database.mjs";
import {
  appendConversationMessage,
  createAgentTask,
  emptyNeutralStore,
  executeAgentTaskTurn,
  getAgentTaskView,
  getIssueAgentWorkView,
  listAgentTaskViews,
  listLegacyIssueViews,
  listAgentRuns,
  listConversationMessages,
  NeutralStoreError,
  readNeutralStore,
  removeAgentAssignment,
  writeNeutralStore
} from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";

const now = "2026-07-29T12:00:00.000Z";

test("persists ad-hoc and Issue-backed Agent Tasks with cursor-pageable visible Messages", async () => {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, "agent-task-test");
  try {
    await writeNeutralStore(store, fixtureStore());
    const adHoc = await createAgentTask(store, { agentAssignmentId: "assignment-1", objective: "Inspect the codebase" });
    assert.equal(adHoc.task.projectId, "project-1");
    assert.equal(adHoc.task.productId, "product-1");
    assert.equal(adHoc.conversation.agentTaskId, adHoc.task.id);

    const issueBacked = await createAgentTask(store, {
      agentAssignmentId: "assignment-1",
      issueId: "issue-1",
      objective: "Resolve the canonical issue",
      conversationTitle: "Issue work"
    });
    assert.equal(issueBacked.task.issueId, "issue-1");

    await assert.rejects(
      () => createAgentTask(store, { agentAssignmentId: "assignment-1", issueId: "issue-2", objective: "Wrong scope" }),
      error => error instanceof NeutralStoreError && error.status === 409 && /Assignment Product/.test(error.message)
    );

    for (const [role, content] of [["user", "Start"], ["system_notice", "Queued"], ["assistant", "Ready"]]) {
      await appendConversationMessage(store, adHoc.task.id, { role, content, metadata: { visible: true } });
    }
    const firstPage = listConversationMessages(await readNeutralStore(store), adHoc.task.id, { limit: 2 });
    assert.deepEqual(firstPage.messages.map(message => message.sequence), [1, 2]);
    assert.deepEqual(firstPage.pageInfo, { hasMore: true, nextCursor: "2" });
    const secondPage = listConversationMessages(await readNeutralStore(store), adHoc.task.id, { cursor: firstPage.pageInfo.nextCursor, limit: 2 });
    assert.deepEqual(secondPage.messages.map(message => message.sequence), [3]);
    assert.deepEqual(secondPage.pageInfo, { hasMore: false, nextCursor: null });

    await assert.rejects(
      () => appendConversationMessage(store, adHoc.task.id, { role: "assistant", content: "No", metadata: { hiddenReasoning: "secret" } }),
      /cannot contain hidden reasoning/
    );
    assert.equal(listAgentTaskViews(await readNeutralStore(store)).length, 2);
    await assert.rejects(() => removeAgentAssignment(store, "assignment-1"), /used by Agent Tasks/);
  } finally {
    database.close();
  }
});

test("executes two chat-only turns with snapshots and never persists false assistant success", async () => {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, "agent-run-test");
  const runtimeStatus = { status: "ready", installed: true, authenticated: true, version: "test" };
  try {
    await writeNeutralStore(store, fixtureStore());
    const { task } = await createAgentTask(store, { agentAssignmentId: "assignment-1", objective: "Help with planning" });
    const calls = [];
    const executor = async options => {
      calls.push(options);
      return {
        status: "completed",
        threadId: "thread-1",
        finalMessage: calls.length === 1 ? "First reply" : "Second reply",
        usage: { input_tokens: 10, output_tokens: 2, secret: 99 },
        toolEventTypes: [],
        toolActivity: calls.length === 1 ? [{ sequence: 1, tool: "list_files", phase: "completed", result: { count: 3 } }] : [],
        errorCode: null
      };
    };
    const first = await executeAgentTaskTurn(store, task.id, { message: "First question" }, { runtimeStatus, executor });
    assert.equal(first.run.status, "completed");
    assert.equal(first.assistantMessage.content, "First reply");
    assert.equal(first.run.agentProfileSnapshot.name, "Developer");
    assert.equal(first.run.assignmentSnapshot.project.id, "project-1");
    assert.deepEqual(first.run.usage, { input_tokens: 10, output_tokens: 2 });
    assert.deepEqual(first.run.toolActivity, [{ sequence: 1, tool: "list_files", phase: "completed", result: { count: 3 } }]);

    const second = await executeAgentTaskTurn(store, task.id, { message: "Second question" }, { runtimeStatus, executor });
    assert.equal(second.assistantMessage.content, "Second reply");
    assert.equal(calls[1].resumeSessionId, "thread-1");
    assert.equal(listAgentRuns(await readNeutralStore(store), task.id).length, 2);

    const failed = await executeAgentTaskTurn(store, task.id, { message: "Do not run tools" }, {
      runtimeStatus,
      executor: async () => ({ status: "completed", threadId: "thread-1", finalMessage: "Unsafe", usage: null, toolEventTypes: ["command_execution"] })
    });
    assert.equal(failed.run.status, "failed");
    assert.equal(failed.run.errorSummary, "unexpected_tool_activity");
    assert.equal(failed.assistantMessage, null);
    const messages = listConversationMessages(await readNeutralStore(store), task.id, { limit: 100 }).messages;
    assert.equal(messages.some(message => message.content === "Unsafe"), false);

    await assert.rejects(
      () => executeAgentTaskTurn(store, task.id, { message: "x".repeat(8_001) }, { runtimeStatus, executor }),
      error => error instanceof NeutralStoreError && error.status === 413
    );
  } finally {
    database.close();
  }
});

test("propagates cancellation to a running provider turn without creating an assistant Message", async () => {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, "agent-run-cancel-test");
  const runtimeStatus = { status: "ready", installed: true, authenticated: true, version: "test" };
  try {
    await writeNeutralStore(store, fixtureStore());
    const { task } = await createAgentTask(store, { agentAssignmentId: "assignment-1", objective: "Wait" });
    const controller = new AbortController();
    let startedRun;
    const execution = executeAgentTaskTurn(store, task.id, { message: "Wait for cancellation" }, {
      runtimeStatus,
      signal: controller.signal,
      onRunStarted: run => { startedRun = run; },
      executor: options => new Promise(resolve => options.signal.addEventListener("abort", () => resolve({
        status: "cancelled", finalMessage: null, usage: null, threadId: "thread-cancelled", toolEventTypes: [], errorCode: "cancelled"
      }), { once: true }))
    });
    while (!startedRun) await new Promise(resolve => setImmediate(resolve));
    controller.abort();
    const result = await execution;
    assert.equal(result.run.status, "cancelled");
    assert.equal(result.assistantMessage, null);
    assert.equal(listConversationMessages(await readNeutralStore(store), task.id).messages.filter(message => message.role === "assistant").length, 0);
  } finally {
    database.close();
  }
});

test("projects one documented read-only Issue context without changing Issue identities", async () => {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, "issue-agent-work-test");
  const runtimeStatus = { status: "ready", installed: true, authenticated: true, version: "test" };
  try {
    await writeNeutralStore(store, fixtureStore());
    const before = await readNeutralStore(store);
    const issueBefore = structuredClone(before.issues.find(item => item.id === "issue-1"));
    const linksBefore = structuredClone(before.externalIssueLinks);

    const work = getIssueAgentWorkView(before, "issue-1", runtimeStatus);
    assert.equal(work.issue.project.id, "project-1");
    assert.equal(work.issue.product.id, "product-1");
    assert.deepEqual(work.compatibleAssignments.map(item => item.id), ["assignment-1"]);
    assert.deepEqual(work.issue.origin, {
      productSourceId: "source-1",
      provider: "gitlab",
      displayName: "One",
      externalIssueId: "1",
      externalUrl: "https://gitlab.example.com/group/one/-/issues/1"
    });

    const created = await createAgentTask(store, {
      agentAssignmentId: "assignment-1",
      issueId: "issue-1",
      objective: "Implement the linked Issue safely"
    });
    const afterCreate = await readNeutralStore(store);
    assert.equal(created.task.issueId, "issue-1");
    assert.equal(afterCreate.issues.length, before.issues.length);
    assert.equal(afterCreate.externalIssueLinks.length, linksBefore.length);
    assert.deepEqual(afterCreate.issues.find(item => item.id === "issue-1"), issueBefore);
    assert.deepEqual(afterCreate.externalIssueLinks, linksBefore);

    let prompt = "";
    const result = await executeAgentTaskTurn(store, created.task.id, { message: "Start" }, {
      runtimeStatus,
      executor: async options => {
        prompt = options.prompt;
        return { status: "completed", threadId: "issue-thread", finalMessage: "Done", usage: null, toolEventTypes: [], errorCode: null };
      }
    });
    assert.equal(result.run.status, "completed");
    assert.match(prompt, /Linked Issue context \(read-only/);
    assert.match(prompt, /Issue ID: issue-1/);
    assert.match(prompt, /Title: One/);
    assert.match(prompt, /Description: Confirm the new backoff behavior\./);
    assert.match(prompt, /Status: todo/);
    assert.match(prompt, /Priority: high/);
    assert.match(prompt, /Due date: 2026-08-04/);
    assert.match(prompt, /Labels: backend, reliability/);
    assert.match(prompt, /Origin Source: gitlab · One · external Issue 1/);
    assert.doesNotMatch(prompt, /must-not-send|GITLAB_TOKEN|providerGlobalId/);

    const afterRun = await readNeutralStore(store);
    assert.deepEqual(afterRun.issues.find(item => item.id === "issue-1"), issueBefore);
    assert.deepEqual(afterRun.externalIssueLinks, linksBefore);
    const view = getAgentTaskView(afterRun, created.task.id);
    assert.equal(view.issueContext.id, "issue-1");
    assert.equal(view.completedRunCount, 1);
    assert.equal(view.latestRun.id, result.run.id);
    const legacyIssue = listLegacyIssueViews(afterRun).find(item => item.maxwellIssueId === "issue-1");
    assert.equal(legacyIssue.agentTasks.length, 1);
    assert.equal(legacyIssue.agentTasks[0].completedRunCount, 1);
  } finally {
    database.close();
  }
});

function fixtureStore() {
  return {
    ...emptyNeutralStore(),
    organizations: [{ id: "organization-1", name: "Rezzilla, Labs", active: true, createdAt: now, updatedAt: now }],
    projects: [{ id: "project-1", organizationId: "organization-1", name: "IRN", key: "irn", active: true, createdAt: now, updatedAt: now }],
    products: [
      { id: "product-1", projectId: "project-1", name: "Portal", key: "portal", active: true, createdAt: now, updatedAt: now },
      { id: "product-2", projectId: "project-1", name: "Other", key: "other", active: true, createdAt: now, updatedAt: now }
    ],
    connectorAccounts: [{ id: "account-1", provider: "gitlab", displayName: "GitLab", baseUrl: "https://gitlab.example.com", credentialReference: "GITLAB_TOKEN", active: true, createdAt: now, updatedAt: now }],
    productSources: [
      { id: "source-1", productId: "product-1", connectorAccountId: "account-1", provider: "gitlab", externalContainerId: "one", displayName: "One", active: true, metadata: { secret: "must-not-send" }, createdAt: now, updatedAt: now },
      { id: "source-2", productId: "product-2", connectorAccountId: "account-1", provider: "gitlab", externalContainerId: "two", displayName: "Two", active: true, createdAt: now, updatedAt: now }
    ],
    issues: [
      { id: "issue-1", productId: "product-1", originProductSourceId: "source-1", title: "One", description: "Confirm the new backoff behavior.", status: "todo", priority: "high", dueDate: "2026-08-04", labels: ["backend", "reliability"], assigneeIdentity: { provider: "gitlab", username: "maxwell", displayName: "Maxwell" }, metadata: { secret: "must-not-send" }, createdAt: now, updatedAt: now },
      { id: "issue-2", productId: "product-2", originProductSourceId: "source-2", title: "Two", status: "todo", createdAt: now, updatedAt: now }
    ],
    externalIssueLinks: [
      { id: "link-1", issueId: "issue-1", productSourceId: "source-1", role: "origin", externalIssueId: "1", externalUrl: "https://gitlab.example.com/group/one/-/issues/1", metadata: { providerGlobalId: "must-not-send" }, createdAt: now, updatedAt: now },
      { id: "link-2", issueId: "issue-2", productSourceId: "source-2", role: "origin", externalIssueId: "2", createdAt: now, updatedAt: now }
    ],
    harnessAccounts: [{ id: "harness-1", provider: "openai", adapter: "codex-cli", displayName: "Local Codex", authMode: "codex_session", credentialReferences: {}, capabilities: ["codex_exec"], active: true, createdAt: now, updatedAt: now }],
    agentProfiles: [{ id: "profile-1", harnessAccountId: "harness-1", name: "Developer", description: null, traitDescription: null, instructions: null, model: "gpt-5.6-sol", modelSettings: {}, defaultToolPolicyId: null, active: true, createdAt: now, updatedAt: now }],
    agentAssignments: [
      { id: "assignment-1", agentProfileId: "profile-1", projectId: "project-1", productId: "product-1", repositoryId: null, contextInstructions: null, active: true, createdAt: now, updatedAt: now },
      { id: "assignment-2", agentProfileId: "profile-1", projectId: "project-1", productId: "product-2", repositoryId: null, contextInstructions: null, active: true, createdAt: now, updatedAt: now }
    ]
  };
}

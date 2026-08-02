import { emptyNeutralStore } from "../lib/neutral-store.mjs";

export const fixtureNow = "2026-07-29T12:00:00.000Z";

export function agentRunFixtureStore() {
  const task = {
    id: "task-1", agentAssignmentId: "assignment-1", projectId: "project-1",
    productId: null, repositoryId: null, issueId: null, objective: "Implement a fix",
    status: "running", createdAt: fixtureNow, updatedAt: fixtureNow, completedAt: null
  };
  const conversation = { id: "conversation-1", agentTaskId: task.id, title: null, status: "active", createdAt: fixtureNow, updatedAt: fixtureNow };
  const run = id => ({
    id, agentTaskId: task.id, conversationId: conversation.id,
    agentProfileSnapshot: { id: "profile-1", name: "Developer" },
    assignmentSnapshot: { id: "assignment-1", project: { id: "project-1", name: "IRN" } },
    harnessProvider: "openai", harnessAdapter: "codex-cli", model: "gpt-5.6-sol",
    status: "running", startedAt: fixtureNow, completedAt: null, usage: null,
    providerMetadata: {}, errorSummary: null, createdAt: fixtureNow, updatedAt: fixtureNow
  });
  return {
    ...emptyNeutralStore(),
    organizations: [{ id: "organization-1", name: "Rezzilla-Labs", active: true, createdAt: fixtureNow, updatedAt: fixtureNow }],
    projects: [{ id: "project-1", organizationId: "organization-1", name: "IRN", key: "irn", active: true, createdAt: fixtureNow, updatedAt: fixtureNow }],
    harnessAccounts: [{ id: "harness-1", provider: "openai", adapter: "codex-cli", displayName: "Local Codex", authMode: "codex_session", credentialReferences: {}, capabilities: ["codex_exec"], active: true, createdAt: fixtureNow, updatedAt: fixtureNow }],
    agentProfiles: [{ id: "profile-1", harnessAccountId: "harness-1", name: "Developer", model: "gpt-5.6-sol", modelSettings: {}, active: true, createdAt: fixtureNow, updatedAt: fixtureNow }],
    agentAssignments: [{ id: "assignment-1", agentProfileId: "profile-1", projectId: "project-1", productId: null, repositoryId: null, contextInstructions: null, active: true, createdAt: fixtureNow, updatedAt: fixtureNow }],
    agentTasks: [task],
    conversations: [conversation],
    agentRuns: [run("run-1"), run("run-2")]
  };
}

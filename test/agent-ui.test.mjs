import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { listSupportedAgentModels } from "../lib/neutral-store.mjs";

test("Agent management UI exposes persisted Tasks without repository mutation controls", async () => {
  const [application, styles] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8")
  ]);

  assert.match(application, /data-nav="agents"/);
  assert.match(application, /\/api\/harness-accounts/);
  assert.match(application, /\/api\/agent-profiles/);
  assert.match(application, /\/api\/agent-assignments/);
  assert.match(application, /\/api\/agent-models/);
  assert.match(application, /\/api\/agent-tasks/);
  assert.match(application, /\/api\/agent-runs/);
  assert.match(application, /new EventSource/);
  assert.match(application, /data-agent-task-create/);
  assert.match(application, /data-agent-run-cancel/);
  assert.match(application, /patchAgentConversationLiveView/);
  assert.match(application, /if \(state\.agentConversation\) renderAgentConversation\(\)/);
  assert.match(application, /No dummy Agents are added automatically/);
  assert.doesNotMatch(application, /data-repository-(?:read|write|edit|shell)/);
  assert.match(styles, /\.sidebar\.mobile-open/);
  assert.match(styles, /\.profile-grid/);
  assert.match(styles, /\.assignment-card/);
  assert.match(styles, /\.conversation-modal/);
  assert.match(styles, /\.conversation-context/);
  assert.match(styles, /stream-pulse/);
});

test("Agent page renders real configuration states and an honest empty state", async () => {
  const application = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { innerHTML: "", appendChild() {} });
    return nodes.get(id);
  };
  const workspace = {
    organizations: [], projects: [{ id: "project-1", name: "IRN", key: "irn", active: true }],
    products: [{ id: "product-1", projectId: "project-1", name: "Portal", key: "portal", active: true }],
    repositories: [{ id: "repository-1", projectId: "project-1", productId: "product-1", name: "Portal repo", active: true, accessMode: "read_only", verificationStatus: "verified" }],
    connectorAccounts: [], productSources: [], issues: [], externalIssueLinks: []
  };
  const modelCatalog = listSupportedAgentModels();
  const context = vm.createContext({
    console, URL, URLSearchParams, structuredClone, setTimeout, clearTimeout,
    localStorage: { getItem() { return null; }, setItem() {} },
    history: { replaceState() {} },
    window: { location: { search: "", pathname: "/" }, scrollTo() {}, confirm() { return true; } },
    document: { getElementById(id) { return ["app", "overlay-root", "toast-root"].includes(id) ? node(id) : null; }, querySelectorAll() { return []; }, querySelector() { return null; }, addEventListener() {}, createElement() { return { className: "", innerHTML: "", classList: { add() {}, remove() {} }, remove() {} }; } },
    fetch: async path => ({
      ok: true,
      json: async () => path === "/api/local/issues" ? { issues: [], meta: {} }
        : path === "/api/local/workspace" ? workspace
          : path === "/api/harness-accounts" ? { harnessAccounts: [] }
            : path === "/api/agent-profiles" ? { agentProfiles: [] }
              : path === "/api/agent-assignments" ? { agentAssignments: [] }
                : path === "/api/agent-models" ? { models: modelCatalog }
                  : path === "/api/agent-tasks" ? { agentTasks: [] }
                : { configured: false, connected: false, missing: [] }
    })
  });
  vm.runInContext(application, context);
  const emptyHtml = vm.runInContext(`state.page="agents";state.workspace=${JSON.stringify(workspace)};state.agents={harnessAccounts:[],agentProfiles:[],agentAssignments:[],agentTasks:[]};state.agentsLoading=false;agentsPage()`, context);
  assert.match(emptyHtml, /No Agent Profiles/);
  assert.match(emptyHtml, /No dummy Agents are added automatically|Configure or activate a Harness/);
  assert.doesNotMatch(emptyHtml, /Start Agent|Run Agent/);

  const configured = {
    models: modelCatalog,
    harnessAccounts: [{ id: "harness-1", provider: "openai", adapter: "codex-cli", displayName: "Local Codex", authMode: "codex_session", capabilities: ["codex_exec"], active: true, configuration: { status: "ready", installed: true, authenticated: true, version: "1.2.3" } }],
    agentProfiles: [{ id: "profile-1", harnessAccountId: "harness-1", name: "Maintainer", description: "Maintains Portal", traitDescription: "Careful", instructions: "Inspect first", model: "gpt-5.6-sol", modelSettings: { reasoningEffort: "high" }, defaultToolPolicyId: null, active: true }],
    agentAssignments: [{ id: "assignment-1", agentProfileId: "profile-1", projectId: "project-1", productId: "product-1", repositoryId: "repository-1", contextInstructions: "Use project conventions", active: true, canStartWork: true, effectiveContext: { agentProfile: { id: "profile-1", name: "Maintainer", model: "gpt-5.6-sol" }, project: { id: "project-1", name: "IRN" }, product: { id: "product-1", name: "Portal" }, repository: { id: "repository-1", name: "Portal repo" }, contextInstructions: "Use project conventions" } }],
    agentTasks: [{ id: "task-1", agentAssignmentId: "assignment-1", projectId: "project-1", productId: "product-1", repositoryId: "repository-1", issueId: null, objective: "Review the authentication approach", status: "completed", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:05:00.000Z", conversation: { id: "conversation-1", title: "Authentication review" }, messageCount: 2 }]
  };
  const configuredHtml = vm.runInContext(`state.agents=${JSON.stringify(configured)};agentsPage()`, context);
  assert.match(configuredHtml, /Local Codex/);
  assert.match(configuredHtml, /Maintainer/);
  assert.match(configuredHtml, /IRN → Portal → Portal repo/);
  assert.match(configuredHtml, /Review the authentication approach/);
  assert.match(configuredHtml, /data-agent-task-open="task-1"/);
  const profileModal = vm.runInContext(`agentEntityModal("agentProfile")`, context);
  assert.match(profileModal, /<select name="model" required data-agent-model>/);
  assert.equal((profileModal.match(/<option value="gpt-/g) || []).length, 8);
  assert.doesNotMatch(profileModal, /<input name="model"/);

  const taskModal = vm.runInContext(`agentTaskModal()`, context);
  assert.match(taskModal, /id="agent-task-form"/);
  assert.match(taskModal, /name="agentAssignmentId"/);
  assert.match(taskModal, /name="issueId"/);

  const conversationHtml = vm.runInContext(`state.agentConversation={taskId:"task-1",loading:false,task:${JSON.stringify(configured.agentTasks[0])},messages:[{id:"message-1",role:"user",content:"Please inspect the design",createdAt:"2026-07-29T10:00:00.000Z"},{id:"message-2",role:"assistant",content:"The design is sound.",createdAt:"2026-07-29T10:05:00.000Z"}],runs:[{id:"run-1",status:"completed"}],streamText:"",runStatus:"completed",error:null};agentConversationModal()`, context);
  assert.match(conversationHtml, /Please inspect the design/);
  assert.match(conversationHtml, /The design is sound/);
  assert.match(conversationHtml, /Project<\/span><strong>IRN/);
  assert.match(conversationHtml, /Read-only inspection tools enabled/);
  assert.match(conversationHtml, /Shell commands, secrets, file changes, tests, and network access stay blocked/);
  assert.match(conversationHtml, /id="agent-conversation-form"/);

  const preservedConversationHtml = vm.runInContext(`state.page="agents";render();document.getElementById("overlay-root").innerHTML`, context);
  assert.match(preservedConversationHtml, /id="conversation-title">Authentication review/);
  assert.match(preservedConversationHtml, /The design is sound/);

  const streamingHtml = vm.runInContext(`state.agentConversation.runStatus="running";state.agentConversation.streamText="Partial answer";agentConversationModal()`, context);
  assert.match(streamingHtml, /data-stream-message/);
  assert.match(streamingHtml, /data-stream-content/);
  assert.match(streamingHtml, /Partial answer/);
  assert.match(streamingHtml, /Receiving response/);
});

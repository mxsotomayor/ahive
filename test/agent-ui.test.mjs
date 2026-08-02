import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { listSupportedAgentModels } from "../lib/neutral-store.mjs";

test("Agent management UI exposes persisted Tasks and explicit review controls", async () => {
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
  assert.match(application, /repositoryExplorerPanel/);
  assert.match(application, /runReviewPanel/);
  assert.match(application, /issue-writeback\/approval/);
  assert.match(application, /issue-writeback\/execute/);
  assert.match(application, /\/api\/health/);
  assert.match(application, /\/api\/operations\/reconcile/);
  assert.match(application, /recovery\/acknowledge/);
  assert.match(application, /data-issue-work-agent/);
  assert.match(application, /\/api\/issues\/\$\{encodeURIComponent\(issueId\)\}\/agent-work/);
  assert.match(application, /\/repository\/tree\?path=/);
  assert.match(application, /\/repository\/file\?path=/);
  assert.match(application, /querySelector\?\.\("\.conversation-modal"\)/);
  assert.match(application, /scrollConversationToBottom\(transcript\)/);
  assert.match(application, /No dummy Agents are added automatically/);
  assert.doesNotMatch(application, /data-repository-(?:read|write|edit|shell)/);
  assert.match(styles, /\.sidebar\.mobile-open/);
  assert.match(styles, /\.profile-grid/);
  assert.match(styles, /\.assignment-card/);
  assert.match(styles, /\.conversation-modal/);
  assert.match(styles, /\.conversation-context/);
  assert.match(styles, /stream-pulse/);
  assert.match(styles, /overflow-anchor:none/);
  assert.match(styles, /scroll-behavior:auto/);
  assert.doesNotMatch(styles, /scroll-behavior:smooth/);
  assert.match(styles, /\.conversation-modal,.conversation-modal\.visible \{ inset:0;width:100vw/);
  assert.match(styles, /\.conversation-layout\.has-repository/);
  assert.match(styles, /\.conversation-repository/);
  assert.match(styles, /\.conversation-review/);
  assert.match(styles, /\.review-test\.failed/);
  assert.match(styles, /\.issue-agent-task/);
  assert.match(styles, /\.issue-task-context/);
  assert.match(styles, /\.writeback-preview/);
  assert.match(styles, /\.writeback-attempt\.failed/);
  assert.match(styles, /\.operational-health/);
  assert.match(styles, /\.review-recovery/);
});

test("Agent page renders real configuration states and an honest empty state", async () => {
  const application = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { innerHTML: "", appendChild() {}, querySelector(selector) { return selector === ".conversation-modal" && this.innerHTML.includes("conversation-modal") ? {} : null; } });
    return nodes.get(id);
  };
  const workspace = {
    organizations: [], projects: [{ id: "project-1", name: "IRN", key: "irn", active: true }],
    products: [{ id: "product-1", projectId: "project-1", name: "Portal", key: "portal", active: true }],
    repositories: [{ id: "repository-1", projectId: "project-1", productId: "product-1", name: "Portal repo", active: true, accessMode: "read_only", verificationStatus: "verified" }],
    connectorAccounts: [], productSources: [], issues: [{ id: "issue-1", productId: "product-1", title: "Fix login redirects", description: "Preserve the return URL.", status: "todo", priority: "high", dueDate: "2026-08-04", labels: ["frontend"] }], externalIssueLinks: []
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
    agentTasks: [{ id: "task-1", agentAssignmentId: "assignment-1", projectId: "project-1", productId: "product-1", repositoryId: "repository-1", issueId: "issue-1", objective: "Review the authentication approach", status: "completed", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:05:00.000Z", conversation: { id: "conversation-1", title: "Authentication review" }, messageCount: 2, runCount: 1, completedRunCount: 1, issueContext: { id: "issue-1", title: "Fix login redirects", description: "Preserve the return URL.", status: "todo", priority: "high", dueDate: "2026-08-04", labels: ["frontend"], project: { id: "project-1", name: "IRN" }, product: { id: "product-1", name: "Portal" }, origin: { provider: "gitlab", displayName: "Portal", externalIssueId: "17" } } }]
  };
  const configuredHtml = vm.runInContext(`state.operationalHealth={status:"degraded",recovery:{unacknowledgedRuns:1,staleWorktreeLocks:1,uncertainWritebacks:0,automaticReplays:0},totals:{runs:3}};state.agents=${JSON.stringify(configured)};agentsPage()`, context);
  assert.match(configuredHtml, /Local Codex/);
  assert.match(configuredHtml, /Maintainer/);
  assert.match(configuredHtml, /IRN → Portal → Portal repo/);
  assert.match(configuredHtml, /Review the authentication approach/);
  assert.match(configuredHtml, /data-agent-task-open="task-1"/);
  assert.match(configuredHtml, /Recovery attention required/);
  assert.match(configuredHtml, /data-operations-reconcile/);
  const profileModal = vm.runInContext(`agentEntityModal("agentProfile")`, context);
  assert.match(profileModal, /<select name="model" required data-agent-model>/);
  assert.equal((profileModal.match(/<option value="gpt-/g) || []).length, 8);
  assert.doesNotMatch(profileModal, /<input name="model"/);

  const taskModal = vm.runInContext(`agentTaskModal()`, context);
  assert.match(taskModal, /id="agent-task-form"/);
  assert.match(taskModal, /name="agentAssignmentId"/);
  assert.match(taskModal, /name="issueId"/);

  const issueWorkModal = vm.runInContext(`agentTaskModal({issue:${JSON.stringify(configured.agentTasks[0].issueContext)},assignments:state.agents.agentAssignments})`, context);
  assert.match(issueWorkModal, /Work with an agent/);
  assert.match(issueWorkModal, /Linked Issue/);
  assert.match(issueWorkModal, /Fix login redirects/);
  assert.match(issueWorkModal, /Portal repo/);
  assert.match(issueWorkModal, /type="hidden" name="issueId" value="issue-1"/);

  const issueDrawerHtml = vm.runInContext(`issueDrawer({id:"Portal#17",maxwellIssueId:"issue-1",productId:"product-1",title:"Fix login redirects",description:"Preserve the return URL.",source:"gitlab",project:"Portal",status:"todo",priority:"high",due:null,labels:["frontend"],updated:"2026-07-29T10:00:00.000Z",sourceUrl:"https://gitlab.example.test/17",agentTasks:[{id:"task-1",objective:"Review authentication",status:"completed",runCount:1,completedRunCount:1,updatedAt:"2026-07-29T10:05:00.000Z"}]})`, context);
  assert.match(issueDrawerHtml, /Work with agent/);
  assert.match(issueDrawerHtml, /data-issue-work-agent="issue-1"/);
  assert.match(issueDrawerHtml, /Agent work/);
  assert.match(issueDrawerHtml, /1 of 1 Runs completed/);
  assert.match(issueDrawerHtml, /data-issue-agent-task-open="task-1"/);

  const conversationHtml = vm.runInContext(`state.agentConversation={taskId:"task-1",loading:false,task:${JSON.stringify(configured.agentTasks[0])},messages:[{id:"message-1",role:"user",content:"Please inspect the design",createdAt:"2026-07-29T10:00:00.000Z"},{id:"message-2",role:"assistant",content:"The design is sound.",createdAt:"2026-07-29T10:05:00.000Z"}],runs:[{id:"run-1",status:"completed"}],streamText:"",runStatus:"completed",error:null};agentConversationModal()`, context);
  assert.match(conversationHtml, /Please inspect the design/);
  assert.match(conversationHtml, /The design is sound/);
  assert.match(conversationHtml, /Project<\/span><strong>IRN/);
  assert.match(conversationHtml, /Read-only inspection tools enabled/);
  assert.match(conversationHtml, /gitlab #17/);
  assert.match(conversationHtml, /review decisions never commit, push, or update an Issue/);
  assert.match(conversationHtml, /id="agent-conversation-form"/);

  const preservedConversationHtml = vm.runInContext(`state.page="agents";render();document.getElementById("overlay-root").innerHTML`, context);
  assert.match(preservedConversationHtml, /id="conversation-title">Authentication review/);
  assert.match(preservedConversationHtml, /The design is sound/);
  const untouchedConversationHtml = vm.runInContext(`render();document.getElementById("overlay-root").innerHTML`, context);
  assert.equal(untouchedConversationHtml, preservedConversationHtml);
  assert.equal(vm.runInContext(`const transcriptProbe={scrollTop:0,scrollHeight:640};scrollConversationToBottom(transcriptProbe);transcriptProbe.scrollTop`, context), 640);

  const streamingHtml = vm.runInContext(`state.agentConversation.runStatus="running";state.agentConversation.streamText="Partial answer";agentConversationModal()`, context);
  assert.match(streamingHtml, /data-stream-message/);
  assert.match(streamingHtml, /data-stream-content/);
  assert.match(streamingHtml, /Partial answer/);
  assert.match(streamingHtml, /Receiving response/);

  const explorerHtml = vm.runInContext(`state.agentConversation.repositoryExplorer={open:false,expandedPaths:new Set([".","src"]),childrenByPath:{".":[{name:"src",path:"src",type:"directory"},{name:"README.md",path:"README.md",type:"file",size:128}],"src":[{name:"app.js",path:"src/app.js",type:"file",size:64}]},loadingPaths:new Set(),errorsByPath:{},selectedPath:"src/app.js",preview:{path:"src/app.js",startLine:1,endLine:1,totalLines:1,text:"export const ready = true;",truncated:false},previewLoading:false,previewError:null};repositoryExplorerPanel(state.agentConversation.repositoryExplorer)`, context);
  assert.match(explorerHtml, /Repository explorer/);
  assert.match(explorerHtml, /README\.md/);
  assert.match(explorerHtml, /src\/app\.js/);
  assert.match(explorerHtml, /export const ready = true;/);
  assert.match(explorerHtml, /Read only/);

  const reviewHtml = vm.runInContext(`state.agentConversation.runs=[{id:"run-1",status:"waiting_approval",startedAt:"2026-07-29T10:00:00.000Z",toolActivity:[{tool:"apply_patch",phase:"requested",timestamp:"2026-07-29T10:02:00.000Z"}]}];runReviewPanel({runId:"run-1",loading:false,error:null,selectedArtifactId:"artifact-test",artifactContent:"exit code 1\\n1 test failed",artifactLoading:false,actionPending:false,data:{agentRun:state.agentConversation.runs[0],approvalRequests:[{id:"approval-1",capability:"repository.modify_files",targetId:"repository-1:src/app.js",reason:"Apply the reviewed fix",riskLevel:"medium",status:"pending"}],managedWorktree:{id:"worktree-1",status:"ready",present:true,dirty:true,path:"C:/worktrees/run-1",baseCommit:"1234567890abcdef",head:"abcdef1234567890"},fileChanges:[{operation:"apply_patch",relativePath:"src/app.js",status:"completed",beforeBytes:128,afterBytes:152}],artifacts:[{id:"artifact-test",kind:"test_report",sizeBytes:256,contentHash:"1234567890abcdef",retentionUntil:"2026-08-28T10:00:00.000Z",metadata:{status:"failed",policyId:"unit-tests"}},{id:"artifact-patch",kind:"patch",sizeBytes:512,contentHash:"abcdef1234567890",retentionUntil:"2026-08-28T10:00:00.000Z",metadata:{}}]}})`, context);
  assert.match(reviewHtml, /RUN REVIEW/);
  assert.match(reviewHtml, /repository-1:src\/app\.js/);
  assert.match(reviewHtml, /Approve exact target/);
  assert.match(reviewHtml, /src\/app\.js/);
  assert.match(reviewHtml, /Failed/);
  assert.match(reviewHtml, /1 test failed/);
  assert.match(reviewHtml, /Retain safely/);
  assert.match(reviewHtml, /Discard exact worktree/);
  assert.match(reviewHtml, /does not commit, push, publish, or update the linked Issue/);

  const writebackHtml = vm.runInContext(`runReviewPanel({runId:"run-1",loading:false,error:null,selectedArtifactId:null,artifactContent:null,artifactLoading:false,actionPending:false,data:{agentRun:{id:"run-1",status:"completed",startedAt:"2026-07-29T10:00:00.000Z",completedAt:"2026-07-29T10:05:00.000Z"},approvalRequests:[{id:"approval-write",capability:"external.issue.write",targetId:"link-1:status:done",reason:"Update linked Issue",riskLevel:"medium",status:"approved"}],managedWorktree:null,fileChanges:[],artifacts:[],issueWriteback:{available:true,reason:null,suggestedStatus:"done",preview:{targetId:"link-1:status:done",issue:{id:"issue-1",title:"Fix login redirects",externalIssueId:"17"},source:{provider:"gitlab",displayName:"Portal"},currentStatus:"todo",requestedStatus:"done"},attempts:[{id:"writeback-1",approvalRequestId:"approval-write",previousStatus:"todo",requestedStatus:"done",status:"approved",updatedAt:"2026-07-29T10:06:00.000Z",preview:{}}]}}})`, context);
  assert.match(writebackHtml, /Origin status write-back/);
  assert.match(writebackHtml, /Fix login redirects/);
  assert.match(writebackHtml, /Portal/);
  assert.match(writebackHtml, /link-1:status:done/);
  assert.match(writebackHtml, /Update authoritative Issue/);
  assert.match(writebackHtml, /replicas remain unchanged/);

  const recoveryHtml = vm.runInContext(`runReviewPanel({runId:"run-recovery",loading:false,error:null,selectedArtifactId:null,artifactContent:null,artifactLoading:false,actionPending:false,data:{agentRun:{id:"run-recovery",status:"interrupted",startedAt:"2026-07-29T10:00:00.000Z",completedAt:"2026-07-29T10:04:00.000Z",recovery:{classification:"manual_review",reason:"server_restart_during_run",originalStatus:"running",recoveredAt:"2026-07-29T10:04:00.000Z",acknowledgedAt:null,acknowledgedBy:null,automaticReplay:false}},approvalRequests:[],managedWorktree:null,fileChanges:[],artifacts:[],issueWriteback:{available:false,reason:"No linked Issue",preview:null,attempts:[]}}})`, context);
  assert.match(recoveryHtml, /Interrupted Run/);
  assert.match(recoveryHtml, /Manual worktree review required/);
  assert.match(recoveryHtml, /No commands, file changes, verification, or external writes were replayed automatically/);
  assert.match(recoveryHtml, /data-run-recovery-acknowledge/);
});

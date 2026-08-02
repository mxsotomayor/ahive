const icons = {
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
  inbox: '<svg viewBox="0 0 24 24"><path d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Z"/><path d="M4 14h5l2 3h2l2-3h5"/></svg>',
  plug: '<svg viewBox="0 0 24 24"><path d="M12 22v-5M9 8V2m6 6V2M7 8h10v3a5 5 0 0 1-10 0V8Z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r=".5"/><circle cx="3.5" cy="12" r=".5"/><circle cx="3.5" cy="18" r=".5"/></svg>',
  board: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="10" rx="2"/></svg>',
  filter: '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>',
  external: '<svg viewBox="0 0 24 24"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M20 7h-5V2M4 17h5v5M19 12a7 7 0 0 0-12-5L4 10M5 12a7 7 0 0 0 12 5l3-3"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>',
  agent: '<svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5"/></svg>'
};

const sourceInfo = {
  github: { label: "GitHub", mark: "GH", color: "#24292f" },
  gitlab: { label: "GitLab", mark: "GL", color: "#e65328" },
  openproject: { label: "OpenProject", mark: "OP", color: "#0877d1" },
  sheets: { label: "Google Sheets", mark: "GS", color: "#18864b" },
  excel: { label: "Excel", mark: "XL", color: "#217346" },
  manual: { label: "Maxwell", mark: "MX", color: "#6d5ce7" }
};

const seedIssues = [];

const state = {
  page: "dashboard",
  view: "list",
  query: "",
  source: "all",
  status: "active",
  issues: loadIssues(),
  syncMeta: loadSyncMeta(),
  workspace: null,
  workspaceError: null,
  agents: null,
  agentsError: null,
  agentsLoading: true,
  operationalHealth: null,
  agentConversation: null,
  mobileNavOpen: false,
  repositoryActions: {},
  repositoryErrors: {},
  googleSheetsStatus: null
};

function loadIssues() {
  try {
    const stored = JSON.parse(localStorage.getItem("maxwell-issues")) || seedIssues;
    return stored.filter(issue => issue.source === "gitlab" && issue.integration?.provider === "gitlab");
  }
  catch { return seedIssues; }
}

function saveIssues() { localStorage.setItem("maxwell-issues", JSON.stringify(state.issues)); }
function loadSyncMeta() {
  try { return JSON.parse(localStorage.getItem("maxwell-sync-meta")) || {}; }
  catch { return {}; }
}
function saveSyncMeta() { localStorage.setItem("maxwell-sync-meta", JSON.stringify(state.syncMeta)); }
function clean(value) { return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
function icon(name, className = "") { return `<span class="icon ${className}">${icons[name]}</span>`; }
function statusLabel(status) { return ({ todo: "To do", in_progress: "In progress", review: "In review", done: "Done" })[status]; }
function sourceBadge(source, compact = false) {
  const item = sourceInfo[source] || { label: source || "Source", mark: String(source || "?").slice(0, 2).toUpperCase(), color: "#6d7482" };
  return `<span class="source-badge ${compact ? "compact" : ""}" title="${item.label}"><span class="source-mark" style="--source:${item.color}">${item.mark}</span>${compact ? "" : `<span>${item.label}</span>`}</span>`;
}
function daysFromNow(date) {
  if (!date) return Number.POSITIVE_INFINITY;
  const today = new Date("2026-07-17T12:00:00");
  const target = new Date(`${date}T12:00:00`);
  return Math.round((target - today) / 86400000);
}
function dueLabel(issue) {
  if (issue.status === "done") return "Completed";
  if (!issue.due) return "No due date";
  const days = daysFromNow(issue.due);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due ${new Date(`${issue.due}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })}`;
}
function getFilteredIssues() {
  return state.issues.filter(issue => {
    const search = `${issue.title} ${issue.id} ${issue.project} ${issue.labels.join(" ")}`.toLowerCase();
    const matchesQuery = search.includes(state.query.toLowerCase());
    const matchesSource = state.source === "all" || issue.source === state.source;
    const matchesStatus = state.status === "all" || (state.status === "active" ? issue.status !== "done" : issue.status === state.status);
    return matchesQuery && matchesSource && matchesStatus;
  });
}

function layout(content) {
  const connectedSources = ["github", "gitlab"].filter(source => state.syncMeta[source]);
  const syncedIssueCount = connectedSources.reduce((total, source) => total + (state.syncMeta[source].assignedItems || 0), 0);
  return `
    <div class="app-shell">
      ${state.mobileNavOpen ? `<button class="mobile-nav-backdrop" data-close-mobile-nav aria-label="Close navigation"></button>` : ""}
      <aside class="sidebar ${state.mobileNavOpen ? "mobile-open" : ""}">
        <button class="brand" data-nav="dashboard" aria-label="Maxwell home"><span class="brand-symbol"><i></i><i></i><i></i></span><span>maxwell</span></button>
        <nav class="main-nav" aria-label="Main navigation">
          <button class="nav-item ${state.page === "dashboard" ? "active" : ""}" data-nav="dashboard">${icon("grid")}<span>Overview</span></button>
          <button class="nav-item ${state.page === "issues" ? "active" : ""}" data-nav="issues">${icon("inbox")}<span>My issues</span><b>${state.issues.filter(i => i.status !== "done").length}</b></button>
          <button class="nav-item ${state.page === "workspace" ? "active" : ""}" data-nav="workspace">${icon("layers")}<span>Workspace</span></button>
          <button class="nav-item ${state.page === "agents" ? "active" : ""}" data-nav="agents">${icon("agent")}<span>Agents</span>${state.agents?.agentProfiles?.length ? `<b>${state.agents.agentProfiles.length}</b>` : ""}</button>
          <button class="nav-item ${state.page === "integrations" ? "active" : ""}" data-nav="integrations">${icon("plug")}<span>Integrations</span></button>
        </nav>
        <div class="sidebar-spacer"></div>
        <div class="sync-card"><span class="sync-light"></span><div><strong>${connectedSources.length ? `${connectedSources.length} source${connectedSources.length > 1 ? "s" : ""} connected` : "Local prototype ready"}</strong><small>${connectedSources.length ? `${syncedIssueCount} assigned issues synced` : "Add a source token to sync"}</small></div></div>
        <nav class="utility-nav">
          <button class="nav-item" data-toast="Notifications are all caught up">${icon("bell")}<span>Notifications</span><span class="notification-dot"></span></button>
          <button class="nav-item" data-toast="Settings will be added with authentication">${icon("settings")}<span>Settings</span></button>
        </nav>
        <div class="profile"><span class="avatar">NM</span><div><strong>Max. S.Ramos</strong><small>Workspace owner</small></div><button aria-label="Profile options">•••</button></div>
      </aside>
      <main class="main-content">${content}</main>
    </div>`;
}

function topbar(title, subtitle, showAdd = true) {
  return `<header class="topbar"><div><p class="eyebrow">${subtitle}</p><h1>${title}</h1></div><div class="top-actions"><button class="icon-button mobile-menu" aria-label="Open menu">${icon("list")}</button><button class="icon-button" aria-label="Notifications">${icon("bell")}<span class="badge-dot"></span></button>${showAdd ? `<button class="primary-button" data-action="add">${icon("plus")}<span>New issue</span></button>` : ""}</div></header>`;
}

function dashboardPage() {
  const active = state.issues.filter(i => i.status !== "done");
  const overdue = active.filter(i => daysFromNow(i.due) < 0);
  const dueSoon = active.filter(i => daysFromNow(i.due) >= 0 && daysFromNow(i.due) <= 2);
  const progress = active.filter(i => i.status === "in_progress");
  const prioritized = [...active].sort((a,b) => (a.due || "9999-12-31").localeCompare(b.due || "9999-12-31"));
  const focusIssue = prioritized[0];
  return layout(`
    ${topbar("Good morning, Max", "Friday, July 17")}
    <section class="content-wrap">
      <div class="intro-row"><div><span class="truth-badge">GitLab · Source of truth</span><h2>Your work, in one place.</h2><p>Pull from GitLab locally, then publish the canonical set to connected targets.</p></div><div class="sync-actions"><button class="sync-button" data-sync="gitlab">${icon("sync")} Refresh from GitLab</button><button class="primary-button compact-button" data-action="outbound-sync">${icon("arrow")} Sync to other sources</button></div></div>
      <section class="stats-grid" aria-label="Issue overview">
        <button class="stat-card blue" data-stat="active"><span class="stat-icon">${icon("inbox")}</span><div><small>Open issues</small><strong>${active.length}</strong><p><b>+3</b> since Monday</p></div><span class="stat-arrow">${icon("arrow")}</span></button>
        <button class="stat-card coral" data-stat="overdue"><span class="stat-icon">${icon("clock")}</span><div><small>Overdue</small><strong>${overdue.length}</strong><p>Needs your attention</p></div><span class="stat-arrow">${icon("arrow")}</span></button>
        <button class="stat-card violet" data-stat="in_progress"><span class="stat-icon">${icon("bolt")}</span><div><small>In progress</small><strong>${progress.length}</strong><p>Across 2 projects</p></div><span class="stat-arrow">${icon("arrow")}</span></button>
        <button class="stat-card mint" data-stat="due"><span class="stat-icon">${icon("calendar")}</span><div><small>Due soon</small><strong>${dueSoon.length}</strong><p>Within 48 hours</p></div><span class="stat-arrow">${icon("arrow")}</span></button>
      </section>
      <section class="workspace-card">
        <div class="section-heading"><div><h2>Needs your attention</h2><p>Prioritized by urgency and due date</p></div><button class="text-button" data-nav="issues">View all issues ${icon("arrow")}</button></div>
        <div class="attention-list">
          ${prioritized.slice(0,5).map(issueRow).join("")}
        </div>
      </section>
      <section class="bottom-grid">
        <div class="workspace-card source-summary"><div class="section-heading"><div><h2>Connected sources</h2><p>Your work at a glance</p></div><button class="icon-button small" data-nav="integrations" aria-label="Manage integrations">${icon("settings")}</button></div>${Object.entries(sourceInfo).filter(([key]) => key !== "manual").map(([key,item]) => { const count = active.filter(i => i.source === key).length; return `<div class="source-line">${sourceBadge(key)}<span class="source-track"><i style="width:${Math.max(18, count * 23)}%"></i></span><strong>${count}</strong></div>`; }).join("")}</div>
        <div class="focus-card"><span class="focus-orbit">${icon("bolt")}</span><div><small>FOCUS SUGGESTION</small><h2>${focusIssue ? focusIssue.title : "You're all caught up"}</h2><p>${focusIssue ? `${dueLabel(focusIssue)} · ${focusIssue.project}` : "There are no active issues in your canonical GitLab queue."}</p>${focusIssue ? `<button data-open="${focusIssue.id}">Open issue ${icon("arrow")}</button>` : ""}</div></div>
      </section>
    </section>`);
}

function issueRow(issue) {
  const isOverdue = daysFromNow(issue.due) < 0 && issue.status !== "done";
  return `<article class="issue-row" data-open="${issue.id}" tabindex="0">
    <button class="complete-toggle ${issue.status === "done" ? "checked" : ""}" data-complete="${issue.id}" aria-label="${issue.status === "done" ? "Reopen" : "Complete"} ${issue.title}">${issue.status === "done" ? icon("check") : ""}</button>
    <div class="issue-source">${sourceBadge(issue.source, true)}</div>
    <div class="issue-main"><div class="issue-title-line"><strong>${issue.title}</strong><span class="priority-dot ${issue.priority}" title="${issue.priority} priority"></span></div><p><span>${issue.id}</span><i>•</i><span>${issue.project}</span></p></div>
    <span class="status-pill ${issue.status}">${statusLabel(issue.status)}</span>
    <span class="due-date ${isOverdue ? "overdue" : ""}">${icon("calendar")} ${dueLabel(issue)}</span>
    <span class="row-chevron">${icon("chevron")}</span>
  </article>`;
}

function issuesPage() {
  const issues = getFilteredIssues();
  return layout(`
    ${topbar("My issues", `${issues.length} issues in this view`)}
    <section class="content-wrap issue-page">
      <div class="issue-toolbar">
        <label class="search-box">${icon("search")}<input id="search-input" type="search" placeholder="Search issues, projects, labels..." value="${state.query}" /><kbd>⌘ K</kbd></label>
        <div class="view-switch" role="group" aria-label="View"><button class="${state.view === "list" ? "active" : ""}" data-view="list" aria-label="List view">${icon("list")}</button><button class="${state.view === "board" ? "active" : ""}" data-view="board" aria-label="Board view">${icon("board")}</button></div>
      </div>
      <div class="filter-row">
        <div class="filter-group"><span>${icon("filter")} Filter</span>
          <select id="source-filter" aria-label="Filter by source"><option value="all">All sources</option>${Object.entries(sourceInfo).map(([key,item]) => `<option value="${key}" ${state.source === key ? "selected" : ""}>${item.label}</option>`).join("")}</select>
          <select id="status-filter" aria-label="Filter by status"><option value="active" ${state.status === "active" ? "selected" : ""}>Active issues</option><option value="all" ${state.status === "all" ? "selected" : ""}>All statuses</option><option value="todo" ${state.status === "todo" ? "selected" : ""}>To do</option><option value="in_progress" ${state.status === "in_progress" ? "selected" : ""}>In progress</option><option value="review" ${state.status === "review" ? "selected" : ""}>In review</option><option value="done" ${state.status === "done" ? "selected" : ""}>Done</option></select>
        </div><button class="clear-button" data-action="clear-filters">Clear filters</button>
      </div>
      ${state.view === "list" ? `<section class="workspace-card issue-list"><div class="list-head"><span></span><span>Issue</span><span>Status</span><span>Due date</span><span></span></div>${issues.length ? issues.map(issueRow).join("") : emptyState()}</section>` : boardView(issues)}
    </section>`);
}

function boardView(issues) {
  return `<section class="board-view">${["todo","in_progress","review","done"].map(status => { const cards = issues.filter(i => i.status === status); return `<div class="board-column"><header><span class="column-dot ${status}"></span><h3>${statusLabel(status)}</h3><b>${cards.length}</b></header><div class="board-stack">${cards.map(issue => `<article class="board-card" data-open="${issue.id}"><div>${sourceBadge(issue.source, true)}<span class="priority-label ${issue.priority}">${issue.priority}</span></div><h4>${issue.title}</h4><p>${issue.id} · ${issue.project}</p><footer><span class="due-date ${daysFromNow(issue.due) < 0 && issue.status !== "done" ? "overdue" : ""}">${icon("calendar")} ${dueLabel(issue)}</span><button class="complete-toggle ${issue.status === "done" ? "checked" : ""}" data-complete="${issue.id}" aria-label="Complete ${issue.title}">${issue.status === "done" ? icon("check") : ""}</button></footer></article>`).join("") || `<div class="empty-column">No issues here</div>`}</div></div>`; }).join("")}</section>`;
}

function emptyState() { return `<div class="empty-state"><span>${icon("search")}</span><h3>No issues found</h3><p>Try changing your search or filters.</p><button class="secondary-button" data-action="clear-filters">Clear filters</button></div>`; }

function workspacePage() {
  if (state.workspaceError) return layout(`${topbar("Workspace", "Organizations, Projects, Products, Repositories, and Sources", false)}<section class="content-wrap"><div class="workspace-error"><h2>Workspace could not be loaded</h2><p>${clean(state.workspaceError)}</p><button class="secondary-button" data-workspace-refresh>${icon("sync")} Try again</button></div></section>`);
  if (!state.workspace) return layout(`${topbar("Workspace", "Organizations, Projects, Products, Repositories, and Sources", false)}<section class="content-wrap"><div class="workspace-loading">${icon("sync")} Loading workspace...</div></section>`);

  const workspace = state.workspace;
  return layout(`
    ${topbar("Workspace", "Organizations, Projects, Products, Repositories, and Sources", false)}
    <section class="content-wrap workspace-page">
      <div class="workspace-intro"><div><span class="truth-badge">Local work context</span><h2>Structure your work.</h2><p>Projects own local Repositories. Verification and inspection are read-only and never modify repository contents.</p></div><button class="primary-button compact-button" data-workspace-create="organization">${icon("plus")} Add organization</button></div>
      <section class="workspace-metrics">
        ${workspaceMetric("Organizations", workspace.organizations.length)}
        ${workspaceMetric("Projects", workspace.projects.length)}
        ${workspaceMetric("Products", workspace.products.length)}
        ${workspaceMetric("Repositories", workspace.repositories?.length || 0)}
        ${workspaceMetric("Product sources", workspace.productSources.length)}
      </section>
      <div class="workspace-section-heading"><div><h2>Hierarchy</h2><p>Organization → Project → Repositories and Products → Product Sources</p></div></div>
      <section class="organization-stack">
        ${workspace.organizations.length ? workspace.organizations.map(organizationCard).join("") : `<div class="workspace-empty"><h3>No organizations yet</h3><p>Create the first employer or business context.</p></div>`}
      </section>
      <div class="workspace-section-heading account-heading"><div><h2>Connector accounts</h2><p>Credentials are referenced by environment-variable name; secret values never appear here.</p></div><button class="secondary-button" data-workspace-create="connectorAccount">${icon("plus")} Add account</button></div>
      <section class="account-grid">
        ${workspace.connectorAccounts.length ? workspace.connectorAccounts.map(accountCard).join("") : `<div class="workspace-empty"><h3>No connector accounts</h3><p>Add an account before configuring a Product Source.</p></div>`}
      </section>
    </section>`);
}

function workspaceMetric(label, value) {
  return `<article><strong>${value}</strong><span>${label}</span></article>`;
}

function organizationCard(organization) {
  const projects = state.workspace.projects.filter(project => project.organizationId === organization.id);
  return `<article class="organization-card ${organization.active ? "" : "inactive"}">
    <header class="entity-header"><div class="entity-symbol organization-symbol">OR</div><div><span class="entity-kind">Organization</span><h3>${clean(organization.name)}</h3><p>${clean(organization.type || "organization")} · ${projects.length} project${projects.length === 1 ? "" : "s"}</p></div><span class="entity-state ${organization.active ? "" : "inactive"}">${organization.active ? "Active" : "Inactive"}</span><div class="entity-actions"><button class="icon-button small" data-workspace-edit="organization" data-entity-id="${clean(organization.id)}" aria-label="Edit ${clean(organization.name)}">${icon("settings")}</button><button class="secondary-button" data-workspace-create="project" data-parent-id="${clean(organization.id)}">${icon("plus")} Project</button></div></header>
    <div class="project-stack">${projects.length ? projects.map(projectCard).join("") : `<div class="child-empty">No Projects in this Organization yet.</div>`}</div>
  </article>`;
}

function projectCard(project) {
  const products = state.workspace.products.filter(product => product.projectId === project.id);
  const repositories = (state.workspace.repositories || []).filter(repository => repository.projectId === project.id);
  return `<section class="project-card ${project.active ? "" : "inactive"}">
    <header class="entity-header compact"><div class="entity-symbol project-symbol">PR</div><div><span class="entity-kind">Project</span><h3>${clean(project.name)}</h3><p>${products.length} product${products.length === 1 ? "" : "s"} · ${repositories.length} repositor${repositories.length === 1 ? "y" : "ies"}${project.key ? ` · ${clean(project.key)}` : ""}</p></div><span class="entity-state ${project.active ? "" : "inactive"}">${project.active ? "Active" : "Inactive"}</span><div class="entity-actions"><button class="icon-button small" data-workspace-edit="project" data-entity-id="${clean(project.id)}" aria-label="Edit ${clean(project.name)}">${icon("settings")}</button><button class="secondary-button" data-workspace-create="repository" data-parent-id="${clean(project.id)}">${icon("plus")} Repository</button><button class="secondary-button" data-workspace-create="product" data-parent-id="${clean(project.id)}">${icon("plus")} Product</button></div></header>
    ${repositorySection(project, repositories)}
    <div class="product-grid">${products.length ? products.map(productCard).join("") : `<div class="child-empty">No Products in this Project yet.</div>`}</div>
  </section>`;
}

function repositorySection(project, repositories) {
  return `<section class="repository-section" aria-labelledby="repositories-${clean(project.id)}">
    <div class="repository-heading"><div><span class="entity-kind">Local code</span><h4 id="repositories-${clean(project.id)}">Repositories</h4></div><button class="add-repository-button" data-workspace-create="repository" data-parent-id="${clean(project.id)}">${icon("plus")} Add repository</button></div>
    <div class="repository-list">${repositories.length ? repositories.map(repositoryCard).join("") : `<div class="repository-empty"><strong>No repositories registered</strong><span>Add a local Git working tree when this Project needs code context.</span></div>`}</div>
  </section>`;
}

function repositoryCard(repository) {
  const product = repository.productId ? state.workspace.products.find(item => item.id === repository.productId) : null;
  const git = repository.gitMetadata;
  const busyAction = state.repositoryActions[repository.id];
  const error = state.repositoryErrors[repository.id] || repository.verificationError;
  const label = repository.active === false ? "Inactive" : repository.verificationStatus === "verified" ? "Verified" : repository.verificationStatus === "invalid" ? "Invalid path" : "Unverified";
  const statusClass = repository.active === false ? "inactive" : repository.verificationStatus;
  const inspectionAction = repository.verificationStatus === "verified" ? "inspect" : "verify";
  const actionLabel = busyAction ? (busyAction === "verify" ? "Verifying…" : "Refreshing…") : inspectionAction === "verify" ? "Verify path" : "Refresh Git";
  const commit = git?.head ? git.head.slice(0, 9) : null;
  const remoteHosts = Array.isArray(git?.remoteHosts) && git.remoteHosts.length ? git.remoteHosts.join(", ") : "No origin remote";
  return `<article class="repository-card ${repository.active === false ? "inactive" : ""} ${repository.verificationStatus}">
    <div class="repository-main"><span class="repository-symbol">RE</span><div class="repository-copy"><div class="repository-title"><h5>${clean(repository.name)}</h5><span class="repository-status ${clean(statusClass)}">${clean(label)}</span>${git ? `<span class="repository-cleanliness ${git.dirty ? "dirty" : "clean"}">${git.dirty ? `${git.changedCount} changed` : "Clean"}</span>` : ""}</div><p>${clean(product?.name || "Project-level")} · ${repository.accessMode === "guarded_write" ? "Guarded write" : "Read only"}</p><code title="${clean(repository.localPath)}">${clean(repository.localPath)}</code></div></div>
    <div class="repository-git ${git ? "" : "empty"}">${git ? `<span><small>Branch</small><strong>${clean(git.branch || "Detached HEAD")}</strong></span><span><small>Commit</small><strong><code>${clean(commit)}</code></strong></span><span><small>Origin</small><strong>${clean(remoteHosts)}</strong></span>` : `<p>${repository.verificationStatus === "verified" ? "Verified path. Refresh to read Git state." : "Verify this stored path before Git metadata can be read."}</p>`}</div>
    ${error ? `<div class="repository-error" role="alert">${icon("close")}<span>${clean(error)}</span></div>` : ""}
    <div class="repository-actions"><span>${repository.lastInspectedAt ? `Inspected ${clean(relativeTime(repository.lastInspectedAt))}` : repository.verifiedAt ? `Verified ${clean(relativeTime(repository.verifiedAt))}` : "Not inspected"}</span><button class="secondary-button" data-repository-action="${inspectionAction}" data-repository-id="${clean(repository.id)}" ${busyAction || repository.active === false ? "disabled" : ""}>${icon("sync")} ${actionLabel}</button><button class="icon-button small" data-workspace-edit="repository" data-entity-id="${clean(repository.id)}" aria-label="Edit ${clean(repository.name)}">${icon("settings")}</button></div>
  </article>`;
}

function relativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "recently";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString();
}

function productCard(product) {
  const sources = state.workspace.productSources.filter(source => source.productId === product.id);
  const issueCount = state.workspace.issues.filter(issue => issue.productId === product.id).length;
  return `<article class="product-card ${product.active ? "" : "inactive"}">
    <header><div><span class="entity-kind">Product</span><h4>${clean(product.name)}</h4><p>${issueCount} issue${issueCount === 1 ? "" : "s"} · ${sources.length} source${sources.length === 1 ? "" : "s"}</p></div><span class="entity-state ${product.active ? "" : "inactive"}">${product.active ? "Active" : "Inactive"}</span><button class="icon-button small" data-workspace-edit="product" data-entity-id="${clean(product.id)}" aria-label="Edit ${clean(product.name)}">${icon("settings")}</button></header>
    <div class="product-sources">${sources.length ? sources.map(productSourceRow).join("") : `<p class="source-empty">No Sources configured.</p>`}</div>
    <button class="add-source-button" data-workspace-create="productSource" data-parent-id="${clean(product.id)}">${icon("plus")} Add Product Source</button>
  </article>`;
}

function productSourceRow(source) {
  const account = state.workspace.connectorAccounts.find(item => item.id === source.connectorAccountId);
  const linkCount = state.workspace.externalIssueLinks.filter(link => link.productSourceId === source.id).length;
  const location = source.provider === "sheets"
    ? `${source.metadata?.sheetTab || "Tasks"} · ${source.metadata?.range || "A:Z"}`
    : `container ${source.externalContainerId}`;
  return `<div class="product-source-row ${source.active ? "" : "inactive"}">${sourceBadge(source.provider, true)}<div><strong>${clean(source.displayName)}</strong><span>${clean(account?.displayName || source.provider)} · ${clean(location)}</span></div><span class="source-link-count">${linkCount} link${linkCount === 1 ? "" : "s"}</span><div class="source-row-actions">${source.provider === "sheets" ? `<button class="icon-button small" data-google-sheet-test="${clean(source.id)}" aria-label="Test ${clean(source.displayName)}" title="Test Google Sheet access">${icon("bolt")}</button>` : ""}<button class="icon-button small" data-workspace-edit="productSource" data-entity-id="${clean(source.id)}" aria-label="Edit ${clean(source.displayName)}">${icon("settings")}</button><button class="icon-button small danger-button" data-workspace-remove-source="${clean(source.id)}" aria-label="Remove ${clean(source.displayName)}" title="${linkCount ? "Linked Sources must be deactivated" : "Remove Product Source"}">${icon("trash")}</button></div></div>`;
}

function accountCard(account) {
  const sources = state.workspace.productSources.filter(source => source.connectorAccountId === account.id);
  const credentialSummary = account.provider === "sheets"
    ? `${account.credentialReferences?.clientId || "GOOGLE_CLIENT_ID"} + ${account.credentialReferences?.clientSecret || "GOOGLE_CLIENT_SECRET"}`
    : account.credentialReference || "No credential reference";
  const location = account.provider === "sheets" ? "Google OAuth 2.0" : account.baseUrl || "No base URL";
  return `<article class="account-card ${account.active ? "" : "inactive"}">${sourceBadge(account.provider, true)}<div><span class="entity-kind">${clean(sourceInfo[account.provider]?.label || account.provider)} account</span><h3>${clean(account.displayName)}</h3><p>${clean(location)} · ${sources.length} source${sources.length === 1 ? "" : "s"}</p><small>${clean(credentialSummary)}</small></div><span class="entity-state ${account.active ? "" : "inactive"}">${account.active ? "Active" : "Inactive"}</span><button class="icon-button small" data-workspace-edit="connectorAccount" data-entity-id="${clean(account.id)}" aria-label="Edit ${clean(account.displayName)}">${icon("settings")}</button></article>`;
}

function workspaceEntityModal(type, entity = null, parentId = null) {
  const isEdit = Boolean(entity);
  const labels = { organization: "Organization", project: "Project", product: "Product", repository: "Repository", connectorAccount: "Connector Account", productSource: "Product Source" };
  const label = labels[type];
  const fields = workspaceEntityFields(type, entity, parentId);
  return `<div class="overlay visible" data-action="close-overlay"></div><div class="modal workspace-modal visible" role="dialog" aria-modal="true" aria-labelledby="workspace-modal-title"><header><div><p class="eyebrow">WORKSPACE STRUCTURE</p><h2 id="workspace-modal-title">${isEdit ? "Edit" : "Add"} ${label}</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close modal">${icon("close")}</button></header><form id="workspace-entity-form" data-entity-type="${type}" data-entity-id="${clean(entity?.id || "")}">${fields}<label class="active-control"><input name="active" type="checkbox" ${entity?.active === false ? "" : "checked"}/><span>Active and available for new work</span></label><div class="modal-footer"><p>Changes are stored locally in the neutral workspace.</p><div><button type="button" class="ghost-button" data-action="close-overlay">Cancel</button><button class="primary-button" type="submit">${icon(isEdit ? "check" : "plus")} ${isEdit ? "Save changes" : `Add ${label}`}</button></div></div></form></div>`;
}

function workspaceEntityFields(type, entity, parentId) {
  if (type === "organization") return `<label>Name<input name="name" required value="${clean(entity?.name || "")}" placeholder="RezzillaLabs" /></label><label>Organization type<select name="type">${optionList(["employer", "client", "partner", "institution"], entity?.type || "employer")}</select></label>`;
  if (type === "project") {
    const organizationId = entity?.organizationId || parentId || state.workspace.organizations[0]?.id;
    return `${entity ? readonlyParent("Organization", state.workspace.organizations.find(item => item.id === organizationId)?.name) : selectField("Organization", "organizationId", state.workspace.organizations, organizationId)}<label>Name<input name="name" required value="${clean(entity?.name || "")}" placeholder="IRN" /></label><div class="form-grid"><label>Key<input name="key" value="${clean(entity?.key || "")}" placeholder="irn" /></label></div><label>Description<textarea name="description" rows="3" placeholder="Optional context">${clean(entity?.description || "")}</textarea></label>`;
  }
  if (type === "product") {
    const projectId = entity?.projectId || parentId || state.workspace.projects[0]?.id;
    return `${entity ? readonlyParent("Project", state.workspace.projects.find(item => item.id === projectId)?.name) : selectField("Project", "projectId", state.workspace.projects, projectId)}<label>Name<input name="name" required value="${clean(entity?.name || "")}" placeholder="IRN" /></label><div class="form-grid"><label>Key<input name="key" value="${clean(entity?.key || "")}" placeholder="irn" /></label></div><label>Description<textarea name="description" rows="3" placeholder="Optional context">${clean(entity?.description || "")}</textarea></label>`;
  }
  if (type === "repository") {
    const projectId = entity?.projectId || parentId || state.workspace.projects[0]?.id;
    const project = state.workspace.projects.find(item => item.id === projectId);
    const products = state.workspace.products.filter(item => item.projectId === projectId);
    const productOptions = `<option value="">Project-level (no Product)</option>${products.map(item => `<option value="${clean(item.id)}" ${item.id === entity?.productId ? "selected" : ""}>${clean(item.name)}${item.active ? "" : " (inactive)"}</option>`).join("")}`;
    return `<label>Project<input value="${clean(project?.name || "Unknown")}" readonly /><input name="projectId" type="hidden" value="${clean(projectId || "")}" /></label><label>Repository name<input name="name" required value="${clean(entity?.name || "")}" placeholder="IRN API" /></label><label>Local repository path<input name="localPath" required value="${clean(entity?.localPath || "")}" placeholder="E:\\WORK\\irn-api" autocomplete="off" /><small>The server verifies the canonical path against <code>AHIVE_REPOSITORY_ROOTS</code>. No repository files are modified.</small></label><div class="form-grid"><label>Product association<select name="productId">${productOptions}</select><small>Optional. Products are limited to this Project.</small></label><label>Access mode<select name="accessMode">${optionList(["read_only", "guarded_write"], entity?.accessMode || "read_only", value => value === "read_only" ? "Read only" : "Guarded write")}</select><small>This setting records future authority; this screen performs read-only inspection only.</small></label></div><label>Default branch<input name="defaultBranch" value="${clean(entity?.defaultBranch || "")}" placeholder="main" /><small>Optional planning hint. Verification reads the current checkout and never switches branches.</small></label>`;
  }
  if (type === "connectorAccount") {
    const provider = entity?.provider || "gitlab";
    const refs = entity?.credentialReferences || {};
    return `<label>Provider${entity ? `<input value="${clean(sourceInfo[provider]?.label || provider)}" readonly /><input name="provider" type="hidden" value="${clean(provider)}" />` : `<select name="provider" data-provider-select>${optionList(["gitlab", "github", "openproject", "sheets", "excel"], provider, value => sourceInfo[value]?.label || value)}</select>`}</label><label>Account name<input name="displayName" required value="${clean(entity?.displayName || "")}" placeholder="Google Sheets · Rezzilla, Labs" /></label><div data-provider-generic ${provider === "sheets" ? "hidden" : ""}><label>Base URL<input name="baseUrl" type="url" value="${clean(entity?.baseUrl || "")}" placeholder="https://gitlab.example.com" />${entity ? `<small>The URL can change only while this account has no Product Sources.</small>` : ""}</label><label>Credential environment variable<input name="credentialReference" value="${clean(entity?.credentialReference || "")}" placeholder="GITLAB_TOKEN" pattern="[A-Z][A-Z0-9_]*" /><small>Enter only the variable name. Put its secret value in <code>.env</code>.</small></label></div><div data-provider-sheets ${provider === "sheets" ? "" : "hidden"}><label>OAuth client ID variable<input name="clientIdReference" value="${clean(refs.clientId || "GOOGLE_CLIENT_ID")}" pattern="[A-Z][A-Z0-9_]*" /></label><label>OAuth client secret variable<input name="clientSecretReference" value="${clean(refs.clientSecret || "GOOGLE_CLIENT_SECRET")}" pattern="[A-Z][A-Z0-9_]*" /></label><label>Optional refresh token variable<input name="refreshTokenReference" value="${clean(refs.refreshToken || "GOOGLE_REFRESH_TOKEN")}" pattern="[A-Z][A-Z0-9_]*" /><small>Normally Maxwell stores the refresh token locally after you authorize Google. Secret values are never stored in the workspace.</small></label></div>`;
  }
  if (type === "productSource") {
    const productId = entity?.productId || parentId || state.workspace.products[0]?.id;
    const accountId = entity?.connectorAccountId || state.workspace.connectorAccounts[0]?.id;
    const account = state.workspace.connectorAccounts.find(item => item.id === accountId);
    const isSheets = account?.provider === "sheets";
    const accountField = entity ? readonlyParent("Connector Account", account?.displayName) : `<label>Connector Account<select name="connectorAccountId" required data-source-account-select>${state.workspace.connectorAccounts.map(item => `<option value="${clean(item.id)}" data-provider="${clean(item.provider)}" ${item.id === accountId ? "selected" : ""}>${clean(item.displayName)}${item.active ? "" : " (inactive)"}</option>`).join("")}</select></label>`;
    return `${entity ? readonlyParent("Product", state.workspace.products.find(item => item.id === productId)?.name) : selectField("Product", "productId", state.workspace.products, productId)}${accountField}<label>Source name<input name="displayName" required value="${clean(entity?.displayName || "")}" placeholder="IRN task sheet" /></label><label data-source-container-label>${isSheets ? "Spreadsheet ID" : "External container ID"}<input name="externalContainerId" required value="${clean(entity?.externalContainerId || "")}" placeholder="${isSheets ? "From the Google Sheets URL" : "Project ID or board ID"}" /></label><label>External container URL<input name="externalUrl" type="url" value="${clean(entity?.externalUrl || "")}" placeholder="https://..." /></label><div data-source-sheets ${isSheets ? "" : "hidden"}><label>Worksheet tab<input name="sheetTab" value="${clean(entity?.metadata?.sheetTab || "Tasks")}" placeholder="Tasks" /></label><label>Default A1 range<input name="range" value="${clean(entity?.metadata?.range || "'Tasks'!A:Z")}" placeholder="'Tasks'!A:Z" /><small>Reads and writes are restricted to this worksheet tab.</small></label></div>`;
  }
  return "";
}

function readonlyParent(label, value) { return `<label>${label}<input value="${clean(value || "Unknown")}" readonly /></label>`; }
function selectField(label, name, items, selectedId, displayField = "name") { return `<label>${label}<select name="${name}" required>${items.map(item => `<option value="${clean(item.id)}" ${item.id === selectedId ? "selected" : ""}>${clean(item[displayField])}${item.active ? "" : " (inactive)"}</option>`).join("")}</select></label>`; }
function optionList(values, selected, label = value => value[0].toUpperCase() + value.slice(1)) { return values.map(value => `<option value="${value}" ${value === selected ? "selected" : ""}>${clean(label(value))}</option>`).join(""); }

function agentsPage() {
  const subtitle = "Project-scoped conversations powered by your local Agent CLI";
  if (state.agentsError) return layout(`${topbar("Agents", subtitle, false)}<section class="content-wrap"><div class="workspace-error"><h2>Agent configuration could not be loaded</h2><p>${clean(state.agentsError)}</p><button class="secondary-button" data-agents-refresh>${icon("sync")} Try again</button></div></section>`);
  if (state.agentsLoading || !state.agents || !state.workspace) return layout(`${topbar("Agents", subtitle, false)}<section class="content-wrap"><div class="workspace-loading">${icon("sync")} Loading Agent configuration...</div></section>`);

  const { harnessAccounts, agentProfiles, agentAssignments } = state.agents;
  const agentTasks = state.agents.agentTasks || [];
  const hasActiveHarness = harnessAccounts.some(account => account.active);
  const hasActiveProfile = agentProfiles.some(profile => profile.active);
  const hasActiveProject = state.workspace.projects.some(project => project.active);
  const readyHarnesses = harnessAccounts.filter(account => account.active && account.configuration?.status === "ready").length;
  const availableAssignments = agentAssignments.filter(assignment => assignment.canStartWork).length;
  return layout(`
    ${topbar("Agents", subtitle, false)}
    <section class="content-wrap agents-page">
      <div class="agents-hero"><div><span class="configuration-badge live">Local CLI conversations</span><h2>Give your Agents focused work.</h2><p>Create a durable task inside an explicit Project context, then continue the conversation across multiple runs.</p></div><button class="primary-button compact-button" data-agent-task-create ${availableAssignments ? "" : "disabled"}>${icon("plus")} New Agent Task</button></div>
      ${operationalHealthPanel(state.operationalHealth)}
      <section class="agent-metrics" aria-label="Agent configuration overview">
        ${agentMetric("Harness ready", `${readyHarnesses}/${harnessAccounts.length || 0}`, readyHarnesses ? "ready" : "attention")}
        ${agentMetric("Agent Tasks", agentTasks.length, agentTasks.length ? "ready" : "neutral")}
        ${agentMetric("Assignments available", `${availableAssignments}/${agentAssignments.length || 0}`, availableAssignments ? "ready" : "neutral")}
      </section>

      <div class="workspace-section-heading agent-section-heading"><div><span class="entity-kind">Conversations</span><h2>Agent Tasks</h2><p>Task history and assistant replies are persisted locally. Runs use the selected Assignment and its local CLI login.</p></div><button class="secondary-button" data-agent-task-create ${availableAssignments ? "" : "disabled"}>${icon("plus")} Create Task</button></div>
      <section class="agent-task-list">
        ${agentTasks.length ? agentTasks.map(agentTaskCard).join("") : agentTaskEmpty(availableAssignments)}
      </section>

      <div class="workspace-section-heading agent-section-heading"><div><span class="entity-kind">Execution environment</span><h2>Agent CLI Harnesses</h2><p>Codex and OpenCode each keep their own local credentials; Ahive stores no provider API keys.</p></div><button class="secondary-button" data-agent-create="harnessAccount">${icon("plus")} Add Harness</button></div>
      <section class="harness-grid">
        ${harnessAccounts.length ? harnessAccounts.map(harnessAccountCard).join("") : agentEmpty("No Harness configured", "Configure a local Codex or OpenCode CLI before creating Agent Profiles.", "harnessAccount", "Configure Harness")}
      </section>

      <div class="workspace-section-heading agent-section-heading"><div><span class="entity-kind">Reusable behavior</span><h2>Agent Profiles</h2><p>Description, traits, instructions, model, and default policy stay independent of Projects.</p></div><button class="secondary-button" data-agent-create="agentProfile" ${hasActiveHarness ? "" : "disabled"}>${icon("plus")} Add Profile</button></div>
      <section class="profile-grid">
        ${agentProfiles.length ? agentProfiles.map(agentProfileCard).join("") : agentEmpty("No Agent Profiles", hasActiveHarness ? "Create a reusable Agent definition. No dummy Agents are added automatically." : "Configure or activate a Harness first, then create your first Agent Profile.", hasActiveHarness ? "agentProfile" : null, "Create Profile")}
      </section>

      <div class="workspace-section-heading agent-section-heading"><div><span class="entity-kind">Authorized context</span><h2>Project Assignments</h2><p>Assignments select where a Profile may work; they do not start or simulate an Agent.</p></div><button class="secondary-button" data-agent-create="agentAssignment" ${hasActiveProfile && hasActiveProject ? "" : "disabled"}>${icon("plus")} Add Assignment</button></div>
      <section class="assignment-list">
        ${agentAssignments.length ? agentAssignments.map(agentAssignmentCard).join("") : agentEmpty("No Project Assignments", hasActiveProfile && hasActiveProject ? "Assign a Profile to a Project and optionally narrow Product or Repository context." : "Create or activate an Agent Profile and Project before assigning context.", hasActiveProfile && hasActiveProject ? "agentAssignment" : null, "Create Assignment")}
      </section>
      <aside class="execution-notice">${icon("bolt")}<div><strong>Read by default, guarded when approved</strong><p>Repository-scoped Runs can inspect bounded files and Git metadata. Isolated file changes and configured verification commands require exact, single-use approvals and remain reviewable before any later Git action.</p></div></aside>
    </section>`);
}

function agentMetric(label, value, tone) {
  return `<article class="${tone}"><strong>${clean(value)}</strong><span>${clean(label)}</span></article>`;
}

function operationalHealthPanel(health) {
  if (!health) return `<aside class="operational-health loading">${icon("sync")}<div><strong>Operational status unavailable</strong><p>Refresh Agents to load local recovery diagnostics.</p></div></aside>`;
  const recovery = health.recovery || {};
  const attention = Number(recovery.unacknowledgedRuns || 0) + Number(recovery.staleWorktreeLocks || 0) + Number(recovery.uncertainWritebacks || 0);
  const title = health.status === "healthy" ? "Agent runtime healthy" : health.status === "unhealthy" ? "Unsafe in-flight state detected" : "Recovery attention required";
  const detail = health.status === "healthy" ? `No active recovery items · ${health.totals?.runs || 0} Runs observed` : `${recovery.unacknowledgedRuns || 0} interrupted · ${recovery.staleWorktreeLocks || 0} stale locks · ${recovery.uncertainWritebacks || 0} uncertain writes`;
  return `<aside class="operational-health ${clean(health.status)}"><span class="health-indicator"></span><div><span class="entity-kind">Local operations</span><strong>${clean(title)}</strong><p>${clean(detail)}. Automatic replays: ${clean(recovery.automaticReplays || 0)}.</p></div><div class="operational-health-actions"><span>${attention ? `${attention} need attention` : "Ready"}</span><button class="secondary-button" data-operations-reconcile>${icon("sync")} Reconcile now</button></div></aside>`;
}

function harnessAccountCard(account) {
  const readiness = harnessReadiness(account);
  const harness = harnessInfo(account.provider);
  return `<article class="harness-card ${account.active ? "" : "inactive"}"><div class="harness-symbol">${harness.symbol}</div><div class="harness-copy"><span class="entity-kind">${clean(harness.label)} · ${clean(harness.adapterLabel)}</span><h3>${clean(account.displayName)}</h3><p>${clean(harness.sessionLabel)} · ${clean(account.configuration?.version ? `CLI ${account.configuration.version}` : "CLI version unavailable")}</p><div class="capability-list">${(account.capabilities || []).map(capability => `<span>${clean(capability.replaceAll("_", " "))}</span>`).join("")}</div></div><span class="readiness-pill ${readiness.className}">${clean(readiness.label)}</span><div class="agent-card-actions"><button class="icon-button small" data-agent-edit="harnessAccount" data-entity-id="${clean(account.id)}" aria-label="Edit ${clean(account.displayName)}">${icon("settings")}</button><button class="icon-button small danger-button" data-agent-remove="harnessAccount" data-entity-id="${clean(account.id)}" aria-label="Remove ${clean(account.displayName)}">${icon("trash")}</button></div><p class="readiness-detail">${clean(readiness.detail)}</p></article>`;
}

function harnessReadiness(account) {
  const harness = harnessInfo(account.provider);
  if (!account.active) return { label: "Inactive", className: "inactive", detail: "Activate this Harness before Profiles can start new work." };
  if (account.configuration?.status === "ready") return { label: "Ready", className: "ready", detail: `${harness.adapterLabel} is installed and signed in.` };
  if (account.configuration?.status === "authentication_required") return { label: "Sign-in required", className: "attention", detail: `Run ${harness.loginCommand} locally, then refresh this page.` };
  return { label: "CLI unavailable", className: "error", detail: `Install ${harness.adapterLabel} or correct ${harness.executableVariable}, then refresh.` };
}

function harnessInfo(provider) {
  return provider === "opencode"
    ? { label: "OpenCode", adapter: "opencode-cli", adapterLabel: "OpenCode CLI", executableVariable: "AHIVE_OPENCODE_EXECUTABLE", loginCommand: "opencode auth login", sessionLabel: "OpenCode CLI credentials", symbol: "OC" }
    : { label: "OpenAI", adapter: "codex-cli", adapterLabel: "Codex CLI", executableVariable: "AHIVE_CODEX_EXECUTABLE", loginCommand: "codex login", sessionLabel: "Cached Codex session", symbol: "CX" };
}

function agentProfileCard(profile) {
  const assignments = state.agents.agentAssignments.filter(assignment => assignment.agentProfileId === profile.id);
  const harness = state.agents.harnessAccounts.find(account => account.id === profile.harnessAccountId);
  return `<article class="agent-profile-card ${profile.active ? "" : "inactive"}"><header><div class="agent-avatar">${clean(profile.name.slice(0, 2).toUpperCase())}</div><div><span class="entity-kind">Agent Profile</span><h3>${clean(profile.name)}</h3><p>${clean(profile.description || "No description")}</p></div><span class="entity-state ${profile.active ? "" : "inactive"}">${profile.active ? "Active" : "Inactive"}</span></header><div class="profile-model"><span>${icon("agent")} ${clean(profile.model)}</span><small>${clean(profile.modelSettings?.reasoningEffort || "default reasoning")} · ${clean(harness?.adapter || "No Harness")}</small></div><dl><div><dt>Traits</dt><dd>${clean(profile.traitDescription || "Not specified")}</dd></div><div><dt>Instructions</dt><dd>${clean(profile.instructions || "Not specified")}</dd></div></dl><footer><span>${assignments.length} assignment${assignments.length === 1 ? "" : "s"}</span><div class="agent-card-actions"><button class="secondary-button" data-agent-create="agentAssignment" data-parent-id="${clean(profile.id)}" ${profile.active ? "" : "disabled"}>${icon("plus")} Assign</button><button class="icon-button small" data-agent-edit="agentProfile" data-entity-id="${clean(profile.id)}" aria-label="Edit ${clean(profile.name)}">${icon("settings")}</button><button class="icon-button small danger-button" data-agent-remove="agentProfile" data-entity-id="${clean(profile.id)}" aria-label="Remove ${clean(profile.name)}">${icon("trash")}</button></div></footer></article>`;
}

function agentAssignmentCard(assignment) {
  const context = assignment.effectiveContext;
  const scope = [context.project?.name, context.product?.name, context.repository?.name].filter(Boolean);
  const readiness = assignment.active ? (assignment.canStartWork ? ["Available", "ready"] : ["Unavailable", "attention"]) : ["Inactive", "inactive"];
  return `<article class="assignment-card ${assignment.active ? "" : "inactive"}"><span class="assignment-line"></span><div class="assignment-profile"><span class="agent-avatar small">${clean(context.agentProfile.name.slice(0, 2).toUpperCase())}</span><div><span class="entity-kind">${clean(context.agentProfile.model)}</span><h3>${clean(context.agentProfile.name)}</h3></div></div><div class="assignment-scope"><span>Assigned context</span><strong>${scope.map(clean).join(" → ")}</strong><p>${clean(assignment.contextInstructions || "No additional context instructions")}</p></div><span class="readiness-pill ${readiness[1]}">${readiness[0]}</span><div class="agent-card-actions"><button class="icon-button small" data-agent-edit="agentAssignment" data-entity-id="${clean(assignment.id)}" aria-label="Edit assignment">${icon("settings")}</button><button class="icon-button small danger-button" data-agent-remove="agentAssignment" data-entity-id="${clean(assignment.id)}" aria-label="Remove assignment">${icon("trash")}</button></div></article>`;
}

function agentEmpty(title, message, type, actionLabel) {
  return `<div class="agent-empty"><span>${icon("agent")}</span><h3>${clean(title)}</h3><p>${clean(message)}</p>${type ? `<button class="secondary-button" data-agent-create="${type}">${icon("plus")} ${clean(actionLabel)}</button>` : ""}</div>`;
}

function agentTaskEmpty(availableAssignments) {
  const message = availableAssignments
    ? "Create a focused objective and start a persisted conversation."
    : "Create an available Project Assignment first. Its Harness, Profile, Project, and optional Repository must all be active and ready.";
  return `<div class="agent-empty task-empty"><span>${icon("inbox")}</span><h3>No Agent Tasks</h3><p>${clean(message)}</p>${availableAssignments ? `<button class="secondary-button" data-agent-task-create>${icon("plus")} Create Task</button>` : ""}</div>`;
}

function agentTaskCard(task) {
  const assignment = state.agents.agentAssignments.find(item => item.id === task.agentAssignmentId);
  const context = assignment?.effectiveContext || {};
  const scope = [context.project?.name, context.product?.name].filter(Boolean).join(" · ") || "Unknown Project";
  const recovery = task.latestRun?.status === "interrupted" ? `<span class="recovery-chip">Recovery review</span>` : "";
  return `<article class="agent-task-card"><div class="task-status-line ${clean(task.status)}"></div><div class="task-main"><span class="entity-kind">${clean(context.agentProfile?.name || "Agent")} · ${clean(scope)}</span><h3>${clean(task.objective)}</h3><p>${task.messageCount} message${task.messageCount === 1 ? "" : "s"} · Updated ${clean(formatDateTime(task.updatedAt))}</p></div>${recovery}<span class="task-status ${clean(task.status)}">${clean(runStatusLabel(task.status))}</span><button class="secondary-button" data-agent-task-open="${clean(task.id)}">Open conversation ${icon("arrow")}</button></article>`;
}

function agentTaskModal(options = {}) {
  const issue = options.issue || null;
  const assignments = options.assignments || state.agents.agentAssignments.filter(assignment => assignment.canStartWork);
  const objective = issue ? `Resolve Issue: ${issue.title}` : "";
  const conversationTitle = issue ? `${issue.origin?.provider ? `${issue.origin.provider.toUpperCase()} ${issue.origin.externalIssueId} · ` : ""}${issue.title}`.slice(0, 160) : "";
  return `<div class="overlay visible" data-action="close-overlay"></div><div class="modal agent-modal visible issue-agent-modal" role="dialog" aria-modal="true" aria-labelledby="agent-task-modal-title"><header><div><p class="eyebrow">${issue ? "ISSUE TO AGENT" : "NEW CONVERSATION"}</p><h2 id="agent-task-modal-title">${issue ? "Work with an agent" : "Create Agent Task"}</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close modal">${icon("close")}</button></header><form id="agent-task-form">${issue ? issueTaskContextCard(issue) : ""}<label>Agent Assignment<select name="agentAssignmentId" required data-task-assignment>${assignments.map(agentTaskAssignmentOption).join("")}</select><small>Choose a configured Agent and its fixed Project, Product, and optional Repository scope.</small></label><div class="task-assignment-context" data-task-assignment-context></div><label>Objective<textarea name="objective" required maxlength="8000" rows="5" placeholder="Describe the outcome you want the Agent to help you reach">${clean(objective)}</textarea><small>The Agent receives this objective plus the linked Issue's documented read-only context.</small></label>${issue ? `<input type="hidden" name="issueId" value="${clean(issue.id)}" />` : `<label>Related Issue (optional)<select name="issueId" data-task-issue><option value="">No related Issue</option></select><small>Only Issues from the Assignment Product are available.</small></label>`}<label>Conversation title (optional)<input name="conversationTitle" maxlength="160" value="${clean(conversationTitle)}" placeholder="A short label for this conversation" /></label><div class="modal-footer"><p>Creating the Task does not contact Codex or change the Issue.</p><div><button type="button" class="ghost-button" data-action="close-overlay">Cancel</button><button class="primary-button" type="submit">${icon("agent")} Create and open</button></div></div></form></div>`;
}

function agentTaskAssignmentOption(assignment) {
  const context = assignment.effectiveContext || {};
  const scope = [context.project?.name, context.product?.name, context.repository?.name || "No Repository"].filter(Boolean).join(" · ");
  return `<option value="${clean(assignment.id)}">${clean(context.agentProfile?.name || "Agent")} · ${clean(scope)}</option>`;
}

function issueTaskContextCard(issue) {
  return `<section class="issue-task-context"><header><span>${sourceBadge(issue.origin?.provider || "manual", true)}</span><div><small>Linked Issue · read only</small><strong>${clean(issue.title)}</strong></div></header><dl><div><dt>Project</dt><dd>${clean(issue.project?.name || "Unknown")}</dd></div><div><dt>Product</dt><dd>${clean(issue.product?.name || "Unknown")}</dd></div><div><dt>Status</dt><dd>${clean(statusLabel(issue.status) || issue.status)}</dd></div><div><dt>Origin</dt><dd>${clean(issue.origin ? `${issue.origin.displayName} #${issue.origin.externalIssueId}` : "Unavailable")}</dd></div></dl><p>${clean(issue.description || "No Issue description provided.")}</p></section>`;
}

function agentConversationModal() {
  const value = state.agentConversation;
  if (!value) return "";
  if (value.loading) return `<div class="overlay visible" data-action="close-overlay"></div><div class="modal conversation-modal visible loading" role="dialog" aria-modal="true"><div class="workspace-loading">${icon("sync")} Loading conversation...</div></div>`;
  if (value.loadError) return `<div class="overlay visible" data-action="close-overlay"></div><div class="modal conversation-modal visible loading" role="dialog" aria-modal="true"><div class="workspace-error"><h2>Conversation could not be loaded</h2><p>${clean(value.loadError)}</p><div><button class="ghost-button" data-action="close-overlay">Close</button><button class="secondary-button" data-conversation-retry>Try again</button></div></div></div>`;
  const task = value.task;
  const assignment = state.agents.agentAssignments.find(item => item.id === task.agentAssignmentId);
  const context = assignment?.effectiveContext || {};
  const taskRepository = task.repositoryId ? state.workspace.repositories.find(item => item.id === task.repositoryId) : null;
  const repositoryDetail = !context.repository ? "No repository configured" : taskRepository?.accessMode === "guarded_write" ? "Guarded work available with exact approvals" : "Read-only inspection tools enabled";
  const issue = task.issueContext || (task.issueId ? state.workspace.issues.find(item => item.id === task.issueId) : null);
  const running = ["running", "queued", "cancelling", "reconnecting"].includes(value.runStatus);
  const latestRun = value.runs.at(-1);
  const visibleError = value.error || (["failed", "cancelled", "interrupted"].includes(latestRun?.status) ? runErrorCopy(latestRun) : "");
  const errorTitle = latestRun?.status === "cancelled" ? "Run stopped" : latestRun?.status === "interrupted" ? "Run interrupted" : "Run did not complete";
  return `<div class="overlay visible" data-action="close-overlay"></div><div class="modal conversation-modal visible" role="dialog" aria-modal="true" aria-labelledby="conversation-title"><header><div><p class="eyebrow">AGENT TASK</p><h2 id="conversation-title">${clean(task.conversation?.title || task.objective)}</h2><p>${clean(task.objective)}</p></div><div class="conversation-header-actions"><span class="task-status ${clean(value.runStatus || task.status)}" data-run-status>${clean(runStatusLabel(value.runStatus || task.status))}</span><button class="icon-button" data-action="close-overlay" aria-label="Close conversation">${icon("close")}</button></div></header><div class="conversation-layout"><main class="conversation-main"><div class="conversation-transcript" data-conversation-transcript aria-live="polite">${value.messages.length ? value.messages.map(conversationMessage).join("") : `<div class="conversation-empty">${icon("agent")}<h3>Ready for your first turn</h3><p>Send a message to start Codex CLI with this Task's fixed Project context.</p></div>`}${running ? conversationMessage({ role: "assistant", content: value.streamText, streaming: true }) : ""}</div>${visibleError ? `<div class="conversation-error" role="alert"><strong>${errorTitle}</strong><span>${clean(visibleError)}</span></div>` : ""}<form id="agent-conversation-form" class="conversation-composer"><label for="agent-message">Message the Agent</label><textarea id="agent-message" name="message" required maxlength="8000" rows="3" placeholder="Add instructions or ask a follow-up…" ${running ? "disabled" : ""}></textarea><div><small><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to send · 8,000 character limit</small>${running ? `<button class="danger-outline-button" type="button" data-agent-run-cancel ${value.runStatus === "cancelling" ? "disabled" : ""}>${icon("close")} <span data-cancel-label>${value.runStatus === "cancelling" ? "Stopping…" : "Stop"}</span></button>` : `<button class="primary-button" type="submit">${icon("arrow")} ${["failed", "interrupted"].includes(latestRun?.status) ? "Retry" : "Send"}</button>`}</div></form></main><aside class="conversation-context"><span class="entity-kind">Fixed Task context</span>${contextItem("Agent", context.agentProfile?.name, context.agentProfile?.model)}${contextItem("Project", context.project?.name, "Always applied")}${contextItem("Product", context.product?.name, context.product ? "Assignment scope" : "Project-wide")}${contextItem("Repository", context.repository?.name, repositoryDetail)}${contextItem("Issue", issue?.title, issue ? `${statusLabel(issue.status) || issue.status}${issue.origin ? ` · ${issue.origin.provider} #${issue.origin.externalIssueId}` : ""}` : "No Issue linked")}<div class="context-safety-note">${icon("bolt")}<p>Linked Issue context is read-only. Shell and arbitrary commands stay blocked; review decisions never commit, push, or update an Issue.</p></div></aside></div></div>`;
}

function conversationMessage(message) {
  const role = message.role === "user" ? "You" : message.role === "assistant" ? "Agent" : "Notice";
  const streamAttributes = message.streaming ? ` data-stream-message aria-busy="true"` : "";
  const content = message.streaming && !message.content ? "Agent is working…" : message.content;
  return `<article class="conversation-message ${clean(message.role)} ${message.streaming ? "streaming" : ""}"${streamAttributes}><header><strong>${role}</strong>${message.streaming ? `<span data-stream-label>${message.content ? "Receiving response…" : "Working…"}</span>` : message.createdAt ? `<time>${clean(formatDateTime(message.createdAt))}</time>` : ""}</header><div class="conversation-message-body ${message.streaming && !message.content ? "placeholder" : ""}" ${message.streaming ? "data-stream-content" : ""}>${clean(content).replace(/\n/g, "<br>")}</div></article>`;
}

function contextItem(label, value, detail) {
  return `<div class="context-item"><span>${clean(label)}</span><strong>${clean(value || "Not configured")}</strong><small>${clean(detail || "")}</small></div>`;
}

function runStatusLabel(status) {
  return ({ draft: "Draft", queued: "Queued", running: "Running", waiting_approval: "Waiting approval", reconnecting: "Reconnecting", cancelling: "Stopping", completed: "Completed", cancelled: "Cancelled", failed: "Failed", interrupted: "Interrupted" })[status] || "Ready";
}

function runErrorCopy(run) {
  const harness = run?.harnessProvider === "opencode" ? "OpenCode CLI" : "Codex CLI";
  if (run?.status === "cancelled") return `The active ${harness} process was cancelled. Your existing conversation is unchanged and you can send another turn.`;
  if (run?.status === "interrupted") return run.recovery?.classification === "manual_review"
    ? "The server restarted during protected work. No action was replayed; inspect the retained worktree and acknowledge the recovery before continuing."
    : "The server restarted during this Run. No action was replayed; acknowledge the recovery and send a new turn when ready.";
  const reason = String(run?.errorSummary || "unknown_error").replaceAll("_", " ");
  if (run?.errorSummary === "opencode_insufficient_balance") {
    const transport = run?.model?.startsWith("opencode-go/") ? "OpenCode Go" : "OpenCode Zen";
    return `${transport} has insufficient balance for ${run.model}. Select a funded ${transport} model or switch transports, then retry.`;
  }
  return `${harness} reported ${reason}. Check the Harness status, model access, and provider balance, then retry this turn.`;
}

function formatDateTime(value) {
  if (!value) return "just now";
  try { return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); }
  catch { return String(value); }
}

function agentEntityModal(type, entity = null, parentId = null) {
  const isEdit = Boolean(entity);
  const labels = { harnessAccount: "Harness Account", agentProfile: "Agent Profile", agentAssignment: "Project Assignment" };
  return `<div class="overlay visible" data-action="close-overlay"></div><div class="modal agent-modal visible" role="dialog" aria-modal="true" aria-labelledby="agent-modal-title"><header><div><p class="eyebrow">AGENT CONFIGURATION</p><h2 id="agent-modal-title">${isEdit ? "Edit" : "Add"} ${labels[type]}</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close modal">${icon("close")}</button></header><form id="agent-entity-form" data-entity-type="${type}" data-entity-id="${clean(entity?.id || "")}">${agentEntityFields(type, entity, parentId)}<label class="active-control"><input name="active" type="checkbox" ${entity?.active === false ? "" : "checked"}/><span>Active and available for new work</span></label><div class="modal-footer"><p>Configuration only · This does not run an Agent.</p><div><button type="button" class="ghost-button" data-action="close-overlay">Cancel</button><button class="primary-button" type="submit">${icon(isEdit ? "check" : "plus")} ${isEdit ? "Save changes" : "Save configuration"}</button></div></div></form></div>`;
}

function agentEntityFields(type, entity, parentId) {
  if (type === "harnessAccount") {
    const provider = entity?.provider || "openai";
    const harness = harnessInfo(provider);
    const providerField = entity
      ? `<input value="${clean(harness.label)}" readonly /><input name="provider" type="hidden" value="${clean(provider)}" />`
      : `<select name="provider" data-harness-provider><option value="openai">OpenAI</option><option value="opencode">OpenCode</option></select>`;
    return `<div class="form-grid"><label>Provider${providerField}</label><label>Adapter<input value="${clean(harness.adapterLabel)}" readonly data-harness-adapter-label /><input name="adapter" type="hidden" value="${clean(harness.adapter)}" data-harness-adapter /></label></div><label>Display name<input name="displayName" required value="${clean(entity?.displayName || "")}" placeholder="${provider === "opencode" ? "Local OpenCode" : "Local Codex"}" /></label><div class="form-note" data-harness-auth-note>Authentication is owned by the local ${clean(harness.adapterLabel)}. Use <code>${clean(harness.loginCommand)}</code>; do not enter an API key here.</div>`;
  }
  if (type === "agentProfile") {
    const harnessId = entity?.harnessAccountId || state.agents.harnessAccounts.find(account => account.active)?.id || state.agents.harnessAccounts[0]?.id;
    const harness = state.agents.harnessAccounts.find(account => account.id === harnessId);
    const settings = entity?.modelSettings || {};
    const models = agentModelCatalog(harness?.provider);
    const modelId = entity?.model || models[0]?.id || "";
    const modelOptions = models.map(model => `<option value="${clean(model.id)}" ${model.id === modelId ? "selected" : ""}>${clean(model.label)} · ${clean(model.id)}</option>`).join("");
    const modelDescription = models.find(model => model.id === modelId)?.description || "Select a supported model.";
    const harnessOptions = state.agents.harnessAccounts.map(item => `<option value="${clean(item.id)}" ${item.id === harnessId ? "selected" : ""}>${clean(item.displayName)}${item.active ? "" : " (inactive)"}</option>`).join("");
    return `<label>Harness Account<select name="harnessAccountId" required data-agent-harness-select>${harnessOptions}</select></label><label>Name<input name="name" required value="${clean(entity?.name || "")}" placeholder="Careful maintainer" /></label><label>Description<textarea name="description" rows="2" placeholder="What this Agent is for">${clean(entity?.description || "")}</textarea></label><label>Trait description<textarea name="traitDescription" rows="2" placeholder="Working style and personality">${clean(entity?.traitDescription || "")}</textarea></label><label>Operational instructions<textarea name="instructions" rows="4" placeholder="How the Agent should approach its work">${clean(entity?.instructions || "")}</textarea></label><div class="form-grid"><label>Model<select name="model" required data-agent-model>${modelOptions}</select><small data-agent-model-description>${clean(modelDescription)}</small></label><label>Reasoning effort<select name="reasoningEffort"><option value="">Codex default</option>${optionList(["minimal", "low", "medium", "high", "xhigh", "ultra"], settings.reasoningEffort || "")}</select></label><label>Verbosity<select name="verbosity"><option value="">Codex default</option>${optionList(["low", "medium", "high"], settings.verbosity || "")}</select></label><label>Service tier<input name="serviceTier" value="${clean(settings.serviceTier || "")}" placeholder="Optional, e.g. fast" /></label></div><label>Default tool policy ID<input name="defaultToolPolicyId" value="${clean(entity?.defaultToolPolicyId || "")}" placeholder="Optional policy reference" /></label>`;
  }
  const profileId = entity?.agentProfileId || parentId || state.agents.agentProfiles.find(profile => profile.active)?.id || state.agents.agentProfiles[0]?.id;
  const projectId = entity?.projectId || state.workspace.projects.find(project => project.active)?.id || state.workspace.projects[0]?.id;
  return `${selectField("Agent Profile", "agentProfileId", state.agents.agentProfiles, profileId)}${selectField("Project", "projectId", state.workspace.projects, projectId).replace("<select", "<select data-assignment-project")}<label>Product scope<select name="productId" data-assignment-product data-selected="${clean(entity?.productId || "")}"></select><small>Optional. Limited to the selected Project.</small></label><label>Repository scope<select name="repositoryId" data-assignment-repository data-selected="${clean(entity?.repositoryId || "")}"></select><small>Optional. Only active, verified Repositories from the selected Project are available.</small></label><label>Context instructions<textarea name="contextInstructions" rows="4" placeholder="Project-specific conventions or priorities">${clean(entity?.contextInstructions || "")}</textarea></label>`;
}

function integrationsPage() {
  const entries = [
    ["github", "GitHub Projects", "Issues assigned to you across selected repositories", state.syncMeta.github ? "Connected" : "Ready", state.syncMeta.github ? `@${state.syncMeta.github.viewer} · ${state.syncMeta.github.assignedItems} issues` : "Awaiting first sync"],
    ["gitlab", "GitLab", "Issues assigned to you across every accessible project", state.syncMeta.gitlab ? "Connected" : "Ready", state.syncMeta.gitlab ? `@${state.syncMeta.gitlab.viewer} · ${state.syncMeta.gitlab.assignedItems} issues` : "Awaiting first sync"],
    ["openproject", "OpenProject", "Work packages assigned to your account", "Planned", "Not configured"],
    ["sheets", "Google Sheets", "Tasks from your structured workbook tab", "Planned", "Not configured"]
  ];
  return layout(`
    ${topbar("Integrations", "Bring every source of work together", false)}
    <section class="content-wrap integrations-page">
      <div class="integration-hero"><div class="hero-copy"><span>${icon("plug")}</span><div><h2>Your tools, one clear view.</h2><p>Maxwell normalizes tasks from every platform while preserving a direct link to the source of truth.</p></div></div><div class="sync-health"><span class="health-pulse"></span><strong>3 of 4 ready</strong><small>Prototype connections</small></div></div>
      <div class="integration-heading"><div><h2>Sources</h2><p>Connect each platform when you are ready.</p></div><button class="sync-button" data-sync="all">${icon("sync")} Sync all</button></div>
      <section class="integration-list">${entries.map(([key,name,desc,status,last]) => { const syncable = key === "github" || key === "gitlab"; return `<article class="integration-card"><div class="integration-icon">${sourceBadge(key,true)}</div><div class="integration-copy"><div><h3>${name}</h3><span class="connection-state ${status === "Planned" ? "planned" : status === "Ready" ? "ready" : ""}">${status}</span></div><p>${desc}</p><small>${status === "Connected" ? "Account" : "Status"}: <b>${last}</b></small></div><button class="secondary-button" ${syncable ? `data-sync="${key}"` : `data-integration="${key}"`}>${syncable ? "Sync now" : "Set up later"} ${icon(syncable ? "sync" : "chevron")}</button></article>`; }).join("")}</section>
      <div class="env-note"><span>${icon("settings")}</span><div><h3>Ready for secure credentials</h3><p>A <code>.env.example</code> file is included with placeholders for each source. Real secrets stay outside version control.</p></div></div>
    </section>`);
}

function integrationsPageCanonical() {
  const google = state.googleSheetsStatus;
  const googleStatus = !google ? "Checking" : google.connected ? "Connected" : google.configured ? "Authorization needed" : "Needs configuration";
  const googleDetail = !google ? "Inspecting secure OAuth settings" : google.connected ? `${google.productSources} Product Source${google.productSources === 1 ? "" : "s"} · ${google.tokenSource === "environment" ? "environment token" : "private local token store"}` : google.missing?.length ? `Missing: ${google.missing.join(", ")}` : "Client configured · authorize once to obtain offline access";
  const entries = [
    ["gitlab", "GitLab", "Canonical issue source · all local changes return here", state.syncMeta.gitlab ? "Source of truth" : "Ready", state.syncMeta.gitlab ? `@${state.syncMeta.gitlab.viewer} · ${state.syncMeta.gitlab.assignedItems} canonical issues` : "Awaiting first pull"],
    ["github", "GitHub Projects", "Outbound target for selected canonical GitLab issues", state.syncMeta.github ? "Target ready" : "Planned", state.syncMeta.github ? "Credentials configured · mapping required" : "Awaiting credentials"],
    ["openproject", "OpenProject", "Outbound target for GitLab work packages", "Planned", "Connector not implemented"],
    ["sheets", "Google Sheets", "Secure read/write through OAuth 2.0 and Product Sources", googleStatus, googleDetail]
  ];
  return layout(`
    ${topbar("Integrations", "GitLab is the canonical source", false)}
    <section class="content-wrap integrations-page">
      <div class="integration-hero"><div class="hero-copy"><span>${icon("plug")}</span><div><h2>One source, many destinations.</h2><p>GitLab owns the canonical issue. Maxwell keeps a private local cache and coordinates outbound copies without allowing target systems to overwrite GitLab.</p></div></div><div class="sync-health"><span class="health-pulse"></span><strong>GitLab primary</strong><small>One-way authority</small></div></div>
      <div class="integration-heading"><div><h2>Sync pipeline</h2><p>Pull from the primary source before preparing outbound targets.</p></div><div class="sync-actions"><button class="sync-button" data-sync="gitlab">${icon("sync")} Pull GitLab</button><button class="primary-button compact-button" data-action="outbound-sync">${icon("arrow")} Outbound sync</button></div></div>
      <section class="integration-list">${entries.map(([key,name,desc,status,last]) => { const isPrimary = key === "gitlab"; const isGoogle = key === "sheets"; const googleAction = google?.connected ? `data-nav="workspace"` : google?.configured ? `data-google-connect` : `data-toast="Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env, then restart Maxwell."`; return `<article class="integration-card"><div class="integration-icon">${sourceBadge(key,true)}</div><div class="integration-copy"><div><h3>${name}</h3><span class="connection-state ${status === "Planned" || status === "Needs configuration" ? "planned" : status === "Ready" || status === "Authorization needed" ? "ready" : status === "Source of truth" ? "truth" : ""}">${status}</span></div><p>${desc}</p><small>Status: <b>${clean(last)}</b>${isGoogle && google?.redirectUri ? `<br>Redirect URI: <code>${clean(google.redirectUri)}</code>` : ""}</small></div><button class="secondary-button" ${isPrimary ? 'data-sync="gitlab"' : isGoogle ? googleAction : 'data-action="outbound-sync"'}>${isPrimary ? "Pull locally" : isGoogle ? google?.connected ? "Manage sheets" : "Connect Google" : "Target status"} ${icon(isPrimary ? "sync" : "chevron")}</button></article>`; }).join("")}</section>
      <div class="env-note"><span>${icon("settings")}</span><div><h3>Secrets stay server-side</h3><p>Google's client secret is read only from <code>.env</code>. After consent, the refresh token is kept in the Git-ignored <code>data/google-oauth.json</code>; browsers receive connection status, never credentials.</p></div></div>
    </section>`);
}

function issueDrawer(issue) {
  const info = sourceInfo[issue.source];
  const agentTasks = issue.agentTasks || [];
  const compatibleAssignments = state.agents?.agentAssignments?.filter(assignment => assignment.canStartWork && assignment.productId === issue.productId) || [];
  return `<div class="overlay visible" data-action="close-overlay"></div><aside class="drawer visible" role="dialog" aria-modal="true" aria-label="Issue details">
    <header><div>${sourceBadge(issue.source)}<span class="issue-key">${issue.id}</span></div><button class="icon-button" data-action="close-overlay" aria-label="Close details">${icon("close")}</button></header>
    <div class="drawer-body"><div class="drawer-title"><span class="priority-dot ${issue.priority}"></span><h2>${issue.title}</h2></div><p class="description">${issue.description}</p>
      <div class="drawer-actions"><button class="primary-button" data-issue-work-agent="${clean(issue.maxwellIssueId || "")}" ${compatibleAssignments.length && issue.maxwellIssueId ? "" : "disabled"}>${icon("agent")} Work with agent</button><button class="secondary-button ${issue.status === "done" ? "completed" : ""}" data-complete="${issue.id}">${icon("check")} ${issue.status === "done" ? "Completed" : "Mark as done"}</button>${issue.sourceUrl ? `<a class="secondary-button" href="${issue.sourceUrl}" target="_blank" rel="noreferrer">Open in ${info.label} ${icon("external")}</a>` : `<button class="secondary-button" data-toast="Source links will activate with real integrations">Open in ${info.label} ${icon("external")}</button>`}</div>
      <section class="detail-section"><h3>Details</h3><dl><div><dt>Status</dt><dd><span class="status-pill ${issue.status}">${statusLabel(issue.status)}</span></dd></div><div><dt>Priority</dt><dd class="capitalize">${issue.priority}</dd></div><div><dt>Project</dt><dd>${issue.project}</dd></div><div><dt>Due date</dt><dd class="${daysFromNow(issue.due) < 0 && issue.status !== "done" ? "danger-text" : ""}">${issue.due ? new Date(`${issue.due}T12:00:00`).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }) : "No due date"}</dd></div><div><dt>Assigned to</dt><dd><span class="mini-avatar">NM</span>Max S.Ramos</dd></div></dl></section>
      <section class="detail-section"><h3>Labels</h3><div class="labels">${issue.labels.map(label => `<span>${label}</span>`).join("")}</div></section>
      <section class="detail-section issue-agent-work"><div class="issue-agent-heading"><div><h3>Agent work</h3><p>Tasks remain linked to this Issue without changing its external identity.</p></div><b>${agentTasks.length}</b></div>${agentTasks.length ? `<div class="issue-agent-task-list">${agentTasks.map(issueAgentTaskCard).join("")}</div>` : `<div class="issue-agent-empty"><strong>No Agent Tasks yet</strong><p>${compatibleAssignments.length ? "Choose Work with agent to create the first linked Task." : "Configure an available Assignment for this Product to start Agent work."}</p></div>`}</section>
      <section class="source-trail"><span>${icon("sync")}</span><div><strong>${issue.source === "gitlab" ? "Canonical GitLab issue" : `Outbound copy in ${info.label}`}</strong><p>Last updated ${issue.updated}. ${issue.source === "gitlab" ? "GitLab is authoritative for this issue." : "Edit the linked GitLab issue to change canonical state."}</p></div></section>
    </div>
  </aside>`;
}

function issueAgentTaskCard(task) {
  const runCopy = task.runCount ? `${task.completedRunCount} of ${task.runCount} Runs completed` : "No Runs yet";
  return `<button class="issue-agent-task" type="button" data-issue-agent-task-open="${clean(task.id)}"><span class="task-status ${clean(task.status)}">${clean(runStatusLabel(task.status))}</span><strong>${clean(task.conversationTitle || task.objective)}</strong><small>${clean(runCopy)} · Updated ${clean(formatDateTime(task.updatedAt))}</small>${icon("chevron")}</button>`;
}

function addIssueModal() {
  return `<div class="overlay visible" data-action="close-overlay"></div><div class="modal visible" role="dialog" aria-modal="true" aria-labelledby="new-issue-title"><header><div><p class="eyebrow">QUICK CAPTURE</p><h2 id="new-issue-title">Create a new issue</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close modal">${icon("close")}</button></header>
    <form id="new-issue-form"><label>Issue title<input name="title" required placeholder="What needs to be done?" autofocus /></label><label>Description<textarea name="description" rows="3" placeholder="Add helpful context..."></textarea></label><div class="form-grid"><label>Canonical source<input value="GitLab · default project" readonly /></label><label>Due date<input name="due" type="date" required value="2026-07-20" /></label><label>Priority<select name="priority"><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></label><label>Status<select name="status"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="review">In review</option></select></label></div><div class="modal-footer"><p>Created in GitLab, then cached locally</p><div><button type="button" class="ghost-button" data-action="close-overlay">Cancel</button><button class="primary-button" type="submit">${icon("plus")} Create in GitLab</button></div></div></form></div>`;
}

function outboundStatusModal(payload) {
  const statusCopy = {
    needs_credentials: ["Needs credentials", "Add the target token before mapping issues."],
    ready_for_mapping: ["Ready for mapping", "Credentials work; identity mapping is the next connector step."],
    connector_pending: ["Connector planned", "This outbound adapter has not been implemented yet."]
  };
  return `<div class="overlay visible" data-action="close-overlay"></div><div class="modal outbound-modal visible" role="dialog" aria-modal="true" aria-labelledby="outbound-title"><header><div><p class="eyebrow">OUTBOUND PIPELINE</p><h2 id="outbound-title">Sync to other sources</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close modal">${icon("close")}</button></header><div class="outbound-body"><div class="canonical-summary"><span>${icon("inbox")}</span><div><strong>${payload.canonicalIssues} canonical issues ready</strong><p>GitLab remains authoritative. No target can overwrite this local set.</p></div></div><div class="target-list">${payload.targets.map(target => { const copy = statusCopy[target.status] || [target.status, ""]; return `<article><span class="source-mark" style="--source:${sourceInfo[target.provider].color}">${sourceInfo[target.provider].mark}</span><div><strong>${target.label}</strong><p>${copy[1]}</p></div><span class="target-state ${target.status}">${copy[0]}</span></article>`; }).join("")}</div><div class="outbound-note">No issues were published in this check. Each target will activate only after its connector and identity mapping are ready.</div></div></div>`;
}

function render() {
  const app = document.getElementById("app");
  app.innerHTML = state.page === "dashboard" ? dashboardPage() : state.page === "issues" ? issuesPage() : state.page === "workspace" ? workspacePage() : state.page === "agents" ? agentsPage() : integrationsPageCanonical();
  bindEvents();
  const overlayRoot = document.getElementById("overlay-root");
  if (state.agentConversation) {
    if (!overlayRoot?.querySelector?.(".conversation-modal")) renderAgentConversation();
  } else if (overlayRoot) overlayRoot.innerHTML = "";
}

function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach(button => button.addEventListener("click", () => { state.page = button.dataset.nav; state.mobileNavOpen = false; render(); window.scrollTo(0,0); }));
  document.querySelectorAll(".mobile-menu").forEach(button => button.addEventListener("click", () => { state.mobileNavOpen = true; render(); }));
  document.querySelectorAll("[data-close-mobile-nav]").forEach(button => button.addEventListener("click", () => { state.mobileNavOpen = false; render(); }));
  document.querySelectorAll("[data-open]").forEach(row => {
    row.addEventListener("click", event => { if (!event.target.closest("[data-complete]")) openIssue(row.dataset.open); });
    row.addEventListener("keydown", event => { if (event.key === "Enter") openIssue(row.dataset.open); });
  });
  document.querySelectorAll("[data-complete]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); toggleComplete(button.dataset.complete); }));
  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => { state.view = button.dataset.view; render(); }));
  document.querySelectorAll("[data-action='add']").forEach(button => button.addEventListener("click", openAddModal));
  document.querySelectorAll("[data-workspace-create]").forEach(button => button.addEventListener("click", () => openWorkspaceModal(button.dataset.workspaceCreate, null, button.dataset.parentId)));
  document.querySelectorAll("[data-workspace-edit]").forEach(button => button.addEventListener("click", () => openWorkspaceModal(button.dataset.workspaceEdit, button.dataset.entityId)));
  document.querySelectorAll("[data-workspace-remove-source]").forEach(button => button.addEventListener("click", () => removeWorkspaceProductSource(button.dataset.workspaceRemoveSource)));
  document.querySelectorAll("[data-repository-action]").forEach(button => button.addEventListener("click", () => runRepositoryAction(button.dataset.repositoryId, button.dataset.repositoryAction)));
  document.querySelectorAll("[data-google-sheet-test]").forEach(button => button.addEventListener("click", () => testGoogleSheetSource(button.dataset.googleSheetTest, button)));
  document.querySelectorAll("[data-google-connect]").forEach(button => button.addEventListener("click", () => { window.location.href = "/api/google/oauth/start"; }));
  document.querySelectorAll("[data-workspace-refresh]").forEach(button => button.addEventListener("click", hydrateWorkspace));
  document.querySelectorAll("[data-agents-refresh]").forEach(button => button.addEventListener("click", () => hydrateAgents({ showLoading: true })));
  document.querySelectorAll("[data-operations-reconcile]").forEach(button => button.addEventListener("click", reconcileOperations));
  document.querySelectorAll("[data-agent-create]").forEach(button => button.addEventListener("click", () => openAgentModal(button.dataset.agentCreate, null, button.dataset.parentId)));
  document.querySelectorAll("[data-agent-edit]").forEach(button => button.addEventListener("click", () => openAgentModal(button.dataset.agentEdit, button.dataset.entityId)));
  document.querySelectorAll("[data-agent-remove]").forEach(button => button.addEventListener("click", () => removeAgentEntity(button.dataset.agentRemove, button.dataset.entityId)));
  document.querySelectorAll("[data-agent-task-create]").forEach(button => button.addEventListener("click", () => openAgentTaskModal()));
  document.querySelectorAll("[data-agent-task-open]").forEach(button => button.addEventListener("click", () => openAgentConversation(button.dataset.agentTaskOpen)));
  document.querySelectorAll("[data-action='outbound-sync']").forEach(button => button.addEventListener("click", () => prepareOutboundSync(button)));
  document.querySelectorAll("[data-sync]").forEach(button => button.addEventListener("click", () => syncIssues(button.dataset.sync, button)));
  document.querySelectorAll("[data-action='clear-filters']").forEach(button => button.addEventListener("click", () => { state.query = ""; state.source = "all"; state.status = "active"; render(); }));
  document.querySelectorAll("[data-toast]").forEach(button => button.addEventListener("click", () => toast(button.dataset.toast)));
  document.querySelectorAll("[data-integration]").forEach(button => button.addEventListener("click", () => toast(`${sourceInfo[button.dataset.integration].label} configuration will be enabled during integration.`)));
  document.querySelectorAll("[data-stat]").forEach(button => button.addEventListener("click", () => { state.page = "issues"; const stat = button.dataset.stat; state.status = stat === "in_progress" ? "in_progress" : "active"; state.query = ""; render(); }));
  const search = document.getElementById("search-input");
  if (search) search.addEventListener("input", () => { state.query = search.value; const cursor = search.selectionStart; render(); const next = document.getElementById("search-input"); next.focus(); next.setSelectionRange(cursor,cursor); });
  const sourceFilter = document.getElementById("source-filter");
  if (sourceFilter) sourceFilter.addEventListener("change", () => { state.source = sourceFilter.value; render(); });
  const statusFilter = document.getElementById("status-filter");
  if (statusFilter) statusFilter.addEventListener("change", () => { state.status = statusFilter.value; render(); });
}

function globalKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); state.page = "issues"; render(); document.getElementById("search-input")?.focus(); }
  if (event.key === "Escape") closeOverlay();
}
function openIssue(id) { const issue = state.issues.find(item => item.id === id); if (issue) { document.getElementById("overlay-root").innerHTML = issueDrawer(issue); bindOverlayEvents(); } }
function openLinkedIssue(issueId) {
  const issue = state.issues.find(item => item.maxwellIssueId === issueId);
  if (!issue) return toast("The linked Issue is not available in the current local Issue view.", "error");
  closeOverlay();
  state.page = "issues";
  render();
  openIssue(issue.id);
}
function openAddModal() { document.getElementById("overlay-root").innerHTML = addIssueModal(); bindOverlayEvents(); setTimeout(() => document.querySelector("[name='title']")?.focus(), 50); }
function closeOverlay() {
  state.agentConversation?.eventSource?.close();
  clearTimeout(state.agentConversation?.review?.pollTimer);
  state.agentConversation = null;
  document.getElementById("overlay-root").innerHTML = "";
}
function bindOverlayEvents() {
  document.querySelectorAll("[data-action='close-overlay']").forEach(button => button.addEventListener("click", closeOverlay));
  document.querySelector(".conversation-header-actions [data-repository-explorer-toggle]")?.addEventListener("click", toggleRepositoryExplorer);
  document.querySelector(".conversation-header-actions [data-run-review-toggle]")?.addEventListener("click", toggleRunReview);
  bindRepositoryExplorerEvents(document.querySelector("[data-repository-explorer]"));
  bindRunReviewEvents(document.querySelector("[data-run-review]"));
  document.querySelectorAll("[data-issue-work-agent]").forEach(button => button.addEventListener("click", () => openAgentTaskModal(button.dataset.issueWorkAgent)));
  document.querySelectorAll("[data-issue-agent-task-open]").forEach(button => button.addEventListener("click", () => openAgentConversation(button.dataset.issueAgentTaskOpen)));
  document.querySelectorAll("[data-agent-task-issue-open]").forEach(button => button.addEventListener("click", () => openLinkedIssue(button.dataset.agentTaskIssueOpen)));
  document.querySelectorAll("#overlay-root [data-complete]").forEach(button => button.addEventListener("click", async () => { await toggleComplete(button.dataset.complete); openIssue(button.dataset.complete); }));
  document.querySelectorAll("#overlay-root [data-toast]").forEach(button => button.addEventListener("click", () => toast(button.dataset.toast)));
  const workspaceForm = document.getElementById("workspace-entity-form");
  if (workspaceForm) {
    workspaceForm.addEventListener("submit", saveWorkspaceEntity);
    const providerSelect = workspaceForm.querySelector("[data-provider-select]");
    providerSelect?.addEventListener("change", () => toggleConnectorProviderFields(workspaceForm, providerSelect.value));
    const sourceAccountSelect = workspaceForm.querySelector("[data-source-account-select]");
    sourceAccountSelect?.addEventListener("change", () => toggleProductSourceFields(workspaceForm, sourceAccountSelect.selectedOptions[0]?.dataset.provider));
  }
  const agentForm = document.getElementById("agent-entity-form");
  if (agentForm) {
    agentForm.addEventListener("submit", saveAgentEntity);
    const modelSelect = agentForm.querySelector("[data-agent-model]");
    modelSelect?.addEventListener("change", () => updateAgentModelDescription(agentForm, modelSelect.value));
    const harnessProviderSelect = agentForm.querySelector("[data-harness-provider]");
    harnessProviderSelect?.addEventListener("change", () => updateHarnessAccountFields(agentForm, harnessProviderSelect.value));
    const harnessSelect = agentForm.querySelector("[data-agent-harness-select]");
    harnessSelect?.addEventListener("change", () => updateAgentProfileModels(agentForm, harnessSelect.value));
    const projectSelect = agentForm.querySelector("[data-assignment-project]");
    if (projectSelect) {
      populateAssignmentScope(agentForm, projectSelect.value);
      projectSelect.addEventListener("change", () => populateAssignmentScope(agentForm, projectSelect.value, true));
    }
  }
  const taskForm = document.getElementById("agent-task-form");
  if (taskForm) {
    taskForm.addEventListener("submit", saveAgentTask);
    const assignmentSelect = taskForm.querySelector("[data-task-assignment]");
    if (assignmentSelect) {
      populateTaskIssues(taskForm, assignmentSelect.value);
      updateTaskAssignmentContext(taskForm, assignmentSelect.value);
      assignmentSelect.addEventListener("change", () => {
        populateTaskIssues(taskForm, assignmentSelect.value);
        updateTaskAssignmentContext(taskForm, assignmentSelect.value);
      });
    }
  }
  const conversationForm = document.getElementById("agent-conversation-form");
  if (conversationForm) {
    conversationForm.addEventListener("submit", sendAgentTurn);
    conversationForm.querySelector("textarea")?.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); conversationForm.requestSubmit(); }
    });
  }
  document.querySelector("[data-agent-run-cancel]")?.addEventListener("click", cancelAgentRun);
  document.querySelector("[data-conversation-retry]")?.addEventListener("click", () => openAgentConversation(state.agentConversation?.taskId));
  const form = document.getElementById("new-issue-form");
  if (form) form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(form);
    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    try {
      const projectIds = state.syncMeta.gitlab?.projectIds || [];
      const response = await fetch("/api/gitlab/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.get("title"), description: data.get("description"), due: data.get("due"), priority: data.get("priority"), status: data.get("status"), projectId: projectIds.length === 1 ? projectIds[0] : undefined })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create the GitLab issue.");
      state.issues = [payload.issue, ...state.issues.filter(issue => issue.sourceKey !== payload.issue.sourceKey)];
      saveIssues();
      closeOverlay();
      render();
      toast("Issue created in GitLab and cached locally", "success");
    } catch (error) {
      submitButton.disabled = false;
      toast(error.message, "error");
    }
  });
}

function updateAgentModelDescription(form, modelId) {
  const target = form.querySelector("[data-agent-model-description]");
  const model = [...agentModelCatalog("openai"), ...agentModelCatalog("opencode")].find(item => item.id === modelId);
  if (target) target.textContent = model?.description || "Existing model; choose a supported option to change it.";
}

function agentModelCatalog(provider) {
  return provider === "opencode" ? (state.agents?.opencodeModels || []) : (state.agents?.models || []);
}

function updateHarnessAccountFields(form, provider) {
  const harness = harnessInfo(provider);
  const adapter = form.querySelector("[data-harness-adapter]");
  const adapterLabel = form.querySelector("[data-harness-adapter-label]");
  const note = form.querySelector("[data-harness-auth-note]");
  if (adapter) adapter.value = harness.adapter;
  if (adapterLabel) adapterLabel.value = harness.adapterLabel;
  if (note) note.innerHTML = `Authentication is owned by the local ${clean(harness.adapterLabel)}. Use <code>${clean(harness.loginCommand)}</code>; do not enter an API key here.`;
}

function updateAgentProfileModels(form, harnessId) {
  const harness = state.agents?.harnessAccounts?.find(account => account.id === harnessId);
  const models = agentModelCatalog(harness?.provider);
  const select = form.querySelector("[data-agent-model]");
  if (!select) return;
  select.innerHTML = models.map(model => `<option value="${clean(model.id)}">${clean(model.label)} · ${clean(model.id)}</option>`).join("");
  updateAgentModelDescription(form, select.value);
}

function openWorkspaceModal(type, entityId = null, parentId = null) {
  const collectionByType = { organization: "organizations", project: "projects", product: "products", repository: "repositories", connectorAccount: "connectorAccounts", productSource: "productSources" };
  const entity = entityId ? state.workspace?.[collectionByType[type]]?.find(item => item.id === entityId) : null;
  if (entityId && !entity) return toast("The workspace record could not be found.", "error");
  if (type === "project" && !state.workspace.organizations.length) return toast("Create an Organization first.", "error");
  if (type === "product" && !state.workspace.projects.length) return toast("Create a Project first.", "error");
  if (type === "repository" && !state.workspace.projects.length) return toast("Create a Project first.", "error");
  if (type === "productSource" && !state.workspace.connectorAccounts.length) return toast("Add a Connector Account before adding a Product Source.", "error");
  document.getElementById("overlay-root").innerHTML = workspaceEntityModal(type, entity, parentId);
  bindOverlayEvents();
  setTimeout(() => document.querySelector("#workspace-entity-form input:not([readonly])")?.focus(), 50);
}

function openAgentModal(type, entityId = null, parentId = null) {
  const collections = { harnessAccount: "harnessAccounts", agentProfile: "agentProfiles", agentAssignment: "agentAssignments" };
  const entity = entityId ? state.agents?.[collections[type]]?.find(item => item.id === entityId) : null;
  if (entityId && !entity) return toast("The Agent configuration could not be found.", "error");
  if (type === "agentProfile" && !state.agents?.harnessAccounts.length) return toast("Configure a Harness first.", "error");
  if (type === "agentAssignment" && !state.agents?.agentProfiles.length) return toast("Create an Agent Profile first.", "error");
  if (type === "agentAssignment" && !state.workspace?.projects.length) return toast("Create a Project first.", "error");
  document.getElementById("overlay-root").innerHTML = agentEntityModal(type, entity, parentId);
  bindOverlayEvents();
  setTimeout(() => document.querySelector("#agent-entity-form input:not([readonly]), #agent-entity-form textarea")?.focus(), 50);
}

async function openAgentTaskModal(issueId = null) {
  if (issueId) {
    try {
      const response = await fetch(`/api/issues/${encodeURIComponent(issueId)}/agent-work`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Issue Agent context could not be loaded.");
      const assignments = (result.compatibleAssignments || []).filter(assignment => assignment.canStartWork);
      if (!assignments.length) return toast("No available Agent Assignment matches this Issue Product.", "error");
      document.getElementById("overlay-root").innerHTML = agentTaskModal({ issue: result.issue, assignments });
    } catch (error) {
      return toast(error.message, "error");
    }
  } else {
    const assignments = state.agents?.agentAssignments.filter(assignment => assignment.canStartWork) || [];
    if (!assignments.length) return toast("Create an available Agent Assignment before starting a Task.", "error");
    document.getElementById("overlay-root").innerHTML = agentTaskModal({ assignments });
  }
  bindOverlayEvents();
  setTimeout(() => document.querySelector("#agent-task-form textarea")?.focus(), 50);
}

function populateTaskIssues(form, assignmentId) {
  const select = form.querySelector("[data-task-issue]");
  const assignment = state.agents.agentAssignments.find(item => item.id === assignmentId);
  if (!select || !assignment) return;
  const issues = assignment.productId ? state.workspace.issues.filter(issue => issue.productId === assignment.productId) : [];
  select.innerHTML = `<option value="">No related Issue</option>${issues.map(issue => `<option value="${clean(issue.id)}">${clean(issue.title)}</option>`).join("")}`;
  select.disabled = !assignment.productId || !issues.length;
}

function updateTaskAssignmentContext(form, assignmentId) {
  const target = form.querySelector("[data-task-assignment-context]");
  const assignment = state.agents.agentAssignments.find(item => item.id === assignmentId);
  if (!target) return;
  const context = assignment?.effectiveContext || {};
  target.innerHTML = `<span><small>Agent</small><strong>${clean(context.agentProfile?.name || "Unknown")}</strong></span><span><small>Project / Product</small><strong>${clean([context.project?.name, context.product?.name].filter(Boolean).join(" / ") || "Unknown")}</strong></span><span><small>Repository</small><strong>${clean(context.repository?.name || "No Repository")}</strong></span>`;
}

async function saveAgentTask(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  if (!payload.issueId) delete payload.issueId;
  if (!payload.conversationTitle) delete payload.conversationTitle;
  const submit = form.querySelector("button[type='submit']");
  submit.disabled = true;
  try {
    const response = await fetch("/api/agent-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The Agent Task could not be created.");
    closeOverlay();
    await Promise.all([hydrateAgents(), hydrateLocalIssues()]);
    await openAgentConversation(result.agentTask.id);
    toast("Agent Task created", "success");
  } catch (error) {
    submit.disabled = false;
    toast(error.message, "error");
  }
}

async function openAgentConversation(taskId) {
  if (!taskId) return;
  state.agentConversation?.eventSource?.close();
  state.agentConversation = { taskId, loading: true, messages: [], runs: [], streamText: "", runStatus: null, error: null, eventSource: null, repositoryExplorer: null, review: { open: false, loading: false, error: null, runId: null, data: null, selectedArtifactId: null, artifactContent: null, artifactLoading: false, actionPending: false, pollTimer: null } };
  renderAgentConversation();
  try {
    await refreshAgentConversation(taskId, { preserveStream: false });
    initializeRepositoryExplorer();
    const activeRun = [...state.agentConversation.runs].reverse().find(run => ["queued", "running"].includes(run.status));
    if (activeRun) {
      state.agentConversation.runStatus = activeRun.status;
      connectAgentRunEvents(activeRun.id);
    }
    renderAgentConversation();
    if (state.agentConversation.task?.repositoryId) loadRepositoryDirectory(".");
    setTimeout(() => document.getElementById("agent-message")?.focus(), 50);
  } catch (error) {
    if (!state.agentConversation || state.agentConversation.taskId !== taskId) return;
    state.agentConversation.loading = false;
    state.agentConversation.loadError = error.message;
    renderAgentConversation();
  }
}

async function refreshAgentConversation(taskId, options = {}) {
  const responses = await Promise.all([
    fetch(`/api/agent-tasks/${encodeURIComponent(taskId)}`),
    fetch(`/api/agent-tasks/${encodeURIComponent(taskId)}/messages?limit=100`),
    fetch(`/api/agent-tasks/${encodeURIComponent(taskId)}/runs`)
  ]);
  const payloads = await Promise.all(responses.map(response => response.json()));
  const failed = responses.findIndex(response => !response.ok);
  if (failed >= 0) throw new Error(payloads[failed].error || "Conversation data could not be loaded.");
  if (!state.agentConversation || state.agentConversation.taskId !== taskId) return;
  Object.assign(state.agentConversation, {
    task: payloads[0].agentTask,
    messages: payloads[1].messages || [],
    runs: payloads[2].agentRuns || [],
    loading: false,
    loadError: null,
    streamText: options.preserveStream ? state.agentConversation.streamText : ""
  });
  const latest = state.agentConversation.runs.at(-1);
  if (latest && !["queued", "running"].includes(latest.status)) state.agentConversation.runStatus = latest.status;
}

function renderAgentConversation() {
  const root = document.getElementById("overlay-root");
  if (!root || !state.agentConversation) return;
  root.innerHTML = agentConversationModal();
  mountIssueNavigation(root);
  mountRepositoryExplorer(root);
  mountRunReview(root);
  bindOverlayEvents();
  const transcript = root.querySelector?.("[data-conversation-transcript]");
  scrollConversationToBottom(transcript);
}

function mountIssueNavigation(root) {
  const task = state.agentConversation?.task;
  const actions = root.querySelector?.(".conversation-header-actions");
  if (!task?.issueId || !actions) return;
  actions.insertAdjacentHTML("afterbegin", `<button class="secondary-button linked-issue-button" type="button" data-agent-task-issue-open="${clean(task.issueId)}">${icon("inbox")} Issue</button>`);
}

function scrollConversationToBottom(transcript) {
  if (transcript) transcript.scrollTop = transcript.scrollHeight;
}

function initializeRepositoryExplorer() {
  const value = state.agentConversation;
  if (!value?.task?.repositoryId) {
    if (value) value.repositoryExplorer = null;
    return;
  }
  value.repositoryExplorer = {
    open: false,
    expandedPaths: new Set(["."]),
    childrenByPath: {},
    loadingPaths: new Set(),
    errorsByPath: {},
    selectedPath: null,
    preview: null,
    previewLoading: false,
    previewError: null
  };
}

function mountRepositoryExplorer(root) {
  const value = state.agentConversation;
  const explorer = value?.repositoryExplorer;
  const modal = root.querySelector?.(".conversation-modal");
  const layout = modal?.querySelector?.(".conversation-layout");
  if (!explorer || !value.task?.repositoryId || !layout) return;
  modal.classList.toggle("repository-open", explorer.open);
  layout.classList.add("has-repository");
  layout.insertAdjacentHTML("afterbegin", repositoryExplorerPanel(explorer));
  const actions = modal.querySelector(".conversation-header-actions");
  actions?.insertAdjacentHTML("afterbegin", `<button class="secondary-button repository-toggle" type="button" data-repository-explorer-toggle aria-label="Toggle Repository files">${icon("folder")} Files</button>`);
}

function repositoryExplorerPanel(explorer) {
  const task = state.agentConversation?.task;
  const assignment = state.agents?.agentAssignments.find(item => item.id === task?.agentAssignmentId);
  const repository = assignment?.effectiveContext?.repository;
  return `<aside class="conversation-repository" data-repository-explorer aria-label="Repository explorer"><header><div><span class="entity-kind">Repository</span><strong>${clean(repository?.name || "Assigned Repository")}</strong></div><div><span class="read-only-badge">Read only</span><button class="icon-button repository-close" type="button" data-repository-explorer-toggle aria-label="Close Repository files">${icon("close")}</button></div></header><div class="repository-tree" role="tree">${repositoryTreeRows(".", 0, explorer)}</div>${repositoryPreview(explorer)}</aside>`;
}

function repositoryTreeRows(path, depth, explorer) {
  const loading = explorer.loadingPaths.has(path);
  const error = explorer.errorsByPath[path];
  const children = explorer.childrenByPath[path];
  if (loading && !children) return `<div class="repository-tree-state">${icon("sync")} Loading files…</div>`;
  if (error && !children) return `<div class="repository-tree-state error"><span>${clean(error)}</span><button type="button" data-repository-directory-retry="${clean(path)}">Try again</button></div>`;
  if (!children) return `<div class="repository-tree-state">Open this Repository to load files.</div>`;
  if (!children.length) return `<div class="repository-tree-state">This folder is empty.</div>`;
  return children.map(entry => {
    const padding = 12 + depth * 14;
    if (entry.type === "directory") {
      const expanded = explorer.expandedPaths.has(entry.path);
      const nested = expanded ? repositoryTreeRows(entry.path, depth + 1, explorer) : "";
      return `<div class="repository-tree-branch"><button class="repository-tree-row directory" type="button" role="treeitem" aria-expanded="${expanded}" data-repository-directory="${clean(entry.path)}" style="--tree-padding:${padding}px"><span class="tree-chevron">${icon("chevron")}</span>${icon("folder")}<span>${clean(entry.name)}</span></button>${expanded ? `<div role="group">${nested}</div>` : ""}</div>`;
    }
    return `<button class="repository-tree-row file ${explorer.selectedPath === entry.path ? "selected" : ""}" type="button" role="treeitem" data-repository-file="${clean(entry.path)}" style="--tree-padding:${padding}px">${icon("file")}<span>${clean(entry.name)}</span><small>${clean(formatFileSize(entry.size))}</small></button>`;
  }).join("");
}

function repositoryPreview(explorer) {
  if (!explorer.selectedPath) return `<div class="repository-preview empty"><span>${icon("file")}</span><p>Select a safe text file to preview it.</p></div>`;
  if (explorer.previewLoading) return `<div class="repository-preview empty"><span>${icon("sync")}</span><p>Loading ${clean(explorer.selectedPath)}…</p></div>`;
  if (explorer.previewError) return `<div class="repository-preview empty error"><span>${icon("bolt")}</span><p>${clean(explorer.previewError)}</p><button type="button" data-repository-file-retry="${clean(explorer.selectedPath)}">Try again</button></div>`;
  const file = explorer.preview;
  if (!file) return "";
  const lines = file.text.split("\n");
  return `<section class="repository-preview"><header><div><strong title="${clean(file.path)}">${clean(file.path)}</strong><small>Lines ${file.startLine}–${file.endLine} of ${file.totalLines}</small></div><button class="icon-button" type="button" data-repository-preview-close aria-label="Close file preview">${icon("close")}</button></header><div class="repository-code" tabindex="0">${lines.map((line, index) => `<div><span>${file.startLine + index}</span><code>${clean(line) || " "}</code></div>`).join("")}</div>${file.truncated ? `<footer>Preview limited to 200 lines.</footer>` : ""}</section>`;
}

function renderRepositoryExplorer() {
  const root = document.getElementById("overlay-root");
  const current = root?.querySelector?.("[data-repository-explorer]");
  const explorer = state.agentConversation?.repositoryExplorer;
  if (!current || !explorer) return;
  current.outerHTML = repositoryExplorerPanel(explorer);
  const replacement = root.querySelector("[data-repository-explorer]");
  bindRepositoryExplorerEvents(replacement);
  root.querySelector(".conversation-modal")?.classList.toggle("repository-open", explorer.open);
}

function bindRepositoryExplorerEvents(root) {
  if (!root) return;
  root.querySelectorAll("[data-repository-explorer-toggle]").forEach(button => button.addEventListener("click", toggleRepositoryExplorer));
  root.querySelectorAll("[data-repository-directory]").forEach(button => button.addEventListener("click", () => toggleRepositoryDirectory(button.dataset.repositoryDirectory)));
  root.querySelectorAll("[data-repository-file]").forEach(button => button.addEventListener("click", () => openRepositoryFile(button.dataset.repositoryFile)));
  root.querySelectorAll("[data-repository-directory-retry]").forEach(button => button.addEventListener("click", () => loadRepositoryDirectory(button.dataset.repositoryDirectoryRetry)));
  root.querySelectorAll("[data-repository-file-retry]").forEach(button => button.addEventListener("click", () => openRepositoryFile(button.dataset.repositoryFileRetry)));
  root.querySelector("[data-repository-preview-close]")?.addEventListener("click", closeRepositoryPreview);
}

function toggleRepositoryExplorer() {
  const explorer = state.agentConversation?.repositoryExplorer;
  if (!explorer) return;
  explorer.open = !explorer.open;
  document.querySelector(".conversation-modal")?.classList.toggle("repository-open", explorer.open);
}

async function toggleRepositoryDirectory(path) {
  const explorer = state.agentConversation?.repositoryExplorer;
  if (!explorer) return;
  if (explorer.expandedPaths.has(path)) {
    explorer.expandedPaths.delete(path);
    renderRepositoryExplorer();
    return;
  }
  explorer.expandedPaths.add(path);
  if (explorer.childrenByPath[path]) renderRepositoryExplorer();
  else await loadRepositoryDirectory(path);
}

async function loadRepositoryDirectory(path) {
  const value = state.agentConversation;
  const explorer = value?.repositoryExplorer;
  if (!value?.taskId || !explorer || explorer.loadingPaths.has(path)) return;
  explorer.loadingPaths.add(path);
  delete explorer.errorsByPath[path];
  renderRepositoryExplorer();
  try {
    const response = await fetch(`/api/agent-tasks/${encodeURIComponent(value.taskId)}/repository/tree?path=${encodeURIComponent(path)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Repository folder could not be loaded.");
    if (state.agentConversation?.taskId !== value.taskId) return;
    explorer.childrenByPath[path] = result.directory?.entries || [];
  } catch (error) {
    explorer.errorsByPath[path] = error.message;
  } finally {
    explorer.loadingPaths.delete(path);
    if (state.agentConversation?.taskId === value.taskId) renderRepositoryExplorer();
  }
}

async function openRepositoryFile(path) {
  const value = state.agentConversation;
  const explorer = value?.repositoryExplorer;
  if (!value?.taskId || !explorer) return;
  explorer.selectedPath = path;
  explorer.preview = null;
  explorer.previewError = null;
  explorer.previewLoading = true;
  renderRepositoryExplorer();
  try {
    const response = await fetch(`/api/agent-tasks/${encodeURIComponent(value.taskId)}/repository/file?path=${encodeURIComponent(path)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Repository file could not be previewed.");
    if (state.agentConversation?.taskId !== value.taskId || explorer.selectedPath !== path) return;
    explorer.preview = result.file;
  } catch (error) {
    explorer.previewError = error.message;
  } finally {
    explorer.previewLoading = false;
    if (state.agentConversation?.taskId === value.taskId) renderRepositoryExplorer();
  }
}

function closeRepositoryPreview() {
  const explorer = state.agentConversation?.repositoryExplorer;
  if (!explorer) return;
  explorer.selectedPath = null;
  explorer.preview = null;
  explorer.previewError = null;
  explorer.previewLoading = false;
  renderRepositoryExplorer();
}

function mountRunReview(root) {
  const value = state.agentConversation;
  const latestRun = value?.runs?.at(-1);
  const modal = root.querySelector?.(".conversation-modal");
  const layout = root.querySelector?.(".conversation-layout");
  const actions = root.querySelector?.(".conversation-header-actions");
  if (!modal || !layout || !actions || !latestRun) return;
  actions.insertAdjacentHTML("afterbegin", `<button class="secondary-button run-review-toggle" type="button" data-run-review-toggle aria-pressed="${value.review?.open ? "true" : "false"}">${icon("layers")} Review</button>`);
  if (!value.review?.open) return;
  modal.classList.add("review-open");
  layout.insertAdjacentHTML("beforeend", runReviewPanel(value.review));
}

function runReviewPanel(review) {
  if (review.loading && !review.data) return `<aside class="conversation-review" data-run-review><header><div><span class="entity-kind">RUN REVIEW</span><strong>Loading evidence…</strong></div><button class="icon-button" type="button" data-run-review-toggle aria-label="Close Run review">${icon("close")}</button></header><div class="review-loading">${icon("sync")} Materializing bounded review artifacts…</div></aside>`;
  if (review.error && !review.data) return `<aside class="conversation-review" data-run-review><header><div><span class="entity-kind">RUN REVIEW</span><strong>Review unavailable</strong></div><button class="icon-button" type="button" data-run-review-toggle aria-label="Close Run review">${icon("close")}</button></header><div class="review-error"><strong>Could not load Run evidence</strong><p>${clean(review.error)}</p><button class="secondary-button" data-run-review-refresh>Try again</button></div></aside>`;
  const data = review.data || {};
  const run = data.agentRun || state.agentConversation?.runs.find(item => item.id === review.runId) || {};
  const approvals = data.approvalRequests || [];
  const changes = data.fileChanges || [];
  const artifacts = data.artifacts || [];
  const tests = artifacts.filter(item => item.kind === "test_report");
  const runs = state.agentConversation?.runs || [];
  return `<aside class="conversation-review" data-run-review><header><div><span class="entity-kind">RUN REVIEW</span><strong>${clean(runStatusLabel(run.status))} · ${clean(formatDateTime(run.startedAt || run.createdAt))}</strong></div><div><button class="icon-button" type="button" data-run-review-refresh aria-label="Refresh Run review">${icon("sync")}</button><button class="icon-button" type="button" data-run-review-toggle aria-label="Close Run review">${icon("close")}</button></div></header><div class="review-scroll">
    <label class="review-run-picker">Run<select data-run-review-select>${[...runs].reverse().map((item, index) => `<option value="${clean(item.id)}" ${item.id === run.id ? "selected" : ""}>${index === 0 ? "Latest · " : ""}${clean(formatDateTime(item.startedAt || item.createdAt))} · ${clean(runStatusLabel(item.status))}</option>`).join("")}</select></label>
    ${review.error ? `<div class="review-inline-error">${clean(review.error)}</div>` : ""}
    <section class="review-section"><div class="review-section-title"><div><span>Timeline</span><h3>Run activity</h3></div><span class="task-status ${clean(run.status)}">${clean(runStatusLabel(run.status))}</span></div>${runTimeline(run)}</section>
    ${runRecoveryReview(run, review)}
    <section class="review-section"><div class="review-section-title"><div><span>Authority</span><h3>Approval requests</h3></div><b>${approvals.length}</b></div>${approvals.length ? approvals.map(reviewApprovalCard).join("") : reviewEmpty("No approval requests", "This Run did not request a protected action.")}</section>
    <section class="review-section"><div class="review-section-title"><div><span>Workspace</span><h3>Isolated worktree</h3></div></div>${reviewWorktreeCard(data.managedWorktree, run)}</section>
    <section class="review-section"><div class="review-section-title"><div><span>Changes</span><h3>Exact changed files</h3></div><b>${changes.length}</b></div>${changes.length ? `<div class="review-change-list">${changes.map(change => `<article class="review-change ${clean(change.status)}"><span>${clean(change.operation === "create_file" ? "NEW" : "EDIT")}</span><div><strong>${clean(change.relativePath)}</strong><small>${clean(change.status)} · ${formatBytes(change.beforeBytes)} → ${formatBytes(change.afterBytes)}</small></div></article>`).join("")}</div>` : reviewEmpty("No guarded file changes", "No file mutation evidence is recorded for this Run.")}</section>
    <section class="review-section"><div class="review-section-title"><div><span>Verification</span><h3>Test evidence</h3></div><b>${tests.length}</b></div>${tests.length ? `<div class="review-test-list">${tests.map(test => `<article class="review-test ${clean(test.metadata?.status || "unknown")}"><span>${test.metadata?.status === "passed" ? icon("check") : icon("bolt")}</span><div><strong>${clean(test.metadata?.policyId || "Verification command")}</strong><small>${clean(verificationStatusCopy(test.metadata?.status))}</small></div><button class="text-button" data-run-artifact-open="${clean(test.id)}">Open report</button></article>`).join("")}</div>` : reviewEmpty("No tests recorded", "A missing test report is not treated as a passing test.")}</section>
    <section class="review-section review-artifacts"><div class="review-section-title"><div><span>Evidence</span><h3>Run artifacts</h3></div><b>${artifacts.length}</b></div>${artifacts.length ? `<div class="review-artifact-tabs">${artifacts.map(artifact => `<button class="${artifact.id === review.selectedArtifactId ? "selected" : ""}" data-run-artifact-open="${clean(artifact.id)}"><span>${clean(artifactKindLabel(artifact.kind))}</span><small>${formatBytes(artifact.sizeBytes)}</small></button>`).join("")}</div>${reviewArtifactViewer(review, artifacts)}` : reviewEmpty("No artifacts available", "No final response, error, patch, changed-file summary, or test report has been persisted.")}</section>
    ${reviewIssueWriteback(data.issueWriteback, approvals, review)}
    <section class="review-section review-decision"><div class="review-section-title"><div><span>Disposition</span><h3>Review decision</h3></div></div><p>Records your review only. It does not commit, push, publish, or update the linked Issue.</p><div><button class="secondary-button" data-run-review-decision="needs_changes" ${review.actionPending ? "disabled" : ""}>Needs changes</button><button class="primary-button" data-run-review-decision="accepted_for_next_step" ${review.actionPending ? "disabled" : ""}>${run.reviewStatus === "accepted_for_next_step" ? icon("check") + " Accepted" : "Accept for next step"}</button></div></section>
  </div></aside>`;
}

function runTimeline(run) {
  const activity = (run.toolActivity || []).slice(-20);
  const items = [
    { label: "Run started", time: run.startedAt || run.createdAt, status: "completed" },
    ...activity.map(item => ({ label: `${String(item.tool || "tool").replaceAll("_", " ")} · ${item.phase || "activity"}`, time: item.timestamp, status: item.errorCode ? "failed" : "completed" })),
    ...(run.completedAt ? [{ label: `Run ${run.status}`, time: run.completedAt, status: run.status }] : [])
  ];
  return `<ol class="review-timeline">${items.map(item => `<li class="${clean(item.status)}"><i></i><div><strong>${clean(item.label)}</strong><small>${clean(formatDateTime(item.time))}</small></div></li>`).join("")}</ol>`;
}

function runRecoveryReview(run, review) {
  if (!run.recovery) return "";
  const recovery = run.recovery;
  const reason = recovery.reason === "server_restart_during_approval" ? "Server restarted while approval was unresolved." : "Server restarted while the Run was active.";
  const classification = recovery.classification === "manual_review" ? "Manual worktree review required" : "Safe to retry as a new turn";
  return `<section class="review-section review-recovery"><div class="review-section-title"><div><span>Recovery</span><h3>Interrupted Run</h3></div><b>${recovery.acknowledgedAt ? icon("check") : "!"}</b></div><article><strong>${clean(classification)}</strong><p>${clean(reason)} No commands, file changes, verification, or external writes were replayed automatically.</p><dl><div><dt>Original state</dt><dd>${clean(runStatusLabel(recovery.originalStatus))}</dd></div><div><dt>Recovered</dt><dd>${clean(formatDateTime(recovery.recoveredAt))}</dd></div></dl>${recovery.acknowledgedAt ? `<small>Acknowledged by ${clean(recovery.acknowledgedBy)} · ${clean(formatDateTime(recovery.acknowledgedAt))}</small>` : `<button class="secondary-button" data-run-recovery-acknowledge ${review.actionPending ? "disabled" : ""}>Acknowledge recovery</button>`}</article></section>`;
}

function reviewApprovalCard(approval) {
  const pending = approval.status === "pending";
  const approved = approval.status === "approved";
  const canExecute = approved && ["repository.create_worktree", "repository.run_verification", "external.issue.write"].includes(approval.capability);
  const executeLabel = approval.capability === "repository.create_worktree" ? "Create approved worktree" : approval.capability === "repository.run_verification" ? "Run approved verification" : "Update authoritative Issue";
  return `<article class="review-approval ${clean(approval.status)}"><header><span>${clean(approval.riskLevel)} risk</span><b>${clean(approval.status)}</b></header><h4>${clean(approvalCapabilityLabel(approval.capability))}</h4><code>${clean(approval.targetId)}</code><p>${clean(approval.reason)}</p><small>${clean(approvalConsequence(approval.capability))}</small>${pending ? `<div><button class="danger-outline-button" data-run-approval-decision="denied" data-approval-id="${clean(approval.id)}">Deny</button><button class="primary-button" data-run-approval-decision="approved" data-approval-id="${clean(approval.id)}">Approve exact target</button></div>` : canExecute ? `<div><button class="secondary-button" data-run-approved-execute="${clean(approval.id)}">${executeLabel}</button></div>` : ""}</article>`;
}

function reviewIssueWriteback(value, approvals, review) {
  if (!value?.preview && !value?.attempts?.length) return `<section class="review-section review-writeback"><div class="review-section-title"><div><span>Issue loop</span><h3>Origin status write-back</h3></div></div>${reviewEmpty("No linked Issue", value?.reason || "This Run has no Issue origin to update.")}</section>`;
  const preview = value.preview;
  const attempts = value.attempts || [];
  const unresolved = attempts.some(item => ["awaiting_approval", "approved", "executing"].includes(item.status));
  const latest = attempts[0];
  const canRequest = value.available && !unresolved;
  return `<section class="review-section review-writeback"><div class="review-section-title"><div><span>Issue loop</span><h3>Origin status write-back</h3></div><b>${attempts.length}</b></div>
    ${preview ? `<article class="writeback-preview"><header><div><span>${clean(preview.source.provider)}</span><strong>${clean(preview.source.displayName)}</strong></div><span class="task-status ${clean(preview.requestedStatus)}">${clean(statusLabel(preview.requestedStatus) || preview.requestedStatus)}</span></header><h4>${clean(preview.issue.title)}</h4><p><b>${clean(statusLabel(preview.currentStatus) || preview.currentStatus)}</b> → <b>${clean(statusLabel(preview.requestedStatus) || preview.requestedStatus)}</b></p><code>${clean(preview.targetId)}</code><small>Authoritative origin · external Issue ${clean(preview.issue.externalIssueId)}. This updates status only; replicas remain unchanged.</small>${canRequest ? `<button class="primary-button" data-issue-writeback-request>${latest?.status === "failed" ? "Retry with new approval" : "Request exact approval"}</button>` : value.reason ? `<p class="writeback-note">${clean(value.reason)}</p>` : ""}</article>` : ""}
    ${attempts.length ? `<div class="writeback-attempts">${attempts.map(item => issueWritebackAttempt(item, approvals)).join("")}</div>` : `<p class="writeback-note">No external write has been attempted. Run completion and review acceptance leave the Issue unchanged.</p>`}
  </section>`;
}

function issueWritebackAttempt(item, approvals) {
  const approval = approvals.find(value => value.id === item.approvalRequestId);
  const labels = { awaiting_approval: "Awaiting approval", approved: "Approved — not executed", denied: "Denied — no write", expired: "Expired — no write", cancelled: "Cancelled — no write", executing: "Writing origin…", succeeded: "Origin and local Issue updated", failed: "Upstream result uncertain — retry available" };
  return `<article class="writeback-attempt ${clean(item.status)}"><header><strong>${clean(labels[item.status] || item.status)}</strong><small>${clean(formatDateTime(item.updatedAt))}</small></header><p>${clean(statusLabel(item.previousStatus) || item.previousStatus)} → ${clean(statusLabel(item.requestedStatus) || item.requestedStatus)}</p>${item.errorMessage ? `<div class="review-inline-error">${clean(item.errorMessage)}</div>` : ""}${item.status === "approved" && approval ? `<button class="primary-button" data-run-approved-execute="${clean(approval.id)}">Update authoritative Issue</button>` : ""}</article>`;
}

function reviewWorktreeCard(worktree, run) {
  if (!worktree) return reviewEmpty("No isolated worktree", "This Run has no managed modifying workspace. The base checkout has not been changed.");
  const canRetain = worktree.status === "ready";
  const canDiscard = ["ready", "retained", "missing", "failed"].includes(worktree.status);
  return `<article class="review-worktree ${clean(worktree.status)}"><header><span class="task-status ${clean(worktree.status)}">${clean(worktree.status)}</span><strong>${worktree.present ? worktree.dirty ? "Changes present" : "No detected changes" : "Directory unavailable"}</strong></header><code title="${clean(worktree.path)}">${clean(worktree.path)}</code><dl><div><dt>Base</dt><dd>${clean(String(worktree.baseCommit || "").slice(0, 10))}</dd></div><div><dt>HEAD</dt><dd>${clean(String(worktree.head || "").slice(0, 10) || "Unknown")}</dd></div></dl>${canRetain || canDiscard ? `<div>${canRetain ? `<button class="secondary-button" data-worktree-review-action="retain" data-worktree-id="${clean(worktree.id)}">Retain safely</button>` : ""}${canDiscard ? `<button class="danger-outline-button" data-worktree-review-action="discard" data-worktree-id="${clean(worktree.id)}" data-worktree-path="${clean(worktree.path)}">Discard exact worktree</button>` : ""}</div>` : ""}</article>`;
}

function reviewArtifactViewer(review, artifacts) {
  if (!review.selectedArtifactId) return `<div class="review-artifact-empty">Select an artifact to inspect its bounded content.</div>`;
  const artifact = artifacts.find(item => item.id === review.selectedArtifactId);
  if (!artifact) return "";
  if (review.artifactLoading) return `<div class="review-artifact-empty">${icon("sync")} Loading ${clean(artifactKindLabel(artifact.kind))}…</div>`;
  if (review.artifactError) return `<div class="review-artifact-empty error">${clean(review.artifactError)}</div>`;
  return `<div class="review-artifact-viewer"><header><strong>${clean(artifactKindLabel(artifact.kind))}</strong><span>SHA-256 ${clean(artifact.contentHash.slice(0, 12))} · retained until ${clean(formatDateTime(artifact.retentionUntil))}</span></header><pre>${clean(review.artifactContent || "")}</pre></div>`;
}

function reviewEmpty(title, detail) { return `<div class="review-empty"><strong>${clean(title)}</strong><p>${clean(detail)}</p></div>`; }
function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function artifactKindLabel(kind) { return ({ final_output: "Final response", changed_files: "Changed files", patch: "Patch", test_report: "Test report", bounded_log: "Bounded log", error_report: "Error report" })[kind] || String(kind || "Artifact").replaceAll("_", " "); }
function verificationStatusCopy(status) { return ({ passed: "Passed", failed: "Failed — review output", timed_out: "Timed out", cancelled: "Cancelled", launch_error: "Could not start" })[status] || "Status unavailable"; }
function approvalCapabilityLabel(value) { return ({ "repository.create_worktree": "Create isolated worktree", "repository.modify_files": "Modify one exact file", "repository.run_verification": "Run configured verification", "repository.create_commit": "Create commit", "repository.push": "Push changes", "external.issue.write": "Update external Issue", "external.message.send": "Send external message" })[value] || String(value || "Protected action").replaceAll("_", " "); }
function approvalConsequence(value) { return ({ "repository.create_worktree": "Approval permits creation of one detached workspace; it does not edit the base checkout.", "repository.modify_files": "Approval permits one exact guarded file operation in the managed worktree.", "repository.run_verification": "Approval runs one fixed command policy in the managed worktree without a shell.", "external.issue.write": "Approval permits one status transition on the named authoritative origin Issue. It does not update replicas or other fields." })[value] || "Approval is exact-target and single-use; it grants no other capability."; }

function bindRunReviewEvents(root) {
  if (!root) return;
  root.querySelectorAll("[data-run-review-toggle]").forEach(button => button.addEventListener("click", toggleRunReview));
  root.querySelector("[data-run-review-refresh]")?.addEventListener("click", () => loadRunReview(state.agentConversation?.review?.runId, { force: true }));
  root.querySelector("[data-run-review-select]")?.addEventListener("change", event => loadRunReview(event.currentTarget.value, { force: true }));
  root.querySelectorAll("[data-run-artifact-open]").forEach(button => button.addEventListener("click", () => openRunArtifact(button.dataset.runArtifactOpen)));
  root.querySelectorAll("[data-run-approval-decision]").forEach(button => button.addEventListener("click", () => decideReviewApproval(button.dataset.approvalId, button.dataset.runApprovalDecision)));
  root.querySelectorAll("[data-run-approved-execute]").forEach(button => button.addEventListener("click", () => executeApprovedReviewAction(button.dataset.runApprovedExecute)));
  root.querySelector("[data-issue-writeback-request]")?.addEventListener("click", requestIssueWritebackApproval);
  root.querySelectorAll("[data-worktree-review-action]").forEach(button => button.addEventListener("click", () => reviewWorktreeAction(button.dataset.worktreeId, button.dataset.worktreeReviewAction, button.dataset.worktreePath)));
  root.querySelectorAll("[data-run-review-decision]").forEach(button => button.addEventListener("click", () => recordRunReviewDecision(button.dataset.runReviewDecision)));
  root.querySelector("[data-run-recovery-acknowledge]")?.addEventListener("click", acknowledgeRunRecovery);
}

function toggleRunReview() {
  const value = state.agentConversation;
  if (!value?.review || !value.runs.length) return;
  value.review.open = !value.review.open;
  clearTimeout(value.review.pollTimer);
  if (!value.review.open) {
    value.review.pollTimer = null;
    return renderAgentConversation();
  }
  const runId = value.review.runId || value.runs.at(-1).id;
  value.review.runId = runId;
  value.review.loading = true;
  renderAgentConversation();
  loadRunReview(runId, { force: true });
}

async function loadRunReview(runId, options = {}) {
  const review = state.agentConversation?.review;
  if (!review || !runId || (!options.force && review.loading)) return;
  review.runId = runId;
  review.loading = true;
  review.error = null;
  clearTimeout(review.pollTimer);
  renderRunReviewPanel();
  try {
    const response = await fetch(`/api/agent-runs/${encodeURIComponent(runId)}/review`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Run review could not be loaded.");
    if (state.agentConversation?.review !== review || review.runId !== runId) return;
    review.data = result;
    review.loading = false;
    const artifacts = result.artifacts || [];
    if (!artifacts.some(item => item.id === review.selectedArtifactId)) {
      review.selectedArtifactId = preferredReviewArtifact(artifacts)?.id || null;
      review.artifactContent = null;
    }
    renderRunReviewPanel();
    if (review.selectedArtifactId && review.artifactContent == null) await openRunArtifact(review.selectedArtifactId, { quiet: true });
    scheduleRunReviewPoll(review);
  } catch (error) {
    if (state.agentConversation?.review !== review) return;
    review.loading = false;
    review.error = error.message;
    renderRunReviewPanel();
  }
}

function preferredReviewArtifact(artifacts) {
  const order = ["test_report", "patch", "changed_files", "error_report", "final_output", "bounded_log"];
  return [...artifacts].sort((left, right) => order.indexOf(left.kind) - order.indexOf(right.kind))[0];
}

function scheduleRunReviewPoll(review) {
  clearTimeout(review.pollTimer);
  const active = ["queued", "running", "waiting_approval"].includes(review.data?.agentRun?.status) || (review.data?.approvalRequests || []).some(item => ["pending", "approved"].includes(item.status));
  if (review.open && active) review.pollTimer = setTimeout(() => loadRunReview(review.runId, { force: true }), 1500);
}

function renderRunReviewPanel() {
  const review = state.agentConversation?.review;
  const current = document.querySelector("[data-run-review]");
  if (!review?.open || !current) return;
  const scroll = current.querySelector(".review-scroll")?.scrollTop || 0;
  current.outerHTML = runReviewPanel(review);
  const replacement = document.querySelector("[data-run-review]");
  bindRunReviewEvents(replacement);
  if (replacement?.querySelector(".review-scroll")) replacement.querySelector(".review-scroll").scrollTop = scroll;
}

async function openRunArtifact(artifactId, options = {}) {
  const review = state.agentConversation?.review;
  if (!review || !artifactId) return;
  review.selectedArtifactId = artifactId;
  review.artifactLoading = true;
  review.artifactError = null;
  if (!options.quiet) renderRunReviewPanel();
  try {
    const response = await fetch(`/api/agent-runs/${encodeURIComponent(review.runId)}/artifacts/${encodeURIComponent(artifactId)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Artifact content could not be loaded.");
    review.artifactContent = result.content;
  } catch (error) {
    review.artifactContent = null;
    review.artifactError = error.message;
  } finally {
    review.artifactLoading = false;
    renderRunReviewPanel();
  }
}

async function decideReviewApproval(approvalId, decision) {
  const review = state.agentConversation?.review;
  if (!review || review.actionPending) return;
  await performReviewAction(async () => {
    const response = await fetch(`/api/agent-runs/${encodeURIComponent(review.runId)}/approvals/${encodeURIComponent(approvalId)}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, actor: "local-user", note: decision === "approved" ? "Approved from Run review" : "Denied from Run review" }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Approval decision could not be recorded.");
    toast(decision === "approved" ? "Exact target approved" : "Protected action denied", decision === "approved" ? "success" : "info");
  });
}

async function executeApprovedReviewAction(approvalId) {
  const review = state.agentConversation?.review;
  const approval = review?.data?.approvalRequests?.find(item => item.id === approvalId);
  if (!review || !approval) return;
  await performReviewAction(async () => {
    if (approval.capability === "external.issue.write") {
      const response = await fetch(`/api/agent-runs/${encodeURIComponent(review.runId)}/issue-writeback/execute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approvalRequestId: approval.id, actor: "local-user" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The authoritative Issue could not be updated.");
      toast("Authoritative Issue and local status updated", "success");
      return;
    }
    const isWorktree = approval.capability === "repository.create_worktree";
    const policyId = approval.targetId.split(":").at(-1);
    const url = isWorktree ? `/api/agent-runs/${encodeURIComponent(review.runId)}/worktree` : `/api/agent-runs/${encodeURIComponent(review.runId)}/verifications/${encodeURIComponent(policyId)}`;
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isWorktree ? { approvalRequestId: approval.id, actor: "local-user" } : { actor: "local-user" }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Approved action could not be executed.");
    toast(isWorktree ? "Isolated worktree created" : `Verification ${result.verification?.status || "completed"}`, result.verification?.status === "passed" || isWorktree ? "success" : "error");
  });
}

async function requestIssueWritebackApproval() {
  const review = state.agentConversation?.review;
  const preview = review?.data?.issueWriteback?.preview;
  if (!review || !preview) return;
  await performReviewAction(async () => {
    const response = await fetch(`/api/agent-runs/${encodeURIComponent(review.runId)}/issue-writeback/approval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestedStatus: preview.requestedStatus, requestedBy: "local-user" }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Issue write-back approval could not be requested.");
    toast("Exact Issue transition is ready for approval", "info");
  });
}

async function acknowledgeRunRecovery() {
  const review = state.agentConversation?.review;
  if (!review) return;
  await performReviewAction(async () => {
    const response = await fetch(`/api/agent-runs/${encodeURIComponent(review.runId)}/recovery/acknowledge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actor: "local-user" }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Run recovery could not be acknowledged.");
    toast("Run recovery acknowledged; no action was replayed", "success");
    await hydrateAgents();
  });
}

async function reviewWorktreeAction(worktreeId, action, path) {
  if (action === "discard" && !window.confirm(`Discard the exact managed worktree at:\n\n${path}\n\nThis removes its Agent changes and cannot be undone.`)) return;
  await performReviewAction(async () => {
    const response = await fetch(`/api/managed-worktrees/${encodeURIComponent(worktreeId)}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "discard" ? { confirmDiscard: true, confirmationPath: path } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Worktree could not be ${action === "retain" ? "retained" : "discarded"}.`);
    toast(action === "retain" ? "Worktree retained; active lock released" : "Exact managed worktree discarded", "success");
  });
}

async function recordRunReviewDecision(status) {
  const review = state.agentConversation?.review;
  if (!review) return;
  await performReviewAction(async () => {
    const response = await fetch(`/api/agent-runs/${encodeURIComponent(review.runId)}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, actor: "local-user" }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Review decision could not be recorded.");
    toast(status === "accepted_for_next_step" ? "Run accepted for the next explicit step" : "Run marked as needing changes", "success");
  });
}

async function performReviewAction(action) {
  const review = state.agentConversation?.review;
  if (!review || review.actionPending) return;
  review.actionPending = true;
  review.error = null;
  renderRunReviewPanel();
  try {
    await action();
    review.actionPending = false;
    await loadRunReview(review.runId, { force: true });
  } catch (error) {
    review.error = error.message;
    review.actionPending = false;
    renderRunReviewPanel();
  } finally {
    review.actionPending = false;
    renderRunReviewPanel();
  }
}

function formatFileSize(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function sendAgentTurn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const taskId = state.agentConversation?.taskId;
  const message = new FormData(form).get("message")?.trim();
  if (!taskId || !message) return;
  const submit = form.querySelector("button[type='submit']");
  submit.disabled = true;
  state.agentConversation.error = null;
  const pendingMessage = { id: `pending-${Date.now()}`, role: "user", content: message, createdAt: new Date().toISOString() };
  state.agentConversation.messages.push(pendingMessage);
  state.agentConversation.runStatus = "queued";
  state.agentConversation.streamText = "";
  renderAgentConversation();
  try {
    const response = await fetch(`/api/agent-tasks/${encodeURIComponent(taskId)}/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The Agent Run could not be started.");
    state.agentConversation.runs.push(result.agentRun);
    state.agentConversation.runStatus = result.agentRun.status;
    patchAgentConversationLiveView();
    connectAgentRunEvents(result.agentRun.id);
  } catch (error) {
    state.agentConversation.messages = state.agentConversation.messages.filter(item => item.id !== pendingMessage.id);
    state.agentConversation.error = error.message;
    state.agentConversation.runStatus = state.agentConversation.runs.at(-1)?.status || state.agentConversation.task?.status || null;
    renderAgentConversation();
    setTimeout(() => document.getElementById("agent-message")?.focus(), 50);
  }
}

function connectAgentRunEvents(runId) {
  const value = state.agentConversation;
  if (!value || typeof EventSource === "undefined") {
    if (value) value.error = "Live events are unavailable in this browser. Reload the conversation to inspect the completed Run.";
    renderAgentConversation();
    return;
  }
  value.eventSource?.close();
  const source = new EventSource(`/api/agent-runs/${encodeURIComponent(runId)}/events`);
  value.eventSource = source;
  for (const type of ["run.started", "thread.started", "turn.started", "assistant.output", "turn.completed", "tool.detected", "run.cancelling", "run.terminal"]) {
    source.addEventListener(type, event => handleAgentRunEvent(type, event));
  }
  source.onerror = () => {
    if (!state.agentConversation || state.agentConversation.eventSource !== source || !["queued", "running", "reconnecting"].includes(state.agentConversation.runStatus)) return;
    state.agentConversation.runStatus = "reconnecting";
    patchAgentConversationLiveView();
  };
}

async function handleAgentRunEvent(type, event) {
  const value = state.agentConversation;
  if (!value) return;
  let payload;
  try { payload = JSON.parse(event.data); }
  catch { return; }
  if (type === "assistant.output") value.streamText = payload.data?.text || "";
  if (type === "run.cancelling") value.runStatus = "cancelling";
  if (["run.started", "thread.started", "turn.started"].includes(type)) value.runStatus = "running";
  if (type === "tool.detected") value.error = "Codex attempted tool activity, which is blocked for this chat-only milestone.";
  if (type !== "run.terminal") {
    if (type === "tool.detected") renderAgentConversation();
    else patchAgentConversationLiveView();
    return;
  }
  value.eventSource?.close();
  value.eventSource = null;
  value.runStatus = payload.data?.status || "failed";
  const taskId = value.taskId;
  try {
    await refreshAgentConversation(taskId, { preserveStream: false });
    await hydrateAgents();
    if (state.agentConversation?.taskId === taskId) renderAgentConversation();
  } catch (error) {
    if (state.agentConversation?.taskId === taskId) {
      state.agentConversation.error = `The Run ended, but its persisted result could not be reloaded: ${error.message}`;
      renderAgentConversation();
    }
  }
}

function patchAgentConversationLiveView() {
  const value = state.agentConversation;
  const root = document.getElementById("overlay-root");
  const modal = root?.querySelector(".conversation-modal");
  if (!value || !root) return;
  if (!modal || value.loading || value.loadError) return renderAgentConversation();

  const status = value.runStatus || value.task?.status;
  const statusNode = modal.querySelector("[data-run-status]");
  if (statusNode) {
    statusNode.className = `task-status ${status || ""}`;
    statusNode.textContent = runStatusLabel(status);
  }

  const transcript = modal.querySelector("[data-conversation-transcript]");
  const streamMessage = modal.querySelector("[data-stream-message]");
  if (!streamMessage && ["running", "queued", "cancelling", "reconnecting"].includes(status)) return renderAgentConversation();
  if (streamMessage) {
    const content = streamMessage.querySelector("[data-stream-content]");
    const label = streamMessage.querySelector("[data-stream-label]");
    if (content) {
      content.textContent = value.streamText || "Codex is working…";
      content.classList.toggle("placeholder", !value.streamText);
    }
    if (label) label.textContent = value.streamText ? "Receiving response…" : status === "reconnecting" ? "Reconnecting…" : "Working…";
    scrollConversationToBottom(transcript);
  }

  const cancelButton = modal.querySelector("[data-agent-run-cancel]");
  const cancelLabel = modal.querySelector("[data-cancel-label]");
  if (cancelButton) cancelButton.disabled = status === "cancelling";
  if (cancelLabel) cancelLabel.textContent = status === "cancelling" ? "Stopping…" : "Stop";
}

async function cancelAgentRun() {
  const value = state.agentConversation;
  const run = [...(value?.runs || [])].reverse().find(item => ["queued", "running"].includes(item.status));
  if (!value || !run) return;
  value.runStatus = "cancelling";
  patchAgentConversationLiveView();
  try {
    const response = await fetch(`/api/agent-runs/${encodeURIComponent(run.id)}/cancel`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The Agent Run could not be stopped.");
  } catch (error) {
    value.error = error.message;
    value.runStatus = "running";
    renderAgentConversation();
  }
}

function populateAssignmentScope(form, projectId, reset = false) {
  const productSelect = form.querySelector("[data-assignment-product]");
  const repositorySelect = form.querySelector("[data-assignment-repository]");
  if (!productSelect || !repositorySelect) return;
  const selectedProduct = reset ? "" : productSelect.dataset.selected || productSelect.value;
  const selectedRepository = reset ? "" : repositorySelect.dataset.selected || repositorySelect.value;
  const products = state.workspace.products.filter(product => product.projectId === projectId);
  const repositories = (state.workspace.repositories || []).filter(repository => repository.projectId === projectId);
  productSelect.innerHTML = `<option value="">Project-wide</option>${products.map(product => `<option value="${clean(product.id)}" ${product.id === selectedProduct ? "selected" : ""}>${clean(product.name)}${product.active ? "" : " (inactive)"}</option>`).join("")}`;
  repositorySelect.innerHTML = `<option value="">No Repository</option>${repositories.map(repository => `<option value="${clean(repository.id)}" ${repository.id === selectedRepository ? "selected" : ""} ${repository.active && repository.verificationStatus === "verified" ? "" : "disabled"}>${clean(repository.name)} · ${repository.active ? clean(repository.verificationStatus) : "inactive"}</option>`).join("")}`;
  productSelect.dataset.selected = "";
  repositorySelect.dataset.selected = "";
}

async function saveAgentEntity(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const type = form.dataset.entityType;
  const entityId = form.dataset.entityId;
  const resources = { harnessAccount: "harness-accounts", agentProfile: "agent-profiles", agentAssignment: "agent-assignments" };
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  payload.active = data.has("active");
  if (type === "agentProfile") {
    payload.modelSettings = {};
    if (payload.reasoningEffort) payload.modelSettings.reasoningEffort = payload.reasoningEffort;
    if (payload.verbosity) payload.modelSettings.verbosity = payload.verbosity;
    if (payload.serviceTier) payload.modelSettings.serviceTier = payload.serviceTier;
    delete payload.reasoningEffort;
    delete payload.verbosity;
    delete payload.serviceTier;
  }
  const submit = form.querySelector("button[type='submit']");
  submit.disabled = true;
  try {
    const response = await fetch(`/api/${resources[type]}${entityId ? `/${encodeURIComponent(entityId)}` : ""}`, {
      method: entityId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The Agent configuration could not be saved.");
    closeOverlay();
    await hydrateAgents();
    toast(`${agentTypeLabel(type)} ${entityId ? "updated" : "created"}`, "success");
  } catch (error) {
    submit.disabled = false;
    toast(error.message, "error");
  }
}

async function removeAgentEntity(type, id) {
  const resources = { harnessAccount: "harness-accounts", agentProfile: "agent-profiles", agentAssignment: "agent-assignments" };
  const collection = { harnessAccount: "harnessAccounts", agentProfile: "agentProfiles", agentAssignment: "agentAssignments" }[type];
  const entity = state.agents?.[collection]?.find(item => item.id === id);
  if (!entity) return toast("The Agent configuration could not be found.", "error");
  const label = type === "agentAssignment" ? entity.effectiveContext?.agentProfile?.name || "this Assignment" : entity.name || entity.displayName;
  if (!window.confirm(`Remove ${agentTypeLabel(type)} “${label}”? This is allowed only while it has no dependent history.`)) return;
  try {
    const response = await fetch(`/api/${resources[type]}/${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The Agent configuration could not be removed.");
    await hydrateAgents();
    toast(`${agentTypeLabel(type)} removed`, "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

function agentTypeLabel(type) {
  return ({ harnessAccount: "Harness Account", agentProfile: "Agent Profile", agentAssignment: "Agent Assignment" })[type] || "Agent configuration";
}

function toggleConnectorProviderFields(form, provider) {
  form.querySelector("[data-provider-generic]")?.toggleAttribute("hidden", provider === "sheets");
  form.querySelector("[data-provider-sheets]")?.toggleAttribute("hidden", provider !== "sheets");
}

function toggleProductSourceFields(form, provider) {
  const isSheets = provider === "sheets";
  form.querySelector("[data-source-sheets]")?.toggleAttribute("hidden", !isSheets);
  const label = form.querySelector("[data-source-container-label]");
  if (label) label.firstChild.textContent = isSheets ? "Spreadsheet ID" : "External container ID";
}

async function testGoogleSheetSource(id, button) {
  button.disabled = true;
  try {
    const response = await fetch(`/api/google/sheets/${encodeURIComponent(id)}/test`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Google Sheet access could not be verified.");
    toast(`Google Sheet connected: ${result.properties?.title || "access verified"}`, "success");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function saveWorkspaceEntity(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const type = form.dataset.entityType;
  const entityId = form.dataset.entityId;
  const resources = { organization: "organizations", project: "projects", product: "products", repository: "repositories", connectorAccount: "connector-accounts", productSource: "product-sources" };
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  payload.active = data.has("active");
  const submit = form.querySelector("button[type='submit']");
  submit.disabled = true;
  try {
    const response = await fetch(`/api/workspace/${resources[type]}${entityId ? `/${encodeURIComponent(entityId)}` : ""}`, {
      method: entityId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The workspace record could not be saved.");
    state.workspace = result.workspace;
    state.workspaceError = null;
    if (type === "repository" && entityId) delete state.repositoryErrors[entityId];
    closeOverlay();
    render();
    toast(`${workspaceTypeLabel(type)} ${entityId ? "updated" : "created"}`, "success");
  } catch (error) {
    submit.disabled = false;
    toast(error.message, "error");
  }
}

async function removeWorkspaceProductSource(id) {
  const source = state.workspace?.productSources.find(item => item.id === id);
  if (!source) return toast("The Product Source could not be found.", "error");
  const linkCount = state.workspace.externalIssueLinks.filter(link => link.productSourceId === id).length;
  if (linkCount) {
    toast(`This Source has ${linkCount} linked Issue representation${linkCount === 1 ? "" : "s"}. Edit it and deactivate it instead.`, "error");
    return;
  }
  if (!window.confirm(`Remove the Product Source “${source.displayName}”? This cannot be undone.`)) return;
  try {
    const response = await fetch(`/api/workspace/product-sources/${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The Product Source could not be removed.");
    state.workspace = result.workspace;
    render();
    toast("Product Source removed", "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

function workspaceTypeLabel(type) {
  return ({ organization: "Organization", project: "Project", product: "Product", repository: "Repository", connectorAccount: "Connector Account", productSource: "Product Source" })[type] || "Record";
}

async function runRepositoryAction(id, action) {
  const repository = state.workspace?.repositories?.find(item => item.id === id);
  if (!repository) return toast("The Repository could not be found.", "error");
  if (repository.active === false) return toast("Activate this Repository before verification or inspection.", "error");
  state.repositoryActions[id] = action;
  delete state.repositoryErrors[id];
  render();
  try {
    if (action === "verify") {
      const verification = await requestRepositoryOperation(id, "verify", "POST");
      replaceRepository(verification.repository);
      state.repositoryActions[id] = "inspect";
      render();
    }
    const inspection = await requestRepositoryOperation(id, "inspect", "GET");
    replaceRepository(inspection.repository);
    toast(action === "verify" ? "Repository verified and inspected read-only" : "Git metadata refreshed read-only", "success");
  } catch (error) {
    if (error.repository) replaceRepository(error.repository);
    state.repositoryErrors[id] = error.message;
    toast(error.message, "error");
  } finally {
    delete state.repositoryActions[id];
    render();
  }
}

async function requestRepositoryOperation(id, operation, method) {
  const response = await fetch(`/api/repositories/${encodeURIComponent(id)}/${operation}`, { method });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || `Repository ${operation} failed.`);
    error.repository = result.repository;
    throw error;
  }
  return result;
}

function replaceRepository(repository) {
  if (!repository) return;
  state.workspace.repositories = state.workspace.repositories.map(item => item.id === repository.id ? repository : item);
}

async function prepareOutboundSync(button) {
  button?.classList.add("syncing");
  button && (button.disabled = true);
  try {
    const response = await fetch("/api/sync/outbound", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not inspect outbound targets.");
    document.getElementById("overlay-root").innerHTML = outboundStatusModal(payload);
    bindOverlayEvents();
  } catch (error) {
    button?.classList.remove("syncing");
    if (button) button.disabled = false;
    toast(error.message, "error");
  }
}
async function syncIssues(source, button) {
  button?.classList.add("syncing");
  button && (button.disabled = true);
  const sources = source === "all" ? ["github", "gitlab"] : [source];
  const successes = [];
  const errors = [];

  for (const provider of sources) {
    try {
      const response = await fetch(`/api/${provider}/sync`);
      const payload = await response.json();
      if (!response.ok) {
        const error = new Error(payload.error || `${sourceInfo[provider].label} sync failed.`);
        error.status = response.status;
        throw error;
      }
      state.issues = provider === "gitlab" ? payload.issues : state.issues;
      state.syncMeta[provider] = payload.meta;
      successes.push({ provider, meta: payload.meta });
    } catch (error) {
      if (!(source === "all" && error.status === 503)) errors.push(error.message);
    }
  }

  if (successes.length) {
    saveIssues();
    saveSyncMeta();
    render();
    const total = successes.reduce((sum, result) => sum + result.meta.assignedItems, 0);
    const names = successes.map(result => sourceInfo[result.provider].label).join(" and ");
    toast(`Synced ${total} assigned issues from ${names}`, "success");
    if (errors.length) setTimeout(() => toast(errors.join(" "), "error"), 350);
    return;
  }

  button?.classList.remove("syncing");
  if (button) button.disabled = false;
  toast(errors.join(" ") || "No integration tokens are configured yet.", "error");
}

async function toggleComplete(id) {
  const issue = state.issues.find(item => item.id === id);
  if (!issue) return;
  if (issue.source !== "gitlab" && issue.integration) {
    toast("GitLab is the source of truth. Update the canonical GitLab issue instead.", "error");
    return;
  }
  const previousStatus = issue.status;
  const completed = previousStatus !== "done";

  if (["github", "gitlab"].includes(issue.source) && issue.integration) {
    try {
      const response = await fetch(`/api/${issue.source}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...issue.integration, completed })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Could not update ${sourceInfo[issue.source].label}.`);
      issue.status = payload.status;
    } catch (error) {
      toast(error.message, "error");
      return;
    }
  } else {
    issue.status = completed ? "done" : "todo";
  }

  saveIssues();
  render();
  toast(issue.status === "done" ? "Issue marked as done" : "Issue reopened", "success");
}
function toast(message, type = "info") { const root = document.getElementById("toast-root"); const item = document.createElement("div"); item.className = `toast ${type}`; item.innerHTML = `<span>${type === "success" ? icon("check") : icon("bolt")}</span><p>${message}</p>`; root.appendChild(item); setTimeout(() => item.classList.add("show"), 10); setTimeout(() => { item.classList.remove("show"); setTimeout(() => item.remove(), 250); }, 2600); }

document.addEventListener("keydown", globalKeydown);
render();
hydrateLocalIssues();
hydrateWorkspace();
hydrateAgents();
hydrateGoogleSheetsStatus();

if (new URLSearchParams(window.location.search).get("google") === "connected") {
  state.page = "integrations";
  history.replaceState({}, "", window.location.pathname);
  render();
  setTimeout(() => toast("Google Sheets authorization completed", "success"), 50);
}

async function hydrateLocalIssues() {
  try {
    const response = await fetch("/api/local/issues");
    const store = await response.json();
    if (!response.ok || !store.issues?.length) return;
    state.issues = store.issues.filter(issue => issue.source === "gitlab" && issue.integration?.provider === "gitlab");
    state.syncMeta = { ...state.syncMeta, ...store.meta };
    saveIssues();
    saveSyncMeta();
    render();
  } catch { /* The browser-local prototype remains available if the server cache is absent. */ }
}

async function hydrateWorkspace() {
  state.workspaceError = null;
  if (state.page === "workspace") render();
  try {
    const response = await fetch("/api/local/workspace");
    const workspace = await response.json();
    if (!response.ok) throw new Error(workspace.error || "Could not load the neutral workspace.");
    state.workspace = workspace;
    if (state.page === "workspace") render();
  } catch (error) {
    state.workspaceError = error.message;
    if (state.page === "workspace") render();
  }
}

async function hydrateAgents(options = {}) {
  state.agentsError = null;
  if (options.showLoading || !state.agents) state.agentsLoading = true;
  if (state.page === "agents") render();
  try {
    const responses = await Promise.all([
      fetch("/api/harness-accounts"),
      fetch("/api/agent-profiles"),
      fetch("/api/agent-assignments"),
      fetch("/api/agent-models"),
      fetch("/api/agent-models?provider=opencode"),
      fetch("/api/agent-tasks"),
      fetch("/api/health")
    ]);
    const payloads = await Promise.all(responses.map(response => response.json()));
    const failedIndex = responses.findIndex(response => !response.ok);
    if (failedIndex >= 0) throw new Error(payloads[failedIndex].error || "Could not load Agent configuration.");
    state.agents = {
      harnessAccounts: payloads[0].harnessAccounts || [],
      agentProfiles: payloads[1].agentProfiles || [],
      agentAssignments: payloads[2].agentAssignments || [],
      models: payloads[3].models || [],
      opencodeModels: payloads[4].models || [],
      agentTasks: payloads[5].agentTasks || []
    };
    state.operationalHealth = payloads[6];
  } catch (error) {
    state.agentsError = error.message;
  } finally {
    state.agentsLoading = false;
    if (state.page === "agents") render();
  }
}

async function reconcileOperations() {
  const button = document.querySelector("[data-operations-reconcile]");
  if (button) button.disabled = true;
  try {
    const response = await fetch("/api/operations/reconcile", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Operational reconciliation failed.");
    await hydrateAgents();
    toast(`Reconciliation complete · ${result.automaticReplays || 0} actions replayed`, "success");
  } catch (error) {
    if (button) button.disabled = false;
    toast(error.message, "error");
  }
}

async function hydrateGoogleSheetsStatus() {
  try {
    const response = await fetch("/api/google/oauth/status");
    const status = await response.json();
    if (!response.ok) throw new Error(status.error || "Could not inspect Google Sheets settings.");
    state.googleSheetsStatus = status;
    if (state.page === "integrations" || state.page === "workspace") render();
  } catch (error) {
    state.googleSheetsStatus = { configured: false, connected: false, missing: [error.message] };
    if (state.page === "integrations") render();
  }
}

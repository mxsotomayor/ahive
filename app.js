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
  layers: '<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>'
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
      <aside class="sidebar">
        <button class="brand" data-nav="dashboard" aria-label="Maxwell home"><span class="brand-symbol"><i></i><i></i><i></i></span><span>maxwell</span></button>
        <nav class="main-nav" aria-label="Main navigation">
          <button class="nav-item ${state.page === "dashboard" ? "active" : ""}" data-nav="dashboard">${icon("grid")}<span>Overview</span></button>
          <button class="nav-item ${state.page === "issues" ? "active" : ""}" data-nav="issues">${icon("inbox")}<span>My issues</span><b>${state.issues.filter(i => i.status !== "done").length}</b></button>
          <button class="nav-item ${state.page === "workspace" ? "active" : ""}" data-nav="workspace">${icon("layers")}<span>Workspace</span></button>
          <button class="nav-item ${state.page === "integrations" ? "active" : ""}" data-nav="integrations">${icon("plug")}<span>Integrations</span></button>
        </nav>
        <div class="sidebar-spacer"></div>
        <div class="sync-card"><span class="sync-light"></span><div><strong>${connectedSources.length ? `${connectedSources.length} source${connectedSources.length > 1 ? "s" : ""} connected` : "Local prototype ready"}</strong><small>${connectedSources.length ? `${syncedIssueCount} assigned issues synced` : "Add a source token to sync"}</small></div></div>
        <nav class="utility-nav">
          <button class="nav-item" data-toast="Notifications are all caught up">${icon("bell")}<span>Notifications</span><span class="notification-dot"></span></button>
          <button class="nav-item" data-toast="Settings will be added with authentication">${icon("settings")}<span>Settings</span></button>
        </nav>
        <div class="profile"><span class="avatar">NM</span><div><strong>Nuno Monteiro</strong><small>Workspace owner</small></div><button aria-label="Profile options">•••</button></div>
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
    ${topbar("Good morning, Nuno", "Friday, July 17")}
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
  if (state.workspaceError) return layout(`${topbar("Workspace", "Organizations, Projects, Products, and Sources", false)}<section class="content-wrap"><div class="workspace-error"><h2>Workspace could not be loaded</h2><p>${clean(state.workspaceError)}</p><button class="secondary-button" data-workspace-refresh>${icon("sync")} Try again</button></div></section>`);
  if (!state.workspace) return layout(`${topbar("Workspace", "Organizations, Projects, Products, and Sources", false)}<section class="content-wrap"><div class="workspace-loading">${icon("sync")} Loading workspace...</div></section>`);

  const workspace = state.workspace;
  return layout(`
    ${topbar("Workspace", "Organizations, Projects, Products, and Sources", false)}
    <section class="content-wrap workspace-page">
      <div class="workspace-intro"><div><span class="truth-badge">Neutral hierarchy</span><h2>Structure your work.</h2><p>Sources belong to Products. Deactivate records safely without breaking Issue history.</p></div><button class="primary-button compact-button" data-workspace-create="organization">${icon("plus")} Add organization</button></div>
      <section class="workspace-metrics">
        ${workspaceMetric("Organizations", workspace.organizations.length)}
        ${workspaceMetric("Projects", workspace.projects.length)}
        ${workspaceMetric("Products", workspace.products.length)}
        ${workspaceMetric("Product sources", workspace.productSources.length)}
      </section>
      <div class="workspace-section-heading"><div><h2>Hierarchy</h2><p>Organization → Project → Product → Product Sources</p></div></div>
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
  return `<section class="project-card ${project.active ? "" : "inactive"}">
    <header class="entity-header compact"><div class="entity-symbol project-symbol">PR</div><div><span class="entity-kind">Project</span><h3>${clean(project.name)}</h3><p>${products.length} product${products.length === 1 ? "" : "s"}${project.key ? ` · ${clean(project.key)}` : ""}</p></div><span class="entity-state ${project.active ? "" : "inactive"}">${project.active ? "Active" : "Inactive"}</span><div class="entity-actions"><button class="icon-button small" data-workspace-edit="project" data-entity-id="${clean(project.id)}" aria-label="Edit ${clean(project.name)}">${icon("settings")}</button><button class="secondary-button" data-workspace-create="product" data-parent-id="${clean(project.id)}">${icon("plus")} Product</button></div></header>
    <div class="product-grid">${products.length ? products.map(productCard).join("") : `<div class="child-empty">No Products in this Project yet.</div>`}</div>
  </section>`;
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
  const labels = { organization: "Organization", project: "Project", product: "Product", connectorAccount: "Connector Account", productSource: "Product Source" };
  const label = labels[type];
  const fields = workspaceEntityFields(type, entity, parentId);
  return `<div class="overlay visible" data-action="close-overlay"></div><div class="modal workspace-modal visible" role="dialog" aria-modal="true" aria-labelledby="workspace-modal-title"><header><div><p class="eyebrow">WORKSPACE STRUCTURE</p><h2 id="workspace-modal-title">${isEdit ? "Edit" : "Add"} ${label}</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close modal">${icon("close")}</button></header><form id="workspace-entity-form" data-entity-type="${type}" data-entity-id="${clean(entity?.id || "")}">${fields}<label class="active-control"><input name="active" type="checkbox" ${entity?.active === false ? "" : "checked"}/><span>Active and available for new work</span></label><div class="modal-footer"><p>Changes are stored locally in the neutral workspace.</p><div><button type="button" class="ghost-button" data-action="close-overlay">Cancel</button><button class="primary-button" type="submit">${icon(isEdit ? "check" : "plus")} ${isEdit ? "Save changes" : `Add ${label}`}</button></div></div></form></div>`;
}

function workspaceEntityFields(type, entity, parentId) {
  if (type === "organization") return `<label>Name<input name="name" required value="${clean(entity?.name || "")}" placeholder="Zing Developers" /></label><label>Organization type<select name="type">${optionList(["employer", "client", "partner", "institution"], entity?.type || "employer")}</select></label>`;
  if (type === "project") {
    const organizationId = entity?.organizationId || parentId || state.workspace.organizations[0]?.id;
    return `${entity ? readonlyParent("Organization", state.workspace.organizations.find(item => item.id === organizationId)?.name) : selectField("Organization", "organizationId", state.workspace.organizations, organizationId)}<label>Name<input name="name" required value="${clean(entity?.name || "")}" placeholder="IRN" /></label><div class="form-grid"><label>Key<input name="key" value="${clean(entity?.key || "")}" placeholder="irn" /></label></div><label>Description<textarea name="description" rows="3" placeholder="Optional context">${clean(entity?.description || "")}</textarea></label>`;
  }
  if (type === "product") {
    const projectId = entity?.projectId || parentId || state.workspace.projects[0]?.id;
    return `${entity ? readonlyParent("Project", state.workspace.projects.find(item => item.id === projectId)?.name) : selectField("Project", "projectId", state.workspace.projects, projectId)}<label>Name<input name="name" required value="${clean(entity?.name || "")}" placeholder="IRN" /></label><div class="form-grid"><label>Key<input name="key" value="${clean(entity?.key || "")}" placeholder="irn" /></label></div><label>Description<textarea name="description" rows="3" placeholder="Optional context">${clean(entity?.description || "")}</textarea></label>`;
  }
  if (type === "connectorAccount") {
    const provider = entity?.provider || "gitlab";
    const refs = entity?.credentialReferences || {};
    return `<label>Provider${entity ? `<input value="${clean(sourceInfo[provider]?.label || provider)}" readonly /><input name="provider" type="hidden" value="${clean(provider)}" />` : `<select name="provider" data-provider-select>${optionList(["gitlab", "github", "openproject", "sheets", "excel"], provider, value => sourceInfo[value]?.label || value)}</select>`}</label><label>Account name<input name="displayName" required value="${clean(entity?.displayName || "")}" placeholder="Google Sheets · Zing" /></label><div data-provider-generic ${provider === "sheets" ? "hidden" : ""}><label>Base URL<input name="baseUrl" type="url" value="${clean(entity?.baseUrl || "")}" placeholder="https://gitlab.example.com" />${entity ? `<small>The URL can change only while this account has no Product Sources.</small>` : ""}</label><label>Credential environment variable<input name="credentialReference" value="${clean(entity?.credentialReference || "")}" placeholder="GITLAB_TOKEN" pattern="[A-Z][A-Z0-9_]*" /><small>Enter only the variable name. Put its secret value in <code>.env</code>.</small></label></div><div data-provider-sheets ${provider === "sheets" ? "" : "hidden"}><label>OAuth client ID variable<input name="clientIdReference" value="${clean(refs.clientId || "GOOGLE_CLIENT_ID")}" pattern="[A-Z][A-Z0-9_]*" /></label><label>OAuth client secret variable<input name="clientSecretReference" value="${clean(refs.clientSecret || "GOOGLE_CLIENT_SECRET")}" pattern="[A-Z][A-Z0-9_]*" /></label><label>Optional refresh token variable<input name="refreshTokenReference" value="${clean(refs.refreshToken || "GOOGLE_REFRESH_TOKEN")}" pattern="[A-Z][A-Z0-9_]*" /><small>Normally Maxwell stores the refresh token locally after you authorize Google. Secret values are never stored in the workspace.</small></label></div>`;
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
  return `<div class="overlay visible" data-action="close-overlay"></div><aside class="drawer visible" role="dialog" aria-modal="true" aria-label="Issue details">
    <header><div>${sourceBadge(issue.source)}<span class="issue-key">${issue.id}</span></div><button class="icon-button" data-action="close-overlay" aria-label="Close details">${icon("close")}</button></header>
    <div class="drawer-body"><div class="drawer-title"><span class="priority-dot ${issue.priority}"></span><h2>${issue.title}</h2></div><p class="description">${issue.description}</p>
      <div class="drawer-actions"><button class="primary-button ${issue.status === "done" ? "completed" : ""}" data-complete="${issue.id}">${icon("check")} ${issue.status === "done" ? "Completed" : "Mark as done"}</button>${issue.sourceUrl ? `<a class="secondary-button" href="${issue.sourceUrl}" target="_blank" rel="noreferrer">Open in ${info.label} ${icon("external")}</a>` : `<button class="secondary-button" data-toast="Source links will activate with real integrations">Open in ${info.label} ${icon("external")}</button>`}</div>
      <section class="detail-section"><h3>Details</h3><dl><div><dt>Status</dt><dd><span class="status-pill ${issue.status}">${statusLabel(issue.status)}</span></dd></div><div><dt>Priority</dt><dd class="capitalize">${issue.priority}</dd></div><div><dt>Project</dt><dd>${issue.project}</dd></div><div><dt>Due date</dt><dd class="${daysFromNow(issue.due) < 0 && issue.status !== "done" ? "danger-text" : ""}">${issue.due ? new Date(`${issue.due}T12:00:00`).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }) : "No due date"}</dd></div><div><dt>Assigned to</dt><dd><span class="mini-avatar">NM</span> Nuno Monteiro</dd></div></dl></section>
      <section class="detail-section"><h3>Labels</h3><div class="labels">${issue.labels.map(label => `<span>${label}</span>`).join("")}</div></section>
      <section class="source-trail"><span>${icon("sync")}</span><div><strong>${issue.source === "gitlab" ? "Canonical GitLab issue" : `Outbound copy in ${info.label}`}</strong><p>Last updated ${issue.updated}. ${issue.source === "gitlab" ? "GitLab is authoritative for this issue." : "Edit the linked GitLab issue to change canonical state."}</p></div></section>
    </div>
  </aside>`;
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
  app.innerHTML = state.page === "dashboard" ? dashboardPage() : state.page === "issues" ? issuesPage() : state.page === "workspace" ? workspacePage() : integrationsPageCanonical();
  document.getElementById("overlay-root").innerHTML = "";
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach(button => button.addEventListener("click", () => { state.page = button.dataset.nav; render(); window.scrollTo(0,0); }));
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
  document.querySelectorAll("[data-google-sheet-test]").forEach(button => button.addEventListener("click", () => testGoogleSheetSource(button.dataset.googleSheetTest, button)));
  document.querySelectorAll("[data-google-connect]").forEach(button => button.addEventListener("click", () => { window.location.href = "/api/google/oauth/start"; }));
  document.querySelectorAll("[data-workspace-refresh]").forEach(button => button.addEventListener("click", hydrateWorkspace));
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
function openAddModal() { document.getElementById("overlay-root").innerHTML = addIssueModal(); bindOverlayEvents(); setTimeout(() => document.querySelector("[name='title']")?.focus(), 50); }
function closeOverlay() { document.getElementById("overlay-root").innerHTML = ""; }
function bindOverlayEvents() {
  document.querySelectorAll("[data-action='close-overlay']").forEach(button => button.addEventListener("click", closeOverlay));
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

function openWorkspaceModal(type, entityId = null, parentId = null) {
  const collectionByType = { organization: "organizations", project: "projects", product: "products", connectorAccount: "connectorAccounts", productSource: "productSources" };
  const entity = entityId ? state.workspace?.[collectionByType[type]]?.find(item => item.id === entityId) : null;
  if (entityId && !entity) return toast("The workspace record could not be found.", "error");
  if (type === "project" && !state.workspace.organizations.length) return toast("Create an Organization first.", "error");
  if (type === "product" && !state.workspace.projects.length) return toast("Create a Project first.", "error");
  if (type === "productSource" && !state.workspace.connectorAccounts.length) return toast("Add a Connector Account before adding a Product Source.", "error");
  document.getElementById("overlay-root").innerHTML = workspaceEntityModal(type, entity, parentId);
  bindOverlayEvents();
  setTimeout(() => document.querySelector("#workspace-entity-form input:not([readonly])")?.focus(), 50);
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
  const resources = { organization: "organizations", project: "projects", product: "products", connectorAccount: "connector-accounts", productSource: "product-sources" };
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
  return ({ organization: "Organization", project: "Project", product: "Product", connectorAccount: "Connector Account", productSource: "Product Source" })[type] || "Record";
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

# Ahive Features and Roadmap

Status: **Living implementation checklist**  
Last updated: **2026-07-29**

A checked item is implemented and verified in the current prototype. Unchecked
items are not complete, even if preparatory code exists.

## Current priority: Agent MVP

Ahive's primary roadmap is now Agent management and supervised developer work.
The existing Issue workspace supplies Project, Product, Source, and task context
for Agents. Broader cross-provider Issue publication remains planned but is no
longer the next product milestone.

The executable backlog is maintained in
[`docs/ahive-tasks/`](ahive-tasks/README.md). Its milestone order is:

- [x] Reframe the product as a local-first developer work orchestration platform.
- [x] Accept Agent execution authority and safety boundaries (Task 002).
- [x] Accept the provider-neutral Agent domain model (Task 003).
- [x] Introduce transactional persistence without losing existing data (Tasks 004–006).
- [x] Register and safely inspect local Project repositories (Tasks 007–010).
  - [x] Persist Repository records and API operations (Task 007).
  - [x] Constrain paths to configured canonical roots (Task 008).
  - [x] Inspect verified Git repositories without mutation (Task 009).
  - [x] Build the responsive browser management flow (Task 010).
- [x] Manage Harness Accounts, Agent Profiles, and Assignments (Tasks 011–014).
  - [x] Persist credential-free Codex CLI Harness Accounts with runtime status (Task 011).
  - [x] Support standalone terminal installs, including the Windows npm CLI shim.
  - [x] Add reusable Agent Profiles (Task 012).
  - [x] Add Project-scoped Agent Assignments (Task 013).
  - [x] Build the Agent management surface (Task 014).
  - [x] Restrict Agent Profiles to a selectable eight-model OpenAI catalog.
- [x] Support conversational, streamed, cancellable Agent Tasks (Tasks 015–019).
  - [x] Keep the conversation surface mounted during Run and page-state refreshes.
  - [x] Stream Codex app-server Agent message deltas into the active chat bubble.
  - [x] Persist Agent Tasks, Conversations, and visible Messages (Task 015).
  - [x] Prove the Codex CLI process boundary with a sanitized live spike (Task 016).
  - [x] Implement durable chat-only Agent Runs (Task 017).
  - [x] Stream and cancel Agent Runs (Task 018).
  - [x] Build the Agent conversation UI (Task 019).
- [ ] Add approval-gated repository tools and isolated code work (Tasks 020–026).
  - [x] Add constrained read-only Repository tools with durable audit metadata (Task 020).
  - [ ] Add approvals, isolated worktrees, guarded edits, tests, artifacts, and review UI (Tasks 021–026).
- [ ] Connect Issues to Agent Tasks and explicit status write-back (Tasks 027–028).
- [ ] Complete recovery, security, and Agent MVP acceptance (Tasks 029–030).

### First Agent milestone

The first usable slice will let the user configure a Codex CLI-backed Agent,
assign it to a Project and verified local Repository, maintain a conversation,
and allow bounded read-only repository inspection. Code modification is a later,
approval-gated slice and must not be simulated in the UI.

## Done

### User interface

- [x] Responsive overview dashboard.
- [x] Unified issue list with search and source/status filters.
- [x] Kanban-style board view.
- [x] Issue detail drawer with external source link.
- [x] Due-date, priority, and status presentation.
- [x] Integration status screen.
- [x] Empty-state behavior with no dummy issues.
- [x] Browser hydration from the private local cache.

### GitLab prototype connector

- [x] Custom-hosted GitLab base URL support.
- [x] Token authentication without exposing the token to the browser.
- [x] Fetch issues assigned to the authenticated user across projects.
- [x] Offset and link-header pagination support.
- [x] Normalize status, priority, labels, dates, project path, and source URL.
- [x] Fetch open and closed assigned issues.
- [x] Create a GitLab issue through Ahive and assign it to the token owner.
- [x] Close and reopen the real GitLab issue from Ahive.
- [x] Live connection and data-fetch smoke test.

### Local data and safety

- [x] Atomically persist the current GitLab dataset to `data/issues.json`.
- [x] Ignore private cache and environment secrets in Git.
- [x] Remove historical dummy data from source and browser migration path.
- [x] Report outbound readiness without claiming that publishing occurred.
- [x] Automated tests for connectors, mappings, creation behavior, and cache.
- [x] Make SQLite the authoritative neutral workspace store.
- [x] Import the prior JSON store once with a recoverable backup and ID checks.
- [x] Apply ordered, idempotent schema migrations with database constraints.
- [x] Register Project-owned Repositories with optional same-Project Products.
- [x] Verify Repository paths against canonical allowed roots.
- [x] Inspect branch, HEAD, remote hosts, and aggregate dirty state read-only.

### GitHub foundation

- [x] GraphQL client for organization Project v2 items.
- [x] Assigned-user filtering and pagination.
- [x] Normalization of existing Project items.
- [x] Update an existing Project Status single-select value.

The GitHub foundation is not an active cross-system synchronization workflow.
Identity mapping and outbound creation are still required.

## Existing Issue foundation: remaining work

- [x] Persist Organizations.
- [x] Persist Projects owned by Organizations.
- [x] Persist Products inside Projects.
- [x] Allow a Product name to match its Project name.
- [x] Persist reusable Connector Accounts.
- [x] Configure imported GitLab containers as Product Sources.
- [x] Store connector capabilities on each Product Source.
- [x] Replace provider-shaped cache entries with neutral Issues.
- [x] Store `originProductSourceId` on every imported Issue.
- [x] Store stable origin and replica External Issue Links.
- [x] Enforce unique external identity per Product Source.
- [x] Enforce that Issue links target Sources from the same Product.
- [x] Migrate the 20 current GitLab issues without losing external identity.
- [x] Expose a read-only neutral workspace API.
- [x] Create and edit Organizations in the UI.
- [x] Create and edit Projects inside Organizations.
- [x] Create and edit Products inside Projects.
- [x] Create and edit Connector Accounts using credential references.
- [x] Create and edit Product Sources inside Products.
- [x] Remove unused Product Sources with user confirmation.
- [x] Block removal of Sources with Issue links and direct users to deactivate.
- [x] Activate and deactivate hierarchy and Source records without deletion.
- [x] Protect linked external container identities from unsafe edits.
- [ ] Add Organization, Project, Product, and Source filters to the Issue UI.
- [ ] Show origin and replica Sources on Issue details.
- [ ] Remove hard-coded global GitLab authority from UI and server routes.

### Definition of done

- The hierarchy `Organization -> Project -> Product -> Issue` is persisted.
- The IRN Product can hold multiple configured Sources.
- The core Issue contains no provider-specific identifiers.
- Every imported Issue has exactly one origin link.
- Two Issues with the same title can exist without collision.
- Known external identities update existing Issues on repeated pulls.
- Product-boundary constraints prevent cross-Product publication.
- Existing GitLab URLs and external identities survive migration.

This supporting milestone remains open because Issue filtering and
origin/replica details are not yet available in the Issue UI. It does not block
the initial read-only Agent milestone unless required for correct Agent context.

## Deferred supporting milestone: publish within a Product

- [ ] Select an Issue and target Sources from the same Product.
- [ ] Show a dry-run preview before external creation or bulk updates.
- [ ] Create an external representation and save it as a replica link.
- [ ] Update an existing replica instead of creating it again.
- [ ] Propagate complete and reopen actions to supported replicas.
- [ ] Persist Sync Runs and per-target results.
- [ ] Show partial failures with safe retry actions.
- [ ] Detect replica drift and expose conflicts.

## Supporting IRN Product Sources

### OpenProject

- [ ] Test the Accenture/IRN OpenProject connection.
- [ ] Configure its project as an IRN Product Source.
- [ ] Pull assigned work packages with stable external identities.
- [ ] Define status, priority, assignee, and due-date mappings.
- [ ] Implement idempotent outbound create and update.

### GitHub Projects

- [ ] Obtain approved credentials for the Zing organization.
- [ ] Configure the Zing GitHub Project as an IRN Product Source.
- [ ] Define how an origin Issue is represented in GitHub.
- [ ] Store GitHub item links and external versions.
- [ ] Implement idempotent replica creation and status updates.

### Google Sheets

- [x] Select Google Sheets as the first spreadsheet connector.
- [x] Read OAuth client ID and client secret securely from environment variables.
- [x] Implement one-time OAuth authorization with offline access and CSRF state.
- [x] Persist only the durable refresh token in a Git-ignored local token store.
- [x] Configure spreadsheet ID, worksheet tab, and default A1 range per Product Source.
- [x] Implement Product Source-scoped read, overwrite, append, and access-test routes.
- [x] Show configuration, authorization, redirect URI, and connection state in the UI.
- [x] Create and apply a formatted neutral issue-register template without dummy Issues.
- [ ] Define the row schema and include a stable Ahive ID column.
- [ ] Import existing rows without fuzzy title merging.
- [ ] Implement idempotent row upsert.
- [ ] Decide how direct spreadsheet edits affect canonical Issues.

### Excel

- [ ] Choose an Excel authentication and storage model when this connector is prioritized.

## Later

- [ ] Manual duplicate review and Issue merging.
- [ ] Scheduled synchronization.
- [ ] Export and backup for neutral Ahive data.
- [ ] Application login and encrypted credential storage.
- [ ] Multiple users and identity mapping per provider.
- [ ] Team views, notifications, and reminders.
- [ ] Audit history for canonical and external changes.
- [ ] Production deployment and monitoring.

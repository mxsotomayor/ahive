# Features and Roadmap

Status: **Living implementation checklist**  
Last updated: **2026-07-19**

A checked item is implemented and verified in the current prototype. Unchecked
items are not complete, even if preparatory code exists.

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
- [x] Create a GitLab issue through Maxwell and assign it to the token owner.
- [x] Close and reopen the real GitLab issue from Maxwell.
- [x] Live connection and data-fetch smoke test.

### Local data and safety

- [x] Atomically persist the current GitLab dataset to `data/issues.json`.
- [x] Ignore private cache and environment secrets in Git.
- [x] Remove historical dummy data from source and browser migration path.
- [x] Report outbound readiness without claiming that publishing occurred.
- [x] Automated tests for connectors, mappings, creation behavior, and cache.

### GitHub foundation

- [x] GraphQL client for organization Project v2 items.
- [x] Assigned-user filtering and pagination.
- [x] Normalization of existing Project items.
- [x] Update an existing Project Status single-select value.

The GitHub foundation is not an active cross-system synchronization workflow.
Identity mapping and outbound creation are still required.

## Next: Product-centered foundation

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

The milestone is still open because Issue filtering and origin/replica details
are not yet available in the Issue UI.

## Then: publish within a Product

- [ ] Select an Issue and target Sources from the same Product.
- [ ] Show a dry-run preview before external creation or bulk updates.
- [ ] Create an external representation and save it as a replica link.
- [ ] Update an existing replica instead of creating it again.
- [ ] Propagate complete and reopen actions to supported replicas.
- [ ] Persist Sync Runs and per-target results.
- [ ] Show partial failures with safe retry actions.
- [ ] Detect replica drift and expose conflicts.

## IRN Product Sources

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
- [ ] Define the row schema and include a stable Maxwell ID column.
- [ ] Import existing rows without fuzzy title merging.
- [ ] Implement idempotent row upsert.
- [ ] Decide how direct spreadsheet edits affect canonical Issues.

### Excel

- [ ] Choose an Excel authentication and storage model when this connector is prioritized.

## Later

- [ ] Manual duplicate review and Issue merging.
- [ ] Scheduled synchronization.
- [ ] Export and backup for neutral Maxwell data.
- [ ] Application login and encrypted credential storage.
- [ ] Multiple users and identity mapping per provider.
- [ ] Team views, notifications, and reminders.
- [ ] Audit history for canonical and external changes.
- [ ] Production deployment and monitoring.

# Architecture

Status: **Current and target architecture**  
Last updated: **2026-07-19**

## Current prototype

### Technology

| Layer | Current technology |
| --- | --- |
| Browser UI | HTML, CSS, and vanilla JavaScript |
| Local server | Node.js 18+ built-in HTTP server |
| Provider API | Native `fetch`; official `googleapis` client for Google Sheets |
| Neutral local persistence | Versioned atomic JSON at `data/maxwell.json` |
| Legacy migration input | JSON file at `data/issues.json` |
| Browser cache | `localStorage` |
| Configuration | Ignored `.env` file |
| Automated tests | Node's built-in test runner |
| Third-party runtime dependencies | `googleapis` |

Run locally with `pnpm dev`. Node watch mode automatically restarts the server
after backend changes. The application listens on `http://127.0.0.1:4173` by
default.

### Current modules

```text
index.html            Browser entry point
styles.css            Visual system and responsive layout
app.js                UI state, rendering, and API calls
server.mjs            Static server and local API routes
lib/gitlab.mjs        GitLab API adapter and normalization
lib/github.mjs        GitHub Projects API foundation
lib/google-sheets.mjs OAuth token boundary and Google Sheets read/write adapter
lib/local-store.mjs   Atomic JSON cache operations
lib/neutral-store.mjs Neutral entities, constraints, migration, and projections
test/                  Connector and cache tests
data/maxwell.json      Ignored private neutral store
data/issues.json       Ignored legacy migration input
data/google-oauth.json Ignored private Google refresh-token store
```

### Current API routes

| Method | Route | Current behavior |
| --- | --- | --- |
| `GET` | `/api/gitlab/sync` | Fetch assigned GitLab issues and replace local cache |
| `POST` | `/api/gitlab/issues` | Create and assign an issue in GitLab, then cache it |
| `PATCH` | `/api/gitlab/status` | Close or reopen GitLab issue, then update cache |
| `GET` | `/api/local/issues` | Read local canonical cache |
| `GET` | `/api/local/workspace` | Read neutral entities and relationships |
| `POST` | `/api/workspace/:resource` | Create a managed workspace entity |
| `PATCH` | `/api/workspace/:resource/:id` | Edit or activate/deactivate an entity |
| `DELETE` | `/api/workspace/product-sources/:id` | Remove an unused Product Source |
| `POST` | `/api/sync/outbound` | Report target readiness; publishes nothing yet |
| `GET` | `/api/github/sync` | Read assigned GitHub Project items |
| `PATCH` | `/api/github/status` | Update an existing GitHub Project Status field |
| `GET` | `/api/google/oauth/status` | Report safe OAuth configuration and connection status |
| `GET` | `/api/google/oauth/start` | Start Google consent with a one-time CSRF state |
| `GET` | `/api/google/oauth/callback` | Exchange the authorization code and store a refresh token |
| `GET` | `/api/google/sheets/:sourceId/test` | Verify access to one configured spreadsheet |
| `GET` | `/api/google/sheets/:sourceId/values` | Read the configured worksheet tab |
| `PUT` | `/api/google/sheets/:sourceId/values` | Overwrite values within the configured worksheet tab |
| `POST` | `/api/google/sheets/:sourceId/append` | Append rows within the configured worksheet tab |
| `POST` | `/api/google/sheets/:sourceId/template` | Apply the neutral issue-register headers, validation, and formatting |

### Verified current state

- The custom GitLab instance authenticates successfully.
- A live sync fetched and cached 20 assigned issues on 2026-07-17.
- Dummy data has been removed.
- The existing private GitLab cache has been migrated to 20 neutral Issues and
  20 origin External Issue Links under the IRN Product.
- Twenty-three automated tests cover connectors, paging, writes, neutral hierarchy,
  stable import identity, Product boundaries, and persistence.

### Google credential boundary

The Google Connector Account stores environment-variable names, never secret
values. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` identify the OAuth web
client; user authorization supplies the refresh token required for unattended
read/write access. The server retains OAuth state in memory for ten minutes and
stores only the refresh token and non-secret timestamps on disk. Product Sources
hold the spreadsheet ID, worksheet tab, and default A1 range, keeping credentials
reusable while limiting each operation to a configured Source.

## Prototype constraints

The current implementation predates the accepted neutral model:

1. GitLab is still described as globally canonical in parts of the active UI.
2. The UI consumes a compatibility projection instead of the neutral model
   directly.
3. Permanent deletion is limited to Product Sources with no External Issue
   Links; parent reassignment remains unavailable.
4. Outbound synchronization reports readiness but does not publish.
5. There is no durable Sync Run or Conflict storage.
6. The GitHub client is not connected to neutral identity mapping or publishing.
7. Atomic JSON validation enforces relationships in one process; a later
   transactional database will be needed for multi-process or hosted operation.

These constraints are migration work, not principles to preserve.

## Target architecture

```text
Maxwell UI
  |
Application API
  |
Core domain
  |-- Organization -> Project -> Product -> Issue
  |-- Product Source and External Issue Link
  |-- Sync Run and Conflict
  |
Synchronization planner and executor
  |-- GitLab adapter
  |-- GitHub adapter
  |-- OpenProject adapter
  `-- Spreadsheet adapter
  |
Neutral persistence
```

### Core domain

Contains provider-independent entities, hierarchy validation, normalized values,
origin/replica roles, and Product-boundary rules. It must not import provider
clients.

### Connector adapters

Authenticate, enumerate external containers, fetch external items, normalize
data, and apply supported writes. Adapters do not decide Product membership or
Issue authority.

```text
capabilities()
testConnection()
listContainers()
pullIssues(productSource, cursor?)
createIssue(productSource, canonicalIssue)
updateIssue(externalLink, canonicalIssue, changedFields)
completeIssue(externalLink)
reopenIssue(externalLink)
```

Every write returns structured results, its stable external identity, and
external version information.

### Synchronization engine

The engine operates inside one Product at a time. It imports from a Product
Source, resolves representations by stable identity, creates neutral Issues with
origin links, publishes to selected Sources of the same Product, stores replica
links, and records per-target results. Automatic title-based merging is outside
the initial engine.

### Persistence

The prototype now stores neutral domain records in a versioned atomic JSON file.
Repository validation enforces relationships, one origin per Issue, unique
external identity, and Product boundaries. SQLite remains the leading candidate
for a later multi-process or hosted version but is not yet accepted.

### UI

The Workspace screen presents and manages the Organization, Project, Product,
Connector Account, and Product Source hierarchy. Issue representation details,
Sync Runs, and conflicts remain future UI work.

## Synchronization safety rules

1. Pulling is separate from publishing.
2. A target Product Source must belong to the Issue's Product.
3. Every imported Issue records one origin Source.
4. Every write requires an external link or an explicit create plan.
5. Created representations are linked before another publication attempt.
6. Titles are never sufficient identity keys.
7. Partial failures are recorded per representation.
8. Readiness reports `published: 0` when no external write ran.
9. Secrets and full private payloads are not written to ordinary logs.

## Migration direction

1. **Done:** introduce versioned neutral persistence beside the legacy cache.
2. **Done:** create Zing Developers, the IRN Project, and the IRN Product.
3. **Done:** configure the existing GitLab container as an IRN Product Source.
4. **Done:** migrate cached GitLab items with GitLab origin links.
5. Route all GitLab actions through origin links rather than global authority.
6. Replace provider-specific UI filters with hierarchy and Source filters.
7. Add a second IRN Product Source and explicit replica publication.
8. Retire the compatibility projection after the UI reads the neutral model.

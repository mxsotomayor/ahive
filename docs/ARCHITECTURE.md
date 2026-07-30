# Ahive Architecture

Status: **Current and target architecture**  
Last updated: **2026-07-29**

## Accepted direction

Ahive is evolving the current Maxwell issue-management prototype into a
local-first developer work orchestration system. The existing neutral Issue and
Source model remains a supporting work-context subsystem. The new primary
architecture will manage Agent configuration, Project repositories,
conversations, supervised Runs, approvals, and reviewable outcomes.

Agent execution is implemented through the user's local Codex CLI, with durable
Runs, sanitized SSE events, cancellation, and a persisted browser conversation.
Repository access is read-only by default; guarded-write Assignments may use an
approved isolated worktree, exact file operations, and configured verification
commands. Bounded review evidence is persisted outside primary rows and shown in
the full-screen conversation. External writes remain unavailable. The transition is tracked in
[`docs/ahive-tasks/`](ahive-tasks/README.md).

## Current prototype

### Technology

| Layer | Current technology |
| --- | --- |
| Browser UI | HTML, CSS, and vanilla JavaScript |
| Local server | Node.js 22+ built-in HTTP server |
| Provider API | Native `fetch`; official `googleapis` client for Google Sheets |
| Neutral local persistence | Transactional SQLite at `data/ahive.db` |
| Legacy migration input | JSON file at `data/issues.json` |
| Browser cache | `localStorage` |
| Configuration | Ignored `.env` file |
| Automated tests | Node's built-in test runner |
| Third-party runtime dependencies | `googleapis`, `better-sqlite3` |

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
lib/database.mjs      SQLite connection policy and ordered schema migrations
lib/sqlite-neutral-store.mjs Relational neutral-store adapter
lib/legacy-neutral-import.mjs Restart-safe JSON cutover and integrity checks
lib/repository-paths.mjs Canonical Repository root policy
lib/git-inspection.mjs Bounded read-only Git metadata inspection
test/                  Connector and cache tests
data/ahive.db           Ignored private authoritative neutral store
data/maxwell.json      Retained ignored JSON migration source
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
| `POST` | `/api/repositories/:id/verify` | Verify a stored Repository path against configured roots |
| `GET` | `/api/repositories/:id/inspect` | Read bounded Git metadata for a verified Repository |
| `GET`, `POST` | `/api/harness-accounts` | List safely projected or create Harness Accounts |
| `PATCH`, `DELETE` | `/api/harness-accounts/:id` | Update or remove an unused Harness Account |
| `GET`, `POST` | `/api/agent-profiles` | List or create reusable Agent Profiles |
| `PATCH`, `DELETE` | `/api/agent-profiles/:id` | Update or remove an unused Agent Profile |
| `GET` | `/api/agent-models` | List the fixed OpenAI model catalog accepted by Agent Profiles |
| `GET`, `POST` | `/api/agent-assignments` | List effective contexts or create Project-scoped Assignments |
| `PATCH`, `DELETE` | `/api/agent-assignments/:id` | Update or remove an unused Agent Assignment |
| `GET` | `/api/issues/:id/agent-work` | Project read-only Issue context, compatible Assignments, and linked Task summaries |
| `GET`, `POST` | `/api/agent-tasks` | List or create durable Agent Tasks with one Conversation |
| `GET` | `/api/agent-tasks/:id` | Read one Agent Task and its Conversation summary |
| `GET`, `POST` | `/api/agent-tasks/:id/messages` | Page or append visible Conversation Messages |
| `GET`, `POST` | `/api/agent-tasks/:id/runs` | List Runs or execute one bounded chat-only turn |
| `GET` | `/api/agent-tasks/:id/repository/tree` | Lazily list one safe directory for the Task Repository explorer |
| `GET` | `/api/agent-tasks/:id/repository/file` | Preview up to 200 lines of one safe Task Repository text file |
| `GET` | `/api/agent-runs/:id/events` | Stream ordered sanitized Run events with SSE cursor replay |
| `POST` | `/api/agent-runs/:id/cancel` | Abort an active Run and persist cancellation |
| `GET`, `POST` | `/api/agent-runs/:id/approvals` | List or create exact-target Approval Requests |
| `POST` | `/api/agent-runs/:runId/approvals/:id/decision` | Approve or deny a pending request with an actor |
| `POST` | `/api/agent-runs/:runId/approvals/:id/cancel` | Cancel an unresolved Approval Request |
| `GET`, `POST` | `/api/agent-runs/:id/worktree` | Read or create the Run's approved managed worktree |
| `GET` | `/api/managed-worktrees/:id/inspect` | Reconcile one worktree's presence, HEAD, and dirty state |
| `POST` | `/api/managed-worktrees/:id/retain` | Retain a worktree and release its active modification lock |
| `POST` | `/api/managed-worktrees/:id/discard` | Explicitly discard the exact confirmed worktree target |
| `POST` | `/api/agent-runs/:id/guarded-write/apply-patch` | Apply one approved exact-context text patch inside the Run worktree |
| `POST` | `/api/agent-runs/:id/guarded-write/create-file` | Create one approved text file inside an existing worktree directory |
| `GET` | `/api/agent-runs/:id/file-changes` | Read ordered paths, hashes, byte counts, and guarded-write outcomes |
| `GET`, `PUT` | `/api/repositories/:id/verification-commands` | Read or replace exact immutable Repository command policies |
| `POST` | `/api/agent-runs/:id/verifications/:policyId` | Consume exact approval and execute one configured policy in the Run worktree |
| `GET` | `/api/agent-runs/:id/artifacts[/:artifactId]` | List Run-scoped Artifact metadata or read integrity-checked bounded content |
| `GET`, `POST` | `/api/agent-runs/:id/review` | Load consolidated Run evidence or record a review-only disposition |
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
- The automated suite covers connectors, paging, writes, neutral
  hierarchy, stable import identity, SQLite constraints and serialization,
  Repository boundaries, safe paths, non-mutating Git inspection, Harness
  Account validation, Agent configuration and conversation UI rendering,
  responsive navigation, constrained Repository tools, the stdio MCP boundary,
  adversarial path/content attempts, secret-leak prevention, the Repository
  explorer, and durable single-use approval transitions.
- The runtime now presents both the legacy Issue workspace and the new Agent
  configuration surface.
- Repository persistence, verification, browser management, read-only Git
  inspection, the Codex CLI Harness boundary, reusable Agent Profiles, and
  Project-scoped Agent Assignments, durable Agent Tasks, Conversations, and
  visible Messages, durable chat-only Agent Runs, streaming, cancellation, and
  the full-screen browser conversation and Repository explorer, bounded
  read-only Repository tools, durable Approval Requests, isolated managed Git
  worktrees, guarded patch/create-file tools, and exact approved verification
  command execution, bounded Run Artifacts, the Run Review drawer, and the
  Issue-to-Agent workflow are implemented.

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
7. The Repository management UI and Agent Task file explorer are implemented;
   final wide/narrow visual acceptance remains a manual check.
8. The server has an in-process Run coordinator, reconnectable SSE stream, and
   cancellation, durable approvals, and startup worktree reconciliation, but no
   durable background runner yet.
9. The monolithic browser application will need clearer module boundaries as
    conversational and Run state are added.

These constraints are migration work, not principles to preserve.

## Target Ahive architecture

```text
Ahive UI
  |
Application API
  |
Work context domain
  |-- Organization -> Project -> Product -> Issue
  |-- Project -> registered Repository
  `-- Product Source and External Issue Link
  |
Agent domain
  |-- Harness Account -> Agent Profile -> Assignment
  |-- Agent Task -> Conversation -> Message
  `-- Agent Run -> Approval and Artifact
  |
Run coordinator and event stream
  |-- OpenAI harness adapter
  |-- repository policy and read tools
  `-- isolated execution backend
  |
Issue synchronization engine
  |-- GitLab adapter
  |-- GitHub adapter
  |-- OpenProject adapter
  `-- Spreadsheet adapter
  |
Transactional local persistence + private artifact storage
```

The target separates three concepts that must not be collapsed into a single
provider field:

1. **Harness:** orchestrates an Agent Run.
2. **Model provider and model:** produces model responses.
3. **Execution backend:** provides the approved repository workspace and tools.

OpenAI is the intended first Harness/model provider. The domain and persistence
contracts remain adapter-neutral.

Harness Accounts are stored separately from Issue Connector Accounts. The first
validated adapter is `codex-cli` with `codex_session` authentication. A bounded
local probe runs `codex --version` and `codex login status`; API projections
expose only installation, authentication, version, and readiness state. Ahive
does not copy Codex's cached credentials and does not call OpenAI REST APIs.
No model invocation occurs in this layer.

The executable defaults to `codex` resolved from the server process `PATH` and
can be overridden with `AHIVE_CODEX_EXECUTABLE`. On Windows, native `.exe`
installations run directly. An npm-installed `codex.cmd` shim is resolved to
the package's `@openai/codex/bin/codex.js` entrypoint and launched with Ahive's
Node runtime. Ahive never sends CLI arguments through `cmd.exe` or a shell.

Agent Profiles persist reusable presentation, traits, operational instructions,
Harness Account selection, model identifier, model settings, and an optional
default tool-policy reference. They deliberately contain no Project,
Repository-path, or Issue context.

Agent Assignments bind one Profile to one Project and optionally narrow it to a
same-Project Product and verified Repository. Their effective-context projection
combines those references with Assignment-specific instructions without
changing the Profile. The Profile/Project/Product/Repository tuple is unique.

### Core domain

Contains provider-independent entities, hierarchy validation, normalized values,
origin/replica roles, and Product-boundary rules. It must not import provider
clients.

### Agent orchestration

The Agent layer will bind reusable Profiles to explicit Project context. A
Conversation is not an execution permission. Repository and external-system
writes require durable, narrowly scoped approvals and observable Run events.

The current milestone is conversational and read-only: register one Repository,
assign one Codex CLI-backed Agent, and maintain a Project-scoped conversation.
A required per-Run stdio MCP server exposes only bounded file listing, literal
text search, bounded text reads, and Git summaries. The built-in shell, web,
image, and multi-agent tools are disabled; the read-only sandbox remains active.
Each tool resolves the verified Repository ID again from SQLite and emits safe
console and durable Run audit metadata. Repository writes remain unavailable.

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

The prototype stores neutral domain records in a versioned SQLite database.
Domain validation and relational constraints enforce relationships, one origin
per Issue, unique external identity, and Product boundaries. Ordered migrations
are recorded transactionally. The retained JSON file and content-addressed
backup provide a rollback-safe source; the importer is restart-safe and
preserves stable IDs. See [decision 0015](decisions/0015-transactional-sqlite-persistence.md).

### UI

The Workspace screen presents and manages the Organization, Project, Product,
Connector Account, Product Source, and Project Repository hierarchy. The Agents
screen manages Harness Accounts, reusable Profiles, scoped Assignments, durable
Tasks, and full-screen conversations. A Repository drawer previews safe files;
a Run Review drawer presents activity, approvals, exact changed paths, worktree
disposition, tests, bounded artifacts, and review-only decisions. Issue
drawers start Product-compatible Agent Tasks, list all linked Task/Run states,
and navigate bidirectionally between Issue and conversation. Sync Runs,
representation management, and conflicts remain future UI work.

## Accepted Agent safety boundaries

The constitution and [decision 0012](decisions/0012-agent-execution-authority-and-safety.md)
require these architectural boundaries:

1. Runs reference registered Repository IDs, never arbitrary request paths.
2. Repository access begins read-only.
3. Conversation and execution are separate state transitions.
4. Modifying work occurs in an isolated workspace.
5. Code and external-system writes are explicit and observable.
6. Existing uncommitted user changes are preserved.
7. Secrets and hidden reasoning do not enter ordinary messages or logs.
8. Runs support limits, cancellation, and accurate terminal states.
9. Read, write, command, Git, and external-system capabilities are independently scoped.
10. Interrupted mutating operations are not automatically replayed.

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

1. **Done:** introduce neutral Issue persistence and migrate the existing GitLab identities.
2. **Done:** manage Organizations, Projects, Products, Accounts, and Product Sources.
3. **Done:** establish secure Google Sheets OAuth and Product Source access.
4. **Done:** accept Agent execution authority and safety boundaries.
5. **Done:** accept the provider-neutral Agent domain model.
6. **Done:** introduce transactional local persistence without losing existing data.
7. **Done:** register, constrain, and safely inspect local Project repositories through the API.
8. **Done:** build the responsive Repository management UI.
9. **Done:** add credential-free Codex CLI Harness Account configuration.
10. **Done:** add reusable Agent Profiles.
11. **Done:** add Project-scoped Agent Assignments.
12. **Done:** build the Agent management UI.
13. **Done:** persist Agent Tasks and Conversations.
14. **Done:** prove the bounded Codex CLI process and JSONL contract.
15. **Done:** add chat-only Agent Runs through the local Codex CLI.
16. **Done:** stream Runs and support cancellation; production conversations
    use app-server stdio message deltas and reconnect-safe SSE snapshots.
17. **Done:** build the Agent conversation UI.
18. **Done:** add constrained read-only Repository tools.
19. **Done:** add a full-screen, read-only Repository explorer to Agent Tasks.
20. **Done:** add the durable Run approval model.
21. **Done:** add isolated Git worktrees.
22. **Done:** add guarded code editing inside managed worktrees.
23. **Done:** add approved test-command policies.
24. **Done:** persist bounded Run artifacts.
25. **Done:** complete the Run review UI.
26. **Done:** connect existing neutral Issues to scoped Agent Tasks.
27. **Done:** add explicit approved Issue status write-back.
28. **Done:** add Run recovery and operational visibility.
29. **Next:** execute the complete Agent MVP acceptance flow.
30. Resume broader replica publication and conflict work as supporting capabilities.

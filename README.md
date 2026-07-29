# Ahive

Ahive is a local-first developer work orchestration project. It is evolving the
existing Maxwell issue workspace into a place where configurable agents can use
Project, Product, Issue, and approved local-repository context to help the user
perform development work safely.

The current runtime combines the Maxwell issue-management UI with Ahive's
transactional workspace and verified Repository API. Agent execution behavior
is still planned and must not be inferred from the new product direction.

The shared product and engineering specification is the source for scope,
terminology, decisions, architecture, and feature status:

## [Open the Ahive specification](docs/README.md)

Key documents:

- [Constitution](docs/CONSTITUTION.md)
- [Product specification](docs/PRODUCT.md)
- [Domain model](docs/DOMAIN-MODEL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Features and roadmap](docs/FEATURES.md)
- [Decision records](docs/decisions/README.md)
- [Agent implementation backlog](docs/ahive-tasks/README.md)

## Run locally

Requirements: Node.js 22 or newer.

```powershell
pnpm dev
```

Open `http://127.0.0.1:4173`.

Development mode watches the server and its imported modules and automatically
restarts after backend changes. Refresh the browser after changing `app.js`,
`styles.css`, or `index.html`.

Use **Workspace** in the sidebar to create and edit Organizations, Projects,
Products, Connector Accounts, and Product Sources. Unused Product Sources can
be removed. Sources with Issue links, and other records with existing
relationships, must be deactivated so history remains intact.

Repository management is available inside each Project on the **Workspace**
screen. Configure one or more absolute allowed roots in `.env` before
verification:

```dotenv
AHIVE_REPOSITORY_ROOTS=E:\WORK;E:\TOOLS
```

The same operations remain available through the API: create with `POST
/api/workspace/repositories`, update or activate/deactivate with `PATCH
/api/workspace/repositories/:id`, verify with `POST
/api/repositories/:id/verify`, and inspect Git metadata with `GET
/api/repositories/:id/inspect`.

Use **Agents** in the sidebar to configure the local Codex CLI Harness, reusable
Agent Profiles, and Project-scoped Assignments. Ahive uses the local `codex` CLI
and its existing ChatGPT login. Run `codex login` if needed; Ahive neither calls
the OpenAI REST API directly nor stores an OpenAI API key. The same CRUD flows
are available at `/api/harness-accounts`, `/api/agent-profiles`, and
`/api/agent-assignments`. Agent Profile models are chosen from the fixed catalog
returned by `/api/agent-models`; arbitrary model text is not accepted.

The Codex CLI may be installed independently in the terminal; the VS Code
extension is not required. Ahive resolves `codex` from `PATH`. On Windows it
also safely supports the npm `codex.cmd` shim without invoking commands through
a shell. Set `AHIVE_CODEX_EXECUTABLE` to an absolute standalone CLI path when
multiple installations exist and PATH order selects the wrong one.

The **Agent Tasks** section in the Agents page creates durable Project-scoped
tasks and opens their conversations. Send a message to start a bounded local
Codex CLI turn, watch the visible answer stream into the open conversation,
use **Stop** to cancel an active turn, and reopen a Task to reload its persisted
transcript. Production conversations use `codex app-server` over local stdio so
Agent message deltas reach the browser without a direct OpenAI REST call. The context
sidebar always shows the Agent, Project, optional Product, Repository, and
Issue. A Repository-scoped Run receives exactly four server-controlled tools:
bounded file listing, literal text search, bounded text reads, and Git status/
diff summaries. The built-in shell, file changes, tests, web access, binary
content, and common secret files remain unavailable.

Run the development server in a visible terminal to trace Agent work:

```powershell
pnpm.cmd dev
```

Every lifecycle and repository-tool step is printed as one structured
`[agent-trace]` JSON line. Traces include Run IDs, tool names, safe request
metadata, result counts, durations, and outcomes. They deliberately omit prompt
text, file contents, command strings, credentials, and hidden reasoning. The
same bounded repository-tool activity is stored on the durable Agent Run.
Streaming trace lines report only cumulative output character counts, not the
assistant text itself.

The bounded CLI proof is reproducible with `pnpm spike:codex -- --live`. It is
opt-in because it consumes a real Codex turn. See
[the sanitized Harness findings](docs/CODEX-HARNESS-SPIKE.md). Production Agent
Runs are now available at `GET`/`POST /api/agent-tasks/:id/runs`. A POST may
include `{ "message": "..." }`; it executes a bounded chat-only turn and
persists the visible assistant reply on success. Streaming events are available
through `GET /api/agent-runs/:id/events`; reconnect with
`Last-Event-ID` or `?cursor=<sequence>`. Cancel an active Run with `POST
/api/agent-runs/:id/cancel`.

Install dependencies once with `pnpm install`.

## Verify

```powershell
cmd /c npm run check
cmd /c npm test
```

## Configuration and private data

Copy `.env.example` to `.env` and configure only the connectors you use. Never
commit `.env` or paste access tokens into documentation or chat.

The active neutral store is SQLite at `data/ahive.db`. It contains private
hierarchy, Issue, Product Source, External Issue Link, and Repository data and
is ignored by Git. The retained `data/maxwell.json` is the recoverable cutover
source, and `data/issues.json` is the older provider-shaped migration input.
See [persistence and recovery](docs/PERSISTENCE.md).

### Google Sheets read/write setup

Ahive uses Google OAuth 2.0 user authorization, not a service-account key.

1. In Google Cloud, enable the Google Sheets API, configure the OAuth consent
   screen, and create an OAuth client of type **Web application**.
2. Register this exact authorized redirect URI:
   `http://127.0.0.1:4173/api/google/oauth/callback`.
3. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`, then restart
   Ahive. Change `GOOGLE_REDIRECT_URI` in both places if the app uses another
   host or port.
4. In **Workspace**, create a Google Sheets Connector Account. Add a Product
   Source containing the spreadsheet ID from its URL, worksheet tab, and A1
   range.
5. In **Integrations**, select **Connect Google** and approve Sheets access.
   Return to Workspace and use the lightning button beside the Source to test
   access.

The client secret never reaches the browser. OAuth state is single-use and
expires after ten minutes. The durable refresh token is stored in the ignored
`data/google-oauth.json` file unless `GOOGLE_REFRESH_TOKEN` is supplied through
the environment. Read and write routes accept a Product Source ID and reject
ranges outside its configured worksheet tab.

## Current implementation note

The active runtime currently pulls assigned issues from a custom-hosted GitLab
instance and uses GitLab-first create, close, and reopen behavior. This is a
temporary implementation for the current IRN dataset and the inherited Maxwell
UI still focuses on Issues. See [decision 0011](docs/decisions/0011-ahive-agent-centered-product.md)
for the accepted Ahive direction and the
[ordered task backlog](docs/ahive-tasks/README.md) for implementation status.

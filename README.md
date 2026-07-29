# Maxwell Issues Tracker

Maxwell is a local prototype for managing assigned work across Organizations,
Projects, Products, and external issue platforms from one workspace.

The shared product and engineering specification is the source for scope,
terminology, decisions, architecture, and feature status:

## [Open the Maxwell specification](docs/README.md)

Key documents:

- [Constitution](docs/CONSTITUTION.md)
- [Product specification](docs/PRODUCT.md)
- [Domain model](docs/DOMAIN-MODEL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Features and roadmap](docs/FEATURES.md)
- [Decision records](docs/decisions/README.md)

## Run locally

Requirements: Node.js 18 or newer.

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

Install dependencies once with `pnpm install`.

## Verify

```powershell
cmd /c npm run check
cmd /c npm test
```

## Configuration and private data

Copy `.env.example` to `.env` and configure only the connectors you use. Never
commit `.env` or paste access tokens into documentation or chat.

The active neutral store is `data/maxwell.json`. It contains private hierarchy,
Issue, Product Source, and external-link data and is ignored by Git. The former
`data/issues.json` provider-shaped cache is also ignored and is used only as
one-time migration input when the neutral store has no Issues.

### Google Sheets read/write setup

Maxwell uses Google OAuth 2.0 user authorization, not a service-account key.

1. In Google Cloud, enable the Google Sheets API, configure the OAuth consent
   screen, and create an OAuth client of type **Web application**.
2. Register this exact authorized redirect URI:
   `http://127.0.0.1:4173/api/google/oauth/callback`.
3. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`, then restart
   Maxwell. Change `GOOGLE_REDIRECT_URI` in both places if the app uses another
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

The active prototype currently pulls assigned issues from a custom-hosted GitLab
instance and uses GitLab-first create, close, and reopen behavior. This is a
temporary implementation for the current IRN dataset, not the final origin and
replica model. See [decision 0005](docs/decisions/0005-gitlab-prototype-authority.md)
and [decision 0006](docs/decisions/0006-product-scoped-sources-and-issue-origin.md).

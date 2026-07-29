# 0010: Provider-Specific Credentials and Google OAuth

Status: **Accepted**  
Date: **2026-07-19**

## Context

Connector providers do not share one authentication shape. GitLab can use a base
URL and one private token, while Google Sheets OAuth requires a client ID, client
secret, redirect URI, user consent, and a durable refresh token. A spreadsheet,
worksheet tab, and range identify a Product Source rather than an account.

## Decision

Store provider-specific credential references on Connector Accounts. Store only
environment-variable names in neutral persistence; secret values remain in the
server environment. Google Sheets accounts reference `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, and optionally `GOOGLE_REFRESH_TOKEN`.

Use OAuth 2.0 Web Server authorization with the Sheets scope and offline access.
Protect the callback with a random, single-use, ten-minute state. By default,
persist only the returned refresh token and non-secret metadata in the ignored
`data/google-oauth.json` file. Never send the client secret or tokens to the
browser.

Store spreadsheet ID, worksheet tab, and default A1 range on each Google Sheets
Product Source. Resolve all read/write requests through that Source and reject a
requested range on another tab.

## Consequences

- The existing client ID and secret are now actively used, but user consent is
  still required before Sheets calls can succeed.
- One Google authorization can serve multiple Product Sources.
- Product Source configuration limits accidental access to another worksheet.
- The local token file is appropriate for this single-user prototype but is not
  an encrypted production credential vault.
- Other providers can add their own credential-reference shape without forcing a
  misleading universal token field.

## Follow-up

Define the canonical row schema and stable Maxwell ID column before importing or
publishing Issues. Move refresh tokens to an encrypted secret store before a
hosted or multi-user deployment.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendGoogleSheetValues,
  createGoogleAuthorizationUrl,
  createGoogleSheetIssueTemplate,
  GOOGLE_SHEETS_SCOPE,
  googleSheetsConnectionStatus,
  readGoogleSheetValues,
  saveGoogleOAuthTokens,
  writeGoogleSheetValues
} from "../lib/google-sheets.mjs";

const config = {
  clientId: "client-id.apps.googleusercontent.com",
  clientSecret: "client-secret",
  redirectUri: "http://127.0.0.1:4173/api/google/oauth/callback"
};

function mockGoogle() {
  const calls = { credentials: null, authorization: null, get: null, update: null, append: null, metadata: null, batchUpdate: null };
  class OAuth2 {
    generateAuthUrl(options) {
      calls.authorization = options;
      return "https://accounts.google.test/authorize";
    }
    setCredentials(credentials) { calls.credentials = credentials; }
  }
  const impl = {
    auth: { OAuth2 },
    sheets() {
      return {
        spreadsheets: {
          async get(input) {
            calls.metadata = input;
            return { data: { sheets: [{ properties: { sheetId: 7, title: "Tasks", gridProperties: { rowCount: 1000, columnCount: 26 } } }] } };
          },
          async batchUpdate(input) { calls.batchUpdate = input; return { data: {} }; },
          values: {
            async get(input) { calls.get = input; return { data: { range: input.range, values: [["Title"]] } }; },
            async update(input) { calls.update = input; return { data: { updatedCells: 2 } }; },
            async append(input) { calls.append = input; return { data: { updates: { updatedRows: 1 } } }; }
          }
        }
      };
    }
  };
  return { impl, calls };
}

test("requests offline Sheets access with a CSRF state", () => {
  const { impl, calls } = mockGoogle();
  const url = createGoogleAuthorizationUrl(config, "single-use-state", impl);
  assert.equal(url, "https://accounts.google.test/authorize");
  assert.equal(calls.authorization.access_type, "offline");
  assert.equal(calls.authorization.state, "single-use-state");
  assert.deepEqual(calls.authorization.scope, [GOOGLE_SHEETS_SCOPE]);
});

test("persists only the durable refresh token fields", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-google-"));
  const filePath = join(directory, "google-oauth.json");
  try {
    await saveGoogleOAuthTokens(filePath, {
      access_token: "short-lived-access-token",
      refresh_token: "durable-refresh-token",
      id_token: "identity-token",
      scope: GOOGLE_SHEETS_SCOPE
    });
    const raw = await readFile(filePath, "utf8");
    const stored = JSON.parse(raw);
    assert.equal(stored.refreshToken, "durable-refresh-token");
    assert.equal(raw.includes("short-lived-access-token"), false);
    assert.equal(raw.includes("identity-token"), false);
    const status = await googleSheetsConnectionStatus(config, filePath);
    assert.equal(status.connected, true);
    assert.equal(status.tokenSource, "local_secure_store");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("reads, updates, and appends rows with the configured refresh token", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-google-"));
  const filePath = join(directory, "google-oauth.json");
  try {
    await saveGoogleOAuthTokens(filePath, { refresh_token: "refresh-token" });
    const { impl, calls } = mockGoogle();
    const input = { spreadsheetId: "sheet_123-abc", range: "'Tasks'!A1:F20" };
    const read = await readGoogleSheetValues(config, filePath, input, impl);
    const written = await writeGoogleSheetValues(config, filePath, { ...input, values: [["Issue", "Done"]] }, impl);
    const appended = await appendGoogleSheetValues(config, filePath, { ...input, values: [["Next issue"]], valueInputOption: "RAW" }, impl);

    assert.deepEqual(calls.credentials, { refresh_token: "refresh-token" });
    assert.equal(read.range, input.range);
    assert.equal(calls.get.spreadsheetId, input.spreadsheetId);
    assert.equal(calls.update.valueInputOption, "USER_ENTERED");
    assert.deepEqual(calls.update.requestBody.values, [["Issue", "Done"]]);
    assert.equal(calls.append.valueInputOption, "RAW");
    assert.equal(calls.append.insertDataOption, "INSERT_ROWS");
    assert.equal(written.updatedCells, 2);
    assert.equal(appended.updates.updatedRows, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects malformed spreadsheet IDs and empty writes before calling Google", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-google-"));
  const filePath = join(directory, "google-oauth.json");
  try {
    await saveGoogleOAuthTokens(filePath, { refresh_token: "refresh-token" });
    const { impl } = mockGoogle();
    await assert.rejects(
      () => readGoogleSheetValues(config, filePath, { spreadsheetId: "https://docs.google.com/sheet", range: "Tasks!A:Z" }, impl),
      /valid Google spreadsheet ID/
    );
    await assert.rejects(
      () => writeGoogleSheetValues(config, filePath, { spreadsheetId: "sheet_123", range: "Tasks!A:Z", values: [] }, impl),
      /non-empty array of rows/
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("creates a formatted issue template without overwriting the first row", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-google-"));
  const filePath = join(directory, "google-oauth.json");
  try {
    await saveGoogleOAuthTokens(filePath, { refresh_token: "refresh-token" });
    const { impl, calls } = mockGoogle();
    const result = await createGoogleSheetIssueTemplate(config, filePath, {
      spreadsheetId: "sheet_123",
      sheetTab: "Tasks"
    }, impl);

    assert.equal(calls.update.range, "'Tasks'!A2:Q3");
    assert.equal(calls.update.requestBody.values[1][3], "Status");
    assert.equal(calls.batchUpdate.requestBody.requests[0].updateSheetProperties.properties.gridProperties.frozenRowCount, 3);
    assert.equal(result.columns, 17);
    assert.equal(result.preservedRows, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

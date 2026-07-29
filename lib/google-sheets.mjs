import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { google } from "googleapis";

export const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export class GoogleSheetsError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = "GoogleSheetsError";
    this.status = status;
    this.details = details;
  }
}

export function googleOAuthConfiguration(config = {}) {
  const missing = [];
  if (!config.clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!config.clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!config.redirectUri) missing.push("GOOGLE_REDIRECT_URI");
  return { configured: missing.length === 0, missing, redirectUri: config.redirectUri || null };
}

export function createGoogleOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function createGoogleAuthorizationUrl(config, state, googleImpl = google) {
  requireOAuthConfiguration(config);
  if (!state) throw new GoogleSheetsError("OAuth state is required.", 500);
  const client = createOAuthClient(config, googleImpl);
  return client.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: [GOOGLE_SHEETS_SCOPE],
    state
  });
}

export async function exchangeGoogleAuthorizationCode(config, code, googleImpl = google) {
  requireOAuthConfiguration(config);
  if (!String(code || "").trim()) throw new GoogleSheetsError("Google did not return an authorization code.", 400);
  try {
    const client = createOAuthClient(config, googleImpl);
    const { tokens } = await client.getToken(String(code));
    return tokens || {};
  } catch (error) {
    throw googleError("Could not exchange the Google authorization code", error, 401);
  }
}

export async function readGoogleOAuthStore(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return {
      version: 1,
      refreshToken: parsed.refreshToken || null,
      scope: parsed.scope || GOOGLE_SHEETS_SCOPE,
      connectedAt: parsed.connectedAt || null,
      updatedAt: parsed.updatedAt || null
    };
  } catch (error) {
    if (error.code === "ENOENT") return emptyTokenStore();
    if (error instanceof SyntaxError) throw new GoogleSheetsError("The local Google OAuth token store is invalid.", 500);
    throw error;
  }
}

export async function saveGoogleOAuthTokens(filePath, tokens) {
  const existing = await readGoogleOAuthStore(filePath);
  const refreshToken = tokens.refresh_token || existing.refreshToken;
  if (!refreshToken) {
    throw new GoogleSheetsError("Google did not return a refresh token. Reconnect and approve offline access.", 409);
  }
  const now = new Date().toISOString();
  const payload = {
    version: 1,
    refreshToken,
    scope: tokens.scope || existing.scope || GOOGLE_SHEETS_SCOPE,
    connectedAt: existing.connectedAt || now,
    updatedAt: now
  };
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, filePath);
  return payload;
}

export async function removeGoogleOAuthTokens(filePath) {
  await rm(filePath, { force: true });
  await rm(`${filePath}.tmp`, { force: true });
}

export async function googleSheetsConnectionStatus(config, tokenStorePath) {
  const configuration = googleOAuthConfiguration(config);
  const stored = await readGoogleOAuthStore(tokenStorePath);
  return {
    ...configuration,
    connected: configuration.configured && Boolean(config.refreshToken || stored.refreshToken),
    tokenSource: config.refreshToken ? "environment" : stored.refreshToken ? "local_secure_store" : null,
    connectedAt: stored.connectedAt,
    scope: GOOGLE_SHEETS_SCOPE
  };
}

export async function testGoogleSheetConnection(config, tokenStorePath, input, googleImpl = google) {
  const sheets = await authorizedSheets(config, tokenStorePath, googleImpl);
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: requiredSpreadsheetId(input.spreadsheetId),
      fields: "spreadsheetId,properties.title,sheets.properties(sheetId,title,index)"
    });
    return response.data;
  } catch (error) {
    throw googleError("Could not read Google Sheet metadata", error);
  }
}

export async function readGoogleSheetValues(config, tokenStorePath, input, googleImpl = google) {
  const sheets = await authorizedSheets(config, tokenStorePath, googleImpl);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: requiredSpreadsheetId(input.spreadsheetId),
      range: requiredRange(input.range),
      majorDimension: "ROWS",
      valueRenderOption: "UNFORMATTED_VALUE"
    });
    return response.data;
  } catch (error) {
    throw googleError("Could not read Google Sheet values", error);
  }
}

export async function writeGoogleSheetValues(config, tokenStorePath, input, googleImpl = google) {
  const sheets = await authorizedSheets(config, tokenStorePath, googleImpl);
  const values = validateValues(input.values);
  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: requiredSpreadsheetId(input.spreadsheetId),
      range: requiredRange(input.range),
      valueInputOption: input.valueInputOption === "RAW" ? "RAW" : "USER_ENTERED",
      requestBody: { majorDimension: "ROWS", values }
    });
    return response.data;
  } catch (error) {
    throw googleError("Could not write Google Sheet values", error);
  }
}

export async function appendGoogleSheetValues(config, tokenStorePath, input, googleImpl = google) {
  const sheets = await authorizedSheets(config, tokenStorePath, googleImpl);
  const values = validateValues(input.values);
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: requiredSpreadsheetId(input.spreadsheetId),
      range: requiredRange(input.range),
      valueInputOption: input.valueInputOption === "RAW" ? "RAW" : "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { majorDimension: "ROWS", values }
    });
    return response.data;
  } catch (error) {
    throw googleError("Could not append Google Sheet values", error);
  }
}

export async function createGoogleSheetIssueTemplate(config, tokenStorePath, input, googleImpl = google) {
  const sheets = await authorizedSheets(config, tokenStorePath, googleImpl);
  const spreadsheetId = requiredSpreadsheetId(input.spreadsheetId);
  const sheetTab = String(input.sheetTab || "Tasks").trim();
  if (!sheetTab || sheetTab.length > 100 || /[\r\n\0]/.test(sheetTab)) {
    throw new GoogleSheetsError("A valid Google worksheet tab is required.", 400);
  }

  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))"
    });
    const worksheet = metadata.data.sheets?.find(item => item.properties?.title === sheetTab);
    if (!worksheet) throw new GoogleSheetsError(`Worksheet tab “${sheetTab}” was not found.`, 404);
    const sheetId = worksheet.properties.sheetId;
    const endRowIndex = Math.max(1000, Number(worksheet.properties.gridProperties?.rowCount || 1000));
    const headers = [
      "Maxwell Issue ID", "Title", "Description", "Status", "Priority", "Assignee", "Due Date",
      "Organization", "Project", "Product", "Origin Source", "External Issue ID", "External URL",
      "Labels", "Last Synced At", "Sync State", "Notes"
    ];
    const quotedTab = `'${sheetTab.replace(/'/g, "''")}'`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quotedTab}!A2:Q3`,
      valueInputOption: "RAW",
      requestBody: {
        majorDimension: "ROWS",
        values: [
          ["Maxwell issue register", "One neutral issue per row. Use the dropdown values and keep Maxwell Issue ID unchanged after synchronization."],
          headers
        ]
      }
    });

    const dropdown = (columnIndex, values) => ({
      setDataValidation: {
        range: { sheetId, startRowIndex: 3, endRowIndex, startColumnIndex: columnIndex, endColumnIndex: columnIndex + 1 },
        rule: {
          condition: { type: "ONE_OF_LIST", values: values.map(userEnteredValue => ({ userEnteredValue })) },
          strict: true,
          showCustomUi: true
        }
      }
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 3 } },
              fields: "gridProperties.frozenRowCount"
            }
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: headers.length },
              cell: { userEnteredFormat: { backgroundColor: { red: 0.94, green: 0.93, blue: 0.99 }, textFormat: { italic: true, foregroundColor: { red: 0.27, green: 0.23, blue: 0.55 } } } },
              fields: "userEnteredFormat(backgroundColor,textFormat)"
            }
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: headers.length },
              cell: { userEnteredFormat: { backgroundColor: { red: 0.43, green: 0.36, blue: 0.91 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: "CENTER", wrapStrategy: "WRAP" } },
              fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)"
            }
          },
          dropdown(3, ["todo", "in_progress", "review", "done"]),
          dropdown(4, ["low", "medium", "high", "urgent"]),
          dropdown(15, ["current", "pending", "error", "conflict"]),
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 3, endRowIndex, startColumnIndex: 6, endColumnIndex: 7 },
              cell: { userEnteredFormat: { numberFormat: { type: "DATE", pattern: "yyyy-mm-dd" } } },
              fields: "userEnteredFormat.numberFormat"
            }
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 3, endRowIndex, startColumnIndex: 14, endColumnIndex: 15 },
              cell: { userEnteredFormat: { numberFormat: { type: "DATE_TIME", pattern: "yyyy-mm-dd hh:mm" } } },
              fields: "userEnteredFormat.numberFormat"
            }
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: headers.length }
            }
          }
        ]
      }
    });

    return { spreadsheetId, sheetId, sheetTab, headerRange: `${sheetTab}!A3:Q3`, columns: headers.length, preservedRows: 1 };
  } catch (error) {
    if (error instanceof GoogleSheetsError) throw error;
    throw googleError("Could not create the Google Sheets issue template", error);
  }
}

async function authorizedSheets(config, tokenStorePath, googleImpl) {
  requireOAuthConfiguration(config);
  const stored = await readGoogleOAuthStore(tokenStorePath);
  const refreshToken = config.refreshToken || stored.refreshToken;
  if (!refreshToken) throw new GoogleSheetsError("Google Sheets is not connected. Complete OAuth authorization first.", 401);
  const client = createOAuthClient(config, googleImpl);
  client.setCredentials({ refresh_token: refreshToken });
  return googleImpl.sheets({ version: "v4", auth: client });
}

function createOAuthClient(config, googleImpl) {
  return new googleImpl.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

function requireOAuthConfiguration(config) {
  const status = googleOAuthConfiguration(config);
  if (!status.configured) throw new GoogleSheetsError(`Google OAuth is missing: ${status.missing.join(", ")}.`, 503);
}

function requiredSpreadsheetId(value) {
  const id = String(value || "").trim();
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new GoogleSheetsError("A valid Google spreadsheet ID is required.", 400);
  return id;
}

function requiredRange(value) {
  const range = String(value || "").trim();
  if (!range || range.length > 250 || /[\r\n\0]/.test(range)) throw new GoogleSheetsError("A valid A1 range is required.", 400);
  return range;
}

function validateValues(values) {
  if (!Array.isArray(values) || !values.length || values.some(row => !Array.isArray(row))) {
    throw new GoogleSheetsError("Values must be a non-empty array of rows.", 400);
  }
  const cellCount = values.reduce((total, row) => total + row.length, 0);
  if (cellCount > 10_000) throw new GoogleSheetsError("A single Sheets write cannot exceed 10,000 cells.", 413);
  return values;
}

function googleError(prefix, error, fallbackStatus = 502) {
  const upstreamStatus = Number(error?.response?.status || error?.code);
  const status = [400, 401, 403, 404, 409, 429, 503].includes(upstreamStatus) ? upstreamStatus : fallbackStatus;
  const upstreamMessage = error?.response?.data?.error?.message || error?.message;
  return new GoogleSheetsError(`${prefix}${upstreamMessage ? `: ${upstreamMessage}` : "."}`, status);
}

function emptyTokenStore() {
  return { version: 1, refreshToken: null, scope: GOOGLE_SHEETS_SCOPE, connectedAt: null, updatedAt: null };
}

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { openDatabase } from "../lib/database.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";
import { readNeutralStore } from "../lib/neutral-store.mjs";
import { parseRepositoryRoots } from "../lib/repository-paths.mjs";
import { runCodexExec } from "../lib/codex-exec.mjs";
import { runCodexCommand } from "../lib/codex-cli.mjs";

if (!process.argv.includes("--live")) {
  console.log("Live Repository tool check skipped. Pass --live to consume one Codex turn.");
  process.exit(0);
}

const root = process.cwd();
const env = await readEnv(resolve(root, ".env"));
const databasePath = resolve(root, env.AHIVE_DATABASE_PATH || "data/ahive.db");
const database = openDatabase(databasePath, { readonly: true });

try {
  const store = await readNeutralStore(createSqliteNeutralStore(database, databasePath));
  const repository = store.repositories.find(item => item.active && item.verificationStatus === "verified");
  if (!repository) throw new Error("No active, verified Repository is configured.");
  const repositoryRoots = parseRepositoryRoots(env.AHIVE_REPOSITORY_ROOTS);
  const result = await runCodexExec({
    executable: env.AHIVE_CODEX_EXECUTABLE || "codex",
    prompt: "Use the ahive_repository git_summary tool exactly once. Do not call any other tool. Then reply with exactly: AHIVE_REPOSITORY_TOOLS_OK",
    model: "gpt-5.6-sol",
    cwd: repository.resolvedPath,
    timeoutMs: 90_000,
    runner: async (executable, commandArgs, options) => {
      const invocation = await runCodexCommand(executable, commandArgs, options);
      if (!invocation.ok) console.error(`[live-agent-diagnostic] ${safeDiagnostic(invocation.stderr || invocation.errorCode || "Codex did not start.")}`);
      return invocation;
    },
    repositoryTools: {
      serverScript: resolve(root, "scripts", "ahive-repository-mcp.mjs"),
      databasePath,
      repositoryId: repository.id,
      repositoryRoots,
      auditPath: resolve(root, "data", "agent-tool-audit", "live-contract.jsonl"),
      runId: "live-contract",
      nodeExecutable: process.execPath
    },
    onEvent: event => console.log(`[live-agent-step] ${JSON.stringify(safeEvent(event))}`),
    onTrace: event => console.log(`[live-agent-trace] ${JSON.stringify(safeTrace(event))}`)
  });
  console.log(JSON.stringify({ status: result.status, finalMessage: result.finalMessage, unexpectedToolEventTypes: result.unexpectedToolEventTypes, toolActivityCount: result.toolActivity.length, errorCode: result.errorCode }));
  if (result.status !== "completed" || result.finalMessage?.trim() !== "AHIVE_REPOSITORY_TOOLS_OK" || result.unexpectedToolEventTypes.length || result.toolActivity.length < 2) process.exitCode = 1;
} finally {
  database.close();
}

async function readEnv(path) {
  const content = await readFile(path, "utf8");
  return Object.fromEntries(content.split(/\r?\n/).flatMap(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return [];
    const separator = trimmed.indexOf("=");
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[trimmed.slice(0, separator).trim(), value]];
  }));
}

function safeEvent(event) {
  return { type: event.type, toolName: event.toolName || undefined, phase: event.phase || undefined, status: event.status || undefined, textLength: typeof event.text === "string" ? event.text.length : undefined };
}

function safeTrace(event) {
  return { tool: event.tool, phase: event.phase, repositoryId: event.repositoryId, durationMs: event.durationMs, result: event.result };
}

function safeDiagnostic(value) {
  return String(value).replace(/((?:api[_-]?key|authorization|bearer|token))\s*[:=]\s*\S+/gi, "$1=[redacted]").replace(/[\r\n]+/g, " ").slice(0, 1_000);
}

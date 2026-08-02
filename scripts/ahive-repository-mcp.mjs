#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { openDatabase } from "../lib/database.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";
import { createRepositoryToolService, RepositoryToolError } from "../lib/repository-tools.mjs";
import { createGuardedWriteService, GuardedWriteError } from "../lib/guarded-write-tools.mjs";
import { createVerificationCommandService, VerificationCommandError } from "../lib/verification-commands.mjs";
import { createRunArtifactService } from "../lib/run-artifacts.mjs";

const args = parseArguments(process.argv.slice(2));
const guardedWriteEnabled = Boolean(args["worktree-root"]);
const database = openDatabase(args.database, { readonly: !guardedWriteEnabled });
const store = createSqliteNeutralStore(database, args.database);
let sequence = 0;

function recordAudit(event) {
  const record = { sequence: ++sequence, timestamp: new Date().toISOString(), runId: args.run, ...event };
  mkdirSync(dirname(args.audit), { recursive: true });
  appendFileSync(args.audit, `${JSON.stringify(record)}\n`, { encoding: "utf8" });
  console.error(`AHIVE_TOOL_TRACE ${JSON.stringify(record)}`);
}

const service = createRepositoryToolService({
  readStore: async () => store.readStore(),
  repositoryRoots: JSON.parse(args.roots),
  onAudit: recordAudit
});
const guardedWriteService = guardedWriteEnabled ? createGuardedWriteService({
  store,
  worktreeRoot: args["worktree-root"],
  onAudit: recordAudit
}) : null;
const runArtifactService = guardedWriteEnabled && args["artifact-root"] ? createRunArtifactService({
  store,
  root: args["artifact-root"],
  worktreeRoot: args["worktree-root"]
}) : null;
const verificationCommandService = guardedWriteEnabled ? createVerificationCommandService({
  store,
  worktreeRoot: args["worktree-root"],
  maxConcurrency: 1,
  onAudit: recordAudit,
  onResult: runArtifactService ? (runId, result) => runArtifactService.captureVerification(runId, result) : undefined
}) : null;

const server = new McpServer({ name: "ahive-repository", version: "0.1.0" });
const readOnlyAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

server.registerTool("list_files", {
  title: "List repository files",
  description: "List bounded, non-sensitive text files inside the verified Repository. Symlinks and ignored directories are skipped.",
  inputSchema: {
    path: z.string().max(240).optional().describe("Relative directory path; defaults to the Repository root."),
    limit: z.number().int().min(1).max(200).optional().describe("Maximum files to return; defaults to 100.")
  },
  annotations: readOnlyAnnotations
}, input => invoke("list_files", input));

server.registerTool("search_text", {
  title: "Search repository text",
  description: "Search for a literal text fragment within bounded, non-sensitive text files in the verified Repository.",
  inputSchema: {
    query: z.string().min(1).max(200).describe("Literal one-line text to find."),
    path: z.string().max(240).optional().describe("Relative directory path; defaults to the Repository root."),
    filePattern: z.string().max(120).optional().describe("Optional bounded wildcard such as *.mjs."),
    caseSensitive: z.boolean().optional().describe("Use case-sensitive matching; defaults to false."),
    maxResults: z.number().int().min(1).max(100).optional().describe("Maximum matches; defaults to 50.")
  },
  annotations: readOnlyAnnotations
}, input => invoke("search_text", input));

server.registerTool("read_text", {
  title: "Read repository text",
  description: "Read a bounded line range from one non-sensitive text file inside the verified Repository.",
  inputSchema: {
    path: z.string().min(1).max(240).describe("Relative file path."),
    startLine: z.number().int().min(1).optional().describe("First line, starting at 1."),
    maxLines: z.number().int().min(1).max(200).optional().describe("Maximum lines; defaults to 120.")
  },
  annotations: readOnlyAnnotations
}, input => invoke("read_text", input));

server.registerTool("git_summary", {
  title: "Inspect Git summary",
  description: "Read branch, HEAD, changed-file counts, status-code counts, and staged/unstaged diff statistics without exposing file contents.",
  inputSchema: {},
  annotations: readOnlyAnnotations
}, input => invoke("git_summary", input));

server.registerTool("list_verification_commands", {
  title: "List configured verification commands",
  description: "List the names and policy IDs of Repository-configured verification commands available to this Agent Run. Executables and arguments are fixed by the stored policies.",
  inputSchema: {},
  annotations: readOnlyAnnotations
}, async () => {
  const workspace = store.readStore();
  const repository = workspace.repositories.find(item => item.id === args.repository);
  const commands = (repository?.verificationCommands || []).map(command => ({
    id: command.id,
    name: command.name,
    workingDirectory: command.workingDirectory,
    timeoutMs: command.timeoutMs
  }));
  return { content: [{ type: "text", text: JSON.stringify({ commands }) }], structuredContent: { commands } };
});

if (guardedWriteService) {
  const writeAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };
  server.registerTool("apply_patch", {
    title: "Apply an approved structured patch",
    description: "Apply exact oldText/newText replacements to one approved text file inside this Run's managed worktree. Requires a matching unconsumed approval and expected SHA-256.",
    inputSchema: {
      path: z.string().min(1).max(500).describe("Normalized relative file path inside the managed worktree."),
      expectedSha256: z.string().regex(/^[0-9a-fA-F]{64}$/).describe("Current full SHA-256 of the file."),
      replacements: z.array(z.object({ oldText: z.string().min(1).max(32000), newText: z.string().max(32000) })).min(1).max(20)
    },
    annotations: writeAnnotations
  }, input => invokeGuarded("apply_patch", input));
  server.registerTool("create_file", {
    title: "Create one approved text file",
    description: "Create one non-sensitive text file in an existing managed-worktree directory. Requires a matching unconsumed exact-path approval.",
    inputSchema: {
      path: z.string().min(1).max(500).describe("Normalized relative new file path inside the managed worktree."),
      content: z.string().max(262144).describe("UTF-8 text content, limited to 262144 bytes.")
    },
    annotations: writeAnnotations
  }, input => invokeGuarded("create_file", input));
  server.registerTool("run_verification", {
    title: "Run one approved verification command",
    description: "Execute one Repository-configured command policy with its exact executable and arguments inside this Run's managed worktree. Requires a matching unconsumed approval; arbitrary commands and arguments are not accepted.",
    inputSchema: {
      policyId: z.string().regex(/^verification-command-[a-f0-9]{24}$/).describe("The exact configured verification command policy ID.")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, input => invokeVerification(input));
}

async function invoke(tool, input) {
  try {
    const result = tool === "list_files" ? await service.listFiles(args.repository, input)
      : tool === "search_text" ? await service.searchText(args.repository, input)
        : tool === "read_text" ? await service.readText(args.repository, input)
          : await service.gitSummary(args.repository, input);
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  } catch (error) {
    const message = error instanceof RepositoryToolError ? `${error.code}: ${error.message}` : "tool_failure: Repository tool failed safely.";
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

async function invokeGuarded(tool, input) {
  try {
    const result = tool === "apply_patch"
      ? await guardedWriteService.applyPatch(args.run, input)
      : await guardedWriteService.createFile(args.run, input);
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  } catch (error) {
    const message = error instanceof GuardedWriteError ? `${error.code}: ${error.message}` : "guarded_write_failure: Guarded write failed safely.";
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

async function invokeVerification(input) {
  try {
    const result = await verificationCommandService.execute(args.run, input.policyId);
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  } catch (error) {
    const message = error instanceof VerificationCommandError ? `${error.code}: ${error.message}` : "verification_failure: Verification command failed safely.";
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

function parseArguments(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index]?.replace(/^--/, "");
    if (!name || values[index + 1] == null) throw new Error("Repository MCP arguments must be name/value pairs.");
    result[name] = values[index + 1];
  }
  for (const required of ["database", "repository", "roots", "audit", "run"]) {
    if (!result[required]) throw new Error(`Missing --${required}.`);
  }
  const roots = JSON.parse(result.roots);
  if (!Array.isArray(roots) || !roots.length) throw new Error("At least one Repository root is required.");
  return result;
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`AHIVE_TOOL_TRACE ${JSON.stringify({ sequence: 0, timestamp: new Date().toISOString(), runId: args.run, repositoryId: args.repository, tool: "mcp_server", phase: "ready" })}`);

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
  const cancelled = verificationCommandService?.cancelAll() || 0;
  if (!cancelled) { database.close(); process.exit(0); }
  setTimeout(() => { database.close(); process.exit(0); }, 1_100).unref();
});

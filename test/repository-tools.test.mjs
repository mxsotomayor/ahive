import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createRepositoryToolService, RepositoryToolError } from "../lib/repository-tools.mjs";
import { emptyNeutralStore } from "../lib/neutral-store.mjs";
import { openDatabase } from "../lib/database.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";

const exec = promisify(execFile);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "ahive-tools-"));
  const repositoryPath = join(root, "repository");
  const outsidePath = join(root, "outside");
  await mkdir(join(repositoryPath, "src"), { recursive: true });
  await mkdir(join(repositoryPath, "node_modules", "ignored"), { recursive: true });
  await mkdir(outsidePath, { recursive: true });
  await writeFile(join(repositoryPath, "src", "app.mjs"), "export function authenticate(user) {\n  return user.active;\n}\n");
  await writeFile(join(repositoryPath, "README.md"), "# Safe repository\nAuthentication lives in src/app.mjs.\n");
  await writeFile(join(repositoryPath, ".env"), "SECRET=must-not-leak\n");
  await writeFile(join(repositoryPath, "private.pem"), "must-not-leak\n");
  await writeFile(join(repositoryPath, "image.bin"), Buffer.from([1, 0, 2, 3]));
  await writeFile(join(repositoryPath, "oversized.txt"), "x".repeat(1024 * 1024 + 1));
  await writeFile(join(repositoryPath, "node_modules", "ignored", "package.js"), "must-not-appear\n");
  await writeFile(join(outsidePath, "outside.txt"), "outside secret\n");
  await symlink(outsidePath, join(repositoryPath, "escape"), "junction");
  await exec("git", ["init"], { cwd: repositoryPath });
  await exec("git", ["config", "user.email", "ahive-test@example.invalid"], { cwd: repositoryPath });
  await exec("git", ["config", "user.name", "Ahive Test"], { cwd: repositoryPath });
  await exec("git", ["add", "src/app.mjs", "README.md"], { cwd: repositoryPath });
  await exec("git", ["commit", "-m", "fixture"], { cwd: repositoryPath });
  const canonicalRoot = await realpath(root);
  const canonicalRepository = await realpath(repositoryPath);
  const store = { repositories: [{ id: "repository-1", name: "Fixture", localPath: canonicalRepository, resolvedPath: canonicalRepository, verificationStatus: "verified", active: true }] };
  const audit = [];
  const service = createRepositoryToolService({ readStore: async () => structuredClone(store), repositoryRoots: [canonicalRoot], onAudit: event => audit.push(event) });
  return { root: canonicalRoot, repositoryPath: canonicalRepository, store, service, audit };
}

test("lists, searches, reads, and summarizes only bounded Repository content", async () => {
  const { repositoryPath, service, audit } = await fixture();
  const before = (await exec("git", ["status", "--porcelain=v1", "-uno"], { cwd: repositoryPath })).stdout;

  const listed = await service.listFiles("repository-1", { limit: 50 });
  assert.ok(listed.files.some(file => file.path === "src/app.mjs"));
  assert.equal(listed.files.some(file => /\.env|private\.pem|image\.bin|node_modules|escape/.test(file.path)), false);

  const searched = await service.searchText("repository-1", { query: "authenticate", filePattern: "*.mjs" });
  assert.deepEqual(searched.matches.map(match => [match.path, match.line]), [["src/app.mjs", 1]]);

  const read = await service.readText("repository-1", { path: "src/app.mjs", startLine: 1, maxLines: 2 });
  assert.match(read.text, /authenticate/);
  assert.equal(read.endLine, 2);

  const git = await service.gitSummary("repository-1", { timeoutMs: 15_000 });
  assert.equal(git.repositoryId, "repository-1");
  assert.match(git.head, /^[0-9a-f]{40}$/);
  const after = (await exec("git", ["status", "--porcelain=v1", "-uno"], { cwd: repositoryPath })).stdout;
  assert.equal(after, before);

  assert.ok(audit.some(event => event.tool === "read_text" && event.phase === "completed"));
  assert.equal(JSON.stringify(audit).includes("must-not-leak"), false);
  assert.equal(JSON.stringify(audit).includes("authenticate(user)"), false);
});

test("denies traversal, symlink escapes, secrets, binary files, oversized files, and excessive limits", async () => {
  const { service, audit } = await fixture();
  const attempts = [
    () => service.readText("repository-1", { path: "../outside/outside.txt" }),
    () => service.readText("repository-1", { path: "escape/outside.txt" }),
    () => service.readText("repository-1", { path: ".env" }),
    () => service.readText("repository-1", { path: "private.pem" }),
    () => service.readText("repository-1", { path: "image.bin" }),
    () => service.readText("repository-1", { path: "oversized.txt" }),
    () => service.listFiles("repository-1", { limit: 201 })
  ];
  for (const attempt of attempts) await assert.rejects(attempt, RepositoryToolError);
  assert.equal(audit.filter(event => event.phase === "denied").length, attempts.length);
});

test("re-resolves Repository identity and state for every tool call", async () => {
  const { store, service } = await fixture();
  await service.listFiles("repository-1", { limit: 1 });
  store.repositories[0].verificationStatus = "unverified";
  await assert.rejects(() => service.listFiles("repository-1", { limit: 1 }), error => error.code === "repository_unverified");
  await assert.rejects(() => service.listFiles("missing", { limit: 1 }), error => error.code === "repository_not_found");
});

test("exposes exactly four read-only tools through the stdio MCP boundary", async () => {
  const { root, repositoryPath } = await fixture();
  const databasePath = join(root, "mcp.db");
  const database = openDatabase(databasePath);
  const sqlite = createSqliteNeutralStore(database, databasePath);
  const now = new Date().toISOString();
  sqlite.writeStore({
    ...emptyNeutralStore(),
    organizations: [{ id: "organization-1", name: "Test", active: true, createdAt: now, updatedAt: now }],
    projects: [{ id: "project-1", organizationId: "organization-1", name: "Project", active: true, createdAt: now, updatedAt: now }],
    repositories: [{ id: "repository-1", projectId: "project-1", productId: null, name: "Fixture", localPath: repositoryPath, resolvedPath: repositoryPath, verificationStatus: "verified", active: true, createdAt: now, updatedAt: now }]
  });
  const auditPath = join(root, "audit", "run-1.jsonl");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../scripts/ahive-repository-mcp.mjs", import.meta.url)), "--database", databasePath, "--repository", "repository-1", "--roots", JSON.stringify([root]), "--audit", auditPath, "--run", "run-1"],
    stderr: "pipe"
  });
  const client = new Client({ name: "ahive-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(tool => tool.name).sort(), ["git_summary", "list_files", "read_text", "search_text"]);
    assert.ok(tools.tools.every(tool => tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint === false));
    const result = await client.callTool({ name: "read_text", arguments: { path: "src/app.mjs", maxLines: 1 } });
    assert.equal(result.isError, undefined);
    assert.match(result.content[0].text, /authenticate/);
    const denied = await client.callTool({ name: "read_text", arguments: { path: ".env" } });
    assert.equal(denied.isError, true);
    assert.equal(JSON.stringify(denied).includes("must-not-leak"), false);
  } finally {
    await client.close();
    database.close();
  }
});

import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { verifyRepositoryPath, isContained } from "./repository-paths.mjs";
import { runGit } from "./git-inspection.mjs";

const DEFAULT_TIMEOUT_MS = 2_500;
const MAX_LIST_RESULTS = 200;
const MAX_SEARCH_RESULTS = 100;
const MAX_TRAVERSED_FILES = 5_000;
const MAX_SEARCH_BYTES = 32 * 1024 * 1024;
const MAX_SEARCH_FILE_BYTES = 512 * 1024;
const MAX_READ_FILE_BYTES = 1024 * 1024;
const MAX_READ_OUTPUT_CHARS = 32_000;
const IGNORED_DIRECTORIES = new Set([".git", ".hg", ".svn", "node_modules", ".next", "dist", "build", "coverage", "vendor", ".venv", "__pycache__", ".cache"]);
const BINARY_EXTENSIONS = new Set([".7z", ".a", ".avi", ".bin", ".bmp", ".class", ".dll", ".doc", ".docx", ".dylib", ".eot", ".exe", ".gif", ".gz", ".ico", ".jar", ".jpeg", ".jpg", ".lockb", ".mov", ".mp3", ".mp4", ".o", ".otf", ".pdf", ".png", ".ppt", ".pptx", ".pyc", ".so", ".tar", ".tgz", ".ttf", ".wav", ".webm", ".webp", ".woff", ".woff2", ".xls", ".xlsx", ".zip"]);

export class RepositoryToolError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "RepositoryToolError";
    this.code = code;
    this.status = status;
  }
}

export function createRepositoryToolService(options = {}) {
  if (typeof options.readStore !== "function") throw new TypeError("Repository tool service requires readStore().");
  const repositoryRoots = options.repositoryRoots || [];
  const now = options.now || (() => Date.now());

  async function execute(tool, repositoryId, input = {}) {
    const started = now();
    const request = auditRequest(tool, input);
    options.onAudit?.({ tool, phase: "started", repositoryId, request });
    try {
      const context = await resolveRepositoryContext(options.readStore, repositoryRoots, repositoryId);
      const deadline = started + boundedInteger(input.timeoutMs, 250, 15_000, DEFAULT_TIMEOUT_MS);
      const result = tool === "browse_directory" ? await browseDirectory(context, input, deadline)
        : tool === "list_files" ? await listFiles(context, input, deadline)
        : tool === "search_text" ? await searchText(context, input, deadline)
          : tool === "read_text" ? await readText(context, input, deadline)
            : tool === "git_summary" ? await gitSummary(context, input, deadline)
              : (() => { throw new RepositoryToolError("unknown_tool", `Unknown repository tool: ${tool}.`, 404); })();
      options.onAudit?.({ tool, phase: "completed", repositoryId, request, result: auditResult(tool, result), durationMs: now() - started });
      return result;
    } catch (error) {
      const normalized = normalizeToolError(error);
      options.onAudit?.({ tool, phase: normalized.status >= 500 ? "failed" : "denied", repositoryId, request, errorCode: normalized.code, durationMs: now() - started });
      throw normalized;
    }
  }

  return {
    browseDirectory: (repositoryId, input) => execute("browse_directory", repositoryId, input),
    listFiles: (repositoryId, input) => execute("list_files", repositoryId, input),
    searchText: (repositoryId, input) => execute("search_text", repositoryId, input),
    readText: (repositoryId, input) => execute("read_text", repositoryId, input),
    gitSummary: (repositoryId, input) => execute("git_summary", repositoryId, input)
  };
}

async function browseDirectory(context, input, deadline) {
  const directory = await resolveCandidate(context.root, input.path || ".", { directory: true });
  const limit = boundedInteger(input.limit, 1, MAX_LIST_RESULTS, MAX_LIST_RESULTS);
  const children = await readdir(directory, { withFileTypes: true });
  children.sort((left, right) => {
    const leftRank = left.isDirectory() ? 0 : 1;
    const rightRank = right.isDirectory() ? 0 : 1;
    return leftRank - rightRank || left.name.localeCompare(right.name);
  });
  const entries = [];
  let visibleCount = 0;
  for (const child of children) {
    assertWithinLimits(deadline, visibleCount);
    if (child.isSymbolicLink()) continue;
    const absolute = join(directory, child.name);
    const relativePath = portablePath(relative(context.root, absolute));
    if (child.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(child.name)) continue;
      visibleCount += 1;
      if (entries.length < limit) entries.push({ name: child.name, path: relativePath, type: "directory" });
      continue;
    }
    if (!child.isFile() || isExcludedFile(relativePath)) continue;
    visibleCount += 1;
    if (entries.length < limit) {
      const details = await stat(absolute);
      entries.push({ name: child.name, path: relativePath, type: "file", size: details.size });
    }
  }
  return {
    repositoryId: context.repository.id,
    path: portablePath(relative(context.root, directory)) || ".",
    entries,
    truncated: visibleCount > entries.length
  };
}

async function resolveRepositoryContext(readStore, roots, repositoryId) {
  const id = String(repositoryId || "").trim();
  if (!id) throw new RepositoryToolError("repository_required", "A verified Repository ID is required.");
  const store = await readStore();
  const repository = store.repositories.find(item => item.id === id);
  if (!repository) throw new RepositoryToolError("repository_not_found", "Repository was not found.", 404);
  if (!repository.active) throw new RepositoryToolError("repository_inactive", "Repository is inactive.", 409);
  if (repository.verificationStatus !== "verified" || !repository.resolvedPath) {
    throw new RepositoryToolError("repository_unverified", "Repository must be verified before Agent access.", 409);
  }
  let verification;
  try { verification = await verifyRepositoryPath(repository.resolvedPath, roots); }
  catch { throw new RepositoryToolError("repository_boundary_invalid", "Repository path is no longer inside an approved root.", 403); }
  if (!samePath(verification.resolvedPath, repository.resolvedPath)) {
    throw new RepositoryToolError("repository_identity_changed", "Repository canonical path changed after verification.", 409);
  }
  return { repository, root: verification.resolvedPath };
}

async function listFiles(context, input, deadline) {
  const directory = await resolveCandidate(context.root, input.path || ".", { directory: true });
  const limit = boundedInteger(input.limit, 1, MAX_LIST_RESULTS, 100);
  const entries = [];
  let traversed = 0;
  const queue = [directory];
  while (queue.length && entries.length < limit) {
    assertWithinLimits(deadline, traversed);
    const current = queue.shift();
    const children = await readdir(current, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      assertWithinLimits(deadline, traversed++);
      if (child.isSymbolicLink()) continue;
      const absolute = join(current, child.name);
      const relativePath = portablePath(relative(context.root, absolute));
      if (child.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(child.name)) queue.push(absolute);
        continue;
      }
      if (!child.isFile() || isExcludedFile(relativePath)) continue;
      const details = await stat(absolute);
      entries.push({ path: relativePath, size: details.size });
      if (entries.length >= limit) break;
    }
  }
  return { repositoryId: context.repository.id, basePath: portablePath(relative(context.root, directory)) || ".", files: entries, truncated: queue.length > 0 || entries.length >= limit };
}

async function searchText(context, input, deadline) {
  const query = String(input.query || "");
  if (!query || query.length > 200 || /[\r\n\0]/.test(query)) throw new RepositoryToolError("invalid_query", "Search query must contain 1 to 200 characters on one line.");
  const directory = await resolveCandidate(context.root, input.path || ".", { directory: true });
  const limit = boundedInteger(input.maxResults, 1, MAX_SEARCH_RESULTS, 50);
  const matcher = compileFilePattern(input.filePattern);
  const needle = input.caseSensitive ? query : query.toLocaleLowerCase("en");
  const results = [];
  let traversed = 0;
  let searchedBytes = 0;
  const queue = [directory];
  while (queue.length && results.length < limit) {
    const current = queue.shift();
    for (const child of await readdir(current, { withFileTypes: true })) {
      assertWithinLimits(deadline, traversed++);
      if (child.isSymbolicLink()) continue;
      const absolute = join(current, child.name);
      const relativePath = portablePath(relative(context.root, absolute));
      if (child.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(child.name)) queue.push(absolute);
        continue;
      }
      if (!child.isFile() || isExcludedFile(relativePath) || !matcher(relativePath)) continue;
      const details = await stat(absolute);
      if (details.size > MAX_SEARCH_FILE_BYTES || searchedBytes + details.size > MAX_SEARCH_BYTES) continue;
      searchedBytes += details.size;
      const content = await readFile(absolute);
      if (isBinary(content)) continue;
      const lines = content.toString("utf8").split(/\r?\n/);
      for (let index = 0; index < lines.length && results.length < limit; index += 1) {
        const haystack = input.caseSensitive ? lines[index] : lines[index].toLocaleLowerCase("en");
        if (!haystack.includes(needle)) continue;
        results.push({ path: relativePath, line: index + 1, preview: boundedPreview(lines[index], query) });
      }
    }
  }
  return { repositoryId: context.repository.id, query, matches: results, searchedFiles: traversed, truncated: queue.length > 0 || results.length >= limit };
}

async function readText(context, input, deadline) {
  assertDeadline(deadline);
  const file = await resolveCandidate(context.root, input.path, { file: true });
  const relativePath = portablePath(relative(context.root, file));
  if (isExcludedFile(relativePath)) throw new RepositoryToolError("file_excluded", "Sensitive or binary file types cannot be read.", 403);
  const details = await stat(file);
  if (details.size > MAX_READ_FILE_BYTES) throw new RepositoryToolError("file_too_large", "File exceeds the read safety limit.", 413);
  const content = await readFile(file);
  if (isBinary(content)) throw new RepositoryToolError("binary_file", "Binary files cannot be read.", 415);
  const lines = content.toString("utf8").split(/\r?\n/);
  const startLine = boundedInteger(input.startLine, 1, Math.max(lines.length, 1), 1);
  const maxLines = boundedInteger(input.maxLines, 1, 200, 120);
  const selected = lines.slice(startLine - 1, startLine - 1 + maxLines);
  let text = selected.join("\n");
  let truncated = startLine - 1 + selected.length < lines.length;
  if (text.length > MAX_READ_OUTPUT_CHARS) { text = text.slice(0, MAX_READ_OUTPUT_CHARS); truncated = true; }
  return { repositoryId: context.repository.id, path: relativePath, startLine, endLine: startLine + selected.length - 1, totalLines: lines.length, text, truncated };
}

async function gitSummary(context, input, deadline) {
  const remaining = () => Math.max(100, deadline - Date.now());
  const options = () => ({ timeoutMs: remaining(), maxOutputBytes: 32 * 1024 });
  const branch = await runGit(context.root, ["symbolic-ref", "--quiet", "--short", "HEAD"], { ...options(), acceptedExitCodes: [0, 1] });
  const head = await runGit(context.root, ["rev-parse", "HEAD"], options());
  const status = await runGit(context.root, ["status", "--porcelain=v1", "-uno"], options());
  const unstaged = await runGit(context.root, ["diff", "--shortstat", "--no-ext-diff"], options());
  const staged = await runGit(context.root, ["diff", "--cached", "--shortstat", "--no-ext-diff"], options());
  const codes = {};
  for (const line of status.stdout.split(/\r?\n/).filter(Boolean)) codes[line.slice(0, 2)] = (codes[line.slice(0, 2)] || 0) + 1;
  return { repositoryId: context.repository.id, branch: branch.stdout.trim() || null, detached: !branch.stdout.trim(), head: head.stdout.trim(), changedCount: Object.values(codes).reduce((sum, count) => sum + count, 0), statusCodes: codes, unstaged: parseShortStat(unstaged.stdout), staged: parseShortStat(staged.stdout) };
}

async function resolveCandidate(root, requested, expected) {
  const value = String(requested || "").trim();
  if (!value || value.includes("\0") || isAbsolute(value) || value.split(/[\\/]+/).includes("..")) {
    throw new RepositoryToolError("invalid_path", "Repository paths must be relative and cannot traverse parents.");
  }
  let canonical;
  try { canonical = await realpath(resolve(root, value)); }
  catch { throw new RepositoryToolError("path_not_found", "Repository path was not found.", 404); }
  if (!isContained(root, canonical)) throw new RepositoryToolError("path_escape", "Repository path escapes the verified root.", 403);
  const details = await stat(canonical);
  if (expected.file && !details.isFile()) throw new RepositoryToolError("file_required", "Repository path must identify a file.");
  if (expected.directory && !details.isDirectory()) throw new RepositoryToolError("directory_required", "Repository path must identify a directory.");
  return canonical;
}

function isExcludedFile(path) {
  const name = basename(path).toLocaleLowerCase("en");
  const segments = path.toLocaleLowerCase("en").split("/");
  if (segments.some(segment => IGNORED_DIRECTORIES.has(segment))) return true;
  if (name === ".env" || name.startsWith(".env.") || name === "auth.json" || name === ".npmrc" || name === ".pypirc") return true;
  if (/^(?:id_[a-z0-9_-]+|credentials|secrets?)(?:\..*)?$/.test(name)) return true;
  if (/\.(?:pem|key|p12|pfx|jks|keystore|kdbx)$/i.test(name)) return true;
  return BINARY_EXTENSIONS.has(extname(name));
}

function isBinary(buffer) { return buffer.subarray(0, Math.min(buffer.length, 8_192)).includes(0); }
export function isExcludedRepositoryFile(path) { return isExcludedFile(String(path || "").replaceAll("\\", "/")); }
export function isBinaryRepositoryContent(buffer) { return isBinary(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "")); }
function portablePath(path) { return path.split(sep).join("/"); }
function samePath(left, right) { return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right; }
function assertDeadline(deadline) { if (Date.now() > deadline) throw new RepositoryToolError("tool_timeout", "Repository tool exceeded its time limit.", 504); }
function assertWithinLimits(deadline, traversed) { assertDeadline(deadline); if (traversed > MAX_TRAVERSED_FILES) throw new RepositoryToolError("traversal_limit", "Repository traversal exceeded its file limit.", 413); }
function boundedInteger(value, minimum, maximum, fallback) { const number = value == null || value === "" ? fallback : Number(value); if (!Number.isInteger(number) || number < minimum || number > maximum) throw new RepositoryToolError("invalid_limit", `Value must be an integer from ${minimum} to ${maximum}.`); return number; }
function boundedPreview(line, query) { const index = line.toLocaleLowerCase("en").indexOf(query.toLocaleLowerCase("en")); const start = Math.max(0, index - 80); return line.slice(start, start + 240); }
function compileFilePattern(value) { const pattern = String(value || "").trim(); if (!pattern) return () => true; if (pattern.length > 120 || /[\r\n\0]/.test(pattern)) throw new RepositoryToolError("invalid_pattern", "File pattern is invalid."); const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, "."); const regex = new RegExp(`^${escaped}$`, "i"); return path => regex.test(path) || regex.test(basename(path)); }
function parseShortStat(value) { const text = value.trim(); return { files: Number(text.match(/(\d+) files? changed/)?.[1] || 0), insertions: Number(text.match(/(\d+) insertions?\(\+\)/)?.[1] || 0), deletions: Number(text.match(/(\d+) deletions?\(-\)/)?.[1] || 0) }; }
function normalizeToolError(error) { return error instanceof RepositoryToolError ? error : new RepositoryToolError("tool_failure", "Repository tool failed safely.", 500); }
function auditRequest(tool, input) { return { path: input.path ? String(input.path).slice(0, 240) : null, queryLength: tool === "search_text" ? String(input.query || "").length : null, filePattern: input.filePattern ? String(input.filePattern).slice(0, 120) : null, limit: input.limit ?? input.maxResults ?? input.maxLines ?? null }; }
function auditResult(tool, result) { return tool === "browse_directory" ? { path: result.path, count: result.entries.length, truncated: result.truncated } : tool === "list_files" ? { count: result.files.length, truncated: result.truncated } : tool === "search_text" ? { count: result.matches.length, searchedFiles: result.searchedFiles, truncated: result.truncated } : tool === "read_text" ? { path: result.path, lines: Math.max(0, result.endLine - result.startLine + 1), characters: result.text.length, truncated: result.truncated } : { changedCount: result.changedCount }; }

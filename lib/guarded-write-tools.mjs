import { createHash, randomUUID } from "node:crypto";
import { chmod, lstat, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { verifyManagedWorktreePath } from "./git-worktrees.mjs";
import { isContained } from "./repository-paths.mjs";
import { isBinaryRepositoryContent, isExcludedRepositoryFile } from "./repository-tools.mjs";
import {
  authorizeGuardedFileChange,
  completeGuardedFileChange,
  failGuardedFileChange,
  readNeutralStore
} from "./neutral-store.mjs";

const MAX_FILE_BYTES = 256 * 1024;
const MAX_PATCH_REPLACEMENTS = 20;
const MAX_REPLACEMENT_CHARS = 32_000;

export class GuardedWriteError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "GuardedWriteError";
    this.code = code;
    this.status = status;
  }
}

export function createGuardedWriteService(options = {}) {
  if (!options.store) throw new TypeError("Guarded write service requires a neutral store.");
  const worktreeRoot = String(options.worktreeRoot || "").trim();
  const auditSink = typeof options.onAudit === "function" ? options.onAudit : () => {};
  const audit = event => { try { auditSink(event); } catch {} };

  async function applyPatch(agentRunId, input = {}) {
    const started = Date.now();
    const relativePath = normalizedRelativePath(input.path);
    audit({ runId: agentRunId, tool: "apply_patch", phase: "started", request: { path: relativePath, replacementCount: Array.isArray(input.replacements) ? input.replacements.length : null } });
    let authorized = null;
    let original = null;
    let changed = false;
    let authorizedPath = null;
    try {
      const context = await resolveWriteContext(options.store, agentRunId, relativePath, worktreeRoot, { mustExist: true });
      authorizedPath = context.absolutePath;
      original = await readBoundedText(context.absolutePath);
      const beforeSha256 = sha256(original.buffer);
      const expectedSha256 = hashInput(input.expectedSha256, "Expected SHA-256");
      if (beforeSha256 !== expectedSha256) throw new GuardedWriteError("stale_file", "File changed since the approved patch was prepared.", 409);
      const afterText = applyStructuredReplacements(original.text, input.replacements);
      const afterBuffer = Buffer.from(afterText, "utf8");
      assertWritableContent(afterBuffer);
      if (afterBuffer.equals(original.buffer)) throw new GuardedWriteError("empty_change", "Patch does not change the file.", 409);
      const afterSha256 = sha256(afterBuffer);
      const approval = findExactApproval(context.store, agentRunId, context.worktree.id, relativePath);
      const authorization = await authorizeGuardedFileChange(options.store, agentRunId, approval.id, {
        operation: "apply_patch",
        relativePath,
        beforeSha256,
        afterSha256,
        beforeBytes: original.buffer.length,
        afterBytes: afterBuffer.length,
        actor: "guarded-write-service"
      });
      if (!authorization.fileChangeEvent) throw new GuardedWriteError("approval_unavailable", "Guarded write approval is no longer valid.", 409);
      authorized = authorization.fileChangeEvent;
      await atomicReplace(context.absolutePath, afterBuffer, original.mode);
      changed = true;
      await options.afterWrite?.({ tool: "apply_patch", runId: agentRunId, path: relativePath });
      const completed = await completeGuardedFileChange(options.store, authorized.id);
      const result = resultFromEvent(completed.fileChangeEvent);
      audit({ runId: agentRunId, tool: "apply_patch", phase: "completed", result, durationMs: Date.now() - started });
      return result;
    } catch (error) {
      let rollbackFailed = false;
      if (changed && original) {
        try { await atomicReplace(authorizedPath, original.buffer, original.mode); }
        catch { rollbackFailed = true; }
      }
      if (authorized) await failGuardedFileChange(options.store, authorized.id, { errorCode: safeErrorCode(error) }).catch(() => undefined);
      const normalized = rollbackFailed
        ? new GuardedWriteError("rollback_failed", "Guarded patch failed and its file rollback could not be confirmed.", 500)
        : normalizeGuardedError(error);
      audit({ runId: agentRunId, tool: "apply_patch", phase: normalized.status >= 500 ? "failed" : "denied", errorCode: normalized.code, durationMs: Date.now() - started });
      throw normalized;
    }
  }

  async function createFile(agentRunId, input = {}) {
    const started = Date.now();
    const relativePath = normalizedRelativePath(input.path);
    audit({ runId: agentRunId, tool: "create_file", phase: "started", request: { path: relativePath } });
    let authorized = null;
    let createdPath = null;
    try {
      const context = await resolveWriteContext(options.store, agentRunId, relativePath, worktreeRoot, { mustNotExist: true });
      if (typeof input.content !== "string") throw new GuardedWriteError("invalid_content", "Create-file content must be text.");
      const content = Buffer.from(input.content, "utf8");
      assertWritableContent(content);
      const afterSha256 = sha256(content);
      const approval = findExactApproval(context.store, agentRunId, context.worktree.id, relativePath);
      const authorization = await authorizeGuardedFileChange(options.store, agentRunId, approval.id, {
        operation: "create_file",
        relativePath,
        beforeSha256: null,
        afterSha256,
        beforeBytes: 0,
        afterBytes: content.length,
        actor: "guarded-write-service"
      });
      if (!authorization.fileChangeEvent) throw new GuardedWriteError("approval_unavailable", "Guarded write approval is no longer valid.", 409);
      authorized = authorization.fileChangeEvent;
      await writeFile(context.absolutePath, content, { flag: "wx", mode: 0o600 });
      createdPath = context.absolutePath;
      await options.afterWrite?.({ tool: "create_file", runId: agentRunId, path: relativePath });
      const completed = await completeGuardedFileChange(options.store, authorized.id);
      const result = resultFromEvent(completed.fileChangeEvent);
      audit({ runId: agentRunId, tool: "create_file", phase: "completed", result, durationMs: Date.now() - started });
      return result;
    } catch (error) {
      if (createdPath) await rm(createdPath, { force: true }).catch(() => undefined);
      if (authorized) await failGuardedFileChange(options.store, authorized.id, { errorCode: safeErrorCode(error) }).catch(() => undefined);
      const normalized = normalizeGuardedError(error);
      audit({ runId: agentRunId, tool: "create_file", phase: normalized.status >= 500 ? "failed" : "denied", errorCode: normalized.code, durationMs: Date.now() - started });
      throw normalized;
    }
  }

  return { applyPatch, createFile };
}

async function resolveWriteContext(storeTarget, agentRunId, relativePath, worktreeRoot, expected) {
  const store = await readNeutralStore(storeTarget);
  const run = store.agentRuns.find(item => item.id === String(agentRunId || ""));
  const worktree = run ? store.managedWorktrees.find(item => item.agentRunId === run.id) : null;
  const repository = worktree ? store.repositories.find(item => item.id === worktree.repositoryId) : null;
  if (!run) throw new GuardedWriteError("run_not_found", "Agent Run was not found.", 404);
  if (!worktree || worktree.status !== "ready" || worktree.present !== true) throw new GuardedWriteError("worktree_not_ready", "Agent Run has no ready managed worktree.", 409);
  if (!repository || repository.accessMode !== "guarded_write" || !repository.active || repository.verificationStatus !== "verified") {
    throw new GuardedWriteError("guarded_write_unavailable", "Repository no longer permits guarded writes.", 409);
  }
  const verified = await verifyManagedWorktreePath(worktree, worktreeRoot);
  const absolutePath = join(verified.path, ...relativePath.split("/"));
  if (!isContained(verified.path, absolutePath) || absolutePath === verified.path) throw new GuardedWriteError("path_escape", "Guarded write path escapes the managed worktree.", 403);
  const parent = dirname(absolutePath);
  const canonicalParent = await realpath(parent).catch(error => {
    if (error.code === "ENOENT") throw new GuardedWriteError("parent_missing", "Create the parent directory through a separately reviewed change first.", 409);
    throw error;
  });
  if (!samePath(canonicalParent, parent) || !isContained(verified.path, canonicalParent)) throw new GuardedWriteError("parent_escape", "Guarded write parent is not a safe worktree directory.", 403);
  const parentDetails = await lstat(parent);
  if (!parentDetails.isDirectory() || parentDetails.isSymbolicLink()) throw new GuardedWriteError("parent_invalid", "Guarded write parent is not a safe directory.", 403);
  let targetDetails = null;
  try { targetDetails = await lstat(absolutePath); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (expected.mustExist && !targetDetails) throw new GuardedWriteError("file_missing", "Patch target does not exist.", 404);
  if (expected.mustNotExist && targetDetails) throw new GuardedWriteError("file_exists", "Create-file target already exists.", 409);
  if (targetDetails && (!targetDetails.isFile() || targetDetails.isSymbolicLink())) throw new GuardedWriteError("file_invalid", "Guarded write target must be a regular file.", 403);
  if (targetDetails) {
    const canonicalTarget = await realpath(absolutePath);
    if (!samePath(canonicalTarget, absolutePath) || !isContained(verified.path, canonicalTarget)) throw new GuardedWriteError("file_escape", "Guarded write target is not a safe worktree file.", 403);
  }
  return { store, run, worktree, repository, root: verified.path, absolutePath };
}

function normalizedRelativePath(value) {
  const path = String(value || "").trim().replaceAll("\\", "/");
  if (!path || path.length > 500 || /[\0\r\n]/.test(path) || isAbsolute(path) || path.startsWith("/") || path.split("/").some(part => !part || part === "." || part === "..")) {
    throw new GuardedWriteError("invalid_path", "Guarded write path must be one normalized relative file path.");
  }
  if (isExcludedRepositoryFile(path)) throw new GuardedWriteError("file_excluded", "Sensitive, generated, or binary file paths cannot be changed.", 403);
  return path;
}

async function readBoundedText(path) {
  const details = await stat(path);
  if (details.size > MAX_FILE_BYTES) throw new GuardedWriteError("file_too_large", "Guarded write file exceeds 262144 bytes.", 413);
  const buffer = await readFile(path);
  if (isBinaryRepositoryContent(buffer)) throw new GuardedWriteError("binary_file", "Binary files cannot be changed.", 415);
  const text = buffer.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(buffer)) throw new GuardedWriteError("invalid_utf8", "Only valid UTF-8 text files can be changed.", 415);
  return { buffer, text, mode: details.mode };
}

function applyStructuredReplacements(source, value) {
  if (!Array.isArray(value) || !value.length || value.length > MAX_PATCH_REPLACEMENTS) throw new GuardedWriteError("invalid_patch", `Patch must contain 1 to ${MAX_PATCH_REPLACEMENTS} replacements.`);
  let output = source;
  for (const replacement of value) {
    const oldText = typeof replacement?.oldText === "string" ? replacement.oldText : "";
    const newText = typeof replacement?.newText === "string" ? replacement.newText : null;
    if (!oldText || newText == null || oldText.length > MAX_REPLACEMENT_CHARS || newText.length > MAX_REPLACEMENT_CHARS || oldText.includes("\0") || newText.includes("\0")) {
      throw new GuardedWriteError("invalid_patch", "Each patch replacement requires bounded non-binary oldText and newText.");
    }
    const first = output.indexOf(oldText);
    if (first < 0) throw new GuardedWriteError("patch_context_missing", "Patch context was not found exactly.", 409);
    if (output.indexOf(oldText, first + oldText.length) >= 0) throw new GuardedWriteError("patch_context_ambiguous", "Patch context matches more than once.", 409);
    output = `${output.slice(0, first)}${newText}${output.slice(first + oldText.length)}`;
  }
  return output;
}

function findExactApproval(store, runId, worktreeId, relativePath) {
  const targetId = `${worktreeId}:${relativePath}`;
  const approval = store.approvalRequests.find(item => item.agentRunId === runId && item.status === "approved" && item.capability === "repository.modify_files" && item.targetType === "repository_path" && item.targetId === targetId);
  if (!approval) throw new GuardedWriteError("approval_required", "An approved exact-target repository.modify_files request is required.", 409);
  return approval;
}

async function atomicReplace(path, content, mode) {
  const temporary = join(dirname(path), `.ahive-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, content, { flag: "wx", mode: 0o600 });
    await chmod(temporary, mode);
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

function assertWritableContent(buffer) {
  if (buffer.length > MAX_FILE_BYTES) throw new GuardedWriteError("file_too_large", "Guarded write output exceeds 262144 bytes.", 413);
  if (isBinaryRepositoryContent(buffer)) throw new GuardedWriteError("binary_content", "Binary content cannot be written.", 415);
}

function sha256(buffer) { return createHash("sha256").update(buffer).digest("hex"); }
function hashInput(value, label) { const hash = String(value || "").trim().toLowerCase(); if (!/^[0-9a-f]{64}$/.test(hash)) throw new GuardedWriteError("invalid_hash", `${label} must be a full SHA-256 hash.`); return hash; }
function samePath(left, right) { const a = resolve(left || ""); const b = resolve(right || ""); return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b; }
function safeErrorCode(error) { return String(error?.code || "guarded_write_failed").replace(/[^a-z0-9_-]/gi, "_").slice(0, 120); }
function normalizeGuardedError(error) { return error instanceof GuardedWriteError ? error : new GuardedWriteError(safeErrorCode(error), "Guarded write failed safely.", error?.status || 500); }
function resultFromEvent(event) { return { eventId: event.id, operation: event.operation, path: event.relativePath, beforeSha256: event.beforeSha256, afterSha256: event.afterSha256, beforeBytes: event.beforeBytes, afterBytes: event.afterBytes }; }

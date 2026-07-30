import { createHash } from "node:crypto";
import { lstat, mkdir, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { inspectGitRepository, runGit } from "./git-inspection.mjs";
import { isContained, verifyRepositoryPath } from "./repository-paths.mjs";
import {
  getAgentRunManagedWorktree,
  getManagedWorktree,
  listManagedWorktrees,
  markManagedWorktreeDiscarded,
  markManagedWorktreeFailed,
  markManagedWorktreeReady,
  readNeutralStore,
  recordManagedWorktreeInspection,
  reserveManagedWorktree,
  retainManagedWorktree
} from "./neutral-store.mjs";

export class ManagedWorktreeError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "ManagedWorktreeError";
    this.code = code;
    this.status = status;
  }
}

export function createManagedWorktreeService(options = {}) {
  if (!options.store) throw new TypeError("Managed worktree service requires a neutral store.");
  const configuredRoot = String(options.worktreeRoot || "").trim();
  const repositoryRoots = options.repositoryRoots || [];
  const traceSink = typeof options.onTrace === "function" ? options.onTrace : () => {};
  const trace = event => { try { traceSink(event); } catch {} };

  async function create(agentRunId, approvalRequestId, input = {}) {
    const runId = requiredIdentifier(agentRunId, "Agent Run ID");
    const approvalId = requiredIdentifier(approvalRequestId, "Approval Request ID");
    trace({ runId, step: "worktree.create.started" });
    const root = await prepareManagedRoot(configuredRoot);
    const context = await resolveRunRepository(options.store, runId, repositoryRoots);
    const identity = managedWorktreeIdentity(context.repository.id, context.task.id, runId, root);
    if (await pathExists(identity.path)) throw new ManagedWorktreeError("worktree_target_exists", "Managed worktree target already exists and will not be overwritten.", 409);
    if (isContained(context.repositoryPath, identity.path)) throw new ManagedWorktreeError("worktree_inside_repository", "Managed worktree target cannot be inside the base Repository.", 409);
    const git = await inspectGitRepository(context.repositoryPath);
    const reserved = await reserveManagedWorktree(options.store, runId, approvalId, {
      id: identity.id,
      path: identity.path,
      rootPath: root,
      baseCommit: git.head,
      baseBranch: git.branch,
      actor: input.actor || "managed-worktree-service"
    });
    if (!reserved.worktree) {
      trace({ runId, step: "worktree.create.denied", reason: reserved.reason });
      throw new ManagedWorktreeError("approval_unavailable", "Worktree approval is no longer valid.", 409);
    }
    try {
      await prepareTargetParent(identity.path, root);
      await runGit(context.repositoryPath, ["worktree", "add", "--detach", identity.path, git.head], { timeoutMs: 20_000, maxOutputBytes: 64 * 1024 });
      const inspected = await inspectPath(identity.path, root);
      const ready = await markManagedWorktreeReady(options.store, identity.id, inspected);
      trace({ runId, step: "worktree.create.completed", worktreeId: identity.id, status: ready.worktree.status, dirty: ready.worktree.dirty });
      return ready.worktree;
    } catch (error) {
      const present = await pathExists(identity.path);
      await markManagedWorktreeFailed(options.store, identity.id, { present, errorCode: worktreeErrorCode(error) });
      trace({ runId, step: "worktree.create.failed", worktreeId: identity.id, errorCode: worktreeErrorCode(error), present });
      throw normalizeWorktreeError(error);
    }
  }

  async function inspect(id, inspectionOptions = {}) {
    const worktree = getManagedWorktree(await readNeutralStore(options.store), requiredIdentifier(id, "Managed worktree ID"));
    const root = await prepareManagedRoot(configuredRoot);
    assertStoredRoot(worktree, root);
    trace({ runId: worktree.agentRunId, step: "worktree.inspect.started", worktreeId: worktree.id });
    let details;
    try {
      details = await inspectPath(worktree.path, root);
    } catch (error) {
      if (error.code !== "worktree_missing") throw error;
      details = { present: false, dirty: false, head: null };
    }
    const recorded = await recordManagedWorktreeInspection(options.store, worktree.id, { ...details, interrupted: inspectionOptions.interrupted === true });
    trace({ runId: worktree.agentRunId, step: "worktree.inspect.completed", worktreeId: worktree.id, status: recorded.worktree.status, present: recorded.worktree.present, dirty: recorded.worktree.dirty });
    return recorded.worktree;
  }

  async function retain(id) {
    const before = getManagedWorktree(await readNeutralStore(options.store), requiredIdentifier(id, "Managed worktree ID"));
    const retained = await retainManagedWorktree(options.store, before.id);
    trace({ runId: before.agentRunId, step: "worktree.retained", worktreeId: before.id, status: retained.worktree.status });
    return retained.worktree;
  }

  async function discard(id, input = {}) {
    const worktree = getManagedWorktree(await readNeutralStore(options.store), requiredIdentifier(id, "Managed worktree ID"));
    if (input.confirmDiscard !== true) throw new ManagedWorktreeError("discard_confirmation_required", "Discard requires confirmDiscard: true.", 409);
    if (!samePath(String(input.confirmationPath || ""), worktree.path)) {
      throw new ManagedWorktreeError("discard_target_mismatch", "Discard confirmation path does not match the managed worktree.", 409);
    }
    const root = await prepareManagedRoot(configuredRoot);
    assertStoredRoot(worktree, root);
    trace({ runId: worktree.agentRunId, step: "worktree.discard.started", worktreeId: worktree.id });
    const store = await readNeutralStore(options.store);
    const repository = store.repositories.find(item => item.id === worktree.repositoryId);
    if (!repository) throw new ManagedWorktreeError("repository_not_found", "Managed worktree Repository was not found.", 404);
    const verification = await verifyRepositoryPath(repository.resolvedPath, repositoryRoots);
    if (await pathExists(worktree.path)) {
      await inspectPath(worktree.path, root);
      await runGit(verification.resolvedPath, ["worktree", "remove", "--force", worktree.path], { timeoutMs: 20_000, maxOutputBytes: 64 * 1024 });
      if (await pathExists(worktree.path)) throw new ManagedWorktreeError("discard_incomplete", "Git did not remove the managed worktree.", 500);
    }
    const discarded = await markManagedWorktreeDiscarded(options.store, worktree.id);
    trace({ runId: worktree.agentRunId, step: "worktree.discard.completed", worktreeId: worktree.id, status: discarded.worktree.status });
    return discarded.worktree;
  }

  async function reconcile() {
    if (!configuredRoot) return { enabled: false, reconciled: 0, retained: 0, missing: 0, failures: 0 };
    await prepareManagedRoot(configuredRoot);
    const records = listManagedWorktrees(await readNeutralStore(options.store)).filter(item => item.status !== "discarded");
    const result = { enabled: true, reconciled: 0, retained: 0, missing: 0, failures: 0 };
    for (const worktree of records) {
      try {
        const current = await inspect(worktree.id, { interrupted: ["creating", "ready"].includes(worktree.status) });
        result.reconciled += 1;
        if (current.status === "retained") result.retained += 1;
        if (current.status === "missing") result.missing += 1;
      } catch {
        result.failures += 1;
      }
    }
    return result;
  }

  async function getForRun(agentRunId) {
    return getAgentRunManagedWorktree(await readNeutralStore(options.store), requiredIdentifier(agentRunId, "Agent Run ID"));
  }

  return { create, inspect, retain, discard, reconcile, getForRun };
}

export async function verifyManagedWorktreePath(worktree, configuredRoot) {
  const root = await prepareManagedRoot(String(configuredRoot || "").trim());
  assertStoredRoot(worktree, root);
  return inspectPath(worktree.path, root);
}

async function resolveRunRepository(storeTarget, runId, repositoryRoots) {
  const store = await readNeutralStore(storeTarget);
  const run = store.agentRuns.find(item => item.id === runId);
  if (!run) throw new ManagedWorktreeError("run_not_found", "Agent Run was not found.", 404);
  const task = store.agentTasks.find(item => item.id === run.agentTaskId);
  const repository = task?.repositoryId ? store.repositories.find(item => item.id === task.repositoryId) : null;
  if (!task || !repository) throw new ManagedWorktreeError("repository_required", "Agent Run has no assigned Repository.", 409);
  if (!repository.active || repository.verificationStatus !== "verified") throw new ManagedWorktreeError("repository_unavailable", "Agent Run Repository is not active and verified.", 409);
  if (repository.accessMode !== "guarded_write") throw new ManagedWorktreeError("guarded_write_required", "Repository must use guarded_write access for managed worktrees.", 409);
  const verification = await verifyRepositoryPath(repository.resolvedPath, repositoryRoots);
  if (!samePath(verification.resolvedPath, repository.resolvedPath)) throw new ManagedWorktreeError("repository_identity_changed", "Repository canonical identity changed after verification.", 409);
  return { store, run, task, repository, repositoryPath: verification.resolvedPath };
}

async function prepareManagedRoot(value) {
  if (!value) throw new ManagedWorktreeError("worktree_root_unconfigured", "AHIVE_WORKTREE_ROOT is not configured.", 503);
  if (!isAbsolute(value)) throw new ManagedWorktreeError("worktree_root_invalid", "AHIVE_WORKTREE_ROOT must be absolute.", 500);
  await mkdir(resolve(value), { recursive: true });
  const canonical = await realpath(resolve(value));
  const details = await stat(canonical);
  if (!details.isDirectory()) throw new ManagedWorktreeError("worktree_root_invalid", "AHIVE_WORKTREE_ROOT must identify a directory.", 500);
  return canonical;
}

function managedWorktreeIdentity(repositoryId, taskId, runId, root) {
  const digest = value => createHash("sha256").update(value).digest("hex").slice(0, 20);
  return {
    id: `managed-worktree-${digest(`${repositoryId}\0${taskId}\0${runId}`)}`,
    path: join(root, `repository-${digest(repositoryId)}`, `run-${digest(runId)}`)
  };
}

async function inspectPath(path, root) {
  if (!isContained(root, path) || samePath(root, path)) throw new ManagedWorktreeError("worktree_path_escape", "Managed worktree path is outside its configured root.", 403);
  let details;
  try { details = await lstat(path); }
  catch (error) {
    if (error.code === "ENOENT") throw new ManagedWorktreeError("worktree_missing", "Managed worktree directory is missing.", 404);
    throw error;
  }
  if (!details.isDirectory() || details.isSymbolicLink()) throw new ManagedWorktreeError("worktree_path_invalid", "Managed worktree path is not a safe directory.", 403);
  const canonical = await realpath(path);
  if (!samePath(canonical, path) || !isContained(root, canonical)) throw new ManagedWorktreeError("worktree_path_changed", "Managed worktree canonical path changed.", 403);
  const topLevel = (await runGit(canonical, ["rev-parse", "--show-toplevel"], { timeoutMs: 5_000, maxOutputBytes: 16 * 1024 })).stdout.trim();
  if (!samePath(await realpath(resolve(topLevel)), canonical)) throw new ManagedWorktreeError("worktree_identity_invalid", "Managed directory is not the expected Git worktree root.", 409);
  const head = (await runGit(canonical, ["rev-parse", "HEAD"], { timeoutMs: 5_000, maxOutputBytes: 16 * 1024 })).stdout.trim();
  const status = (await runGit(canonical, ["status", "--porcelain=v1", "--untracked-files=normal"], { timeoutMs: 5_000, maxOutputBytes: 64 * 1024 })).stdout;
  return { present: true, dirty: status.split(/\r?\n/).some(Boolean), head, path: canonical, root };
}

async function prepareTargetParent(path, root) {
  const parent = resolve(path, "..");
  if (!isContained(root, parent) || samePath(root, parent)) throw new ManagedWorktreeError("worktree_parent_escape", "Managed worktree parent is outside its configured root.", 403);
  await mkdir(parent, { recursive: true });
  const details = await lstat(parent);
  if (!details.isDirectory() || details.isSymbolicLink()) throw new ManagedWorktreeError("worktree_parent_invalid", "Managed worktree parent is not a safe directory.", 403);
  const canonical = await realpath(parent);
  if (!samePath(canonical, parent) || !isContained(root, canonical)) throw new ManagedWorktreeError("worktree_parent_changed", "Managed worktree parent canonical path changed.", 403);
}

function assertStoredRoot(worktree, root) {
  if (!samePath(worktree.rootPath, root) || !isContained(root, worktree.path) || samePath(root, worktree.path)) {
    throw new ManagedWorktreeError("worktree_root_changed", "Managed worktree no longer matches AHIVE_WORKTREE_ROOT.", 409);
  }
}

async function pathExists(path) {
  try { await lstat(path); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

function requiredIdentifier(value, label) {
  const text = String(value || "").trim();
  if (!text || text.length > 200 || /[\0\r\n]/.test(text)) throw new ManagedWorktreeError("invalid_identifier", `${label} is required.`);
  return text;
}

function samePath(left, right) {
  const normalizedLeft = resolve(left || "");
  const normalizedRight = resolve(right || "");
  return process.platform === "win32" ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase() : normalizedLeft === normalizedRight;
}

function worktreeErrorCode(error) {
  return String(error?.code || "worktree_creation_failed").replace(/[^a-z0-9_-]/gi, "_").slice(0, 120);
}

function normalizeWorktreeError(error) {
  return error instanceof ManagedWorktreeError ? error : new ManagedWorktreeError(worktreeErrorCode(error), "Managed worktree operation failed safely.", error?.status || 500);
}

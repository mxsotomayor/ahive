import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { lstat, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { verifyManagedWorktreePath } from "./git-worktrees.mjs";
import { consumeRunApproval, readNeutralStore } from "./neutral-store.mjs";
import { isContained } from "./repository-paths.mjs";

const inheritedEnvironmentKeys = ["PATH", "Path", "PATHEXT", "SystemRoot", "WINDIR", "TEMP", "TMP", "TMPDIR"];
const outputSecretPatterns = [
  /\b(?:authorization|token|api[_-]?key|client[_-]?secret|password)\s*[:=]\s*[^\s,;]+/gi,
  /\b(?:gh[opusr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9_-]{20,})\b/g
];

export class VerificationCommandError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "VerificationCommandError";
    this.code = code;
    this.status = status;
  }
}

export function createVerificationCommandService(options = {}) {
  if (!options.store) throw new TypeError("Verification command service requires a neutral store.");
  const worktreeRoot = String(options.worktreeRoot || "").trim();
  const maximumConcurrency = boundedServiceConcurrency(options.maxConcurrency);
  const spawnProcess = options.spawnProcess || spawn;
  const active = new Map();
  const auditSink = typeof options.onAudit === "function" ? options.onAudit : () => {};
  const audit = event => { try { auditSink(event); } catch {} };

  async function execute(agentRunId, policyId, input = {}) {
    const runId = requiredIdentifier(agentRunId, "Agent Run ID");
    const commandPolicyId = requiredIdentifier(policyId, "Verification command policy ID");
    if (active.size >= maximumConcurrency) throw new VerificationCommandError("concurrency_limit", "The verification command concurrency limit is active.", 429);
    if ([...active.values()].some(entry => entry.runId === runId)) throw new VerificationCommandError("run_concurrency_limit", "This Agent Run already has an active verification command.", 409);

    const executionId = `verification-execution-${randomUUID()}`;
    const reservation = { executionId, runId, requestCancel: null };
    active.set(executionId, reservation);
    const started = Date.now();
    audit({ runId, tool: "run_verification", phase: "started", request: { executionId, policyId: commandPolicyId } });
    try {
      const context = await resolveExecutionContext(options.store, runId, commandPolicyId, worktreeRoot);
      const consumed = await consumeRunApproval(options.store, runId, context.approval.id, {
        capability: "repository.run_verification",
        targetType: "verification_command",
        targetId: `${context.worktree.id}:${context.policy.id}`,
        actor: String(input.actor || "verification-command-service")
      });
      if (!consumed.consumed) throw new VerificationCommandError("approval_unavailable", "Verification approval is no longer valid.", 409);
      let result = await runConfiguredProcess({
        executionId,
        runId,
        policy: context.policy,
        cwd: context.cwd,
        signal: input.signal,
        spawnProcess,
        onReady: cancel => { reservation.requestCancel = cancel; }
      });
      if (typeof options.onResult === "function") {
        try {
          const artifact = await options.onResult(runId, result);
          result = { ...result, artifactId: artifact?.id || null, artifactPersisted: Boolean(artifact?.id) };
        } catch (error) {
          audit({ runId, tool: "run_verification", phase: "artifact_failed", errorCode: String(error?.code || "artifact_persistence_failed").slice(0, 120) });
          result = { ...result, artifactId: null, artifactPersisted: false, artifactErrorCode: "artifact_persistence_failed" };
        }
      }
      audit({
        runId,
        tool: "run_verification",
        phase: "completed",
        result: { executionId, policyId: context.policy.id, status: result.status, exitCode: result.exitCode, errorCode: result.errorCode, durationMs: result.durationMs },
        durationMs: Date.now() - started
      });
      return result;
    } catch (error) {
      const normalized = normalizeVerificationError(error);
      audit({ runId, tool: "run_verification", phase: normalized.status >= 500 ? "failed" : "denied", errorCode: normalized.code, durationMs: Date.now() - started });
      throw normalized;
    } finally {
      active.delete(executionId);
    }
  }

  function cancel(agentRunId) {
    const runId = String(agentRunId || "");
    const entry = [...active.values()].find(item => item.runId === runId);
    if (!entry?.requestCancel) return false;
    entry.requestCancel("cancelled");
    return true;
  }

  function cancelAll() {
    let count = 0;
    for (const entry of active.values()) {
      if (!entry.requestCancel) continue;
      entry.requestCancel("cancelled");
      count += 1;
    }
    return count;
  }

  return { execute, cancel, cancelAll, activeCount: () => active.size };
}

async function resolveExecutionContext(storeTarget, runId, policyId, worktreeRoot) {
  const store = await readNeutralStore(storeTarget);
  const run = store.agentRuns.find(item => item.id === runId);
  const worktree = run ? store.managedWorktrees.find(item => item.agentRunId === run.id) : null;
  const repository = worktree ? store.repositories.find(item => item.id === worktree.repositoryId) : null;
  if (!run) throw new VerificationCommandError("run_not_found", "Agent Run was not found.", 404);
  if (!worktree || worktree.status !== "ready" || worktree.present !== true) throw new VerificationCommandError("worktree_not_ready", "Agent Run has no ready managed worktree.", 409);
  if (!repository || repository.accessMode !== "guarded_write" || !repository.active || repository.verificationStatus !== "verified") {
    throw new VerificationCommandError("verification_unavailable", "Repository no longer permits managed verification commands.", 409);
  }
  const policy = (repository.verificationCommands || []).find(item => item.id === policyId);
  if (!policy) throw new VerificationCommandError("command_disallowed", "Verification command is not configured for this Repository.", 403);
  const targetId = `${worktree.id}:${policy.id}`;
  const approval = store.approvalRequests.find(item => item.agentRunId === run.id && item.status === "approved" && item.capability === "repository.run_verification" && item.targetType === "verification_command" && item.targetId === targetId);
  if (!approval) throw new VerificationCommandError("approval_required", "An approved exact-target repository.run_verification request is required.", 409);

  const verified = await verifyManagedWorktreePath(worktree, worktreeRoot);
  const requestedDirectory = policy.workingDirectory === "." ? verified.path : join(verified.path, ...policy.workingDirectory.split("/"));
  const cwd = await realpath(requestedDirectory).catch(() => { throw new VerificationCommandError("working_directory_missing", "Configured verification working directory is unavailable.", 409); });
  const details = await lstat(requestedDirectory).catch(() => null);
  if (!details?.isDirectory() || details.isSymbolicLink() || !samePath(cwd, requestedDirectory) || !isContained(verified.path, cwd)) {
    throw new VerificationCommandError("working_directory_invalid", "Configured verification working directory is not a safe directory inside the managed worktree.", 403);
  }
  if (!isAbsolute(policy.executable)) throw new VerificationCommandError("executable_invalid", "Configured verification executable is not absolute.", 500);
  const executable = await realpath(resolve(policy.executable)).catch(() => { throw new VerificationCommandError("executable_missing", "Configured verification executable is unavailable.", 409); });
  const executableDetails = await stat(executable).catch(() => null);
  if (!executableDetails?.isFile()) throw new VerificationCommandError("executable_invalid", "Configured verification executable is not a regular file.", 409);
  return { run, worktree, repository, policy: { ...policy, executable }, approval, cwd };
}

function runConfiguredProcess(options) {
  return new Promise(resolveResult => {
    const startedAt = new Date().toISOString();
    const started = Date.now();
    let child;
    let settled = false;
    let cancellationReason = null;
    let launchError = null;
    let outputLimitExceeded = false;
    let outputBytes = 0;
    const stdout = [];
    const stderr = [];

    const finish = (exitCode = null, signal = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
      const sanitizedStdout = sanitizeOutput(Buffer.concat(stdout).toString("utf8"));
      const sanitizedStderr = sanitizeOutput(Buffer.concat(stderr).toString("utf8"));
      const status = launchError ? "launch_error"
        : cancellationReason === "timeout" ? "timed_out"
          : cancellationReason === "cancelled" ? "cancelled"
            : outputLimitExceeded ? "failed"
              : exitCode === 0 ? "passed" : "failed";
      resolveResult({
        id: options.executionId,
        agentRunId: options.runId,
        policyId: options.policy.id,
        policyName: options.policy.name,
        status,
        exitCode: Number.isInteger(exitCode) ? exitCode : null,
        signal: signal ? String(signal) : null,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
        workingDirectory: options.policy.workingDirectory,
        errorCode: launchError ? "launch_error" : cancellationReason === "timeout" ? "timeout" : cancellationReason === "cancelled" ? "cancelled" : outputLimitExceeded ? "output_limit_exceeded" : exitCode === 0 ? null : "nonzero_exit",
        output: {
          stdout: sanitizedStdout.text,
          stderr: sanitizedStderr.text,
          capturedBytes: outputBytes,
          limitBytes: options.policy.maxOutputBytes,
          truncated: outputLimitExceeded,
          redactionCount: sanitizedStdout.redactionCount + sanitizedStderr.redactionCount
        }
      });
    };

    const requestCancel = reason => {
      if (settled || cancellationReason || outputLimitExceeded) return;
      cancellationReason = reason;
      terminateProcessTree(child);
    };
    options.onReady(requestCancel);
    const abort = () => requestCancel("cancelled");
    if (options.signal?.aborted) cancellationReason = "cancelled";
    options.signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(() => requestCancel("timeout"), options.policy.timeoutMs);
    timeout.unref?.();

    try {
      child = options.spawnProcess(options.policy.executable, options.policy.args, {
        cwd: options.cwd,
        env: verificationEnvironment(options.policy.environment),
        shell: false,
        windowsHide: true,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      launchError = error;
      finish();
      return;
    }
    if (cancellationReason) terminateProcessTree(child);

    const capture = target => chunk => {
      if (settled || outputLimitExceeded) return;
      const buffer = Buffer.from(chunk);
      const remaining = Math.max(0, options.policy.maxOutputBytes - outputBytes);
      if (remaining) {
        target.push(buffer.subarray(0, remaining));
        outputBytes += Math.min(buffer.length, remaining);
      }
      if (buffer.length > remaining) {
        outputLimitExceeded = true;
        terminateProcessTree(child);
      }
    };
    child.stdout?.on("data", capture(stdout));
    child.stderr?.on("data", capture(stderr));
    child.once("error", error => { launchError = error; });
    child.once("close", (exitCode, signal) => finish(exitCode, signal));
  });
}

function verificationEnvironment(configured) {
  const environment = {};
  for (const key of inheritedEnvironmentKeys) if (process.env[key] != null) environment[key] = process.env[key];
  return { ...environment, ...(configured || {}) };
}

function terminateProcessTree(child) {
  if (!child || !Number.isInteger(child.pid) || child.exitCode != null) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { shell: false, windowsHide: true, stdio: "ignore" });
    killer.unref?.();
    return;
  }
  try { process.kill(-child.pid, "SIGTERM"); } catch { try { child.kill("SIGTERM"); } catch {} }
  const force = setTimeout(() => {
    if (child.exitCode != null) return;
    try { process.kill(-child.pid, "SIGKILL"); } catch { try { child.kill("SIGKILL"); } catch {} }
  }, 1_000);
  force.unref?.();
}

function sanitizeOutput(value) {
  let text = String(value || "").replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "").replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, "�");
  let redactionCount = 0;
  for (const pattern of outputSecretPatterns) {
    text = text.replace(pattern, match => {
      redactionCount += 1;
      const separator = match.search(/[:=]/);
      return separator >= 0 ? `${match.slice(0, separator)}=[REDACTED]` : "[REDACTED]";
    });
  }
  return { text, redactionCount };
}

function samePath(left, right) {
  const a = resolve(left || "");
  const b = resolve(right || "");
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function requiredIdentifier(value, label) {
  const identifier = String(value || "").trim();
  if (!identifier || identifier.length > 200 || /[\0\r\n]/.test(identifier)) throw new VerificationCommandError("invalid_identifier", `${label} is required.`);
  return identifier;
}

function boundedServiceConcurrency(value) {
  const number = value == null ? 2 : Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 8) throw new TypeError("Verification command concurrency must be between 1 and 8.");
  return number;
}

function normalizeVerificationError(error) {
  if (error instanceof VerificationCommandError) return error;
  return new VerificationCommandError(String(error?.code || "verification_failed").replace(/[^a-z0-9_-]/gi, "_").slice(0, 120), "Verification command failed safely.", error?.status || 500);
}

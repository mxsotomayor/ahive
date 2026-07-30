import { spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

export class GitInspectionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "GitInspectionError";
    this.status = status;
  }
}

export async function inspectGitRepository(repositoryPath, options = {}) {
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxOutputBytes = options.maxOutputBytes ?? 64 * 1024;
  const run = args => runGit(repositoryPath, args, { timeoutMs, maxOutputBytes });
  const inside = await run(["rev-parse", "--is-inside-work-tree"]);
  if (inside.stdout.trim() !== "true") throw new GitInspectionError("Path is not a Git working tree.");
  const topLevel = await run(["rev-parse", "--show-toplevel"]);
  const canonicalTop = await realpath(resolve(topLevel.stdout.trim()));
  const canonicalRequested = await realpath(resolve(repositoryPath));
  if (!samePath(canonicalTop, canonicalRequested)) {
    throw new GitInspectionError("Registered repository path must be the Git working-tree root.");
  }

  const head = (await run(["rev-parse", "HEAD"])).stdout.trim();
  const branchResult = await runGit(repositoryPath, ["symbolic-ref", "--quiet", "--short", "HEAD"], {
    timeoutMs, maxOutputBytes, acceptedExitCodes: [0, 1]
  });
  const remoteResult = await runGit(repositoryPath, ["remote", "get-url", "--all", "origin"], {
    timeoutMs, maxOutputBytes, acceptedExitCodes: [0, 2]
  });
  const status = await run(["status", "--porcelain=v1", "-uno"]);
  const changedCount = status.stdout.split(/\r?\n/).filter(Boolean).length;
  return {
    branch: branchResult.stdout.trim() || null,
    detached: !branchResult.stdout.trim(),
    head,
    remoteHosts: [...new Set(remoteResult.stdout.split(/\r?\n/).filter(Boolean).map(remoteHost).filter(Boolean))],
    dirty: changedCount > 0,
    changedCount
  };
}

export function runGit(cwd, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxOutputBytes = options.maxOutputBytes ?? 64 * 1024;
  const acceptedExitCodes = options.acceptedExitCodes || [0];
  const executable = options.executable || "git";
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { cwd, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let settled = false;
    let timer;
    let pendingError = null;
    const finish = callback => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const append = (current, chunk) => {
      const next = Buffer.concat([current, chunk]);
      if (next.length > maxOutputBytes) {
        pendingError ||= new GitInspectionError("Git command output exceeded the safety limit.", 413);
        child.kill();
        return current;
      }
      return next;
    };
    child.stdout.on("data", chunk => { stdout = append(stdout, chunk); });
    child.stderr.on("data", chunk => { stderr = append(stderr, chunk); });
    child.on("error", error => finish(() => reject(new GitInspectionError(`Git could not be started: ${error.message}.`, 503))));
    child.on("close", code => finish(() => {
      if (pendingError) return reject(pendingError);
      if (!acceptedExitCodes.includes(code)) return reject(new GitInspectionError("Git inspection command failed."));
      resolvePromise({ code, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8") });
    }));
    timer = setTimeout(() => {
      pendingError ||= new GitInspectionError("Git inspection timed out.", 504);
      child.kill();
    }, timeoutMs);
  });
}

function remoteHost(value) {
  const trimmed = value.trim();
  try { return new URL(trimmed).hostname || null; } catch {}
  const scpLike = trimmed.match(/^(?:[^@]+@)?([^:]+):/);
  return scpLike?.[1] || null;
}

function samePath(left, right) {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { delimiter, dirname, extname, isAbsolute, join, resolve } from "node:path";

const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_OUTPUT_BYTES = 16_384;

export async function inspectCodexCli(options = {}) {
  const executable = String(options.executable || "codex").trim() || "codex";
  const runner = options.runner || runCodexCommand;
  const versionResult = await runner(executable, ["--version"], options);
  if (!versionResult.ok) {
    return {
      status: "cli_unavailable",
      installed: false,
      authenticated: false,
      version: null
    };
  }

  const loginResult = await runner(executable, ["login", "status"], options);
  const authenticated = loginResult.ok && /logged in/i.test(`${loginResult.stdout}\n${loginResult.stderr}`);
  return {
    status: authenticated ? "ready" : "authentication_required",
    installed: true,
    authenticated,
    version: normalizeVersion(versionResult.stdout)
  };
}

export async function runCodexCommand(executable, args, options = {}) {
  let invocation;
  try {
    invocation = await resolveCodexInvocation(executable, options);
  } catch (error) {
    return commandFailure(error.code || "codex_resolution_failed");
  }
  return spawnCodexCommand(invocation.executable, [...invocation.argsPrefix, ...args], options);
}

export async function resolveCodexInvocation(executable, options = {}) {
  const requested = String(executable || "codex").trim() || "codex";
  if ((options.platform || process.platform) !== "win32") {
    return { executable: requested, argsPrefix: [] };
  }

  const resolved = await resolveWindowsExecutable(requested, options);
  if (!resolved || extname(resolved).toLowerCase() !== ".cmd") {
    return { executable: resolved || requested, argsPrefix: [] };
  }

  const entrypoint = join(dirname(resolved), "node_modules", "@openai", "codex", "bin", "codex.js");
  try {
    await access(entrypoint);
  } catch {
    const error = new Error("The configured Codex .cmd file is not an npm-installed @openai/codex shim.");
    error.code = "unsupported_windows_codex_shim";
    throw error;
  }
  return { executable: options.nodeExecutable || process.execPath, argsPrefix: [entrypoint] };
}

function spawnCodexCommand(executable, args, options = {}) {
  return new Promise(resolve => {
    let stdout = "";
    let stderr = "";
    let finished = false;
    let child;
    if (options.signal?.aborted) {
      resolve({ ...commandFailure("cancelled"), cancelled: true });
      return;
    }
    try {
      child = spawn(executable, args, {
        cwd: options.cwd,
        env: options.env || process.env,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      resolve(commandFailure(error.code || "spawn_error", stdout, stderr));
      return;
    }
    const timeout = setTimeout(() => {
      child.kill();
      finish({ ok: false, exitCode: null, stdout, stderr, timedOut: true });
    }, options.timeoutMs || DEFAULT_TIMEOUT_MS);

    const abort = () => {
      child.kill();
      finish({ ok: false, exitCode: null, stdout, stderr, cancelled: true });
    };
    options.signal?.addEventListener("abort", abort, { once: true });

    child.stdout.on("data", chunk => {
      options.onStdout?.(String(chunk));
      stdout = appendBounded(stdout, chunk);
    });
    child.stderr.on("data", chunk => {
      options.onStderr?.(String(chunk));
      stderr = appendBounded(stderr, chunk);
    });
    child.once("error", error => finish({ ok: false, exitCode: null, stdout, stderr, errorCode: error.code || "spawn_error" }));
    child.once("close", exitCode => finish({ ok: exitCode === 0, exitCode, stdout, stderr }));

    function finish(result) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
      resolve(result);
    }
  });
}

async function resolveWindowsExecutable(requested, options) {
  const cwd = options.cwd || process.cwd();
  if (isAbsolute(requested) || /[\\/]/.test(requested)) {
    return firstAccessible(windowsCandidates(resolve(cwd, requested)));
  }

  const environment = options.env || process.env;
  const pathValue = environmentValue(environment, "PATH") || "";
  for (const entry of pathValue.split(delimiter).map(unquote).filter(Boolean)) {
    const match = await firstAccessible(windowsCandidates(join(entry, requested)));
    if (match) return match;
  }
  return null;
}

function windowsCandidates(path) {
  return extname(path) ? [path] : [`${path}.exe`, `${path}.cmd`];
}

async function firstAccessible(paths) {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch {}
  }
  return null;
}

function environmentValue(environment, name) {
  const key = Object.keys(environment).find(candidate => candidate.toLowerCase() === name.toLowerCase());
  return key ? environment[key] : undefined;
}

function unquote(value) {
  const normalized = String(value || "").trim();
  return normalized.startsWith('"') && normalized.endsWith('"') ? normalized.slice(1, -1) : normalized;
}

function commandFailure(errorCode, stdout = "", stderr = "") {
  return { ok: false, exitCode: null, stdout, stderr, errorCode };
}

function appendBounded(current, chunk) {
  if (Buffer.byteLength(current) >= MAX_OUTPUT_BYTES) return current;
  return `${current}${String(chunk)}`.slice(0, MAX_OUTPUT_BYTES);
}

function normalizeVersion(value) {
  const normalized = String(value || "").trim().replace(/^codex-cli\s+/i, "");
  return normalized || null;
}

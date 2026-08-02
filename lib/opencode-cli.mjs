import { access } from "node:fs/promises";
import { delimiter, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { spawnCodexCommand } from "./codex-cli.mjs";

// OpenCode CLI probe adapter. Authentication is owned by the installed CLI
// (`opencode auth login`, stored in the CLI's own auth.json); Ahive only runs
// bounded `--version` and `auth list` probes and projects safe status flags.

export async function inspectOpenCodeCli(options = {}) {
  const executable = String(options.executable || "opencode").trim() || "opencode";
  const runner = options.runner || runOpenCodeCommand;
  const versionResult = await runner(executable, ["--version"], options);
  if (!versionResult.ok) {
    return {
      status: "cli_unavailable",
      installed: false,
      authenticated: false,
      version: null
    };
  }

  const authResult = await runner(executable, ["auth", "list"], options);
  const authenticated = authResult.ok && hasConfiguredCredentials(`${authResult.stdout}\n${authResult.stderr}`);
  return {
    status: authenticated ? "ready" : "authentication_required",
    installed: true,
    authenticated,
    version: normalizeVersion(versionResult.stdout)
  };
}

export async function runOpenCodeCommand(executable, args, options = {}) {
  let invocation;
  try {
    invocation = await resolveOpenCodeInvocation(executable, options);
  } catch (error) {
    return { ok: false, exitCode: null, stdout: "", stderr: "", errorCode: error.code || "opencode_resolution_failed" };
  }
  return spawnCodexCommand(invocation.executable, [...invocation.argsPrefix, ...args], options);
}

export async function resolveOpenCodeInvocation(executable, options = {}) {
  const requested = String(executable || "opencode").trim() || "opencode";
  if ((options.platform || process.platform) !== "win32") {
    return { executable: requested, argsPrefix: [] };
  }

  const resolved = await resolveWindowsExecutable(requested, options);
  if (!resolved || extname(resolved).toLowerCase() !== ".cmd") {
    return { executable: resolved || requested, argsPrefix: [] };
  }

  // The npm opencode-ai package ships a real opencode.exe beside its shim;
  // invoke it directly so no command ever passes through a shell.
  const entrypoint = join(dirname(resolved), "node_modules", "opencode-ai", "bin", "opencode.exe");
  try {
    await access(entrypoint);
  } catch {
    const error = new Error("The configured OpenCode .cmd file is not an npm-installed opencode-ai shim.");
    error.code = "unsupported_windows_opencode_shim";
    throw error;
  }
  return { executable: entrypoint, argsPrefix: [] };
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

function hasConfiguredCredentials(output) {
  // `opencode auth list` prints a footer such as "3 credentials".
  return /[1-9]\d*\s+credentials?/i.test(stripAnsi(output));
}

function stripAnsi(value) {
  return String(value).replace(/\x1B\[[0-9;]*m/g, "");
}

function normalizeVersion(value) {
  const normalized = String(value || "").trim().replace(/^opencode\s+/i, "");
  return normalized || null;
}

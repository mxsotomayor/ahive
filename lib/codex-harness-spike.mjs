import { runCodexCommand } from "./codex-cli.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const MAX_PROMPT_CHARS = 20_000;
const MAX_MESSAGE_CHARS = 32_000;

export async function runCodexExec(options = {}) {
  const prompt = boundedPrompt(options.prompt);
  const collector = createCodexJsonlCollector({ onEvent: options.onEvent });
  const traceCollector = createMcpTraceCollector({ onTrace: options.onTrace });
  const runner = options.runner || runCodexCommand;
  if (options.repositoryTools?.auditPath) {
    await mkdir(dirname(options.repositoryTools.auditPath), { recursive: true });
    await writeFile(options.repositoryTools.auditPath, "", "utf8");
  }
  const args = buildCodexExecArgs({ ...options, prompt });
  const result = await runner(options.executable || "codex", args, {
    cwd: options.cwd,
    env: options.env,
    timeoutMs: options.timeoutMs || 60_000,
    signal: options.signal,
    onStdout: chunk => collector.push(chunk),
    onStderr: chunk => traceCollector.push(chunk)
  });
  collector.finish();
  traceCollector.finish();
  const events = collector.result();
  const toolActivity = await readToolActivity(options.repositoryTools?.auditPath, options.repositoryTools?.runId);
  return {
    status: spikeStatus(result, events, collector.malformedLines),
    threadId: events.threadId,
    finalMessage: events.finalMessage,
    usage: events.usage,
    eventTypes: events.eventTypes,
    toolEventTypes: events.toolEventTypes,
    unexpectedToolEventTypes: events.unexpectedToolEventTypes,
    toolActivity,
    malformedEventCount: collector.malformedLines,
    exitCode: Number.isInteger(result.exitCode) ? result.exitCode : null,
    errorCode: safeErrorCode(result, events)
  };
}

export const runCodexExecSpike = runCodexExec;

export function buildCodexExecArgs(options = {}) {
  const model = String(options.model || "").trim();
  const common = [
    "--json",
    "--ignore-user-config",
    "--ignore-rules",
    "--strict-config",
    "-c", 'approval_policy="never"',
    "-c", 'sandbox_mode="read-only"',
    "-c", "features.shell_tool=false",
    "-c", 'web_search="disabled"',
    "-c", "features.multi_agent=false",
    "-c", "features.browser_use=false",
    "-c", "features.browser_use_external=false",
    "-c", "features.browser_use_full_cdp_access=false",
    "-c", "features.computer_use=false",
    "-c", "features.image_generation=false",
    "-c", "features.apps=false",
    "-c", "features.plugins=false",
    "-c", "features.goals=false",
    "-c", "features.hooks=false"
  ];
  if (options.repositoryTools) common.push(...repositoryMcpArguments(options.repositoryTools));
  if (model) common.push("--model", model);
  if (options.ephemeral === true) common.push("--ephemeral");
  if (options.skipGitRepoCheck === true) common.push("--skip-git-repo-check");

  if (options.resumeSessionId) {
    return ["exec", "resume", ...common, String(options.resumeSessionId), boundedPrompt(options.prompt)];
  }
  return ["exec", "--sandbox", "read-only", ...common, boundedPrompt(options.prompt)];
}

export function createCodexJsonlCollector(options = {}) {
  let buffer = "";
  let malformedLines = 0;
  let threadId = null;
  let finalMessage = null;
  let usage = null;
  let failed = false;
  const eventTypes = new Set();
  const toolEventTypes = new Set();
  const unexpectedToolEventTypes = new Set();

  function consume(line) {
    if (!line.trim()) return;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      malformedLines += 1;
      return;
    }
    const type = typeof event.type === "string" ? event.type : "unknown";
    eventTypes.add(type);
    if (type === "thread.started" && typeof event.thread_id === "string") {
      threadId = event.thread_id;
      options.onEvent?.({ type: "thread.started", threadId });
    }
    if (type === "turn.started") options.onEvent?.({ type: "turn.started" });
    if (type === "turn.failed" || type === "error") {
      failed = true;
      options.onEvent?.({ type: "turn.failed" });
    }
    if (type === "turn.completed") {
      usage = sanitizedUsage(event.usage);
      options.onEvent?.({ type: "turn.completed", usage });
    }
    if (type.startsWith("item.") && event.item && typeof event.item.type === "string") {
      if (event.item.type === "agent_message" && type === "item.completed" && typeof event.item.text === "string") {
        finalMessage = event.item.text.slice(0, MAX_MESSAGE_CHARS);
        options.onEvent?.({ type: "assistant.output", text: finalMessage });
      } else if (["reasoning", "todo_list", "error"].includes(event.item.type)) {
        options.onEvent?.({ type: "agent.step", stepType: event.item.type === "reasoning" ? "reasoning_summary" : event.item.type === "todo_list" ? "plan_update" : "item_error", phase: type === "item.started" ? "started" : type === "item.completed" ? "completed" : "updated" });
      } else if (["command_execution", "file_change", "mcp_tool_call", "web_search"].includes(event.item.type)) {
        toolEventTypes.add(event.item.type);
        const allowedMcp = event.item.type === "mcp_tool_call" && event.item.server === "ahive_repository" && ["list_files", "search_text", "read_text", "git_summary", "list_verification_commands", "apply_patch", "create_file", "run_verification"].includes(event.item.tool);
        if (!allowedMcp) unexpectedToolEventTypes.add(event.item.type);
        options.onEvent?.({ type: allowedMcp ? "tool.activity" : "tool.detected", toolType: event.item.type, toolName: allowedMcp ? event.item.tool : null, phase: type === "item.started" ? "started" : "completed", status: safeToolStatus(event.item.status) });
      }
    }
  }

  return {
    get malformedLines() { return malformedLines; },
    push(chunk) {
      buffer += String(chunk);
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) consume(line);
      if (buffer.length > 1_000_000) {
        buffer = "";
        malformedLines += 1;
      }
    },
    finish() {
      if (buffer) consume(buffer);
      buffer = "";
    },
    result() {
      return {
        threadId,
        finalMessage,
        usage,
        failed,
        eventTypes: [...eventTypes].slice(0, 32),
        toolEventTypes: [...toolEventTypes],
        unexpectedToolEventTypes: [...unexpectedToolEventTypes]
      };
    }
  };
}

function repositoryMcpArguments(config) {
  const required = ["serverScript", "databasePath", "repositoryId", "repositoryRoots", "auditPath", "runId"];
  for (const field of required) if (config[field] == null) throw new TypeError(`Repository MCP configuration requires ${field}.`);
  const args = [
    String(config.serverScript),
    "--database", String(config.databasePath),
    "--repository", String(config.repositoryId),
    "--roots", JSON.stringify(config.repositoryRoots),
    "--audit", String(config.auditPath),
    "--run", String(config.runId)
  ];
  if (config.guardedWriteEnabled) {
    if (!config.worktreeRoot) throw new TypeError("Guarded Repository MCP configuration requires worktreeRoot.");
    if (!config.artifactRoot) throw new TypeError("Guarded Repository MCP configuration requires artifactRoot.");
    args.push("--worktree-root", String(config.worktreeRoot));
    args.push("--artifact-root", String(config.artifactRoot));
  }
  const enabledTools = config.guardedWriteEnabled
    ? '["list_files","search_text","read_text","git_summary","list_verification_commands","apply_patch","create_file","run_verification"]'
    : '["list_files","search_text","read_text","git_summary","list_verification_commands"]';
  return [
    "-c", `mcp_servers.ahive_repository.command=${tomlString(config.nodeExecutable || process.execPath)}`,
    "-c", `mcp_servers.ahive_repository.args=${JSON.stringify(args)}`,
    "-c", "mcp_servers.ahive_repository.required=true",
    "-c", "mcp_servers.ahive_repository.tool_timeout_sec=305",
    "-c", 'mcp_servers.ahive_repository.default_tools_approval_mode="auto"',
    "-c", `mcp_servers.ahive_repository.enabled_tools=${enabledTools}`
  ];
}

function tomlString(value) { return JSON.stringify(String(value)); }
function safeToolStatus(value) { return ["in_progress", "completed", "failed"].includes(value) ? value : null; }

function createMcpTraceCollector(options = {}) {
  let buffer = "";
  const consume = line => {
    const marker = line.indexOf("AHIVE_TOOL_TRACE ");
    if (marker < 0) return;
    try { options.onTrace?.(JSON.parse(line.slice(marker + "AHIVE_TOOL_TRACE ".length))); } catch {}
  };
  return {
    push(chunk) { buffer += String(chunk); const lines = buffer.split(/\r?\n/); buffer = lines.pop() || ""; for (const line of lines) consume(line); if (buffer.length > 64_000) buffer = ""; },
    finish() { if (buffer) consume(buffer); buffer = ""; }
  };
}

export async function readToolActivity(path, runId) {
  if (!path) return [];
  let content;
  try { content = await readFile(path, "utf8"); } catch { return []; }
  if (content.length > 256_000) content = content.slice(0, 256_000);
  return content.split(/\r?\n/).filter(Boolean).slice(0, 128).flatMap(line => {
    try {
      const event = JSON.parse(line);
      if (event.runId !== runId || !["mcp_server", "list_files", "search_text", "read_text", "git_summary", "list_verification_commands", "apply_patch", "create_file", "run_verification"].includes(event.tool)) return [];
      return [{ sequence: Number(event.sequence) || 0, timestamp: String(event.timestamp || ""), repositoryId: String(event.repositoryId || ""), tool: event.tool, phase: String(event.phase || ""), request: event.request && typeof event.request === "object" ? event.request : null, result: event.result && typeof event.result === "object" ? event.result : null, errorCode: event.errorCode ? String(event.errorCode).slice(0, 80) : null, durationMs: Number.isFinite(event.durationMs) ? event.durationMs : null }];
    } catch { return []; }
  });
}

function boundedPrompt(value) {
  const prompt = String(value || "").trim();
  if (!prompt) throw new TypeError("Codex spike prompt is required.");
  if (prompt.length > MAX_PROMPT_CHARS) throw new TypeError(`Codex spike prompt cannot exceed ${MAX_PROMPT_CHARS} characters.`);
  return prompt;
}

function sanitizedUsage(value) {
  if (!value || typeof value !== "object") return null;
  const result = {};
  for (const key of ["input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens"]) {
    if (Number.isFinite(value[key]) && value[key] >= 0) result[key] = Number(value[key]);
  }
  return result;
}

function spikeStatus(result, events, malformedLines) {
  if (result.cancelled) return "cancelled";
  if (result.timedOut) return "timed_out";
  if (result.ok && !events.failed && events.finalMessage) return "completed";
  if (result.errorCode === "ENOENT" || result.errorCode === "unsupported_windows_codex_shim") return "cli_unavailable";
  if (isAuthenticationFailure(result)) return "authentication_required";
  if (malformedLines && !events.eventTypes.length) return "invalid_event_stream";
  return "failed";
}

function safeErrorCode(result, events) {
  if (result.errorCode === "ENOENT" || result.errorCode === "unsupported_windows_codex_shim") return "cli_unavailable";
  if (result.cancelled) return "cancelled";
  if (result.timedOut) return "timeout";
  if (isAuthenticationFailure(result)) return "authentication_required";
  if (events.failed || !result.ok) return "codex_exec_failed";
  return null;
}

function isAuthenticationFailure(result) {
  return /not logged in|login required|authentication required|unauthorized/i.test(`${result.stdout || ""}\n${result.stderr || ""}`);
}

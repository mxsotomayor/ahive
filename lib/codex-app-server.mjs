import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveCodexInvocation } from "./codex-cli.mjs";
import { readToolActivity } from "./codex-harness-spike.mjs";

const MAX_PROMPT_CHARS = 20_000;
const MAX_MESSAGE_CHARS = 32_000;
const MAX_PROTOCOL_BUFFER_CHARS = 1_000_000;

export async function runCodexAppServer(options = {}) {
  const prompt = boundedPrompt(options.prompt);
  const timeoutMs = options.timeoutMs || 60_000;
  const repositoryTools = options.repositoryTools || null;
  if (repositoryTools?.auditPath) {
    await mkdir(dirname(repositoryTools.auditPath), { recursive: true });
    await writeFile(repositoryTools.auditPath, "", "utf8");
  }

  let invocation;
  try {
    invocation = await resolveCodexInvocation(options.executable || "codex", options);
  } catch (error) {
    return failedOutcome(error.code || "cli_unavailable", repositoryTools);
  }

  const args = [...invocation.argsPrefix, ...buildCodexAppServerArgs(options)];
  const spawnProcess = options.spawnProcess || spawn;
  let child;
  try {
    child = spawnProcess(invocation.executable, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch (error) {
    return failedOutcome(error.code || "spawn_error", repositoryTools);
  }

  return new Promise(resolve => {
    let buffer = "";
    let stderr = "";
    let settled = false;
    let threadId = null;
    let turnId = null;
    let finalMessage = "";
    let usage = null;
    let failed = false;
    let malformedLines = 0;
    let nextRequestId = 1;
    const pendingRequests = new Map();
    const eventTypes = new Set();
    const toolEventTypes = new Set();
    const unexpectedToolEventTypes = new Set();

    const timeout = setTimeout(() => finish({ status: "timed_out", errorCode: "timeout" }), timeoutMs);
    const abort = () => finish({ status: "cancelled", errorCode: "cancelled" });
    if (options.signal?.aborted) return abort();
    options.signal?.addEventListener("abort", abort, { once: true });

    child.stdout.on("data", chunk => {
      buffer += String(chunk);
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) consume(line);
      if (buffer.length > MAX_PROTOCOL_BUFFER_CHARS) {
        buffer = "";
        malformedLines += 1;
      }
    });
    child.stderr.on("data", chunk => {
      stderr = `${stderr}${String(chunk)}`.slice(-16_384);
    });
    child.once("error", error => finish({ status: "failed", errorCode: error.code || "spawn_error" }));
    child.once("close", exitCode => {
      if (settled) return;
      if (buffer) consume(buffer);
      const authFailure = /not logged in|login required|authentication required|unauthorized/i.test(stderr);
      finish({
        status: authFailure ? "authentication_required" : "failed",
        errorCode: authFailure ? "authentication_required" : exitCode === null ? "app_server_closed" : "codex_app_server_failed",
        skipKill: true
      });
    });

    request("initialize", {
      clientInfo: { name: "ahive", title: "Ahive Agent Tasks", version: "0.1.0" },
      capabilities: { experimentalApi: false, requestAttestation: false }
    }).then(() => {
      notify("initialized", {});
      const params = threadParameters(options);
      return request(options.resumeSessionId ? "thread/resume" : "thread/start", options.resumeSessionId
        ? { threadId: String(options.resumeSessionId), ...params }
        : { ...params, ephemeral: false });
    }).then(result => {
      threadId = safeIdentifier(result?.thread?.id);
      if (!threadId) throw new Error("missing_thread_id");
      options.onEvent?.({ type: "thread.started", threadId });
      return request("turn/start", {
        threadId,
        input: [{ type: "text", text: prompt, text_elements: [] }],
        cwd: options.cwd,
        approvalPolicy: "never",
        model: options.model || undefined
      });
    }).then(result => {
      turnId = safeIdentifier(result?.turn?.id);
    }).catch(error => {
      if (!settled) finish({ status: "failed", errorCode: safeProtocolError(error) });
    });

    function consume(line) {
      if (!line.trim()) return;
      let message;
      try { message = JSON.parse(line); }
      catch { malformedLines += 1; return; }
      if (Object.hasOwn(message, "id") && (Object.hasOwn(message, "result") || Object.hasOwn(message, "error"))) {
        const pending = pendingRequests.get(String(message.id));
        if (!pending) return;
        pendingRequests.delete(String(message.id));
        if (message.error) pending.reject(new Error(`protocol_${Number(message.error.code) || "error"}`));
        else pending.resolve(message.result);
        return;
      }
      if (Object.hasOwn(message, "id") && typeof message.method === "string") {
        rejectServerRequest(message);
        return;
      }
      if (typeof message.method !== "string") return;
      handleNotification(message.method, message.params || {});
    }

    function handleNotification(method, params) {
      eventTypes.add(method);
      if (method === "turn/started") {
        turnId = safeIdentifier(params.turn?.id) || turnId;
        options.onEvent?.({ type: "turn.started" });
        return;
      }
      if (method === "item/agentMessage/delta" && typeof params.delta === "string") {
        const delta = params.delta.slice(0, Math.max(0, MAX_MESSAGE_CHARS - finalMessage.length));
        if (!delta) return;
        finalMessage += delta;
        options.onEvent?.({ type: "assistant.output", text: finalMessage, delta, streaming: true });
        return;
      }
      if (method === "item/started" || method === "item/completed") {
        handleItem(params.item, method === "item/started" ? "started" : "completed");
        return;
      }
      if (method === "thread/tokenUsage/updated") {
        usage = sanitizedUsage(params.tokenUsage?.last);
        return;
      }
      if (method === "error") {
        if (params.willRetry !== true) failed = true;
        options.onEvent?.({ type: "agent.step", stepType: "item_error", phase: params.willRetry ? "updated" : "completed" });
        return;
      }
      if (method === "turn/completed") {
        const status = params.turn?.status;
        if (status !== "completed") failed = true;
        options.onEvent?.({ type: status === "completed" ? "turn.completed" : "turn.failed", usage });
        finish({
          status: status === "completed" && finalMessage && !failed ? "completed" : status === "interrupted" ? "cancelled" : "failed",
          errorCode: status === "completed" && finalMessage && !failed ? null : status === "interrupted" ? "cancelled" : "codex_app_server_failed"
        });
      }
    }

    function handleItem(item, phase) {
      if (!item || typeof item.type !== "string") return;
      if (item.type === "agentMessage" && phase === "completed" && typeof item.text === "string") {
        const completedText = item.text.slice(0, MAX_MESSAGE_CHARS);
        if (completedText) finalMessage = completedText;
        options.onEvent?.({ type: "assistant.output", text: finalMessage, delta: "", streaming: false });
        return;
      }
      if (item.type === "reasoning" || item.type === "plan") {
        options.onEvent?.({ type: "agent.step", stepType: item.type === "reasoning" ? "reasoning_summary" : "plan_update", phase });
        return;
      }
      const mappedType = ({ commandExecution: "command_execution", fileChange: "file_change", mcpToolCall: "mcp_tool_call", webSearch: "web_search" })[item.type];
      if (!mappedType) return;
      toolEventTypes.add(mappedType);
      const allowedMcp = mappedType === "mcp_tool_call" && item.server === "ahive_repository" && ["list_files", "search_text", "read_text", "git_summary", "list_verification_commands", "apply_patch", "create_file", "run_verification"].includes(item.tool);
      if (!allowedMcp) unexpectedToolEventTypes.add(mappedType);
      options.onEvent?.({
        type: allowedMcp ? "tool.activity" : "tool.detected",
        toolType: mappedType,
        toolName: allowedMcp ? item.tool : null,
        phase,
        status: safeToolStatus(item.status)
      });
    }

    function request(method, params) {
      const id = nextRequestId++;
      return new Promise((resolveRequest, rejectRequest) => {
        pendingRequests.set(String(id), { resolve: resolveRequest, reject: rejectRequest });
        write({ method, id, params });
      });
    }

    function notify(method, params) { write({ method, params }); }
    function write(message) {
      if (settled || child.stdin.destroyed) return;
      child.stdin.write(`${JSON.stringify(message)}\n`);
    }

    function rejectServerRequest(message) {
      const method = message.method;
      const mappedType = method.includes("fileChange") ? "file_change" : method.includes("commandExecution") || method === "execCommandApproval" ? "command_execution" : "approval_request";
      unexpectedToolEventTypes.add(mappedType);
      options.onEvent?.({ type: "tool.detected", toolType: mappedType, toolName: null, phase: "started", status: null });
      const decision = method.includes("permissions") ? undefined : method.includes("fileChange") || method === "applyPatchApproval" ? { decision: "decline" } : { decision: "decline" };
      if (decision) write({ id: message.id, result: decision });
      else write({ id: message.id, error: { code: -32601, message: "Ahive denies interactive permission requests." } });
    }

    async function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
      for (const pending of pendingRequests.values()) pending.reject(new Error("app_server_closed"));
      pendingRequests.clear();
      if (!result.skipKill && child.exitCode == null && !child.killed) child.kill();
      const toolActivity = await readToolActivity(repositoryTools?.auditPath, repositoryTools?.runId);
      resolve({
        status: result.status,
        threadId,
        finalMessage: finalMessage || null,
        usage,
        eventTypes: [...eventTypes].slice(0, 64),
        toolEventTypes: [...toolEventTypes],
        unexpectedToolEventTypes: [...unexpectedToolEventTypes],
        toolActivity,
        malformedEventCount: malformedLines,
        exitCode: Number.isInteger(child.exitCode) ? child.exitCode : null,
        errorCode: result.errorCode
      });
    }
  });
}

export function buildCodexAppServerArgs(options = {}) {
  const args = [
    "app-server", "--listen", "stdio://", "--strict-config",
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
    "-c", "features.hooks=false",
    "-c", "mcp_servers={}"
  ];
  if (options.repositoryTools) args.push(...repositoryMcpArguments(options.repositoryTools));
  return args;
}

function threadParameters(options) {
  return {
    model: options.model || undefined,
    cwd: options.cwd,
    approvalPolicy: "never",
    sandbox: "read-only",
    config: {
      approval_policy: "never",
      sandbox_mode: "read-only",
      web_search: "disabled",
      features: {
        shell_tool: false,
        multi_agent: false,
        browser_use: false,
        browser_use_external: false,
        browser_use_full_cdp_access: false,
        computer_use: false,
        image_generation: false,
        apps: false,
        plugins: false,
        goals: false,
        hooks: false
      }
    }
  };
}

function repositoryMcpArguments(config) {
  const required = ["serverScript", "databasePath", "repositoryId", "repositoryRoots", "auditPath", "runId"];
  for (const field of required) if (config[field] == null) throw new TypeError(`Repository MCP configuration requires ${field}.`);
  const serverArgs = [
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
    serverArgs.push("--worktree-root", String(config.worktreeRoot));
    serverArgs.push("--artifact-root", String(config.artifactRoot));
  }
  const enabledTools = config.guardedWriteEnabled
    ? '["list_files","search_text","read_text","git_summary","list_verification_commands","apply_patch","create_file","run_verification"]'
    : '["list_files","search_text","read_text","git_summary","list_verification_commands"]';
  return [
    "-c", `mcp_servers.ahive_repository.command=${JSON.stringify(String(config.nodeExecutable || process.execPath))}`,
    "-c", `mcp_servers.ahive_repository.args=${JSON.stringify(serverArgs)}`,
    "-c", "mcp_servers.ahive_repository.required=true",
    "-c", "mcp_servers.ahive_repository.tool_timeout_sec=305",
    "-c", 'mcp_servers.ahive_repository.default_tools_approval_mode="auto"',
    "-c", `mcp_servers.ahive_repository.enabled_tools=${enabledTools}`
  ];
}

function sanitizedUsage(value) {
  if (!value || typeof value !== "object") return null;
  const mapping = { inputTokens: "input_tokens", cachedInputTokens: "cached_input_tokens", outputTokens: "output_tokens", reasoningOutputTokens: "reasoning_output_tokens" };
  const result = {};
  for (const [source, target] of Object.entries(mapping)) if (Number.isFinite(value[source]) && value[source] >= 0) result[target] = Number(value[source]);
  return result;
}

function boundedPrompt(value) {
  const prompt = String(value || "").trim();
  if (!prompt) throw new TypeError("Codex app-server prompt is required.");
  if (prompt.length > MAX_PROMPT_CHARS) throw new TypeError(`Codex app-server prompt cannot exceed ${MAX_PROMPT_CHARS} characters.`);
  return prompt;
}

function safeIdentifier(value) { return typeof value === "string" && value.length <= 160 ? value : null; }
function safeToolStatus(value) { return ({ inProgress: "in_progress", completed: "completed", failed: "failed" })[value] || null; }
function safeProtocolError(error) { return /^protocol_-?\d+$/.test(error?.message || "") ? error.message.slice(0, 80) : "app_server_protocol_failed"; }

async function failedOutcome(errorCode, repositoryTools) {
  return {
    status: errorCode === "ENOENT" || errorCode === "unsupported_windows_codex_shim" ? "cli_unavailable" : "failed",
    threadId: null,
    finalMessage: null,
    usage: null,
    eventTypes: [],
    toolEventTypes: [],
    unexpectedToolEventTypes: [],
    toolActivity: await readToolActivity(repositoryTools?.auditPath, repositoryTools?.runId),
    malformedEventCount: 0,
    exitCode: null,
    errorCode
  };
}

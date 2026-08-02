import { runOpenCodeCommand } from "./opencode-cli.mjs";

const MAX_PROMPT_CHARS = 20_000;
const MAX_MESSAGE_CHARS = 32_000;
const MAX_EVENT_BUFFER_CHARS = 1_000_000;

export async function runOpenCodeReadOnlyTurn(options = {}) {
  const prompt = boundedPrompt(options.prompt);
  const events = new Set();
  const toolEventTypes = new Set();
  const unexpectedToolEventTypes = new Set();
  let buffer = "";
  let finalMessage = "";
  let sessionId = null;
  let malformedEventCount = 0;
  let providerFailed = false;
  let providerErrorCode = null;

  const consume = chunk => {
    buffer += String(chunk);
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) consumeLine(line);
    if (buffer.length > MAX_EVENT_BUFFER_CHARS) {
      buffer = "";
      malformedEventCount += 1;
    }
  };
  const consumeLine = line => {
    if (!line.trim()) return;
    let event;
    try { event = JSON.parse(line); }
    catch { malformedEventCount += 1; return; }
    events.add(String(event.type || event.event || "unknown").slice(0, 80));
    if (event.type === "error" || event.event === "error") {
      providerFailed = true;
      providerErrorCode = classifyProviderError(event);
    }
    const discoveredSession = findString(event, ["sessionID", "sessionId", "session_id"]);
    if (discoveredSession) sessionId = discoveredSession;
    const toolType = findToolType(event);
    if (toolType) {
      toolEventTypes.add(toolType);
      unexpectedToolEventTypes.add(toolType);
      options.onEvent?.({ type: "tool.detected", toolType, toolName: null, phase: "started", status: null });
    }
    const text = findText(event);
    if (!text) return;
    const next = text.startsWith(finalMessage) ? text : `${finalMessage}${text}`;
    const bounded = next.slice(0, MAX_MESSAGE_CHARS);
    const delta = bounded.slice(finalMessage.length);
    finalMessage = bounded;
    if (delta) options.onEvent?.({ type: "assistant.output", text: finalMessage, delta, streaming: true });
  };

  const runner = options.runner || runOpenCodeCommand;
  const args = buildOpenCodeRunArgs(options, prompt);
  const modelTransport = openCodeModelTransport(options.model);
  options.onEvent?.({ type: "adapter.command.started", provider: "opencode", adapter: "opencode-cli", modelTransport, operation: "run", model: options.model || null, timeoutMs: options.timeoutMs || 60_000 });
  options.onAdapterTrace?.({
    phase: "spawn.requested",
    provider: "opencode",
    adapter: "opencode-cli",
    modelTransport,
    executable: options.executable || "opencode",
    command: options.verboseTrace ? [options.executable || "opencode", ...args] : null,
    usesSpawn: true,
    shell: false,
    timeoutMs: options.timeoutMs || 60_000
  });
  const result = await runner(options.executable || "opencode", args, {
    ...options,
    env: openCodeReadOnlyEnvironment(options.env),
    timeoutMs: options.timeoutMs || 60_000,
    onStdout: consume
  });
  if (buffer) consumeLine(buffer);

  const cancelled = result.cancelled === true;
  const timedOut = result.timedOut === true;
  const succeeded = result.ok === true && !cancelled && !timedOut && !unexpectedToolEventTypes.size && Boolean(finalMessage);
  const outcome = {
    status: succeeded ? "completed" : cancelled ? "cancelled" : timedOut ? "timed_out" : "failed",
    threadId: sessionId,
    finalMessage: succeeded ? finalMessage : null,
    usage: null,
    eventTypes: [...events].slice(0, 64),
    toolEventTypes: [...toolEventTypes],
    unexpectedToolEventTypes: [...unexpectedToolEventTypes],
    toolActivity: [],
    malformedEventCount,
    exitCode: Number.isInteger(result.exitCode) ? result.exitCode : null,
    errorCode: succeeded ? null : cancelled ? "cancelled" : timedOut ? "timeout" : unexpectedToolEventTypes.size ? "unexpected_tool_activity" : providerFailed ? `opencode_${providerErrorCode || "provider_failed"}` : result.errorCode || "opencode_run_failed"
  };
  options.onAdapterTrace?.({
    phase: "spawn.completed",
    provider: "opencode",
    adapter: "opencode-cli",
    modelTransport,
    executable: options.executable || "opencode",
    usesSpawn: true,
    shell: false,
    exitCode: outcome.exitCode,
    stdoutBytes: Buffer.byteLength(result.stdout || ""),
    stderrBytes: Buffer.byteLength(result.stderr || ""),
    status: outcome.status,
    errorCode: outcome.errorCode,
    timeoutMs: options.timeoutMs || 60_000
  });
  options.onEvent?.({ type: "adapter.command.completed", provider: "opencode", adapter: "opencode-cli", modelTransport, operation: "run", model: options.model || null, timeoutMs: options.timeoutMs || 60_000, threadId: outcome.threadId, status: outcome.status, errorCode: outcome.errorCode, exitCode: outcome.exitCode, providerErrorCode });
  return outcome;
}

export function buildOpenCodeRunArgs(options = {}, prompt) {
  const args = ["run", "--format", "json", "--pure", "--agent", "ahive", "--model", String(options.model || "")];
  if (!options.model) args.splice(args.indexOf("--model"), 2);
  if (options.resumeSessionId) args.push("--session", String(options.resumeSessionId));
  args.push(prompt || boundedPrompt(options.prompt));
  return args;
}

export function openCodeReadOnlyEnvironment(environment = process.env) {
  return {
    ...environment,
    OPENCODE_CONFIG_CONTENT: JSON.stringify({
      default_agent: "ahive",
      share: "disabled",
      snapshot: false,
      mcp: {},
      agent: {
        ahive: {
          mode: "primary",
          permission: {
            "*": "deny",
            read: "allow",
            list: "allow",
            glob: "allow",
            grep: "allow",
            external_directory: "deny",
            bash: "deny",
            edit: "deny",
            webfetch: "deny",
            websearch: "deny",
            task: "deny",
            todowrite: "deny",
            lsp: "deny",
            skill: "deny",
            question: "deny",
            doom_loop: "deny"
          }
        }
      }
    })
  };
}

function findString(value, keys) {
  if (!value || typeof value !== "object") return null;
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].length <= 160) return value[key];
  }
  for (const child of Object.values(value)) {
    const result = findString(child, keys);
    if (result) return result;
  }
  return null;
}

function findText(value) {
  if (!value || typeof value !== "object") return null;
  if (value.type === "text" && typeof value.text === "string") return value.text;
  if (value.type === "text" && typeof value.delta === "string") return value.delta;
  for (const child of Object.values(value)) {
    const result = findText(child);
    if (result) return result;
  }
  return null;
}

function findToolType(value) {
  if (!value || typeof value !== "object") return null;
  const type = String(value.type || "").toLowerCase();
  if (type.includes("tool") || type.includes("command") || type.includes("file")) return type.slice(0, 80);
  for (const child of Object.values(value)) {
    const result = findToolType(child);
    if (result) return result;
  }
  return null;
}

function classifyProviderError(event) {
  const message = JSON.stringify(event).toLowerCase();
  if (message.includes("insufficient balance") || message.includes("creditserror")) return "insufficient_balance";
  if (message.includes("unauthorized") || message.includes("authentication")) return "authentication_required";
  if (message.includes("rate limit")) return "rate_limited";
  return "provider_failed";
}

export function openCodeModelTransport(model) {
  return String(model || "").startsWith("opencode-go/") ? "opencode_go" : "opencode_zen";
}

function boundedPrompt(value) {
  const prompt = String(value || "").trim();
  if (!prompt) throw new TypeError("OpenCode prompt is required.");
  if (prompt.length > MAX_PROMPT_CHARS) throw new TypeError(`OpenCode prompt cannot exceed ${MAX_PROMPT_CHARS} characters.`);
  return prompt;
}

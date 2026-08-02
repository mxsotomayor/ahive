import test from "node:test";
import assert from "node:assert/strict";
import { appendFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCodexExecArgs, createCodexJsonlCollector, runCodexExecSpike } from "../lib/codex-harness-spike.mjs";
import { runCodexCommand } from "../lib/codex-cli.mjs";

test("builds read-only initial and resume invocations without a shell or API credentials", () => {
  const initial = buildCodexExecArgs({ prompt: "hello", model: "gpt-5.6-sol" });
  assert.deepEqual(initial.slice(0, 3), ["exec", "--sandbox", "read-only"]);
  assert.ok(initial.includes("--json"));
  assert.ok(initial.includes("--ignore-user-config"));
  assert.ok(initial.includes('approval_policy="never"'));
  assert.ok(initial.includes("features.shell_tool=false"));
  assert.ok(initial.includes('web_search="disabled"'));
  assert.equal(initial.at(-1), "hello");
  assert.doesNotMatch(initial.join(" "), /OPENAI_API_KEY|CODEX_API_KEY|dangerously-bypass/);

  const resumed = buildCodexExecArgs({ prompt: "again", resumeSessionId: "thread-1", model: "gpt-5.6-sol" });
  assert.deepEqual(resumed.slice(0, 2), ["exec", "resume"]);
  assert.equal(resumed.at(-2), "thread-1");
  assert.equal(resumed.at(-1), "again");

  const withRepository = buildCodexExecArgs({
    prompt: "inspect",
    repositoryTools: { serverScript: "C:\\ahive\\server.mjs", databasePath: "C:\\ahive\\data.db", repositoryId: "repository-1", repositoryRoots: ["C:\\work"], auditPath: "C:\\ahive\\audit.jsonl", runId: "run-1", nodeExecutable: "C:\\node.exe" }
  });
  assert.ok(withRepository.some(value => value.includes("mcp_servers.ahive_repository.command")));
  assert.ok(withRepository.some(value => value.includes('enabled_tools=["list_files","search_text","read_text","git_summary","list_verification_commands"]')));
  assert.equal(withRepository.join(" ").includes("danger-full-access"), false);
});

test("reduces Codex JSONL to visible output and sanitized metadata", async () => {
  const lines = [
    { type: "thread.started", thread_id: "thread-safe" },
    { type: "turn.started" },
    { type: "item.completed", item: { id: "reasoning-1", type: "reasoning", text: "must never escape" } },
    { type: "item.completed", item: { id: "message-1", type: "agent_message", text: "AHIVE_CODEX_SPIKE_OK" } },
    { type: "turn.completed", usage: { input_tokens: 10, cached_input_tokens: 3, output_tokens: 4, reasoning_output_tokens: 2, secret: "omit" } }
  ];
  const result = await runCodexExecSpike({
    prompt: "hello",
    runner: async (_executable, _args, options) => {
      options.onStdout(`${lines.map(line => JSON.stringify(line)).join("\n")}\n`);
      return { ok: true, exitCode: 0, stdout: "", stderr: "" };
    }
  });
  assert.equal(result.status, "completed");
  assert.equal(result.threadId, "thread-safe");
  assert.equal(result.finalMessage, "AHIVE_CODEX_SPIKE_OK");
  assert.deepEqual(result.toolEventTypes, []);
  assert.deepEqual(result.usage, { input_tokens: 10, cached_input_tokens: 3, output_tokens: 4, reasoning_output_tokens: 2 });
  assert.equal(JSON.stringify(result).includes("must never escape"), false);
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("detects tool events and supports bounded child-process cancellation", async () => {
  const collector = createCodexJsonlCollector();
  collector.push(`${JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "private command" } })}\n`);
  collector.finish();
  assert.deepEqual(collector.result().toolEventTypes, ["command_execution"]);
  assert.deepEqual(collector.result().unexpectedToolEventTypes, ["command_execution"]);
  assert.equal(JSON.stringify(collector.result()).includes("private command"), false);

  const controller = new AbortController();
  const running = runCodexCommand(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], {
    timeoutMs: 10_000,
    signal: controller.signal
  });
  setTimeout(() => controller.abort(), 50);
  const cancelled = await running;
  assert.equal(cancelled.ok, false);
  assert.equal(cancelled.cancelled, true);
});

test("allows only named Ahive Repository MCP calls and never captures tool results", () => {
  const collector = createCodexJsonlCollector();
  collector.push(`${JSON.stringify({ type: "item.started", item: { type: "mcp_tool_call", server: "ahive_repository", tool: "read_text", arguments: { path: ".env" }, status: "in_progress" } })}\n`);
  collector.push(`${JSON.stringify({ type: "item.completed", item: { type: "mcp_tool_call", server: "ahive_repository", tool: "read_text", result: { content: [{ type: "text", text: "private content" }] }, status: "completed" } })}\n`);
  collector.finish();
  assert.deepEqual(collector.result().toolEventTypes, ["mcp_tool_call"]);
  assert.deepEqual(collector.result().unexpectedToolEventTypes, []);
  assert.equal(JSON.stringify(collector.result()).includes("private content"), false);
  assert.equal(JSON.stringify(collector.result()).includes(".env"), false);
});

test("forwards sanitized MCP trace records and persists bounded Run tool activity", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-codex-audit-"));
  const auditPath = join(directory, "run-1.jsonl");
  const traces = [];
  const result = await runCodexExecSpike({
    prompt: "inspect",
    repositoryTools: { serverScript: "server.mjs", databasePath: "database.db", repositoryId: "repository-1", repositoryRoots: [directory], auditPath, runId: "run-1", nodeExecutable: process.execPath },
    onTrace: event => traces.push(event),
    runner: async (_executable, _args, options) => {
      const audit = { sequence: 1, timestamp: "2026-07-29T10:00:00.000Z", runId: "run-1", repositoryId: "repository-1", tool: "read_text", phase: "completed", request: { path: "src/app.mjs" }, result: { lines: 2, characters: 30 }, durationMs: 4 };
      await appendFile(auditPath, `${JSON.stringify(audit)}\n`);
      options.onStderr(`MCP server stderr: AHIVE_TOOL_TRACE ${JSON.stringify(audit)}\n`);
      options.onStdout(`${JSON.stringify({ type: "thread.started", thread_id: "thread-1" })}\n${JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "Done" } })}\n${JSON.stringify({ type: "turn.completed", usage: {} })}\n`);
      return { ok: true, exitCode: 0, stdout: "", stderr: "" };
    }
  });
  assert.equal(traces.length, 1);
  assert.equal(traces[0].tool, "read_text");
  assert.deepEqual(result.toolActivity[0].result, { lines: 2, characters: 30 });
  assert.equal(JSON.stringify(result).includes("file contents"), false);
});

test("classifies missing CLI and signed-out failures without returning provider output", async () => {
  const signedOut = await runCodexExecSpike({
    prompt: "hello",
    runner: async () => ({ ok: false, exitCode: 1, stdout: "", stderr: "Login required: sensitive provider detail" })
  });
  assert.equal(signedOut.status, "authentication_required");
  assert.equal(signedOut.errorCode, "authentication_required");
  assert.equal(JSON.stringify(signedOut).includes("sensitive provider detail"), false);

  const missing = await runCodexExecSpike({
    prompt: "hello",
    runner: async () => ({ ok: false, exitCode: null, stdout: "", stderr: "private path", errorCode: "ENOENT" })
  });
  assert.equal(missing.status, "cli_unavailable");
  assert.equal(missing.errorCode, "cli_unavailable");
  assert.equal(JSON.stringify(missing).includes("private path"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { buildCodexAppServerArgs, runCodexAppServer } from "../lib/codex-app-server.mjs";

test("builds a constrained app-server invocation with only the Ahive Repository MCP", () => {
  const args = buildCodexAppServerArgs({
    repositoryTools: {
      serverScript: "C:\\ahive\\server.mjs",
      databasePath: "C:\\ahive\\data.db",
      repositoryId: "repository-1",
      repositoryRoots: ["C:\\work"],
      auditPath: "C:\\ahive\\audit.jsonl",
      runId: "run-1",
      nodeExecutable: "C:\\node.exe"
    }
  });
  assert.deepEqual(args.slice(0, 4), ["app-server", "--listen", "stdio://", "--strict-config"]);
  assert.ok(args.includes("features.shell_tool=false"));
  assert.ok(args.includes('web_search="disabled"'));
  assert.ok(args.includes("mcp_servers={}"));
  assert.ok(args.some(value => value.includes("mcp_servers.ahive_repository.command")));
  assert.ok(args.some(value => value.includes('enabled_tools=["list_files","search_text","read_text","git_summary","list_verification_commands"]')));
  assert.equal(args.join(" ").includes("danger-full-access"), false);

  const guarded = buildCodexAppServerArgs({
    repositoryTools: {
      serverScript: "C:\\ahive\\server.mjs", databasePath: "C:\\ahive\\data.db",
      repositoryId: "repository-1", repositoryRoots: ["C:\\work"],
      auditPath: "C:\\ahive\\audit.jsonl", runId: "run-1",
      worktreeRoot: "C:\\ahive\\worktrees", artifactRoot: "C:\\ahive\\artifacts", guardedWriteEnabled: true
    }
  });
  assert.ok(guarded.some(value => value.includes("--worktree-root")));
  assert.ok(guarded.some(value => value.includes('"apply_patch","create_file"')));
  assert.equal(guarded.join(" ").includes("danger-full-access"), false);
});

test("streams cumulative visible Agent text from app-server deltas", async () => {
  const assistantEvents = [];
  const requests = [];
  const result = await runCodexAppServer({
    executable: "codex",
    platform: "linux",
    prompt: "Say hello",
    model: "gpt-5.6-sol",
    cwd: "/workspace",
    onEvent: event => {
      if (event.type === "assistant.output") assistantEvents.push(event);
    },
    spawnProcess: (_executable, _args) => fakeAppServer(requests)
  });

  assert.equal(result.status, "completed");
  assert.equal(result.threadId, "thread-safe");
  assert.equal(result.finalMessage, "Hello world");
  assert.deepEqual(result.usage, { input_tokens: 8, cached_input_tokens: 3, output_tokens: 2, reasoning_output_tokens: 0 });
  assert.deepEqual(assistantEvents.slice(0, 2).map(event => event.text), ["Hello", "Hello world"]);
  assert.deepEqual(assistantEvents.slice(0, 2).map(event => event.delta), ["Hello", " world"]);
  assert.equal(requests.find(message => message.method === "thread/start")?.params.sandbox, "read-only");
  assert.equal(requests.find(message => message.method === "turn/start")?.params.approvalPolicy, "never");
});

test("resumes an existing app-server thread with stable protocol fields", async () => {
  const requests = [];
  const result = await runCodexAppServer({
    executable: "codex",
    platform: "linux",
    prompt: "Continue",
    resumeSessionId: "thread-existing",
    cwd: "/workspace",
    spawnProcess: () => fakeAppServer(requests, "thread-existing")
  });
  const resume = requests.find(message => message.method === "thread/resume");
  assert.equal(result.status, "completed");
  assert.equal(result.threadId, "thread-existing");
  assert.equal(resume.params.threadId, "thread-existing");
  assert.equal(Object.hasOwn(resume.params, "excludeTurns"), false);
});

function fakeAppServer(requests, threadId = "thread-safe") {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.exitCode = null;
  child.killed = false;
  child.kill = () => {
    child.killed = true;
    queueMicrotask(() => child.emit("close", null));
    return true;
  };
  let input = "";
  child.stdin.on("data", chunk => {
    input += String(chunk);
    const lines = input.split(/\r?\n/);
    input = lines.pop() || "";
    for (const line of lines) {
      const message = JSON.parse(line);
      requests.push(message);
      if (message.method === "initialize") send({ id: message.id, result: { userAgent: "test", codexHome: "/tmp", platformFamily: "unix", platformOs: "linux" } });
      if (["thread/start", "thread/resume"].includes(message.method)) send({ id: message.id, result: { thread: { id: threadId } } });
      if (message.method === "turn/start") {
        send({ id: message.id, result: { turn: { id: "turn-safe", status: "inProgress" } } });
        send({ method: "turn/started", params: { threadId, turn: { id: "turn-safe", status: "inProgress" } } });
        send({ method: "item/agentMessage/delta", params: { threadId, turnId: "turn-safe", itemId: "item-1", delta: "Hello" } });
        send({ method: "item/agentMessage/delta", params: { threadId, turnId: "turn-safe", itemId: "item-1", delta: " world" } });
        send({ method: "item/completed", params: { threadId, turnId: "turn-safe", item: { id: "item-1", type: "agentMessage", text: "Hello world", phase: "final_answer" } } });
        send({ method: "thread/tokenUsage/updated", params: { threadId, turnId: "turn-safe", tokenUsage: { last: { inputTokens: 8, cachedInputTokens: 3, outputTokens: 2, reasoningOutputTokens: 0 } } } });
        send({ method: "turn/completed", params: { threadId, turn: { id: "turn-safe", status: "completed" } } });
      }
    }
  });
  return child;

  function send(message) { queueMicrotask(() => child.stdout.write(`${JSON.stringify(message)}\n`)); }
}

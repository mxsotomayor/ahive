import test from "node:test";
import assert from "node:assert/strict";
import { buildOpenCodeRunArgs, openCodeModelTransport, openCodeReadOnlyEnvironment, runOpenCodeReadOnlyTurn } from "../lib/opencode-run.mjs";

test("runs bounded OpenCode JSON output with a read-only inline policy", async () => {
  const events = [];
  const traces = [];
  const outcome = await runOpenCodeReadOnlyTurn({
    prompt: "Reply safely",
    model: "opencode-go/kimi-k3",
    onEvent: event => events.push(event),
    onAdapterTrace: event => traces.push(event),
    verboseTrace: true,
    runner: async (_executable, args, options) => {
      assert.deepEqual(args.slice(0, 8), ["run", "--format", "json", "--pure", "--agent", "ahive", "--model", "opencode-go/kimi-k3"]);
      const policy = JSON.parse(options.env.OPENCODE_CONFIG_CONTENT);
      assert.equal(policy.agent.ahive.permission.edit, "deny");
      assert.equal(policy.agent.ahive.permission.bash, "deny");
      assert.equal(policy.agent.ahive.permission.webfetch, "deny");
      assert.equal(policy.agent.ahive.permission.read, "allow");
      options.onStdout('{"type":"message.part.updated","sessionID":"session-1","properties":{"part":{"type":"text","text":"Hello"}}}\n');
      options.onStdout('{"type":"message.part.updated","sessionID":"session-1","properties":{"part":{"type":"text","text":" world"}}}\n');
      return { ok: true, exitCode: 0, stdout: "", stderr: "" };
    }
  });
  assert.equal(outcome.status, "completed");
  assert.equal(outcome.threadId, "session-1");
  assert.equal(outcome.finalMessage, "Hello world");
  assert.equal(events.filter(event => event.type === "assistant.output").at(-1)?.text, "Hello world");
  assert.equal(events.at(-1).type, "adapter.command.completed");
  assert.deepEqual(traces[0].command.slice(0, 8), ["opencode", "run", "--format", "json", "--pure", "--agent", "ahive", "--model"]);
  assert.equal(traces[0].usesSpawn, true);
  assert.equal(traces[0].shell, false);
});

test("fails OpenCode outcomes that contain tool activity", async () => {
  const outcome = await runOpenCodeReadOnlyTurn({
    prompt: "Do not use tools",
    runner: async (_executable, _args, options) => {
      options.onStdout('{"type":"tool.call","properties":{"name":"bash"}}\n');
      options.onStdout('{"type":"message.part.updated","properties":{"part":{"type":"text","text":"Unexpected"}}}\n');
      return { ok: true, exitCode: 0, stdout: "", stderr: "" };
    }
  });
  assert.equal(outcome.status, "failed");
  assert.equal(outcome.finalMessage, null);
  assert.equal(outcome.errorCode, "unexpected_tool_activity");
});

test("builds resumable OpenCode arguments without copying caller config", () => {
  assert.deepEqual(buildOpenCodeRunArgs({ model: "opencode/gpt-5.3-codex", resumeSessionId: "session-1" }, "Continue"), [
    "run", "--format", "json", "--pure", "--agent", "ahive", "--model", "opencode/gpt-5.3-codex", "--session", "session-1", "Continue"
  ]);
  const env = openCodeReadOnlyEnvironment({ OPENCODE_CONFIG_CONTENT: "unsafe" });
  assert.notEqual(env.OPENCODE_CONFIG_CONTENT, "unsafe");
  assert.equal(openCodeModelTransport("opencode/gpt-5"), "opencode_zen");
  assert.equal(openCodeModelTransport("opencode-go/kimi-k3"), "opencode_go");
});

test("classifies provider balance failures without returning provider details", async () => {
  const outcome = await runOpenCodeReadOnlyTurn({
    prompt: "Reply safely",
    runner: async (_executable, _args, options) => {
      options.onStdout('{"type":"error","error":{"message":"Insufficient balance"}}\n');
      return { ok: false, exitCode: 1, stdout: "", stderr: "" };
    }
  });
  assert.equal(outcome.status, "failed");
  assert.equal(outcome.errorCode, "opencode_insufficient_balance");
});

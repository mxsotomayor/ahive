import test from "node:test";
import assert from "node:assert/strict";
import { RunEventBroker } from "../lib/run-event-broker.mjs";

test("orders bounded Run events and replays only events after a reconnect cursor", () => {
  const broker = new RunEventBroker({ maxEvents: 3, retentionMs: 60_000 });
  broker.publish("run-1", "run.started");
  broker.publish("run-1", "turn.started");
  broker.publish("run-1", "assistant.output", { text: "visible" });
  broker.publish("run-1", "turn.completed", { usage: { output_tokens: 1 } });
  const replayed = [];
  const unsubscribe = broker.subscribe("run-1", 2, event => replayed.push(event));
  assert.deepEqual(replayed.map(event => event.id), [3, 4]);
  assert.equal(JSON.stringify(replayed).includes("reasoning"), false);
  broker.markTerminal("run-1", "run.terminal", { status: "completed" });
  assert.deepEqual(replayed.map(event => event.id), [3, 4, 5]);
  assert.equal(broker.isTerminal("run-1"), true);
  unsubscribe();
});

test("keeps only the latest cumulative assistant snapshot for reconnects", () => {
  const broker = new RunEventBroker({ maxEvents: 3, retentionMs: 60_000 });
  const live = [];
  broker.subscribe("run-stream", 0, event => live.push(event));
  broker.publishLatest("run-stream", "assistant.output", { text: "One" });
  broker.publishLatest("run-stream", "assistant.output", { text: "One two" });
  broker.publishLatest("run-stream", "assistant.output", { text: "One two three" });
  assert.deepEqual(live.map(event => event.data.text), ["One", "One two", "One two three"]);
  const replayed = [];
  broker.subscribe("run-stream", 0, event => replayed.push(event));
  assert.deepEqual(replayed.map(event => event.data.text), ["One two three"]);
  assert.equal(replayed[0].id, 3);
});

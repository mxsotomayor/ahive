export class RunEventBroker {
  constructor(options = {}) {
    this.maxEvents = options.maxEvents || 200;
    this.retentionMs = options.retentionMs || 300_000;
    this.streams = new Map();
  }

  publish(runId, type, data = {}) {
    const stream = this.#stream(runId);
    const event = { id: stream.nextSequence++, runId, type, data: structuredClone(data), createdAt: new Date().toISOString() };
    stream.events.push(event);
    if (stream.events.length > this.maxEvents) stream.events.splice(0, stream.events.length - this.maxEvents);
    for (const subscriber of stream.subscribers) subscriber(structuredClone(event));
    return event;
  }

  publishLatest(runId, type, data = {}) {
    const stream = this.#stream(runId);
    stream.events = stream.events.filter(event => event.type !== type);
    return this.publish(runId, type, data);
  }

  subscribe(runId, cursor, subscriber) {
    const stream = this.#stream(runId);
    for (const event of stream.events) if (event.id > cursor) subscriber(structuredClone(event));
    if (!stream.terminal) stream.subscribers.add(subscriber);
    return () => stream.subscribers.delete(subscriber);
  }

  markTerminal(runId, type, data = {}) {
    const event = this.publish(runId, type, data);
    const stream = this.#stream(runId);
    stream.terminal = true;
    stream.subscribers.clear();
    stream.timer = setTimeout(() => this.streams.delete(runId), this.retentionMs);
    stream.timer.unref?.();
    return event;
  }

  isTerminal(runId) {
    return this.streams.get(runId)?.terminal === true;
  }

  #stream(runId) {
    if (!this.streams.has(runId)) this.streams.set(runId, { events: [], subscribers: new Set(), nextSequence: 1, terminal: false, timer: null });
    return this.streams.get(runId);
  }
}

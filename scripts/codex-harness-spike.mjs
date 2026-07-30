import { runCodexExecSpike } from "../lib/codex-harness-spike.mjs";

const args = process.argv.slice(2);
if (!args.includes("--live")) {
  console.error("Live Codex use is opt-in. Run: pnpm spike:codex -- --live [--resume SESSION_ID]");
  process.exitCode = 2;
} else {
  const resumeIndex = args.indexOf("--resume");
  const resumeSessionId = resumeIndex >= 0 ? args[resumeIndex + 1] : null;
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());
  const result = await runCodexExecSpike({
    executable: process.env.AHIVE_CODEX_EXECUTABLE || "codex",
    cwd: process.cwd(),
    model: process.env.AHIVE_CODEX_SPIKE_MODEL || "gpt-5.6-sol",
    prompt: resumeSessionId
      ? "Reply with exactly AHIVE_CODEX_RESUME_OK. Do not use tools."
      : "Reply with exactly AHIVE_CODEX_SPIKE_OK. Do not use tools.",
    resumeSessionId,
    timeoutMs: Number(process.env.AHIVE_CODEX_SPIKE_TIMEOUT_MS || 120_000),
    signal: controller.signal
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "completed" || result.toolEventTypes.length) process.exitCode = 1;
}

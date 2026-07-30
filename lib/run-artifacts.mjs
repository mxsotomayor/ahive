import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { runGit } from "./git-inspection.mjs";
import { verifyManagedWorktreePath } from "./git-worktrees.mjs";
import { listGuardedFileChanges, listRunArtifacts, readNeutralStore, recordRunArtifact } from "./neutral-store.mjs";

const MAX_ARTIFACT_BYTES = 1024 * 1024;
const artifactKinds = new Set(["final_output", "changed_files", "patch", "test_report", "bounded_log", "error_report"]);
const secretPatterns = [
  /\b(?:authorization|token|api[_-]?key|client[_-]?secret|password)\s*[:=]\s*[^\s,;]+/gi,
  /\b(?:gh[opusr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9_-]{20,})\b/g
];

export class RunArtifactError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "RunArtifactError";
    this.code = code;
    this.status = status;
  }
}

export function createRunArtifactService(options = {}) {
  if (!options.store) throw new TypeError("Run Artifact service requires a neutral store.");
  const root = artifactRoot(options.root);
  const worktreeRoot = String(options.worktreeRoot || "").trim();
  const retentionDays = boundedRetention(options.retentionDays);

  async function persist(agentRunId, kind, content, metadata = {}) {
    const runId = requiredIdentifier(agentRunId, "Agent Run ID");
    const artifactKind = String(kind || "").trim();
    if (!artifactKinds.has(artifactKind)) throw new RunArtifactError("unsupported_kind", "Run Artifact kind is not supported.");
    const source = typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`;
    if (Buffer.byteLength(source, "utf8") > MAX_ARTIFACT_BYTES) throw new RunArtifactError("artifact_too_large", "Run Artifact exceeds the 1048576 byte limit.", 413);
    const sanitized = sanitizeArtifact(source);
    const buffer = Buffer.from(sanitized.text, "utf8");
    if (buffer.length > MAX_ARTIFACT_BYTES) throw new RunArtifactError("artifact_too_large", "Sanitized Run Artifact exceeds the 1048576 byte limit.", 413);
    const contentHash = createHash("sha256").update(buffer).digest("hex");
    const storageReference = `${contentHash}.artifact`;
    await mkdir(root, { recursive: true });
    await writeContentAddressedFile(join(root, storageReference), buffer);
    const createdAt = new Date().toISOString();
    const result = await recordRunArtifact(options.store, runId, {
      id: `run-artifact-${randomUUID()}`,
      kind: artifactKind,
      storageReference,
      contentHash,
      sizeBytes: buffer.length,
      mimeType: artifactKind === "changed_files" || artifactKind === "test_report" ? "application/json" : "text/plain",
      redactionCount: sanitized.redactionCount,
      retentionUntil: new Date(Date.parse(createdAt) + retentionDays * 24 * 60 * 60 * 1_000).toISOString(),
      metadata: safeMetadata(metadata),
      createdAt
    });
    return result.runArtifact;
  }

  async function read(agentRunId, artifactId) {
    const runId = requiredIdentifier(agentRunId, "Agent Run ID");
    const id = requiredIdentifier(artifactId, "Run Artifact ID");
    const store = await readNeutralStore(options.store);
    const artifact = listRunArtifacts(store, runId).find(item => item.id === id);
    if (!artifact) throw new RunArtifactError("artifact_not_found", "Run Artifact was not found for this Agent Run.", 404);
    const path = join(root, artifact.storageReference);
    if (resolve(path) !== resolve(root, artifact.storageReference)) throw new RunArtifactError("artifact_path_invalid", "Run Artifact storage reference is invalid.", 500);
    const buffer = await readFile(path).catch(error => {
      if (error.code === "ENOENT") throw new RunArtifactError("artifact_missing", "Run Artifact content is missing from local storage.", 404);
      throw error;
    });
    if (buffer.length !== artifact.sizeBytes || createHash("sha256").update(buffer).digest("hex") !== artifact.contentHash) {
      throw new RunArtifactError("artifact_integrity_failed", "Run Artifact content failed its integrity check.", 409);
    }
    return { artifact, content: buffer.toString("utf8") };
  }

  async function list(agentRunId) {
    return listRunArtifacts(await readNeutralStore(options.store), requiredIdentifier(agentRunId, "Agent Run ID"));
  }

  async function captureOutcome(agentRunId, outcome = {}) {
    const artifacts = [];
    if (outcome.finalMessage) artifacts.push(await persist(agentRunId, "final_output", String(outcome.finalMessage), { source: "agent_run" }));
    if (outcome.errorSummary) artifacts.push(await persist(agentRunId, "error_report", String(outcome.errorSummary), { source: "agent_run", status: outcome.status || "failed" }));
    return artifacts;
  }

  async function captureVerification(agentRunId, result) {
    const report = {
      policyId: result.policyId,
      policyName: result.policyName,
      status: result.status,
      exitCode: result.exitCode,
      signal: result.signal,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      durationMs: result.durationMs,
      workingDirectory: result.workingDirectory,
      errorCode: result.errorCode,
      output: result.output
    };
    return persist(agentRunId, "test_report", report, { source: "verification_command", status: result.status, policyId: result.policyId });
  }

  async function captureReview(agentRunId) {
    const runId = requiredIdentifier(agentRunId, "Agent Run ID");
    const store = await readNeutralStore(options.store);
    const run = store.agentRuns.find(item => item.id === runId);
    if (!run) throw new RunArtifactError("run_not_found", "Agent Run was not found.", 404);
    const existing = listRunArtifacts(store, runId);
    if (!existing.some(item => item.kind === "final_output")) {
      const message = store.messages.find(item => item.metadata?.agentRunId === runId && item.role === "assistant");
      if (message?.content) await persist(runId, "final_output", message.content, { source: "persisted_message" });
    }
    if (run.errorSummary && !existing.some(item => item.kind === "error_report")) {
      await persist(runId, "error_report", run.errorSummary, { source: "agent_run", status: run.status });
    }
    const worktree = store.managedWorktrees.find(item => item.agentRunId === runId);
    if (worktree) {
      const changes = listGuardedFileChanges(store, runId);
      await persist(runId, "changed_files", {
        worktreeId: worktree.id,
        baseCommit: worktree.baseCommit,
        head: worktree.head,
        dirty: worktree.dirty,
        files: changes.map(change => ({
          sequence: change.sequence,
          operation: change.operation,
          path: change.relativePath,
          status: change.status,
          beforeSha256: change.beforeSha256,
          afterSha256: change.afterSha256,
          beforeBytes: change.beforeBytes,
          afterBytes: change.afterBytes,
          errorCode: change.errorCode
        }))
      }, { source: "guarded_file_changes", worktreeId: worktree.id, fileCount: changes.length });
      if (worktree.present && !["missing", "discarded"].includes(worktree.status)) {
        try {
          const patch = await buildPatchArtifact(worktree, changes, worktreeRoot);
          if (patch.trim()) await persist(runId, "patch", patch, { source: "managed_worktree", worktreeId: worktree.id });
        } catch (error) {
          if (!(error instanceof RunArtifactError && error.code === "artifact_too_large")) throw error;
          await persist(runId, "error_report", "The review patch exceeded the local artifact size limit. Exact changed-file hashes remain available.", { source: "artifact_capture", errorCode: error.code });
        }
      }
    }
    return list(runId);
  }

  return { persist, read, list, captureOutcome, captureVerification, captureReview, root };
}

async function buildPatchArtifact(worktree, changes, configuredRoot) {
  const verified = await verifyManagedWorktreePath(worktree, configuredRoot);
  let patch = (await runGit(verified.path, ["diff", "--no-ext-diff", "--unified=3", "--"], { timeoutMs: 10_000, maxOutputBytes: 768 * 1024 })).stdout;
  const created = changes.filter(change => change.operation === "create_file" && change.status === "completed");
  for (const change of created) {
    const content = await readFile(join(verified.path, ...change.relativePath.split("/")), "utf8");
    const lines = content.split("\n");
    if (lines.at(-1) === "") lines.pop();
    patch += `${patch && !patch.endsWith("\n") ? "\n" : ""}diff --git a/${change.relativePath} b/${change.relativePath}\nnew file mode 100644\n--- /dev/null\n+++ b/${change.relativePath}\n@@ -0,0 +1,${lines.length} @@\n${lines.map(line => `+${line}`).join("\n")}\n`;
    if (Buffer.byteLength(patch, "utf8") > MAX_ARTIFACT_BYTES) throw new RunArtifactError("artifact_too_large", "Review patch exceeds the local artifact size limit.", 413);
  }
  return patch;
}

function sanitizeArtifact(value) {
  let text = String(value || "").replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "").replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, "�");
  let redactionCount = 0;
  for (const pattern of secretPatterns) {
    text = text.replace(pattern, match => {
      redactionCount += 1;
      const separator = match.search(/[:=]/);
      return separator >= 0 ? `${match.slice(0, separator)}=[REDACTED]` : "[REDACTED]";
    });
  }
  return { text, redactionCount };
}

function safeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  for (const [key, raw] of Object.entries(value).slice(0, 20)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,60}$/.test(key)) continue;
    if (["string", "number", "boolean"].includes(typeof raw) || raw == null) result[key] = typeof raw === "string" ? raw.slice(0, 500) : raw;
  }
  return result;
}

async function writeContentAddressedFile(path, buffer) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, buffer, { flag: "wx", mode: 0o600 });
    await rename(temporary, path).catch(async error => {
      if (error.code !== "EEXIST" && error.code !== "EPERM") throw error;
      const existing = await readFile(path).catch(() => null);
      if (!existing || !existing.equals(buffer)) throw error;
    });
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

function artifactRoot(value) {
  const root = String(value || "").trim();
  if (!root || !isAbsolute(root)) throw new TypeError("Run Artifact root must be an absolute directory.");
  return resolve(root);
}

function boundedRetention(value) {
  const days = value == null ? 30 : Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new TypeError("Run Artifact retention must be between 1 and 365 days.");
  return days;
}

function requiredIdentifier(value, label) {
  const id = String(value || "").trim();
  if (!id || id.length > 200 || /[\0\r\n]/.test(id)) throw new RunArtifactError("invalid_identifier", `${label} is required.`);
  return id;
}

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readCanonicalStore, replaceCanonicalIssues, updateCanonicalIssue } from "../lib/local-store.mjs";

test("persists and updates the private canonical issue cache", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-store-"));
  const filePath = join(directory, "issues.json");
  try {
    await replaceCanonicalIssues(filePath, [{ sourceKey: "501", status: "todo", source: "gitlab" }], { viewer: "maxwell" });
    await updateCanonicalIssue(filePath, issue => issue.sourceKey === "501", { status: "done" });
    const store = await readCanonicalStore(filePath);
    assert.equal(store.issues.length, 1);
    assert.equal(store.issues[0].status, "done");
    assert.equal(store.meta.gitlab.viewer, "maxwell");
    assert.ok(store.updatedAt);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertRepositorySelectable, createWorkspaceEntity, initializeNeutralWorkspace, recordRepositoryVerification, updateWorkspaceEntity } from "../lib/neutral-store.mjs";
import { inspectGitRepository, runGit } from "../lib/git-inspection.mjs";
import { verifyRepositoryPath } from "../lib/repository-paths.mjs";

const run = promisify(execFile);

test("creates project-scoped repositories and resets verification when the path changes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-repository-domain-"));
  const storePath = join(directory, "store.json");
  try {
    const workspace = await initializeNeutralWorkspace(storePath, { organizationName: "Org", projectName: "Project", productName: "Product" });
    const created = await createWorkspaceEntity(storePath, "repository", {
      projectId: workspace.project.id,
      productId: workspace.product.id,
      name: "API",
      localPath: join(directory, "api")
    });
    const second = await createWorkspaceEntity(storePath, "repository", {
      projectId: workspace.project.id,
      name: "Web",
      localPath: join(directory, "web")
    });
    assert.notEqual(second.entity.id, created.entity.id);
    assert.equal(created.entity.verificationStatus, "unverified");
    const renamed = await updateWorkspaceEntity(storePath, "repository", created.entity.id, { name: "API Service" });
    assert.equal(renamed.entity.id, created.entity.id);
    await recordRepositoryVerification(storePath, created.entity.id, { valid: true, resolvedPath: join(directory, "api") });
    const updated = await updateWorkspaceEntity(storePath, "repository", created.entity.id, { localPath: join(directory, "api-next") });
    assert.equal(updated.entity.verificationStatus, "unverified");
    assert.equal(updated.entity.resolvedPath, null);
    const inactive = await updateWorkspaceEntity(storePath, "repository", created.entity.id, { active: false });
    assert.throws(() => assertRepositorySelectable(inactive.store, created.entity.id), /Inactive Repository/);
    const otherProject = await createWorkspaceEntity(storePath, "project", {
      organizationId: workspace.organization.id,
      name: "Other Project"
    });
    const otherProduct = await createWorkspaceEntity(storePath, "product", {
      projectId: otherProject.entity.id,
      name: "Other Product"
    });
    await assert.rejects(() => createWorkspaceEntity(storePath, "repository", {
      projectId: workspace.project.id,
      productId: otherProduct.entity.id,
      name: "Crossed",
      localPath: join(directory, "crossed")
    }), /must belong to its Project/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects paths outside roots and symlink escapes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-repository-path-"));
  const root = join(directory, "allowed");
  const inside = join(root, "repo");
  const outside = join(directory, "outside");
  await mkdir(inside, { recursive: true });
  await mkdir(outside, { recursive: true });
  try {
    assert.equal((await verifyRepositoryPath(inside, [root])).valid, true);
    await assert.rejects(() => verifyRepositoryPath(outside, [root]), /outside the configured repository roots/);
    await assert.rejects(() => verifyRepositoryPath(join(root, "..", "outside"), [root]), /outside the configured repository roots/);
    await assert.rejects(() => verifyRepositoryPath(join(root, "missing"), [root]), /does not exist/);
    if (process.platform === "win32") {
      assert.equal((await verifyRepositoryPath(inside.toUpperCase(), [root.toLowerCase()])).valid, true);
    }
    const link = join(root, "escape");
    try {
      await symlink(outside, link, process.platform === "win32" ? "junction" : "dir");
      await assert.rejects(() => verifyRepositoryPath(link, [root]), /outside the configured repository roots/);
    } catch (error) {
      if (!["EPERM", "EACCES"].includes(error.code)) throw error;
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("inspects Git without changing HEAD or worktree state", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-git-"));
  try {
    await run("git", ["init", "-b", "main", directory]);
    await run("git", ["-C", directory, "config", "user.email", "test@ahive.local"]);
    await run("git", ["-C", directory, "config", "user.name", "Ahive Test"]);
    await writeFile(join(directory, "tracked.txt"), "initial\n", "utf8");
    await run("git", ["-C", directory, "add", "tracked.txt"]);
    await run("git", ["-C", directory, "commit", "-m", "initial"]);
    const beforeHead = (await run("git", ["-C", directory, "rev-parse", "HEAD"])).stdout.trim();
    const clean = await inspectGitRepository(directory);
    assert.equal(clean.branch, "main");
    assert.equal(clean.head, beforeHead);
    assert.equal(clean.dirty, false);
    await writeFile(join(directory, "tracked.txt"), "changed\n", "utf8");
    const beforeStatus = (await run("git", ["-C", directory, "status", "--porcelain=v1"])).stdout;
    const dirty = await inspectGitRepository(directory);
    const afterHead = (await run("git", ["-C", directory, "rev-parse", "HEAD"])).stdout.trim();
    const afterStatus = (await run("git", ["-C", directory, "status", "--porcelain=v1"])).stdout;
    assert.equal(dirty.dirty, true);
    assert.equal(dirty.changedCount, 1);
    assert.equal(afterHead, beforeHead);
    assert.equal(afterStatus, beforeStatus);
    assert.equal(JSON.stringify(dirty).includes("tracked.txt"), false);
    await run("git", ["-C", directory, "checkout", "--detach"]);
    const detachedHead = (await run("git", ["-C", directory, "rev-parse", "HEAD"])).stdout.trim();
    const detached = await inspectGitRepository(directory);
    assert.equal(detached.detached, true);
    assert.equal(detached.branch, null);
    assert.equal(detached.head, detachedHead);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects a non-Git directory", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-not-git-"));
  try {
    await assert.rejects(() => inspectGitRepository(directory), /Git inspection command failed/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("bounds Git command duration and captured output", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ahive-git-limits-"));
  try {
    await assert.rejects(() => runGit(directory, ["-e", "setTimeout(()=>{},1000)"], {
      executable: process.execPath,
      timeoutMs: 25
    }), /timed out/);
    await assert.rejects(() => runGit(directory, ["-e", "process.stdout.write('x'.repeat(1000))"], {
      executable: process.execPath,
      maxOutputBytes: 100
    }), /safety limit/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

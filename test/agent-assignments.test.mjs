import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../lib/database.mjs";
import {
  assertAgentAssignmentSelectable,
  createWorkspaceEntity,
  initializeNeutralWorkspace,
  listAgentAssignmentViews,
  NeutralStoreError,
  readNeutralStore,
  recordRepositoryVerification,
  removeAgentAssignment,
  updateWorkspaceEntity
} from "../lib/neutral-store.mjs";
import { createSqliteNeutralStore } from "../lib/sqlite-neutral-store.mjs";

const readyRuntime = { status: "ready", installed: true, authenticated: true, version: "test" };

test("persists Project, Product, and Repository-scoped Assignments with effective context", async () => {
  const context = await setupAssignmentStore("assignment-scopes");
  const { database, store, profile, project1, product1, repository1, project2 } = context;
  try {
    const projectOnly = await createWorkspaceEntity(store, "agentAssignment", {
      agentProfileId: profile.id,
      projectId: project1.id,
      contextInstructions: "Use the Project conventions."
    });
    const productScoped = await createWorkspaceEntity(store, "agentAssignment", {
      agentProfileId: profile.id,
      projectId: project1.id,
      productId: product1.id,
      contextInstructions: "Prioritize this Product."
    });
    const repositoryScoped = await createWorkspaceEntity(store, "agentAssignment", {
      agentProfileId: profile.id,
      projectId: project1.id,
      productId: product1.id,
      repositoryId: repository1.id,
      contextInstructions: "Inspect tests before implementation."
    });
    const secondProject = await createWorkspaceEntity(store, "agentAssignment", {
      agentProfileId: profile.id,
      projectId: project2.id
    });

    assert.equal(secondProject.store.agentAssignments.length, 4);
    assert.equal(repositoryScoped.entity.repositoryId, repository1.id);
    const views = listAgentAssignmentViews(secondProject.store, readyRuntime);
    assert.equal(views.every(view => view.canStartWork), true);
    const repositoryView = views.find(view => view.id === repositoryScoped.entity.id);
    assert.equal(repositoryView.effectiveContext.agentProfile.name, "Developer");
    assert.equal(repositoryView.effectiveContext.project.id, project1.id);
    assert.equal(repositoryView.effectiveContext.product.id, product1.id);
    assert.equal(repositoryView.effectiveContext.repository.id, repository1.id);
    assert.equal(repositoryView.effectiveContext.contextInstructions, "Inspect tests before implementation.");
    assert.equal(assertAgentAssignmentSelectable(secondProject.store, projectOnly.entity.id, readyRuntime).id, projectOnly.entity.id);

    const beforeProfile = structuredClone(secondProject.store.agentProfiles[0]);
    const updated = await updateWorkspaceEntity(store, "agentAssignment", productScoped.entity.id, {
      contextInstructions: "Product-only instructions changed.",
      active: false
    });
    assert.deepEqual(updated.store.agentProfiles[0], beforeProfile);
    assert.equal(updated.entity.contextInstructions, "Product-only instructions changed.");
    assert.throws(() => assertAgentAssignmentSelectable(updated.store, updated.entity.id, readyRuntime), /Inactive Agent Assignment/);

    await assert.rejects(
      () => createWorkspaceEntity(store, "agentAssignment", {
        agentProfileId: profile.id,
        projectId: project1.id,
        productId: product1.id,
        repositoryId: repository1.id
      }),
      error => error instanceof NeutralStoreError && error.status === 409 && /already exists/.test(error.message)
    );

    const removed = await removeAgentAssignment(store, projectOnly.entity.id);
    assert.equal(removed.store.agentAssignments.length, 3);
    assert.equal((await readNeutralStore(store)).agentProfiles.length, 1);
  } finally {
    database.close();
  }
});

test("rejects cross-Project and mismatched Product/Repository scopes", async () => {
  const context = await setupAssignmentStore("assignment-boundaries");
  const { database, store, profile, project1, product1, project2, product2, repository1, repository2 } = context;
  try {
    await assert.rejects(
      () => createWorkspaceEntity(store, "agentAssignment", {
        agentProfileId: profile.id, projectId: project1.id, productId: product2.id
      }),
      error => error instanceof NeutralStoreError && error.status === 409 && /Product must belong/.test(error.message)
    );
    await assert.rejects(
      () => createWorkspaceEntity(store, "agentAssignment", {
        agentProfileId: profile.id, projectId: project1.id, repositoryId: repository2.id
      }),
      error => error instanceof NeutralStoreError && error.status === 409 && /Repository must belong/.test(error.message)
    );
    await assert.rejects(
      () => createWorkspaceEntity(store, "agentAssignment", {
        agentProfileId: profile.id,
        projectId: project1.id,
        productId: product2.id,
        repositoryId: repository1.id
      }),
      error => error instanceof NeutralStoreError && /Product must belong/.test(error.message)
    );

    const product1b = await createWorkspaceEntity(store, "product", { projectId: project1.id, name: "Product 1B" });
    await assert.rejects(
      () => createWorkspaceEntity(store, "agentAssignment", {
        agentProfileId: profile.id,
        projectId: project1.id,
        productId: product1b.entity.id,
        repositoryId: repository1.id
      }),
      error => error instanceof NeutralStoreError && /selected Product/.test(error.message)
    );

    const valid = await createWorkspaceEntity(store, "agentAssignment", {
      agentProfileId: profile.id, projectId: project2.id, productId: product2.id, repositoryId: repository2.id
    });
    await assert.rejects(
      () => updateWorkspaceEntity(store, "agentAssignment", valid.entity.id, { projectId: project1.id }),
      error => error instanceof NeutralStoreError && error.status === 409
    );
  } finally {
    database.close();
  }
});

test("rejects inactive dependencies and unverified Repositories for new Assignments", async () => {
  const context = await setupAssignmentStore("assignment-inactive");
  const { database, store, profile, project1, product1, repository1 } = context;
  try {
    const attempts = [
      ["agentProfile", profile.id, { agentProfileId: profile.id, projectId: project1.id }, /Inactive Agent Profile/],
      ["project", project1.id, { agentProfileId: profile.id, projectId: project1.id }, /Inactive Project/],
      ["product", product1.id, { agentProfileId: profile.id, projectId: project1.id, productId: product1.id }, /Inactive Product/],
      ["repository", repository1.id, { agentProfileId: profile.id, projectId: project1.id, repositoryId: repository1.id }, /Inactive Repository/]
    ];
    for (const [type, id, input, message] of attempts) {
      await updateWorkspaceEntity(store, type, id, { active: false });
      await assert.rejects(() => createWorkspaceEntity(store, "agentAssignment", input), message);
      await updateWorkspaceEntity(store, type, id, { active: true });
    }

    const unverified = await createWorkspaceEntity(store, "repository", {
      projectId: project1.id,
      name: "Unverified",
      localPath: "C:/work/unverified",
      accessMode: "read_only"
    });
    await assert.rejects(
      () => createWorkspaceEntity(store, "agentAssignment", {
        agentProfileId: profile.id, projectId: project1.id, repositoryId: unverified.entity.id
      }),
      error => error instanceof NeutralStoreError && /must be verified/.test(error.message)
    );
  } finally {
    database.close();
  }
});

async function setupAssignmentStore(key) {
  const database = openDatabase(":memory:");
  const store = createSqliteNeutralStore(database, key);
  const workspace = await initializeNeutralWorkspace(store, {
    organizationName: "Org", projectName: "Project 1", productName: "Product 1"
  });
  const project1 = workspace.project;
  const product1 = workspace.product;
  const project2Result = await createWorkspaceEntity(store, "project", {
    organizationId: workspace.organization.id, name: "Project 2"
  });
  const project2 = project2Result.entity;
  const product2Result = await createWorkspaceEntity(store, "product", { projectId: project2.id, name: "Product 2" });
  const product2 = product2Result.entity;
  const repository1Result = await createWorkspaceEntity(store, "repository", {
    projectId: project1.id, productId: product1.id, name: "Repository 1",
    localPath: "C:/work/repository-1", accessMode: "read_only"
  });
  const repository2Result = await createWorkspaceEntity(store, "repository", {
    projectId: project2.id, productId: product2.id, name: "Repository 2",
    localPath: "C:/work/repository-2", accessMode: "read_only"
  });
  const repository1 = (await recordRepositoryVerification(store, repository1Result.entity.id, {
    valid: true, resolvedPath: "C:/work/repository-1"
  })).entity;
  const repository2 = (await recordRepositoryVerification(store, repository2Result.entity.id, {
    valid: true, resolvedPath: "C:/work/repository-2"
  })).entity;
  const harness = await createWorkspaceEntity(store, "harnessAccount", { displayName: "Local Codex" });
  const profileResult = await createWorkspaceEntity(store, "agentProfile", {
    harnessAccountId: harness.entity.id,
    name: "Developer",
    description: "Reusable profile",
    instructions: "Keep changes focused.",
    model: "gpt-5.6-sol"
  });
  return { database, store, profile: profileResult.entity, project1, product1, project2, product2, repository1, repository2 };
}

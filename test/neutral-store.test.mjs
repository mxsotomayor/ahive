import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createWorkspaceEntity,
  importGitLabIssues,
  initializeNeutralWorkspace,
  listLegacyIssueViews,
  NeutralStoreError,
  readNeutralStore,
  removeProductSource,
  updateIssueByExternalIdentity,
  updateWorkspaceEntity,
  writeNeutralStore
} from "../lib/neutral-store.mjs";

const workspace = {
  organizationName: "Rezzilla-Labs",
  projectName: "IRN",
  productName: "IRN",
  gitlabBaseUrl: "https://gitlab.example.com"
};

function gitlabIssue({ projectId = 77, iid = 31, title = "Review payment retry logic", project = "irn/payments" } = {}) {
  return {
    id: `${project}#${iid}`,
    sourceKey: String(projectId * 1000 + iid),
    title,
    description: "Confirm the new backoff behavior.",
    source: "gitlab",
    project,
    status: "review",
    priority: "high",
    due: "2026-07-22",
    labels: ["backend"],
    updated: "2026-07-18T10:00:00.000Z",
    sourceUrl: `https://gitlab.example.com/${project}/-/issues/${iid}`,
    integration: { provider: "gitlab", projectId, issueIid: iid }
  };
}

test("persists the Organization, Project, and Product hierarchy with matching names", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-neutral-"));
  const filePath = join(directory, "maxwell.json");
  try {
    await initializeNeutralWorkspace(filePath, workspace);
    const store = await readNeutralStore(filePath);
    assert.equal(store.organizations[0].name, "Rezzilla-Labs");
    assert.equal(store.projects[0].name, "IRN");
    assert.equal(store.products[0].name, "IRN");
    assert.equal(store.projects[0].organizationId, store.organizations[0].id);
    assert.equal(store.products[0].projectId, store.projects[0].id);
    assert.ok(store.updatedAt);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("does not recreate seeded workspace entities after they are renamed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-neutral-"));
  const filePath = join(directory, "maxwell.json");
  try {
    const initialized = await initializeNeutralWorkspace(filePath, workspace);
    await updateWorkspaceEntity(filePath, "organization", initialized.organization.id, { name: "Rezzilla" });
    await updateWorkspaceEntity(filePath, "project", initialized.project.id, { name: "IRN Delivery" });
    await updateWorkspaceEntity(filePath, "product", initialized.product.id, { name: "IRN Process Manager" });

    const restarted = await initializeNeutralWorkspace(filePath, workspace);

    assert.equal(restarted.store.organizations.length, 1);
    assert.equal(restarted.store.projects.length, 1);
    assert.equal(restarted.store.products.length, 1);
    assert.equal(restarted.organization.name, "Rezzilla");
    assert.equal(restarted.project.name, "IRN Delivery");
    assert.equal(restarted.product.name, "IRN Process Manager");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("imports GitLab issues as neutral Issues with Product Sources and origin links", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-neutral-"));
  const filePath = join(directory, "maxwell.json");
  try {
    const imported = await importGitLabIssues(filePath, [
      gitlabIssue(),
      gitlabIssue({ projectId: 88, iid: 4, project: "irn/identity", title: "Verify citizen lookup" })
    ], { viewer: "max", viewerName: "Max", syncedAt: "2026-07-18T11:00:00.000Z" }, workspace);

    assert.equal(imported.created, 2);
    assert.equal(imported.store.organizations.length, 1);
    assert.equal(imported.store.projects.length, 1);
    assert.equal(imported.store.products.length, 1);
    assert.equal(imported.store.connectorAccounts.length, 1);
    assert.equal(imported.store.productSources.length, 2);
    assert.equal(imported.store.issues.length, 2);
    assert.equal(imported.store.externalIssueLinks.length, 2);
    assert.ok(imported.store.externalIssueLinks.every(link => link.role === "origin"));
    assert.ok(imported.store.issues.every(issue => issue.productId === imported.store.products[0].id));

    const views = listLegacyIssueViews(imported.store, { issueIds: imported.importedIssueIds });
    assert.equal(views[0].integration.projectId, 77);
    assert.equal(views[0].integration.issueIid, 31);
    assert.equal(views[0].maxwellIssueId, imported.store.issues[0].id);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("repeated pulls update by stable external identity without duplicating Issues", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-neutral-"));
  const filePath = join(directory, "maxwell.json");
  try {
    const first = await importGitLabIssues(filePath, [gitlabIssue()], {}, workspace);
    const second = await importGitLabIssues(filePath, [gitlabIssue({ title: "Updated title" })], {}, workspace);

    assert.equal(first.created, 1);
    assert.equal(second.created, 0);
    assert.equal(second.updated, 1);
    assert.equal(second.store.issues.length, 1);
    assert.equal(second.store.externalIssueLinks.length, 1);
    assert.equal(second.store.issues[0].title, "Updated title");
    assert.equal(second.store.issues[0].id, first.store.issues[0].id);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("updates a neutral Issue through its external identity", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-neutral-"));
  const filePath = join(directory, "maxwell.json");
  try {
    await importGitLabIssues(filePath, [gitlabIssue()], {}, workspace);
    const updated = await updateIssueByExternalIdentity(filePath, {
      provider: "gitlab",
      baseUrl: workspace.gitlabBaseUrl,
      externalContainerId: 77,
      externalIssueId: 31
    }, { status: "done" });

    assert.equal(updated.issue.status, "done");
    assert.equal(updated.link.syncState, "current");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects a Product Source that would move an origin across Product boundaries", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-neutral-"));
  const filePath = join(directory, "maxwell.json");
  try {
    const imported = await importGitLabIssues(filePath, [gitlabIssue()], {}, workspace);
    const store = structuredClone(imported.store);
    const project = store.projects[0];
    const secondProduct = {
      ...store.products[0],
      id: "product_second",
      projectId: project.id,
      name: "Second Product"
    };
    store.products.push(secondProduct);
    store.productSources[0].productId = secondProduct.id;

    await assert.rejects(
      () => writeNeutralStore(filePath, store),
      error => error instanceof NeutralStoreError && /another Product/.test(error.message)
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("creates and updates managed workspace entities without storing secrets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-neutral-"));
  const filePath = join(directory, "maxwell.json");
  try {
    const organization = await createWorkspaceEntity(filePath, "organization", { name: "Another Employer", type: "employer" });
    const project = await createWorkspaceEntity(filePath, "project", { organizationId: organization.entity.id, name: "Citizen Portal" });
    const product = await createWorkspaceEntity(filePath, "product", { projectId: project.entity.id, name: "Back Office" });
    const account = await createWorkspaceEntity(filePath, "connectorAccount", {
      provider: "openproject",
      displayName: "OpenProject - Delivery",
      baseUrl: "https://openproject.example.com",
      credentialReference: "OPENPROJECT_API_TOKEN"
    });
    const source = await createWorkspaceEntity(filePath, "productSource", {
      productId: product.entity.id,
      connectorAccountId: account.entity.id,
      displayName: "Back Office Work Packages",
      externalContainerId: "42",
      externalUrl: "https://openproject.example.com/projects/42"
    });
    const updated = await updateWorkspaceEntity(filePath, "product", product.entity.id, { name: "Backoffice", active: false });

    assert.equal(updated.entity.name, "Backoffice");
    assert.equal(updated.entity.active, false);
    assert.equal(source.entity.provider, "openproject");
    assert.equal(source.entity.productId, product.entity.id);
    assert.equal(account.entity.credentialReference, "OPENPROJECT_API_TOKEN");
    assert.equal(JSON.stringify(source.store).includes("secret-value"), false);
    await assert.rejects(
      () => createWorkspaceEntity(filePath, "organization", { name: "another employer" }),
      error => error instanceof NeutralStoreError && error.status === 409
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("stores Google OAuth references on the account and sheet location on the Product Source", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-neutral-"));
  const filePath = join(directory, "maxwell.json");
  try {
    await initializeNeutralWorkspace(filePath, workspace);
    const store = await readNeutralStore(filePath);
    const account = await createWorkspaceEntity(filePath, "connectorAccount", {
      provider: "sheets",
      displayName: "Google Sheets - Rezzilla",
      clientIdReference: "GOOGLE_CLIENT_ID",
      clientSecretReference: "GOOGLE_CLIENT_SECRET",
      refreshTokenReference: "GOOGLE_REFRESH_TOKEN"
    });
    const source = await createWorkspaceEntity(filePath, "productSource", {
      productId: store.products[0].id,
      connectorAccountId: account.entity.id,
      displayName: "Rezzilla Tasks",
      externalContainerId: "spreadsheet_123",
      sheetTab: "Assigned Tasks",
      range: "'Assigned Tasks'!A:H"
    });

    assert.deepEqual(account.entity.credentialReferences, {
      clientId: "GOOGLE_CLIENT_ID",
      clientSecret: "GOOGLE_CLIENT_SECRET",
      refreshToken: "GOOGLE_REFRESH_TOKEN"
    });
    assert.deepEqual(source.entity.metadata, {
      sheetTab: "Assigned Tasks",
      range: "'Assigned Tasks'!A:H"
    });
    assert.equal(JSON.stringify(source.store).includes("client-secret-value"), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("protects the external container identity of a Product Source with linked Issues", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-neutral-"));
  const filePath = join(directory, "maxwell.json");
  try {
    const imported = await importGitLabIssues(filePath, [gitlabIssue()], {}, workspace);
    const source = imported.store.productSources[0];
    await assert.rejects(
      () => updateWorkspaceEntity(filePath, "productSource", source.id, { externalContainerId: "999" }),
      error => error instanceof NeutralStoreError && error.status === 409
    );
    await assert.rejects(
      () => removeProductSource(filePath, source.id),
      error => error instanceof NeutralStoreError && error.status === 409 && /Deactivate it instead/.test(error.message)
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("removes an unused Product Source without affecting its Product or Connector Account", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maxwell-neutral-"));
  const filePath = join(directory, "maxwell.json");
  try {
    const initialized = await initializeNeutralWorkspace(filePath, workspace);
    const account = await createWorkspaceEntity(filePath, "connectorAccount", {
      provider: "github",
      displayName: "GitHub - Rezzilla",
      baseUrl: "https://github.com",
      credentialReference: "GITHUB_TOKEN"
    });
    const source = await createWorkspaceEntity(filePath, "productSource", {
      productId: initialized.product.id,
      connectorAccountId: account.entity.id,
      displayName: "IRN GitHub Project",
      externalContainerId: "28",
      externalUrl: "https://github.com/orgs/Rezzilla-Labs/projects/28"
    });

    const removed = await removeProductSource(filePath, source.entity.id);
    assert.equal(removed.entity.id, source.entity.id);
    assert.equal(removed.store.productSources.length, 0);
    assert.equal(removed.store.products.length, 1);
    assert.equal(removed.store.connectorAccounts.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

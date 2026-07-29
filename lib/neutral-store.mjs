import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const collections = [
  "organizations",
  "projects",
  "products",
  "connectorAccounts",
  "productSources",
  "issues",
  "externalIssueLinks"
];
const writeQueues = new Map();

export class NeutralStoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "NeutralStoreError";
    this.status = status;
  }
}

export function emptyNeutralStore() {
  return {
    version: 1,
    organizations: [],
    projects: [],
    products: [],
    connectorAccounts: [],
    productSources: [],
    issues: [],
    externalIssueLinks: [],
    syncMeta: {},
    createdAt: null,
    updatedAt: null
  };
}

export async function readNeutralStore(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    const store = normalizeStore(parsed);
    validateNeutralStore(store);
    return store;
  } catch (error) {
    if (error.code === "ENOENT") return emptyNeutralStore();
    if (error instanceof SyntaxError) {
      throw new NeutralStoreError("The neutral store contains invalid JSON.", 500);
    }
    throw error;
  }
}

export async function writeNeutralStore(filePath, store) {
  const payload = normalizeStore(store);
  const now = new Date().toISOString();
  payload.createdAt ||= now;
  payload.updatedAt = now;
  validateNeutralStore(payload);

  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
  return payload;
}

export async function initializeNeutralWorkspace(filePath, input = {}) {
  const mutation = await mutateStore(filePath, store => ensureWorkspace(store, input));
  return { ...mutation.result, store: mutation.store };
}

export async function createWorkspaceEntity(filePath, type, input = {}) {
  const mutation = await mutateStore(filePath, store => {
    const now = new Date().toISOString();
    let entity;

    if (type === "organization") {
      assertManagedNameAvailable(store.organizations, input.name, null, null, null, "Organization");
      entity = {
        id: managedId("organization"),
        name: requiredString(input.name, "Organization name"),
        type: String(input.type || "employer").trim(),
        active: input.active !== false,
        createdAt: now,
        updatedAt: now
      };
      store.organizations.push(entity);
    } else if (type === "project") {
      requireEntity(store.organizations, input.organizationId, "Organization");
      assertManagedNameAvailable(store.projects, input.name, "organizationId", input.organizationId, null, "Project");
      entity = {
        id: managedId("project"),
        organizationId: input.organizationId,
        name: requiredString(input.name, "Project name"),
        key: String(input.key || slug(input.name)).trim(),
        description: optionalString(input.description),
        active: input.active !== false,
        createdAt: now,
        updatedAt: now
      };
      store.projects.push(entity);
    } else if (type === "product") {
      requireEntity(store.projects, input.projectId, "Project");
      assertManagedNameAvailable(store.products, input.name, "projectId", input.projectId, null, "Product");
      entity = {
        id: managedId("product"),
        projectId: input.projectId,
        name: requiredString(input.name, "Product name"),
        key: String(input.key || slug(input.name)).trim(),
        description: optionalString(input.description),
        active: input.active !== false,
        createdAt: now,
        updatedAt: now
      };
      store.products.push(entity);
    } else if (type === "connectorAccount") {
      const provider = normalizeProvider(input.provider);
      const baseUrl = optionalHttpUrl(input.baseUrl, "Connector base URL");
      const credentialReferences = providerCredentialReferences(provider, input);
      const credential = primaryCredentialReference(provider, credentialReferences);
      assertConnectorIdentityAvailable(store, provider, baseUrl, credential);
      entity = {
        id: managedId("connector-account"),
        provider,
        displayName: requiredString(input.displayName, "Connector Account name"),
        baseUrl,
        credentialReference: credential,
        credentialReferences,
        capabilities: providerCapabilities(provider),
        active: input.active !== false,
        createdAt: now,
        updatedAt: now
      };
      store.connectorAccounts.push(entity);
    } else if (type === "productSource") {
      const product = requireEntity(store.products, input.productId, "Product");
      const account = requireEntity(store.connectorAccounts, input.connectorAccountId, "Connector Account");
      const externalContainerId = requiredString(input.externalContainerId, "External container ID");
      assertProductSourceIdentityAvailable(store, product.id, account.id, externalContainerId);
      entity = {
        id: managedId("product-source"),
        productId: product.id,
        connectorAccountId: account.id,
        provider: account.provider,
        externalContainerId,
        externalUrl: optionalHttpUrl(input.externalUrl, "External container URL"),
        displayName: requiredString(input.displayName, "Product Source name"),
        capabilities: [...account.capabilities],
        statusMapping: {},
        priorityMapping: {},
        active: input.active !== false,
        metadata: productSourceMetadata(account.provider, input),
        createdAt: now,
        updatedAt: now
      };
      store.productSources.push(entity);
    } else {
      throw new NeutralStoreError(`Unsupported workspace entity type: ${type}.`, 404);
    }

    return entity;
  });
  return { entity: mutation.result, store: mutation.store };
}

export async function updateWorkspaceEntity(filePath, type, id, input = {}) {
  const mutation = await mutateStore(filePath, store => {
    const now = new Date().toISOString();
    let entity;

    if (type === "organization") {
      entity = requireEntity(store.organizations, id, "Organization");
      if (Object.hasOwn(input, "name")) {
        assertManagedNameAvailable(store.organizations, input.name, null, null, entity.id, "Organization");
        entity.name = requiredString(input.name, "Organization name");
      }
      if (Object.hasOwn(input, "type")) entity.type = requiredString(input.type, "Organization type");
    } else if (type === "project") {
      entity = requireEntity(store.projects, id, "Project");
      if (Object.hasOwn(input, "name")) {
        assertManagedNameAvailable(store.projects, input.name, "organizationId", entity.organizationId, entity.id, "Project");
        entity.name = requiredString(input.name, "Project name");
      }
      if (Object.hasOwn(input, "key")) entity.key = requiredString(input.key, "Project key");
      if (Object.hasOwn(input, "description")) entity.description = optionalString(input.description);
    } else if (type === "product") {
      entity = requireEntity(store.products, id, "Product");
      if (Object.hasOwn(input, "name")) {
        assertManagedNameAvailable(store.products, input.name, "projectId", entity.projectId, entity.id, "Product");
        entity.name = requiredString(input.name, "Product name");
      }
      if (Object.hasOwn(input, "key")) entity.key = requiredString(input.key, "Product key");
      if (Object.hasOwn(input, "description")) entity.description = optionalString(input.description);
    } else if (type === "connectorAccount") {
      entity = requireEntity(store.connectorAccounts, id, "Connector Account");
      if (Object.hasOwn(input, "displayName")) entity.displayName = requiredString(input.displayName, "Connector Account name");
      if (Object.hasOwn(input, "credentialReference")) {
        entity.credentialReference = credentialReference(input.credentialReference);
        if (entity.provider !== "sheets") entity.credentialReferences = entity.credentialReference ? { token: entity.credentialReference } : {};
      }
      if (entity.provider === "sheets" && (
        Object.hasOwn(input, "clientIdReference") ||
        Object.hasOwn(input, "clientSecretReference") ||
        Object.hasOwn(input, "refreshTokenReference")
      )) {
        entity.credentialReferences = providerCredentialReferences("sheets", {
          clientIdReference: input.clientIdReference ?? entity.credentialReferences?.clientId,
          clientSecretReference: input.clientSecretReference ?? entity.credentialReferences?.clientSecret,
          refreshTokenReference: input.refreshTokenReference ?? entity.credentialReferences?.refreshToken
        });
        entity.credentialReference = primaryCredentialReference("sheets", entity.credentialReferences);
      }
      if (Object.hasOwn(input, "baseUrl")) {
        const nextBaseUrl = optionalHttpUrl(input.baseUrl, "Connector base URL");
        if (nextBaseUrl !== entity.baseUrl && store.productSources.some(source => source.connectorAccountId === entity.id)) {
          throw new NeutralStoreError("A Connector Account used by Product Sources cannot change its base URL.", 409);
        }
        entity.baseUrl = nextBaseUrl;
      }
      assertConnectorIdentityAvailable(store, entity.provider, entity.baseUrl, entity.credentialReference, entity.id);
    } else if (type === "productSource") {
      entity = requireEntity(store.productSources, id, "Product Source");
      if (Object.hasOwn(input, "displayName")) entity.displayName = requiredString(input.displayName, "Product Source name");
      if (Object.hasOwn(input, "externalUrl")) entity.externalUrl = optionalHttpUrl(input.externalUrl, "External container URL");
      if (entity.provider === "sheets") {
        entity.metadata = {
          ...(entity.metadata || {}),
          ...productSourceMetadata("sheets", {
            sheetTab: input.sheetTab ?? entity.metadata?.sheetTab,
            range: input.range ?? entity.metadata?.range
          })
        };
      }
      if (Object.hasOwn(input, "externalContainerId") && String(input.externalContainerId) !== String(entity.externalContainerId)) {
        const hasLinks = store.externalIssueLinks.some(link => link.productSourceId === entity.id);
        if (hasLinks) throw new NeutralStoreError("A Product Source with linked Issues cannot change its external container ID.", 409);
        const externalContainerId = requiredString(input.externalContainerId, "External container ID");
        assertProductSourceIdentityAvailable(store, entity.productId, entity.connectorAccountId, externalContainerId, entity.id);
        entity.externalContainerId = externalContainerId;
      }
    } else {
      throw new NeutralStoreError(`Unsupported workspace entity type: ${type}.`, 404);
    }

    if (Object.hasOwn(input, "active")) entity.active = Boolean(input.active);
    entity.updatedAt = now;
    return entity;
  });
  return { entity: mutation.result, store: mutation.store };
}

export async function removeProductSource(filePath, id) {
  const mutation = await mutateStore(filePath, store => {
    const source = requireEntity(store.productSources, id, "Product Source");
    const linkedRepresentations = store.externalIssueLinks.filter(link => link.productSourceId === source.id).length;
    if (linkedRepresentations) {
      throw new NeutralStoreError(
        `This Product Source has ${linkedRepresentations} linked Issue representation${linkedRepresentations === 1 ? "" : "s"}. Deactivate it instead to preserve identity history.`,
        409
      );
    }
    store.productSources = store.productSources.filter(item => item.id !== source.id);
    return source;
  });
  return { entity: mutation.result, store: mutation.store };
}

export async function importGitLabIssues(filePath, normalizedIssues, meta = {}, input = {}) {
  if (!Array.isArray(normalizedIssues)) throw new NeutralStoreError("GitLab issues must be an array.");

  const mutation = await mutateStore(filePath, store => {
    const workspace = ensureWorkspace(store, input);
    const importedIssueIds = [];
    let created = 0;
    let updated = 0;

    for (const externalIssue of normalizedIssues) {
      const source = ensureGitLabProductSource(store, workspace.product, externalIssue, input);
      const externalIssueId = requiredString(externalIssue.integration?.issueIid, "GitLab issue IID");
      const existingLink = store.externalIssueLinks.find(link =>
        link.productSourceId === source.id && link.externalIssueId === externalIssueId
      );

      if (existingLink) {
        const issue = requireEntity(store.issues, existingLink.issueId, "Issue");
        applyExternalIssue(issue, externalIssue, meta, false);
        applyExternalLink(existingLink, externalIssue);
        importedIssueIds.push(issue.id);
        updated += 1;
        continue;
      }

      const now = new Date().toISOString();
      const issue = {
        id: randomUUID(),
        productId: workspace.product.id,
        originProductSourceId: source.id,
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
        assigneeIdentity: null,
        labels: [],
        version: 1,
        createdAt: now,
        updatedAt: now,
        metadata: {}
      };
      applyExternalIssue(issue, externalIssue, meta, true);
      const link = {
        id: stableId("external-link", source.id, externalIssueId),
        issueId: issue.id,
        productSourceId: source.id,
        role: "origin",
        externalIssueId,
        externalUrl: externalIssue.sourceUrl || null,
        externalVersion: externalIssue.updated || null,
        lastSyncedAt: meta.syncedAt || now,
        lastPayloadHash: hashPayload(externalIssue),
        syncState: "current",
        metadata: externalLinkMetadata(externalIssue)
      };
      store.issues.push(issue);
      store.externalIssueLinks.push(link);
      importedIssueIds.push(issue.id);
      created += 1;
    }

    store.syncMeta.gitlab = { ...meta, importedAt: new Date().toISOString() };
    return { workspace, importedIssueIds, created, updated };
  });

  return { ...mutation.result, store: mutation.store };
}

export async function updateIssueByExternalIdentity(filePath, identity, changes) {
  const mutation = await mutateStore(filePath, store => {
    const source = resolveProductSource(store, identity);
    const externalIssueId = requiredString(identity.externalIssueId, "external issue ID");
    const link = store.externalIssueLinks.find(item =>
      item.productSourceId === source.id && item.externalIssueId === externalIssueId
    );
    if (!link) throw new NeutralStoreError("The external issue is not linked in the neutral store.", 404);

    const issue = requireEntity(store.issues, link.issueId, "Issue");
    const allowed = ["title", "description", "status", "priority", "dueDate", "assigneeIdentity", "labels"];
    for (const field of allowed) {
      if (Object.hasOwn(changes, field)) issue[field] = changes[field];
    }
    issue.version = Number(issue.version || 0) + 1;
    issue.updatedAt = new Date().toISOString();
    link.syncState = changes.syncState || "current";
    link.lastSyncedAt = new Date().toISOString();
    if (changes.externalVersion) link.externalVersion = changes.externalVersion;
    return { issue, link };
  });

  return { ...mutation.result, store: mutation.store };
}

export function listLegacyIssueViews(store, options = {}) {
  const issueIds = options.issueIds || store.issues.map(issue => issue.id);
  const issueById = new Map(store.issues.map(issue => [issue.id, issue]));
  const sourceById = new Map(store.productSources.map(source => [source.id, source]));
  const linksByIssue = new Map();
  for (const link of store.externalIssueLinks) {
    const links = linksByIssue.get(link.issueId) || [];
    links.push(link);
    linksByIssue.set(link.issueId, links);
  }

  return issueIds.flatMap(issueId => {
    const issue = issueById.get(issueId);
    if (!issue) return [];
    const links = linksByIssue.get(issue.id) || [];
    const originLink = links.find(link => link.role === "origin");
    const source = originLink ? sourceById.get(originLink.productSourceId) : null;
    if (!originLink || !source) return [];
    if (options.provider && source.provider !== options.provider) return [];

    const projectPath = source.displayName || `Container ${source.externalContainerId}`;
    const displayId = issue.metadata?.displayId || `${projectPath}#${originLink.externalIssueId}`;
    return [{
      id: displayId,
      maxwellIssueId: issue.id,
      productId: issue.productId,
      originProductSourceId: issue.originProductSourceId,
      sourceKey: originLink.metadata?.providerGlobalId || originLink.externalIssueId,
      title: issue.title,
      description: issue.description,
      source: source.provider,
      project: projectPath,
      status: issue.status,
      priority: issue.priority,
      due: issue.dueDate,
      labels: Array.isArray(issue.labels) ? issue.labels : [],
      updated: issue.updatedAt,
      sourceUrl: originLink.externalUrl,
      representations: links.map(link => ({
        productSourceId: link.productSourceId,
        role: link.role,
        externalIssueId: link.externalIssueId,
        externalUrl: link.externalUrl,
        syncState: link.syncState
      })),
      integration: legacyIntegration(source, originLink)
    }];
  });
}

export function validateNeutralStore(store) {
  if (store.version !== 1) throw new NeutralStoreError(`Unsupported neutral store version: ${store.version}.`, 500);
  for (const collection of collections) {
    if (!Array.isArray(store[collection])) throw new NeutralStoreError(`${collection} must be an array.`, 500);
    assertUnique(store[collection].map(entity => entity.id), `${collection} ID`);
  }

  const organizationIds = new Set(store.organizations.map(entity => entity.id));
  const projectIds = new Set(store.projects.map(entity => entity.id));
  const productIds = new Set(store.products.map(entity => entity.id));
  const accountIds = new Set(store.connectorAccounts.map(entity => entity.id));
  const sourceById = new Map(store.productSources.map(entity => [entity.id, entity]));
  const issueById = new Map(store.issues.map(entity => [entity.id, entity]));

  for (const project of store.projects) assertReference(organizationIds, project.organizationId, `Project ${project.id} organization`);
  for (const product of store.products) assertReference(projectIds, product.projectId, `Product ${product.id} project`);
  for (const source of store.productSources) {
    assertReference(productIds, source.productId, `Product Source ${source.id} product`);
    assertReference(accountIds, source.connectorAccountId, `Product Source ${source.id} connector account`);
  }
  for (const issue of store.issues) {
    assertReference(productIds, issue.productId, `Issue ${issue.id} product`);
    const originSource = sourceById.get(issue.originProductSourceId);
    if (!originSource) throw new NeutralStoreError(`Issue ${issue.id} has no valid origin Product Source.`, 500);
    if (originSource.productId !== issue.productId) throw new NeutralStoreError(`Issue ${issue.id} origin Source belongs to another Product.`, 500);
  }

  assertUnique(store.organizations.map(entity => comparable(entity.name)), "Organization name");
  assertUnique(store.projects.map(entity => `${entity.organizationId}\u0000${comparable(entity.name)}`), "Project name within Organization");
  assertUnique(store.products.map(entity => `${entity.projectId}\u0000${comparable(entity.name)}`), "Product name within Project");
  assertUnique(store.connectorAccounts.map(entity => `${entity.provider}\u0000${entity.baseUrl || ""}\u0000${entity.credentialReference || ""}`), "Connector Account connection identity");

  assertUnique(store.productSources.map(source => sourceIdentity(source)), "Product Source identity");
  assertUnique(store.externalIssueLinks.map(link => `${link.productSourceId}\u0000${link.externalIssueId}`), "external issue identity");
  assertUnique(store.externalIssueLinks.map(link => `${link.issueId}\u0000${link.productSourceId}`), "Issue/Product Source link");

  const originCount = new Map();
  for (const link of store.externalIssueLinks) {
    const issue = issueById.get(link.issueId);
    const source = sourceById.get(link.productSourceId);
    if (!issue) throw new NeutralStoreError(`External Issue Link ${link.id} references a missing Issue.`, 500);
    if (!source) throw new NeutralStoreError(`External Issue Link ${link.id} references a missing Product Source.`, 500);
    if (issue.productId !== source.productId) throw new NeutralStoreError(`External Issue Link ${link.id} crosses Product boundaries.`, 500);
    if (!["origin", "replica"].includes(link.role)) throw new NeutralStoreError(`External Issue Link ${link.id} has an invalid role.`, 500);
    if (link.role === "origin") {
      originCount.set(issue.id, (originCount.get(issue.id) || 0) + 1);
      if (issue.originProductSourceId !== link.productSourceId) {
        throw new NeutralStoreError(`Issue ${issue.id} origin does not match its origin link.`, 500);
      }
    }
  }
  for (const issue of store.issues) {
    if (originCount.get(issue.id) !== 1) throw new NeutralStoreError(`Issue ${issue.id} must have exactly one origin link.`, 500);
  }
  return true;
}

function normalizeStore(store = {}) {
  const normalized = { ...emptyNeutralStore(), ...store, version: Number(store.version || 1) };
  for (const collection of collections) normalized[collection] = Array.isArray(store[collection]) ? store[collection] : [];
  normalized.syncMeta = store.syncMeta && typeof store.syncMeta === "object" ? store.syncMeta : {};
  return normalized;
}

async function mutateStore(filePath, mutator) {
  const previous = writeQueues.get(filePath) || Promise.resolve();
  const task = previous.catch(() => undefined).then(async () => {
    const store = await readNeutralStore(filePath);
    const result = await mutator(store);
    const persisted = await writeNeutralStore(filePath, store);
    return { result, store: persisted };
  });
  writeQueues.set(filePath, task);
  try {
    return await task;
  } finally {
    if (writeQueues.get(filePath) === task) writeQueues.delete(filePath);
  }
}

function ensureWorkspace(store, input) {
  const organizationName = String(input.organizationName || "Zing Developers").trim();
  const projectName = String(input.projectName || "IRN").trim();
  const productName = String(input.productName || "IRN").trim();
  const now = new Date().toISOString();

  let organization = store.organizations.find(entity => comparable(entity.name) === comparable(organizationName));
  if (!organization) {
    organization = { id: stableId("organization", organizationName), name: organizationName, type: "employer", active: true, createdAt: now, updatedAt: now };
    store.organizations.push(organization);
  }

  let project = store.projects.find(entity => entity.organizationId === organization.id && comparable(entity.name) === comparable(projectName));
  if (!project) {
    project = { id: stableId("project", organization.id, projectName), organizationId: organization.id, name: projectName, key: slug(projectName), description: null, active: true, createdAt: now, updatedAt: now };
    store.projects.push(project);
  }

  let product = store.products.find(entity => entity.projectId === project.id && comparable(entity.name) === comparable(productName));
  if (!product) {
    product = { id: stableId("product", project.id, productName), projectId: project.id, name: productName, key: slug(productName), description: null, active: true, createdAt: now, updatedAt: now };
    store.products.push(product);
  }

  return { organization, project, product };
}

function ensureGitLabProductSource(store, product, externalIssue, input) {
  const projectId = requiredString(externalIssue.integration?.projectId, "GitLab project ID");
  const baseUrl = normalizeBaseUrl(input.gitlabBaseUrl || "https://gitlab.com");
  let account = store.connectorAccounts.find(entity =>
    entity.provider === "gitlab" && entity.baseUrl && normalizeBaseUrl(entity.baseUrl) === baseUrl
  );
  if (!account) {
    const now = new Date().toISOString();
    account = {
      id: stableId("connector-account", "gitlab", baseUrl),
      provider: "gitlab",
      displayName: input.gitlabAccountName || `GitLab - ${new URL(baseUrl).host}`,
      baseUrl,
      credentialReference: "GITLAB_TOKEN",
      credentialReferences: { token: "GITLAB_TOKEN" },
      capabilities: ["read", "create", "update", "close", "reopen"],
      active: true,
      createdAt: now,
      updatedAt: now
    };
    store.connectorAccounts.push(account);
  }

  const identity = `${product.id}\u0000gitlab\u0000${account.id}\u0000${projectId}`;
  let source = store.productSources.find(entity => sourceIdentity(entity) === identity);
  if (!source) {
    const now = new Date().toISOString();
    source = {
      id: stableId("product-source", product.id, account.id, projectId),
      productId: product.id,
      connectorAccountId: account.id,
      provider: "gitlab",
      externalContainerId: projectId,
      externalUrl: externalProjectUrl(externalIssue.sourceUrl),
      displayName: externalIssue.project || `GitLab project ${projectId}`,
      capabilities: [...account.capabilities],
      statusMapping: { opened: "todo", closed: "done" },
      priorityMapping: {},
      active: true,
      metadata: {},
      createdAt: now,
      updatedAt: now
    };
    store.productSources.push(source);
  } else {
    source.displayName = externalIssue.project || source.displayName;
    source.externalUrl ||= externalProjectUrl(externalIssue.sourceUrl);
    source.updatedAt = new Date().toISOString();
  }
  return source;
}

function applyExternalIssue(issue, externalIssue, meta, isNew) {
  issue.title = String(externalIssue.title || "Untitled issue");
  issue.description = String(externalIssue.description || "");
  issue.status = externalIssue.status || "todo";
  issue.priority = externalIssue.priority || "medium";
  issue.dueDate = externalIssue.due || null;
  issue.assigneeIdentity = meta.viewer ? { provider: "gitlab", username: meta.viewer, displayName: meta.viewerName || meta.viewer } : issue.assigneeIdentity;
  issue.labels = Array.isArray(externalIssue.labels) ? [...externalIssue.labels] : [];
  issue.version = isNew ? 1 : Number(issue.version || 0) + 1;
  issue.updatedAt = externalIssue.updated || new Date().toISOString();
  issue.metadata = { ...(issue.metadata || {}), displayId: externalIssue.id || issue.metadata?.displayId };
}

function applyExternalLink(link, externalIssue) {
  link.externalUrl = externalIssue.sourceUrl || link.externalUrl;
  link.externalVersion = externalIssue.updated || link.externalVersion;
  link.lastSyncedAt = new Date().toISOString();
  link.lastPayloadHash = hashPayload(externalIssue);
  link.syncState = "current";
  link.metadata = { ...(link.metadata || {}), ...externalLinkMetadata(externalIssue) };
}

function resolveProductSource(store, identity) {
  if (identity.productSourceId) return requireEntity(store.productSources, identity.productSourceId, "Product Source");
  const baseUrl = normalizeBaseUrl(identity.baseUrl || "https://gitlab.com");
  const accountIds = new Set(store.connectorAccounts.filter(account =>
    account.provider === identity.provider && account.baseUrl && normalizeBaseUrl(account.baseUrl) === baseUrl
  ).map(account => account.id));
  const source = store.productSources.find(item =>
    item.provider === identity.provider &&
    accountIds.has(item.connectorAccountId) &&
    String(item.externalContainerId) === String(identity.externalContainerId)
  );
  if (!source) throw new NeutralStoreError("The Product Source was not found.", 404);
  return source;
}

function legacyIntegration(source, link) {
  if (source.provider === "gitlab") {
    return {
      provider: "gitlab",
      projectId: Number(source.externalContainerId),
      issueIid: Number(link.externalIssueId)
    };
  }
  return { provider: source.provider, externalContainerId: source.externalContainerId, externalIssueId: link.externalIssueId };
}

function externalLinkMetadata(issue) {
  return {
    providerGlobalId: issue.sourceKey ? String(issue.sourceKey) : null,
    projectId: issue.integration?.projectId ?? null,
    issueIid: issue.integration?.issueIid ?? null
  };
}

function externalProjectUrl(issueUrl) {
  if (!issueUrl) return null;
  try {
    const url = new URL(issueUrl);
    const marker = "/-/issues/";
    if (url.pathname.includes(marker)) url.pathname = url.pathname.slice(0, url.pathname.indexOf(marker));
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  return `${url.origin}${url.pathname.replace(/\/+$/, "").replace(/\/api\/v4$/, "")}`;
}

function sourceIdentity(source) {
  return `${source.productId}\u0000${source.provider}\u0000${source.connectorAccountId}\u0000${source.externalContainerId}`;
}

function requireEntity(collection, id, label) {
  const entity = collection.find(item => item.id === id);
  if (!entity) throw new NeutralStoreError(`${label} ${id} was not found.`, 404);
  return entity;
}

function requiredString(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new NeutralStoreError(`${label} is required.`);
  return normalized;
}

function stableId(prefix, ...parts) {
  const digest = createHash("sha256").update(parts.map(String).join("\u0000")).digest("hex").slice(0, 20);
  return `${prefix}_${digest}`;
}

function managedId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function hashPayload(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function comparable(value) {
  return String(value || "").trim().toLocaleLowerCase("en");
}

function optionalString(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function optionalHttpUrl(value, label) {
  const normalized = optionalString(value);
  if (!normalized) return null;
  let parsed;
  try { parsed = new URL(normalized); }
  catch { throw new NeutralStoreError(`${label} must be a valid URL.`); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new NeutralStoreError(`${label} must use HTTP or HTTPS.`);
  return parsed.toString().replace(/\/$/, "");
}

function credentialReference(value) {
  const normalized = optionalString(value);
  if (!normalized) return null;
  if (!/^[A-Z][A-Z0-9_]*$/.test(normalized)) {
    throw new NeutralStoreError("Credential reference must be an environment-variable name such as GITLAB_TOKEN.");
  }
  return normalized;
}

function providerCredentialReferences(provider, input) {
  if (provider === "sheets") {
    return {
      clientId: credentialReference(input.clientIdReference || "GOOGLE_CLIENT_ID"),
      clientSecret: credentialReference(input.clientSecretReference || "GOOGLE_CLIENT_SECRET"),
      refreshToken: credentialReference(input.refreshTokenReference || "GOOGLE_REFRESH_TOKEN")
    };
  }
  const defaults = {
    gitlab: "GITLAB_TOKEN",
    github: "GITHUB_TOKEN",
    openproject: "OPENPROJECT_API_TOKEN"
  };
  const token = credentialReference(input.credentialReference || defaults[provider]);
  return token ? { token } : {};
}

function primaryCredentialReference(provider, references) {
  return provider === "sheets" ? references.clientId : references.token || null;
}

function productSourceMetadata(provider, input) {
  if (provider !== "sheets") return {};
  const sheetTab = String(input.sheetTab || "Tasks").trim();
  if (!sheetTab || sheetTab.length > 100 || /[\r\n\0]/.test(sheetTab)) {
    throw new NeutralStoreError("Google Sheet tab must be a valid tab name.");
  }
  const defaultRange = `${quoteSheetTab(sheetTab)}!A:Z`;
  const range = String(input.range || defaultRange).trim();
  if (!range || range.length > 250 || /[\r\n\0]/.test(range)) {
    throw new NeutralStoreError("Google Sheet range must use valid A1 notation.");
  }
  return { sheetTab, range };
}

function quoteSheetTab(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function normalizeProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (!["gitlab", "github", "openproject", "sheets", "excel"].includes(provider)) {
    throw new NeutralStoreError("Provider must be GitLab, GitHub, OpenProject, Google Sheets, or Excel.");
  }
  return provider;
}

function providerCapabilities(provider) {
  if (["sheets", "excel"].includes(provider)) return ["read", "create", "update"];
  return ["read", "create", "update", "close", "reopen"];
}

function slug(value) {
  return comparable(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function assertReference(ids, id, label) {
  if (!ids.has(id)) throw new NeutralStoreError(`${label} reference is invalid.`, 500);
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (!value) throw new NeutralStoreError(`${label} cannot be empty.`, 500);
    if (seen.has(value)) throw new NeutralStoreError(`${label} must be unique.`, 500);
    seen.add(value);
  }
}

function assertManagedNameAvailable(collection, name, parentField, parentId, excludingId, label) {
  const normalized = comparable(requiredString(name, `${label} name`));
  const duplicate = collection.some(entity =>
    entity.id !== excludingId &&
    (!parentField || entity[parentField] === parentId) &&
    comparable(entity.name) === normalized
  );
  if (duplicate) throw new NeutralStoreError(`${label} name is already in use in this scope.`, 409);
}

function assertConnectorIdentityAvailable(store, provider, baseUrl, credential, excludingId = null) {
  const duplicate = store.connectorAccounts.some(account =>
    account.id !== excludingId && account.provider === provider &&
    (account.baseUrl || null) === (baseUrl || null) &&
    (account.credentialReference || null) === (credential || null)
  );
  if (duplicate) throw new NeutralStoreError("A Connector Account with this provider, URL, and credential reference already exists.", 409);
}

function assertProductSourceIdentityAvailable(store, productId, connectorAccountId, externalContainerId, excludingId = null) {
  const duplicate = store.productSources.some(source =>
    source.id !== excludingId && source.productId === productId &&
    source.connectorAccountId === connectorAccountId &&
    String(source.externalContainerId) === String(externalContainerId)
  );
  if (duplicate) throw new NeutralStoreError("This external container is already configured for the Product.", 409);
}

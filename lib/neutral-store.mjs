import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { runCodexAppServer } from "./codex-app-server.mjs";

const collections = [
  "organizations",
  "projects",
  "products",
  "connectorAccounts",
  "productSources",
  "issues",
  "externalIssueLinks",
  "repositories",
  "harnessAccounts",
  "agentProfiles",
  "agentAssignments",
  "agentTasks",
  "conversations",
  "messages",
  "agentRuns"
];
const writeQueues = new Map();

export const SUPPORTED_AGENT_MODELS = Object.freeze([
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol", description: "Frontier capability for complex, open-ended work" },
  { id: "gpt-5.6-terra", label: "GPT-5.6 Terra", description: "Everyday balance of intelligence, speed, and cost" },
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna", description: "Efficient model for clear, repeatable work" },
  { id: "gpt-5.5", label: "GPT-5.5", description: "Previous flagship for coding and professional work" },
  { id: "gpt-5.5-pro", label: "GPT-5.5 Pro", description: "Higher-compute GPT-5.5 for difficult work" },
  { id: "gpt-5.4", label: "GPT-5.4", description: "Strong coding, reasoning, and tool use" },
  { id: "gpt-5.4-pro", label: "GPT-5.4 Pro", description: "Higher-compute GPT-5.4 for difficult work" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini", description: "Fast model for coding and focused subagent work" }
]);
const supportedAgentModelIds = new Set(SUPPORTED_AGENT_MODELS.map(model => model.id));

export class NeutralStoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "NeutralStoreError";
    this.status = status;
  }
}

export function listSupportedAgentModels() {
  return SUPPORTED_AGENT_MODELS.map(model => ({ ...model }));
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
    repositories: [],
    harnessAccounts: [],
    agentProfiles: [],
    agentAssignments: [],
    agentTasks: [],
    conversations: [],
    messages: [],
    agentRuns: [],
    syncMeta: {},
    createdAt: null,
    updatedAt: null
  };
}

export async function readNeutralStore(filePath) {
  if (isStoreAdapter(filePath)) {
    const store = normalizeStore(await filePath.readStore());
    validateNeutralStore(store);
    return store;
  }
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

  if (isStoreAdapter(filePath)) {
    await filePath.writeStore(payload);
    return payload;
  }

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
    } else if (type === "repository") {
      const project = requireEntity(store.projects, input.projectId, "Project");
      const productId = optionalString(input.productId);
      if (productId) {
        const product = requireEntity(store.products, productId, "Product");
        if (product.projectId !== project.id) throw new NeutralStoreError("Repository Product must belong to its Project.", 409);
      }
      assertRepositoryIdentityAvailable(store, project.id, input.name, input.localPath);
      entity = {
        id: managedId("repository"),
        projectId: project.id,
        productId,
        name: requiredString(input.name, "Repository name"),
        localPath: requiredString(input.localPath, "Repository local path"),
        resolvedPath: null,
        defaultBranch: optionalString(input.defaultBranch),
        accessMode: repositoryAccessMode(input.accessMode),
        verificationStatus: "unverified",
        verifiedAt: null,
        verificationError: null,
        gitMetadata: null,
        lastInspectedAt: null,
        active: input.active !== false,
        createdAt: now,
        updatedAt: now
      };
      store.repositories.push(entity);
    } else if (type === "harnessAccount") {
      assertNoHarnessApiConfiguration(input);
      const provider = harnessProvider(input.provider);
      const adapter = harnessAdapter(provider, input.adapter);
      const authMode = harnessAuthMode(provider, adapter, input.authMode);
      assertHarnessIdentityAvailable(store, provider, adapter, authMode);
      entity = {
        id: managedId("harness-account"),
        provider,
        adapter,
        displayName: requiredString(input.displayName, "Harness Account name"),
        authMode,
        credentialReferences: {},
        capabilities: harnessCapabilities(provider, adapter),
        active: input.active !== false,
        createdAt: now,
        updatedAt: now
      };
      store.harnessAccounts.push(entity);
    } else if (type === "agentProfile") {
      const harnessAccount = requireEntity(store.harnessAccounts, input.harnessAccountId, "Harness Account");
      if (!harnessAccount.active) throw new NeutralStoreError("Inactive Harness Account cannot be selected for new Agent Profiles.", 409);
      assertAgentProfileNameAvailable(store, input.name);
      entity = {
        id: managedId("agent-profile"),
        harnessAccountId: harnessAccount.id,
        name: requiredString(input.name, "Agent Profile name"),
        description: optionalString(input.description),
        traitDescription: optionalString(input.traitDescription),
        instructions: optionalString(input.instructions),
        model: agentModel(input.model),
        modelSettings: agentModelSettings(input.modelSettings),
        defaultToolPolicyId: optionalIdentifier(input.defaultToolPolicyId, "Default tool policy ID"),
        active: input.active !== false,
        createdAt: now,
        updatedAt: now
      };
      store.agentProfiles.push(entity);
    } else if (type === "agentAssignment") {
      const scope = agentAssignmentScope(store, input, { requireSelectable: true });
      assertAgentAssignmentIdentityAvailable(store, scope);
      entity = {
        id: managedId("agent-assignment"),
        agentProfileId: scope.agentProfile.id,
        projectId: scope.project.id,
        productId: scope.product?.id || null,
        repositoryId: scope.repository?.id || null,
        contextInstructions: optionalString(input.contextInstructions),
        active: input.active !== false,
        createdAt: now,
        updatedAt: now
      };
      store.agentAssignments.push(entity);
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
    } else if (type === "repository") {
      entity = requireEntity(store.repositories, id, "Repository");
      if (Object.hasOwn(input, "productId")) {
        const productId = optionalString(input.productId);
        if (productId) {
          const product = requireEntity(store.products, productId, "Product");
          if (product.projectId !== entity.projectId) throw new NeutralStoreError("Repository Product must belong to its Project.", 409);
        }
        entity.productId = productId;
      }
      const nextName = Object.hasOwn(input, "name") ? requiredString(input.name, "Repository name") : entity.name;
      const nextPath = Object.hasOwn(input, "localPath") ? requiredString(input.localPath, "Repository local path") : entity.localPath;
      assertRepositoryIdentityAvailable(store, entity.projectId, nextName, nextPath, entity.id);
      entity.name = nextName;
      if (nextPath !== entity.localPath) {
        entity.localPath = nextPath;
        resetRepositoryVerification(entity);
      }
      if (Object.hasOwn(input, "defaultBranch")) entity.defaultBranch = optionalString(input.defaultBranch);
      if (Object.hasOwn(input, "accessMode")) entity.accessMode = repositoryAccessMode(input.accessMode);
    } else if (type === "harnessAccount") {
      assertNoHarnessApiConfiguration(input);
      entity = requireEntity(store.harnessAccounts, id, "Harness Account");
      const provider = Object.hasOwn(input, "provider") ? harnessProvider(input.provider) : entity.provider;
      const adapter = Object.hasOwn(input, "adapter") ? harnessAdapter(provider, input.adapter) : entity.adapter;
      const authMode = Object.hasOwn(input, "authMode") ? harnessAuthMode(provider, adapter, input.authMode) : entity.authMode;
      assertHarnessIdentityAvailable(store, provider, adapter, authMode, entity.id);
      entity.provider = provider;
      entity.adapter = adapter;
      entity.authMode = authMode;
      entity.credentialReferences = {};
      entity.capabilities = harnessCapabilities(provider, adapter);
      if (Object.hasOwn(input, "displayName")) entity.displayName = requiredString(input.displayName, "Harness Account name");
    } else if (type === "agentProfile") {
      entity = requireEntity(store.agentProfiles, id, "Agent Profile");
      if (Object.hasOwn(input, "harnessAccountId")) {
        const harnessAccount = requireEntity(store.harnessAccounts, input.harnessAccountId, "Harness Account");
        if (harnessAccount.id !== entity.harnessAccountId && !harnessAccount.active) throw new NeutralStoreError("Inactive Harness Account cannot be selected for Agent Profiles.", 409);
        entity.harnessAccountId = harnessAccount.id;
      }
      if (Object.hasOwn(input, "name")) {
        assertAgentProfileNameAvailable(store, input.name, entity.id);
        entity.name = requiredString(input.name, "Agent Profile name");
      }
      if (Object.hasOwn(input, "description")) entity.description = optionalString(input.description);
      if (Object.hasOwn(input, "traitDescription")) entity.traitDescription = optionalString(input.traitDescription);
      if (Object.hasOwn(input, "instructions")) entity.instructions = optionalString(input.instructions);
      if (Object.hasOwn(input, "model") && input.model !== entity.model) entity.model = agentModel(input.model);
      if (Object.hasOwn(input, "modelSettings")) entity.modelSettings = agentModelSettings(input.modelSettings);
      if (Object.hasOwn(input, "defaultToolPolicyId")) entity.defaultToolPolicyId = optionalIdentifier(input.defaultToolPolicyId, "Default tool policy ID");
    } else if (type === "agentAssignment") {
      entity = requireEntity(store.agentAssignments, id, "Agent Assignment");
      const next = {
        agentProfileId: Object.hasOwn(input, "agentProfileId") ? input.agentProfileId : entity.agentProfileId,
        projectId: Object.hasOwn(input, "projectId") ? input.projectId : entity.projectId,
        productId: Object.hasOwn(input, "productId") ? input.productId : entity.productId,
        repositoryId: Object.hasOwn(input, "repositoryId") ? input.repositoryId : entity.repositoryId
      };
      const scopeChanged = Object.keys(next).some(key => next[key] !== entity[key]);
      const nextActive = Object.hasOwn(input, "active") ? Boolean(input.active) : entity.active;
      const scope = agentAssignmentScope(store, next, {
        requireSelectable: nextActive && (scopeChanged || entity.active === false)
      });
      assertAgentAssignmentIdentityAvailable(store, scope, entity.id);
      entity.agentProfileId = scope.agentProfile.id;
      entity.projectId = scope.project.id;
      entity.productId = scope.product?.id || null;
      entity.repositoryId = scope.repository?.id || null;
      if (Object.hasOwn(input, "contextInstructions")) entity.contextInstructions = optionalString(input.contextInstructions);
    } else {
      throw new NeutralStoreError(`Unsupported workspace entity type: ${type}.`, 404);
    }

    if (Object.hasOwn(input, "active")) entity.active = Boolean(input.active);
    entity.updatedAt = now;
    return entity;
  });
  return { entity: mutation.result, store: mutation.store };
}

export async function recordRepositoryVerification(filePath, id, result) {
  const mutation = await mutateStore(filePath, store => {
    const entity = requireEntity(store.repositories, id, "Repository");
    entity.verificationStatus = result.valid ? "verified" : "invalid";
    entity.resolvedPath = result.valid ? result.resolvedPath : null;
    entity.verifiedAt = result.valid ? new Date().toISOString() : null;
    entity.verificationError = result.valid ? null : requiredString(result.error, "Verification error");
    if (!result.valid) entity.gitMetadata = null;
    entity.updatedAt = new Date().toISOString();
    return entity;
  });
  return { entity: mutation.result, store: mutation.store };
}

export async function recordRepositoryInspection(filePath, id, gitMetadata) {
  const mutation = await mutateStore(filePath, store => {
    const entity = requireEntity(store.repositories, id, "Repository");
    if (entity.verificationStatus !== "verified" || !entity.resolvedPath) {
      throw new NeutralStoreError("Repository must be verified before Git inspection.", 409);
    }
    entity.gitMetadata = structuredClone(gitMetadata);
    entity.lastInspectedAt = new Date().toISOString();
    entity.updatedAt = entity.lastInspectedAt;
    return entity;
  });
  return { entity: mutation.result, store: mutation.store };
}

export function assertRepositorySelectable(store, id) {
  const repository = requireEntity(store.repositories, id, "Repository");
  if (!repository.active) throw new NeutralStoreError("Inactive Repository cannot be selected for new Agent work.", 409);
  if (repository.verificationStatus !== "verified") throw new NeutralStoreError("Repository must be verified before it can be selected for new Agent work.", 409);
  return repository;
}

export function listHarnessAccountViews(store, runtimeStatus = {}) {
  return store.harnessAccounts.map(account => ({
    ...structuredClone(account),
    configuration: harnessConfiguration(account, runtimeStatus)
  }));
}

export function assertHarnessAccountSelectable(store, id, runtimeStatus = {}) {
  const account = requireEntity(store.harnessAccounts, id, "Harness Account");
  if (!account.active) throw new NeutralStoreError("Inactive Harness Account cannot be selected for new Agent Profiles.", 409);
  const configuration = harnessConfiguration(account, runtimeStatus);
  if (configuration.status !== "ready") {
    throw new NeutralStoreError("The Codex CLI must be installed and signed in before this Harness Account can start work.", 409);
  }
  return account;
}

export function listAgentProfileViews(store, runtimeStatus = {}) {
  const harnessViews = new Map(listHarnessAccountViews(store, runtimeStatus).map(account => [account.id, account]));
  return store.agentProfiles.map(profile => {
    const harness = harnessViews.get(profile.harnessAccountId);
    return {
      ...structuredClone(profile),
      canStartWork: Boolean(profile.active && harness?.active && harness?.configuration.status === "ready"),
      harnessAccount: harness ? {
        id: harness.id,
        displayName: harness.displayName,
        provider: harness.provider,
        adapter: harness.adapter,
        active: harness.active,
        configuration: harness.configuration
      } : null
    };
  });
}

export function assertAgentProfileSelectable(store, id, runtimeStatus = {}) {
  const profile = requireEntity(store.agentProfiles, id, "Agent Profile");
  if (!profile.active) throw new NeutralStoreError("Inactive Agent Profile cannot start new work.", 409);
  assertHarnessAccountSelectable(store, profile.harnessAccountId, runtimeStatus);
  return profile;
}

export function listAgentAssignmentViews(store, runtimeStatus = {}) {
  return store.agentAssignments.map(assignment => {
    const scope = agentAssignmentScope(store, assignment);
    return {
      ...structuredClone(assignment),
      canStartWork: canSelectAgentAssignment(store, assignment.id, runtimeStatus),
      effectiveContext: {
        agentProfile: agentProfileContext(scope.agentProfile),
        project: managedContext(scope.project),
        product: scope.product ? managedContext(scope.product) : null,
        repository: scope.repository ? repositoryContext(scope.repository) : null,
        contextInstructions: assignment.contextInstructions
      }
    };
  });
}

export function assertAgentAssignmentSelectable(store, id, runtimeStatus = {}) {
  const assignment = requireEntity(store.agentAssignments, id, "Agent Assignment");
  if (!assignment.active) throw new NeutralStoreError("Inactive Agent Assignment cannot start new work.", 409);
  const scope = agentAssignmentScope(store, assignment);
  assertAgentProfileSelectable(store, scope.agentProfile.id, runtimeStatus);
  if (!scope.project.active) throw new NeutralStoreError("Inactive Project cannot be selected for new Agent work.", 409);
  if (scope.product && !scope.product.active) throw new NeutralStoreError("Inactive Product cannot be selected for new Agent work.", 409);
  if (scope.repository) assertRepositorySelectable(store, scope.repository.id);
  return assignment;
}

export async function createAgentTask(filePath, input = {}) {
  const mutation = await mutateStore(filePath, store => {
    const assignment = requireEntity(store.agentAssignments, input.agentAssignmentId, "Agent Assignment");
    if (!assignment.active) throw new NeutralStoreError("Inactive Agent Assignment cannot receive new Tasks.", 409);
    const scope = agentAssignmentScope(store, assignment, { requireSelectable: true });
    const issueId = optionalString(input.issueId);
    if (issueId) {
      if (!scope.product) throw new NeutralStoreError("Issue-backed Agent Tasks require a Product-scoped Assignment.", 409);
      const issue = requireEntity(store.issues, issueId, "Issue");
      if (issue.productId !== scope.product.id) throw new NeutralStoreError("Agent Task Issue must belong to the Assignment Product.", 409);
    }
    const now = new Date().toISOString();
    const task = {
      id: managedId("agent-task"),
      agentAssignmentId: assignment.id,
      projectId: scope.project.id,
      productId: scope.product?.id || null,
      repositoryId: scope.repository?.id || null,
      issueId: issueId || null,
      objective: requiredString(input.objective, "Agent Task objective"),
      status: agentTaskStatus(input.status || "draft"),
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };
    const conversation = {
      id: managedId("conversation"),
      agentTaskId: task.id,
      title: optionalString(input.conversationTitle),
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    store.agentTasks.push(task);
    store.conversations.push(conversation);
    return { task, conversation };
  });
  return { ...mutation.result, store: mutation.store };
}

export function listAgentTaskViews(store) {
  return [...store.agentTasks]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id))
    .map(task => agentTaskView(store, task));
}

export function getAgentTaskView(store, id) {
  return agentTaskView(store, requireEntity(store.agentTasks, id, "Agent Task"));
}

export async function appendConversationMessage(filePath, agentTaskId, input = {}) {
  const mutation = await mutateStore(filePath, store => {
    requireEntity(store.agentTasks, agentTaskId, "Agent Task");
    const conversation = store.conversations.find(item => item.agentTaskId === agentTaskId);
    if (!conversation) throw new NeutralStoreError("Agent Task has no Conversation.", 500);
    if (conversation.status !== "active") throw new NeutralStoreError("Archived Conversations cannot receive Messages.", 409);
    const message = appendVisibleMessage(store, conversation, input);
    const task = requireEntity(store.agentTasks, agentTaskId, "Agent Task");
    task.updatedAt = message.createdAt;
    return message;
  });
  return { message: mutation.result, store: mutation.store };
}

export async function executeAgentTaskTurn(filePath, agentTaskId, input = {}, options = {}) {
  const prepared = await mutateStore(filePath, store => {
    const task = requireEntity(store.agentTasks, agentTaskId, "Agent Task");
    const assignment = assertAgentAssignmentSelectable(store, task.agentAssignmentId, options.runtimeStatus);
    if (store.agentRuns.some(run => run.agentTaskId === task.id && ["queued", "running"].includes(run.status))) {
      throw new NeutralStoreError("Agent Task already has an active Run.", 409);
    }
    const conversation = store.conversations.find(item => item.agentTaskId === task.id);
    if (!conversation || conversation.status !== "active") throw new NeutralStoreError("Agent Task requires an active Conversation.", 409);
    if (input.message != null) appendVisibleMessage(store, conversation, { role: "user", content: boundedTurnText(input.message), metadata: {} });
    const profile = requireEntity(store.agentProfiles, assignment.agentProfileId, "Agent Profile");
    const harness = requireEntity(store.harnessAccounts, profile.harnessAccountId, "Harness Account");
    const project = requireEntity(store.projects, assignment.projectId, "Project");
    const product = assignment.productId ? requireEntity(store.products, assignment.productId, "Product") : null;
    const repository = assignment.repositoryId ? requireEntity(store.repositories, assignment.repositoryId, "Repository") : null;
    const previous = [...store.agentRuns].reverse().find(run => run.agentTaskId === task.id && run.status === "completed" && run.providerMetadata?.threadId);
    const now = new Date().toISOString();
    const run = {
      id: managedId("agent-run"),
      agentTaskId: task.id,
      conversationId: conversation.id,
      agentProfileSnapshot: agentProfileContext(profile),
      assignmentSnapshot: {
        id: assignment.id,
        project: managedContext(project),
        product: product ? managedContext(product) : null,
        repository: repository ? repositoryContext(repository) : null,
        contextInstructions: assignment.contextInstructions
      },
      harnessProvider: harness.provider,
      harnessAdapter: harness.adapter,
      model: profile.model,
      status: "running",
      startedAt: now,
      completedAt: null,
      usage: null,
      providerMetadata: {},
      errorSummary: null,
      createdAt: now,
      updatedAt: now
    };
    store.agentRuns.push(run);
    task.status = "running";
    task.updatedAt = now;
    return {
      run: structuredClone(run),
      runId: run.id,
      prompt: buildAgentTurnPrompt(store, task, conversation, profile, assignment, project, product, repository),
      model: profile.model,
      resumeSessionId: previous?.providerMetadata?.threadId || null,
      cwd: repository?.resolvedPath || options.cwd,
      repository: repository ? { id: repository.id } : null
    };
  });

  options.onRunStarted?.(prepared.result.run);

  let outcome;
  try {
    const repositoryTools = prepared.result.repository && options.repositoryToolRuntime ? {
      ...options.repositoryToolRuntime,
      repositoryId: prepared.result.repository.id,
      runId: prepared.result.runId,
      auditPath: join(options.repositoryToolRuntime.auditDirectory, `${prepared.result.runId}.jsonl`)
    } : null;
    outcome = await (options.executor || runCodexAppServer)({
      executable: options.executable || "codex",
      prompt: prepared.result.prompt,
      model: prepared.result.model,
      resumeSessionId: prepared.result.resumeSessionId,
      cwd: prepared.result.cwd,
      timeoutMs: options.timeoutMs || 60_000,
      signal: options.signal,
      onEvent: options.onEvent,
      onTrace: options.onTrace,
      repositoryTools
    });
  } catch {
    outcome = { status: "failed", finalMessage: null, usage: null, threadId: null, toolEventTypes: [], errorCode: "adapter_failure" };
  }

  const completed = await mutateStore(filePath, store => {
    const run = requireEntity(store.agentRuns, prepared.result.runId, "Agent Run");
    const task = requireEntity(store.agentTasks, run.agentTaskId, "Agent Task");
    const conversation = requireEntity(store.conversations, run.conversationId, "Conversation");
    const unexpectedToolTypes = Array.isArray(outcome.unexpectedToolEventTypes)
      ? outcome.unexpectedToolEventTypes
      : (outcome.toolEventTypes || []).filter(type => type !== "mcp_tool_call" || !prepared.result.repository);
    const unexpectedTools = unexpectedToolTypes.length > 0;
    const succeeded = outcome.status === "completed" && !unexpectedTools && Boolean(outcome.finalMessage);
    const now = new Date().toISOString();
    run.status = succeeded ? "completed" : outcome.status === "cancelled" ? "cancelled" : "failed";
    run.completedAt = now;
    run.updatedAt = now;
    run.usage = sanitizeRunUsage(outcome.usage);
    run.providerMetadata = outcome.threadId ? { threadId: String(outcome.threadId) } : {};
    run.toolActivity = Array.isArray(outcome.toolActivity) ? outcome.toolActivity.slice(0, 128) : [];
    run.errorSummary = succeeded ? null : unexpectedTools ? "unexpected_tool_activity" : String(outcome.errorCode || outcome.status || "codex_exec_failed").slice(0, 120);
    let assistantMessage = null;
    if (succeeded) assistantMessage = appendVisibleMessage(store, conversation, { role: "assistant", content: boundedTurnText(outcome.finalMessage), metadata: { agentRunId: run.id } });
    task.status = succeeded ? "completed" : run.status === "cancelled" ? "cancelled" : "failed";
    task.completedAt = succeeded ? now : null;
    task.updatedAt = now;
    return { run: structuredClone(run), assistantMessage };
  });
  return { ...completed.result, store: completed.store };
}

export function listAgentRuns(store, agentTaskId) {
  requireEntity(store.agentTasks, agentTaskId, "Agent Task");
  return structuredClone(store.agentRuns.filter(run => run.agentTaskId === agentTaskId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)));
}

export function listConversationMessages(store, agentTaskId, options = {}) {
  const task = requireEntity(store.agentTasks, agentTaskId, "Agent Task");
  const conversation = store.conversations.find(item => item.agentTaskId === task.id);
  if (!conversation) throw new NeutralStoreError("Agent Task has no Conversation.", 500);
  const cursor = paginationInteger(options.cursor, "Message cursor", 0, 0, Number.MAX_SAFE_INTEGER);
  const limit = paginationInteger(options.limit, "Message limit", 50, 1, 100);
  const remaining = store.messages
    .filter(message => message.conversationId === conversation.id && message.sequence > cursor)
    .sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
  const messages = remaining.slice(0, limit);
  const hasMore = remaining.length > messages.length;
  return {
    conversation: structuredClone(conversation),
    messages: structuredClone(messages),
    pageInfo: { hasMore, nextCursor: hasMore ? String(messages.at(-1).sequence) : null }
  };
}

function agentTaskView(store, task) {
  const conversation = store.conversations.find(item => item.agentTaskId === task.id);
  return {
    ...structuredClone(task),
    conversation: conversation ? structuredClone(conversation) : null,
    messageCount: conversation ? store.messages.filter(message => message.conversationId === conversation.id).length : 0
  };
}

function appendVisibleMessage(store, conversation, input) {
  const sequence = store.messages.filter(message => message.conversationId === conversation.id)
    .reduce((maximum, message) => Math.max(maximum, message.sequence), 0) + 1;
  const now = new Date().toISOString();
  const message = {
    id: managedId("message"),
    conversationId: conversation.id,
    role: conversationMessageRole(input.role),
    content: requiredString(input.content, "Message content"),
    sequence,
    createdAt: now,
    metadata: conversationMessageMetadata(input.metadata)
  };
  store.messages.push(message);
  conversation.updatedAt = now;
  return message;
}

function buildAgentTurnPrompt(store, task, conversation, profile, assignment, project, product, repository) {
  const messages = store.messages.filter(message => message.conversationId === conversation.id)
    .sort((left, right) => left.sequence - right.sequence).slice(-12)
    .map(message => `${message.role}: ${message.content}`).join("\n");
  return boundedTurnText([
    repository
      ? "This is a constrained read-only Repository turn. Use only the ahive_repository MCP tools when code inspection is needed. Never use commands, shell, file changes, web search, other MCP servers, or external systems. Do not request or expose secrets."
      : "This is a chat-only turn. Do not use commands, filesystem tools, MCP tools, web search, or external systems.",
    `Agent: ${profile.name}`,
    profile.description ? `Purpose: ${profile.description}` : "",
    profile.traitDescription ? `Traits: ${profile.traitDescription}` : "",
    profile.instructions ? `Instructions: ${profile.instructions}` : "",
    `Objective: ${task.objective}`,
    `Project: ${project.name}`,
    product ? `Product: ${product.name}` : "",
    repository ? `Repository: ${repository.name}. Available read-only tools: list_files, search_text, read_text, git_summary.` : "",
    assignment.contextInstructions ? `Project context: ${assignment.contextInstructions}` : "",
    "Visible conversation:",
    messages || "No prior messages.",
    "Respond only with the visible assistant reply."
  ].filter(Boolean).join("\n"), 18_000);
}

function boundedTurnText(value, maximum = 8_000) {
  const text = requiredString(value, "Agent turn text");
  if (text.length > maximum) throw new NeutralStoreError(`Agent turn text cannot exceed ${maximum} characters.`, 413);
  return text;
}

function sanitizeRunUsage(value) {
  if (!value || typeof value !== "object") return null;
  const result = {};
  for (const key of ["input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens"]) {
    if (Number.isFinite(value[key]) && value[key] >= 0) result[key] = Number(value[key]);
  }
  return result;
}

export async function removeHarnessAccount(filePath, id) {
  const mutation = await mutateStore(filePath, store => {
    const account = requireEntity(store.harnessAccounts, id, "Harness Account");
    if ((store.agentProfiles || []).some(profile => profile.harnessAccountId === account.id)) {
      throw new NeutralStoreError("Harness Accounts used by Agent Profiles must be deactivated instead of removed.", 409);
    }
    store.harnessAccounts = store.harnessAccounts.filter(item => item.id !== account.id);
    return account;
  });
  return { entity: mutation.result, store: mutation.store };
}

export async function removeAgentProfile(filePath, id) {
  const mutation = await mutateStore(filePath, store => {
    const profile = requireEntity(store.agentProfiles, id, "Agent Profile");
    if ((store.agentAssignments || []).some(assignment => assignment.agentProfileId === profile.id)) {
      throw new NeutralStoreError("Agent Profiles used by Assignments must be deactivated instead of removed.", 409);
    }
    store.agentProfiles = store.agentProfiles.filter(item => item.id !== profile.id);
    return profile;
  });
  return { entity: mutation.result, store: mutation.store };
}

export async function removeAgentAssignment(filePath, id) {
  const mutation = await mutateStore(filePath, store => {
    const assignment = requireEntity(store.agentAssignments, id, "Agent Assignment");
    if ((store.agentTasks || []).some(task => task.agentAssignmentId === assignment.id)) {
      throw new NeutralStoreError("Agent Assignments used by Agent Tasks must be deactivated instead of removed.", 409);
    }
    store.agentAssignments = store.agentAssignments.filter(item => item.id !== assignment.id);
    return assignment;
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
  const harnessAccountIds = new Set(store.harnessAccounts.map(entity => entity.id));
  const agentProfileIds = new Set(store.agentProfiles.map(entity => entity.id));
  const assignmentById = new Map(store.agentAssignments.map(entity => [entity.id, entity]));
  const taskById = new Map(store.agentTasks.map(entity => [entity.id, entity]));
  const conversationById = new Map(store.conversations.map(entity => [entity.id, entity]));
  const repositoryById = new Map(store.repositories.map(entity => [entity.id, entity]));
  const sourceById = new Map(store.productSources.map(entity => [entity.id, entity]));
  const issueById = new Map(store.issues.map(entity => [entity.id, entity]));

  for (const project of store.projects) assertReference(organizationIds, project.organizationId, `Project ${project.id} organization`);
  for (const product of store.products) assertReference(projectIds, product.projectId, `Product ${product.id} project`);
  for (const repository of store.repositories) {
    assertReference(projectIds, repository.projectId, `Repository ${repository.id} project`);
    if (repository.productId) {
      assertReference(productIds, repository.productId, `Repository ${repository.id} product`);
      const product = store.products.find(entity => entity.id === repository.productId);
      if (product.projectId !== repository.projectId) throw new NeutralStoreError(`Repository ${repository.id} Product belongs to another Project.`, 500);
    }
    if (!["read_only", "guarded_write"].includes(repository.accessMode)) throw new NeutralStoreError(`Repository ${repository.id} has an invalid access mode.`, 500);
    if (!["unverified", "verified", "invalid"].includes(repository.verificationStatus)) throw new NeutralStoreError(`Repository ${repository.id} has an invalid verification status.`, 500);
    if (repository.verificationStatus === "verified" && !repository.resolvedPath) throw new NeutralStoreError(`Repository ${repository.id} is verified without a resolved path.`, 500);
  }
  for (const account of store.harnessAccounts) {
    if (harnessProvider(account.provider) !== account.provider) throw new NeutralStoreError(`Harness Account ${account.id} has an invalid provider.`, 500);
    if (harnessAdapter(account.provider, account.adapter) !== account.adapter) throw new NeutralStoreError(`Harness Account ${account.id} has an invalid adapter.`, 500);
    if (harnessAuthMode(account.provider, account.adapter, account.authMode) !== account.authMode) throw new NeutralStoreError(`Harness Account ${account.id} has an invalid authentication mode.`, 500);
    if (Object.keys(account.credentialReferences || {}).length) throw new NeutralStoreError(`Harness Account ${account.id} must not persist Codex CLI credentials.`, 500);
    if (!Array.isArray(account.capabilities)) throw new NeutralStoreError(`Harness Account ${account.id} capabilities must be an array.`, 500);
  }
  for (const profile of store.agentProfiles) {
    assertReference(harnessAccountIds, profile.harnessAccountId, `Agent Profile ${profile.id} Harness Account`);
    agentModelIdentifier(profile.model);
    agentModelSettings(profile.modelSettings);
    optionalIdentifier(profile.defaultToolPolicyId, "Default tool policy ID");
  }
  for (const assignment of store.agentAssignments) {
    assertReference(agentProfileIds, assignment.agentProfileId, `Agent Assignment ${assignment.id} profile`);
    assertReference(projectIds, assignment.projectId, `Agent Assignment ${assignment.id} project`);
    if (assignment.productId) {
      assertReference(productIds, assignment.productId, `Agent Assignment ${assignment.id} product`);
      const product = store.products.find(entity => entity.id === assignment.productId);
      if (product.projectId !== assignment.projectId) throw new NeutralStoreError(`Agent Assignment ${assignment.id} Product belongs to another Project.`, 500);
    }
    if (assignment.repositoryId) {
      const repository = repositoryById.get(assignment.repositoryId);
      if (!repository) throw new NeutralStoreError(`Agent Assignment ${assignment.id} Repository reference is invalid.`, 500);
      if (repository.projectId !== assignment.projectId) throw new NeutralStoreError(`Agent Assignment ${assignment.id} Repository belongs to another Project.`, 500);
      if (assignment.productId && repository.productId && repository.productId !== assignment.productId) {
        throw new NeutralStoreError(`Agent Assignment ${assignment.id} Repository belongs to another Product.`, 500);
      }
    }
  }
  for (const task of store.agentTasks) {
    const assignment = assignmentById.get(task.agentAssignmentId);
    if (!assignment) throw new NeutralStoreError(`Agent Task ${task.id} Assignment reference is invalid.`, 500);
    if (task.projectId !== assignment.projectId || task.productId !== (assignment.productId || null) || task.repositoryId !== (assignment.repositoryId || null)) {
      throw new NeutralStoreError(`Agent Task ${task.id} captured context does not match its Assignment.`, 500);
    }
    if (task.issueId) {
      const issue = issueById.get(task.issueId);
      if (!issue || !task.productId || issue.productId !== task.productId) throw new NeutralStoreError(`Agent Task ${task.id} Issue is outside its Product scope.`, 500);
    }
    agentTaskStatus(task.status);
    requiredString(task.objective, `Agent Task ${task.id} objective`);
  }
  for (const conversation of store.conversations) {
    if (!taskById.has(conversation.agentTaskId)) throw new NeutralStoreError(`Conversation ${conversation.id} Agent Task reference is invalid.`, 500);
    if (!["active", "archived"].includes(conversation.status)) throw new NeutralStoreError(`Conversation ${conversation.id} has an invalid status.`, 500);
  }
  for (const message of store.messages) {
    if (!conversationById.has(message.conversationId)) throw new NeutralStoreError(`Message ${message.id} Conversation reference is invalid.`, 500);
    conversationMessageRole(message.role);
    requiredString(message.content, `Message ${message.id} content`);
    paginationInteger(message.sequence, `Message ${message.id} sequence`, null, 1, Number.MAX_SAFE_INTEGER);
    conversationMessageMetadata(message.metadata);
  }
  for (const run of store.agentRuns) {
    const task = taskById.get(run.agentTaskId);
    const conversation = conversationById.get(run.conversationId);
    if (!task) throw new NeutralStoreError(`Agent Run ${run.id} Agent Task reference is invalid.`, 500);
    if (!conversation || conversation.agentTaskId !== task.id) throw new NeutralStoreError(`Agent Run ${run.id} Conversation is invalid.`, 500);
    if (!["queued", "running", "completed", "failed", "cancelled", "interrupted"].includes(run.status)) throw new NeutralStoreError(`Agent Run ${run.id} has an invalid status.`, 500);
    if (!isPlainObject(run.agentProfileSnapshot) || !isPlainObject(run.assignmentSnapshot)) throw new NeutralStoreError(`Agent Run ${run.id} snapshots are invalid.`, 500);
    sanitizeRunUsage(run.usage);
  }
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
  assertUnique(store.harnessAccounts.map(harnessIdentity), "Harness Account connection identity");
  assertUnique(store.agentProfiles.map(entity => comparable(entity.name)), "Agent Profile name");
  assertUnique(store.agentAssignments.map(agentAssignmentIdentity), "Agent Assignment scope");
  assertUnique(store.conversations.map(entity => entity.agentTaskId), "Conversation Agent Task");
  assertUnique(store.messages.map(entity => `${entity.conversationId}\u0000${entity.sequence}`), "Message sequence");

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

function isStoreAdapter(target) {
  return target && typeof target === "object" &&
    typeof target.readStore === "function" && typeof target.writeStore === "function";
}

async function mutateStore(filePath, mutator) {
  const queueKey = isStoreAdapter(filePath) ? filePath.key : filePath;
  const previous = writeQueues.get(queueKey) || Promise.resolve();
  const task = previous.catch(() => undefined).then(async () => {
    const store = await readNeutralStore(filePath);
    const result = await mutator(store);
    const persisted = await writeNeutralStore(filePath, store);
    return { result, store: persisted };
  });
  writeQueues.set(queueKey, task);
  try {
    return await task;
  } finally {
    if (writeQueues.get(queueKey) === task) writeQueues.delete(queueKey);
  }
}

function ensureWorkspace(store, input) {
  const organizationName = String(input.organizationName || "Zing Developers").trim();
  const projectName = String(input.projectName || "IRN").trim();
  const productName = String(input.productName || "IRN").trim();
  const now = new Date().toISOString();

  const organizationId = stableId("organization", organizationName);
  let organization = store.organizations.find(entity =>
    entity.id === organizationId || comparable(entity.name) === comparable(organizationName)
  );
  if (!organization) {
    organization = { id: organizationId, name: organizationName, type: "employer", active: true, createdAt: now, updatedAt: now };
    store.organizations.push(organization);
  }

  const projectId = stableId("project", organization.id, projectName);
  let project = store.projects.find(entity => entity.organizationId === organization.id && (
    entity.id === projectId || comparable(entity.name) === comparable(projectName)
  ));
  if (!project) {
    project = { id: projectId, organizationId: organization.id, name: projectName, key: slug(projectName), description: null, active: true, createdAt: now, updatedAt: now };
    store.projects.push(project);
  }

  const productId = stableId("product", project.id, productName);
  let product = store.products.find(entity => entity.projectId === project.id && (
    entity.id === productId || comparable(entity.name) === comparable(productName)
  ));
  if (!product) {
    product = { id: productId, projectId: project.id, name: productName, key: slug(productName), description: null, active: true, createdAt: now, updatedAt: now };
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

function harnessProvider(value) {
  const provider = String(value || "openai").trim().toLowerCase();
  if (provider !== "openai") throw new NeutralStoreError("Harness provider must currently be openai.");
  return provider;
}

function assertNoHarnessApiConfiguration(input) {
  const forbidden = ["apiKey", "apiKeyReference", "baseUrl"].find(key => Object.hasOwn(input, key));
  if (forbidden) throw new NeutralStoreError("The Codex CLI harness does not accept REST API credentials or a base URL; use `codex login`.");
}

function harnessAdapter(provider, value) {
  const adapter = String(value || (provider === "openai" ? "codex-cli" : "")).trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(adapter)) throw new NeutralStoreError("Harness adapter must be a lowercase identifier.");
  const allowed = { openai: ["codex-cli"] };
  if (!allowed[provider]?.includes(adapter)) throw new NeutralStoreError(`Harness adapter ${adapter} is not supported for ${provider}.`);
  return adapter;
}

function harnessAuthMode(provider, adapter, value) {
  const authMode = String(value || "codex_session").trim().toLowerCase();
  if (provider !== "openai" || adapter !== "codex-cli" || authMode !== "codex_session") {
    throw new NeutralStoreError("The OpenAI Codex CLI harness must use the cached Codex session.");
  }
  return authMode;
}

function harnessCapabilities(provider, adapter) {
  if (provider === "openai" && adapter === "codex-cli") return ["codex_exec", "jsonl_events", "session_resume"];
  return [];
}

function harnessConfiguration(account, runtimeStatus) {
  const status = ["ready", "cli_unavailable", "authentication_required"].includes(runtimeStatus.status)
    ? runtimeStatus.status
    : "cli_unavailable";
  return {
    status,
    installed: runtimeStatus.installed === true,
    authenticated: runtimeStatus.authenticated === true,
    version: optionalString(runtimeStatus.version)
  };
}

function harnessIdentity(accountOrProvider, adapter, authMode) {
  const account = typeof accountOrProvider === "object" ? accountOrProvider : {
    provider: accountOrProvider,
    adapter,
    authMode
  };
  return `${account.provider}\u0000${account.adapter}\u0000${account.authMode}`;
}

function assertHarnessIdentityAvailable(store, provider, adapter, authMode, excludingId = null) {
  const identity = harnessIdentity(provider, adapter, authMode);
  const duplicate = store.harnessAccounts.some(account => account.id !== excludingId && harnessIdentity(account) === identity);
  if (duplicate) throw new NeutralStoreError("A Harness Account with this provider, adapter, and authentication mode already exists.", 409);
}

function assertAgentProfileNameAvailable(store, name, excludingId = null) {
  const normalized = comparable(requiredString(name, "Agent Profile name"));
  if (store.agentProfiles.some(profile => profile.id !== excludingId && comparable(profile.name) === normalized)) {
    throw new NeutralStoreError("Agent Profile name must be unique.", 409);
  }
}

function agentModel(value) {
  const model = agentModelIdentifier(value);
  if (!supportedAgentModelIds.has(model)) throw new NeutralStoreError("Agent Profile model must be selected from the supported OpenAI model catalog.");
  return model;
}

function agentModelIdentifier(value) {
  const model = requiredString(value, "Agent Profile model");
  if (model.length > 120 || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(model)) throw new NeutralStoreError("Agent Profile model must be a valid Codex model identifier.");
  return model;
}

function agentModelSettings(value) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) throw new NeutralStoreError("Agent Profile model settings must be an object.");
  const allowed = new Set(["reasoningEffort", "verbosity", "serviceTier"]);
  const unknown = Object.keys(value).filter(key => !allowed.has(key));
  if (unknown.length) throw new NeutralStoreError(`Unsupported Agent Profile model setting: ${unknown[0]}.`);
  const settings = {};
  if (Object.hasOwn(value, "reasoningEffort")) {
    const effort = String(value.reasoningEffort || "").trim().toLowerCase();
    if (!["minimal", "low", "medium", "high", "xhigh", "ultra"].includes(effort)) {
      throw new NeutralStoreError("Model reasoning effort must be minimal, low, medium, high, xhigh, or ultra.");
    }
    settings.reasoningEffort = effort;
  }
  if (Object.hasOwn(value, "verbosity")) {
    const verbosity = String(value.verbosity || "").trim().toLowerCase();
    if (!["low", "medium", "high"].includes(verbosity)) throw new NeutralStoreError("Model verbosity must be low, medium, or high.");
    settings.verbosity = verbosity;
  }
  if (Object.hasOwn(value, "serviceTier")) {
    const serviceTier = optionalIdentifier(value.serviceTier, "Model service tier");
    if (!serviceTier) throw new NeutralStoreError("Model service tier cannot be empty.");
    settings.serviceTier = serviceTier;
  }
  return settings;
}

function optionalIdentifier(value, label) {
  const normalized = optionalString(value);
  if (!normalized) return null;
  if (normalized.length > 120 || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(normalized)) {
    throw new NeutralStoreError(`${label} must be a valid identifier.`);
  }
  return normalized;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function agentAssignmentScope(store, input, options = {}) {
  const agentProfile = requireEntity(store.agentProfiles, requiredString(input.agentProfileId, "Agent Profile ID"), "Agent Profile");
  const project = requireEntity(store.projects, requiredString(input.projectId, "Project ID"), "Project");
  const productId = optionalString(input.productId);
  const repositoryId = optionalString(input.repositoryId);
  const product = productId ? requireEntity(store.products, productId, "Product") : null;
  const repository = repositoryId ? requireEntity(store.repositories, repositoryId, "Repository") : null;

  if (product && product.projectId !== project.id) throw new NeutralStoreError("Agent Assignment Product must belong to its Project.", 409);
  if (repository && repository.projectId !== project.id) throw new NeutralStoreError("Agent Assignment Repository must belong to its Project.", 409);
  if (product && repository?.productId && repository.productId !== product.id) {
    throw new NeutralStoreError("Agent Assignment Repository must belong to its selected Product.", 409);
  }

  if (options.requireSelectable) {
    if (!agentProfile.active) throw new NeutralStoreError("Inactive Agent Profile cannot be selected for new Assignments.", 409);
    const harness = requireEntity(store.harnessAccounts, agentProfile.harnessAccountId, "Harness Account");
    if (!harness.active) throw new NeutralStoreError("Agent Profile with an inactive Harness Account cannot be selected for new Assignments.", 409);
    if (!project.active) throw new NeutralStoreError("Inactive Project cannot be selected for new Agent Assignments.", 409);
    if (product && !product.active) throw new NeutralStoreError("Inactive Product cannot be selected for new Agent Assignments.", 409);
    if (repository) {
      if (!repository.active) throw new NeutralStoreError("Inactive Repository cannot be selected for new Agent Assignments.", 409);
      if (repository.verificationStatus !== "verified") throw new NeutralStoreError("Repository must be verified before it can be selected for new Agent Assignments.", 409);
    }
  }
  return { agentProfile, project, product, repository };
}

function agentAssignmentIdentity(assignmentOrScope) {
  const value = assignmentOrScope.agentProfile
    ? {
        agentProfileId: assignmentOrScope.agentProfile.id,
        projectId: assignmentOrScope.project.id,
        productId: assignmentOrScope.product?.id,
        repositoryId: assignmentOrScope.repository?.id
      }
    : assignmentOrScope;
  return `${value.agentProfileId}\u0000${value.projectId}\u0000${value.productId || ""}\u0000${value.repositoryId || ""}`;
}

function agentTaskStatus(value) {
  const status = requiredString(value, "Agent Task status");
  if (!["draft", "planning", "waiting_approval", "running", "completed", "failed", "cancelled"].includes(status)) {
    throw new NeutralStoreError("Agent Task status is not supported.");
  }
  return status;
}

function conversationMessageRole(value) {
  const role = requiredString(value, "Message role");
  if (!["user", "assistant", "tool_summary", "system_notice"].includes(role)) {
    throw new NeutralStoreError("Message role is not supported.");
  }
  return role;
}

function conversationMessageMetadata(value) {
  if (value == null) return {};
  if (!isPlainObject(value)) throw new NeutralStoreError("Message metadata must be an object.");
  const forbidden = ["reasoning", "hiddenReasoning", "chainOfThought"].find(key => Object.hasOwn(value, key));
  if (forbidden) throw new NeutralStoreError("Message metadata cannot contain hidden reasoning.");
  return structuredClone(value);
}

function paginationInteger(value, label, fallback, minimum, maximum) {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new NeutralStoreError(`${label} must be an integer between ${minimum} and ${maximum}.`);
  }
  return number;
}

function assertAgentAssignmentIdentityAvailable(store, scope, excludingId = null) {
  const identity = agentAssignmentIdentity(scope);
  if (store.agentAssignments.some(assignment => assignment.id !== excludingId && agentAssignmentIdentity(assignment) === identity)) {
    throw new NeutralStoreError("An Agent Assignment already exists for this Profile and scope.", 409);
  }
}

function canSelectAgentAssignment(store, id, runtimeStatus) {
  try {
    assertAgentAssignmentSelectable(store, id, runtimeStatus);
    return true;
  } catch (error) {
    if (error instanceof NeutralStoreError) return false;
    throw error;
  }
}

function agentProfileContext(profile) {
  return {
    id: profile.id,
    name: profile.name,
    description: profile.description,
    traitDescription: profile.traitDescription,
    instructions: profile.instructions,
    model: profile.model,
    modelSettings: structuredClone(profile.modelSettings),
    defaultToolPolicyId: profile.defaultToolPolicyId
  };
}

function managedContext(entity) {
  return { id: entity.id, name: entity.name, key: entity.key || null };
}

function repositoryContext(repository) {
  return {
    id: repository.id,
    name: repository.name,
    productId: repository.productId,
    accessMode: repository.accessMode,
    verificationStatus: repository.verificationStatus
  };
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

function assertRepositoryIdentityAvailable(store, projectId, name, localPath, excludingId = null) {
  const normalizedName = comparable(requiredString(name, "Repository name"));
  const normalizedPath = comparable(requiredString(localPath, "Repository local path").replace(/[\\/]+$/, ""));
  const duplicate = store.repositories.some(repository => repository.id !== excludingId && repository.projectId === projectId && (
    comparable(repository.name) === normalizedName || comparable(String(repository.localPath || "").replace(/[\\/]+$/, "")) === normalizedPath
  ));
  if (duplicate) throw new NeutralStoreError("Repository name or local path is already registered for this Project.", 409);
}

function repositoryAccessMode(value) {
  const mode = String(value || "read_only").trim().toLowerCase();
  if (!["read_only", "guarded_write"].includes(mode)) throw new NeutralStoreError("Repository access mode must be read_only or guarded_write.");
  return mode;
}

function resetRepositoryVerification(repository) {
  repository.resolvedPath = null;
  repository.verificationStatus = "unverified";
  repository.verifiedAt = null;
  repository.verificationError = null;
  repository.gitMetadata = null;
  repository.lastInspectedAt = null;
}

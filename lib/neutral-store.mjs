import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";
import { runCodexAppServer } from "./codex-app-server.mjs";
import { runOpenCodeReadOnlyTurn } from "./opencode-run.mjs";

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
  "agentRuns",
  "approvalRequests",
  "issueWritebacks",
  "managedWorktrees",
  "fileChangeEvents",
  "runArtifacts"
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
export const SUPPORTED_OPENCODE_AGENT_MODELS = Object.freeze([
  { id: "opencode/big-pickle", label: "Big Pickle", description: "General model through OpenCode" },
  { id: "opencode/claude-fable-5", label: "Claude Fable 5", description: "General reasoning through OpenCode" },
  { id: "opencode/claude-haiku-4-5", label: "Claude Haiku 4.5", description: "Fast model through OpenCode" },
  { id: "opencode/claude-opus-4-8", label: "Claude Opus 4.8", description: "Higher-capability reasoning through OpenCode" },
  { id: "opencode/claude-sonnet-4-6", label: "Claude Sonnet 4.6", description: "Balanced coding and reasoning through OpenCode" },
  { id: "opencode/claude-sonnet-5", label: "Claude Sonnet 5", description: "Balanced coding and reasoning through OpenCode" },
  { id: "opencode/deepseek-v4-flash", label: "DeepSeek V4 Flash", description: "Fast coding model through OpenCode" },
  { id: "opencode/deepseek-v4-pro", label: "DeepSeek V4 Pro", description: "Reasoning and coding through OpenCode" },
  { id: "opencode/gemini-3-flash", label: "Gemini 3 Flash", description: "Fast model through OpenCode" },
  { id: "opencode/gemini-3.1-pro", label: "Gemini 3.1 Pro", description: "Long-context reasoning through OpenCode" },
  { id: "opencode/glm-5.2", label: "GLM-5.2", description: "General coding model through OpenCode" },
  { id: "opencode/gpt-5", label: "GPT-5", description: "General model through OpenCode" },
  { id: "opencode/gpt-5-codex", label: "GPT-5 Codex", description: "Coding model through OpenCode" },
  { id: "opencode/gpt-5.3-codex", label: "GPT-5.3 Codex", description: "Coding model through OpenCode" },
  { id: "opencode/gpt-5.4", label: "GPT-5.4", description: "General coding model through OpenCode" },
  { id: "opencode/gpt-5.4-mini", label: "GPT-5.4 mini", description: "Fast coding model through OpenCode" },
  { id: "opencode-go/deepseek-v4-pro", label: "DeepSeek V4 Pro (Go)", description: "Reasoning and coding through OpenCode Go" },
  { id: "opencode-go/glm-5.2", label: "GLM-5.2 (Go)", description: "General coding model through OpenCode Go" },
  { id: "opencode-go/kimi-k3", label: "Kimi K3", description: "Coding model through OpenCode Go" },
  { id: "opencode-go/qwen3.7-max", label: "Qwen 3.7 Max", description: "Higher-capability model through OpenCode Go" }
]);
const supportedOpenCodeAgentModelIds = new Set(SUPPORTED_OPENCODE_AGENT_MODELS.map(model => model.id));
export const RUN_APPROVAL_CAPABILITIES = Object.freeze([
  "repository.modify_files",
  "repository.create_worktree",
  "repository.run_verification",
  "repository.create_commit",
  "repository.push",
  "external.issue.write",
  "external.message.send"
]);
export const RUN_APPROVAL_TARGET_TYPES = Object.freeze([
  "repository",
  "repository_path",
  "verification_command",
  "git_ref",
  "external_issue",
  "external_system"
]);
const runApprovalCapabilities = new Set(RUN_APPROVAL_CAPABILITIES);
const runApprovalTargetTypes = new Set(RUN_APPROVAL_TARGET_TYPES);

export class NeutralStoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "NeutralStoreError";
    this.status = status;
  }
}

export function listSupportedAgentModels(provider = "openai") {
  const catalog = provider === "opencode" ? SUPPORTED_OPENCODE_AGENT_MODELS : SUPPORTED_AGENT_MODELS;
  return catalog.map(model => ({ ...model }));
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
    approvalRequests: [],
    issueWritebacks: [],
    managedWorktrees: [],
    fileChangeEvents: [],
    runArtifacts: [],
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
        verificationCommands: [],
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
        model: agentModel(input.model, harnessAccount.provider),
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
      if (Object.hasOwn(input, "verificationCommands")) entity.verificationCommands = verificationCommandPolicies(input.verificationCommands);
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
      if (Object.hasOwn(input, "model") || Object.hasOwn(input, "harnessAccountId")) {
        const harnessAccount = requireEntity(store.harnessAccounts, entity.harnessAccountId, "Harness Account");
        entity.model = agentModel(Object.hasOwn(input, "model") ? input.model : entity.model, harnessAccount.provider);
      }
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

export function listRepositoryVerificationCommands(store, repositoryId) {
  const repository = requireEntity(store.repositories, repositoryId, "Repository");
  return structuredClone(repository.verificationCommands || []);
}

export async function replaceRepositoryVerificationCommands(filePath, repositoryId, input = {}) {
  const mutation = await mutateStore(filePath, store => {
    const repository = requireEntity(store.repositories, repositoryId, "Repository");
    const commands = Array.isArray(input) ? input : input.commands;
    repository.verificationCommands = verificationCommandPolicies(commands);
    repository.updatedAt = new Date().toISOString();
    return structuredClone(repository.verificationCommands);
  });
  return { verificationCommands: mutation.result, store: mutation.store };
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
    const cli = account.provider === "opencode" ? "OpenCode CLI" : "Codex CLI";
    throw new NeutralStoreError(`The ${cli} must be installed and signed in before this Harness Account can start work.`, 409);
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

export function getIssueAgentWorkView(store, issueId, runtimeStatus = {}) {
  const issue = requireEntity(store.issues, issueId, "Issue");
  const issueContext = agentIssueContext(store, issue);
  const compatibleAssignments = listAgentAssignmentViews(store, runtimeStatus)
    .filter(assignment => assignment.productId === issue.productId);
  return {
    issue: issueContext,
    compatibleAssignments,
    agentTasks: issueAgentTaskSummaries(store, issue.id)
  };
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
    if (store.agentRuns.some(run => run.agentTaskId === task.id && ["queued", "running", "waiting_approval"].includes(run.status))) {
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
    const previous = [...store.agentRuns].reverse().find(run => run.agentTaskId === task.id && run.status === "completed" && run.harnessProvider === harness.provider && run.harnessAdapter === harness.adapter && run.providerMetadata?.threadId);
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
      prompt: buildAgentTurnPrompt(store, task, conversation, profile, assignment, project, product, repository, harness),
      model: profile.model,
      harnessProvider: harness.provider,
      harnessAdapter: harness.adapter,
      resumeSessionId: previous?.providerMetadata?.threadId || null,
      cwd: repository?.resolvedPath || options.cwd,
      repository: repository ? { id: repository.id, guardedWriteEnabled: repository.accessMode === "guarded_write" } : null
    };
  });

  options.onRunStarted?.(prepared.result.run);

  let outcome;
  try {
    const repositoryTools = prepared.result.repository && options.repositoryToolRuntime ? {
      ...options.repositoryToolRuntime,
      repositoryId: prepared.result.repository.id,
      guardedWriteEnabled: prepared.result.repository.guardedWriteEnabled,
      runId: prepared.result.runId,
      auditPath: join(options.repositoryToolRuntime.auditDirectory, `${prepared.result.runId}.jsonl`)
    } : null;
    const isOpenCode = prepared.result.harnessProvider === "opencode" && prepared.result.harnessAdapter === "opencode-cli";
    if (!isOpenCode) {
      options.onEvent?.({ type: "adapter.command.started", provider: prepared.result.harnessProvider, adapter: prepared.result.harnessAdapter, operation: "app-server", model: prepared.result.model, timeoutMs: options.timeoutMs || 60_000 });
    }
    outcome = await (options.executor || (isOpenCode ? runOpenCodeReadOnlyTurn : runCodexAppServer))({
      executable: isOpenCode ? (options.openCodeExecutable || "opencode") : (options.executable || "codex"),
      prompt: prepared.result.prompt,
      model: prepared.result.model,
      resumeSessionId: prepared.result.resumeSessionId,
      cwd: prepared.result.cwd,
      timeoutMs: options.timeoutMs || 60_000,
      signal: options.signal,
      onEvent: options.onEvent,
      onTrace: options.onTrace,
      onAdapterTrace: event => options.onAdapterTrace?.({ runId: prepared.result.runId, ...event }),
      verboseTrace: options.verboseTrace === true,
      runner: isOpenCode ? options.openCodeRunner : undefined,
      repositoryTools: isOpenCode ? null : repositoryTools
    });
  } catch {
    outcome = { status: "failed", finalMessage: null, usage: null, threadId: null, toolEventTypes: [], errorCode: "adapter_failure" };
  }
  options.onEvent?.({
    type: "adapter.transaction.completed",
    provider: prepared.result.harnessProvider,
    adapter: prepared.result.harnessAdapter,
    model: prepared.result.model,
    modelTransport: prepared.result.harnessProvider === "opencode" ? (prepared.result.model.startsWith("opencode-go/") ? "opencode_go" : "opencode_zen") : null,
    threadId: outcome.threadId,
    timeoutMs: options.timeoutMs || 60_000,
    status: outcome.status,
    errorCode: outcome.errorCode,
    exitCode: outcome.exitCode
  });

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

export async function reconcileInterruptedAgentOperations(filePath, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const now = approvalTimestamp(options.now);
    const result = { recoveredAt: now, interruptedRuns: 0, cancelledApprovals: 0, expiredApprovals: 0, failedFileChanges: 0, failedIssueWritebacks: 0, automaticReplays: 0 };
    const worktreeRunIds = new Set(store.managedWorktrees.filter(item => ["creating", "ready"].includes(item.status)).map(item => item.agentRunId));
    const modifyingRunIds = new Set([
      ...worktreeRunIds,
      ...store.fileChangeEvents.filter(item => item.status === "authorized").map(item => item.agentRunId),
      ...store.issueWritebacks.filter(item => item.status === "executing").map(item => item.agentRunId)
    ]);

    for (const run of store.agentRuns) {
      if (!["queued", "running", "waiting_approval"].includes(run.status)) continue;
      const originalStatus = run.status;
      const task = requireEntity(store.agentTasks, run.agentTaskId, "Agent Task");
      for (const approval of store.approvalRequests.filter(item => item.agentRunId === run.id && ["pending", "approved"].includes(item.status))) {
        approval.status = "cancelled";
        approval.decidedAt ||= now;
        approval.decidedBy ||= "startup-recovery";
        approval.cancelledAt = now;
        approval.cancelledBy = "startup-recovery";
        approval.decisionNote = "Cancelled after server restart; protected action was not replayed.";
        approval.updatedAt = now;
        syncIssueWritebackApprovalStatus(store, approval, "cancelled", now);
        result.cancelledApprovals += 1;
      }
      run.status = "interrupted";
      run.completedAt = now;
      run.updatedAt = now;
      run.errorSummary = "server_restart_interrupted";
      run.recovery = {
        classification: modifyingRunIds.has(run.id) ? "manual_review" : "retryable",
        reason: originalStatus === "waiting_approval" ? "server_restart_during_approval" : "server_restart_during_run",
        originalStatus,
        recoveredAt: now,
        acknowledgedAt: null,
        acknowledgedBy: null,
        automaticReplay: false
      };
      task.status = "failed";
      task.updatedAt = now;
      task.completedAt = null;
      result.interruptedRuns += 1;
    }

    for (const approval of store.approvalRequests) {
      if (approval.runStateEffect !== "preserve_terminal" || !["pending", "approved"].includes(approval.status) || !isApprovalExpired(approval, now)) continue;
      approval.status = "expired";
      approval.updatedAt = now;
      syncIssueWritebackApprovalStatus(store, approval, "expired", now);
      result.expiredApprovals += 1;
    }

    for (const event of store.fileChangeEvents.filter(item => item.status === "authorized")) {
      event.status = "failed";
      event.errorCode = "server_restart_interrupted";
      event.failedAt = now;
      event.updatedAt = now;
      result.failedFileChanges += 1;
    }

    for (const writeback of store.issueWritebacks.filter(item => item.status === "executing")) {
      const link = requireEntity(store.externalIssueLinks, writeback.externalIssueLinkId, "External Issue Link");
      link.syncState = "unknown";
      writeback.status = "failed";
      writeback.errorCode = "server_restart_during_external_write";
      writeback.errorMessage = "Server restarted while the origin update was in flight. Upstream state is uncertain; review before retrying.";
      writeback.completedAt = now;
      writeback.updatedAt = now;
      result.failedIssueWritebacks += 1;
    }
    return result;
  });
  return mutation.result;
}

export async function acknowledgeAgentRunRecovery(filePath, agentRunId, input = {}, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const run = requireEntity(store.agentRuns, agentRunId, "Agent Run");
    if (run.status !== "interrupted" || !run.recovery) throw new NeutralStoreError("Only an interrupted Agent Run with recovery evidence can be acknowledged.", 409);
    if (run.recovery.acknowledgedAt) throw new NeutralStoreError("Agent Run recovery is already acknowledged.", 409);
    const now = approvalTimestamp(options.now);
    run.recovery.acknowledgedAt = now;
    run.recovery.acknowledgedBy = boundedApprovalText(input.actor || "local-user", "Recovery actor", 200);
    run.updatedAt = now;
    return structuredClone(run);
  });
  return { agentRun: mutation.result, store: mutation.store };
}

export function getOperationalHealth(store, runtime = {}) {
  const now = Date.parse(runtime.now || new Date().toISOString());
  const activeRuns = store.agentRuns.filter(run => ["queued", "running", "waiting_approval"].includes(run.status));
  const unacknowledgedRecoveries = store.agentRuns.filter(run => run.status === "interrupted" && run.recovery && !run.recovery.acknowledgedAt);
  const staleWorktreeLocks = store.managedWorktrees.filter(item => ["creating", "ready"].includes(item.status));
  const uncertainWritebacks = store.issueWritebacks.filter(item => item.status === "executing" || (item.status === "failed" && item.errorCode === "server_restart_during_external_write"));
  const authorizedFileChanges = store.fileChangeEvents.filter(item => item.status === "authorized");
  const unresolvedApprovals = store.approvalRequests.filter(item => ["pending", "approved"].includes(item.status));
  const unsafeCount = activeRuns.length + authorizedFileChanges.length + store.issueWritebacks.filter(item => item.status === "executing").length;
  const attentionCount = unacknowledgedRecoveries.length + staleWorktreeLocks.length + uncertainWritebacks.length;
  const runDurations = store.agentRuns.map(run => runDurationMilliseconds(run, now)).filter(Number.isFinite);
  const usage = store.agentRuns.reduce((total, run) => addOperationalUsage(total, run.usage), { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0 });
  const status = unsafeCount ? "unhealthy" : attentionCount ? "degraded" : "healthy";
  return {
    status,
    checkedAt: new Date(now).toISOString(),
    process: {
      startedAt: runtime.startedAt || null,
      uptimeSeconds: Number.isFinite(runtime.uptimeSeconds) ? Math.max(0, Math.floor(runtime.uptimeSeconds)) : null,
      database: "reachable",
      codexCli: runtime.codexCliStatus || "unknown"
    },
    recovery: {
      lastStartup: runtime.startupRecovery || null,
      activeRuns: activeRuns.length,
      unacknowledgedRuns: unacknowledgedRecoveries.length,
      staleWorktreeLocks: staleWorktreeLocks.length,
      authorizedFileChanges: authorizedFileChanges.length,
      uncertainWritebacks: uncertainWritebacks.length,
      automaticReplays: 0
    },
    totals: {
      runs: store.agentRuns.length,
      approvals: store.approvalRequests.length,
      unresolvedApprovals: unresolvedApprovals.length,
      managedWorktrees: store.managedWorktrees.length,
      artifacts: store.runArtifacts.length,
      issueWritebacks: store.issueWritebacks.length
    },
    metrics: {
      runsByStatus: countBy(store.agentRuns, item => item.status),
      failureClassifications: countBy(store.agentRuns.filter(item => ["failed", "cancelled", "interrupted"].includes(item.status)), item => item.recovery?.classification || "terminal"),
      durationMs: operationalDurationSummary(runDurations),
      usage,
      toolEvents: store.agentRuns.reduce((total, run) => total + (Array.isArray(run.toolActivity) ? run.toolActivity.length : 0), 0)
    },
    recentFailures: store.agentRuns.filter(run => ["failed", "cancelled", "interrupted"].includes(run.status))
      .sort((left, right) => String(right.completedAt || right.updatedAt).localeCompare(String(left.completedAt || left.updatedAt)))
      .slice(0, 20)
      .map(run => ({
        runId: run.id,
        agentTaskId: run.agentTaskId,
        status: run.status,
        classification: run.recovery?.classification || "terminal",
        errorCode: operationalFailureCode(run.errorSummary, run.status),
        completedAt: run.completedAt || null,
        durationMs: runDurationMilliseconds(run, now),
        toolEvents: Array.isArray(run.toolActivity) ? run.toolActivity.length : 0,
        acknowledged: Boolean(run.recovery?.acknowledgedAt)
      }))
  };
}

export async function createRunApprovalRequest(filePath, agentRunId, input = {}, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const run = requireEntity(store.agentRuns, agentRunId, "Agent Run");
    if (run.status !== "running") throw new NeutralStoreError("Only a running Agent Run can request approval.", 409);
    if (store.approvalRequests.some(item => item.agentRunId === run.id && ["pending", "approved"].includes(item.status))) {
      throw new NeutralStoreError("Agent Run already has an unresolved Approval Request.", 409);
    }
    const now = approvalTimestamp(options.now);
    const expiresAt = futureApprovalExpiry(input.expiresAt, now);
    const approval = {
      id: managedId("approval-request"),
      agentRunId: run.id,
      capability: runApprovalCapability(input.capability),
      targetType: runApprovalTargetType(input.targetType),
      targetId: boundedApprovalText(input.targetId, "Approval target ID", 500),
      reason: boundedApprovalText(input.reason, "Approval reason", 2_000),
      riskLevel: runApprovalRisk(input.riskLevel),
      riskSummary: boundedApprovalText(input.riskSummary, "Approval risk summary", 2_000),
      requestedBy: boundedApprovalText(input.requestedBy, "Approval requester", 200),
      status: "pending",
      requestedAt: now,
      expiresAt,
      decidedAt: null,
      decidedBy: null,
      decisionNote: null,
      consumedAt: null,
      consumedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      updatedAt: now
    };
    store.approvalRequests.push(approval);
    transitionRunAndTask(store, run, "waiting_approval", now);
    return { approval: structuredClone(approval), run: structuredClone(run) };
  });
  return { ...mutation.result, store: mutation.store };
}

export async function decideRunApproval(filePath, agentRunId, approvalId, input = {}, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const { run, approval } = approvalForRun(store, agentRunId, approvalId);
    if (approval.status !== "pending") throw new NeutralStoreError("Only a pending Approval Request can be decided.", 409);
    const now = approvalTimestamp(options.now);
    if (isApprovalExpired(approval, now)) {
      rejectApproval(store, run, approval, "expired", now);
      syncIssueWritebackApprovalStatus(store, approval, "expired", now);
      return { approval: structuredClone(approval), run: structuredClone(run), accepted: false, reason: "expired" };
    }
    const decision = String(input.decision || "").trim().toLowerCase();
    if (!["approved", "denied"].includes(decision)) throw new NeutralStoreError("Approval decision must be approved or denied.");
    const actor = boundedApprovalText(input.actor, "Approval decision actor", 200);
    approval.status = decision;
    approval.decidedAt = now;
    approval.decidedBy = actor;
    approval.decisionNote = optionalBoundedApprovalText(input.note, "Approval decision note", 2_000);
    approval.updatedAt = now;
    if (decision === "denied") rejectApproval(store, run, approval, "denied", now, actor);
    syncIssueWritebackApprovalStatus(store, approval, decision, now);
    return { approval: structuredClone(approval), run: structuredClone(run), accepted: decision === "approved", reason: decision };
  });
  return { ...mutation.result, store: mutation.store };
}

export async function cancelRunApproval(filePath, agentRunId, approvalId, input = {}, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const { run, approval } = approvalForRun(store, agentRunId, approvalId);
    if (!["pending", "approved"].includes(approval.status)) throw new NeutralStoreError("This Approval Request can no longer be cancelled.", 409);
    const now = approvalTimestamp(options.now);
    const actor = boundedApprovalText(input.actor, "Approval cancellation actor", 200);
    approval.status = "cancelled";
    approval.decidedAt ||= now;
    approval.decidedBy ||= actor;
    approval.cancelledAt = now;
    approval.cancelledBy = actor;
    approval.decisionNote = optionalBoundedApprovalText(input.note, "Approval cancellation note", 2_000);
    approval.updatedAt = now;
    if (approval.runStateEffect === "preserve_terminal") syncIssueWritebackApprovalStatus(store, approval, "cancelled", now);
    else transitionRunAndTask(store, run, "cancelled", now, true);
    return { approval: structuredClone(approval), run: structuredClone(run) };
  });
  return { ...mutation.result, store: mutation.store };
}

export async function consumeRunApproval(filePath, agentRunId, approvalId, input = {}, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const now = approvalTimestamp(options.now);
    const result = consumeApprovalInStore(store, agentRunId, approvalId, input, now);
    return { approval: structuredClone(result.approval), run: structuredClone(result.run), consumed: result.consumed, reason: result.reason };
  });
  return { ...mutation.result, store: mutation.store };
}

export function listRunApprovalRequests(store, agentRunId) {
  requireEntity(store.agentRuns, agentRunId, "Agent Run");
  return structuredClone(store.approvalRequests.filter(item => item.agentRunId === agentRunId)
    .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt) || left.id.localeCompare(right.id)));
}

export function getIssueWritebackView(store, agentRunId) {
  const run = requireEntity(store.agentRuns, agentRunId, "Agent Run");
  const task = requireEntity(store.agentTasks, run.agentTaskId, "Agent Task");
  const attempts = store.issueWritebacks.filter(item => item.agentRunId === run.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
    .map(item => issueWritebackProjection(store, item));
  if (!task.issueId) return { available: false, reason: "This Agent Task is not linked to an Issue.", suggestedStatus: null, preview: null, attempts };
  const issue = requireEntity(store.issues, task.issueId, "Issue");
  const originLink = store.externalIssueLinks.find(link => link.issueId === issue.id && link.role === "origin");
  if (!originLink) return { available: false, reason: "The linked Issue has no authoritative origin.", suggestedStatus: null, preview: null, attempts };
  const source = requireEntity(store.productSources, originLink.productSourceId, "Product Source");
  const account = requireEntity(store.connectorAccounts, source.connectorAccountId, "Connector Account");
  const suggestedStatus = "done";
  const unavailable = run.status !== "completed"
    ? "Only a successfully completed Agent Run can propose an Issue update."
      : issue.status === suggestedStatus
      ? "The origin Issue is already marked Done."
      : source.provider !== "gitlab"
        ? `Issue write-back is not implemented for ${source.provider}.`
        : source.active === false || account.active === false
          ? "The authoritative Product Source connection is inactive."
          : !new Set([...(source.capabilities || []), ...(account.capabilities || [])]).has("close")
            ? "The authoritative Product Source is not configured with close capability."
          : null;
  return {
    available: !unavailable,
    reason: unavailable,
    suggestedStatus,
    preview: issueWritebackPreview(issue, originLink, source, account, suggestedStatus),
    attempts
  };
}

export async function createIssueWritebackApproval(filePath, agentRunId, input = {}, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const view = getIssueWritebackView(store, agentRunId);
    if (!view.available) throw new NeutralStoreError(view.reason, 409);
    const run = requireEntity(store.agentRuns, agentRunId, "Agent Run");
    if (store.approvalRequests.some(item => item.agentRunId === run.id && ["pending", "approved"].includes(item.status))) {
      throw new NeutralStoreError("Agent Run already has an unresolved Approval Request.", 409);
    }
    const requestedStatus = issueWritebackStatus(input.requestedStatus || view.suggestedStatus);
    if (requestedStatus !== view.suggestedStatus) throw new NeutralStoreError("The approved transition must match the Run's suggested Issue status.", 409);
    const preview = view.preview;
    const now = approvalTimestamp(options.now);
    const expiresAt = input.expiresAt
      ? futureApprovalExpiry(input.expiresAt, now)
      : new Date(Date.parse(now) + 15 * 60 * 1_000).toISOString();
    const writebackId = managedId("issue-writeback");
    const approval = {
      id: managedId("approval-request"),
      agentRunId: run.id,
      capability: "external.issue.write",
      targetType: "external_issue",
      targetId: preview.targetId,
      reason: `Update linked Issue “${preview.issue.title}” from ${preview.currentStatus} to ${preview.requestedStatus}.`,
      riskLevel: "medium",
      riskSummary: `Writes one status transition to the authoritative ${preview.source.provider} origin. No replicas or other fields are changed.`,
      requestedBy: boundedApprovalText(input.requestedBy || "local-user", "Approval requester", 200),
      status: "pending",
      requestedAt: now,
      expiresAt,
      decidedAt: null,
      decidedBy: null,
      decisionNote: null,
      consumedAt: null,
      consumedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      runStateEffect: "preserve_terminal",
      issueWritebackId: writebackId,
      updatedAt: now
    };
    const target = issueWritebackTarget(store, run, requestedStatus);
    const writeback = {
      id: writebackId,
      agentRunId: run.id,
      agentTaskId: target.task.id,
      issueId: target.issue.id,
      externalIssueLinkId: target.link.id,
      productSourceId: target.source.id,
      approvalRequestId: approval.id,
      provider: target.source.provider,
      previousStatus: target.issue.status,
      requestedStatus,
      targetId: preview.targetId,
      status: "awaiting_approval",
      attemptCount: 0,
      upstreamState: null,
      errorCode: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      attemptedAt: null,
      completedAt: null
    };
    store.approvalRequests.push(approval);
    store.issueWritebacks.push(writeback);
    return { approval: structuredClone(approval), writeback: issueWritebackProjection(store, writeback), run: structuredClone(run) };
  });
  return { ...mutation.result, store: mutation.store };
}

export async function beginIssueWriteback(filePath, agentRunId, approvalId, input = {}, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const approval = requireEntity(store.approvalRequests, approvalId, "Approval Request");
    const writeback = store.issueWritebacks.find(item => item.approvalRequestId === approval.id);
    if (!writeback || writeback.agentRunId !== agentRunId) throw new NeutralStoreError("Issue write-back does not match this Agent Run.", 409);
    if (!['approved'].includes(writeback.status)) throw new NeutralStoreError("Issue write-back is not approved for execution.", 409);
    const now = approvalTimestamp(options.now);
    const consumed = consumeApprovalInStore(store, agentRunId, approval.id, {
      capability: "external.issue.write",
      targetType: "external_issue",
      targetId: writeback.targetId,
      actor: input.actor || "local-user"
    }, now);
    if (!consumed.consumed) throw new NeutralStoreError("Issue write-back approval is no longer valid.", 409);
    writeback.status = "executing";
    writeback.attemptCount = Number(writeback.attemptCount || 0) + 1;
    writeback.attemptedAt = now;
    writeback.updatedAt = now;
    const target = issueWritebackTarget(store, consumed.run, writeback.requestedStatus, writeback.externalIssueLinkId);
    return {
      writeback: issueWritebackProjection(store, writeback),
      approval: structuredClone(consumed.approval),
      target: {
        provider: target.source.provider,
        externalContainerId: target.source.externalContainerId,
        externalIssueId: target.link.externalIssueId,
        baseUrl: target.account.baseUrl,
        credentialReference: target.account.credentialReferences?.token || target.account.credentialReference
      }
    };
  });
  return { ...mutation.result, store: mutation.store };
}

export async function completeIssueWriteback(filePath, writebackId, result = {}, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const writeback = requireEntity(store.issueWritebacks, writebackId, "Issue write-back");
    if (writeback.status !== "executing") throw new NeutralStoreError("Only an executing Issue write-back can complete.", 409);
    const issue = requireEntity(store.issues, writeback.issueId, "Issue");
    const link = requireEntity(store.externalIssueLinks, writeback.externalIssueLinkId, "External Issue Link");
    const now = approvalTimestamp(options.now);
    issue.status = writeback.requestedStatus;
    issue.version = Number(issue.version || 0) + 1;
    issue.updatedAt = now;
    link.syncState = "current";
    link.lastSyncedAt = now;
    writeback.status = "succeeded";
    writeback.upstreamState = optionalBoundedApprovalText(result.upstreamState, "Upstream Issue state", 120);
    writeback.errorCode = null;
    writeback.errorMessage = null;
    writeback.completedAt = now;
    writeback.updatedAt = now;
    return { writeback: issueWritebackProjection(store, writeback), issue: structuredClone(issue), link: structuredClone(link) };
  });
  return { ...mutation.result, store: mutation.store };
}

export async function failIssueWriteback(filePath, writebackId, error = {}, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const writeback = requireEntity(store.issueWritebacks, writebackId, "Issue write-back");
    if (writeback.status !== "executing") throw new NeutralStoreError("Only an executing Issue write-back can fail.", 409);
    const link = requireEntity(store.externalIssueLinks, writeback.externalIssueLinkId, "External Issue Link");
    const now = approvalTimestamp(options.now);
    link.syncState = "unknown";
    writeback.status = "failed";
    writeback.errorCode = optionalBoundedApprovalText(error.code || "upstream_write_failed", "Issue write-back error code", 120);
    writeback.errorMessage = optionalBoundedApprovalText(String(error.message || "The authoritative Source rejected the update.").replace(/[\r\n]+/g, " "), "Issue write-back error message", 500);
    writeback.completedAt = now;
    writeback.updatedAt = now;
    return { writeback: issueWritebackProjection(store, writeback), link: structuredClone(link) };
  });
  return { ...mutation.result, store: mutation.store };
}

export async function reserveManagedWorktree(filePath, agentRunId, approvalId, input = {}, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const run = requireEntity(store.agentRuns, agentRunId, "Agent Run");
    const task = requireEntity(store.agentTasks, run.agentTaskId, "Agent Task");
    const repository = task.repositoryId ? requireEntity(store.repositories, task.repositoryId, "Repository") : null;
    if (!repository) throw new NeutralStoreError("Agent Run requires an assigned Repository for managed worktree creation.", 409);
    if (repository.accessMode !== "guarded_write") throw new NeutralStoreError("Repository must use guarded_write access before a managed worktree can be created.", 409);
    if (store.managedWorktrees.some(item => item.agentRunId === run.id)) throw new NeutralStoreError("Agent Run already owns a managed worktree record.", 409);
    if (store.managedWorktrees.some(item => item.repositoryId === repository.id && ["creating", "ready"].includes(item.status))) {
      throw new NeutralStoreError("Repository already has an active modifying Run lock.", 409);
    }
    const now = approvalTimestamp(options.now);
    const consumed = consumeApprovalInStore(store, run.id, approvalId, {
      capability: "repository.create_worktree",
      targetType: "repository",
      targetId: repository.id,
      actor: input.actor
    }, now);
    if (!consumed.consumed) return { worktree: null, approval: structuredClone(consumed.approval), run: structuredClone(consumed.run), reason: consumed.reason };
    const worktree = {
      id: boundedApprovalText(input.id, "Managed worktree ID", 200),
      repositoryId: repository.id,
      agentTaskId: task.id,
      agentRunId: run.id,
      path: boundedWorktreePath(input.path),
      rootPath: boundedWorktreePath(input.rootPath),
      baseCommit: gitCommitIdentifier(input.baseCommit),
      baseBranch: optionalBoundedApprovalText(input.baseBranch, "Managed worktree base branch", 300),
      status: "creating",
      present: false,
      dirty: false,
      head: null,
      errorCode: null,
      createdAt: now,
      updatedAt: now,
      inspectedAt: null,
      retainedAt: null,
      discardedAt: null
    };
    store.managedWorktrees.push(worktree);
    return { worktree: structuredClone(worktree), approval: structuredClone(consumed.approval), run: structuredClone(consumed.run), reason: "reserved" };
  });
  return { ...mutation.result, store: mutation.store };
}

export async function markManagedWorktreeReady(filePath, id, input = {}, options = {}) {
  return mutateManagedWorktree(filePath, id, worktree => {
    if (worktree.status !== "creating") throw new NeutralStoreError("Only a creating managed worktree can become ready.", 409);
    const now = approvalTimestamp(options.now);
    worktree.status = "ready";
    worktree.present = true;
    worktree.dirty = input.dirty === true;
    worktree.head = gitCommitIdentifier(input.head || worktree.baseCommit);
    worktree.inspectedAt = now;
    worktree.updatedAt = now;
    worktree.errorCode = null;
  });
}

export async function markManagedWorktreeFailed(filePath, id, input = {}, options = {}) {
  return mutateManagedWorktree(filePath, id, worktree => {
    if (worktree.status !== "creating") throw new NeutralStoreError("Only a creating managed worktree can fail creation.", 409);
    const now = approvalTimestamp(options.now);
    worktree.status = "failed";
    worktree.present = input.present === true;
    worktree.errorCode = optionalBoundedApprovalText(input.errorCode, "Managed worktree error code", 120) || "worktree_creation_failed";
    worktree.inspectedAt = now;
    worktree.updatedAt = now;
  });
}

export async function recordManagedWorktreeInspection(filePath, id, input = {}, options = {}) {
  return mutateManagedWorktree(filePath, id, worktree => {
    if (worktree.status === "discarded") throw new NeutralStoreError("Discarded managed worktrees cannot be inspected.", 409);
    const now = approvalTimestamp(options.now);
    worktree.present = input.present === true;
    worktree.dirty = input.present === true && input.dirty === true;
    worktree.head = input.present && input.head ? gitCommitIdentifier(input.head) : worktree.head;
    worktree.inspectedAt = now;
    worktree.updatedAt = now;
    if (!worktree.present) worktree.status = "missing";
    else if (worktree.status === "missing" || worktree.status === "failed" || (input.interrupted === true && ["creating", "ready"].includes(worktree.status))) worktree.status = "retained";
  });
}

export async function retainManagedWorktree(filePath, id, options = {}) {
  return mutateManagedWorktree(filePath, id, worktree => {
    if (!["ready", "retained", "missing", "failed"].includes(worktree.status)) throw new NeutralStoreError("Managed worktree cannot be retained from its current state.", 409);
    const now = approvalTimestamp(options.now);
    if (worktree.status !== "missing") worktree.status = "retained";
    worktree.retainedAt ||= now;
    worktree.updatedAt = now;
  });
}

export async function markManagedWorktreeDiscarded(filePath, id, options = {}) {
  return mutateManagedWorktree(filePath, id, worktree => {
    if (!["ready", "retained", "missing", "failed"].includes(worktree.status)) throw new NeutralStoreError("Managed worktree cannot be discarded from its current state.", 409);
    const now = approvalTimestamp(options.now);
    worktree.status = "discarded";
    worktree.present = false;
    worktree.dirty = false;
    worktree.discardedAt = now;
    worktree.updatedAt = now;
  });
}

export function getManagedWorktree(store, id) {
  return structuredClone(requireEntity(store.managedWorktrees, id, "Managed worktree"));
}

export function getAgentRunManagedWorktree(store, agentRunId) {
  requireEntity(store.agentRuns, agentRunId, "Agent Run");
  const worktree = store.managedWorktrees.find(item => item.agentRunId === agentRunId);
  return worktree ? structuredClone(worktree) : null;
}

export function listManagedWorktrees(store) {
  return structuredClone([...store.managedWorktrees].sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id)));
}

export async function authorizeGuardedFileChange(filePath, agentRunId, approvalId, input = {}, options = {}) {
  const mutation = await mutateStore(filePath, store => {
    const run = requireEntity(store.agentRuns, agentRunId, "Agent Run");
    const worktree = store.managedWorktrees.find(item => item.agentRunId === run.id);
    if (!worktree || worktree.status !== "ready" || worktree.present !== true) throw new NeutralStoreError("Agent Run requires a ready managed worktree for guarded file changes.", 409);
    const repository = requireEntity(store.repositories, worktree.repositoryId, "Repository");
    if (repository.accessMode !== "guarded_write") throw new NeutralStoreError("Repository no longer permits guarded writes.", 409);
    const relativePath = guardedRelativePath(input.relativePath);
    const events = store.fileChangeEvents.filter(item => item.managedWorktreeId === worktree.id);
    if (events.length >= 50) throw new NeutralStoreError("Managed worktree reached its guarded write call limit.", 413);
    const activeChangedPaths = new Set(events.filter(item => item.status !== "failed").map(item => comparable(item.relativePath)));
    if (!activeChangedPaths.has(comparable(relativePath)) && activeChangedPaths.size >= 20) {
      throw new NeutralStoreError("Managed worktree reached its changed-file limit.", 413);
    }
    const now = approvalTimestamp(options.now);
    const consumed = consumeApprovalInStore(store, run.id, approvalId, {
      capability: "repository.modify_files",
      targetType: "repository_path",
      targetId: `${worktree.id}:${relativePath}`,
      actor: input.actor
    }, now);
    if (!consumed.consumed) return { fileChangeEvent: null, approval: structuredClone(consumed.approval), run: structuredClone(consumed.run), reason: consumed.reason };
    const operation = String(input.operation || "").trim();
    if (!["apply_patch", "create_file"].includes(operation)) throw new NeutralStoreError("Guarded file change operation is not supported.");
    const event = {
      id: managedId("file-change"),
      managedWorktreeId: worktree.id,
      agentRunId: run.id,
      sequence: events.reduce((maximum, item) => Math.max(maximum, item.sequence), 0) + 1,
      operation,
      relativePath,
      beforeSha256: input.beforeSha256 == null ? null : sha256Identifier(input.beforeSha256, "Before SHA-256"),
      afterSha256: sha256Identifier(input.afterSha256, "After SHA-256"),
      beforeBytes: boundedFileByteCount(input.beforeBytes, "Before byte count"),
      afterBytes: boundedFileByteCount(input.afterBytes, "After byte count"),
      status: "authorized",
      errorCode: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      failedAt: null
    };
    store.fileChangeEvents.push(event);
    return { fileChangeEvent: structuredClone(event), approval: structuredClone(consumed.approval), run: structuredClone(consumed.run), reason: "authorized" };
  });
  return { ...mutation.result, store: mutation.store };
}

export async function completeGuardedFileChange(filePath, id, options = {}) {
  return mutateFileChangeEvent(filePath, id, (event, store) => {
    if (event.status !== "authorized") throw new NeutralStoreError("Only an authorized file change can complete.", 409);
    const now = approvalTimestamp(options.now);
    event.status = "completed";
    event.completedAt = now;
    event.updatedAt = now;
    const worktree = requireEntity(store.managedWorktrees, event.managedWorktreeId, "Managed worktree");
    worktree.dirty = true;
    worktree.updatedAt = now;
  });
}

export async function failGuardedFileChange(filePath, id, input = {}, options = {}) {
  return mutateFileChangeEvent(filePath, id, event => {
    if (event.status !== "authorized") throw new NeutralStoreError("Only an authorized file change can fail.", 409);
    const now = approvalTimestamp(options.now);
    event.status = "failed";
    event.errorCode = optionalBoundedApprovalText(input.errorCode, "File change error code", 120) || "guarded_write_failed";
    event.failedAt = now;
    event.updatedAt = now;
  });
}

export function listGuardedFileChanges(store, agentRunId) {
  requireEntity(store.agentRuns, agentRunId, "Agent Run");
  return structuredClone(store.fileChangeEvents.filter(item => item.agentRunId === agentRunId)
    .sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id)));
}

export async function recordRunArtifact(filePath, agentRunId, input = {}) {
  const mutation = await mutateStore(filePath, store => {
    requireEntity(store.agentRuns, agentRunId, "Agent Run");
    const artifact = normalizedRunArtifact(agentRunId, input);
    const existing = store.runArtifacts.find(item => item.agentRunId === agentRunId && item.kind === artifact.kind && item.contentHash === artifact.contentHash);
    if (existing) return structuredClone(existing);
    if (store.runArtifacts.filter(item => item.agentRunId === agentRunId).length >= 100) throw new NeutralStoreError("Agent Run reached its artifact count limit.", 413);
    store.runArtifacts.push(artifact);
    return structuredClone(artifact);
  });
  return { runArtifact: mutation.result, store: mutation.store };
}

export function listRunArtifacts(store, agentRunId) {
  requireEntity(store.agentRuns, agentRunId, "Agent Run");
  return structuredClone(store.runArtifacts.filter(item => item.agentRunId === agentRunId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)));
}

export async function setRunReviewStatus(filePath, agentRunId, input = {}) {
  const mutation = await mutateStore(filePath, store => {
    const run = requireEntity(store.agentRuns, agentRunId, "Agent Run");
    const status = requiredString(input.status, "Run review status");
    if (!['accepted_for_next_step', 'needs_changes'].includes(status)) throw new NeutralStoreError("Run review status is not supported.");
    const now = new Date().toISOString();
    run.reviewStatus = status;
    run.reviewedAt = now;
    run.reviewedBy = boundedApprovalText(input.actor || "local-user", "Run reviewer", 200);
    run.updatedAt = now;
    return structuredClone(run);
  });
  return { agentRun: mutation.result, store: mutation.store };
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
  const runs = store.agentRuns.filter(run => run.agentTaskId === task.id)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
  const latestRun = runs.at(-1);
  return {
    ...structuredClone(task),
    conversation: conversation ? structuredClone(conversation) : null,
    messageCount: conversation ? store.messages.filter(message => message.conversationId === conversation.id).length : 0,
    runCount: runs.length,
    completedRunCount: runs.filter(run => run.status === "completed").length,
    latestRun: latestRun ? {
      id: latestRun.id,
      status: latestRun.status,
      completedAt: latestRun.completedAt,
      reviewStatus: latestRun.reviewStatus || null
    } : null,
    issueContext: task.issueId ? agentIssueContext(store, task.issueId) : null,
    issueAgentTaskCount: task.issueId ? store.agentTasks.filter(item => item.issueId === task.issueId).length : 0
  };
}

function agentIssueContext(store, issueOrId) {
  const issue = typeof issueOrId === "string" ? requireEntity(store.issues, issueOrId, "Issue") : issueOrId;
  const product = requireEntity(store.products, issue.productId, "Issue Product");
  const project = requireEntity(store.projects, product.projectId, "Issue Project");
  const originLink = store.externalIssueLinks.find(link => link.issueId === issue.id && link.role === "origin") || null;
  const source = originLink ? store.productSources.find(item => item.id === originLink.productSourceId) || null : null;
  const assignee = issue.assigneeIdentity && typeof issue.assigneeIdentity === "object" ? {
    provider: boundedProjectionText(issue.assigneeIdentity.provider, 80),
    username: boundedProjectionText(issue.assigneeIdentity.username, 160),
    displayName: boundedProjectionText(issue.assigneeIdentity.displayName, 200)
  } : null;
  return {
    id: issue.id,
    title: boundedProjectionText(issue.title, 500),
    description: boundedProjectionText(issue.description, 6_000),
    status: issue.status,
    priority: issue.priority || null,
    dueDate: issue.dueDate || null,
    labels: Array.isArray(issue.labels) ? issue.labels.slice(0, 30).map(label => boundedProjectionText(label, 120)).filter(Boolean) : [],
    assignee,
    project: managedContext(project),
    product: managedContext(product),
    origin: originLink && source ? {
      productSourceId: source.id,
      provider: source.provider,
      displayName: boundedProjectionText(source.displayName || source.externalContainerId, 240),
      externalIssueId: boundedProjectionText(originLink.externalIssueId, 240),
      externalUrl: boundedProjectionText(originLink.externalUrl, 2_048)
    } : null
  };
}

function issueAgentTaskSummaries(store, issueId) {
  return store.agentTasks.filter(task => task.issueId === issueId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id))
    .map(task => {
      const conversation = store.conversations.find(item => item.agentTaskId === task.id);
      const runs = store.agentRuns.filter(run => run.agentTaskId === task.id)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
      const latestRun = runs.at(-1);
      return {
        id: task.id,
        agentAssignmentId: task.agentAssignmentId,
        objective: task.objective,
        status: task.status,
        conversationTitle: conversation?.title || null,
        messageCount: conversation ? store.messages.filter(message => message.conversationId === conversation.id).length : 0,
        runCount: runs.length,
        completedRunCount: runs.filter(run => run.status === "completed").length,
        latestRun: latestRun ? { id: latestRun.id, status: latestRun.status, completedAt: latestRun.completedAt, reviewStatus: latestRun.reviewStatus || null } : null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };
    });
}

function boundedProjectionText(value, maximum) {
  if (value == null) return "";
  const text = String(value).trim();
  if (text.length <= maximum) return text;
  return `${text.slice(0, Math.max(0, maximum - 14)).trimEnd()}… [truncated]`;
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

function buildAgentTurnPrompt(store, task, conversation, profile, assignment, project, product, repository, harness) {
  const messages = store.messages.filter(message => message.conversationId === conversation.id)
    .sort((left, right) => left.sequence - right.sequence).slice(-12)
    .map(message => `${message.role}: ${message.content}`).join("\n");
  const issueContext = task.issueId ? agentIssueContext(store, task.issueId) : null;
  return boundedTurnText([
    repository
      ? harness.provider === "opencode"
        ? "This is a constrained read-only Repository turn. Use only OpenCode native read, list, glob, and grep tools inside the assigned Repository when inspection is needed. Never use commands, shell, file changes, web search, MCP servers, subagents, external systems, or external directories. Do not request or expose secrets."
        : "This is a constrained read-only Repository turn. Use only the ahive_repository MCP tools when code inspection is needed. Never use commands, shell, file changes, web search, other MCP servers, or external systems. Do not request or expose secrets."
      : "This is a chat-only turn. Do not use commands, filesystem tools, MCP tools, web search, or external systems.",
    `Agent: ${profile.name}`,
    profile.description ? `Purpose: ${profile.description}` : "",
    profile.traitDescription ? `Traits: ${profile.traitDescription}` : "",
    profile.instructions ? `Instructions: ${profile.instructions}` : "",
    `Objective: ${task.objective}`,
    `Project: ${project.name}`,
    product ? `Product: ${product.name}` : "",
    repository ? `Repository: ${repository.name}. Available read-only tools: ${harness.provider === "opencode" ? "read, list, glob, grep" : "list_files, search_text, read_text, git_summary"}.` : "",
    assignment.contextInstructions ? `Project context: ${assignment.contextInstructions}` : "",
    issueContext ? formatAgentIssuePrompt(issueContext) : "",
    "Visible conversation:",
    messages || "No prior messages.",
    "Respond only with the visible assistant reply."
  ].filter(Boolean).join("\n"), 18_000);
}

function formatAgentIssuePrompt(issue) {
  return [
    "Linked Issue context (read-only; this does not authorize Issue or Source writes):",
    `Issue ID: ${issue.id}`,
    `Title: ${issue.title}`,
    `Description: ${issue.description || "Not provided"}`,
    `Status: ${issue.status}`,
    `Priority: ${issue.priority || "Not set"}`,
    `Due date: ${issue.dueDate || "Not set"}`,
    `Labels: ${issue.labels.length ? issue.labels.join(", ") : "None"}`,
    `Assignee: ${issue.assignee?.displayName || issue.assignee?.username || "Not set"}`,
    issue.origin ? `Origin Source: ${issue.origin.provider} · ${issue.origin.displayName} · external Issue ${issue.origin.externalIssueId}` : "Origin Source: Not available",
    issue.origin?.externalUrl ? `Origin URL: ${issue.origin.externalUrl}` : ""
  ].filter(Boolean).join("\n");
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
      agentTasks: issueAgentTaskSummaries(store, issue.id),
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
  const runById = new Map(store.agentRuns.map(entity => [entity.id, entity]));
  const repositoryById = new Map(store.repositories.map(entity => [entity.id, entity]));
  const managedWorktreeById = new Map(store.managedWorktrees.map(entity => [entity.id, entity]));
  const sourceById = new Map(store.productSources.map(entity => [entity.id, entity]));
  const issueById = new Map(store.issues.map(entity => [entity.id, entity]));
  const externalLinkById = new Map(store.externalIssueLinks.map(entity => [entity.id, entity]));

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
    const commands = verificationCommandPolicies(repository.verificationCommands || []);
    if (JSON.stringify(commands) !== JSON.stringify(repository.verificationCommands || [])) {
      throw new NeutralStoreError(`Repository ${repository.id} has invalid verification command policies.`, 500);
    }
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
    if (!["queued", "running", "waiting_approval", "completed", "failed", "cancelled", "interrupted"].includes(run.status)) throw new NeutralStoreError(`Agent Run ${run.id} has an invalid status.`, 500);
    if (!isPlainObject(run.agentProfileSnapshot) || !isPlainObject(run.assignmentSnapshot)) throw new NeutralStoreError(`Agent Run ${run.id} snapshots are invalid.`, 500);
    sanitizeRunUsage(run.usage);
    if (run.reviewStatus != null && !["accepted_for_next_step", "needs_changes"].includes(run.reviewStatus)) throw new NeutralStoreError(`Agent Run ${run.id} has an invalid review status.`, 500);
    if (run.recovery != null) validateRunRecovery(run);
  }
  for (const artifact of store.runArtifacts) {
    if (!runById.has(artifact.agentRunId)) throw new NeutralStoreError(`Run Artifact ${artifact.id} Agent Run reference is invalid.`, 500);
    normalizedRunArtifact(artifact.agentRunId, artifact);
  }
  const unresolvedApprovalsByRun = new Map();
  for (const approval of store.approvalRequests) {
    if (!runById.has(approval.agentRunId)) throw new NeutralStoreError(`Approval Request ${approval.id} Agent Run reference is invalid.`, 500);
    runApprovalCapability(approval.capability);
    runApprovalTargetType(approval.targetType);
    boundedApprovalText(approval.targetId, `Approval Request ${approval.id} target ID`, 500);
    boundedApprovalText(approval.reason, `Approval Request ${approval.id} reason`, 2_000);
    runApprovalRisk(approval.riskLevel);
    boundedApprovalText(approval.riskSummary, `Approval Request ${approval.id} risk summary`, 2_000);
    boundedApprovalText(approval.requestedBy, `Approval Request ${approval.id} requester`, 200);
    if (!["pending", "approved", "denied", "expired", "consumed", "cancelled"].includes(approval.status)) {
      throw new NeutralStoreError(`Approval Request ${approval.id} has an invalid status.`, 500);
    }
    validApprovalDate(approval.requestedAt, `Approval Request ${approval.id} requested timestamp`);
    validApprovalDate(approval.expiresAt, `Approval Request ${approval.id} expiry timestamp`);
    if (["approved", "denied", "consumed", "cancelled"].includes(approval.status)) {
      validApprovalDate(approval.decidedAt, `Approval Request ${approval.id} decision timestamp`);
      boundedApprovalText(approval.decidedBy, `Approval Request ${approval.id} decision actor`, 200);
    }
    if (approval.status === "consumed") {
      validApprovalDate(approval.consumedAt, `Approval Request ${approval.id} consumption timestamp`);
      boundedApprovalText(approval.consumedBy, `Approval Request ${approval.id} consumer`, 200);
    }
    if (approval.status === "cancelled") {
      validApprovalDate(approval.cancelledAt, `Approval Request ${approval.id} cancellation timestamp`);
      boundedApprovalText(approval.cancelledBy, `Approval Request ${approval.id} cancellation actor`, 200);
    }
    if (["pending", "approved"].includes(approval.status)) {
      unresolvedApprovalsByRun.set(approval.agentRunId, (unresolvedApprovalsByRun.get(approval.agentRunId) || 0) + 1);
    }
  }
  for (const [runId, count] of unresolvedApprovalsByRun) {
    if (count !== 1) throw new NeutralStoreError(`Agent Run ${runId} has multiple unresolved Approval Requests.`, 500);
    const unresolved = store.approvalRequests.find(item => item.agentRunId === runId && ["pending", "approved"].includes(item.status));
    if (unresolved?.runStateEffect === "preserve_terminal") {
      if (runById.get(runId).status !== "completed") throw new NeutralStoreError(`Post-Run Approval Request ${unresolved.id} requires a completed Agent Run.`, 500);
    } else if (runById.get(runId).status !== "waiting_approval") {
      throw new NeutralStoreError(`Agent Run ${runId} has an unresolved Approval Request but is not waiting for approval.`, 500);
    }
  }
  for (const run of store.agentRuns) {
    const unresolved = store.approvalRequests.find(item => item.agentRunId === run.id && ["pending", "approved"].includes(item.status) && item.runStateEffect !== "preserve_terminal");
    if (run.status === "waiting_approval" && !unresolved) {
      throw new NeutralStoreError(`Agent Run ${run.id} is waiting without one unresolved Approval Request.`, 500);
    }
  }
  const writebackByApprovalId = new Map();
  for (const writeback of store.issueWritebacks) {
    const run = runById.get(writeback.agentRunId);
    const issue = issueById.get(writeback.issueId);
    const link = externalLinkById.get(writeback.externalIssueLinkId);
    const approval = store.approvalRequests.find(item => item.id === writeback.approvalRequestId);
    if (!run || !issue || !link || link.issueId !== issue.id) throw new NeutralStoreError(`Issue write-back ${writeback.id} scope is invalid.`, 500);
    if (!approval || approval.agentRunId !== run.id || approval.issueWritebackId !== writeback.id || approval.capability !== "external.issue.write") {
      throw new NeutralStoreError(`Issue write-back ${writeback.id} Approval Request is invalid.`, 500);
    }
    if (writebackByApprovalId.has(approval.id)) throw new NeutralStoreError(`Approval Request ${approval.id} has multiple Issue write-backs.`, 500);
    writebackByApprovalId.set(approval.id, writeback.id);
    issueWritebackStatus(writeback.requestedStatus);
    if (!["awaiting_approval", "approved", "denied", "expired", "cancelled", "executing", "succeeded", "failed"].includes(writeback.status)) {
      throw new NeutralStoreError(`Issue write-back ${writeback.id} has an invalid status.`, 500);
    }
    boundedApprovalText(writeback.targetId, `Issue write-back ${writeback.id} target ID`, 500);
    validApprovalDate(writeback.createdAt, `Issue write-back ${writeback.id} creation timestamp`);
    validApprovalDate(writeback.updatedAt, `Issue write-back ${writeback.id} update timestamp`);
  }
  const activeWorktreeLocks = new Map();
  for (const worktree of store.managedWorktrees) {
    const repository = repositoryById.get(worktree.repositoryId);
    const task = taskById.get(worktree.agentTaskId);
    const run = runById.get(worktree.agentRunId);
    if (!repository) throw new NeutralStoreError(`Managed worktree ${worktree.id} Repository reference is invalid.`, 500);
    if (!task || task.repositoryId !== repository.id) throw new NeutralStoreError(`Managed worktree ${worktree.id} Agent Task scope is invalid.`, 500);
    if (!run || run.agentTaskId !== task.id) throw new NeutralStoreError(`Managed worktree ${worktree.id} Agent Run scope is invalid.`, 500);
    boundedWorktreePath(worktree.path);
    boundedWorktreePath(worktree.rootPath);
    gitCommitIdentifier(worktree.baseCommit);
    optionalBoundedApprovalText(worktree.baseBranch, `Managed worktree ${worktree.id} base branch`, 300);
    if (!["creating", "ready", "retained", "missing", "failed", "discarded"].includes(worktree.status)) {
      throw new NeutralStoreError(`Managed worktree ${worktree.id} has an invalid status.`, 500);
    }
    validApprovalDate(worktree.createdAt, `Managed worktree ${worktree.id} creation timestamp`);
    validApprovalDate(worktree.updatedAt, `Managed worktree ${worktree.id} update timestamp`);
    if (worktree.head) gitCommitIdentifier(worktree.head);
    if (worktree.errorCode) boundedApprovalText(worktree.errorCode, `Managed worktree ${worktree.id} error code`, 120);
    for (const [value, label] of [[worktree.inspectedAt, "inspection"], [worktree.retainedAt, "retention"], [worktree.discardedAt, "discard"]]) {
      if (value) validApprovalDate(value, `Managed worktree ${worktree.id} ${label} timestamp`);
    }
    if (worktree.status === "ready" && worktree.present !== true) throw new NeutralStoreError(`Managed worktree ${worktree.id} is ready but missing.`, 500);
    if (worktree.status === "discarded" && worktree.present === true) throw new NeutralStoreError(`Managed worktree ${worktree.id} is discarded but still marked present.`, 500);
    if (["creating", "ready"].includes(worktree.status)) {
      if (activeWorktreeLocks.has(repository.id)) throw new NeutralStoreError(`Repository ${repository.id} has multiple active modifying Run locks.`, 500);
      activeWorktreeLocks.set(repository.id, worktree.id);
    }
  }
  for (const event of store.fileChangeEvents) {
    const worktree = managedWorktreeById.get(event.managedWorktreeId);
    const run = runById.get(event.agentRunId);
    if (!worktree || !run || worktree.agentRunId !== run.id) throw new NeutralStoreError(`File change event ${event.id} Run/worktree scope is invalid.`, 500);
    paginationInteger(event.sequence, `File change event ${event.id} sequence`, null, 1, 50);
    if (!["apply_patch", "create_file"].includes(event.operation)) throw new NeutralStoreError(`File change event ${event.id} operation is invalid.`, 500);
    guardedRelativePath(event.relativePath);
    if (!["authorized", "completed", "failed"].includes(event.status)) throw new NeutralStoreError(`File change event ${event.id} status is invalid.`, 500);
    if (event.operation === "apply_patch") sha256Identifier(event.beforeSha256, `File change event ${event.id} before SHA-256`);
    else if (event.beforeSha256 != null) throw new NeutralStoreError(`Create-file event ${event.id} cannot have a before hash.`, 500);
    sha256Identifier(event.afterSha256, `File change event ${event.id} after SHA-256`);
    boundedFileByteCount(event.beforeBytes, `File change event ${event.id} before byte count`);
    boundedFileByteCount(event.afterBytes, `File change event ${event.id} after byte count`);
    validApprovalDate(event.createdAt, `File change event ${event.id} creation timestamp`);
    validApprovalDate(event.updatedAt, `File change event ${event.id} update timestamp`);
    if (event.status === "completed") validApprovalDate(event.completedAt, `File change event ${event.id} completion timestamp`);
    if (event.status === "failed") {
      validApprovalDate(event.failedAt, `File change event ${event.id} failure timestamp`);
      boundedApprovalText(event.errorCode, `File change event ${event.id} error code`, 120);
    }
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
  assertUnique(store.managedWorktrees.map(entity => entity.agentRunId), "Managed worktree Agent Run");
  assertUnique(store.managedWorktrees.map(entity => comparable(entity.path)), "Managed worktree path");
  assertUnique(store.fileChangeEvents.map(entity => `${entity.managedWorktreeId}\u0000${entity.sequence}`), "File change event sequence");
  assertUnique(store.runArtifacts.map(entity => `${entity.agentRunId}\u0000${entity.kind}\u0000${entity.contentHash}`), "Run Artifact content identity");

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
  normalized.repositories = normalized.repositories.map(repository => ({
    ...repository,
    verificationCommands: Array.isArray(repository.verificationCommands) ? repository.verificationCommands : []
  }));
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
  const organizationName = String(input.organizationName || "Rezzilla, Labs").trim();
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
  if (!["openai", "opencode"].includes(provider)) throw new NeutralStoreError("Harness provider must be openai or opencode.");
  return provider;
}

function assertNoHarnessApiConfiguration(input) {
  const forbidden = ["apiKey", "apiKeyReference", "baseUrl"].find(key => Object.hasOwn(input, key));
  if (forbidden) throw new NeutralStoreError("A CLI harness does not accept REST API credentials or a base URL; use the harness CLI's own login.");
}

function harnessAdapter(provider, value) {
  const defaults = { openai: "codex-cli", opencode: "opencode-cli" };
  const adapter = String(value || defaults[provider] || "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(adapter)) throw new NeutralStoreError("Harness adapter must be a lowercase identifier.");
  const allowed = { openai: ["codex-cli"], opencode: ["opencode-cli"] };
  if (!allowed[provider]?.includes(adapter)) throw new NeutralStoreError(`Harness adapter ${adapter} is not supported for ${provider}.`);
  return adapter;
}

function harnessAuthMode(provider, adapter, value) {
  const defaults = { "openai/codex-cli": "codex_session", "opencode/opencode-cli": "opencode_auth" };
  const authMode = String(value || defaults[`${provider}/${adapter}`] || "").trim().toLowerCase();
  if (provider === "openai" && adapter === "codex-cli" && authMode === "codex_session") return authMode;
  if (provider === "opencode" && adapter === "opencode-cli" && authMode === "opencode_auth") return authMode;
  if (provider === "openai") {
    throw new NeutralStoreError("The OpenAI Codex CLI harness must use the cached Codex session.");
  }
  throw new NeutralStoreError("The OpenCode CLI harness must use its stored CLI credentials (`opencode auth login`).");
}

function harnessCapabilities(provider, adapter) {
  if (provider === "openai" && adapter === "codex-cli") return ["codex_exec", "jsonl_events", "session_resume"];
  if (provider === "opencode" && adapter === "opencode-cli") return ["opencode_run", "json_events", "session_continue"];
  return [];
}

function harnessConfiguration(account, runtimeStatus) {
  const providerStatus = runtimeStatusForAccount(account, runtimeStatus);
  const status = ["ready", "cli_unavailable", "authentication_required"].includes(providerStatus.status)
    ? providerStatus.status
    : "cli_unavailable";
  return {
    status,
    installed: providerStatus.installed === true,
    authenticated: providerStatus.authenticated === true,
    version: optionalString(providerStatus.version)
  };
}

function runtimeStatusForAccount(account, runtimeStatus) {
  if (runtimeStatus && Object.hasOwn(runtimeStatus, "status")) return runtimeStatus;
  return runtimeStatus?.[account.provider] || {};
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

function agentModel(value, provider = "openai") {
  const model = agentModelIdentifier(value);
  const supported = provider === "opencode" ? supportedOpenCodeAgentModelIds : supportedAgentModelIds;
  if (!supported.has(model)) {
    const providerName = provider === "opencode" ? "OpenCode" : "OpenAI";
    throw new NeutralStoreError(`Agent Profile model must be selected from the supported ${providerName} model catalog.`);
  }
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

function runApprovalCapability(value) {
  const capability = requiredString(value, "Approval capability");
  if (!runApprovalCapabilities.has(capability)) throw new NeutralStoreError("Approval capability is not supported.");
  return capability;
}

function runApprovalTargetType(value) {
  const targetType = requiredString(value, "Approval target type");
  if (!runApprovalTargetTypes.has(targetType)) throw new NeutralStoreError("Approval target type is not supported.");
  return targetType;
}

function runApprovalRisk(value) {
  const risk = requiredString(value, "Approval risk level").toLowerCase();
  if (!["low", "medium", "high"].includes(risk)) throw new NeutralStoreError("Approval risk level must be low, medium, or high.");
  return risk;
}

function boundedApprovalText(value, label, maximum) {
  const text = requiredString(value, label);
  if (text.length > maximum || /[\0\r\n]/.test(text)) throw new NeutralStoreError(`${label} must be one line with at most ${maximum} characters.`);
  return text;
}

function optionalBoundedApprovalText(value, label, maximum) {
  const text = optionalString(value);
  return text ? boundedApprovalText(text, label, maximum) : null;
}

function approvalTimestamp(value) {
  const source = typeof value === "function" ? value() : value;
  return source == null ? new Date().toISOString() : validApprovalDate(source, "Approval timestamp");
}

function validApprovalDate(value, label) {
  const text = requiredString(value, label);
  const milliseconds = Date.parse(text);
  if (!Number.isFinite(milliseconds)) throw new NeutralStoreError(`${label} must be a valid ISO date.`);
  return new Date(milliseconds).toISOString();
}

function futureApprovalExpiry(value, now) {
  const expiresAt = validApprovalDate(value, "Approval expiry");
  const lifetime = Date.parse(expiresAt) - Date.parse(now);
  if (lifetime <= 0) throw new NeutralStoreError("Approval expiry must be in the future.");
  if (lifetime > 24 * 60 * 60 * 1_000) throw new NeutralStoreError("Approval expiry cannot be more than 24 hours after the request.");
  return expiresAt;
}

function isApprovalExpired(approval, now) {
  return Date.parse(approval.expiresAt) <= Date.parse(now);
}

function approvalForRun(store, agentRunId, approvalId) {
  const run = requireEntity(store.agentRuns, agentRunId, "Agent Run");
  const approval = requireEntity(store.approvalRequests, approvalId, "Approval Request");
  if (approval.agentRunId !== run.id) throw new NeutralStoreError("Approval Request belongs to another Agent Run.", 409);
  return { run, approval };
}

function consumeApprovalInStore(store, agentRunId, approvalId, input, now) {
  const { run, approval } = approvalForRun(store, agentRunId, approvalId);
  if (approval.status !== "approved") throw new NeutralStoreError("Only an approved, unused Approval Request can be consumed.", 409);
  if (approval.runStateEffect === "preserve_terminal") {
    if (run.status !== "completed") throw new NeutralStoreError("Post-Run approval requires a completed Agent Run.", 409);
  } else if (run.status !== "waiting_approval") throw new NeutralStoreError("Agent Run is not waiting for this approval.", 409);
  if (isApprovalExpired(approval, now)) {
    rejectApproval(store, run, approval, "expired", now);
    syncIssueWritebackApprovalStatus(store, approval, "expired", now);
    return { approval, run, consumed: false, reason: "expired" };
  }
  const requestedCapability = runApprovalCapability(input.capability);
  const requestedTargetType = runApprovalTargetType(input.targetType);
  const requestedTargetId = boundedApprovalText(input.targetId, "Approval target ID", 500);
  if (approval.capability !== requestedCapability || approval.targetType !== requestedTargetType || approval.targetId !== requestedTargetId) {
    throw new NeutralStoreError("Approval does not match the exact capability and target being consumed.", 409);
  }
  approval.status = "consumed";
  approval.consumedAt = now;
  approval.consumedBy = boundedApprovalText(input.actor, "Approval consumer", 200);
  approval.updatedAt = now;
  if (approval.runStateEffect !== "preserve_terminal") transitionRunAndTask(store, run, "running", now);
  return { approval, run, consumed: true, reason: "consumed" };
}

async function mutateManagedWorktree(filePath, id, mutator) {
  const mutation = await mutateStore(filePath, store => {
    const worktree = requireEntity(store.managedWorktrees, id, "Managed worktree");
    mutator(worktree, store);
    return structuredClone(worktree);
  });
  return { worktree: mutation.result, store: mutation.store };
}

async function mutateFileChangeEvent(filePath, id, mutator) {
  const mutation = await mutateStore(filePath, store => {
    const event = requireEntity(store.fileChangeEvents, id, "File change event");
    mutator(event, store);
    return structuredClone(event);
  });
  return { fileChangeEvent: mutation.result, store: mutation.store };
}

function guardedRelativePath(value) {
  const path = boundedApprovalText(value, "Guarded file relative path", 500).replaceAll("\\", "/");
  if (isAbsolute(path) || path === "." || path.startsWith("/") || path.split("/").some(part => !part || part === "." || part === "..")) {
    throw new NeutralStoreError("Guarded file path must identify one normalized relative file.");
  }
  return path;
}

function sha256Identifier(value, label) {
  const hash = requiredString(value, label);
  if (!/^[0-9a-f]{64}$/i.test(hash)) throw new NeutralStoreError(`${label} must be a full SHA-256 hash.`);
  return hash.toLowerCase();
}

function boundedFileByteCount(value, label) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0 || count > 256 * 1024) throw new NeutralStoreError(`${label} must be an integer from 0 to 262144.`);
  return count;
}

function boundedWorktreePath(value) {
  const path = boundedApprovalText(value, "Managed worktree path", 2_048);
  if (!isAbsolute(path)) throw new NeutralStoreError("Managed worktree path must be absolute.");
  return path;
}

function gitCommitIdentifier(value) {
  const commit = requiredString(value, "Git commit identifier");
  if (!/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/i.test(commit)) throw new NeutralStoreError("Git commit identifier must be a full object ID.");
  return commit.toLowerCase();
}

function transitionRunAndTask(store, run, status, now, terminal = false) {
  const task = requireEntity(store.agentTasks, run.agentTaskId, "Agent Task");
  run.status = status;
  run.updatedAt = now;
  run.completedAt = terminal ? now : null;
  task.status = status === "waiting_approval" ? "waiting_approval" : status;
  task.updatedAt = now;
  if (terminal) task.completedAt = null;
}

function rejectApproval(store, run, approval, status, now, actor = null) {
  approval.status = status;
  approval.updatedAt = now;
  if (actor) {
    approval.decidedAt ||= now;
    approval.decidedBy ||= actor;
  }
  if (approval.runStateEffect !== "preserve_terminal") {
    run.errorSummary = `approval_${status}`;
    transitionRunAndTask(store, run, "failed", now, true);
  }
}

function issueWritebackStatus(value) {
  const status = requiredString(value, "Requested Issue status").toLowerCase();
  if (!["todo", "done"].includes(status)) throw new NeutralStoreError("Issue write-back status must be todo or done.");
  return status;
}

function issueWritebackTarget(store, run, requestedStatus, expectedLinkId = null) {
  const task = requireEntity(store.agentTasks, run.agentTaskId, "Agent Task");
  if (!task.issueId) throw new NeutralStoreError("Agent Task is not linked to an Issue.", 409);
  const issue = requireEntity(store.issues, task.issueId, "Issue");
  const link = store.externalIssueLinks.find(item => item.issueId === issue.id && item.role === "origin");
  if (!link || (expectedLinkId && link.id !== expectedLinkId)) throw new NeutralStoreError("The authoritative Issue origin has changed.", 409);
  const source = requireEntity(store.productSources, link.productSourceId, "Product Source");
  const account = requireEntity(store.connectorAccounts, source.connectorAccountId, "Connector Account");
  const status = issueWritebackStatus(requestedStatus);
  return { task, issue, link, source, account, preview: issueWritebackPreview(issue, link, source, account, status) };
}

function issueWritebackPreview(issue, link, source, account, requestedStatus) {
  return {
    targetId: `${link.id}:status:${requestedStatus}`,
    issue: { id: issue.id, title: issue.title, currentStatus: issue.status, externalIssueId: link.externalIssueId, externalUrl: link.externalUrl },
    source: { id: source.id, provider: source.provider, displayName: source.displayName, externalContainerId: source.externalContainerId, accountName: account.displayName },
    currentStatus: issue.status,
    requestedStatus
  };
}

function issueWritebackProjection(store, writeback) {
  const issue = requireEntity(store.issues, writeback.issueId, "Issue");
  const link = requireEntity(store.externalIssueLinks, writeback.externalIssueLinkId, "External Issue Link");
  const source = requireEntity(store.productSources, writeback.productSourceId, "Product Source");
  const account = requireEntity(store.connectorAccounts, source.connectorAccountId, "Connector Account");
  return {
    ...structuredClone(writeback),
    preview: issueWritebackPreview(issue, link, source, account, writeback.requestedStatus)
  };
}

function syncIssueWritebackApprovalStatus(store, approval, status, now) {
  if (!approval.issueWritebackId) return;
  const writeback = requireEntity(store.issueWritebacks, approval.issueWritebackId, "Issue write-back");
  writeback.status = status;
  writeback.updatedAt = now;
  if (["denied", "expired", "cancelled"].includes(status)) writeback.completedAt = now;
}

function validateRunRecovery(run) {
  if (!isPlainObject(run.recovery)) throw new NeutralStoreError(`Agent Run ${run.id} recovery evidence is invalid.`, 500);
  if (!["retryable", "manual_review"].includes(run.recovery.classification)) throw new NeutralStoreError(`Agent Run ${run.id} recovery classification is invalid.`, 500);
  if (!["server_restart_during_run", "server_restart_during_approval"].includes(run.recovery.reason)) throw new NeutralStoreError(`Agent Run ${run.id} recovery reason is invalid.`, 500);
  if (!["queued", "running", "waiting_approval"].includes(run.recovery.originalStatus)) throw new NeutralStoreError(`Agent Run ${run.id} recovery original status is invalid.`, 500);
  validApprovalDate(run.recovery.recoveredAt, `Agent Run ${run.id} recovery timestamp`);
  if (run.recovery.automaticReplay !== false) throw new NeutralStoreError(`Agent Run ${run.id} recovery cannot report an automatic replay.`, 500);
  if (run.recovery.acknowledgedAt) {
    validApprovalDate(run.recovery.acknowledgedAt, `Agent Run ${run.id} recovery acknowledgement timestamp`);
    boundedApprovalText(run.recovery.acknowledgedBy, `Agent Run ${run.id} recovery actor`, 200);
  }
}

function runDurationMilliseconds(run, fallbackNow) {
  const started = Date.parse(run.startedAt || run.createdAt || "");
  const endValue = run.completedAt || (["queued", "running", "waiting_approval"].includes(run.status) ? fallbackNow : run.updatedAt);
  const ended = typeof endValue === "number" ? endValue : Date.parse(endValue || "");
  const effectiveEnd = Number.isFinite(ended) ? ended : fallbackNow;
  return Number.isFinite(started) && Number.isFinite(effectiveEnd) && effectiveEnd >= started ? effectiveEnd - started : null;
}

function addOperationalUsage(total, usage) {
  if (!usage || typeof usage !== "object") return total;
  const read = (...keys) => keys.map(key => Number(usage[key])).find(Number.isFinite) || 0;
  total.inputTokens += read("input_tokens", "inputTokens");
  total.cachedInputTokens += read("cached_input_tokens", "cachedInputTokens");
  total.outputTokens += read("output_tokens", "outputTokens");
  total.reasoningOutputTokens += read("reasoning_output_tokens", "reasoningOutputTokens");
  return total;
}

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = operationalCode(selector(item));
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function operationalDurationSummary(values) {
  if (!values.length) return { count: 0, average: 0, maximum: 0 };
  return { count: values.length, average: Math.round(values.reduce((total, value) => total + value, 0) / values.length), maximum: Math.max(...values) };
}

function operationalCode(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9_-]+/g, "_").slice(0, 120) || "unknown";
}

function operationalFailureCode(value, status) {
  const code = operationalCode(value || status);
  if (/^(timeout|cancelled|interrupted|unexpected_tool_activity|execution_failure|server_restart_interrupted|codex_(?:cli_)?(?:unavailable|authentication_required)|approval_(?:denied|expired|cancelled))$/.test(code)) return code;
  return status === "cancelled" ? "cancelled" : status === "interrupted" ? "interrupted" : "run_failed";
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

const runArtifactKinds = new Set(["final_output", "changed_files", "patch", "test_report", "bounded_log", "error_report"]);

function normalizedRunArtifact(agentRunId, input) {
  if (!isPlainObject(input)) throw new NeutralStoreError("Run Artifact must be an object.");
  const kind = requiredString(input.kind, "Run Artifact kind");
  if (!runArtifactKinds.has(kind)) throw new NeutralStoreError("Run Artifact kind is not supported.");
  const contentHash = sha256Identifier(input.contentHash, "Run Artifact content hash");
  const storageReference = boundedApprovalText(input.storageReference, "Run Artifact storage reference", 200);
  if (!/^[a-f0-9]{64}\.artifact$/.test(storageReference) || storageReference !== `${contentHash}.artifact`) throw new NeutralStoreError("Run Artifact storage reference must match its content hash.");
  const sizeBytes = boundedInteger(input.sizeBytes, "Run Artifact size", 0, 1_048_576, 0);
  const createdAt = validApprovalDate(input.createdAt, "Run Artifact creation timestamp");
  const retentionUntil = validApprovalDate(input.retentionUntil, "Run Artifact retention timestamp");
  if (Date.parse(retentionUntil) <= Date.parse(createdAt)) throw new NeutralStoreError("Run Artifact retention must be after creation.");
  const mimeType = boundedApprovalText(input.mimeType || "text/plain", "Run Artifact MIME type", 100);
  const redactionCount = boundedInteger(input.redactionCount, "Run Artifact redaction count", 0, 100_000, 0);
  const metadata = isPlainObject(input.metadata) ? structuredClone(input.metadata) : {};
  const id = boundedApprovalText(input.id, "Run Artifact ID", 200);
  return { id, agentRunId, kind, storageReference, contentHash, sizeBytes, mimeType, redactionCount, retentionUntil, metadata, createdAt };
}

const verificationEnvironmentKeys = new Set(["CI", "NODE_ENV", "TZ", "NO_COLOR", "FORCE_COLOR"]);
const prohibitedVerificationExecutables = new Set([
  "sh", "bash", "dash", "zsh", "fish", "cmd", "cmd.exe", "powershell", "powershell.exe", "pwsh", "pwsh.exe", "wsl", "wsl.exe", "env"
]);

function verificationCommandPolicies(value) {
  if (!Array.isArray(value)) throw new NeutralStoreError("Verification commands must be an array.");
  if (value.length > 20) throw new NeutralStoreError("A Repository can configure at most 20 verification commands.");
  const commands = value.map(verificationCommandPolicy);
  assertUnique(commands.map(command => command.id), "Verification command policy ID");
  assertUnique(commands.map(command => comparable(command.name)), "Verification command name");
  return commands;
}

function verificationCommandPolicy(value) {
  if (!isPlainObject(value)) throw new NeutralStoreError("Each verification command must be an object.");
  const name = boundedApprovalText(value.name, "Verification command name", 120);
  const executable = boundedApprovalText(value.executable, "Verification command executable", 1_000);
  if (!isAbsolute(executable)) throw new NeutralStoreError("Verification command executable must be an absolute path.");
  if (prohibitedVerificationExecutables.has(basename(executable).toLowerCase())) {
    throw new NeutralStoreError("Shell interpreters cannot be configured as verification executables.");
  }
  if (/\.(?:cmd|bat|ps1)$/i.test(executable)) throw new NeutralStoreError("Shell script files cannot be configured as verification executables.");
  if (!Array.isArray(value.args) || value.args.length > 32) throw new NeutralStoreError("Verification command args must contain at most 32 exact arguments.");
  const args = value.args.map((argument, index) => boundedApprovalText(argument, `Verification command argument ${index + 1}`, 1_000));
  if (args.reduce((total, argument) => total + argument.length, 0) > 8_000) throw new NeutralStoreError("Verification command arguments exceed the 8000 character limit.");
  const workingDirectory = verificationWorkingDirectory(value.workingDirectory);
  const environment = verificationEnvironment(value.environment);
  const timeoutMs = boundedInteger(value.timeoutMs, "Verification command timeout", 1_000, 300_000, 120_000);
  const maxOutputBytes = boundedInteger(value.maxOutputBytes, "Verification command output limit", 1_024, 262_144, 65_536);
  const specification = { name, executable, args, workingDirectory, environment, timeoutMs, maxOutputBytes };
  const id = `verification-command-${createHash("sha256").update(JSON.stringify(specification)).digest("hex").slice(0, 24)}`;
  return { id, ...specification };
}

function verificationWorkingDirectory(value) {
  const directory = String(value || ".").trim().replaceAll("\\", "/");
  if (directory === ".") return directory;
  if (directory.length > 500 || isAbsolute(directory) || directory.startsWith("/") || /[\0\r\n]/.test(directory) || directory.split("/").some(part => !part || part === "." || part === "..")) {
    throw new NeutralStoreError("Verification command working directory must be a normalized relative directory.");
  }
  return directory;
}

function verificationEnvironment(value) {
  const input = value == null ? {} : value;
  if (!isPlainObject(input) || Object.keys(input).length > 8) throw new NeutralStoreError("Verification command environment must be an object with at most 8 allowlisted keys.");
  const environment = {};
  for (const [key, raw] of Object.entries(input).sort(([left], [right]) => left.localeCompare(right))) {
    if (!verificationEnvironmentKeys.has(key)) throw new NeutralStoreError(`Verification command environment key ${key} is not allowlisted.`);
    environment[key] = boundedApprovalText(raw, `Verification command environment ${key}`, 200);
  }
  return environment;
}

function boundedInteger(value, label, minimum, maximum, fallback) {
  const number = value == null || value === "" ? fallback : Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) throw new NeutralStoreError(`${label} must be an integer between ${minimum} and ${maximum}.`);
  return number;
}

function resetRepositoryVerification(repository) {
  repository.resolvedPath = null;
  repository.verificationStatus = "unverified";
  repository.verifiedAt = null;
  repository.verificationError = null;
  repository.gitMetadata = null;
  repository.lastInspectedAt = null;
}

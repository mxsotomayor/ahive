import { realpath, stat } from "node:fs/promises";
import { delimiter, isAbsolute, relative, resolve } from "node:path";

export class RepositoryPathError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "RepositoryPathError";
    this.status = status;
  }
}

export function parseRepositoryRoots(value) {
  return String(value || "").split(delimiter).map(item => item.trim()).filter(Boolean);
}

export async function verifyRepositoryPath(localPath, configuredRoots) {
  const requested = String(localPath || "").trim();
  if (!requested) throw new RepositoryPathError("Repository local path is required.");
  if (!isAbsolute(requested)) throw new RepositoryPathError("Repository local path must be absolute.");
  if (!Array.isArray(configuredRoots) || configuredRoots.length === 0) {
    throw new RepositoryPathError("No repository roots are configured in AHIVE_REPOSITORY_ROOTS.", 503);
  }

  const roots = [];
  for (const configuredRoot of configuredRoots) {
    if (!isAbsolute(configuredRoot)) throw new RepositoryPathError(`Configured repository root must be absolute: ${configuredRoot}.`, 500);
    try {
      const canonical = await realpath(resolve(configuredRoot));
      const details = await stat(canonical);
      if (!details.isDirectory()) throw new RepositoryPathError(`Configured repository root is not a directory: ${configuredRoot}.`, 500);
      roots.push(canonical);
    } catch (error) {
      if (error instanceof RepositoryPathError) throw error;
      throw new RepositoryPathError(`Configured repository root is unavailable: ${configuredRoot}.`, 500);
    }
  }

  let canonical;
  try {
    canonical = await realpath(resolve(requested));
    const details = await stat(canonical);
    if (!details.isDirectory()) throw new RepositoryPathError("Repository path must identify a directory.");
  } catch (error) {
    if (error instanceof RepositoryPathError) throw error;
    throw new RepositoryPathError("Repository path does not exist or cannot be accessed.");
  }

  const containingRoot = roots.find(root => isContained(root, canonical));
  if (!containingRoot) throw new RepositoryPathError("Repository path is outside the configured repository roots.", 403);
  return { valid: true, resolvedPath: canonical, root: containingRoot };
}

export function isContained(root, candidate) {
  const child = relative(root, candidate);
  return child === "" || (!child.startsWith("..") && !isAbsolute(child));
}

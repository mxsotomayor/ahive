import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const emptyStore = () => ({ version: 1, issues: [], meta: {}, updatedAt: null });

export async function readCanonicalStore(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return { ...emptyStore(), ...parsed, issues: Array.isArray(parsed.issues) ? parsed.issues : [] };
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return emptyStore();
    throw error;
  }
}

export async function writeCanonicalStore(filePath, store) {
  await mkdir(dirname(filePath), { recursive: true });
  const payload = {
    version: 1,
    issues: Array.isArray(store.issues) ? store.issues : [],
    meta: store.meta || {},
    updatedAt: new Date().toISOString()
  };
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
  return payload;
}

export async function replaceCanonicalIssues(filePath, issues, gitlabMeta) {
  const existing = await readCanonicalStore(filePath);
  return writeCanonicalStore(filePath, {
    ...existing,
    issues,
    meta: { ...existing.meta, gitlab: gitlabMeta }
  });
}

export async function updateCanonicalIssue(filePath, predicate, changes) {
  const existing = await readCanonicalStore(filePath);
  const issues = existing.issues.map(issue => predicate(issue) ? { ...issue, ...changes } : issue);
  return writeCanonicalStore(filePath, { ...existing, issues });
}

import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parse, type Program } from "acorn";
import type { FileRole, ManifestFile, SourceFile } from "./types.js";

/** Raised for problems that stop us from checking anything at all. */
export class LoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoadError";
  }
}

export interface LoadedExtension {
  readonly manifest: ManifestFile;
  readonly sources: readonly SourceFile[];
  /** Scripts the manifest references but that are absent or unreadable. */
  readonly missing: readonly string[];
}

const MANIFEST_FILENAME = "manifest.json";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asStringArray = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/**
 * Resolves a manifest-declared path, refusing anything that escapes the
 * extension root. Manifest content is untrusted input.
 */
const resolveWithinRoot = (root: string, relPath: string): string | null => {
  const absolute = resolve(root, relPath);
  const rel = relative(root, absolute);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return null;
  return absolute;
};

interface ScriptRef {
  readonly relPath: string;
  readonly role: FileRole;
}

/**
 * Collects every JavaScript file the manifest points at, tagged with the role
 * it plays. Role is what makes rules precise rather than generic.
 */
export const collectScriptRefs = (manifestJson: Record<string, unknown>): readonly ScriptRef[] => {
  const refs: ScriptRef[] = [];

  const background = asRecord(manifestJson["background"]);
  if (background) {
    const worker = background["service_worker"];
    if (typeof worker === "string") {
      refs.push({ relPath: worker, role: "service-worker" });
    }
    // `background.scripts` is Manifest V2; a dedicated rule flags it, but we
    // still analyse the files so other rules can report on them.
    for (const script of asStringArray(background["scripts"])) {
      refs.push({ relPath: script, role: "background-page" });
    }
  }

  const contentScripts = Array.isArray(manifestJson["content_scripts"])
    ? manifestJson["content_scripts"]
    : [];
  for (const entry of contentScripts) {
    const record = asRecord(entry);
    if (!record) continue;
    for (const script of asStringArray(record["js"])) {
      refs.push({ relPath: script, role: "content-script" });
    }
  }

  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.role}:${ref.relPath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Parses JavaScript into an ESTree-shaped AST. Service workers are modules,
 * content scripts are classic scripts, so both are attempted.
 * Returns null when the file cannot be parsed — source rules then skip it
 * rather than the whole run failing.
 */
export const parseScript = (text: string): Program | null => {
  for (const sourceType of ["module", "script"] as const) {
    try {
      return parse(text, { ecmaVersion: "latest", sourceType, locations: true });
    } catch {
      // Try the other source type before giving up.
    }
  }
  return null;
};

export const loadManifest = async (extensionRoot: string): Promise<ManifestFile> => {
  const absolutePath = join(extensionRoot, MANIFEST_FILENAME);

  let raw: string;
  try {
    raw = await readFile(absolutePath, "utf8");
  } catch {
    throw new LoadError(
      `No ${MANIFEST_FILENAME} found in ${extensionRoot}. Point mv3-doctor at an extension directory.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new LoadError(`${MANIFEST_FILENAME} is not valid JSON: ${detail}`);
  }

  const json = asRecord(parsed);
  if (!json) {
    throw new LoadError(`${MANIFEST_FILENAME} must contain a JSON object.`);
  }

  return { absolutePath, path: MANIFEST_FILENAME, raw, json };
};

export const loadExtension = async (extensionRoot: string): Promise<LoadedExtension> => {
  const root = resolve(extensionRoot);
  const manifest = await loadManifest(root);

  const sources: SourceFile[] = [];
  const missing: string[] = [];

  for (const ref of collectScriptRefs(manifest.json)) {
    const absolutePath = resolveWithinRoot(root, ref.relPath);
    if (!absolutePath) {
      missing.push(`${ref.relPath} (refused: path escapes the extension directory)`);
      continue;
    }

    let text: string;
    try {
      text = await readFile(absolutePath, "utf8");
    } catch {
      missing.push(ref.relPath);
      continue;
    }

    sources.push({
      absolutePath,
      path: ref.relPath,
      role: ref.role,
      text,
      ast: parseScript(text),
    });
  }

  return { manifest, sources, missing };
};

/** Programmatic API. The CLI is a thin wrapper over these. */

export { diagnose } from "./engine.js";
export { loadExtension, loadManifest, LoadError } from "./loader.js";
export type { LoadedExtension } from "./loader.js";
export { allRules, rulesById } from "./rules/index.js";
export { countBySeverity, formatHuman, formatJson } from "./report.js";
export { docsUrlFor, REPO_URL } from "./constants.js";
export type {
  DiagnoseResult,
  Finding,
  FileRole,
  ManifestFile,
  ManifestRule,
  ManifestRuleContext,
  RawFinding,
  Rule,
  Severity,
  SourceFile,
  SourceRule,
  SourceRuleContext,
} from "./types.js";

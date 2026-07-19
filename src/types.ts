import type { Program } from "acorn";

export type Severity = "error" | "warning" | "info";

/**
 * The part an extension file plays, derived from manifest.json.
 * Knowing this is what lets rules be precise: `setInterval` is a bug in a
 * service worker but perfectly fine in a popup.
 */
export type FileRole =
  | "service-worker"
  | "content-script"
  | "background-page"
  | "unknown";

/** A parsed manifest.json. */
export interface ManifestFile {
  /** Absolute path on disk. */
  readonly absolutePath: string;
  /** Path relative to the extension root, for display. */
  readonly path: string;
  readonly raw: string;
  readonly json: Readonly<Record<string, unknown>>;
}

/** A JavaScript file referenced by the manifest. */
export interface SourceFile {
  readonly absolutePath: string;
  /** Path relative to the extension root, for display. */
  readonly path: string;
  readonly role: FileRole;
  readonly text: string;
  /** null when the file could not be parsed; source rules are skipped then. */
  readonly ast: Program | null;
}

/**
 * What a rule returns. Deliberately minimal — the engine fills in ruleId,
 * file, severity and docsUrl — so adding a rule stays a few lines of code.
 */
export interface RawFinding {
  readonly message: string;
  /** 1-based line number, when the rule can point at one. */
  readonly line?: number;
  /** 1-based column number. */
  readonly column?: number;
  /** Concrete advice on how to fix it. */
  readonly hint?: string;
  /** Overrides the rule's default severity for this one finding. */
  readonly severity?: Severity;
}

/** A fully resolved problem, ready to report. */
export interface Finding {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly message: string;
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
  readonly hint?: string;
  readonly docsUrl: string;
}

export interface ManifestRuleContext {
  readonly manifest: ManifestFile;
}

export interface SourceRuleContext {
  readonly file: SourceFile;
  /** Guaranteed non-null — the engine skips files it could not parse. */
  readonly ast: Program;
  readonly manifest: ManifestFile;
}

interface RuleBase {
  /** Kebab-case, matches the docs filename. */
  readonly id: string;
  readonly severity: Severity;
  /** One line, shown in `--help` and the README rule table. */
  readonly description: string;
}

export interface ManifestRule extends RuleBase {
  readonly target: "manifest";
  check(ctx: ManifestRuleContext): readonly RawFinding[];
}

export interface SourceRule extends RuleBase {
  readonly target: "source";
  /** Only run on files playing these roles. Omit to run on every script. */
  readonly roles?: readonly FileRole[];
  check(ctx: SourceRuleContext): readonly RawFinding[];
}

export type Rule = ManifestRule | SourceRule;

export interface DiagnoseResult {
  readonly findings: readonly Finding[];
  readonly filesChecked: number;
  readonly rulesRun: number;
}

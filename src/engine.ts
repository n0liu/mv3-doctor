import { DISABLE_FILE, DISABLE_NEXT_LINE, docsUrlFor } from "./constants.js";
import type { LoadedExtension } from "./loader.js";
import type {
  DiagnoseResult,
  Finding,
  ManifestRule,
  RawFinding,
  Rule,
  SourceFile,
  SourceRule,
} from "./types.js";

/** Built-in checks that are not user-contributed rules. */
export const MISSING_SCRIPT_RULE_ID = "missing-referenced-script";
export const RULE_CRASHED_RULE_ID = "rule-crashed";

const buildFinding = (
  ruleId: string,
  defaultSeverity: Finding["severity"],
  raw: RawFinding,
  file: string,
): Finding => ({
  ruleId,
  severity: raw.severity ?? defaultSeverity,
  message: raw.message,
  file,
  line: raw.line,
  column: raw.column,
  hint: raw.hint,
  docsUrl: docsUrlFor(ruleId),
});

/**
 * Lines suppressed by a `// mv3-doctor-disable-next-line` comment.
 * Returned line numbers are 1-based, matching finding locations.
 */
const suppressedLines = (text: string): ReadonlySet<number> => {
  const suppressed = new Set<number>();
  text.split(/\r?\n/).forEach((line, index) => {
    if (line.includes(DISABLE_NEXT_LINE)) suppressed.add(index + 2);
  });
  return suppressed;
};

/**
 * Runs one rule, converting a thrown error into a visible finding instead of
 * failing the whole run — a broken rule should not hide every other result.
 */
const runRule = (
  rule: Rule,
  file: string,
  invoke: () => readonly RawFinding[],
): readonly Finding[] => {
  try {
    return invoke().map((raw) => buildFinding(rule.id, rule.severity, raw, file));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [
      buildFinding(
        RULE_CRASHED_RULE_ID,
        "warning",
        {
          message: `Rule "${rule.id}" threw while checking this file: ${detail}`,
          hint: "This is a bug in the rule, not in the extension. Please report it.",
        },
        file,
      ),
    ];
  }
};

const compareFindings = (a: Finding, b: Finding): number =>
  a.file.localeCompare(b.file) ||
  (a.line ?? 0) - (b.line ?? 0) ||
  (a.column ?? 0) - (b.column ?? 0) ||
  a.ruleId.localeCompare(b.ruleId);

const checkSourceFile = (
  file: SourceFile,
  rules: readonly SourceRule[],
  extension: LoadedExtension,
): readonly Finding[] => {
  if (file.text.includes(DISABLE_FILE)) return [];

  const ast = file.ast;
  if (!ast) {
    return [
      buildFinding(
        RULE_CRASHED_RULE_ID,
        "warning",
        {
          message: "Could not parse this file as JavaScript, so source rules were skipped.",
          hint: "If it is TypeScript or JSX, run mv3-doctor on the built output instead.",
        },
        file.path,
      ),
    ];
  }

  const suppressed = suppressedLines(file.text);

  return rules
    .filter((rule) => !rule.roles || rule.roles.includes(file.role))
    .flatMap((rule) =>
      runRule(rule, file.path, () => rule.check({ file, ast, manifest: extension.manifest })),
    )
    .filter((finding) => finding.line === undefined || !suppressed.has(finding.line));
};

export const diagnose = (
  extension: LoadedExtension,
  rules: readonly Rule[],
): DiagnoseResult => {
  const manifestRules = rules.filter((rule): rule is ManifestRule => rule.target === "manifest");
  const sourceRules = rules.filter((rule): rule is SourceRule => rule.target === "source");

  const missingFindings = extension.missing.map((relPath) =>
    buildFinding(
      MISSING_SCRIPT_RULE_ID,
      "error",
      {
        message: `manifest.json references "${relPath}", but it could not be read.`,
        hint: "Fix the path, or build the extension before checking it.",
      },
      extension.manifest.path,
    ),
  );

  const manifestFindings = manifestRules.flatMap((rule) =>
    runRule(rule, extension.manifest.path, () => rule.check({ manifest: extension.manifest })),
  );

  const sourceFindings = extension.sources.flatMap((file) =>
    checkSourceFile(file, sourceRules, extension),
  );

  const findings = [...missingFindings, ...manifestFindings, ...sourceFindings].sort(
    compareFindings,
  );

  return {
    findings,
    filesChecked: extension.sources.length + 1,
    rulesRun: rules.length,
  };
};

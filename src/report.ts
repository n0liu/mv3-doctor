import type { DiagnoseResult, Finding, Severity } from "./types.js";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  underline: "\x1b[4m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
} as const;

const SEVERITY_COLOR: Readonly<Record<Severity, string>> = {
  error: ANSI.red,
  warning: ANSI.yellow,
  info: ANSI.cyan,
};

export const countBySeverity = (
  findings: readonly Finding[],
): Readonly<Record<Severity, number>> =>
  findings.reduce<Record<Severity, number>>(
    (counts, finding) => ({ ...counts, [finding.severity]: counts[finding.severity] + 1 }),
    { error: 0, warning: 0, info: 0 },
  );

const groupByFile = (findings: readonly Finding[]): ReadonlyMap<string, readonly Finding[]> => {
  const groups = new Map<string, Finding[]>();
  for (const finding of findings) {
    const existing = groups.get(finding.file);
    if (existing) existing.push(finding);
    else groups.set(finding.file, [finding]);
  }
  return groups;
};

const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

interface FormatOptions {
  readonly color: boolean;
}

export const formatHuman = (result: DiagnoseResult, options: FormatOptions): string => {
  const paint = (code: string, text: string): string =>
    options.color ? `${code}${text}${ANSI.reset}` : text;

  if (result.findings.length === 0) {
    return paint(
      ANSI.bold,
      `No Manifest V3 problems found (${pluralize(result.filesChecked, "file")}, ${pluralize(result.rulesRun, "rule")}).`,
    );
  }

  const blocks: string[] = [];

  for (const [file, findings] of groupByFile(result.findings)) {
    const lines = [paint(ANSI.underline, file)];

    for (const finding of findings) {
      const location = finding.line === undefined ? "" : `${finding.line}:${finding.column ?? 1}`;
      const severity = paint(SEVERITY_COLOR[finding.severity], finding.severity.padEnd(7));

      lines.push(
        `  ${severity} ${paint(ANSI.dim, location.padEnd(7))} ${finding.message}  ${paint(ANSI.dim, finding.ruleId)}`,
      );
      if (finding.hint) {
        lines.push(`          ${paint(ANSI.dim, `→ ${finding.hint}`)}`);
      }
      lines.push(`          ${paint(ANSI.dim, finding.docsUrl)}`);
    }

    blocks.push(lines.join("\n"));
  }

  const counts = countBySeverity(result.findings);
  const parts = [
    counts.error > 0 ? paint(ANSI.red, pluralize(counts.error, "error")) : null,
    counts.warning > 0 ? paint(ANSI.yellow, pluralize(counts.warning, "warning")) : null,
    counts.info > 0 ? paint(ANSI.cyan, pluralize(counts.info, "info")) : null,
  ].filter((part): part is string => part !== null);

  blocks.push(
    paint(ANSI.bold, `${pluralize(result.findings.length, "problem")} (${parts.join(", ")})`),
  );

  return blocks.join("\n\n");
};

export const formatJson = (result: DiagnoseResult): string =>
  JSON.stringify(
    {
      findings: result.findings,
      summary: {
        ...countBySeverity(result.findings),
        total: result.findings.length,
        filesChecked: result.filesChecked,
        rulesRun: result.rulesRun,
      },
    },
    null,
    2,
  );

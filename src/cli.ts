#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { diagnose } from "./engine.js";
import { LoadError, loadExtension } from "./loader.js";
import { countBySeverity, formatHuman, formatJson } from "./report.js";
import { allRules } from "./rules/index.js";
import { REPO_URL } from "./constants.js";
import type { DiagnoseResult } from "./types.js";

const EXIT_OK = 0;
const EXIT_PROBLEMS_FOUND = 1;
const EXIT_USAGE_ERROR = 2;

interface CliOptions {
  readonly directory: string;
  readonly json: boolean;
  readonly color: boolean;
  readonly help: boolean;
  readonly version: boolean;
}

const readVersion = (): string => {
  try {
    const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
    const parsed: unknown = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    if (typeof parsed === "object" && parsed !== null && "version" in parsed) {
      const { version } = parsed as { version: unknown };
      if (typeof version === "string") return version;
    }
  } catch {
    // Fall through to the placeholder below.
  }
  return "unknown";
};

const colorSupported = (): boolean =>
  process.stdout.isTTY === true && process.env["NO_COLOR"] === undefined;

/** Parses argv, returning either options or a usage message to show. */
const parseArgs = (argv: readonly string[]): CliOptions | { readonly error: string } => {
  const positional: string[] = [];
  let json = false;
  let color = colorSupported();
  let help = false;
  let version = false;

  for (const arg of argv) {
    switch (arg) {
      case "--json":
        json = true;
        break;
      case "--no-color":
        color = false;
        break;
      case "--color":
        color = true;
        break;
      case "-h":
      case "--help":
        help = true;
        break;
      case "-v":
      case "--version":
        version = true;
        break;
      default:
        if (arg.startsWith("-")) return { error: `Unknown option: ${arg}` };
        positional.push(arg);
    }
  }

  if (positional.length > 1) {
    return { error: "Expected at most one directory argument." };
  }

  return { directory: positional[0] ?? ".", json, color, help, version };
};

const helpText = (): string => {
  const rules = allRules
    .map((rule) => `  ${rule.severity.padEnd(8)} ${rule.id.padEnd(45)} ${rule.description}`)
    .join("\n");

  return [
    "mv3-doctor — diagnose Chrome Manifest V3 extension pitfalls.",
    "",
    "Usage:",
    "  mv3-doctor [directory]      Check the extension in <directory> (default: .)",
    "",
    "Options:",
    "  --json          Machine-readable output, for editors and AI agents",
    "  --color         Force ANSI colour  (--no-color disables it)",
    "  -v, --version   Print the version",
    "  -h, --help      Show this help",
    "",
    "Exit codes:",
    `  ${EXIT_OK}  no errors (warnings may still be reported)`,
    `  ${EXIT_PROBLEMS_FOUND}  at least one error`,
    `  ${EXIT_USAGE_ERROR}  the extension could not be read`,
    "",
    `Rules (${allRules.length}):`,
    rules,
    "",
    REPO_URL,
  ].join("\n");
};

const main = async (): Promise<number> => {
  const parsed = parseArgs(process.argv.slice(2));

  if ("error" in parsed) {
    process.stderr.write(`${parsed.error}\nRun mv3-doctor --help for usage.\n`);
    return EXIT_USAGE_ERROR;
  }

  if (parsed.help) {
    process.stdout.write(`${helpText()}\n`);
    return EXIT_OK;
  }

  if (parsed.version) {
    process.stdout.write(`${readVersion()}\n`);
    return EXIT_OK;
  }

  let result: DiagnoseResult;
  try {
    const extension = await loadExtension(parsed.directory);
    result = diagnose(extension, allRules);
  } catch (error) {
    const message = error instanceof LoadError ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return EXIT_USAGE_ERROR;
  }

  const output = parsed.json ? formatJson(result) : formatHuman(result, { color: parsed.color });
  process.stdout.write(`${output}\n`);

  return countBySeverity(result.findings).error > 0 ? EXIT_PROBLEMS_FOUND : EXIT_OK;
};

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`Unexpected failure: ${String(error)}\n`);
    process.exitCode = EXIT_USAGE_ERROR;
  });

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  allRules,
  countBySeverity,
  diagnose,
  formatHuman,
  formatJson,
  loadExtension,
} from "../src/index.js";
import type { DiagnoseResult } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): string => join(here, "fixtures", name);

const run = async (name: string): Promise<DiagnoseResult> =>
  diagnose(await loadExtension(fixture(name)), allRules);

// eslint-disable-next-line no-control-regex
const ANSI = /\x1b\[[0-9;]*m/;

describe("formatHuman", () => {
  it("summarises a clean extension without listing findings", async () => {
    const text = formatHuman(await run("clean"), { color: false });
    expect(text).toContain("No Manifest V3 problems found");
    expect(text).toContain("2 files");
  });

  it("groups findings by file and ends with a problem count", async () => {
    const text = formatHuman(await run("broken"), { color: false });
    expect(text).toContain("background.js");
    expect(text).toContain("manifest.json");
    expect(text).toContain("no-timers-in-service-worker");
    expect(text).toMatch(/\d+ problems \(/);
  });

  it("includes the hint and docs URL for a finding", async () => {
    const text = formatHuman(await run("broken"), { color: false });
    expect(text).toContain("→ ");
    expect(text).toContain("/docs/rules/");
  });

  it("emits no ANSI escapes when color is off", async () => {
    const text = formatHuman(await run("broken"), { color: false });
    expect(text).not.toMatch(ANSI);
  });

  it("emits ANSI escapes when color is on", async () => {
    const text = formatHuman(await run("broken"), { color: true });
    expect(text).toMatch(ANSI);
  });
});

describe("formatJson", () => {
  it("produces valid JSON with a summary that matches the findings", async () => {
    const result = await run("broken");
    const parsed = JSON.parse(formatJson(result)) as {
      findings: unknown[];
      summary: { total: number; error: number; warning: number; filesChecked: number };
    };

    expect(parsed.findings).toHaveLength(result.findings.length);
    expect(parsed.summary.total).toBe(result.findings.length);
    expect(parsed.summary.filesChecked).toBe(result.filesChecked);

    const counts = countBySeverity(result.findings);
    expect(parsed.summary.error).toBe(counts.error);
    expect(parsed.summary.warning).toBe(counts.warning);
  });
});

describe("countBySeverity", () => {
  it("returns all-zero counts for an empty finding list", () => {
    expect(countBySeverity([])).toEqual({ error: 0, warning: 0, info: 0 });
  });
});

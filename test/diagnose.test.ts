import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { allRules, diagnose, LoadError, loadExtension } from "../src/index.js";
import type { DiagnoseResult, Finding } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): string => join(here, "fixtures", name);

const run = async (name: string): Promise<DiagnoseResult> =>
  diagnose(await loadExtension(fixture(name)), allRules);

const inFile = (result: DiagnoseResult, file: string): readonly Finding[] =>
  result.findings.filter((finding) => finding.file === file);

const ruleIdsIn = (result: DiagnoseResult, file: string): readonly string[] =>
  inFile(result, file).map((finding) => finding.ruleId);

describe("a clean extension", () => {
  it("reports nothing", async () => {
    const result = await run("clean");
    expect(result.findings).toEqual([]);
  });

  it("still reports how much was checked", async () => {
    const result = await run("clean");
    expect(result.filesChecked).toBe(2); // manifest.json + background.js
    expect(result.rulesRun).toBe(allRules.length);
  });
});

describe("manifest rules", () => {
  it("flags Manifest V2 leftovers", async () => {
    const ids = ruleIdsIn(await run("broken"), "manifest.json");
    expect(ids).toContain("no-mv2-keys");
  });

  it("flags a host permission covering the whole web", async () => {
    const ids = ruleIdsIn(await run("broken"), "manifest.json");
    expect(ids).toContain("no-broad-host-permissions");
  });

  it("flags a CSP that allows a remote script origin", async () => {
    const ids = ruleIdsIn(await run("broken"), "manifest.json");
    expect(ids).toContain("no-remote-code-in-csp");
  });

  it("does not flag manifest_version when it is already 3", async () => {
    const ids = ruleIdsIn(await run("broken"), "manifest.json");
    expect(ids).not.toContain("require-manifest-version-3");
  });

  it("reports every MV2 leftover separately", async () => {
    const mv2 = inFile(await run("broken"), "manifest.json").filter(
      (finding) => finding.ruleId === "no-mv2-keys",
    );
    // browser_action, background.persistent, webRequestBlocking
    expect(mv2).toHaveLength(3);
  });
});

describe("service worker rules", () => {
  it("flags setInterval and an over-long setTimeout", async () => {
    const ids = ruleIdsIn(await run("broken"), "background.js");
    expect(ids.filter((id) => id === "no-timers-in-service-worker")).toHaveLength(2);
  });

  it("flags DOM and page-only globals", async () => {
    const ids = ruleIdsIn(await run("broken"), "background.js");
    expect(ids).toContain("no-dom-in-service-worker");
  });

  it("flags module state that a worker restart would reset", async () => {
    const findings = inFile(await run("broken"), "background.js").filter(
      (finding) => finding.ruleId === "no-mutable-module-state-in-service-worker",
    );
    const messages = findings.map((finding) => finding.message).join(" ");
    expect(messages).toContain("requestCount");
    expect(messages).toContain("cachedToken");
  });

  it("flags remote code loading", async () => {
    const ids = ruleIdsIn(await run("broken"), "background.js");
    expect(ids).toContain("no-remote-code-loading");
  });
});

describe("role scoping", () => {
  it("does not apply service-worker rules to a content script", async () => {
    const ids = ruleIdsIn(await run("broken"), "content.js");
    expect(ids).not.toContain("no-timers-in-service-worker");
    expect(ids).not.toContain("no-dom-in-service-worker");
    expect(ids).not.toContain("no-mutable-module-state-in-service-worker");
  });

  it("still applies rules that are not role-specific", async () => {
    const ids = ruleIdsIn(await run("broken"), "content.js");
    expect(ids).toContain("no-eval-or-new-function");
  });
});

describe("findings", () => {
  it("carry a docs URL derived from the rule id", async () => {
    const finding = (await run("broken")).findings[0];
    expect(finding?.docsUrl).toContain(`${finding?.ruleId}.md`);
  });

  it("are sorted by file then line", async () => {
    const findings = (await run("broken")).findings;
    const keys = findings.map((finding) => `${finding.file}:${String(finding.line ?? 0).padStart(4, "0")}`);
    expect(keys).toEqual([...keys].sort());
  });
});

describe("scope awareness", () => {
  it("does not report locals that shadow a page-only global", async () => {
    const findings = inFile(await run("shadowing"), "background.js").filter(
      (finding) => finding.ruleId === "no-dom-in-service-worker",
    );
    expect(findings).toEqual([]);
  });

  it("reports destructured module state", async () => {
    const messages = inFile(await run("shadowing"), "background.js")
      .filter((finding) => finding.ruleId === "no-mutable-module-state-in-service-worker")
      .map((finding) => finding.message)
      .join(" ");
    expect(messages).toContain("pendingCount");
  });

  it("does not treat a parameter shadowing a module binding as module state", async () => {
    const messages = inFile(await run("shadowing"), "background.js")
      .filter((finding) => finding.ruleId === "no-mutable-module-state-in-service-worker")
      .map((finding) => finding.message)
      .join(" ");
    expect(messages).not.toContain("cache");
  });
});

describe("suppression comments", () => {
  it("silences only the following line", async () => {
    const result = await run("suppressed");
    const timers = result.findings.filter(
      (finding) => finding.ruleId === "no-timers-in-service-worker",
    );
    expect(timers).toHaveLength(1);
    expect(timers[0]?.line).toBe(6);
  });
});

describe("loading", () => {
  it("reports a script the manifest references but that is absent", async () => {
    const ids = ruleIdsIn(await run("missing-script"), "manifest.json");
    expect(ids).toContain("missing-referenced-script");
  });

  it("fails clearly when there is no manifest", async () => {
    await expect(loadExtension(fixture("does-not-exist"))).rejects.toBeInstanceOf(LoadError);
  });
});

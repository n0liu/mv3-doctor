import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

// End-to-end "dogfood" smoke tests: run the built CLI the way a user would,
// asserting exit codes and output. This exercises argv parsing, loading, and
// rendering through a real process — the parts the in-process tests cannot reach.

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const cli = join(root, "dist", "cli.js");
const fixture = (name: string): string => join(here, "fixtures", name);

interface RunResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

const run = (...args: string[]): RunResult => {
  const result = spawnSync("node", [cli, ...args], { encoding: "utf8" });
  return { status: result.status ?? -1, stdout: result.stdout, stderr: result.stderr };
};

const packageVersion = (): string => {
  const parsed = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };
  return parsed.version;
};

beforeAll(() => {
  // Build so `dist/cli.js` exists regardless of the CI step order.
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "ignore" });
}, 60_000);

describe("mv3-doctor CLI", () => {
  it("exits 0 and reports nothing for a clean extension", () => {
    const { status, stdout } = run(fixture("clean"));
    expect(status).toBe(0);
    expect(stdout).toContain("No Manifest V3 problems found");
  });

  it("exits 1 and lists problems for a broken extension", () => {
    const { status, stdout } = run(fixture("broken"));
    expect(status).toBe(1);
    expect(stdout).toMatch(/\d+ problems \(/);
  });

  it("exits 2 when the extension cannot be read", () => {
    const { status, stderr } = run(fixture("does-not-exist"));
    expect(status).toBe(2);
    expect(stderr.length).toBeGreaterThan(0);
  });

  it("exits 2 and explains an unknown option", () => {
    const { status, stderr } = run("--nope");
    expect(status).toBe(2);
    expect(stderr).toContain("Unknown option");
  });

  it("prints the package version with --version", () => {
    const { status, stdout } = run("--version");
    expect(status).toBe(0);
    expect(stdout.trim()).toBe(packageVersion());
  });

  it("prints usage with --help", () => {
    const { status, stdout } = run("--help");
    expect(status).toBe(0);
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("mv3-doctor");
  });

  it("emits machine-readable JSON with --json", () => {
    const { status, stdout } = run("--json", fixture("broken"));
    expect(status).toBe(1);
    const parsed = JSON.parse(stdout) as { summary: { total: number } };
    expect(parsed.summary.total).toBeGreaterThan(0);
  });
});

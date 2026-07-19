import { asRecord, lineOfKey } from "../../json-utils.js";
import { isRemoteUrl } from "../ast-utils.js";
import type { ManifestRule, RawFinding } from "../../types.js";

const SCRIPT_DIRECTIVES = ["script-src", "script-src-elem", "worker-src"];

/** Splits a CSP string into directive name -> source list. */
const parseCsp = (policy: string): ReadonlyMap<string, readonly string[]> => {
  const directives = new Map<string, readonly string[]>();
  for (const segment of policy.split(";")) {
    const [name, ...sources] = segment.trim().split(/\s+/).filter(Boolean);
    if (name) directives.set(name.toLowerCase(), sources);
  }
  return directives;
};

const checkPolicy = (policy: string, context: string, line?: number): readonly RawFinding[] => {
  const directives = parseCsp(policy);
  const findings: RawFinding[] = [];

  for (const directive of SCRIPT_DIRECTIVES) {
    for (const source of directives.get(directive) ?? []) {
      if (isRemoteUrl(source)) {
        findings.push({
          message: `CSP "${context}" allows scripts from ${source}. Manifest V3 forbids remote code.`,
          hint: "Bundle every script into the extension package. Chrome rejects extensions that execute code fetched at runtime.",
          line,
        });
      }
      if (source === "'unsafe-eval'") {
        findings.push({
          message: `CSP "${context}" allows 'unsafe-eval', which Manifest V3 does not permit for extension pages.`,
          hint: "Remove 'unsafe-eval' and replace any eval()/new Function() usage with real code.",
          line,
        });
      }
    }
  }

  return findings;
};

export const noRemoteCodeInCsp: ManifestRule = {
  id: "no-remote-code-in-csp",
  target: "manifest",
  severity: "error",
  description: "Flags a content_security_policy that permits remote scripts or unsafe-eval.",

  check({ manifest }) {
    const csp = manifest.json["content_security_policy"];
    const line = lineOfKey(manifest.raw, "content_security_policy");

    // MV2 shape: a bare string. MV3 shape: an object of contexts.
    if (typeof csp === "string") {
      return checkPolicy(csp, "content_security_policy", line);
    }

    const record = asRecord(csp);
    if (!record) return [];

    return Object.entries(record).flatMap(([context, policy]) =>
      typeof policy === "string" ? checkPolicy(policy, context, line) : [],
    );
  },
};

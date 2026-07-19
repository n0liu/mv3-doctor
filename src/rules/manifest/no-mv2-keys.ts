import { asRecord, asStringArray, lineOfKey } from "../../json-utils.js";
import type { ManifestRule, RawFinding } from "../../types.js";

/** Top-level keys that Manifest V3 replaced. */
const REPLACED_TOP_LEVEL: Readonly<Record<string, string>> = {
  browser_action: 'Replace with the unified "action" key.',
  page_action: 'Replace with the unified "action" key.',
};

/** Permissions that no longer do anything in MV3. */
const REMOVED_PERMISSIONS: Readonly<Record<string, string>> = {
  webRequestBlocking:
    'Removed in MV3. Use "declarativeNetRequest" to block or redirect requests.',
};

export const noMv2Keys: ManifestRule = {
  id: "no-mv2-keys",
  target: "manifest",
  severity: "error",
  description: "Flags Manifest V2 keys and permissions that MV3 removed or replaced.",

  check({ manifest }) {
    const findings: RawFinding[] = [];
    const { json, raw } = manifest;

    for (const [key, hint] of Object.entries(REPLACED_TOP_LEVEL)) {
      if (key in json) {
        findings.push({
          message: `"${key}" is a Manifest V2 key.`,
          hint,
          line: lineOfKey(raw, key),
        });
      }
    }

    const background = asRecord(json["background"]);
    if (background) {
      if ("scripts" in background) {
        findings.push({
          message: '"background.scripts" is Manifest V2; MV3 uses a service worker.',
          hint: 'Replace with "background": { "service_worker": "background.js" }. Remember the worker is ephemeral — it cannot hold state in memory.',
          line: lineOfKey(raw, "scripts"),
        });
      }
      if ("persistent" in background) {
        findings.push({
          message: '"background.persistent" no longer exists — MV3 workers are always ephemeral.',
          hint: "Remove the key and persist state with chrome.storage instead of module variables.",
          line: lineOfKey(raw, "persistent"),
        });
      }
    }

    const permissions = [
      ...asStringArray(json["permissions"]),
      ...asStringArray(json["optional_permissions"]),
    ];
    for (const permission of permissions) {
      const hint = REMOVED_PERMISSIONS[permission];
      if (hint) {
        findings.push({
          message: `The "${permission}" permission has no effect in Manifest V3.`,
          hint,
          line: lineOfKey(raw, permission),
        });
      }
    }

    return findings;
  },
};

import { asStringArray, lineOfKey } from "../../json-utils.js";
import type { ManifestRule } from "../../types.js";

/** Patterns that grant access to effectively the whole web. */
const BROAD_PATTERNS = new Set([
  "<all_urls>",
  "*://*/*",
  "http://*/*",
  "https://*/*",
  "*://*/",
  "file:///*",
]);

export const noBroadHostPermissions: ManifestRule = {
  id: "no-broad-host-permissions",
  target: "manifest",
  severity: "warning",
  description:
    "Flags host permissions covering the whole web — the top cause of Web Store review delays.",

  check({ manifest }) {
    const declared = [
      ...asStringArray(manifest.json["host_permissions"]),
      ...asStringArray(manifest.json["optional_host_permissions"]),
    ];

    return declared
      .filter((pattern) => BROAD_PATTERNS.has(pattern.trim()))
      .map((pattern) => ({
        message: `Host permission "${pattern}" grants access to every site the user visits.`,
        hint: "Narrow it to the origins you actually need, or request access at runtime with the \"activeTab\" permission or chrome.permissions.request().",
        line: lineOfKey(manifest.raw, "host_permissions"),
      }));
  },
};

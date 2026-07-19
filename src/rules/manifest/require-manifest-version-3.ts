import { lineOfKey } from "../../json-utils.js";
import type { ManifestRule } from "../../types.js";

export const requireManifestVersion3: ManifestRule = {
  id: "require-manifest-version-3",
  target: "manifest",
  severity: "error",
  description: "manifest_version must be 3 — Chrome no longer accepts Manifest V2 extensions.",

  check({ manifest }) {
    const version = manifest.json["manifest_version"];
    if (version === 3) return [];

    return [
      {
        message:
          version === undefined
            ? "manifest.json is missing manifest_version."
            : `manifest_version is ${JSON.stringify(version)}, but Chrome requires 3.`,
        hint: 'Set "manifest_version": 3 and migrate the MV2-only keys it still uses.',
        line: lineOfKey(manifest.raw, "manifest_version"),
      },
    ];
  },
};

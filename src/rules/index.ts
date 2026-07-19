import { noBroadHostPermissions } from "./manifest/no-broad-host-permissions.js";
import { noMv2Keys } from "./manifest/no-mv2-keys.js";
import { noRemoteCodeInCsp } from "./manifest/no-remote-code-in-csp.js";
import { requireManifestVersion3 } from "./manifest/require-manifest-version-3.js";
import { noDomInServiceWorker } from "./source/no-dom-in-service-worker.js";
import { noEvalOrNewFunction } from "./source/no-eval-or-new-function.js";
import { noMutableModuleStateInServiceWorker } from "./source/no-mutable-module-state-in-service-worker.js";
import { noRemoteCodeLoading } from "./source/no-remote-code-loading.js";
import { noTimersInServiceWorker } from "./source/no-timers-in-service-worker.js";
import type { Rule } from "../types.js";

/**
 * Every rule mv3-doctor ships. Adding a rule means adding one file next to its
 * siblings and one line here — see CONTRIBUTING.md.
 */
export const allRules: readonly Rule[] = [
  // manifest.json
  requireManifestVersion3,
  noMv2Keys,
  noBroadHostPermissions,
  noRemoteCodeInCsp,
  // JavaScript sources
  noTimersInServiceWorker,
  noDomInServiceWorker,
  noMutableModuleStateInServiceWorker,
  noEvalOrNewFunction,
  noRemoteCodeLoading,
];

export const rulesById: ReadonlyMap<string, Rule> = new Map(
  allRules.map((rule) => [rule.id, rule]),
);

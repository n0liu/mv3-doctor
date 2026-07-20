import { findGlobalReferences } from "../../scope.js";
import type { SourceRule } from "../../types.js";

/** Globals that exist on a page but not in a service worker's global scope. */
const UNAVAILABLE_GLOBALS: Readonly<Record<string, string>> = {
  document: "Service workers have no DOM. Move DOM work to a content script or an offscreen document.",
  window: "Service workers have no window. Use `self` for the global scope.",
  localStorage:
    "localStorage is unavailable and synchronous. Use the async chrome.storage.local instead.",
  sessionStorage: "sessionStorage is unavailable. Use chrome.storage.session instead.",
  alert: "Dialog APIs do not exist in a service worker.",
};

export const noDomInServiceWorker: SourceRule = {
  id: "no-dom-in-service-worker",
  target: "source",
  severity: "error",
  roles: ["service-worker"],
  description: "Flags DOM and page-only globals that throw inside a service worker.",

  check({ scopeManager }) {
    // Scope analysis is what distinguishes the real global `document` from a
    // local variable or parameter that merely shares the name. Without it we
    // would rather report nothing than guess and produce false positives.
    if (!scopeManager) return [];

    const names = Object.keys(UNAVAILABLE_GLOBALS);

    return findGlobalReferences(scopeManager, names).map((match) => ({
      message: `"${match.name}" is not available in a service worker and will throw at runtime.`,
      hint: UNAVAILABLE_GLOBALS[match.name],
      line: match.line,
      column: match.column,
    }));
  },
};

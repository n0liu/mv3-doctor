import { findGlobalIdentifiers } from "../ast-utils.js";
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

  check({ ast }) {
    const names = Object.keys(UNAVAILABLE_GLOBALS);

    return findGlobalIdentifiers(ast, names).map((match) => ({
      message: `"${match.name}" is not available in a service worker and will throw at runtime.`,
      hint: UNAVAILABLE_GLOBALS[match.name],
      line: match.line,
      column: match.column,
    }));
  },
};

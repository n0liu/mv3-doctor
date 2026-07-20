import { topLevelScope, type Scope } from "../../scope.js";
import type { RawFinding, SourceRule } from "../../types.js";

/**
 * The defining Manifest V3 trap: a module-level variable mutated from inside an
 * event listener. It works while the worker is warm, then silently resets to
 * its initial value the moment Chrome restarts the worker.
 *
 * Heuristic — a top-level `let`/`var` is only reported once something writes to
 * it from inside a function, which is what makes it state rather than config.
 * Scope analysis handles the two cases a naive AST walk gets wrong:
 * destructured declarations (`let { count } = …`) are real bindings, and a
 * parameter that shadows a module name is a different binding, so writing to it
 * is not a write to the module state.
 */
export const noMutableModuleStateInServiceWorker: SourceRule = {
  id: "no-mutable-module-state-in-service-worker",
  target: "source",
  severity: "warning",
  roles: ["service-worker"],
  description:
    "Module-level state mutated inside listeners is lost when the worker restarts.",

  check({ scopeManager }) {
    if (!scopeManager) return [];
    const scope = topLevelScope(scopeManager);
    if (!scope) return [];

    const findings: RawFinding[] = [];

    for (const variable of scope.variables) {
      // `let`/`var` only — `const` cannot be reassigned, and function/import
      // bindings are not mutable state.
      const isMutableBinding = variable.defs.some(
        (def) =>
          def.type === "Variable" &&
          def.parent?.type === "VariableDeclaration" &&
          def.parent.kind !== "const",
      );
      if (!isMutableBinding) continue;

      const writtenInsideFunction = variable.references.some(
        (reference) => reference.isWrite() && isInsideFunction(reference.from, scope),
      );
      if (!writtenInsideFunction) continue;

      const declaration = variable.identifiers[0];
      if (!declaration) continue;

      findings.push({
        message: `"${variable.name}" holds state in memory, but the service worker is restarted regularly — the value resets without warning.`,
        hint: "Persist it with chrome.storage.session (or .local) and read it back at the start of each listener, instead of trusting the module variable.",
        line: declaration.loc?.start.line ?? 0,
        column: (declaration.loc?.start.column ?? 0) + 1,
      });
    }

    return findings.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  },
};

/** Whether `from` sits inside a function nested below the top-level scope. */
const isInsideFunction = (from: Scope | null, topScope: Scope): boolean => {
  let scope = from;
  while (scope && scope !== topScope) {
    if (scope.type === "function") return true;
    scope = scope.upper;
  }
  return false;
};

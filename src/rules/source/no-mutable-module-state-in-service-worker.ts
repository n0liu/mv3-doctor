import { locOf, walk } from "../ast-utils.js";
import type { Located } from "../ast-utils.js";
import type { SourceRule } from "../../types.js";

const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);

/**
 * The defining Manifest V3 trap: a module-level variable mutated from inside an
 * event listener. It works while the worker is warm, then silently resets to
 * its initial value the moment Chrome restarts the worker.
 *
 * Heuristic — a top-level `let`/`var` is only reported once something writes to
 * it from inside a function, which is what makes it state rather than config.
 */
export const noMutableModuleStateInServiceWorker: SourceRule = {
  id: "no-mutable-module-state-in-service-worker",
  target: "source",
  severity: "warning",
  roles: ["service-worker"],
  description:
    "Module-level state mutated inside listeners is lost when the worker restarts.",

  check({ ast }) {
    const topLevel = new Map<string, Located>();

    for (const statement of ast.body) {
      if (statement.type !== "VariableDeclaration" || statement.kind === "const") continue;
      for (const declarator of statement.declarations) {
        if (declarator.id.type === "Identifier") {
          topLevel.set(declarator.id.name, locOf(declarator.id));
        }
      }
    }

    if (topLevel.size === 0) return [];

    const mutated = new Set<string>();
    const isInsideFunction = (ancestors: readonly { type: string }[]): boolean =>
      ancestors.some((ancestor) => FUNCTION_TYPES.has(ancestor.type));

    walk.ancestor(ast, {
      AssignmentExpression(node, _state, ancestors) {
        if (node.left.type === "Identifier" && topLevel.has(node.left.name)) {
          if (isInsideFunction(ancestors)) mutated.add(node.left.name);
        }
      },
      UpdateExpression(node, _state, ancestors) {
        if (node.argument.type === "Identifier" && topLevel.has(node.argument.name)) {
          if (isInsideFunction(ancestors)) mutated.add(node.argument.name);
        }
      },
    });

    return [...mutated]
      .map((name) => ({ name, location: topLevel.get(name) }))
      .filter((entry): entry is { name: string; location: Located } => entry.location !== undefined)
      .sort((a, b) => a.location.line - b.location.line)
      .map(({ name, location }) => ({
        message: `"${name}" holds state in memory, but the service worker is restarted regularly — the value resets without warning.`,
        hint: `Persist it with chrome.storage.session (or .local) and read it back at the start of each listener, instead of trusting the module variable.`,
        line: location.line,
        column: location.column,
      }));
  },
};

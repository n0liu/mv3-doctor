import { analyze, type Scope, type ScopeManager } from "eslint-scope";
import type { Program as EstreeProgram } from "estree";
import type { Program } from "acorn";
import type { NamedMatch } from "./rules/ast-utils.js";

export type { Scope, ScopeManager };

/**
 * Builds a scope manager so rules can tell a real global from a local that
 * merely shares its name. Returns null if analysis fails — scope-aware rules
 * then skip rather than crash or emit false positives.
 *
 * acorn produces an ESTree-shaped AST at runtime, but its nominal types differ
 * from `@types/estree`, so the cast is safe and only bridges the type systems.
 */
export const analyzeScopes = (ast: Program): ScopeManager | null => {
  try {
    return analyze(ast as unknown as EstreeProgram, {
      sourceType: ast.sourceType,
      ecmaVersion: 2024,
    });
  } catch {
    return null;
  }
};

/** The scope holding top-level declarations: the module scope, else global. */
export const topLevelScope = (scopeManager: ScopeManager): Scope | null => {
  const globalScope = scopeManager.globalScope;
  if (!globalScope) return null;
  return globalScope.childScopes.find((scope) => scope.type === "module") ?? globalScope;
};

/**
 * References to a name that resolve to no binding, i.e. genuine global reads.
 * A local variable shadowing the name resolves within its own scope and is
 * therefore excluded — which is the whole point of using scope analysis.
 */
export const findGlobalReferences = (
  scopeManager: ScopeManager,
  names: readonly string[],
): readonly NamedMatch[] => {
  const globalScope = scopeManager.globalScope;
  if (!globalScope) return [];
  const wanted = new Set(names);

  return globalScope.through
    .filter((reference) => wanted.has(reference.identifier.name))
    .map((reference) => {
      const { loc, name } = reference.identifier;
      return { name, line: loc?.start.line ?? 0, column: (loc?.start.column ?? 0) + 1 };
    });
};

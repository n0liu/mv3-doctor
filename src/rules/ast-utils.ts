import * as walk from "acorn-walk";
import type { Node, Program } from "acorn";

/** Re-exported so rules needing an uncommon pattern can walk the AST directly. */
export { walk };

export interface Located {
  readonly line: number;
  readonly column: number;
}

export interface NamedMatch extends Located {
  readonly name: string;
}

/** Locations are 1-based; acorn reports 0-based columns. */
export const locOf = (node: Node): Located => ({
  line: node.loc?.start.line ?? 0,
  column: (node.loc?.start.column ?? 0) + 1,
});

/** Calls to a bare global, e.g. `setInterval(...)` — not `foo.setInterval(...)`. */
export const findGlobalCalls = (
  ast: Program,
  names: readonly string[],
): readonly NamedMatch[] => {
  const wanted = new Set(names);
  const matches: NamedMatch[] = [];
  walk.simple(ast, {
    CallExpression(node) {
      if (node.callee.type === "Identifier" && wanted.has(node.callee.name)) {
        matches.push({ name: node.callee.name, ...locOf(node) });
      }
    },
  });
  return matches;
};

/** `new Function(...)` and friends. */
export const findNewExpressions = (
  ast: Program,
  names: readonly string[],
): readonly NamedMatch[] => {
  const wanted = new Set(names);
  const matches: NamedMatch[] = [];
  walk.simple(ast, {
    NewExpression(node) {
      if (node.callee.type === "Identifier" && wanted.has(node.callee.name)) {
        matches.push({ name: node.callee.name, ...locOf(node) });
      }
    },
  });
  return matches;
};

const REMOTE_URL = /^(https?:)?\/\//i;

export const isRemoteUrl = (value: unknown): value is string =>
  typeof value === "string" && REMOTE_URL.test(value.trim());

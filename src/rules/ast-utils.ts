import * as walk from "acorn-walk";
import type { AnyNode, Node, Program } from "acorn";

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

/**
 * References to a global binding, e.g. `document` in `document.title`.
 * Property keys, declarations and parameters are excluded so that a local
 * named `document` or an object key `{ window: 1 }` does not match.
 */
export const findGlobalIdentifiers = (
  ast: Program,
  names: readonly string[],
): readonly NamedMatch[] => {
  const wanted = new Set(names);
  const matches: NamedMatch[] = [];

  walk.ancestor(ast, {
    Identifier(node, _state, ancestors) {
      if (!wanted.has(node.name)) return;
      // `ancestors` ends with the node itself.
      const parent = ancestors[ancestors.length - 2] as AnyNode | undefined;
      if (!parent) return;

      if (parent.type === "MemberExpression" && !parent.computed && parent.property === node) return;
      if (parent.type === "Property" && !parent.computed && parent.key === node) return;
      if (parent.type === "VariableDeclarator" && parent.id === node) return;
      if (parent.type === "FunctionDeclaration" && parent.id === node) return;
      if (parent.type === "ClassDeclaration" && parent.id === node) return;

      matches.push({ name: node.name, ...locOf(node) });
    },
  });

  return matches;
};

const REMOTE_URL = /^(https?:)?\/\//i;

export const isRemoteUrl = (value: unknown): value is string =>
  typeof value === "string" && REMOTE_URL.test(value.trim());

/** String literal arguments of a call, paired with the call's location. */
export const stringArgsOf = (node: {
  arguments: readonly AnyNode[];
}): readonly string[] =>
  node.arguments
    .filter((arg): arg is AnyNode & { value: unknown } => arg.type === "Literal")
    .map((arg) => arg.value)
    .filter((value): value is string => typeof value === "string");

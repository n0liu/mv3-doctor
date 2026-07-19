import { findGlobalCalls, findNewExpressions } from "../ast-utils.js";
import type { SourceRule } from "../../types.js";

export const noEvalOrNewFunction: SourceRule = {
  id: "no-eval-or-new-function",
  target: "source",
  severity: "error",
  description: "Flags eval() and new Function(), which the MV3 CSP blocks.",

  check({ ast }) {
    const evalCalls = findGlobalCalls(ast, ["eval"]).map((match) => ({
      message: "eval() is blocked by the Manifest V3 content security policy.",
      hint: "Rewrite the logic as real code. If you are parsing data, use JSON.parse().",
      line: match.line,
      column: match.column,
    }));

    const dynamicFunctions = findNewExpressions(ast, ["Function"]).map((match) => ({
      message: "new Function() compiles code at runtime and is blocked by the MV3 CSP.",
      hint: "Replace it with a normal function, or a lookup table if you are dispatching on a name.",
      line: match.line,
      column: match.column,
    }));

    return [...evalCalls, ...dynamicFunctions];
  },
};

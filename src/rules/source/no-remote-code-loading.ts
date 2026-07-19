import { isRemoteUrl, locOf, walk } from "../ast-utils.js";
import type { RawFinding, SourceRule } from "../../types.js";

const BUNDLE_HINT =
  "Manifest V3 requires every executable line to ship inside the extension package. Bundle the dependency at build time.";

export const noRemoteCodeLoading: SourceRule = {
  id: "no-remote-code-loading",
  target: "source",
  severity: "error",
  description: "Flags scripts fetched from a remote origin at runtime, which MV3 forbids.",

  check({ ast }) {
    const findings: RawFinding[] = [];

    walk.simple(ast, {
      // importScripts("https://cdn.example.com/lib.js")
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "importScripts") return;
        for (const argument of node.arguments) {
          if (argument.type === "Literal" && isRemoteUrl(argument.value)) {
            findings.push({
              message: `importScripts() loads remote code from ${String(argument.value)}.`,
              hint: BUNDLE_HINT,
              ...locOf(node),
            });
          }
        }
      },

      // import("https://cdn.example.com/lib.js")
      ImportExpression(node) {
        if (node.source.type === "Literal" && isRemoteUrl(node.source.value)) {
          findings.push({
            message: `Dynamic import() pulls remote code from ${String(node.source.value)}.`,
            hint: BUNDLE_HINT,
            ...locOf(node),
          });
        }
      },

      // someScript.src = "https://cdn.example.com/lib.js"
      AssignmentExpression(node) {
        const { left, right } = node;
        if (
          left.type === "MemberExpression" &&
          !left.computed &&
          left.property.type === "Identifier" &&
          left.property.name === "src" &&
          right.type === "Literal" &&
          isRemoteUrl(right.value)
        ) {
          findings.push({
            message: `Assigning a remote URL (${String(right.value)}) to .src injects remote code.`,
            hint: BUNDLE_HINT,
            ...locOf(node),
          });
        }
      },
    });

    return findings;
  },
};

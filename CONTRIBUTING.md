# Contributing

The most useful contribution is **a new rule**, especially one encoding a
Manifest V3 mistake you actually hit. If it caught you, it is catching others.

## Setup

```bash
npm install
npm test
```

## Adding a rule

Four small files. Here is the whole process for a rule that flags
`chrome.runtime.getBackgroundPage()` (removed in MV3).

### 1. The rule

Rules are pure functions. They receive a parsed AST and return findings — the
engine fills in the rule id, severity, file and docs URL, so a rule stays short.

`src/rules/source/no-get-background-page.ts`:

```ts
import { locOf, walk } from "../ast-utils.js";
import type { RawFinding, SourceRule } from "../../types.js";

export const noGetBackgroundPage: SourceRule = {
  id: "no-get-background-page",
  target: "source",
  severity: "error",
  description: "chrome.runtime.getBackgroundPage() was removed in Manifest V3.",

  check({ ast }) {
    const findings: RawFinding[] = [];

    walk.simple(ast, {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "getBackgroundPage"
        ) {
          findings.push({
            message: "chrome.runtime.getBackgroundPage() does not exist in Manifest V3.",
            hint: "There is no persistent background page. Message the service worker with chrome.runtime.sendMessage() instead.",
            ...locOf(node),
          });
        }
      },
    });

    return findings;
  },
};
```

Add `roles: ["service-worker"]` if the rule only makes sense there. Omit it to
run on every script. Getting this right is what keeps false positives low:
`setInterval` is a bug in a worker and perfectly fine in a content script.

Manifest rules use `target: "manifest"` and receive `{ manifest }` instead —
see `src/rules/manifest/` for examples.

### 2. Register it

Add one import and one array entry in `src/rules/index.ts`.

### 3. Document it

`docs/rules/no-get-background-page.md`. Every finding links here, so the page is
part of the user experience, not an afterthought. Copy the structure of an
existing page:

- one-line summary with severity and scope
- **Why** — what actually breaks at runtime, not a restatement of the rule
- **Incorrect** / **Correct** code
- **When this rule is wrong**, if it is a heuristic

### 4. Test it

Add the pattern to `test/fixtures/broken/` and assert on it in
`test/diagnose.test.ts`. If the rule is role-scoped, also add the *same* pattern
to a file where it must **not** fire — `test/fixtures/broken/content.js` exists
for exactly this. A rule without a negative test is a rule that will produce
false positives.

Keep `test/fixtures/clean/` passing with zero findings.

```bash
npm test
npm run typecheck
```

## Choosing a severity

| Severity | Means |
| --- | --- |
| `error` | Broken at runtime, or rejected at review. No judgement call. |
| `warning` | Very likely wrong, but a legitimate exception exists. |
| `info` | Worth knowing. Not a defect. |

Heuristics belong at `warning`. If a rule cannot distinguish a real bug from a
legitimate pattern — as
`no-mutable-module-state-in-service-worker` cannot distinguish state from a
rebuildable cache — it is a warning, and the docs page must say so.

A noisy `error` costs more than a missing rule: people stop reading the output.

## Reporting a bug

The most useful bug report is the smallest extension that reproduces it —
a `manifest.json` and one script. That snippet becomes the regression test.

False positives are real bugs and are treated as such. If you are suppressing a
rule routinely, please open an issue rather than living with it.

## Style

- No mutation — build new values rather than modifying in place.
- Small, focused files; one rule per file.
- Handle errors explicitly. Rules receive untrusted input and must tolerate any
  shape of AST or manifest — guard property access rather than assuming a node
  has the children you expect.
- No hardcoded URLs in rules; docs links are derived from the rule id.

## Scope

mv3-doctor checks **Chrome Manifest V3 extensions**. Out of scope: general
JavaScript style (use ESLint), Firefox-specific manifest keys (use Mozilla's
`addons-linter`), and anything requiring the extension to actually run.

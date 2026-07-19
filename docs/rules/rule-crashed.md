# rule-crashed

**Severity:** warning · **Applies to:** any file

Something went wrong inside mv3-doctor itself while checking this file. It is
reported as a finding so that a failure is visible rather than silently reducing
coverage.

There are two causes.

## The file could not be parsed as JavaScript

> Could not parse this file as JavaScript, so source rules were skipped.

mv3-doctor parses plain JavaScript. It does not understand TypeScript, JSX, or
syntax newer than the bundled parser supports.

Run it against the build output instead of the source tree:

```bash
npm run build && npx mv3-doctor dist
```

That is the right target anyway — the built output is what Chrome loads and what
the Web Store reviews.

If the file *is* plain JavaScript and still fails to parse, that is a bug worth
reporting.

## A rule threw an exception

> Rule "some-rule-id" threw while checking this file: …

This is a defect in the rule, not in your extension. The engine catches it so
that one broken rule cannot hide every other result.

Please [open an issue](https://github.com/n0liu/mv3-doctor/issues) with the rule
id, the error message, and — if you can share it — the smallest snippet that
triggers it. A failing snippet is the most useful thing you can attach, because
it becomes the regression test for the fix.

If you are writing a rule and hit this: rules receive untrusted input and must
tolerate any shape of AST or manifest. Guard property access rather than
assuming a node has the children you expect.

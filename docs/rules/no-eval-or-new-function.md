# no-eval-or-new-function

**Severity:** error · **Applies to:** all extension scripts

Flags `eval()` and `new Function()`, which the Manifest V3 CSP blocks.

## Why

The MV3 content security policy for extension pages forbids compiling code from
strings. `eval()` and `new Function()` throw at runtime, and a manifest that
tries to permit them with `'unsafe-eval'` is rejected at review.

## Incorrect

```js
const result = eval(userExpression);

const add = new Function("a", "b", "return a + b");
```

## Correct

Parsing data:

```js
const data = JSON.parse(payload);
```

Dispatching on a name — use a lookup table rather than generating code:

```js
const HANDLERS = {
  add: (a, b) => a + b,
  multiply: (a, b) => a * b,
};

const handler = HANDLERS[operation];
if (!handler) throw new Error(`Unknown operation: ${operation}`);
return handler(a, b);
```

Evaluating user-supplied expressions — bundle a small expression parser into the
package. It must be bundled, not fetched.

## Note

`JSON.parse` is not affected. Neither are template literals, dynamic property
access, or `structuredClone`. The restriction is specifically on turning a
string into executable code.

## See also

- [`no-remote-code-loading`](./no-remote-code-loading.md)
- [`no-remote-code-in-csp`](./no-remote-code-in-csp.md)

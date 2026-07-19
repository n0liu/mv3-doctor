# no-remote-code-loading

**Severity:** error · **Applies to:** all extension scripts

Flags scripts fetched from a remote origin at runtime, which Manifest V3
forbids.

## Why

MV3 requires every executable line to ship inside the extension package, so that
what the Web Store reviewed is what the user runs. Loading code from a CDN at
runtime defeats that guarantee and is a hard rejection.

## Incorrect

```js
importScripts("https://cdn.example.com/analytics.js");

const lib = await import("https://cdn.example.com/lib.js");

const script = document.createElement("script");
script.src = "https://cdn.example.com/widget.js";
document.head.appendChild(script);
```

## Correct

Install the dependency and bundle it:

```bash
npm install analytics-lib
```

```js
import { track } from "analytics-lib"; // bundled into the package at build time
```

For a script you do not control, vendor a pinned copy into the repository and
bundle that. Updating it becomes a deliberate change with a diff — which is the
point.

## Remote data is fine

```js
const response = await fetch("https://api.example.com/config");
const config = await response.json(); // data, not code — allowed
```

The line is whether the fetched bytes get executed. JSON that drives behaviour
through your own code is data. A string you `eval` is code.

## See also

- [`no-eval-or-new-function`](./no-eval-or-new-function.md)
- [`no-remote-code-in-csp`](./no-remote-code-in-csp.md)
- [`references/web-store-review.md`](../../references/web-store-review.md)

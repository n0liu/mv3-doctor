---
name: mv3-doctor
description: Use when building, modifying, migrating, or reviewing a Chrome extension — anything involving manifest.json, a background service worker, content scripts, or Manifest V3. Encodes the MV3 rules that models routinely get wrong, and ships a validator to check the result.
---

# Building Chrome Manifest V3 Extensions

Manifest V3 broke assumptions that a decade of extension tutorials — and most
training data — still take for granted. Code that looks correct, passes review
by eye, and even runs during a quick manual test will fail in production because
the service worker was still warm when you tested it.

Follow the rules below while writing, then **run the validator before you claim
the work is done.**

## The one idea that explains most MV3 bugs

**The background service worker is ephemeral.** Chrome starts it to deliver an
event and terminates it after roughly 30 seconds of inactivity. It is not a
long-running process. Every mistake below follows from forgetting this.

MV2 mental model (wrong): a background page that stays alive, holds state in
memory, keeps sockets open, and runs timers.

MV3 mental model (right): a collection of stateless event handlers. Each one
starts from nothing, reads what it needs from storage, does its work, and may be
killed the moment it goes idle.

## Rules

### 1. Never keep state in module-level variables

```js
// WRONG — resets to 0 without warning when the worker restarts
let requestCount = 0;
chrome.runtime.onMessage.addListener(() => { requestCount += 1; });

// RIGHT — state outlives the worker
chrome.runtime.onMessage.addListener(async () => {
  const { requestCount = 0 } = await chrome.storage.session.get("requestCount");
  await chrome.storage.session.set({ requestCount: requestCount + 1 });
});
```

`chrome.storage.session` is in-memory and cleared when the browser closes — good
for tokens. `chrome.storage.local` persists to disk. Both are async.

Module-level `const` for configuration is fine. The problem is *mutable* state.

### 2. Never use timers for anything beyond a few seconds

`setInterval` stops when the worker dies. A `setTimeout` longer than the ~30s
idle timeout never fires.

```js
// WRONG
setInterval(poll, 60_000);

// RIGHT — alarms wake the worker back up
chrome.alarms.create("poll", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "poll") poll();
});
```

Note `periodInMinutes` has a 30-second floor. If you need finer granularity than
that, reconsider the design — an extension probably should not be polling that
aggressively.

### 3. There is no DOM in a service worker

`document`, `window`, `localStorage`, `sessionStorage` and `alert` do not exist
and will throw. Use `self` for the global scope. When you genuinely need DOM
APIs (parsing HTML, canvas, audio), create an **offscreen document**:

```js
await chrome.offscreen.createDocument({
  url: "offscreen.html",
  reasons: ["DOM_PARSER"],
  justification: "Parse HTML returned by the API",
});
```

### 4. All code must ship inside the package

MV3 forbids remote code. No `importScripts("https://…")`, no
`import("https://…")`, no injecting a `<script src="https://…">`, no `eval()`,
no `new Function()`. Bundle dependencies at build time. A CSP with a remote
`script-src` or `'unsafe-eval'` is rejected at review.

Remote *data* (JSON from your API) is fine. Remote *code* is not.

### 5. Blocking webRequest is gone

Use `declarativeNetRequest`. Rules are declared up front so Chrome can apply
them without waking your worker:

```json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{ "id": "ruleset", "enabled": true, "path": "rules.json" }]
  }
}
```

You can still *observe* requests with non-blocking `webRequest`, but you cannot
modify or cancel them that way.

### 6. Request the narrowest permissions you can justify

The most common Web Store rejections are permissions the extension does not
visibly use, and `<all_urls>` without justification. Prefer `activeTab`, or
request hosts at runtime with `chrome.permissions.request()`. Write the
justification text as if a reviewer who has never seen your extension is reading
it — because that is what happens.

### 7. Register listeners synchronously at the top level

A listener registered inside an `async` callback may not exist yet when the
worker is woken to handle that event.

```js
// WRONG — the listener may be registered too late
(async () => {
  await init();
  chrome.runtime.onMessage.addListener(handler);
})();

// RIGHT — register immediately, do async work inside the handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleAsync(message).then(sendResponse);
  return true; // keeps the message channel open for the async response
});
```

Returning `true` from an `onMessage` listener is required whenever you respond
asynchronously. Forgetting it is a very common, very confusing bug.

## Verify before finishing

Run the validator on the extension directory and fix every error:

```bash
npx mv3-doctor path/to/extension
```

Use `--json` when you need to parse the findings programmatically. Exit code is
`1` if any error was found, `0` otherwise (warnings do not fail the run).

Do not report the work as complete until the validator is clean, or until you
can explain why a specific finding is a false positive. To knowingly accept one:

```js
// mv3-doctor-disable-next-line
setInterval(cheapUiTick, 1000);
```

## Deeper references

Read these only when the task actually touches the area:

- `references/service-worker-lifecycle.md` — termination, wake-up, keep-alive
- `references/storage-and-state.md` — choosing between the storage areas
- `references/network-and-dnr.md` — declarativeNetRequest patterns
- `references/web-store-review.md` — permission justifications and rejections

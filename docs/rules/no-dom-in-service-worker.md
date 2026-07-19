# no-dom-in-service-worker

**Severity:** error · **Applies to:** service worker

Flags DOM and page-only globals that throw inside a service worker.

## Why

A service worker runs in a worker scope, not a page. `document`, `window`,
`localStorage`, `sessionStorage` and dialog APIs simply do not exist there.
Referencing them throws a `ReferenceError` at runtime.

This trips up code copied from a Manifest V2 background *page*, which did have a
DOM.

## Incorrect

```js
chrome.runtime.onMessage.addListener((message) => {
  document.title = message.title;
  localStorage.setItem("lastSeen", Date.now());
});
```

## Correct

```js
chrome.runtime.onMessage.addListener(async (message) => {
  await chrome.storage.local.set({ lastSeen: Date.now() });
});
```

Use `self` where you would have used `window`:

```js
self.addEventListener("install", () => { /* … */ });
```

## When you genuinely need the DOM

Create an offscreen document — the supported way to use DOM APIs from the
background:

```js
await chrome.offscreen.createDocument({
  url: "offscreen.html",
  reasons: ["DOM_PARSER"],
  justification: "Parse HTML returned by the API",
});
```

Valid reasons include `DOM_PARSER`, `AUDIO_PLAYBACK`, `CLIPBOARD`, `BLOBS` and
others. The `offscreen` permission is required.

If the work belongs on the page instead, put it in a content script.

## See also

- [`references/service-worker-lifecycle.md`](../../references/service-worker-lifecycle.md)
- [`references/storage-and-state.md`](../../references/storage-and-state.md)

# no-mutable-module-state-in-service-worker

**Severity:** warning · **Applies to:** service worker

Module-level state mutated inside listeners is lost when the worker restarts.

## Why

Chrome terminates an idle service worker after about 30 seconds and starts a
fresh one for the next event. Module-level variables are re-initialised to their
declared value. Code that mutates them appears to work — during a quick manual
test the worker is still warm — and then loses data in the field, in a way that
is very hard to reproduce.

This is the single most common Manifest V3 bug.

## Incorrect

```js
let requestCount = 0;

chrome.runtime.onMessage.addListener((message) => {
  requestCount += 1;
  console.log(`request #${requestCount}`);
});
```

After a restart, `requestCount` is `0` again.

## Correct

```js
chrome.runtime.onMessage.addListener(async () => {
  const { requestCount = 0 } = await chrome.storage.session.get("requestCount");
  await chrome.storage.session.set({ requestCount: requestCount + 1 });
});
```

## When this rule is wrong

A module variable used purely as a rebuildable cache is fine, because every
reader can fall back to storage:

```js
let cache = null;

const getSettings = async () => {
  if (cache) return cache;
  const { settings } = await chrome.storage.local.get("settings");
  cache = settings ?? DEFAULTS;
  return cache;
};
```

The rule cannot tell a cache from state, so it reports this as a warning rather
than an error. Suppress it when you have made the value genuinely rebuildable:

```js
// mv3-doctor-disable-next-line
let cache = null;
```

## See also

- [`references/storage-and-state.md`](../../references/storage-and-state.md)
- [`references/service-worker-lifecycle.md`](../../references/service-worker-lifecycle.md)

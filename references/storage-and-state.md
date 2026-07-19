# Storage and State

## Choosing an area

| Area | Lives until | Size | Use for |
| --- | --- | --- | --- |
| `chrome.storage.session` | browser closes | ~10 MB | auth tokens, per-session counters, caches |
| `chrome.storage.local` | uninstalled / cleared | ~10 MB (unlimited with permission) | user settings, offline data |
| `chrome.storage.sync` | uninstalled | ~100 KB, 8 KB per item, quota-limited writes | small preferences the user wants across devices |
| `IndexedDB` | uninstalled | large | bulk structured data |

`chrome.storage.session` is not written to disk, which makes it the right place
for anything sensitive. By default it is not exposed to content scripts.

All `chrome.storage` APIs are asynchronous. There is no synchronous equivalent —
`localStorage` does not exist in the worker.

## The read-modify-write race

Because the worker handles events concurrently and storage is async, this is
racy:

```js
const { count = 0 } = await chrome.storage.session.get("count");
await chrome.storage.session.set({ count: count + 1 });
```

Two events arriving close together can both read the same value. When
correctness matters, serialise through a promise chain:

```js
let queue = Promise.resolve();

const update = (mutate) => {
  queue = queue.then(async () => {
    const current = await chrome.storage.session.get(null);
    await chrome.storage.session.set(mutate(current));
  });
  return queue;
};
```

Note that `queue` is module state — which is acceptable here precisely because
losing it on restart is harmless: a restarted worker simply starts a fresh
queue, and there are no in-flight operations to serialise against.

## Caching without lying to yourself

A memory cache is fine as an *optimisation*, never as the source of truth:

```js
let cache = null; // may be null at any time — that is expected

const getSettings = async () => {
  if (cache) return cache;
  const { settings } = await chrome.storage.local.get("settings");
  cache = settings ?? DEFAULTS;
  return cache;
};
```

This passes review because every path can rebuild the value from storage. The
anti-pattern is code that *writes* to the module variable and never persists it.

## Migrating stored data

Version your stored shape and migrate on `onInstalled`:

```js
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "update") return;
  const { schemaVersion = 0, ...data } = await chrome.storage.local.get(null);
  if (schemaVersion < 1) {
    await chrome.storage.local.set({ ...migrateToV1(data), schemaVersion: 1 });
  }
});
```

# no-timers-in-service-worker

**Severity:** error · **Applies to:** service worker

Timers do not survive service worker termination — use `chrome.alarms` instead.

## Why

`setInterval` is cancelled when the worker is terminated, so a periodic task
silently stops running. A `setTimeout` with a delay longer than the ~30 second
idle timeout never fires at all: the worker is gone before the callback is due.

Neither failure produces an error. The feature just stops working.

## Incorrect

```js
setInterval(() => {
  syncWithServer();
}, 60_000);

setTimeout(() => {
  showReminder();
}, 5 * 60_000);
```

## Correct

```js
chrome.alarms.create("sync", { periodInMinutes: 1 });
chrome.alarms.create("reminder", { delayInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sync") syncWithServer();
  if (alarm.name === "reminder") showReminder();
});
```

Alarms wake the worker back up, so the work actually happens.

## Notes

- `periodInMinutes` has a 30-second minimum. Sub-second polling is not something
  MV3 supports from the background — reconsider the design.
- The `alarms` permission is required in the manifest.
- Short timers used within a single event handler (a debounce of a few hundred
  milliseconds, say) are not reported: only `setInterval`, and `setTimeout`
  delays beyond the idle timeout.

## See also

- [`references/service-worker-lifecycle.md`](../../references/service-worker-lifecycle.md)

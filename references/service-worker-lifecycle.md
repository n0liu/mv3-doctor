# Service Worker Lifecycle

## When the worker starts

Chrome starts the extension service worker when an event it has a registered
listener for fires:

- the extension is installed or updated (`chrome.runtime.onInstalled`)
- the browser starts and the extension is enabled (`chrome.runtime.onStartup`)
- a message arrives (`chrome.runtime.onMessage`, `onConnect`)
- an alarm fires (`chrome.alarms.onAlarm`)
- the toolbar icon is clicked (`chrome.action.onClicked`)
- any other `chrome.*` event the worker subscribes to

Listeners must be registered **synchronously in the top-level scope**. Chrome
inspects the registered listeners to decide whether to start the worker at all —
a listener added later, inside a promise callback, may not be seen in time.

## When the worker stops

Roughly 30 seconds after the last activity. "Activity" means an event being
handled or an in-flight extension API call. A pending `fetch()` you never await
does **not** count, and neither does a `setTimeout` you are waiting on.

The worker can be terminated between two events that look adjacent in your code.
There is no `beforeunload` you can rely on for cleanup.

## What survives

| Survives a restart | Does not survive |
| --- | --- |
| `chrome.storage.local` (disk) | module-level variables |
| `chrome.storage.session` (memory, until browser close) | `setInterval` / `setTimeout` |
| `chrome.alarms` | open `WebSocket` / `EventSource` |
| declarativeNetRequest rules | in-memory caches |

## Keeping the worker alive

The honest answer is: usually you should not. If you find yourself wanting a
permanently alive worker, the design is fighting the platform.

Legitimate cases exist — for example, a long-running native messaging session,
or streaming a response you must consume to completion. In those cases the
supported approach is to keep an extension API call genuinely in flight for the
duration of the work, rather than using a heartbeat trick to fake activity.
Heartbeat hacks that ping an API on a timer have been repeatedly broken by
Chrome updates, and reviewers have flagged them.

If the work is genuinely long-running and user-visible, an offscreen document is
often the better home for it.

## Debugging a worker that "randomly stops working"

1. Open `chrome://extensions`, enable Developer mode, click the extension's
   "service worker" link to open its DevTools.
2. Reproduce the bug, then wait 30+ seconds without interacting.
3. Trigger the feature again. If it now misbehaves, you are depending on state
   that did not survive termination.
4. In the worker's DevTools you can click "stop" to terminate it on demand — the
   fastest way to reproduce a restart bug deterministically.

A bug that "only happens after I leave it for a while" is almost always this.

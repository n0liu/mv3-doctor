# no-mv2-keys

**Severity:** error · **Applies to:** manifest.json

Flags Manifest V2 keys and permissions that MV3 removed or replaced.

## Why

Chrome ignores these keys rather than erroring, so an incompletely migrated
manifest looks fine and then behaves in ways nobody expects — a toolbar button
that never appears, a blocking rule that never blocks.

## Keys this rule reports

| MV2 | MV3 |
| --- | --- |
| `browser_action` | `action` |
| `page_action` | `action` |
| `background.scripts` | `background.service_worker` |
| `background.persistent` | removed — workers are always ephemeral |
| `webRequestBlocking` permission | `declarativeNetRequest` |

## Incorrect

```json
{
  "manifest_version": 3,
  "browser_action": { "default_title": "Open" },
  "background": {
    "service_worker": "background.js",
    "persistent": false
  },
  "permissions": ["webRequestBlocking"]
}
```

## Correct

```json
{
  "manifest_version": 3,
  "action": { "default_title": "Open" },
  "background": {
    "service_worker": "background.js"
  },
  "permissions": ["declarativeNetRequest"]
}
```

## Migrating `background.scripts`

This is more than a rename. A background *page* could hold state in memory and
run timers; a service worker cannot. Read
[`no-mutable-module-state-in-service-worker`](./no-mutable-module-state-in-service-worker.md)
and [`no-timers-in-service-worker`](./no-timers-in-service-worker.md) before
assuming the migration is done.

If the MV2 code listed several scripts, bundle them into one worker entry point
rather than trying to reproduce the multi-script load order.

## See also

- [`references/network-and-dnr.md`](../../references/network-and-dnr.md)

# require-manifest-version-3

**Severity:** error · **Applies to:** manifest.json

`manifest_version` must be 3 — Chrome no longer accepts Manifest V2 extensions.

## Why

Chrome has finished the Manifest V2 deprecation: MV2 extensions are disabled in
the browser and cannot be published or updated in the Web Store. An extension
still declaring `manifest_version: 2` is not a style problem, it is an extension
that does not run.

## Incorrect

```json
{
  "manifest_version": 2,
  "name": "My Extension"
}
```

## Correct

```json
{
  "manifest_version": 3,
  "name": "My Extension"
}
```

## Migrating

Changing the number is the smallest part. Work through, in order:

1. [`no-mv2-keys`](./no-mv2-keys.md) — rename the keys MV3 replaced.
2. [`no-mutable-module-state-in-service-worker`](./no-mutable-module-state-in-service-worker.md)
   — the background page became an ephemeral worker. This is the hard part.
3. [`no-timers-in-service-worker`](./no-timers-in-service-worker.md) — timers
   become alarms.
4. [`no-dom-in-service-worker`](./no-dom-in-service-worker.md) — the background
   context lost its DOM.
5. [`no-remote-code-loading`](./no-remote-code-loading.md) and
   [`no-remote-code-in-csp`](./no-remote-code-in-csp.md) — everything must ship
   in the package.
6. Blocking `webRequest` becomes `declarativeNetRequest` — see
   [`references/network-and-dnr.md`](../../references/network-and-dnr.md).

Running `npx mv3-doctor .` after each step gives you a shrinking list to work
against.

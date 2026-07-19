# Network and declarativeNetRequest

## What changed

MV2 let you inspect and rewrite every request from JavaScript via blocking
`webRequest`. That required waking your background page for every single
request, which is why MV3 replaced it with a declarative API: you register rules
up front, and Chrome applies them without running your code.

| Need | MV3 approach |
| --- | --- |
| Block requests | `declarativeNetRequest` static or dynamic rules |
| Redirect requests | `declarativeNetRequest` with `redirect` action |
| Modify headers | `declarativeNetRequest` with `modifyHeaders` action |
| Observe requests | non-blocking `webRequest` (still available) |
| Arbitrary per-request logic | not possible — redesign around declarative rules |

That last row is the real constraint. If your logic needs to inspect a response
body before deciding, `declarativeNetRequest` cannot express it.

## Static rules

```json
{
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["https://example.com/*"],
  "declarative_net_request": {
    "rule_resources": [
      { "id": "ruleset_1", "enabled": true, "path": "rules.json" }
    ]
  }
}
```

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "||ads.example.com",
      "resourceTypes": ["script", "image", "xmlhttprequest"]
    }
  }
]
```

Static rules cost nothing at runtime and are the default choice.

## Dynamic rules

For rules derived from user settings:

```js
await chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: existingIds,
  addRules: newRules,
});
```

Rule IDs must be unique and are capped. Always pass `removeRuleIds` for the
rules you are replacing, or you will accumulate duplicates across updates.

## Debugging rules that do not fire

`chrome.declarativeNetRequest.getMatchedRules()` reports what actually matched —
use it rather than guessing. Add the `declarativeNetRequestFeedback` permission
during development, and remove it before publishing.

Common causes of a rule silently not applying:

- missing `host_permissions` for the target origin
- `resourceTypes` omitted when the request is not a main frame navigation
- a higher-`priority` rule with an `allow` action winning
- `urlFilter` syntax being subtly wrong (`||` anchors a domain, `|` anchors the
  start or end of the URL)

## Fetching data

Plain `fetch()` from the service worker is unchanged and still the right way to
call your API. The restriction is on executing remote *code*, not on retrieving
remote *data*. Requests from the worker are subject to `host_permissions`.

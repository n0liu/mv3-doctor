# no-broad-host-permissions

**Severity:** warning · **Applies to:** manifest.json

Flags host permissions covering the whole web — the top cause of Web Store
review delays.

## Why

`<all_urls>` and `*://*/*` mean "read and change everything the user does on the
web". Chrome shows a correspondingly alarming install prompt, and reviewers
require a justification proportional to that scope. Many extensions request it
during prototyping and never narrow it down.

## Incorrect

```json
{
  "host_permissions": ["<all_urls>"]
}
```

## Correct

Name the origins you actually contact:

```json
{
  "host_permissions": [
    "https://api.example.com/*",
    "https://*.example.org/*"
  ]
}
```

## When you do not know the origin ahead of time

Use `activeTab` — it grants access to the current tab in response to a user
gesture, with no install-time warning:

```json
{
  "permissions": ["activeTab"]
}
```

Or request hosts at runtime, so the user grants them in context:

```js
const granted = await chrome.permissions.request({
  origins: ["https://example.com/*"],
});
```

Declare these under `optional_host_permissions`. This rule reports broad
patterns there too, since an optional `<all_urls>` is still a request for
everything — but the runtime prompt at least gives the user a real choice.

## When this rule is wrong

Some extensions genuinely need the whole web: ad blockers, password managers,
accessibility tools, screenshot tools. It is a warning rather than an error for
that reason. If it applies to you, keep the permission and write a strong
justification — see
[`references/web-store-review.md`](../../references/web-store-review.md).

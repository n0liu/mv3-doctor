# no-remote-code-in-csp

**Severity:** error · **Applies to:** manifest.json

Flags a `content_security_policy` that permits remote scripts or `unsafe-eval`.

## Why

Manifest V3 only allows `'self'` (and `'wasm-unsafe-eval'`) as script sources
for extension pages. A policy naming a remote origin, or allowing
`'unsafe-eval'`, is rejected at review — and would not work anyway, because the
platform enforces the restriction independently of what the manifest asks for.

A CSP like this is usually a leftover from a Manifest V2 manifest.

## Incorrect

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' https://cdn.example.com; object-src 'self'"
  }
}
```

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'unsafe-eval'; object-src 'self'"
  }
}
```

## Correct

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

In most extensions the key can simply be omitted — the MV3 default is already
`script-src 'self'; object-src 'self'`. Declare it only to tighten the policy
further, never to loosen it.

## WebAssembly

If you genuinely need WebAssembly, `'wasm-unsafe-eval'` is the permitted token:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  }
}
```

This rule does not flag it.

## See also

- [`no-remote-code-loading`](./no-remote-code-loading.md)
- [`no-eval-or-new-function`](./no-eval-or-new-function.md)

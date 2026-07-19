# missing-referenced-script

**Severity:** error · **Applies to:** manifest.json

A script the manifest references could not be read.

## Why

Chrome fails to load an extension whose manifest points at a file that is not
there. The usual causes are a typo, a path that is correct in the source tree
but not in the build output, or running the checker before the build.

This is a built-in check rather than a contributed rule — it reports what the
loader could not read.

## Incorrect

```json
{
  "background": { "service_worker": "src/background.js" }
}
```

…when the packaged extension actually contains `background.js` at the root.

## Correct

Point at the path as it exists in the directory you ship:

```json
{
  "background": { "service_worker": "background.js" }
}
```

## If you use a bundler

Run mv3-doctor against the build output, not the source tree:

```bash
npm run build && npx mv3-doctor dist
```

Checking the source tree of a bundled extension will report missing scripts for
every entry point, because the manifest describes the built layout.

## Paths outside the extension directory

A path that resolves outside the extension root is refused rather than read, and
reported here. Extension paths are always relative to the extension root;
`../` escapes and absolute paths are not valid in a manifest.

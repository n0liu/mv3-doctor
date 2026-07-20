# mv3-doctor

[![npm](https://img.shields.io/npm/v/mv3-doctor.svg)](https://www.npmjs.com/package/mv3-doctor)
[![CI](https://github.com/n0liu/mv3-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/n0liu/mv3-doctor/actions/workflows/ci.yml)
[![downloads](https://img.shields.io/npm/dm/mv3-doctor.svg)](https://www.npmjs.com/package/mv3-doctor)
[![license](https://img.shields.io/npm/l/mv3-doctor.svg)](./LICENSE)

Diagnose Chrome **Manifest V3** extension pitfalls — and teach AI coding agents
to avoid them in the first place.

```bash
npx mv3-doctor path/to/extension
```

```
background.js
  warning 3:5     "requestCount" holds state in memory, but the service worker is restarted regularly — the value resets without warning.  no-mutable-module-state-in-service-worker
          → Persist it with chrome.storage.session (or .local) and read it back at the start of each listener.
  error   6:1     setInterval() in a service worker stops firing as soon as the worker is terminated.  no-timers-in-service-worker
          → Use chrome.alarms.create() — alarms wake the worker back up.

manifest.json
  error   18:1    The "webRequestBlocking" permission has no effect in Manifest V3.  no-mv2-keys
          → Removed in MV3. Use "declarativeNetRequest" to block or redirect requests.

14 problems (11 errors, 3 warnings)
```

## Why this exists

Manifest V3 invalidated assumptions that a decade of extension tutorials still
take for granted — and that language models learned from those tutorials. The
resulting bugs share a shape: **the code works when you test it, then fails in
the field.** The background service worker was still warm during your test. It
will not be warm for your users.

Generic linters cannot catch this, because the same line is a bug in one file
and correct in another. `setInterval` in a service worker is broken;
`setInterval` in a content script is fine. mv3-doctor reads `manifest.json`
first, works out what role each script plays, and only then applies rules — so
it reports the real problems without drowning you in false positives.

It ships two things:

- **A validator** (`npx mv3-doctor`) — checks a built extension.
- **A skill** ([`SKILL.md`](./SKILL.md)) — teaches a coding agent the MV3 rules
  up front, and tells it to run the validator before reporting work as done.

## Install

Run it without installing:

```bash
npx mv3-doctor .
```

Or add it to a project:

```bash
npm install --save-dev mv3-doctor
```

Requires Node 20+.

## Usage

```
mv3-doctor [directory]      Check the extension in <directory> (default: .)

  --json          Machine-readable output, for editors and AI agents
  --color         Force ANSI colour  (--no-color disables it)
  -v, --version   Print the version
  -h, --help      Show this help
```

Exit codes: `0` no errors, `1` at least one error, `2` the extension could not
be read. Warnings do not fail the run.

**Point it at your build output**, not your source tree — that is what Chrome
loads and what the Web Store reviews:

```bash
npm run build && npx mv3-doctor dist
```

### In CI

```yaml
- run: npm run build
- run: npx mv3-doctor dist
```

### With an AI coding agent

Install [`SKILL.md`](./SKILL.md) as a skill so the agent knows the MV3 rules
while it writes, then verifies itself with `npx mv3-doctor --json`. Teaching and
checking together works considerably better than either alone.

### Suppressing a finding

```js
// mv3-doctor-disable-next-line
setInterval(cheapUiTick, 1000);
```

`// mv3-doctor-disable-file` skips a whole file. Prefer fixing the code — and if
a rule is wrong often enough that you are suppressing it routinely, please
[open an issue](https://github.com/n0liu/mv3-doctor/issues), because that is a
bug in the rule.

## Rules

| Rule | Severity | Applies to |
| --- | --- | --- |
| [`require-manifest-version-3`](./docs/rules/require-manifest-version-3.md) | error | manifest.json |
| [`no-mv2-keys`](./docs/rules/no-mv2-keys.md) | error | manifest.json |
| [`no-remote-code-in-csp`](./docs/rules/no-remote-code-in-csp.md) | error | manifest.json |
| [`no-broad-host-permissions`](./docs/rules/no-broad-host-permissions.md) | warning | manifest.json |
| [`no-timers-in-service-worker`](./docs/rules/no-timers-in-service-worker.md) | error | service worker |
| [`no-dom-in-service-worker`](./docs/rules/no-dom-in-service-worker.md) | error | service worker |
| [`no-mutable-module-state-in-service-worker`](./docs/rules/no-mutable-module-state-in-service-worker.md) | warning | service worker |
| [`no-eval-or-new-function`](./docs/rules/no-eval-or-new-function.md) | error | all scripts |
| [`no-remote-code-loading`](./docs/rules/no-remote-code-loading.md) | error | all scripts |

Plus two built-in checks:
[`missing-referenced-script`](./docs/rules/missing-referenced-script.md) and
[`rule-crashed`](./docs/rules/rule-crashed.md).

## Reference guides

Written for humans and agents alike:

- [Service worker lifecycle](./references/service-worker-lifecycle.md)
- [Storage and state](./references/storage-and-state.md)
- [Network and declarativeNetRequest](./references/network-and-dnr.md)
- [Chrome Web Store review](./references/web-store-review.md)

## Contributing

**Adding a rule is the most useful contribution**, and it is deliberately small:
one rule file, one docs page, one line in the registry, plus a fixture. See
[CONTRIBUTING.md](./CONTRIBUTING.md).

Rules encoding a mistake you actually hit in production are the most valuable
kind — if it caught you, it is catching others.

## Programmatic API

```js
import { allRules, diagnose, loadExtension } from "mv3-doctor";

const extension = await loadExtension("./dist");
const { findings } = diagnose(extension, allRules);
```

## License

MIT

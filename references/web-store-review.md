# Chrome Web Store Review

Most rejections are not subtle. They cluster into a handful of causes, and
almost all of them are avoidable before you submit.

## The common rejection reasons

**Permissions that are not visibly used.** Reviewers check that each permission
in the manifest maps to something the user can observe. A permission you added
while prototyping and never removed will hold up the review.

**Broad host permissions without justification.** `<all_urls>` and `*://*/*`
mean "read and change everything the user does on the web". Expect scrutiny.
Narrow to specific origins, use `activeTab`, or request at runtime with
`chrome.permissions.request()`.

**Remote code.** Any script fetched at runtime, `eval()`, `new Function()`, or a
CSP that permits either. MV3 requires everything executable to ship in the
package. This is a hard rejection, not a warning.

**Missing or vague privacy policy.** Required whenever you handle user data.
"We respect your privacy" is not a privacy policy — state what you collect,
why, where it goes, and how long you keep it.

**Mismatch between the listing and the behaviour.** The description, screenshots
and permissions have to describe the same extension.

## Writing a permission justification

Write for a reviewer who has never used your extension and will spend a minute
on it. State the feature, the permission it needs, and what breaks without it.

> **storage** — Saves the user's filter presets so they persist between
> sessions. Without it, presets reset every time the browser restarts.

> **host permission `https://api.example.com/*`** — The extension sends the
> selected text to our translation API and displays the result. No other origin
> is contacted.

Avoid restating the permission name ("Needed for storage"). That is the single
most common reason a justification gets bounced back.

## Before you submit

- Remove development-only permissions (`declarativeNetRequestFeedback`,
  debugging hosts).
- Run `npx mv3-doctor .` and clear every error.
- Load the packaged build unpacked and exercise it after the service worker has
  been idle for a minute — reviewers hit restart bugs that a quick test misses.
- Check the manifest `name`, `description` and `version` are the release values.
- Confirm every screenshot reflects the current UI.

## After rejection

The rejection email names a policy section. Read that section rather than
guessing from the summary line, fix the specific cause, and say what changed
when you resubmit. Resubmitting without changes restarts the queue for nothing.

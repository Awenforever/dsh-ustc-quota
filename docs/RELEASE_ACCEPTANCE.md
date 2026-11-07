# Release Acceptance — Windows Native

This document is the maintainer/QA release gate for the Windows-native DSH
desktop and TokenWorks (词元工坊) surfaces of `dsh-ustc-quota`. It records the
exact environment, test matrix, observed results, and the known DSH carrier
limitation. It is not end-user documentation; user-facing behavior is
documented in [`README.md`](../README.md), and public release notes should stay
user-facing.

## 1. Scope

| Surface | Runtime | Status in this document |
|---|---|---|
| DSH desktop | Windows 11 x64, DSH 0.2.1-rc.3 | required |
| TokenWorks / 词元工坊 | Windows 11 x64, 0.2.12 (`dshVersion` 0.2.0-rc.2) | required |
| Linux / WSL / Web-only | — | not applicable to this plugin's released surface |
| Real USTC quota values | requires a user's USTC credential | not exercised in the clean acceptance VM; do not fake |

The acceptance VM is a clean Windows 11 image. It has **no USTC credential**,
so the quota values are intentionally not asserted. The card must degrade to a
clear “no USTC provider” state, never to invented numbers.

## 2. Baseline

| Item | Value | As-of |
|---|---|---|
| Plugin | `dsh-ustc-quota` 1.1.15 | 2026-11-07 |
| DSH desktop | 0.2.1-rc.3 and 0.2.2-rc.1 | 2026-11-07 |
| TokenWorks | 词元工坊 0.2.12, portable program copy | 2026-10-29 |
| Unit tests | 31 `node:test` cases | 2026-11-07 |
| OS | Windows 11 10.0.26200 x64 | 2026-10-29 |

## 3. Preconditions

- DSH installer SHA-512 matches the official `nightly.yml` file entry and the
  Authenticode signature is valid.
- TokenWorks program files are copied without the user's `data` directory;
  no credential, history, or workspace DB is transferred.
- The plugin is installed into a **test profile** only.
- No production desktop or user profile is modified by acceptance work.
- No key, token, user email, or account metadata appears in screenshots,
  logs, or this document.

## 4. Acceptance Matrix

### 4.1 DSH desktop

| ID | Check | Pass condition | Result |
|---|---|---|---|
| D1 | Install and load | DSH starts; plugin appears after a normal restart | PASS |
| D2 | Sidebar card | `USTC 词元额度` is present; sidebar proportions unchanged | PASS |
| D3 | Version label | A small gray `v1.1.15` is visible beside the title | PASS |
| D4 | Startup check | On launch the update route is queried; no secret is sent | PASS |
| D5 | Up-to-date state | No red dot when current == latest | PASS |
| D6 | Newer version | Red dot appears when a newer release exists | PASS (test-only version copy) |
| D7 | Confirmation modal | Clicking the version shows current → latest, notes, release link, provider, cancel, and update action | PASS |
| D8 | Direct update | The update action installs the release tarball through the host route | PASS |
| D9 | Restart prompt | The modal explicitly requires a full DSH quit/reopen; it does not auto-reload. If the carrier reloads the page after install, the new client shows a persistent restart banner based on the previous version marker | PASS (1.1.6, verified) |
| D10 | No provider data | A credential-free profile shows the “no USTC provider” guidance | PASS |

For D6/D8 the test profile alone was changed to report `1.1.5`; the repository
and published tag stayed at `1.1.6`. The update installed `1.1.6`; the carrier
may reload the page, and the new client shows a persistent restart banner based
on the previous client-version marker until DSH is fully quit and reopened.

### 4.2 TokenWorks / 词元工坊

| ID | Check | Pass condition | Result |
|---|---|---|---|
| T1 | Portable launch | 词元工坊 starts from the test copy; no user data directory is imported | PASS |
| T2 | Card load | `USTC 词元额度` and the current version appear in the TokenWorks sidebar | PASS on 1.1.4 baseline; 1.1.6 pending |
| T3 | Newer version | Red dot appears with a test-only older copy | PASS on 1.1.4 (R6); 1.1.6 pending |
| T4 | Confirmation modal | Current → latest, notes, provider, cancel, update action | PASS on 1.1.4 (R6); 1.1.6 pending |
| T5 | Direct update | Update installs through TokenWorks's host route | PASS on 1.1.4 (R6); 1.1.6 pending |
| T6 | Restart prompt | Modal and/or card banner requires a full TokenWorks quit/reopen | 1.1.6 pending |

TokenWorks 1.1.6 was not accepted in the test VM: its host update path stalled
without installing the release, so this document does not claim a TokenWorks
1.1.6 pass. The 1.1.4 R6 evidence and the 1.1.6 DSH evidence stand separately.

### 4.3 Security and regression

| ID | Check | Pass condition | Result |
|---|---|---|---|
| S1 | Key isolation | No key or credential appears in client responses, logs, or screenshots | PASS (inspected) |
| S2 | No invented quota | Credential-free card shows an error/empty-state, never numbers | PASS |
| S3 | Unit tests | `node --test test/quota.test.js test/update.test.js` | PASS: 31 / 31 |
| S4 | Syntax | `node --check index.js client.js update.js` | PASS |

## 5. Commands

From the repository root:

```powershell
node --check index.js
node --check client.js
node --check update.js
node --test test/quota.test.js test/update.test.js
```

Expected unit result: `pass 31`, `fail 0`.

The desktop UI checks are performed on a clean Windows 11 VM with DSH and
TokenWorks installed into isolated test profiles. The version/red-dot/modal
flow is exercised by setting the **test copy only** to the previous patch
version, then clicking the version label and the update action.

## 6. Known DSH Carrier Limitation

Around the 0.2.1-rc.3 client module loader, the following has been observed on
a desktop whose plugin package was replaced while the app was already running:

```text
web boot: 1 entry did not activate
dsh-ustc-quota: import failed (see console for the import error)
```

This is **not** a syntax or factory error in the plugin. The same installed
client file starts normally after the desktop app is **fully quit and
reopened**. DSH's client-module registry scans packages incrementally and keeps
a package verdict (including a negative verdict) cached per loader specifier
and owning-tree base URL until restart; bundle changes reach the graph only
through its `rebuilt` path. A package replacement performed by the plugin
manager can therefore leave the web-boot manifest without a usable client row;
the web boot reports the generic import failure, and a page refresh alone may
not repair it.

**Acceptance rule:** after installing or replacing a plugin package through
the DSH plugin manager, fully quit and reopen DSH before treating the install
as accepted. If a web boot fails with the message above, reopen DSH; do not
diagnose it as a quota-plugin code error without first reproducing it on a
clean test profile.

The in-app update path passed on the clean acceptance VM, including DSH and
TokenWorks. The carrier limitation remains a restart caveat and must not be
documented as “no restart ever needed”.

## 7. Release Checklist

- [ ] `node --check` passes for host and client sources.
- [ ] 31 unit tests pass.
- [ ] Plugin version, `CLIENT_VERSION`, and `PLUGIN_VERSION` are consistent.
- [ ] README and this acceptance document are updated.
- [ ] Release tag is created from the tested commit.
- [ ] Clean Windows test profile installs the tag and shows the version label.
- [ ] Update check, red dot, modal, and direct update are exercised with a
  test-only older version.
- [ ] A full DSH quit/reopen is performed after any plugin-manager package
  replacement; the card loads without web-boot errors.
- [ ] No key, credential, personal path, or user data appears in evidence.

## 8. Residual

- Real USTC quota values require a user credential and are not part of the
  clean acceptance VM.
- The DSH client-module cache limitation is a carrier issue; the plugin can
  provide restart guidance but cannot rewrite a failed boot.
- The official `pluginUpdates` preview adapter is reserved; the current host
  route uses the stable `pluginManager` path.

## 9. Post-release compatibility smoke: DSH 0.2.1-rc.5

On 2026-10-31 the official nightly feed moved from `0.2.1-rc.3` to
`0.2.1-rc.5` (`releaseDate` 2026-10-29T14:04:01Z). The `rc.yml`, `beta.yml`,
and `latest.yml` feeds were still 404. The signed installer size matched the
feed (289408544 bytes), its SHA-512 matched, and Authenticode reported a valid
DeepSeek signer.

The installer was applied only to the isolated `win11-test` DSH test profile,
never to the running user desktop. With plugin v1.1.6 on rc.5:

- the sidebar card rendered `USTC 词元额度` and `v1.1.6`;
- `snapshot` returned `pluginVersion: 1.1.6`, `keyCount: 0`, `warnings: []`;
- `update?force=1` returned `currentVersion: 1.1.6`, `latestVersion: 1.1.6`,
  `updateAvailable: false`, and the `dsh-plugin-manager` provider;
- no `web boot`/import error was observed.

The rc.5 and rc.4 notes only mention thinking-content display and an ACP stdout
fix; no `sidebar.footer.action`, `conversation.composer.dock`, `pluginManager`,
or update-route contract change was observed. This is a compatibility smoke,
not a full repeat of D1–D10 on rc.5. **No plugin code change was required.**
The running user desktop remains on rc.3 and was not upgraded or restarted.

## 10. v1.1.7 error-label correction

v1.1.7 is a text-only correction for the case where the upstream quota/billing
endpoint rejects the key query. The plugin now shows:

- Chinese: `额度查询被上游拒绝（401/403）`
- English: `Quota query rejected by upstream (401/403)`

It no longer says “key invalid or disabled”. On 2026-11-03 the same USTC keys
returned `/v1/models` 200 while `/key/info` and `/user/info` returned 403, so
the old label was factually wrong. No request, route, quota calculation, or
snapshot field changed; the 30 unit tests still pass. The D1–D10 matrix above
was not re-run because this release changes only that label.

## 11. v1.1.8 key-column auto-fit

v1.1.8 fixes the sidebar layout when a key row shows an issue marker. The first
grid column was fixed at 36px and the label was capped at 30px, so adding the
red issue dot could truncate a label such as `wmw` to `W...`. The table now
computes a shared key-column width from each visible label plus the current-key
star and issue dot, and applies that width to both the header and every row via
a CSS variable. The row data columns keep their equal-fraction sizing.

This is a layout-only change; no request, route, quota calculation, or snapshot
field changed. The 30 unit tests pass. The change was released without installing
it into the running user desktop, per the explicit instruction not to install or
enable it there.

## 12. v1.1.9 pre-install restart warning

v1.1.9 adds a prominent red warning inside the update confirmation modal,
before the “Install update” action. It states that DSH must be fully quit and
reopened after installing, and that if DSH crashes on startup the user should
use Restart or Quit in the DSH crash dialog.

This warning is deliberately shown **before** the package replacement, because
the post-install client banner cannot render if the new client module itself
fails to import during web boot. It is a text/UI-only change; the 30 unit tests
pass and the release was not installed into the running user desktop.

## 13. v1.1.10 upgrade-only warning

v1.1.10 narrows the pre-install warning to upgrades and states the cause:

- DSH Desktop 0.2.1-rc.3 introduced the client-modules incremental-scan cache
  behavior; rc.4 and rc.5 still do not provide a full-rescan/eviction path for
  a package replacement.
- An upgrade therefore requires a full quit/reopen; a page refresh is not a
  reliable substitute.
- A fresh install has no update confirmation modal and is not instructed to
  restart. The warning is rendered only when `updateInfo.updateAvailable` is
  true and the modal is an upgrade modal.

This is a text/UI-only change; no request, route, quota calculation, or snapshot
field changed. The 30 unit tests pass and the release was not installed into the
running user desktop.

## 14. v1.1.11 remove hardcoded future DSH versions

v1.1.11 removes `rc.4` / `rc.5` from the upgrade warning. The warning now says
the issue starts at DSH Desktop 0.2.1-rc.3 and is not confirmed fixed in the
current DSH release. It is not necessary to edit this text for every DSH
release; only when DSH actually provides a full-rescan/eviction path should a
later plugin release remove or disable the warning.

This is a text/UI-only change; no request, route, quota calculation, or snapshot
field changed. The 30 unit tests pass and the release was not installed into the
running user desktop.

## 15. v1.1.12 best-effort footer layout hardening

v1.1.12 hardens the sidebar footer normalization for unknown third-party
actions:

- the card gets `order: 2147483647`, so it follows ordinary footer actions;
- the footer is wrapped and kept full-width;
- a `MutationObserver` watches footer child-list changes and re-applies the
  normalization when another plugin mounts an action later;
- only the card's own chain and the footer are touched; other plugins' action
  elements are not assigned an order.

This remains best-effort because DSH has no shared footer layout-group contract.
A later plugin can still use its own `order`, `position`, portal, or
`!important` rules and defeat the arrangement. The formal fix belongs in the
carrier: a full-width footer panel slot or declarative layout group.

The 30 unit tests pass. This release was not installed into the running user
desktop.

## 16. v1.1.13 update token and retry fix

Reproduced on `win11-test` with the released v1.1.11 client: the token came
from the startup update check, but the modal was opened more than five minutes
later. The first apply returned `invalid-update-token`; the old client then
refreshed the token, and the following apply surfaced `not-changed` because the
plugin manager reported `changed: false` and the old code wrapped that as an
error.

v1.1.13 changes the update path:

- update tokens live 30 minutes instead of 5;
- an apply token is not deleted before the manager finishes;
- concurrent or repeated apply with the same token share one in-flight promise
  and one cached successful result, so a duplicate click cannot consume the
  token and produce `invalid-update-token`;
- the client automatically refreshes the token and retries once after a 403
  `invalid-update-token`;
- a manager `changed: false` is a successful no-op and shows the full-restart
  prompt, not `not-changed`.

Verification: a test-only copy of the v1.1.13 client/Host was labelled 1.1.11
and given a 1-second token TTL. In the isolated `win11-test` profile the stale
token was retried automatically, the manager installed v1.1.12, the card showed
v1.1.12 and the restart banner, with no `invalid-update-token` or `not-changed`
error. 31 unit tests pass.

The first upgrade from v1.1.11/v1.1.12 to v1.1.13 still runs the old update
code; if it fails, install v1.1.13 directly from the plugin page. Subsequent
updates use the fixed path. The release was not installed into the running user
desktop.

## 17. v1.1.14 DSH 0.2.2 hot-update adaptation

DSH Desktop 0.2.2-rc.1, published in the nightly feed on 2026-11-04, adds
third-party plugin package updates and falls back to the previous version when
a hot update fails. v1.1.14 reads the running release from
`window.__DSH_BOOT__.release.version`:

- on 0.2.2-rc.1 and later, the upgrade modal suppresses the forced-restart
  warning, the post-update restart banner is suppressed, and a successful
  update shows the “DSH will hot-reload the plugin” message;
- on 0.2.1-rc.3 through 0.2.1-rc.5, the existing forced-restart warning and
  banner remain;
- an explicit `application: "restart-required"` result still shows the restart
  prompt on every DSH version.

Verified in the isolated `win11-test` VM updated to 0.2.2-rc.1: v1.1.13 loaded
and the update route and footer slot remained functional; v1.1.14 was then
installed into the test profile and the card showed v1.1.14 with no restart
banner. A test-only copy of the v1.1.14 client labelled 1.1.12 opened the
update modal without the red preinstall warning. The actual v1.1.12-to-v1.1.13
update on 0.2.2-rc.1 also hot-reloaded without an app restart.

The 31 unit tests pass. The release was not installed into the running user
desktop.

## 18. v1.1.15 split focus and dark theme

v1.1.15 adds two client-side behaviors:

- **Split focus:** each `conversation.composer.dock` registers a hidden session
  marker. `focusin` / `pointerdown` resolve the nearest session-owned pane;
  shared split containers with multiple markers are ignored. Explicit
  `data-focused` / `aria-selected` attributes cover hosts that expose focus
  state without moving DOM focus.
- **Dark theme:** card and modal surfaces use DSH light/dark tokens; warning
  and restart accents are derived with `color-mix` from DSH state tokens.
  There is no separate theme switch; DSH theme changes apply through CSS
  variables.

Verification: in the isolated `win11-test` profile on DSH 0.2.2-rc.1 with
`dsh-multiview` 0.1.4, a test-instrumented copy of v1.1.15 was opened in a
three-session layout. Clicking pane p1 changed the active session from the
p3 session to the p1 session; clicking p3 changed it back. The focused pane
attribute also moved `p1:true → p3:true`. A focused star therefore follows the
pane. The user also confirmed the live dark theme after a full DSH restart.

The 31 unit tests pass. The release was not installed into the running user
desktop.

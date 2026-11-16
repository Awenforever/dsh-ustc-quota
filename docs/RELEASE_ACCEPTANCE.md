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
| Plugin | `dsh-ustc-quota` 1.1.38 | 2026-11-17 |
| DSH desktop | 0.2.1-rc.3, 0.2.2-rc.1, 0.2.2-rc.3 | 2026-11-15 |
| TokenWorks | 词元工坊 0.2.12, portable program copy | 2026-10-29 |
| Unit tests | 40 `node:test` cases (23 quota + 17 update) | 2026-11-15 |
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
| D3 | Version label | A small gray `v1.1.17` is visible beside the title | PASS |
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
- [ ] 37 unit tests pass.
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

## 19. v1.1.16 npm publication and the official update channel

v1.1.16 moves the update path onto the official DSH seam that 0.2.2 exposes on
`pluginManager`:

| Step | Preferred | Fallback |
|---|---|---|
| Version discovery | `pluginManager.listVersions('dsh-ustc-quota')` | GitHub `releases/latest` |
| Apply | `pluginManager.updateBundle(name, version)` | `pluginManager.installBundle(tarball spec)` |
| Last resort | copyable install spec in the modal | — |

Discovery failures are silent: a profile installed from the GitHub tarball is
not a registry dependency, so `listVersions` answers `not-updatable` and the
card keeps using the release feed. The registry version wins only when it is at
least as new as the GitHub release, and `updateBundle` refusals (for example a
tarball-installed copy) fall back to the release tarball instead of surfacing a
failed update.

Publication: `dsh-ustc-quota@1.1.15` was bootstrapped once with a short-lived
token because npm cannot publish a package's first version through OIDC
(npm/cli#8544). Every later version is published by
`.github/workflows/publish.yml` from a `v*` tag using npm Trusted Publishing
(OIDC) with provenance; the repository stores no npm credential.

Verification: `node --check` on all four modules, 37 `node:test` cases, and
`npm pack --dry-run` (11 files, 38.3 kB) pass. The published 1.1.15 tarball was
re-read from the registry and its integrity matched the local manifest. The
package was not installed over the running user desktop; the production profile
keeps its GitHub-tarball install until the user switches it.

Outstanding: the Trusted Publisher entry on npmjs.com must be created once for
`dsh-ustc-quota` (GitHub Actions → `Awenforever/dsh-ustc-quota` →
`publish.yml`) before a tag can publish.

That entry now exists, and 1.1.16 was the first tag publish through it. The
first attempt failed with a bare `ENEEDAUTH` because `setup-node` was pinned to
Node 22 (npm 10), which never performs the OIDC exchange; Node 24 (npm 11) fixed
it on the same tag, and `publish.yml` now refuses to run below npm 11.5.
`dsh-ustc-quota@1.1.16` is live with a provenance attestation
(`/-/npm/v1/attestations/dsh-ustc-quota@1.1.16`).


## 20. v1.1.17 — the restart banner no longer fires after a completed restart

The banner that asks users to fully quit and reopen exists for carriers that keep
serving the client bundle a page booted with. Until 1.1.16 the client decided it
from a localStorage marker: any difference between the recorded version and the
running client showed the banner, so the first launch *after* a successful
in-app update asked for the restart the user had just performed, and a downgrade
showed it as well.

v1.1.17 decides from evidence instead: the banner appears only when the host
reports an installed package version **newer** than the client module the page
is running (`snapshot.pluginVersion > CLIENT_VERSION`). A fresh launch reports
the same version on both sides and stays quiet; a page that genuinely kept stale
code still gets the banner.

Observed on 2026-11-14 before the fix:
- TokenWorks 0.2.109 (dsh 0.2.1-rc.5, old carrier), 1.1.15 → 1.1.16 in-app
  update: the dialog required a full restart; the launch after that restart ran
  1.1.16 yet still showed "插件已更新，请完全退出并重开 DSH"; only a second
  launch cleared it.
- The same comparison also fired on an intentional downgrade.

After the fix the banner is suppressed whenever host and page agree, which is
what a real restart produces. The hot-update path (DSH 0.2.2-rc.1 and newer)
never shows it, as before.

`node --check` and the 37 node:test cases still pass; the change is client-only
and does not alter the snapshot or update routes.

## 21. v1.1.17 closure on DSH 0.2.2-rc.3

As-of 2026-11-15 the released v1.1.17 was re-verified on a registry-installed
profile running DSH 0.2.2-rc.3 (Windows native):

- snapshot route returns `pluginVersion` 1.1.17 with `warnings: []`;
- update route returns `currentVersion = latestVersion = 1.1.17`, `updateAvailable: false`;
- 37 unit tests pass (23 quota + 14 update);
- the card shows `v1.1.17` and no restart banner after the host reload.

When the installed version already equals the published one, the update route
reports `source: "github"` because no newer registry version exists to prefer.
That is expected: the registry path is preferred only when it offers a version
at least as new as the GitHub release.

## 22. v1.1.18 — update discovery no longer depends on GitHub reachability

v1.1.17 asked GitHub for the latest release *before* asking the carrier for
registry versions, and did not catch the failure. On a network that can reach
npm but not GitHub, the whole update check threw, so a registry-installed copy
never learned about a newer version.

Reproduced before the fix with the released code:

    new UpdateService({ listVersions → 1.1.18 }, { fetchImpl: throws }).check(true)
    → rejected: github-unreachable        # the registry answer was discarded

v1.1.18 reorders discovery: `listVersions` runs first, the release feed is a
fallback, and a GitHub failure is captured instead of aborting. The check only
fails when both channels fail. Covered by three new tests (40 total):

- registry answer + unreachable GitHub → `source: registry`, update offered;
- broken `listVersions` + working GitHub → `source: github`, update offered;
- both failing → the check still rejects, so the UI can show a real failure.

## 23. v1.1.19 — TokenWorks mark in the card header

The card title now carries the TokenWorks brand mark. The official asset on
`ustc-wjh` (`D:\Programs\TokenWorks\resources\brand\icon.svg` and
`icon-256.png`) is five rounded tiles forming a T. It is reproduced here as a
24-viewBox monochrome stroke icon (15 px, `stroke="currentColor"`, 1.35 stroke,
rounded tiles), because the card style is a single-color line icon and must
follow the light/dark theme without hard-coded fills.

Verification artifact: `scripts/shot-card.mjs` loads `client.js` with a React
shim, captures the component registered on `sidebar.footer.action`, renders the
first frame from a seeded snapshot, and screenshots it with headless Edge. It
uses the component's real inline styles, not a hand-written copy.

The 1.1.19 artifacts were superseded by the v1.1.20 ones below: the icon was
resized to match the Memory card in 1.1.20, so keeping the older renders would
show a size that no longer ships.

Observed: the mark is present in both themes, is monochrome (black in light,
white in dark), and the title starts at the same x-position regardless of the
mark; the mark has a fixed 15 px box. `node --check` and the 40 unit tests pass.

## 24. v1.1.20 — icon size aligned with the Memory card

The v1.1.19 mark was 15 px; the Memory card's mark is 13 px. v1.1.20 matches
the measured Memory specification: 13 px square, 24 viewBox, fill none,
`stroke="currentColor"`, `strokeWidth 1.6`, and a `flex: 0 0 13px` container
so the title starts at the same x-position.

The five-tile TokenWorks silhouette is kept, with slightly wider gaps so the
tiles stay separable at 13 px. Verification uses the real component DOM:

- `docs/screenshots/compare-13px.png`: this card and a Memory card at 1 CSS px =
  1 image px, side by side; both marks are 13 px.
- `docs/screenshots/card-1.1.20.png`: light and dark cards at 1x.

Observed: both marks are the same 13 px box; this mark is monochrome (black in
light, white in dark); the title left edge is stable; the header metrics put the
mark and title on the same center line. 40 unit tests pass.

## 25. v1.1.21 — the card can dock to the right of the conversation

DSH 0.2.2-rc.3 declares 89 slots, but none is a plugin-facing right column for a
conversation: `rightbar` is a single seat owned by the shipped right sidebar
(taking it shadows shipped UI), `conversation.view` is the chat/trajectory tab
list, and `shell.overlay` is a frame-wide layer that does not follow a column.

v1.1.21 therefore registers a second seat in `shell.overlay` and pins it to the
conversation column: it reads `[data-slot="main.conversation"]`, takes that
slot's first element child (the wrapper is `display: contents` and measures
0x0), and re-measures on `ResizeObserver`, window resize and a slow poll. Cards
stack top-down in a 300 px column with a 12 px inset.

Verified on a real TokenWorks 0.2.109 instance (DSH 0.2.1-rc.5 carrier) over
CDP, with v1.1.21 loaded from the workspace:

| state | conversation column | dock |
|---|---|---|
| left sidebar open, right sidebar closed | x 280, w 1000, right 1280 | x 968, w 300, right 1268 |
| right sidebar opened | x 280, w 424, right 704 | x 392, w 300, right 692 |

The dock tracks the column's right edge (column right minus 12 px) rather than
the window edge, which is what "follows the conversation" means here. The
sidebar seat renders nothing while the right position is chosen, so the card is
never shown twice.

## 26. v1.1.22 — the dock becomes the only control, and it stops covering native UI

v1.1.21 put a text button in the header and pinned the dock to the
conversation column's right edge. Both were wrong: the button was noise, and
the edge sits under the native right-bar controls.

v1.1.22:

- The header button is gone. The brand mark itself is the control: hovering the
  card swaps the five-tile mark for a 24-viewBox line glyph (`rect` + arrow)
  pointing at the other side, clicking moves the card, and the mark returns on
  mouse-out (`data-ustc-mark-glyph` reads `brand` / `switch`).
- The dock is placed in the blank strip between the chat content and the turn
  navigator: it measures `[data-slot="conversation.chat.flow"]` for the left
  bound and the per-turn `button[aria-label]` rail for the right bound, then
  insets 24 px from both and clamps the width to 220–420 px.
- Both seats stay mounted: the hidden one renders no DOM (DSH footer layout
  normalisation rewrites `display` on ancestors, so a hidden wrapper is not
  enough) but keeps its state, and it skips polling while hidden.

Verified over CDP on a real TokenWorks 0.2.109 instance with a synthetic layout
(chat content right edge 940, turn rail left edge 1240, viewport 1280):

| measurement | value |
|---|---|
| dock | x 964, w 252, right 1216 |
| expected (rail − 24, content.right + 24) | right 1216, width 252 |
| cards on screen | 1 (right seat only) |
| glyph | `brand` at rest, `switch` while hovered |

At the user's 1920 px window (content right edge 1600, rail 1900) the same
formula yields x 1624 / w 252 / right 1876, which matches the requested area.

The screenshot harness had been kebab-casing `viewBox` into `view-box`, so every
earlier harness capture drew the mark with a broken coordinate system; the fix
preserves SVG camelCase attributes. The real DOM was always correct.

## 27. v1.1.23 — the dock starts below the tab strip, and the glyph stops being an arrow

Two corrections from looking at the real window:

- The dock was pinned to the top of the conversation column, which is the tab
  row. It now reads `[data-conversation-tabs]`, takes that row's bottom edge,
  adds the 24 px inset, and caps its height at `column.bottom - top - 12`, so it
  can neither cross nor touch the separator under 对话 / 轨迹 / 看板 / Codex.
- The hover glyph was a rectangle with an arrow, which reads as "navigate"
  rather than "dock". It is now a layout glyph: a panel frame whose narrow band
  (divider + solid pill) marks the side the card is about to occupy, mirrored
  for the other direction.

Verified over CDP with a synthetic tab row (bottom edge 77), chat content right
edge 940 and turn rail at 1240 on a 1280 viewport:

| measurement | value |
|---|---|
| dock | x 964, y 101, w 252, right 1216 |
| expected | y = 77 + 24, right = 1240 - 24, w = 1240 - 940 - 48 |
| cards | 1 |
| glyph | `switch` while hovered |

## 28. v1.1.24 — the dock keeps its distance and borrows the sidebar surface

v1.1.23 measured the flow **container**, which spans the whole column, so the
left bound was wrong and the card grew over the chat text; the 24 px insets read
as too much air on the other three sides; and a white card on the white
conversation surface made the (unchanged) shadow look heavy.

v1.1.24:

- The left bound is now the widest chat **row** (`[data-slot="conversation.chat.flow"] > *`),
  not the container. All four insets are 12 px; the width range is 180–420 px.
- The docked card uses `--dsw-specific-sidebar-fill` — the same fill the left
  sidebar uses — and keeps the card's original shadow. The dock container no
  longer sets `overflow: auto`, which was clipping that shadow.

Verified over CDP with a realistic layout (flow container 280–1280, rows
620–940, turn rail 1240, tab row bottom 77, viewport 1280):

| measurement | value | expected |
|---|---|---|
| dock | x 952, y 89, w 276, right 1228 | rows.right + 12, tabs.bottom + 12, rail − 12 − w |
| card background | `rgb(249, 250, 251)` | sidebar fill |
| card shadow | `rgba(0,0,0,.16) 0 3px 12px` | unchanged from the sidebar card |

## 29. v1.1.25 — the right bound is the drag handle, and every inset is 6 px

The conversation boundary the user drags is not the transcript container: DSH
renders two `.widthHandle[data-side]` strips (10 px, `cursor: col-resize`) whose
inner edge sits at content + 24 px. v1.1.24 measured chat rows, which put the
card on top of that strip.

v1.1.25 places the card between those two anchors: left = handle.right + 6,
right = turn rail − 6, top = tab row bottom + 6 (the same 6 px the sidebar uses
between stacked cards), width = the remaining span clamped to 180–480 px.

Verified over CDP with a synthetic handle (964–974), turn rail 1240 and tab row
bottom 77:

| measurement | value | expected |
|---|---|---|
| dock | x 980, y 83, w 254, right 1234 | handle.right + 6, tabs.bottom + 6, rail − 6 |
| background | rgb(249,250,251) | sidebar fill |

## 30. v1.1.26 — the dock reserves its own strip instead of squeezing the transcript

Because the transcript is centred in the conversation box, the blank strip right of
it is narrower than the one on the left, and v1.1.25 hid the card entirely once the
sidebar shrank the column (the span fell under the minimum width).

v1.1.26 chooses "shrink the conversation area, never cover the turn navigator":
while the right position is active the plugin sets `padding-right` on the
conversation column to `width + 12`. DSH centres the transcript and the turn rail
inside the padding box, so both slide left and the dock owns the reserved strip.
The card can therefore touch the window edge without covering anything.

Width policy: 26% of the column, clamped to 200–340 px; if that leaves the
transcript under 360 px the dock drops to whatever keeps the transcript whole,
down to a 140 px floor — below that the card gets narrower rather than vanishing.

Verified over CDP on TokenWorks (padding probe showed the turn rail moving from
x 1240 to x 948 under a 292 px inset):

| state | column | padding-right | dock | visible |
|---|---|---|---|---|
| sidebar open | 280–1280 (w 1000) | 272 px | x 1014, w 260, right 1274 | yes |
| sidebar collapsed | 0–1280 (w 1280) | 345 px | x 941, w 333, right 1274 | yes |

Switching back to the left seat removes the padding (`padding-right: ""`), and
only one card is ever mounted.

## 31. v1.1.27 – v1.1.33 — measuring the real window, and the regression that taught the lesson

v1.1.26 shipped a reserved-strip dock that was only ever checked against synthetic
layouts. On the real 1920 px window the padding never stuck (a React effect was the
only writer) and the card overlapped both the transcript and the turn rail.

Iterating on measurements alone produced two more mistakes: an unclamped rail
inset that reserved 544 px, and — while stripping the temporary diagnostics — the
loss of the helper functions the dock calls, which crashed the seat and made the
card disappear entirely in v1.1.32.

v1.1.33 is the first build verified with real screenshots from a real session
(TokenWorks, one turn):

| state | column | padding-right | dock | cards |
|---|---|---|---|---|
| sidebar open | 280–1280 (w 1000) | 272 px | x 1014, w 260, right 1274 | 1 |
| sidebar collapsed | 0–1280 (w 1280) | 345 px | x 941, w 333, right 1274 | 1 |

Both states are captured in `docs/screenshots/card-1.1.33-sidebar-*.png`. The
reserved padding is now applied from the same loop that measures it, so a DSH
re-render of the column cannot drop it, and the rail inset is clamped to 72 px
with the whole reserve capped at 34% of the column.

## 32. v1.1.38 — compact card, and room made on the left when the strip is tight

- Each window cell now renders value, percent and bar on one line (bar takes the
  remaining inline space), and the refreshed-at timestamp moved from the header to
  the right end of the legend row. Card height drops by roughly a third.
- When the measured strip between the conversation boundary and the rail is under
  220 px, the plugin pads the conversation column and pins the transcript to the
  left edge of that padded box, so the freed space lands on the right instead of
  being split by centring. The padding is cumulative and stops once the strip is
  wide enough; 240 px is the readability floor.

Verified over CDP on TokenWorks 1.1.38 (1280 px window, real session): padding
settled at 146 px, dock x 1074–1234 with the rail at 1240, stable across samples.

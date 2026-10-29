# Release Acceptance — Windows Native

This document is the release gate for the Windows-native DSH desktop and
TokenWorks (词元工坊) surfaces of `dsh-ustc-quota`. It records the exact
environment, test matrix, observed results, and the known DSH carrier
limitation. Product behavior remains documented in [`README.md`](../README.md).

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
| Plugin | `dsh-ustc-quota` 1.1.6 | 2026-10-29 |
| DSH desktop | 0.2.1-rc.3, official signed installer | 2026-10-29 |
| TokenWorks | 词元工坊 0.2.12, portable program copy | 2026-10-29 |
| Unit tests | 30 `node:test` cases | 2026-10-29 |
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
| D3 | Version label | A small gray `v1.1.6` is visible beside the title | PASS |
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
| S3 | Unit tests | `node --test test/quota.test.js test/update.test.js` | PASS: 30 / 30 |
| S4 | Syntax | `node --check index.js client.js update.js` | PASS |

## 5. Commands

From the repository root:

```powershell
node --check index.js
node --check client.js
node --check update.js
node --test test/quota.test.js test/update.test.js
```

Expected unit result: `pass 30`, `fail 0`.

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
- [ ] 30 unit tests pass.
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

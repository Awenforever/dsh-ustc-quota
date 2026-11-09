/**
 * Update support for dsh-ustc-quota.
 *
 * Discovery prefers the carrier's official registry lookup
 * (`pluginManager.listVersions`, which only answers for registry-installed
 * packages) and falls back to GitHub's latest non-prerelease release. Applying
 * an update is delegated to the carrier as well: `pluginManager.updateBundle`
 * for registry versions, `pluginManager.installBundle` with the release
 * tarball otherwise, and a copyable spec when neither exists. Nothing here runs
 * a package-manager command from the plugin, so every write stays inside the
 * official profile lifecycle.
 */

export const PLUGIN_ID = 'dsh-ustc-quota';
export const REPOSITORY = 'Awenforever/dsh-ustc-quota';
export const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';
export const UPDATE_ARCHIVE_BASE = `https://github.com/${REPOSITORY}/archive/refs/tags`;
export const UPDATE_MAIN_SPEC = `https://github.com/${REPOSITORY}/archive/refs/heads/main.tar.gz`;
export const DEFAULT_UPDATE_TTL_MS = 6 * 60 * 60 * 1000;
export const DEFAULT_UPDATE_TIMEOUT_MS = 10000;

/**
 * @typedef {Object} PluginUpdateProvider
 * @property {string} id
 * @property {string} label
 * @property {boolean} experimental
 * @property {boolean} canApply
 * @property {null | ((spec: string, meta: { version: string }) => Promise<unknown>)} apply
 */

export function normalizeVersion(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^v/i, '');
}

export function versionParts(value) {
  return normalizeVersion(value)
    .split('.')
    .map((part) => parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

/** @returns {number} negative, zero, or positive like a comparator. */
export function compareVersions(leftValue, rightValue) {
  const left = versionParts(leftValue);
  const right = versionParts(rightValue);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index] || 0;
    const b = right[index] || 0;
    if (a !== b) return a - b;
  }
  return 0;
}

export function isUpdateAvailable(currentVersion, latestVersion) {
  return compareVersions(latestVersion, currentVersion) > 0;
}

export function specForVersion(version) {
  return `${UPDATE_ARCHIVE_BASE}/v${normalizeVersion(version)}.tar.gz`;
}

/** The registry spec a user would paste into the plugin page. */
export function registrySpecForVersion(version) {
  return `${PLUGIN_ID}@${normalizeVersion(version)}`;
}

export function releaseUrlForVersion(version) {
  return `https://github.com/${REPOSITORY}/releases/tag/v${normalizeVersion(version)}`;
}

export function parseGitHubRelease(payload) {
  if (!payload || typeof payload !== 'object' || typeof payload.tag_name !== 'string') {
    throw new Error('invalid-release');
  }
  const version = normalizeVersion(payload.tag_name);
  if (!version) throw new Error('invalid-release-version');
  return {
    version,
    tag: `v${version}`,
    htmlUrl: typeof payload.html_url === 'string' ? payload.html_url : releaseUrlForVersion(version),
    name: typeof payload.name === 'string' ? payload.name : `v${version}`,
    notes: typeof payload.body === 'string' ? payload.body : '',
    publishedAt: typeof payload.published_at === 'string' ? payload.published_at : null,
  };
}

/**
 * Pick the newest usable stable version from a `PluginVersionList`.
 *
 * A prerelease is skipped unless it is the only entry (the package itself may
 * ship `-rc.N` while a line is being tested). Versions the carrier marked as
 * incompatible with the running DSH version are never offered.
 */
export function pickRegistryVersion(list) {
  if (!list || list.status !== 'listed' || !Array.isArray(list.versions)) return null;
  const usable = list.versions
    .filter((entry) => entry && typeof entry.version === 'string')
    .filter((entry) => !entry.incompatible)
    .map((entry) => ({ version: normalizeVersion(entry.version), prerelease: entry.prerelease === true }))
    .filter((entry) => entry.version);
  if (!usable.length) return null;
  const stable = usable.filter((entry) => !entry.prerelease);
  const pool = stable.length ? stable : usable;
  return pool.reduce((best, next) => (compareVersions(next.version, best) > 0 ? next : best)).version;
}

/**
 * Ask the carrier for published registry versions of this plugin.
 *
 * `listVersions` only answers for a registry-installed dependency, so a profile
 * that installed the GitHub tarball simply gets `null` and keeps using the
 * release feed. Any failure is silent: discovery must never break the card.
 *
 * @returns {Promise<null | { version: string, registry: string }>}
 */
export async function discoverRegistryUpdate(ctx, currentVersion) {
  const manager = readService(ctx, 'pluginManager');
  if (!manager || typeof manager.listVersions !== 'function') return null;
  let list;
  try {
    list = await manager.listVersions(PLUGIN_ID);
  } catch {
    return null;
  }
  const version = pickRegistryVersion(list);
  if (!version || !isUpdateAvailable(currentVersion, version)) return null;
  return {
    version,
    registry: typeof list.registry === 'string' && list.registry ? list.registry : DEFAULT_REGISTRY,
  };
}

function readService(ctx, key) {
  try {
    return ctx && typeof ctx.get === 'function' ? ctx.get(key) : undefined;
  } catch {
    return undefined;
  }
}

/** Collapse a `PluginUpdateResult` to the ChangeResult it carries. */
function unwrapUpdateResult(result) {
  if (!result || typeof result !== 'object') return result;
  if (result.result && typeof result.result === 'object') return result.result;
  return result;
}

function resultFailed(result) {
  if (!result || typeof result !== 'object') return true;
  if (result.error) return true;
  if (result.application === 'failed' || result.application === 'cancelled') return true;
  // A `PluginUpdateResult` that stopped at `check` or `remove` never installed.
  if (typeof result.step === 'string' && result.step !== 'install') return true;
  return false;
}

/**
 * Resolve the carrier's update adapter, preferring the official registry path.
 *
 * Order: reserved `pluginUpdates`/`pluginUpdater` preview → `pluginManager`
 * (registry update plus tarball install) → manual spec.
 *
 * @returns {PluginUpdateProvider}
 */
export function resolveUpdateProvider(ctx) {
  const official = readService(ctx, 'pluginUpdates') || readService(ctx, 'pluginUpdater');
  if (official) {
    const apply = typeof official.applyUpdate === 'function'
      ? official.applyUpdate.bind(official)
      : typeof official.update === 'function'
        ? official.update.bind(official)
        : null;
    if (apply) {
      return {
        id: 'official-plugin-updates',
        label: 'official-plugin-updates',
        experimental: true,
        canApply: true,
        canRegistry: false,
        applyRegistry: null,
        apply: (spec, meta) => apply({ id: PLUGIN_ID, spec, version: meta && meta.version }),
      };
    }
  }

  const manager = readService(ctx, 'pluginManager');
  if (manager) {
    const canRegistry = typeof manager.updateBundle === 'function';
    const canInstall = typeof manager.installBundle === 'function';
    if (canRegistry || canInstall) {
      return {
        id: 'dsh-plugin-manager',
        label: 'dsh-plugin-manager',
        experimental: true,
        canApply: true,
        canRegistry,
        applyRegistry: canRegistry
          ? (version) => manager.updateBundle(PLUGIN_ID, normalizeVersion(version))
          : null,
        apply: canInstall
          ? (spec) => manager.installBundle(spec, { saveExact: true })
          : (spec, meta) => manager.updateBundle(PLUGIN_ID, normalizeVersion(meta && meta.version)),
      };
    }
  }

  return {
    id: 'manual',
    label: 'manual',
    experimental: false,
    canApply: false,
    canRegistry: false,
    applyRegistry: null,
    apply: null,
  };
}

export function serializeProvider(provider) {
  return {
    id: provider.id,
    label: provider.label,
    experimental: provider.experimental,
    canApply: provider.canApply,
  };
}

export async function fetchLatestRelease(fetchImpl, options = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch-unavailable');
  const repository = options.repository || REPOSITORY;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_UPDATE_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://api.github.com/repos/${repository}/releases/latest`, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'dsh-ustc-quota-update-check',
        'x-github-api-version': '2022-11-28',
      },
      signal: controller.signal,
    });
    if (!response || !response.ok) {
      throw new Error(`github-http-${response ? response.status : 'unknown'}`);
    }
    return parseGitHubRelease(await response.json());
  } finally {
    clearTimeout(timer);
  }
}

export class UpdateService {
  constructor(ctx, options = {}) {
    this.ctx = ctx;
    this.currentVersion = normalizeVersion(options.currentVersion || '');
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.repository = options.repository || REPOSITORY;
    this.ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : DEFAULT_UPDATE_TTL_MS;
    this.timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_UPDATE_TIMEOUT_MS;
    this.now = typeof options.now === 'function' ? options.now : Date.now;
    this.cached = null;
    this.cachedAt = 0;
    this.inFlight = null;
  }

  async apply(expected) {
    const info = await this.check(false);
    if (!info.updateAvailable) return { ok: false, error: 'up-to-date' };
    if (expected && typeof expected.spec === 'string' && expected.spec !== info.spec) {
      return { ok: false, error: 'stale-update' };
    }
    const provider = resolveUpdateProvider(this.ctx);
    if (!provider.canApply) {
      return { ok: false, error: 'provider-unavailable', spec: info.spec };
    }

    let attempt = 'install';
    let fallbackReason = null;
    let result = null;

    if (info.source === 'registry' && typeof provider.applyRegistry === 'function') {
      attempt = 'registry';
      try {
        result = await provider.applyRegistry(info.latestVersion);
      } catch (error) {
        result = null;
        fallbackReason = error && error.message ? String(error.message) : 'update-threw';
      }
      if (resultFailed(result)) {
        // A profile that installed the release tarball is not a registry
        // dependency, so the carrier refuses `updateBundle`. Fall back to the
        // install spec instead of surfacing that as a failed update.
        fallbackReason = fallbackReason || 'registry-refused';
        result = null;
      }
    }

    if (!result) {
      attempt = 'install';
      try {
        result = await provider.apply(specForVersion(info.latestVersion), { version: info.latestVersion });
      } catch (error) {
        return {
          ok: false,
          error: 'apply-failed',
          spec: info.spec,
          message: error && error.message ? String(error.message) : 'install-threw',
        };
      }
    }

    const flat = attempt === 'registry' ? unwrapUpdateResult(result) : result;
    if (!flat) {
      return { ok: false, error: 'apply-failed', spec: info.spec };
    }
    if (flat.application === 'failed' || flat.application === 'cancelled' || flat.error) {
      return { ok: false, error: 'apply-failed', spec: info.spec, result, attempt };
    }
    if (flat.changed === false) {
      // The manager may already have the package installed (for example a
      // previous attempt installed it but the response was lost), or it may
      // legitimately have nothing to change. This is not a failed update and
      // must stay retryable from the client.
      return {
        ok: true,
        changed: false,
        application: typeof flat.application === 'string' ? flat.application : 'noop',
        spec: info.spec,
        latestVersion: info.latestVersion,
        provider: serializeProvider(provider),
        attempt,
        fallbackReason,
        result,
      };
    }
    return {
      ok: true,
      changed: true,
      spec: info.spec,
      latestVersion: info.latestVersion,
      provider: serializeProvider(provider),
      attempt,
      fallbackReason,
      result,
    };
  }

  result(info, provider) {
    return {
      ...info,
      provider: serializeProvider(provider),
      canApply: info.updateAvailable && provider.canApply,
    };
  }

  async check(force = false) {
    const provider = resolveUpdateProvider(this.ctx);
    const now = this.now();
    if (!force && this.cached && now - this.cachedAt < this.ttlMs) {
      return this.result(this.cached, provider);
    }
    if (this.inFlight) return this.inFlight;

    const promise = (async () => {
      const release = await fetchLatestRelease(this.fetchImpl, {
        repository: this.repository,
        timeoutMs: this.timeoutMs,
      });

      // Official discovery first, release feed second. `listVersions` only
      // answers for a registry-installed dependency; anything else keeps the
      // GitHub release as the source of truth.
      const registryHit = await discoverRegistryUpdate(this.ctx, this.currentVersion);
      const preferRegistry = Boolean(registryHit)
        && compareVersions(registryHit.version, release.version) >= 0;

      const latestVersion = preferRegistry ? registryHit.version : release.version;
      const updateAvailable = isUpdateAvailable(this.currentVersion, latestVersion);
      const info = {
        ok: true,
        currentVersion: this.currentVersion,
        latestVersion,
        updateAvailable,
        source: preferRegistry ? 'registry' : 'github',
        spec: preferRegistry ? registrySpecForVersion(latestVersion) : specForVersion(latestVersion),
        installSpec: specForVersion(latestVersion),
        registry: preferRegistry ? registryHit.registry : null,
        releaseUrl: preferRegistry
          ? releaseUrlForVersion(latestVersion)
          : (release.htmlUrl || releaseUrlForVersion(release.version)),
        releaseName: preferRegistry ? `${PLUGIN_ID} ${latestVersion}` : release.name,
        releaseNotes: preferRegistry ? '' : release.notes.slice(0, 4000),
        publishedAt: preferRegistry ? null : release.publishedAt,
        checkedAt: new Date(now).toISOString(),
      };
      this.cached = info;
      this.cachedAt = now;
      return this.result(info, provider);
    })().finally(() => {
      this.inFlight = null;
    });

    this.inFlight = promise;
    return promise;
  }
}

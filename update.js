/**
 * Update support for dsh-ustc-quota.
 *
 * The release feed is GitHub's latest non-prerelease release. Applying an
 * update is deliberately delegated to the carrier's plugin manager (the
 * current DSH `pluginManager` Remote, or a future `pluginUpdates` service)
 * instead of running package-manager commands from this plugin. That keeps the
 * update path inside the official profile lifecycle and gives us one adapter
 * seam for the upcoming DSH plugin-update preview.
 */

export const PLUGIN_ID = 'dsh-ustc-quota';
export const REPOSITORY = 'Awenforever/dsh-ustc-quota';
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

function readService(ctx, key) {
  try {
    return ctx && typeof ctx.get === 'function' ? ctx.get(key) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the carrier's update adapter.
 *
 * Reserved contract for the upcoming official DSH plugin-update preview:
 *   ctx.get('pluginUpdates').applyUpdate({ id, spec, version })
 * If that service is absent, the current official `pluginManager.installBundle`
 * is used. If neither exists, the UI stays on the manual-spec path.
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
        apply: (spec, meta) => apply({ id: PLUGIN_ID, spec, version: meta && meta.version }),
      };
    }
  }

  const manager = readService(ctx, 'pluginManager');
  if (manager && typeof manager.installBundle === 'function') {
    return {
      id: 'dsh-plugin-manager',
      label: 'dsh-plugin-manager',
      experimental: true,
      canApply: true,
      apply: (spec) => manager.installBundle(spec, { saveExact: true }),
    };
  }

  return {
    id: 'manual',
    label: 'manual',
    experimental: false,
    canApply: false,
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
      const updateAvailable = isUpdateAvailable(this.currentVersion, release.version);
      const info = {
        ok: true,
        currentVersion: this.currentVersion,
        latestVersion: release.version,
        updateAvailable,
        spec: specForVersion(release.version),
        releaseUrl: release.htmlUrl || releaseUrlForVersion(release.version),
        releaseName: release.name,
        releaseNotes: release.notes.slice(0, 4000),
        publishedAt: release.publishedAt,
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

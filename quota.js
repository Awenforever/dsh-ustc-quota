/**
 * Pure quota parsing, merge, discovery, and config normalization.
 *
 * The Host half only does I/O (credentials, HTTP, profile config). Everything
 * that decides what the bar shows lives here so it can be tested without a
 * live Harness or a network.
 */

export const WINDOW_IDS = ['3h', '12h', '24h'];

const PI_AI_PLUGIN = '@deepseek-ai/dsh-llm-pi-ai';
const DEFAULT_BASE_URLS = ['https://api.llm.ustc.edu.cn'];
const RESET_GRACE_MS = 2000;

function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Normalize a base URL for equality: protocol + host + path without a trailing
 * slash. Returns null for an unparsable or relative value.
 */
export function normalizeBaseURL(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = new URL(value.trim());
    if (!url.host) return null;
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return null;
  }
}

/**
 * Canonical site root used by the quota endpoints. OpenAI-compatible clients
 * commonly set the provider baseURL to `https://api.llm.ustc.edu.cn/v1`, while
 * `/key/info` and `/user/info` live at the site root. Strip one trailing `/v1`
 * so provider IDs/names never matter and the query path stays correct.
 */
export function siteBaseURL(value) {
  const normalized = normalizeBaseURL(value);
  if (normalized === null) return null;
  return normalized.replace(/\/v1$/i, '');
}

export function matchesBaseURL(value, bases) {
  const normalized = siteBaseURL(value);
  if (normalized === null) return false;
  return bases.some((base) => siteBaseURL(base) === normalized);
}

/**
 * Canonical 3h/12h/24h id from a LiteLLM budget duration. `1d` is 24h.
 * Unknown durations return null rather than being guessed into a window.
 */
export function canonicalWindow(duration) {
  if (typeof duration !== 'string') return null;
  const value = duration.trim().toLowerCase();
  if (value === '3h') return '3h';
  if (value === '12h') return '12h';
  if (value === '24h' || value === '1d') return '24h';
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(value);
  if (!match) return null;
  const amount = Number(match[1]);
  const factor = { s: 1 / 3600, m: 1 / 60, h: 1, d: 24 }[match[2]];
  const hours = amount * factor;
  if (hours === 3) return '3h';
  if (hours === 12) return '12h';
  if (hours === 24) return '24h';
  return null;
}

function numeric(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function resetTime(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? value : null;
}

function resetMs(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function windowUsage(info, duration, id) {
  const usage = info && typeof info.budget_limits_usage === 'object' ? info.budget_limits_usage : null;
  if (!usage) return null;
  for (const key of [duration, id]) {
    if (typeof key !== 'string') continue;
    const entry = usage[key];
    if (!entry || typeof entry !== 'object') continue;
    const value = numeric(entry.current_spend);
    if (value !== null) return value;
    const fallback = numeric(entry.spend);
    if (fallback !== null) return fallback;
  }
  return null;
}

/**
 * Read the key-level windows (3h/12h always; 24h when the key itself owns one).
 *
 * @returns {{ windows: Map<string, object>, blocked: boolean, scope: string|null }}
 */
export function parseKeyInfo(info, now = Date.now()) {
  const source = info && typeof info === 'object' ? info : {};
  const windows = new Map();
  const blocked = source.blocked === true || source.soft_budget_cooldown === true;
  const scope = source.metadata && typeof source.metadata.platform_budget_scope === 'string'
    ? source.metadata.platform_budget_scope
    : null;

  const limits = Array.isArray(source.budget_limits) ? source.budget_limits : [];
  for (const limit of limits) {
    if (!limit || typeof limit !== 'object') continue;
    const id = canonicalWindow(limit.budget_duration);
    if (id === null) continue;
    const max = numeric(limit.max_budget);
    if (max === null || max <= 0) continue;
    windows.set(id, {
      id,
      source: 'key',
      used: windowUsage(source, limit.budget_duration, id),
      limit: max,
      resetAt: resetTime(limit.reset_at),
      ratio: null,
      state: 'active',
    });
  }

  const maxBudget = numeric(source.max_budget);
  if (maxBudget !== null && maxBudget > 0) {
    const canonical = canonicalWindow(source.budget_duration);
    const id = canonical !== null
      ? canonical
      : (source.budget_duration === undefined || source.budget_duration === null || source.budget_duration === ''
        ? '24h'
        : null);
    if (id !== null) {
      windows.set(id, {
        id,
        source: 'key',
        used: numeric(source.spend),
        limit: maxBudget,
        resetAt: resetTime(source.budget_reset_at),
        ratio: null,
        state: 'active',
      });
    }
  }

  return { windows, blocked, scope };
}

/**
 * Read the user-level 24h window. Only 24h is taken from this endpoint; the
 * rest of /user/info (email, alias, keys, teams) is deliberately ignored.
 */
export function parseUserInfo(body, now = Date.now()) {
  const source = body && typeof body === 'object' ? body : {};
  const user = source.user_info && typeof source.user_info === 'object' ? source.user_info : source;
  const max = numeric(user.max_budget);
  if (max === null || max <= 0) return null;
  const canonical = canonicalWindow(user.budget_duration);
  const id = canonical !== null
    ? canonical
    : (user.budget_duration === undefined || user.budget_duration === null || user.budget_duration === ''
      ? '24h'
      : null);
  if (id !== '24h') return null;
  return {
    id: '24h',
    source: 'user',
    used: numeric(user.spend),
    limit: max,
    resetAt: resetTime(user.budget_reset_at),
    ratio: null,
    state: 'active',
  };
}

function lastKnownWindow(lastKnown, id) {
  if (!lastKnown) return null;
  const list = Array.isArray(lastKnown.windows)
    ? lastKnown.windows
    : (Array.isArray(lastKnown) ? lastKnown : []);
  const found = list.find((window) => window && window.id === id);
  return found ? { ...found } : null;
}

/**
 * Convert the snapshot of TokenWorks' built-in `tokenworksUsage` service into
 * the same three-window row the DSH path produces.
 *
 * The official service already merges key- and user-scoped windows when their
 * limits and reset times agree; when they differ it keeps both. A compact
 * sidebar cell shows the binding one (the smallest remaining, else the
 * smallest limit) and records its scope.
 *
 * @param {object} snapshot official Host snapshot
 * @param {number} now
 */
export function mapTokenworksSnapshot(snapshot, now = Date.now()) {
  const source = snapshot && typeof snapshot === 'object' ? snapshot : {};

  if (source.ready === false) {
    return { keys: [], warnings: ['tokenworks-not-ready'] };
  }

  const selected = new Map();
  for (const entry of Array.isArray(source.windows) ? source.windows : []) {
    if (!entry || typeof entry !== 'object') continue;
    const id = canonicalWindow(entry.duration);
    if (id === null) continue;
    const limit = numeric(entry.limit);
    if (limit === null || limit <= 0) continue;
    const used = numeric(entry.windowSpend);
    const candidate = {
      id,
      source: entry.scope === 'user' ? 'user' : 'key',
      used,
      limit,
      resetAt: resetTime(entry.resetAt),
    };
    const previous = selected.get(id);
    if (!previous) {
      selected.set(id, candidate);
      continue;
    }
    const previousRemaining = previous.used === null ? null : previous.limit - previous.used;
    const nextRemaining = used === null ? null : limit - used;
    const previousScore = previousRemaining !== null ? previousRemaining : previous.limit;
    const nextScore = nextRemaining !== null ? nextRemaining : limit;
    if (nextScore < previousScore) selected.set(id, candidate);
  }

  const failed = source.state === 'error';
  const windows = WINDOW_IDS.map((id) => {
    const candidate = selected.get(id);
    if (!candidate) {
      return {
        id,
        state: 'not-configured',
        source: null,
        used: null,
        limit: null,
        ratio: null,
        resetAt: null,
      };
    }
    const when = resetMs(candidate.resetAt);
    const resetting = when !== null && when <= now + RESET_GRACE_MS;
    const state = resetting ? 'resetting' : (failed ? 'stale' : 'active');
    const used = resetting ? null : candidate.used;
    const ratio = !resetting && used !== null ? used / candidate.limit : null;
    return {
      id,
      state,
      source: candidate.source,
      used,
      limit: candidate.limit,
      ratio,
      resetAt: candidate.resetAt,
    };
  });

  const blocked = source.blocked === true || windows.some((window) =>
    (window.state === 'active' || window.state === 'stale')
    && window.ratio !== null
    && window.ratio >= 1);
  const errorDetail = failed && typeof source.error === 'string' && source.error.trim() !== ''
    ? source.error.trim()
    : null;

  return {
    keys: [{
      provider: 'ustc-llm',
      label: 'TokenWorks',
      default: true,
      ok: !failed,
      stale: failed && windows.some((window) => window.state !== 'not-configured'),
      fetchedAt: resetTime(source.fetchedAt),
      blocked,
      error: failed ? 'tokenworks-error' : null,
      errorDetail,
      windows,
    }],
    warnings: failed ? ['tokenworks-error'] : [],
  };
}

function fillWindow(id, candidate, now, anyResetting) {
  if (!candidate) {
    return {
      id,
      state: anyResetting ? 'resetting' : 'not-configured',
      source: null,
      used: null,
      limit: null,
      ratio: null,
      resetAt: null,
    };
  }

  const when = resetMs(candidate.resetAt);
  const resetting = when !== null && when <= now + RESET_GRACE_MS;
  const limit = numeric(candidate.limit);
  const rawUsed = numeric(candidate.used);
  const state = resetting
    ? 'resetting'
    : (candidate.source === 'cache' ? 'stale' : 'active');
  const used = resetting ? null : rawUsed;
  const ratio = !resetting && used !== null && limit !== null && limit > 0 ? used / limit : null;

  return {
    id,
    state,
    source: candidate.source === 'cache' ? 'cache' : (candidate.source || null),
    used,
    limit: limit !== null && limit > 0 ? limit : null,
    ratio,
    resetAt: candidate.resetAt || null,
  };
}

/**
 * Merge the two endpoints and the previous successful snapshot into exactly
 * three windows. Per-window state is decided independently: a key-level reset
 * at 12:00 must not mark the still-valid 24h window as resetting.
 */
export function mergeQuota({ keyInfo, userInfo, lastKnown, now = Date.now() } = {}) {
  const parsed = parseKeyInfo(keyInfo, now);
  const user24 = parseUserInfo(userInfo, now);

  const key24 = parsed.windows.get('24h') || null;
  const cached24 = lastKnownWindow(lastKnown, '24h');

  let chosen24 = null;
  if (parsed.scope === 'user' && user24) chosen24 = user24;
  else if (key24) chosen24 = key24;
  else if (user24) chosen24 = user24;
  else if (cached24) chosen24 = { ...cached24, source: 'cache' };

  const candidates = new Map(parsed.windows);
  if (chosen24) candidates.set('24h', chosen24);

  let anyResetting = false;
  for (const window of candidates.values()) {
    const when = resetMs(window.resetAt);
    if (when !== null && when <= now + RESET_GRACE_MS) {
      anyResetting = true;
      break;
    }
  }

  const windows = WINDOW_IDS.map((id) => {
    let candidate = candidates.get(id) || null;
    if (!candidate) {
      const cached = lastKnownWindow(lastKnown, id);
      if (cached) candidate = { ...cached, source: 'cache' };
    }
    return fillWindow(id, candidate, now, anyResetting);
  });

  const blocked = parsed.blocked || windows.some((window) =>
    (window.state === 'active' || window.state === 'stale')
    && window.ratio !== null
    && window.ratio >= 1);

  const stale = windows.some((window) => window.state === 'stale');
  const liveWindows = windows
    .filter((window) =>
      (window.source === 'key' || window.source === 'user')
      && window.state === 'active'
      && window.limit !== null)
    .map((window) => ({ ...window, state: 'active' }));

  return { windows, blocked, stale, liveWindows };
}

/**
 * Normalize the plugin row's raw config. Unknown fields are ignored; every
 * numeric setting is clamped so a typo cannot turn into a request storm.
 */
export function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};

  const configuredBases = Array.isArray(source.baseURLs)
    ? source.baseURLs
      .map((value) => siteBaseURL(value))
      .filter((value) => value !== null)
    : [];
  const baseURLs = configuredBases.length > 0
    ? [...new Set(configuredBases)]
    : [...DEFAULT_BASE_URLS];

  const providers = source.providers && typeof source.providers === 'object' && !Array.isArray(source.providers)
    ? source.providers
    : {};

  return {
    baseURLs,
    providers,
    refreshIntervalMs: clampInt(source.refreshIntervalMs, 10000, 5000, 120000),
    resettingRefreshIntervalMs: clampInt(source.resettingRefreshIntervalMs, 8000, 5000, 60000),
    requestTimeoutMs: clampInt(source.requestTimeoutMs, 8000, 2000, 30000),
    cacheTtlMs: clampInt(source.cacheTtlMs, 8000, 1000, 60000),
    errorCacheTtlMs: clampInt(source.errorCacheTtlMs, 20000, 5000, 120000),
    maxProviders: clampInt(source.maxProviders, 12, 1, 20),
  };
}

function pickEffectiveConfig(row) {
  const override = row && row.override && typeof row.override === 'object' ? row.override : null;
  if (override && Object.keys(override).length > 0) return override;
  const inherited = row && row.inherited && typeof row.inherited === 'object' ? row.inherited : null;
  if (inherited && Object.keys(inherited).length > 0) return inherited;
  const direct = row && row.entry && row.entry.options && row.entry.options.config;
  return direct && typeof direct === 'object' ? direct : {};
}

/**
 * `null` means absent; `undefined` means present but an unresolved `!!js`
 * expression. The distinction lets discovery warn instead of silently
 * pretending the field was empty.
 */
function readStaticString(value) {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (value && typeof value === 'object' && typeof value.__jsExpr === 'string') return undefined;
  return null;
}

/**
 * Discover providers from the effective llm-pi-ai config rows. Explicit
 * plugin config is an override for matching providers, and a full fallback
 * only when discovery found nothing.
 */
export function discoverProvidersFromRows(rows, config) {
  const settings = config || normalizeConfig({});
  const found = new Map();
  const warnings = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    const name = row && row.entry && row.entry.options ? row.entry.options.name : null;
    if (name !== PI_AI_PLUGIN) continue;
    const effective = pickEffectiveConfig(row);
    const providers = effective && effective.providers;
    if (!providers || typeof providers !== 'object' || Array.isArray(providers)) continue;

    for (const [provider, value] of Object.entries(providers)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;

      const displayName = readStaticString(value.displayName);
      if (displayName === undefined) {
        warnings.push(`provider ${provider} 的 displayName 不是静态字符串，已使用 provider ID`);
      }

      const baseURL = readStaticString(value.baseURL);
      if (baseURL === undefined) {
        warnings.push(`provider ${provider} 的 baseURL 不是静态字符串，已跳过`);
        continue;
      }
      if (!baseURL || !matchesBaseURL(baseURL, settings.baseURLs)) continue;

      const keyRef = readStaticString(value.apiKeyEnv);
      if (keyRef === undefined) {
        warnings.push(`provider ${provider} 的 apiKeyEnv 不是静态字符串，已跳过`);
        continue;
      }
      if (!keyRef) {
        warnings.push(`provider ${provider} 没有可用的 apiKeyEnv，已跳过`);
        continue;
      }

      found.set(provider, {
        provider,
        label: displayName || provider,
        keyRef,
        baseURL: siteBaseURL(baseURL),
      });
    }
  }

  const explicit = settings.providers && typeof settings.providers === 'object' ? settings.providers : {};
  let source = found.size > 0 ? 'config' : 'none';

  if (found.size === 0) {
    for (const [provider, value] of Object.entries(explicit)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const keyRef = readStaticString(value.apiKeyEnv);
      if (!keyRef) {
        warnings.push(`兜底 provider ${provider} 没有可用的 apiKeyEnv，已跳过`);
        continue;
      }
      const baseURL = readStaticString(value.baseURL) || settings.baseURLs[0];
      if (!baseURL) continue;
      found.set(provider, {
        provider,
        label: readStaticString(value.label) || provider,
        keyRef,
        baseURL: siteBaseURL(baseURL),
      });
    }
    if (found.size > 0) source = 'fallback';
  } else {
    for (const [provider, value] of Object.entries(explicit)) {
      const current = found.get(provider);
      if (!current || !value || typeof value !== 'object' || Array.isArray(value)) continue;
      const keyRef = readStaticString(value.apiKeyEnv);
      if (keyRef) current.keyRef = keyRef;
      const label = readStaticString(value.label);
      if (label) current.label = label;
    }
  }

  const byKey = new Map();
  for (const provider of found.values()) {
    const existing = byKey.get(provider.keyRef);
    if (existing) {
      warnings.push(`provider ${provider.provider} 与 ${existing.provider} 使用同一密钥，已合并 (same key)`);
      continue;
    }
    byKey.set(provider.keyRef, provider);
  }

  let providers = [...byKey.values()];
  if (providers.length > settings.maxProviders) {
    warnings.push(`已发现 ${providers.length} 个 provider，只显示前 ${settings.maxProviders} 个`);
    providers = providers.slice(0, settings.maxProviders);
  }

  return {
    providers,
    warnings: [...new Set(warnings)],
    source: providers.length > 0 ? source : 'none',
  };
}

/**
 * Host half of dsh-ustc-quota.
 *
 * It discovers the USTC providers from the effective llm-pi-ai config, resolves
 * each provider's key through the credentials service, queries the USTC
 * LiteLLM key/user quota endpoints, and exposes one read-only JSON snapshot to
 * the Client half. Keys never leave this process.
 */

import {
  WINDOW_IDS,
  discoverProvidersFromRows,
  mapTokenworksSnapshot,
  mergeQuota,
  normalizeConfig,
} from './quota.js';

const ROUTE_PATH = '/plugins/dsh-ustc-quota/snapshot';
const KEY_INFO_PATH = 'key/info';
const USER_INFO_PATH = 'user/info';
const DISCOVERY_TTL_MS = 30000;
const LAST_SUCCESS_TTL_MS = 5 * 60 * 1000;
const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
});

export const inject = ['webServer'];

export function apply(ctx, config) {
  const settings = normalizeConfig(config);
  const reader = createReader(ctx, settings);

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: (request, response) => handleSnapshot(ctx, reader, request, response),
  }), 'dsh-ustc-quota: snapshot route');
}

function createReader(ctx, settings) {
  const cache = new Map();
  const tokenworksInFlight = new Map();
  let discovery = null;
  let discoveryAt = 0;
  let inFlight = null;

  async function snapshot(force, language) {
    const tokenworks = ctx.get('tokenworksUsage');
    if (tokenworks && typeof tokenworks.snapshot === 'function') {
      const lang = language === 'en' ? 'en' : 'zh';
      const current = tokenworksInFlight.get(lang);
      if (current) return current;
      const promise = buildTokenworksSnapshot(tokenworks, lang)
        .finally(() => tokenworksInFlight.delete(lang));
      tokenworksInFlight.set(lang, promise);
      return promise;
    }

    if (inFlight) return inFlight;
    const promise = buildSnapshot(force).finally(() => { inFlight = null; });
    inFlight = promise;
    return promise;
  }

  async function buildSnapshot(force) {
    const now = Date.now();
    const discovered = getDiscovery(force, now);
    const defaultProvider = readDefaultProvider(ctx);

    const keys = await Promise.all(discovered.providers.map((provider) =>
      readProvider(ctx, settings, provider, cache, force, now, defaultProvider)));

    const anyResetting = keys.some((key) =>
      Array.isArray(key.windows) && key.windows.some((window) => window.state === 'resetting'));
    const anyError = keys.some((key) => key.ok === false);

    const pollAfterMs = keys.length === 0
      ? 30000
      : anyResetting
        ? settings.resettingRefreshIntervalMs
        : anyError
          ? Math.max(settings.refreshIntervalMs, 15000)
          : settings.refreshIntervalMs;

    return {
      version: 1,
      generatedAt: new Date(now).toISOString(),
      pollAfterMs,
      source: discovered.source,
      warnings: discovered.warnings,
      defaultProvider,
      keys,
    };
  }

  function getDiscovery(force, now) {
    if (!force && discovery !== null && now - discoveryAt < DISCOVERY_TTL_MS) {
      return discovery;
    }

    const warnings = [];
    let rows = [];
    const editor = ctx.get('configEditor');
    if (editor && typeof editor.configuration === 'function') {
      try {
        rows = editor.configuration();
      } catch {
        warnings.push('读取模型配置失败，使用兜底 provider');
      }
    } else {
      warnings.push('configEditor 不可用，使用兜底 provider');
    }

    const result = discoverProvidersFromRows(rows, settings);
    discovery = {
      ...result,
      warnings: [...new Set([...warnings, ...result.warnings])],
    };
    discoveryAt = now;
    return discovery;
  }

  return { snapshot };
}

async function buildTokenworksSnapshot(service, language) {
  let raw;
  try {
    raw = await service.snapshot(JSON.stringify({ language }));
  } catch {
    raw = { ready: true, state: 'error', error: null, windows: [] };
  }
  if (!raw || typeof raw !== 'object') raw = { ready: false };
  const mapped = mapTokenworksSnapshot(raw, Date.now());
  const ready = raw.ready !== false;
  const failed = raw.state === 'error';
  const fetchedAt = mapped.keys[0] && mapped.keys[0].fetchedAt;

  return {
    version: 1,
    generatedAt: fetchedAt || new Date().toISOString(),
    pollAfterMs: !ready ? 30000 : failed ? 5000 : 15000,
    source: 'tokenworks',
    warnings: mapped.warnings,
    defaultProvider: 'ustc-llm',
    keys: mapped.keys,
  };
}

async function readProvider(ctx, settings, provider, cache, force, now, defaultProvider) {
  const cached = cache.get(provider.provider) || null;
  const cachedIsError = cached !== null && cached.value && cached.value.ok === false;
  const ttl = cachedIsError ? settings.errorCacheTtlMs : settings.cacheTtlMs;

  if (!force && cached !== null && now - cached.at < ttl) {
    return { ...cached.value, default: provider.provider === defaultProvider };
  }

  let key;
  try {
    key = await resolveKey(ctx, provider);
  } catch (error) {
    return failure(provider, cache, now, errorCode(error), defaultProvider);
  }

  const [keyResult, userResult] = await Promise.allSettled([
    fetchJson(buildEndpoint(provider.baseURL, KEY_INFO_PATH), key, settings.requestTimeoutMs),
    fetchJson(buildEndpoint(provider.baseURL, USER_INFO_PATH), key, settings.requestTimeoutMs),
  ]);

  if (keyResult.status === 'rejected') {
    return failure(provider, cache, now, errorCode(keyResult.reason), defaultProvider);
  }

  const info = unwrapInfo(keyResult.value);
  const userBody = userResult.status === 'fulfilled' ? userResult.value : null;
  const previous = cached && cached.lastSuccess ? { windows: cached.lastSuccess.windows } : null;

  let merged;
  try {
    merged = mergeQuota({ keyInfo: info, userInfo: userBody, lastKnown: previous, now });
  } catch {
    return failure(provider, cache, now, 'invalid-response', defaultProvider);
  }

  const result = {
    provider: provider.provider,
    label: provider.label,
    default: provider.provider === defaultProvider,
    ok: true,
    stale: merged.stale,
    fetchedAt: new Date(now).toISOString(),
    blocked: merged.blocked,
    error: null,
    windows: merged.windows,
  };

  const fresh = merged.windows.filter((window) =>
    (window.state === 'active' || window.state === 'stale')
    && window.limit !== null
    && window.used !== null);
  const lastSuccess = fresh.length > 0
    ? { windows: fresh, at: now }
    : (cached && cached.lastSuccess ? cached.lastSuccess : null);

  cache.set(provider.provider, {
    at: now,
    value: result,
    lastSuccess,
    lastSuccessAt: lastSuccess ? lastSuccess.at : null,
  });
  return result;
}

function failure(provider, cache, now, code, defaultProvider) {
  const cached = cache.get(provider.provider) || null;
  const last = cached && cached.lastSuccess
    && cached.lastSuccessAt !== null
    && now - cached.lastSuccessAt < LAST_SUCCESS_TTL_MS
    ? cached.lastSuccess
    : null;

  const result = {
    provider: provider.provider,
    label: provider.label,
    default: provider.provider === defaultProvider,
    ok: false,
    stale: last !== null,
    fetchedAt: new Date(last !== null ? last.at : now).toISOString(),
    blocked: false,
    error: code,
    windows: last !== null ? last.windows : emptyWindows(),
  };

  cache.set(provider.provider, {
    at: now,
    value: result,
    lastSuccess: cached ? cached.lastSuccess : null,
    lastSuccessAt: cached ? cached.lastSuccessAt : null,
  });
  return result;
}

function emptyWindows() {
  return WINDOW_IDS.map((id) => ({
    id,
    state: 'not-configured',
    source: null,
    used: null,
    limit: null,
    ratio: null,
    resetAt: null,
  }));
}

function unwrapInfo(body) {
  if (body && typeof body === 'object'
    && body.info && typeof body.info === 'object' && !Array.isArray(body.info)) {
    return body.info;
  }
  return body && typeof body === 'object' ? body : {};
}

async function resolveKey(ctx, provider) {
  const credentials = typeof ctx.get === 'function' ? ctx.get('credentials') : ctx.credentials;
  if (!credentials || typeof credentials.resolve !== 'function') {
    throw quotaError('no-key');
  }
  const resolved = await credentials.resolve(provider.keyRef);
  const value = resolved && typeof resolved.value === 'string' ? resolved.value.trim() : '';
  if (value === '') throw quotaError('no-key');
  return value;
}

function buildEndpoint(baseURL, path) {
  const base = typeof baseURL === 'string' && baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
  return new URL(path, base).toString();
}

async function fetchJson(url, key, timeoutMs) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        authorization: `Bearer ${key}`,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const name = error && typeof error === 'object' ? error.name : '';
    throw quotaError(name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network');
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw quotaError('unauthorized');
    if (response.status === 429) throw quotaError('rate-limited');
    if (response.status >= 500) throw quotaError('server-error');
    throw quotaError('http-error');
  }

  let text;
  try {
    text = await response.text();
  } catch {
    throw quotaError('network');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw quotaError('invalid-response');
  }
}

function quotaError(code) {
  const error = new Error(code);
  error.quotaCode = code;
  return error;
}

function errorCode(error) {
  if (error && typeof error === 'object' && typeof error.quotaCode === 'string') {
    return error.quotaCode;
  }
  return 'unknown';
}

function isDesktopHost(ctx) {
  try {
    if (ctx.get('desktopProfiles')
      || ctx.get('desktopPnpm')
      || ctx.get('tokenworksBootstrap')
      || ctx.get('tokenworksUsage')) return true;
  } catch {
    // fall through to the process-shape checks
  }
  const home = String(process.env.DSH_HOME || '').toLowerCase();
  if (home.includes('tokenworks-electron')) return true;
  const argv = Array.isArray(process.argv) ? process.argv.join(' ').toLowerCase() : '';
  return argv.includes('dsh-desktop-host')
    || argv.includes('tokenworks')
    || argv.includes('eduwork');
}

function readLanguage(request) {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    return url.searchParams.get('lang') === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

function readDefaultProvider(ctx) {
  try {
    const service = ctx.get('agentDefaultModel');
    const selection = service && typeof service.currentSelection === 'function'
      ? service.currentSelection()
      : null;
    return selection && typeof selection.provider === 'string' ? selection.provider : null;
  } catch {
    return null;
  }
}

function readForce(request) {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    return url.searchParams.get('force') === '1' || url.searchParams.get('refresh') === '1';
  } catch {
    return false;
  }
}

async function handleSnapshot(ctx, reader, request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    writeJson(response, 405, { error: 'method-not-allowed' }, { allow: 'GET, HEAD' });
    return;
  }

  // The official Desktop window loads from the app protocol, and its fetch does
  // not necessarily carry the browser session that the HTTP connection fence
  // checks. Follow dsh-market's split: keep the fence on the Web host, skip it
  // on the Desktop host for this key-free, read-only snapshot. The route only
  // exposes quota numbers; keys stay in this process.
  const connection = ctx.get('connection');
  if (!isDesktopHost(ctx) && connection && typeof connection.requestRejection === 'function') {
    let rejection;
    try {
      rejection = connection.requestRejection(request);
    } catch {
      rejection = 403;
    }
    if (rejection !== undefined && rejection !== null) {
      writeJson(response, rejection, { error: 'unauthorized' });
      return;
    }
  }

  try {
    const snapshot = await reader.snapshot(readForce(request), readLanguage(request));
    if (request.method === 'HEAD') {
      response.writeHead(200, JSON_HEADERS);
      response.end();
      return;
    }
    writeJson(response, 200, snapshot);
  } catch {
    if (request.method === 'HEAD') {
      response.writeHead(500, JSON_HEADERS);
      response.end();
      return;
    }
    writeJson(response, 500, { error: 'snapshot-unavailable' });
  }
}

function writeJson(response, status, body, extraHeaders) {
  response.writeHead(status, { ...JSON_HEADERS, ...(extraHeaders || {}) });
  response.end(JSON.stringify(body));
}

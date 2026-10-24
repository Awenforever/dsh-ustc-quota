import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WINDOW_IDS,
  canonicalWindow,
  discoverProvidersFromRows,
  mapTokenworksSnapshot,
  mergeQuota,
  normalizeBaseURL,
  normalizeConfig,
  parseKeyInfo,
  parseUserInfo,
  siteBaseURL,
} from '../quota.js';

const NOW = Date.parse('2026-10-24T12:01:36+08:00');

function keyInfo(overrides = {}) {
  return {
    max_budget: 100,
    budget_duration: '24h',
    budget_reset_at: '2026-10-24T16:00:00+00:00',
    spend: 20.8,
    budget_limits: [
      { budget_duration: '3h', max_budget: 30, reset_at: '2026-10-24T15:00:00+08:00' },
      { budget_duration: '12h', max_budget: 70, reset_at: '2026-10-25T00:00:00+08:00' },
    ],
    budget_limits_usage: {
      '3h': { current_spend: 19.8933 },
      '12h': { current_spend: 20.8095 },
    },
    ...overrides,
  };
}

function userInfo(overrides = {}) {
  return {
    user_info: {
      max_budget: 100,
      spend: 2.31,
      budget_duration: '24h',
      budget_reset_at: '2026-10-24T16:00:00Z',
      ...overrides,
    },
  };
}

test('canonicalWindow maps the supported durations and rejects the rest', () => {
  assert.equal(canonicalWindow('3h'), '3h');
  assert.equal(canonicalWindow('12h'), '12h');
  assert.equal(canonicalWindow('24h'), '24h');
  assert.equal(canonicalWindow('1d'), '24h');
  assert.equal(canonicalWindow('180m'), '3h');
  assert.equal(canonicalWindow('6h'), null);
  assert.equal(canonicalWindow(undefined), null);
});

test('normalizeBaseURL removes a trailing slash and keeps the path', () => {
  assert.equal(normalizeBaseURL('https://api.llm.ustc.edu.cn/'), 'https://api.llm.ustc.edu.cn');
  assert.equal(normalizeBaseURL('https://API.LLM.USTC.EDU.CN/v1/'), 'https://api.llm.ustc.edu.cn/v1');
  assert.equal(normalizeBaseURL('not-a-url'), null);
});

test('siteBaseURL strips the OpenAI-compatible /v1 suffix', () => {
  assert.equal(siteBaseURL('https://api.llm.ustc.edu.cn/v1/'), 'https://api.llm.ustc.edu.cn');
  assert.equal(siteBaseURL('https://api.llm.ustc.edu.cn/'), 'https://api.llm.ustc.edu.cn');
  assert.equal(siteBaseURL('https://api.llm.ustc.edu.cn'), 'https://api.llm.ustc.edu.cn');
  assert.equal(siteBaseURL('not-a-url'), null);
});

test('normalizeConfig clamps a request-storm typo', () => {
  const config = normalizeConfig({
    baseURLs: ['https://api.llm.ustc.edu.cn/'],
    refreshIntervalMs: 1,
    resettingRefreshIntervalMs: 999999,
    requestTimeoutMs: 1,
    cacheTtlMs: 1,
    errorCacheTtlMs: 1,
    maxProviders: 999,
  });
  assert.deepEqual(config.baseURLs, ['https://api.llm.ustc.edu.cn']);
  assert.equal(config.refreshIntervalMs, 5000);
  assert.equal(config.resettingRefreshIntervalMs, 60000);
  assert.equal(config.requestTimeoutMs, 2000);
  assert.equal(config.cacheTtlMs, 1000);
  assert.equal(config.errorCacheTtlMs, 5000);
  assert.equal(config.maxProviders, 20);
});

test('alpha: key-level 3h, 12h, and 24h all become one active row', () => {
  const merged = mergeQuota({ keyInfo: keyInfo(), userInfo: null, now: NOW });
  assert.deepEqual(merged.windows.map((window) => window.id), WINDOW_IDS);
  assert.deepEqual(merged.windows.map((window) => window.state), ['active', 'active', 'active']);
  assert.equal(merged.windows[0].used, 19.8933);
  assert.equal(merged.windows[0].limit, 30);
  assert.equal(merged.windows[0].source, 'key');
  assert.equal(merged.windows[2].used, 20.8);
  assert.equal(merged.windows[2].limit, 100);
  assert.equal(merged.windows[2].source, 'key');
  assert.equal(merged.blocked, false);
  assert.equal(merged.stale, false);
  assert.equal(merged.liveWindows.length, 3);
});

test('gamma: key-level 3h/12h plus user-level 24h fills all three windows', () => {
  const gammaKey = keyInfo({
    max_budget: null,
    budget_duration: null,
    budget_reset_at: null,
    spend: 6.55,
    metadata: { platform_budget_scope: 'user' },
    budget_limits_usage: { '3h': { current_spend: 0.0 }, '12h': { current_spend: 0.0 } },
    budget_limits: [
      { budget_duration: '3h', max_budget: 30, reset_at: '2026-10-24T15:00:00+08:00' },
      { budget_duration: '12h', max_budget: 70, reset_at: '2026-10-25T00:00:00+08:00' },
    ],
  });
  const merged = mergeQuota({ keyInfo: gammaKey, userInfo: userInfo(), now: NOW });
  assert.deepEqual(merged.windows.map((window) => window.id), WINDOW_IDS);
  assert.equal(merged.windows[2].source, 'user');
  assert.equal(merged.windows[2].used, 2.31);
  assert.equal(merged.windows[2].limit, 100);
  assert.equal(merged.windows[2].state, 'active');
});

test('a reset transition resets 3h/12h and keeps the still-valid 24h as stale cache', () => {
  const previous = mergeQuota({ keyInfo: keyInfo(), userInfo: null, now: NOW - 60000 });
  const resettingKey = keyInfo({
    max_budget: null,
    budget_duration: null,
    budget_reset_at: null,
    budget_limits: [
      { budget_duration: '3h', max_budget: 30, reset_at: '2026-10-24T12:00:00+08:00' },
      { budget_duration: '12h', max_budget: 70, reset_at: '2026-10-24T12:00:00+08:00' },
    ],
    budget_limits_usage: {
      '3h': { current_spend: 19.8933 },
      '12h': { current_spend: 20.8095 },
    },
  });
  const merged = mergeQuota({
    keyInfo: resettingKey,
    userInfo: null,
    lastKnown: { windows: previous.liveWindows },
    now: NOW,
  });
  assert.equal(merged.windows[0].state, 'resetting');
  assert.equal(merged.windows[0].used, null);
  assert.equal(merged.windows[1].state, 'resetting');
  assert.equal(merged.windows[2].state, 'stale');
  assert.equal(merged.windows[2].source, 'cache');
  assert.equal(merged.windows[2].used, 20.8);
  assert.equal(merged.stale, true);
});

test('an over-limit window keeps its real ratio but marks the key blocked', () => {
  const over = keyInfo({
    budget_limits_usage: { '3h': { current_spend: 30.001 }, '12h': { current_spend: 20.8 } },
  });
  const merged = mergeQuota({ keyInfo: over, userInfo: null, now: NOW });
  assert.ok(merged.windows[0].ratio > 1);
  assert.equal(merged.blocked, true);
});

test('missing usage stays unknown instead of becoming zero', () => {
  const missing = keyInfo({
    budget_limits_usage: { '3h': {}, '12h': {} },
  });
  const merged = mergeQuota({ keyInfo: missing, userInfo: null, now: NOW });
  assert.equal(merged.windows[0].used, null);
  assert.equal(merged.windows[0].ratio, null);
  assert.equal(merged.windows[0].state, 'active');
});

test('a key with no 24h and no user 24h reports not-configured', () => {
  const onlyShort = keyInfo({
    max_budget: null,
    budget_duration: null,
    budget_reset_at: null,
    spend: null,
  });
  const merged = mergeQuota({ keyInfo: onlyShort, userInfo: null, now: NOW });
  assert.equal(merged.windows[2].state, 'not-configured');
  assert.equal(merged.windows[2].limit, null);
});

test('parseUserInfo ignores a non-24h user budget', () => {
  assert.equal(parseUserInfo(userInfo({ budget_duration: '3h' }), NOW), null);
});

test('parseKeyInfo prefers a top-level 24h over a duplicate budget-limit entry', () => {
  const parsed = parseKeyInfo(keyInfo({
    budget_limits: [
      { budget_duration: '3h', max_budget: 30, reset_at: '2026-10-24T15:00:00+08:00' },
      { budget_duration: '12h', max_budget: 70, reset_at: '2026-10-25T00:00:00+08:00' },
      { budget_duration: '24h', max_budget: 100, reset_at: '2026-10-25T00:00:00+08:00' },
    ],
  }), NOW);
  assert.equal(parsed.windows.get('24h').limit, 100);
});

test('discovery reads the three USTC providers and skips unrelated ones', () => {
  const rows = [{
    entry: { options: { name: '@deepseek-ai/dsh-llm-pi-ai' } },
    override: {
      providers: {
        'ustc-alpha': { displayName: 'alpha', baseURL: 'https://api.llm.ustc.edu.cn/', apiKeyEnv: 'ALPHA_KEY' },
        'ustc-beta': { displayName: 'beta', baseURL: 'https://api.llm.ustc.edu.cn', apiKeyEnv: 'ALPHA_BETA_KEY' },
        'ustc-gamma': { displayName: 'gamma', baseURL: 'https://api.llm.ustc.edu.cn', apiKeyEnv: 'GAMMA_KEY' },
        'not-ustc': { displayName: 'other', baseURL: 'https://api.openai.com', apiKeyEnv: 'OPENAI_API_KEY' },
        broken: { displayName: 'broken', baseURL: { __jsExpr: 'process.env.X' }, apiKeyEnv: 'X' },
      },
    },
  }];
  const result = discoverProvidersFromRows(rows, normalizeConfig({}));
  assert.equal(result.source, 'config');
  assert.deepEqual(result.providers.map((provider) => provider.provider), ['ustc-alpha', 'ustc-beta', 'ustc-gamma']);
  assert.deepEqual(result.providers.map((provider) => provider.label), ['alpha', 'beta', 'gamma']);
  assert.ok(result.warnings.some((warning) => warning.includes('broken')));
});

test('discovery keys on the USTC baseURL, not provider id or display name', () => {
  const rows = [{
    entry: { options: { name: '@deepseek-ai/dsh-llm-pi-ai' } },
    override: {
      providers: {
        'my-gateway': { displayName: 'My School', baseURL: 'https://api.llm.ustc.edu.cn/v1', apiKeyEnv: 'MY_KEY' },
        'another-model': { displayName: 'Whatever', baseURL: 'https://api.llm.ustc.edu.cn/', apiKeyEnv: 'ANOTHER_KEY' },
        'not-ustc': { displayName: 'Other', baseURL: 'https://api.openai.com/v1', apiKeyEnv: 'OPENAI_KEY' },
      },
    },
  }];
  const result = discoverProvidersFromRows(rows, normalizeConfig({}));
  assert.equal(result.source, 'config');
  assert.deepEqual(result.providers.map((provider) => provider.provider), ['my-gateway', 'another-model']);
  assert.deepEqual(result.providers.map((provider) => provider.label), ['My School', 'Whatever']);
  assert.deepEqual(result.providers.map((provider) => provider.baseURL), ['https://api.llm.ustc.edu.cn', 'https://api.llm.ustc.edu.cn']);
});

test('discovery falls back to explicit providers only when discovery is empty', () => {
  const config = normalizeConfig({
    providers: {
      'ustc-alpha': { apiKeyEnv: 'ALPHA_KEY', label: 'alpha' },
    },
  });
  const result = discoverProvidersFromRows([], config);
  assert.equal(result.source, 'fallback');
  assert.equal(result.providers.length, 1);
  assert.equal(result.providers[0].baseURL, 'https://api.llm.ustc.edu.cn');
});

test('discovery deduplicates providers sharing one key reference', () => {
  const rows = [{
    entry: { options: { name: '@deepseek-ai/dsh-llm-pi-ai' } },
    override: {
      providers: {
        a: { displayName: 'a', baseURL: 'https://api.llm.ustc.edu.cn', apiKeyEnv: 'SAME_KEY' },
        b: { displayName: 'b', baseURL: 'https://api.llm.ustc.edu.cn', apiKeyEnv: 'SAME_KEY' },
      },
    },
  }];
  const result = discoverProvidersFromRows(rows, normalizeConfig({}));
  assert.equal(result.providers.length, 1);
  assert.ok(result.warnings.some((warning) => warning.includes('same key')));
});

test('merged output contains no key material or personal identifiers', () => {
  const merged = mergeQuota({ keyInfo: keyInfo(), userInfo: userInfo(), now: NOW });
  const serialized = JSON.stringify(merged);
  assert.doesNotMatch(serialized, /sk-/);
  assert.doesNotMatch(serialized, /@/);
  assert.doesNotMatch(serialized, /email|alias|key_alias|user_email/i);
});

test('TokenWorks snapshot maps key and user windows into one compact row', () => {
  const snapshot = {
    ready: true,
    state: 'ok',
    fetchedAt: '2026-10-24T04:13:39.000Z',
    blocked: false,
    windows: [
      {
        duration: '3h',
        limit: 30,
        windowSpend: 18.09,
        usedKnown: true,
        remaining: 11.91,
        usedPercent: 60.3,
        resetAt: '2026-10-24T15:00:00.000Z',
        scope: 'key',
      },
      {
        duration: '12h',
        limit: 70,
        windowSpend: 19.5,
        usedKnown: true,
        remaining: 50.5,
        usedPercent: 27.86,
        resetAt: '2026-10-25T00:00:00.000Z',
        scope: 'key',
      },
      {
        duration: '1d',
        limit: 100,
        windowSpend: 20,
        usedKnown: true,
        remaining: 80,
        usedPercent: 20,
        resetAt: '2026-10-24T16:00:00.000Z',
        scope: 'user',
      },
    ],
  };
  const mapped = mapTokenworksSnapshot(snapshot, NOW);
  assert.equal(mapped.keys.length, 1);
  assert.equal(mapped.keys[0].provider, 'ustc-llm');
  assert.equal(mapped.keys[0].label, 'TokenWorks');
  assert.equal(mapped.keys[0].ok, true);
  assert.deepEqual(mapped.keys[0].windows.map((window) => window.id), WINDOW_IDS);
  assert.equal(mapped.keys[0].windows[0].used, 18.09);
  assert.equal(mapped.keys[0].windows[2].id, '24h');
  assert.equal(mapped.keys[0].windows[2].source, 'user');
  assert.equal(mapped.keys[0].windows[2].ratio, 0.2);
});

test('TokenWorks duplicate durations pick the binding window', () => {
  const snapshot = {
    ready: true,
    state: 'ok',
    blocked: false,
    windows: [
      { duration: '3h', limit: 30, windowSpend: 5, resetAt: '2026-10-24T15:00:00.000Z', scope: 'user' },
      { duration: '3h', limit: 30, windowSpend: 28, resetAt: '2026-10-24T15:00:00.000Z', scope: 'key' },
    ],
  };
  const mapped = mapTokenworksSnapshot(snapshot, NOW);
  assert.equal(mapped.keys[0].windows[0].used, 28);
  assert.equal(mapped.keys[0].windows[0].source, 'key');
  assert.equal(mapped.keys[0].blocked, false);
});

test('TokenWorks error keeps cached windows as stale with the official message', () => {
  const snapshot = {
    ready: true,
    state: 'error',
    error: 'platform rate limited (HTTP 429)',
    fetchedAt: '2026-10-24T04:13:39.000Z',
    blocked: false,
    windows: [
      { duration: '3h', limit: 30, windowSpend: 18, resetAt: '2026-10-24T15:00:00.000Z', scope: 'key' },
    ],
  };
  const mapped = mapTokenworksSnapshot(snapshot, NOW);
  assert.equal(mapped.keys[0].ok, false);
  assert.equal(mapped.keys[0].stale, true);
  assert.equal(mapped.keys[0].error, 'tokenworks-error');
  assert.equal(mapped.keys[0].errorDetail, 'platform rate limited (HTTP 429)');
  assert.equal(mapped.keys[0].windows[0].state, 'stale');
  assert.equal(mapped.keys[0].windows[1].state, 'not-configured');
});

test('TokenWorks not-ready snapshot yields no key row and a hint warning', () => {
  const mapped = mapTokenworksSnapshot({ ready: false, state: 'idle', windows: [] }, NOW);
  assert.equal(mapped.keys.length, 0);
  assert.deepEqual(mapped.warnings, ['tokenworks-not-ready']);
});

test('TokenWorks past reset becomes resetting instead of showing stale numbers', () => {
  const snapshot = {
    ready: true,
    state: 'ok',
    blocked: false,
    windows: [
      { duration: '3h', limit: 30, windowSpend: 18, resetAt: '2026-10-24T04:00:00.000Z', scope: 'key' },
    ],
  };
  const mapped = mapTokenworksSnapshot(snapshot, NOW);
  assert.equal(mapped.keys[0].windows[0].state, 'resetting');
  assert.equal(mapped.keys[0].windows[0].used, null);
  assert.equal(mapped.keys[0].windows[0].ratio, null);
});


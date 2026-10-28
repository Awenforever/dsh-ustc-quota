import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UpdateService,
  compareVersions,
  normalizeVersion,
  parseGitHubRelease,
  resolveUpdateProvider,
  specForVersion,
} from '../update.js';

function ctxWith(services = {}) {
  return {
    get(key) {
      return services[key];
    },
  };
}

function release(version = '1.1.1') {
  return {
    tag_name: `v${version}`,
    html_url: `https://github.com/Awenforever/dsh-ustc-quota/releases/tag/v${version}`,
    name: `dsh-ustc-quota ${version}`,
    body: `notes for ${version}`,
    published_at: '2026-10-28T10:00:00Z',
  };
}

function fetchWith(payload, calls = { count: 0 }) {
  const fn = async () => {
    calls.count += 1;
    return { ok: true, status: 200, json: async () => payload };
  };
  fn.calls = calls;
  return fn;
}

test('version normalization and comparison handle the release tags we use', () => {
  assert.equal(normalizeVersion('v1.1.1'), '1.1.1');
  assert.equal(compareVersions('1.1.1', '1.1.0'), 1);
  assert.equal(compareVersions('1.1.0', '1.1.0'), 0);
  assert.equal(compareVersions('1.0.9', '1.1.0'), -1);
  assert.equal(specForVersion('v1.1.1'), 'github:Awenforever/dsh-ustc-quota#v1.1.1');
});

test('parseGitHubRelease keeps stable release metadata and rejects malformed payloads', () => {
  const parsed = parseGitHubRelease(release());
  assert.equal(parsed.version, '1.1.1');
  assert.equal(parsed.tag, 'v1.1.1');
  assert.equal(parsed.notes, 'notes for 1.1.1');
  assert.throws(() => parseGitHubRelease({}), /invalid-release/);
});

test('resolveUpdateProvider prefers the reserved official service', async () => {
  const calls = [];
  const provider = resolveUpdateProvider(ctxWith({
    pluginUpdates: {
      async applyUpdate(request) {
        calls.push(request);
        return { changed: true, application: 'applied' };
      },
    },
  }));
  assert.equal(provider.id, 'official-plugin-updates');
  assert.equal(provider.canApply, true);
  await provider.apply('github:Awenforever/dsh-ustc-quota#v1.1.1', { version: '1.1.1' });
  assert.equal(calls[0].id, 'dsh-ustc-quota');
  assert.equal(calls[0].spec, 'github:Awenforever/dsh-ustc-quota#v1.1.1');
});

test('resolveUpdateProvider falls back to the DSH plugin manager and then manual', async () => {
  const calls = [];
  const manager = resolveUpdateProvider(ctxWith({
    pluginManager: {
      async installBundle(spec, options) {
        calls.push({ spec, options });
        return { changed: true, application: 'applied' };
      },
    },
  }));
  assert.equal(manager.id, 'dsh-plugin-manager');
  await manager.apply('github:Awenforever/dsh-ustc-quota#v1.1.1', { version: '1.1.1' });
  assert.deepEqual(calls[0], {
    spec: 'github:Awenforever/dsh-ustc-quota#v1.1.1',
    options: { saveExact: true },
  });

  const manual = resolveUpdateProvider(ctxWith());
  assert.equal(manual.id, 'manual');
  assert.equal(manual.canApply, false);
  assert.equal(manual.apply, null);
});

test('UpdateService reports a newer release and caches the check', async () => {
  const fetchImpl = fetchWith(release('1.1.1'));
  const service = new UpdateService(ctxWith({
    pluginManager: { installBundle: async () => ({ changed: true }) },
  }), {
    currentVersion: '1.1.0',
    fetchImpl,
    now: () => Date.parse('2026-10-28T12:00:00Z'),
  });

  const first = await service.check(false);
  const second = await service.check(false);
  assert.equal(first.updateAvailable, true);
  assert.equal(first.latestVersion, '1.1.1');
  assert.equal(first.spec, 'github:Awenforever/dsh-ustc-quota#v1.1.1');
  assert.equal(first.provider.id, 'dsh-plugin-manager');
  assert.equal(first.canApply, true);
  assert.equal(second.updateAvailable, true);
  assert.equal(fetchImpl.calls.count, 1);
});

test('UpdateService force bypasses the cache and handles an up-to-date release', async () => {
  const fetchImpl = fetchWith(release('1.1.0'));
  const service = new UpdateService(ctxWith(), {
    currentVersion: '1.1.0',
    fetchImpl,
    now: () => 1000,
  });
  const result = await service.check(true);
  assert.equal(result.updateAvailable, false);
  assert.equal(result.canApply, false);
  assert.equal(result.provider.id, 'manual');
  assert.equal(fetchImpl.calls.count, 1);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UpdateService,
  compareVersions,
  discoverRegistryUpdate,
  normalizeVersion,
  parseGitHubRelease,
  pickRegistryVersion,
  registrySpecForVersion,
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
  assert.equal(specForVersion('v1.1.1'), 'https://github.com/Awenforever/dsh-ustc-quota/archive/refs/tags/v1.1.1.tar.gz');
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
  assert.equal(first.spec, 'https://github.com/Awenforever/dsh-ustc-quota/archive/refs/tags/v1.1.1.tar.gz');
  assert.equal(first.provider.id, 'dsh-plugin-manager');
  assert.equal(first.canApply, true);
  assert.equal(second.updateAvailable, true);
  assert.equal(fetchImpl.calls.count, 1);
});

test('UpdateService applies the latest tarball through the plugin manager', async () => {
  const calls = [];
  const manager = {
    async installBundle(spec, options) {
      calls.push({ spec, options });
      return { changed: true, application: 'applied' };
    },
  };
  const fetchImpl = fetchWith(release('1.1.2'));
  const service = new UpdateService(ctxWith({ pluginManager: manager }), {
    currentVersion: '1.1.1',
    fetchImpl,
    now: () => 2000,
  });
  const result = await service.apply();
  assert.equal(result.ok, true);
  assert.equal(result.spec, 'https://github.com/Awenforever/dsh-ustc-quota/archive/refs/tags/v1.1.2.tar.gz');
  assert.equal(result.provider.id, 'dsh-plugin-manager');
  assert.deepEqual(calls[0], {
    spec: 'https://github.com/Awenforever/dsh-ustc-quota/archive/refs/tags/v1.1.2.tar.gz',
    options: { saveExact: true },
  });
});

test('UpdateService treats a no-op manager result as a successful no-op', async () => {
  const fetchImpl = fetchWith(release('1.1.2'));
  const service = new UpdateService(ctxWith({
    pluginManager: {
      installBundle: async () => ({ changed: false, application: 'noop' }),
    },
  }), {
    currentVersion: '1.1.1',
    fetchImpl,
    now: () => 2000,
  });
  const result = await service.apply();
  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
  assert.equal(result.error, undefined);
  assert.equal(result.provider.id, 'dsh-plugin-manager');
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

function versionList(versions, options = {}) {
  return {
    status: 'listed',
    installed: options.installed || '1.1.15',
    registry: options.registry || 'https://registry.npmjs.org/',
    attempts: [],
    omitted: 0,
    versions: versions.map((version) => ({
      version,
      tags: [],
      prerelease: String(version).includes('-'),
      bundle: true,
    })),
  };
}

test('pickRegistryVersion keeps the newest stable entry and ignores prereleases', () => {
  assert.equal(pickRegistryVersion(versionList(['1.1.16', '1.1.17', '1.2.0-rc.1'])), '1.1.17');
  assert.equal(pickRegistryVersion(versionList(['1.2.0-rc.1'])), '1.2.0-rc.1');
  assert.equal(pickRegistryVersion({ status: 'refused', problem: 'not-updatable' }), null);
  assert.equal(pickRegistryVersion(versionList([])), null);

  const blocked = versionList(['1.1.18']);
  blocked.versions[0].incompatible = { name: 'dsh-ustc-quota', version: '1.1.18', runtimeVersion: '0.1.0', requirements: {} };
  assert.equal(pickRegistryVersion(blocked), null);
});

test('discoverRegistryUpdate stays silent when the carrier cannot answer', async () => {
  assert.equal(await discoverRegistryUpdate(ctxWith(), '1.1.15'), null);

  const refusing = ctxWith({
    pluginManager: {
      async listVersions() {
        throw new Error('registry-offline');
      },
    },
  });
  assert.equal(await discoverRegistryUpdate(refusing, '1.1.15'), null);

  const upToDate = ctxWith({
    pluginManager: { listVersions: async () => versionList(['1.1.15']) },
  });
  assert.equal(await discoverRegistryUpdate(upToDate, '1.1.15'), null);

  const found = await discoverRegistryUpdate(ctxWith({
    pluginManager: { listVersions: async () => versionList(['1.1.16', '1.1.20']) },
  }), '1.1.15');
  assert.deepEqual(found, { version: '1.1.20', registry: 'https://registry.npmjs.org/' });
});

test('resolveUpdateProvider exposes the registry update alongside the tarball install', async () => {
  const calls = [];
  const provider = resolveUpdateProvider(ctxWith({
    pluginManager: {
      async updateBundle(name, version) {
        calls.push({ kind: 'update', name, version });
        return { from: '1.1.15', to: version, step: 'install', result: { changed: true, application: 'applied' } };
      },
      async installBundle(spec, options) {
        calls.push({ kind: 'install', spec, options });
        return { changed: true, application: 'applied' };
      },
    },
  }));
  assert.equal(provider.id, 'dsh-plugin-manager');
  assert.equal(provider.canRegistry, true);
  assert.equal(registrySpecForVersion('v1.1.16'), 'dsh-ustc-quota@1.1.16');

  await provider.applyRegistry('1.1.16');
  assert.deepEqual(calls[0], { kind: 'update', name: 'dsh-ustc-quota', version: '1.1.16' });
});

test('UpdateService prefers the official registry version when it is newest', async () => {
  const service = new UpdateService(ctxWith({
    pluginManager: {
      listVersions: async () => versionList(['1.1.16']),
      updateBundle: async (name, version) => ({
        from: '1.1.15',
        to: version,
        step: 'install',
        result: { changed: true, application: 'applied' },
      }),
      installBundle: async () => {
        throw new Error('install must not run when the registry path succeeds');
      },
    },
  }), {
    currentVersion: '1.1.15',
    fetchImpl: fetchWith(release('1.1.15')),
    now: () => 3000,
  });

  const info = await service.check(true);
  assert.equal(info.source, 'registry');
  assert.equal(info.latestVersion, '1.1.16');
  assert.equal(info.spec, 'dsh-ustc-quota@1.1.16');
  assert.equal(info.installSpec, 'https://github.com/Awenforever/dsh-ustc-quota/archive/refs/tags/v1.1.16.tar.gz');

  const applied = await service.apply({ spec: info.spec });
  assert.equal(applied.ok, true);
  assert.equal(applied.attempt, 'registry');
  assert.equal(applied.fallbackReason, null);
});

test('UpdateService falls back to the release tarball when the registry update is refused', async () => {
  const installs = [];
  const service = new UpdateService(ctxWith({
    pluginManager: {
      listVersions: async () => versionList(['1.1.16']),
      updateBundle: async () => ({
        from: '1.1.15',
        to: '1.1.16',
        step: 'check',
        result: { changed: false, application: 'failed', error: { code: 'not-updatable' } },
      }),
      async installBundle(spec, options) {
        installs.push({ spec, options });
        return { changed: true, application: 'applied' };
      },
    },
  }), {
    currentVersion: '1.1.15',
    fetchImpl: fetchWith(release('1.1.15')),
    now: () => 4000,
  });

  const applied = await service.apply();
  assert.equal(applied.ok, true);
  assert.equal(applied.attempt, 'install');
  assert.equal(applied.fallbackReason, 'registry-refused');
  assert.equal(installs[0].spec, 'https://github.com/Awenforever/dsh-ustc-quota/archive/refs/tags/v1.1.16.tar.gz');
});

test('UpdateService keeps the release feed when GitHub is ahead of the registry', async () => {
  const service = new UpdateService(ctxWith({
    pluginManager: {
      listVersions: async () => versionList(['1.1.16']),
      updateBundle: async () => ({ from: '1.1.15', to: '1.1.16', step: 'install', result: { changed: true } }),
      installBundle: async () => ({ changed: true, application: 'applied' }),
    },
  }), {
    currentVersion: '1.1.15',
    fetchImpl: fetchWith(release('1.1.17')),
    now: () => 5000,
  });

  const info = await service.check(true);
  assert.equal(info.source, 'github');
  assert.equal(info.latestVersion, '1.1.17');
  assert.equal(info.spec, 'https://github.com/Awenforever/dsh-ustc-quota/archive/refs/tags/v1.1.17.tar.gz');
});


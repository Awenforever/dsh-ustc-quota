# 上游插件更新接口观察（内部记录）

本文件是维护者观察记录，不是用户文档，不进入 README 的安装/使用说明，也不作为发布说明。

## 2026-11-09 · DSH 0.2.2-rc.1

### 桌面端版本

- 已安装：`0.2.2-rc.1`
- nightly feed：`0.2.2-rc.1`（`releaseDate: 2026-11-04T09:31:49.677Z`，未变）
- `rc.yml` / `beta.yml` / `latest.yml`：均 404
- 结论：无新桌面版本。

### 官方插件更新接口：已出现

此前预留的 `pluginUpdates` / `pluginUpdater` 服务仍未出现，但官方能力落在了 `pluginManager` 上。通过 Host Inspect 读到的契约：

| 方法 | 签名要点 |
|---|---|
| `listVersions` | `listVersions(name, { registry? }, signal?) → PluginVersionList` |
| `updateBundle` | `updateBundle(name, version, { registry?, requestId? }) → PluginUpdateResult` |
| `readBundleDetail` | `readBundleDetail(name, language, { npmFileSources? }) → BundleDetail` |
| `registries` | `registries() → PluginRegistries`（配置的首选 registry、回退顺序、pnpm 解析值） |
| `listVersionExemptions` / `setVersionExemption` | 精确 `name@version` + runtime 版本的豁免 |

`PluginVersionList`：

- 命中：`{ status: 'listed', installed, registry, attempts, versions, omitted }`
- 版本项：`{ version, publishedAt?, tags, prerelease, deprecated?, bundle, incompatible? }`
- 拒绝：`{ status: 'refused', problem: 'not-updatable' | 'not-found' | 'network' | 'unknown', reason, attempts }`

`updateBundle` 语义：先把目标版本在 registry 上校验（必须存在、必须声明 bundle、必须接受当前 DSH 版本），任一不满足则不改变任何东西；有 HMR 时先卸载旧版本再装新版本，失败会回滚重装原版本。

### 与本插件的冲突点

`listVersions` 的契约写明：读取的是 **已安装 registry 包** 的更新版本。本插件当前安装源是 GitHub tarball：

```text
https://github.com/Awenforever/dsh-ustc-quota/archive/refs/tags/v1.1.15.tar.gz
```

因此：

1. 官方版本发现路径对本插件**当前安装形态**不适用，预期返回 `not-updatable`；
2. 官方 apply（`updateBundle`）同样要求 registry 包名 + 已发布版本；
3. 现状仍是“自托管 GitHub Release 发现 + `pluginManager.installBundle(spec)` 应用”。

### 待决策

要真正吃到官方更新路径，需要先把 `dsh-ustc-quota` 发布到 npm registry（或官方目录），再让 Host 端按以下顺序适配：

1. 版本发现：`pluginManager.listVersions(name)` → 回退 GitHub Releases；
2. 应用更新：`pluginManager.updateBundle(name, version)` → 回退 `installBundle(spec)` → 回退手动 spec。

这是产品/发布决策（涉及 npm 账号与包名），不是纯代码改动，需维护者确认后再做。

### 本次未做

- 未改代码；
- 未发版；
- 未安装或重启任何应用；
- 未调用 `updateBundle` / `listVersions` 做真实更新（本机为运行中的生产 profile）。

## 2026-11-09 · 决策与落地

维护者同意发布到 npm。执行记录：

1. `package.json` 去掉 `private`，加 `publishConfig`（public，registry.npmjs.org）和 `engines.dsh`（`>=0.2.1-rc.3 <0.2.2-0 || >=0.2.2-rc.1 <0.3.0`，用 semver 实测覆盖 0.2.1-rc.3…0.2.2、排除 0.3.0）。
2. `npm publish` 使用一次性 granular token 完成首版 `dsh-ustc-quota@1.1.15`（registry 侧同时生成一个 `0.0.0-stage` 占位版本，`latest` 指向 1.1.15）；tarball 与 integrity 已回读校验。
3. 新增 `.github/workflows/publish.yml`：打 `v*` tag → 校验 tag 与 manifest 一致 → 语法检查 + 单元测试 → `npm publish --access public --provenance`；认证走 npm Trusted Publishing（OIDC），仓库不保存任何 token。`setup-node` 不带 `registry-url`（否则会写入空 `_authToken` 并退回 token 认证）。
4. 新增 `.github/workflows/verify.yml`：push/PR 跑语法检查、单元测试和 `npm pack --dry-run`。
5. `update.js` 适配官方通道（v1.1.16）：
   - 发现：`pluginManager.listVersions(PLUGIN_ID)` 取最新稳定版（跳过 prerelease 与 `incompatible`），若其版本 ≥ GitHub release 则用 registry 版本，否则保持 GitHub；
   - 应用：registry 来源先走 `pluginManager.updateBundle`，宿主返回 `check`/`remove` 阶段失败（例如当前是从 tarball 安装的副本）时回退 `installBundle(tarball spec)`；
   - 任何发现失败都静默回退，不影响卡片。
6. 测试从 31 增至 37：新增 registry 版本挑选、静默降级、provider 双通道、registry 优先、回退 tarball、GitHub 领先六种场景。

### 已知限制

- `listVersions` 只对 registry 安装的副本生效。当前生产 profile 仍从 GitHub tarball 安装，因此卡片仍走 GitHub 发现；要启用官方发现，需要在插件页改用 `dsh-ustc-quota@<version>` 安装一次。
- 首次发布（first publish）无法走 OIDC，已用一次性 token 完成；之后的版本全部由 tag 触发的 CI 发布。
- 那次 token 在使用后应撤销。


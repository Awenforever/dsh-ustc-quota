# dsh-ustc-quota

[GitHub](https://github.com/Awenforever/dsh-ustc-quota) · MIT

在 **DeepSeek Harness（DSH）** 和 **中国科大「词元工坊」TokenWorks** 的左侧栏里，显示 USTC 模型额度的 **3h / 12h / 24h** 进度、已用额度、上限、百分比和重置时间。

卡片位于会话列表与账户/设置行之间；侧边栏收起时自动隐藏。

- DSH：按 `baseURL` 自动发现所有指向 USTC 网关的 `@deepseek-ai/dsh-llm-pi-ai` provider（provider id/显示名随便取，不需要以 `ustc-` 开头；`/v1` 会自动归一到站点根），每把 key 一行。
- TokenWorks：直接使用词元工坊内置的 `tokenworksUsage` Host 服务，不读取 Key，不额外请求学校网关；未登录时提示先登录。
- 只读展示：不拦截模型请求、不换 Key、不改 provider。

## 支持的环境

| 环境 | 版本 | 数据来源 |
| --- | --- | --- |
| DeepSeek Harness Web / Desktop | `0.2.0-rc.2` 及以上 | `llm-pi-ai` provider 配置 + `credentials` + `/key/info`、`/user/info` |
| 中国科大词元工坊 TokenWorks | `0.2.x` | 内置 `tokenworksUsage` 服务（`@ustc/tokenworks-usage`） |

插件没有运行时依赖，Host 使用 Node 24 自带的 `fetch`，Client 只用 React 和主题 token。

## 安装

### DSH（Web / Desktop）

在左侧栏打开 **插件（Plugins）** → **安装插件**，填入：

```text
github:Awenforever/dsh-ustc-quota
```

固定版本（推荐，避免默认分支后续变动）：

```text
github:Awenforever/dsh-ustc-quota#v1.1.0
```

或者用你已有的安装方式指定同一目录/仓库：

```text
plugin_manager install_bundle
target = github:Awenforever/dsh-ustc-quota
```

安装完成后 Host、插件清单和 Client slot 会即时生效。DSH 的 client-hmr 会把新 client 加载进旧页面，插件会**自行刷新一次页面**（每个版本一次）。TokenWorks 的插件页「更新」只应用 Host bundle，已打开的页面不一定会换 client；v1.1.0 起 Host snapshot 带 `pluginVersion`，旧 client 检测到新 Host 版本会自行 `location.reload()` 一次。首次装 v1.1.0 仍需一次页面重载或应用重启来装入这个 watchdog；之后更新不再需要重启。如果载体的页面重载仍然缓存 client module，就只能重启，这是载体限制，不是 quota 数据的问题。

### TokenWorks（词元工坊）

TokenWorks 是 USTC 基于 DSH 的发行版，自带 **插件** 页面和 `@deepseek-ai/dsh-plugin-manager`：

1. 在左侧栏打开 **插件** → 点右上角 **+ 添加插件**；
2. 填入 `github:Awenforever/dsh-ustc-quota#v1.1.0`；
3. 安装/更新后插件会在旧页面**自行刷新一次**（每个版本一次）；v1.1.0 首次安装可能需要一次页面重载或应用重启来装入 watchdog，之后 Host 版本变化会自动 reload；若插件页提示刷新，也可以直接刷新；
4. 用学校统一身份登录后，卡片会自动出现。

> 词元工坊插件页的「官方」只列出发行版自带的插件；第三方插件（包括本插件）不会出现在「官方」里，安装后会出现在「已安装」区域。这是正常的，不是没有装上。

> 如果之前装过旧版本并看到「插件异常」，先在插件页移除旧条目，再安装上面的 v1.1.0；v1.1.0 已修复旧包 `package.json` 的 BOM 问题。不需要重启词元工坊。

TokenWorks 的额度来自它内置的 `tokenworksUsage` 服务，因此：

- 不需要在插件里配置 Key；
- 不会重复请求 `/key/info`、`/user/info`（官方服务已有 30 秒缓存和退避）；
- 未登录或模型服务被撤下时显示“词元工坊未登录/不可用”，不会误报 0。

> 官方自带的「剩余用量」入口仍在账户弹窗里；本插件只是把同一份额度以常驻卡片的形式放到侧边栏。

> 词元工坊 0.2.x 的产品组合包含 `@deepseek-ai/dsh-plugin-manager` 与 `@deepseek-ai/dsh-client-ui-plugin-manager`（即「插件」页）。如果你的版本没有这个入口，请先升级词元工坊；不要手工修改 publisher 管理的 profile。

## 显示效果

卡片独占侧边栏底部的一整行：TokenWorks 的「更新」按钮或 DSH 的 Cordis 按钮留在上一行，不会被并排挤压；卡片内部的三列也不会被截断。

> v1.1.0 起不再依赖 `<style>`/`:has`：客户端挂载后直接找到 `footerActions`，折叠只包含本卡片的 slot cell，并让 footer 换行。若仍看到并排，确认装的是 v1.1.0，并刷新一次页面让新的 client bundle 生效。

每把 Key（TokenWorks 下是当前账户）一行，三列：

```text
USTC 词元额度                    更新于 13:20:05  ↻
        3h                  12h                 24h
       15:00 · 2h 40m      00:00 · 11h 40m     00:00 · 11h 40m
key-a  14.8/30   49%      14.8/70   21%       36.4/100  36%
key-b   0.3/30    1%       0.3/70    0%        63.8/100  64%
key-c   8.7/30   29%       8.7/70   12%        11.1/100  11%
```

- 外观按参考图的白色卡片、更大字号、行分隔和圆角进度条：**绿色 = 已用，浅灰槽 = 剩余**；已用 ≥70% 变黄、≥90% 变红；条高 6px、两端圆角，0% 只留浅灰槽，极小用量至少留一个圆点；未知用量中性灰槽；单元格悬停显示精确剩余值；
- 星号表示**当前打开的对话实际使用的 Key**，不是全局默认 Key：插件在对话 composer dock 放一个不可见的 session probe，读取该 session 的 `modelSelection` 投影；切换对话或改模型时星号立即移动，不需要等 15 秒轮询。同一 provider 内只换模型时星号不会移动（还是同一把 Key），换成另一个 provider 的模型才移动；星号悬停会显示它认定的 provider。
- 列头副行是**每个窗口的下一次重置时刻 + 倒计时**，取该窗口第一个活跃 Key 的 `reset_at`；3h 每 3 小时一个边界，所以 21:00 之后、午夜之前，3h/12h/24h 都可能同时显示 00:00，这是正常的，不是三列重复取了同一个值；悬停列头可看到每把 Key 的完整重置时间。
- 列头显示重置时刻和倒计时；单元格悬停显示精确时间、数据源和完整数值；
- 额度窗口刚好重置时显示“重置中…”，不会把旧用量当成当前用量；
- 单把 Key 失败只影响该行；有 5 分钟内旧数据时保留 dimmed 数据并标记错误；
- TokenWorks 的官方服务返回错误时，保留上一次有效窗口并显示官方错误文案。

## 更新

- 标题「USTC 词元额度」右侧显示灰色小字版本号；点击版本号可手动检查更新；
- 启动时检查一次，之后每 24 小时自动检查一次 GitHub 最新 release；
- 有新版本时版本号旁出现小红点，点击弹出更新确认弹窗；
- 当前 DSH 使用官方 `pluginManager` Remote 直接安装最新 release；更新完成后自动重载页面；
- 已预留 `pluginUpdates.applyUpdate({ id, spec, version })` 适配接口，供后续 DSH 官方插件更新预览版接入；接口不可用时回退到 `pluginManager`，再不可用则弹窗显示安装 spec；
- TokenWorks / 旧 Host 如果暂时没有可用更新接口，弹窗会显示可复制的 spec，仍可走插件页手动安装。

## 工作方式

### DSH 路径

1. 用 `ctx.configEditor.configuration()` 读取 `@deepseek-ai/dsh-llm-pi-ai` 的有效配置；
2. 筛出 `baseURL` 属于 `baseURLs` 的 provider（`https://api.llm.ustc.edu.cn` 与 `.../v1` 视为同一个站点），取 `apiKeyEnv`；provider id/显示名不参与匹配；
3. 用 `ctx.credentials.resolve(apiKeyEnv)` 解析 Key（Key 不离开 Host）；
4. 并行查询 `GET /key/info` 与 `GET /user/info`；
5. 合并成固定的 3h/12h/24h 三窗口；Host 缓存 8 秒；
6. 通过 `GET /plugins/dsh-ustc-quota/snapshot` 返回脱敏 JSON。

3h/12h 来自 Key 级 `budget_limits` / `budget_limits_usage`；24h 可能来自 Key 级，也可能来自 `/user/info` 的用户级预算。合并规则和官方 `@ustc/tokenworks-usage` 一致：先看 `metadata.platform_budget_scope`，再看 Key 级、用户级和上次成功值。

请求频率：正常 10 秒、重置过渡 8 秒；2 个端点 × 每把 Key，约 12–15 次/分钟/Key，低于平台的 `rpm_limit: 20`。Host 缓存会对多标签页去重。

### 运行中新增 Key / Provider

不需要重启，也不需要在插件里重新配置：

- **DSH**：每次 Host 缓存过期（8 秒）都会重新读取 `llm-pi-ai` 的有效配置；Client 每 15 秒轮询一次。新加一个 provider + 新凭据引用后，最多约 15 秒出现新行；点卡片右上角的刷新按钮会立即绕过缓存重新发现。
- **TokenWorks**：插件消费官方 `tokenworksUsage` 快照，官方服务自己处理登录/换 Key/账号切换，官方缓存约 30 秒；卡片会随快照更新，同样不需要重启。
- 同一个凭据引用仍按一把 Key 处理；要显示成独立一行，请给新 Key 一个不同的 `apiKeyEnv`（DSH）或让 TokenWorks 切换到新账号。

### TokenWorks 路径

Host 检测到 `tokenworksUsage` 服务后：

```text
tokenworksUsage.snapshot({language})
  → 官方服务从 tokenworksBootstrap 取网关与内存 Key
  → 官方服务查询 /key/info、/user/info 并合并
  → 本插件把快照映射成 3h/12h/24h 卡片
```

这样 Key 始终只在 TokenWorks Host 内存中，本插件也无需重复实现登录/刷新/退避。

## 配置

一般情况下不需要配置。自动发现失败，或使用的适配器不是 `@deepseek-ai/dsh-llm-pi-ai` 时，可以在 profile 的 `cordis.patch.yml` 里覆盖本插件的 config：

```yaml
- id: dsh-ustc-quota
  name: dsh-ustc-quota
  config:
    baseURLs:
      - https://api.llm.ustc.edu.cn
    refreshIntervalMs: 10000
    resettingRefreshIntervalMs: 8000
    requestTimeoutMs: 8000
    cacheTtlMs: 8000
    errorCacheTtlMs: 20000
    # 可选兜底：自动发现完全没有结果时才会使用
    providers:
      my-ustc-key:
        apiKeyEnv: MY_USTC_API_KEY
        label: my-key
```

`providers` 里的 `apiKeyEnv` 是凭据引用名（环境变量或 DSH credentials 里的名字），不是 Key 本身。`baseURLs` 写成 `https://api.llm.ustc.edu.cn` 或 `https://api.llm.ustc.edu.cn/v1` 都可以，插件会归一到站点根后再查 `/key/info`、`/user/info`。

## 安全

- Key 只在 Host 内使用：DSH 通过 `credentials` 解析，TokenWorks 通过官方 `tokenworksUsage` 读取，二者都不会把 Key 发到浏览器；
- 快照只包含 provider id、显示名、额度数值、重置时间、安全错误码；
- 不转发 `key`、`key_alias`、`user_email`、`user_alias`、`platform_user_id`、`keys`、`teams`；
- Web host 上路由先过 `ctx.connection.requestRejection`；官方 Desktop / TokenWorks 窗口从 `dsh-app://` 加载，fetch 不一定携带浏览器 session，因此和 dsh-market 一样在 Desktop host 上跳过这道 fence（只读、无 Key 数据，路由仍只绑定本机 Web server）。

## 已知边界

- `/key/info`、`/user/info` 是 USTC LiteLLM 的内部接口，不是公开稳定 API；字段变化时插件显示安全错误，不会崩溃。
- 24h 可能是用户级预算，同一用户多把 Key 会共享；24h 单元格会标注“密钥级 / 用户级 / 上次查询”。
- 12:00 / 00:00 边界上平台可能短暂返回旧用量；插件把过期窗口标成“重置中”，8 秒后重查。
- 额度数值是平台额度单位（当前 3h/12h/24h 为 30/70/100），不是 DSH token 数；插件不擅自换算。
- 侧边栏收起（rail）时卡片隐藏；展开后恢复。
- 底部操作行会换行：TokenWorks 的「更新」、DSH 的 Cordis 按钮保留在上一行，卡片拿下一整行；这是通过折叠只包含本卡片的 slot cell 实现的，不依赖按钮的 id 或顺序。
- 发现只看 `baseURL`：其他用户即使把 provider id 取成 `my-gateway`、显示名取成任意文字，只要 `baseURL` 指向 USTC 网关（带不带 `/v1` 都行）就会被识别；反过来说，如果用了自定义反代路径，请在 `baseURLs` 里显式加上。

## 开发

```powershell
node --check index.js
node --check quota.js
node --check update.js
node --check client.js
node --test test/quota.test.js test/update.test.js
```

测试覆盖（29 个 Node 测试）：

- DSH 的 Key 级/用户级窗口合并、重置过渡、超限、缺用量；
- `llm-pi-ai` 配置发现、兜底、去重；
- TokenWorks 官方快照的窗口映射、同名 Key/账户窗口取约束档、错误缓存和未登录状态；
- 快照不包含 Key、邮箱、alias；
- 版本比较、GitHub release 解析、更新 provider 选择、更新缓存与降级。

## 许可

MIT，见 [LICENSE](LICENSE)。

window.__ModuleLoader__.load({
  id: 'dsh-ustc-quota',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'dsh-ustc-quota';
    const SLOT = 'sidebar.footer.action';
    const SESSION_SLOT = 'conversation.composer.dock';
    const SESSION_PROBE_ID = 'ustc-quota-session-probe';
    const ENDPOINT = 'plugins/dsh-ustc-quota/snapshot';
    const UPDATE_ENDPOINT = 'plugins/dsh-ustc-quota/update';
    const UPDATE_APPLY_ENDPOINT = 'plugins/dsh-ustc-quota/update/apply';
    const WINDOW_IDS = ['3h', '12h', '24h'];
    const CLIENT_VERSION = '1.1.6';
    const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
    const CLIENT_VERSION_KEY = `${NS}:client-version`;
    const CLIENT_RELOAD_KEY = `${NS}:client-reload`;
    const HOST_VERSION_KEY = `${NS}:host-version-reload`;

    let clientCtx = null;
    let activeSessionId = null;
    let holdHostReload = false;
    let previousClientVersion = null;
    const activeSessionListeners = new Set();

    function setActiveSession(id) {
      if (activeSessionId === id) return;
      activeSessionId = id;
      for (const listener of activeSessionListeners) listener();
    }

    function clearActiveSession(id) {
      if (activeSessionId !== id) return;
      activeSessionId = null;
      for (const listener of activeSessionListeners) listener();
    }

    function subscribeActiveSession(listener) {
      activeSessionListeners.add(listener);
      return () => activeSessionListeners.delete(listener);
    }

    function getActiveSession() {
      return activeSessionId;
    }

    const zh = {
      title: 'USTC 词元额度',
      updatedLabel: '更新于',
      refresh: '刷新',
      loading: '加载中…',
      noProviders: '未发现 USTC 模型厂商',
      noProvidersHint: '请检查模型设置中 baseURL 为 api.llm.ustc.edu.cn',
      tokenworksNotReady: '词元工坊未登录',
      tokenworksNotReadyHint: '登录词元工坊后会自动读取学校模型额度',
      tokenworksRow: '词元',
      default: '默认',
      currentKey: '当前对话使用',
      nextReset: '下一次重置',
      versionCheck: '点击检查更新',
      updateChecking: '检查中…',
      updateUpToDate: '已是最新',
      updateFailed: '检查失败',
      updateAvailable: '发现新版本',
      updateTitle: '更新 USTC 词元额度',
      updateCurrent: '当前版本',
      updateLatest: '最新版本',
      updateNotes: '更新说明',
      updateReleaseLink: '查看发布说明',
      updateNow: '安装更新',
      updateCancel: '取消',
      updateApplying: '正在更新…',
      updateApplied: '更新已安装。',
      updateRestart: '已安装，需要完全退出并重新打开 DSH 才能生效',
      updateRestartPrompt: '更新已安装。请完全退出 DSH 并重新打开；仅刷新页面或等待自动刷新不会清空 DSH 的 client-module 启动缓存。',
      updateClose: '关闭',
      restartAfterUpdate: '插件已更新，请完全退出并重开 DSH',
      restartAfterUpdateHint: '更新已安装。仅刷新页面不会清空 DSH 的 client-module 启动缓存；请完全退出 DSH 后重新打开。',
      updateProviderOfficial: '通过 DSH 官方插件更新接口（预览）',
      updateProviderManager: '通过 DSH 插件管理器（预览接口）',
      updateProviderManual: '当前载体没有可用的直接更新接口，请在插件页填入下面的 spec',
      updateNoProvider: '当前载体不支持直接更新，请手动安装',
      updateCopy: '复制 spec',
      updateCopied: '已复制',
      resetting: '重置中…',
      notConfigured: '未配置',
      unknownUsage: '用量未知',
      stale: '上次查询',
      limited: '已达限额',
      retry: '重试',
      unavailable: '额度服务不可用',
      invalidResponse: '响应格式错误',
      warnings: '配置提示',
      window3h: '3h',
      window12h: '12h',
      window24h: '24h',
      resetAt: '重置',
      remaining: '剩余',
      sourceKey: '密钥级',
      sourceUser: '用户级',
      sourceCache: '上次查询',
      'error.no-key': '未配置密钥',
      'error.unauthorized': '密钥无效或已禁用',
      'error.rate-limited': '请求过于频繁',
      'error.timeout': '查询超时',
      'error.network': '网络错误',
      'error.invalid-response': '响应格式错误',
      'error.server-error': '服务端错误',
      'error.http-error': '查询失败',
      'error.tokenworks-error': '词元工坊额度查询失败',
      'error.tokenworks-not-ready': '请先登录词元工坊',
      'error.unknown': '查询失败',
    };

    const en = {
      title: 'USTC token quota',
      updatedLabel: 'Updated',
      refresh: 'Refresh',
      loading: 'Loading…',
      noProviders: 'No USTC providers found',
      noProvidersHint: 'Check that a model provider uses baseURL api.llm.ustc.edu.cn',
      tokenworksNotReady: 'TokenWorks is not signed in',
      tokenworksNotReadyHint: 'Sign in to TokenWorks to load school model quota',
      tokenworksRow: 'Tokens',
      default: 'default',
      currentKey: 'used by this conversation',
      nextReset: 'next reset',
      versionCheck: 'check for updates',
      updateChecking: 'Checking…',
      updateUpToDate: 'Up to date',
      updateFailed: 'Update check failed',
      updateAvailable: 'Update available',
      updateTitle: 'Update USTC token quota',
      updateCurrent: 'Current',
      updateLatest: 'Latest',
      updateNotes: 'Release notes',
      updateReleaseLink: 'View release notes',
      updateNow: 'Install update',
      updateCancel: 'Cancel',
      updateApplying: 'Updating…',
      updateApplied: 'Update installed.',
      updateRestart: 'Installed; fully quit and reopen DSH to apply it',
      updateRestartPrompt: "Update installed. Fully quit and reopen DSH; a page refresh or automatic reload will not clear DSH's client-module boot cache.",
      updateClose: 'Close',
      restartAfterUpdate: 'Plugin updated — fully quit and reopen DSH',
      restartAfterUpdateHint: 'The update is installed. A page refresh will not clear DSH client-module boot cache; fully quit and reopen DSH.',
      updateProviderOfficial: 'Via the DSH official plugin update API (preview)',
      updateProviderManager: 'Via the DSH plugin manager (preview API)',
      updateProviderManual: 'This carrier has no direct update API; paste the spec below into the plugin page',
      updateNoProvider: 'Direct update is unavailable; install manually',
      updateCopy: 'Copy spec',
      updateCopied: 'Copied',
      resetting: 'Resetting…',
      notConfigured: 'not set',
      unknownUsage: 'usage unknown',
      stale: 'last check',
      limited: 'limit reached',
      retry: 'Retry',
      unavailable: 'Quota service unavailable',
      invalidResponse: 'Invalid response',
      warnings: 'Configuration notice',
      window3h: '3h',
      window12h: '12h',
      window24h: '24h',
      resetAt: 'resets',
      remaining: 'remaining',
      sourceKey: 'key-level',
      sourceUser: 'user-level',
      sourceCache: 'cached',
      'error.no-key': 'No API key configured',
      'error.unauthorized': 'Key invalid or disabled',
      'error.rate-limited': 'Rate limited',
      'error.timeout': 'Query timed out',
      'error.network': 'Network error',
      'error.invalid-response': 'Invalid response',
      'error.server-error': 'Server error',
      'error.http-error': 'Query failed',
      'error.tokenworks-error': 'TokenWorks quota query failed',
      'error.tokenworks-not-ready': 'Sign in to TokenWorks first',
      'error.unknown': 'Query failed',
    };

    const STYLE = {
      root: {
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        flex: '0 0 100%',
        order: 1,
        gridColumn: '1 / -1',
        margin: '0 0 6px',
        padding: '10px 9px 8px',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 12,
        background: 'var(--dsw-alias-bg-layer-1)',
        boxShadow: '0 3px 12px rgba(15, 23, 42, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        fontSize: 11,
        lineHeight: 1.3,
        color: 'var(--dsw-alias-label-secondary)',
        fontVariantNumeric: 'tabular-nums',
      },
      header: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minWidth: 0,
      },
      title: {
        fontWeight: 700,
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 13,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      },
      versionButton: {
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        margin: 0,
        padding: 0,
        border: 'none',
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: 8.5,
        lineHeight: 1.2,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      },
      versionDot: {
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: 'var(--dsw-alias-state-error-primary)',
        display: 'inline-block',
        flex: '0 0 auto',
      },
      versionNote: {
        fontSize: 7.5,
        color: 'var(--dsw-alias-label-secondary)',
        whiteSpace: 'nowrap',
      },
      meta: {
        flex: 1,
        minWidth: 0,
        fontSize: 8.5,
        color: 'var(--dsw-alias-label-secondary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'right',
      },
      warn: {
        fontSize: 9,
        color: 'var(--dsw-alias-state-warn-primary)',
        cursor: 'help',
        flex: '0 0 auto',
      },
      error: {
        fontSize: 9,
        color: 'var(--dsw-alias-state-error-primary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
      },
      refresh: {
        flex: '0 0 auto',
        border: 'none',
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        cursor: 'pointer',
        fontSize: 13,
        lineHeight: 1,
        padding: '1px 2px',
        borderRadius: 6,
      },
      table: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      },
      legendRow: {
        display: 'grid',
        gridTemplateColumns: '36px repeat(3, minmax(0, 1fr))',
        columnGap: 4,
        alignItems: 'center',
        minWidth: 0,
        paddingBottom: 4,
        borderBottom: '1px solid var(--dsw-alias-border-l1)',
      },
      keyRow: {
        display: 'grid',
        gridTemplateColumns: '36px repeat(3, minmax(0, 1fr))',
        columnGap: 4,
        alignItems: 'center',
        minWidth: 0,
        paddingTop: 6,
        paddingBottom: 2,
      },
      legendCell: {
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      },
      legendName: {
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--dsw-alias-label-primary)',
        whiteSpace: 'nowrap',
      },
      legendReset: {
        width: '100%',
        fontSize: 8,
        color: 'var(--dsw-alias-label-secondary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'center',
      },
      key: {
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        minWidth: 0,
        color: 'var(--dsw-alias-label-primary)',
        fontWeight: 650,
        fontSize: 10.5,
      },
      keyLabel: {
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 30,
      },
      star: {
        flex: '0 0 auto',
        fontSize: 9,
        lineHeight: 1,
        color: 'var(--dsw-alias-brand-primary)',
        cursor: 'help',
      },
      issueDot: {
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: 'var(--dsw-alias-state-error-primary)',
        color: 'var(--dsw-alias-bg-base)',
        fontSize: 8,
        fontWeight: 700,
        cursor: 'help',
      },
      cell: {
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      },
      valueLine: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 3,
        minWidth: 0,
      },
      value: {
        minWidth: 0,
        fontSize: 10.5,
        fontWeight: 650,
        color: 'var(--dsw-alias-label-primary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
      percent: {
        flex: '0 0 auto',
        fontSize: 8.5,
        color: 'var(--dsw-alias-label-secondary)',
        whiteSpace: 'nowrap',
      },
      bar: {
        position: 'relative',
        height: 6,
        borderRadius: 999,
        background: 'transparent',
        overflow: 'hidden',
      },
      track: {
        position: 'absolute',
        inset: 0,
        background: 'var(--dsw-alias-state-idle-primary)',
        opacity: 0.24,
        borderRadius: 999,
      },
      modalOverlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.38)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
      },
      modal: {
        width: 'min(360px, 100%)',
        maxHeight: '80vh',
        overflow: 'auto',
        boxSizing: 'border-box',
        padding: 14,
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 12,
        background: 'var(--dsw-alias-bg-layer-1)',
        boxShadow: '0 18px 48px rgba(15, 23, 42, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        color: 'var(--dsw-alias-label-primary)',
      },
      modalTitle: {
        fontSize: 13,
        fontWeight: 700,
      },
      modalVersion: {
        fontSize: 10,
        color: 'var(--dsw-alias-label-secondary)',
      },
      modalNotes: {
        maxHeight: 120,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        fontSize: 9,
        lineHeight: 1.45,
        color: 'var(--dsw-alias-label-secondary)',
        background: 'var(--dsw-alias-bg-layer-2)',
        borderRadius: 6,
        padding: '6px 7px',
      },
      modalHint: {
        fontSize: 9,
        lineHeight: 1.4,
        color: 'var(--dsw-alias-label-secondary)',
      },
      modalRestart: {
        fontSize: 10,
        lineHeight: 1.5,
        fontWeight: 600,
        color: 'var(--dsw-alias-label-primary)',
        background: 'rgba(217, 119, 6, 0.12)',
        border: '1px solid rgba(217, 119, 6, 0.35)',
        borderLeft: '3px solid #d97706',
        borderRadius: 6,
        padding: '8px 9px',
      },
      restartBanner: {
        display: 'block',
        marginTop: 1,
        padding: '5px 7px',
        borderRadius: 6,
        background: 'rgba(217, 119, 6, 0.12)',
        borderLeft: '3px solid #d97706',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 9,
        lineHeight: 1.4,
        fontWeight: 600,
      },
      modalError: {
        fontSize: 9,
        lineHeight: 1.4,
        color: 'var(--dsw-alias-state-error-primary)',
      },
      modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 6,
        marginTop: 2,
      },
      primaryButton: {
        border: 'none',
        borderRadius: 6,
        background: 'var(--dsw-alias-brand-primary)',
        color: 'var(--dsw-alias-bg-base)',
        fontSize: 10,
        fontWeight: 600,
        padding: '6px 10px',
        cursor: 'pointer',
      },
      secondaryButton: {
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 6,
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: 10,
        padding: '6px 10px',
        cursor: 'pointer',
      },
      specText: {
        fontFamily: 'monospace',
        fontSize: 8.5,
        color: 'var(--dsw-alias-label-secondary)',
        wordBreak: 'break-all',
        background: 'var(--dsw-alias-bg-layer-2)',
        padding: '5px 6px',
        borderRadius: 6,
      },
      hint: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minWidth: 0,
      },
      hintTitle: {
        fontSize: 10,
        color: 'var(--dsw-alias-label-primary)',
      },
      hintText: {
        fontSize: 9,
        color: 'var(--dsw-alias-label-secondary)',
      },
      link: {
        flex: '0 0 auto',
        border: 'none',
        background: 'transparent',
        color: 'var(--dsw-alias-brand-primary)',
        cursor: 'pointer',
        fontSize: 9,
        padding: 0,
        whiteSpace: 'nowrap',
      },
      footerError: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        minWidth: 0,
        fontSize: 9,
        color: 'var(--dsw-alias-state-error-primary)',
      },
      footerErrorText: {
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    };

    let fallbackT = (key) => key;

    function formatNumber(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      const maximumFractionDigits = value > 0 && value < 1 ? 2 : 1;
      return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
    }

    function formatPercent(ratio) {
      if (typeof ratio !== 'number' || !Number.isFinite(ratio)) return null;
      const percent = ratio * 100;
      if (percent > 0 && percent < 10) return `${percent.toFixed(1)}%`;
      return `${Math.round(percent)}%`;
    }

    function formatClock(iso) {
      const ms = typeof iso === 'string' ? Date.parse(iso) : NaN;
      if (!Number.isFinite(ms)) return '—';
      try {
        return new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(ms));
      } catch {
        return new Date(ms).toISOString().slice(11, 16);
      }
    }

    function formatUpdated(iso) {
      const ms = typeof iso === 'string' ? Date.parse(iso) : NaN;
      if (!Number.isFinite(ms)) return '—';
      try {
        return new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date(ms));
      } catch {
        return new Date(ms).toISOString().slice(11, 19);
      }
    }

    function formatCountdown(iso, now) {
      const ms = typeof iso === 'string' ? Date.parse(iso) : NaN;
      if (!Number.isFinite(ms)) return null;
      const diff = ms - now;
      if (diff <= 0) return null;
      const totalMinutes = Math.ceil(diff / 60000);
      if (totalMinutes < 60) return `${totalMinutes}m`;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours < 24) return `${hours}h ${minutes}m`;
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    function formatFull(iso) {
      const ms = typeof iso === 'string' ? Date.parse(iso) : NaN;
      if (!Number.isFinite(ms)) return String(iso || '—');
      try {
        return new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'medium',
        }).format(new Date(ms));
      } catch {
        return new Date(ms).toISOString();
      }
    }

    // The sidebar footer is a flex row shared with TokenWorks' 更新 button or
    // DSH's Cordis button. Global <style>/:has rules are not reliable on every
    // carrier, so after mount we collapse the slot cells that contain only this
    // card and make the real footer row wrap. Inline !important values are
    // restored when the card unmounts.
    function applyFooterLayout(root) {
      const saved = [];
      const apply = (el, property, value) => {
        const previous = el.style.getPropertyValue(property);
        const priority = el.style.getPropertyPriority(property);
        saved.push({ el, property, previous, priority });
        el.style.setProperty(property, value, 'important');
      };
      const restore = () => {
        for (const item of saved.reverse()) {
          if (item.previous) item.el.style.setProperty(item.property, item.previous, item.priority);
          else item.el.style.removeProperty(item.property);
        }
      };
      try {
        const classOf = (el) => typeof el.className === 'string' ? el.className : '';
        let footer = null;
        for (let node = root.parentElement; node && node !== document.body; node = node.parentElement) {
          if (classOf(node).includes('footerActions')) { footer = node; break; }
        }
        if (!footer) {
          for (let node = root.parentElement; node && node !== document.body; node = node.parentElement) {
            const style = getComputedStyle(node);
            const hasOther = [...node.children].some((child) => child !== root && !child.contains(root));
            if (hasOther && (style.display.includes('flex') || style.display.includes('grid'))) { footer = node; break; }
          }
        }
        if (!footer) return restore;
        const chain = [];
        for (let node = root.parentElement; node && node !== footer && node !== document.body && chain.length < 6; node = node.parentElement) {
          chain.push(node);
        }
        for (const node of chain) {
          const onlyCard = [...node.children].every((child) => child === root || child.contains(root));
          if (onlyCard) {
            apply(node, 'display', 'contents');
          } else {
            apply(node, 'width', '100%');
            apply(node, 'flex-basis', '100%');
            apply(node, 'min-width', '0');
            apply(node, 'overflow', 'visible');
            const style = getComputedStyle(node);
            if (style.display.includes('flex')) apply(node, 'flex-wrap', 'wrap');
            if (style.display.includes('grid')) apply(node, 'grid-template-columns', '1fr');
          }
        }
        apply(footer, 'flex-wrap', 'wrap');
        apply(footer, 'width', '100%');
        apply(footer, 'height', 'auto');
        apply(footer, 'max-height', 'none');
        apply(footer, 'overflow', 'visible');
        const footerStyle = getComputedStyle(footer);
        if (footerStyle.display.includes('grid')) apply(footer, 'grid-template-columns', '1fr');
        const parent = footer.parentElement;
        if (parent && parent !== document.body) {
          const parentStyle = getComputedStyle(parent);
          if (parentStyle.display.includes('flex')) apply(parent, 'flex-wrap', 'wrap');
          if (parentStyle.display.includes('grid')) apply(parent, 'grid-template-columns', '1fr');
        }
      } catch {
        // The card still renders; a carrier-specific footer simply stays as-is.
      }
      return restore;
    }

    // The sidebar footer is global, while the key actually in use is chosen per
    // conversation. A null occupant in the conversation composer dock captures
    // the open session id; the card then reads that session's durable
    // modelSelection projection, so switching conversations moves the star.
    function SessionProbe(props) {
      const id = typeof props.sessionId === 'string' ? props.sessionId : null;
      React.useLayoutEffect(() => {
        setActiveSession(id);
        return () => clearActiveSession(id);
      }, [id]);
      return null;
    }

    function useActiveSessionProvider() {
      const id = React.useSyncExternalStore(subscribeActiveSession, getActiveSession, getActiveSession);
      const [provider, setProvider] = React.useState(null);

      React.useEffect(() => {
        if (!id || clientCtx === null) {
          setProvider(null);
          return;
        }
        const sessions = clientCtx.get('sessions');
        if (!sessions || typeof sessions.binding !== 'function') {
          setProvider(null);
          return;
        }
        let binding;
        try {
          binding = sessions.binding(id);
        } catch {
          setProvider(null);
          return;
        }
        const projections = binding && binding.session ? binding.session.projections : null;
        let face;
        try {
          face = projections && typeof projections.faceOf === 'function'
            ? projections.faceOf('modelSelection')
            : null;
        } catch {
          setProvider(null);
          return;
        }
        if (!face || typeof face.getSnapshot !== 'function' || typeof face.subscribe !== 'function') {
          setProvider(null);
          return;
        }
        const read = () => {
          const value = face.getSnapshot();
          const next = value && value.next;
          setProvider(next && typeof next.provider === 'string' ? next.provider : null);
        };
        read();
        return face.subscribe(read);
      }, [id]);

      return provider;
    }

    function QuotaStrip(props) {
      const t = typeof props.t === 'function' ? props.t : fallbackT;
      const [snapshot, setSnapshot] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [loading, setLoading] = React.useState(true);
      const [refreshing, setRefreshing] = React.useState(false);
      const [now, setNow] = React.useState(() => Date.now());
      const requestSeq = React.useRef(0);
      const cancelledRef = React.useRef(false);
      const rootRef = React.useRef(null);
      const activeProvider = useActiveSessionProvider();
      const [updateInfo, setUpdateInfo] = React.useState(null);
      const [updateOpen, setUpdateOpen] = React.useState(false);
      const [updateChecking, setUpdateChecking] = React.useState(false);
      const [updateApplying, setUpdateApplying] = React.useState(false);
      const [updateRestartPending, setUpdateRestartPending] = React.useState(false);
      const [restartNotice, setRestartNotice] = React.useState(
        () => previousClientVersion !== null && previousClientVersion !== CLIENT_VERSION,
      );
      const [updateNotice, setUpdateNotice] = React.useState('');
      const [updateError, setUpdateError] = React.useState('');
      const [updateResult, setUpdateResult] = React.useState('');
      const updateCheckingRef = React.useRef(false);
      const noticeTimerRef = React.useRef(null);

      const showUpdateNotice = React.useCallback((text) => {
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        setUpdateNotice(text);
        noticeTimerRef.current = setTimeout(() => {
          noticeTimerRef.current = null;
          setUpdateNotice('');
        }, 4000);
      }, []);

      React.useEffect(() => () => {
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      }, []);

      const load = React.useCallback(async (force) => {
        const seq = ++requestSeq.current;
        if (force) setRefreshing(true);
        try {
          const url = new URL(ENDPOINT, document.baseURI);
          const language = typeof navigator !== 'undefined'
            && String(navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'zh';
          url.searchParams.set('lang', language);
          if (force) url.searchParams.set('force', '1');
          const response = await fetch(url.pathname + url.search, {
            cache: 'no-store',
            headers: { accept: 'application/json' },
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const body = await response.json();
          if (!body || !Array.isArray(body.keys)) throw new Error('invalid snapshot');
          if (seq !== requestSeq.current || cancelledRef.current) return null;
          reloadForHostVersion(body.pluginVersion);
          setSnapshot(body);
          setError(null);
          setLoading(false);
          return body;
        } catch (err) {
          if (seq !== requestSeq.current || cancelledRef.current) return null;
          setError(err && err.message ? err.message : 'request failed');
          setLoading(false);
          return null;
        } finally {
          if (force && !cancelledRef.current) setRefreshing(false);
        }
      }, []);

      const checkForUpdate = React.useCallback(async (manual) => {
        if (updateCheckingRef.current) return;
        updateCheckingRef.current = true;
        setUpdateChecking(true);
        if (manual) showUpdateNotice(t('updateChecking'));
        try {
          let info = null;
          try {
            const url = new URL(UPDATE_ENDPOINT, document.baseURI);
            if (manual) url.searchParams.set('force', '1');
            const response = await fetch(url.pathname + url.search, {
              cache: 'no-store',
              headers: { accept: 'application/json' },
            });
            if (response.ok) {
              const body = await response.json();
              if (body && body.ok !== false) info = normalizeUpdateInfo(body);
            }
          } catch {
            info = null;
          }
          if (!info) {
            if (manual) showUpdateNotice(t('updateFailed'));
            return;
          }
          const available = isNewerVersion(info.latestVersion, CLIENT_VERSION);
          setUpdateInfo({
            ...info,
            updateAvailable: available,
            canApply: available && info.canApply === true,
          });
          if (manual) showUpdateNotice(available ? t('updateAvailable') : t('updateUpToDate'));
        } catch {
          if (manual) showUpdateNotice(t('updateFailed'));
        } finally {
          updateCheckingRef.current = false;
          setUpdateChecking(false);
        }
      }, [showUpdateNotice, t]);

      React.useEffect(() => {
        const boot = setTimeout(() => { void checkForUpdate(false); }, 1200);
        const daily = setInterval(() => { void checkForUpdate(false); }, UPDATE_INTERVAL_MS);
        return () => {
          clearTimeout(boot);
          clearInterval(daily);
        };
      }, [checkForUpdate]);

      React.useEffect(() => {
        if (!updateOpen) return undefined;
        const onKeyDown = (event) => {
          if (event.key === 'Escape' && !updateApplying) setUpdateOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
      }, [updateOpen, updateApplying]);

      React.useEffect(() => {
        cancelledRef.current = false;
        let disposed = false;
        let timer = null;

        function schedule(ms) {
          if (disposed) return;
          const delay = Number.isFinite(ms) ? Math.max(5000, ms) : 15000;
          timer = setTimeout(run, delay);
        }

        async function run() {
          const body = await load(false);
          if (disposed) return;
          schedule(body && Number.isFinite(body.pollAfterMs) ? body.pollAfterMs : 15000);
        }

        async function boot() {
          const body = await load(true);
          if (disposed) return;
          schedule(body && Number.isFinite(body.pollAfterMs) ? body.pollAfterMs : 15000);
        }

        boot();

        const onVisibility = () => {
          if (document.hidden) return;
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          run();
        };
        document.addEventListener('visibilitychange', onVisibility);

        const clock = setInterval(() => {
          if (!document.hidden) setNow(Date.now());
        }, 15000);

        return () => {
          disposed = true;
          cancelledRef.current = true;
          if (timer) clearTimeout(timer);
          clearInterval(clock);
          document.removeEventListener('visibilitychange', onVisibility);
        };
      }, [load]);

      React.useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        return applyFooterLayout(root);
      }, [props.wide]);

      const keys = snapshot && Array.isArray(snapshot.keys) ? snapshot.keys : [];
      const warnings = snapshot && Array.isArray(snapshot.warnings) ? snapshot.warnings : [];
      const defaultProvider = snapshot && typeof snapshot.defaultProvider === 'string' ? snapshot.defaultProvider : null;
      const updated = snapshot && snapshot.generatedAt ? formatUpdated(snapshot.generatedAt) : null;
      const tokenworksNotReady = warnings.includes('tokenworks-not-ready');

      if (props.wide === false) return null;

      function handleVersionClick() {
        if (updateInfo && updateInfo.updateAvailable) {
          setUpdateError('');
          setUpdateResult('');
          setUpdateOpen(true);
          return;
        }
        void checkForUpdate(true);
      }

      async function copyUpdateSpec() {
        if (!updateInfo || !updateInfo.spec) return;
        try {
          await navigator.clipboard.writeText(updateInfo.spec);
          setUpdateResult(t('updateCopied'));
        } catch {
          setUpdateError(t('updateNoProvider'));
        }
      }

      async function applyUpdate() {
        if (!updateInfo || updateApplying) return;
        if (!updateInfo.applyToken) {
          setUpdateError(t('updateNoProvider'));
          return;
        }
        setUpdateApplying(true);
        setUpdateRestartPending(false);
        setUpdateError('');
        setUpdateResult('');
        try {
          const response = await fetch(UPDATE_APPLY_ENDPOINT, {
            method: 'POST',
            cache: 'no-store',
            headers: {
              accept: 'application/json',
              'x-dsh-update-token': updateInfo.applyToken,
            },
          });
          const body = await response.json().catch(() => null);
          if (!response.ok || !body || body.ok !== true) {
            setUpdateApplying(false);
            setUpdateError(`${t('updateFailed')}${body && body.error ? `: ${body.error}` : ''}`);
            void checkForUpdate(true);
            return;
          }
          const result = body.result;
          if (result && result.changed === false) {
            setUpdateApplying(false);
            setUpdateResult(t('updateUpToDate'));
            return;
          }
          if (result && (result.application === 'failed' || result.error)) {
            setUpdateApplying(false);
            setUpdateError(t('updateFailed'));
            void checkForUpdate(true);
            return;
          }
          setUpdateApplying(false);
          if (result && result.application === 'restart-required') {
            holdHostReload = true;
            setUpdateRestartPending(true);
            setUpdateResult(t('updateRestartPrompt'));
            return;
          }
          holdHostReload = true;
          setUpdateRestartPending(true);
          setUpdateResult(t('updateRestartPrompt'));
        } catch (err) {
          setUpdateApplying(false);
          const detail = err && err.message ? `: ${err.message}` : '';
          setUpdateError(`${t('updateFailed')}${detail}`);
          void checkForUpdate(true);
        }
      }

      function errorText(code, detail) {
        if (code === 'tokenworks-error' && typeof detail === 'string' && detail.trim() !== '') {
          return detail.trim();
        }
        const key = `error.${typeof code === 'string' && code ? code : 'unknown'}`;
        const translated = t(key);
        if (translated !== key) return translated;
        const fallback = t('error.unknown');
        return fallback !== 'error.unknown' ? fallback : t('unavailable');
      }

      function sourceLabel(source) {
        if (source === 'user') return t('sourceUser');
        if (source === 'cache') return t('sourceCache');
        return t('sourceKey');
      }

      function windowLegend(id) {
        const label = t(`window${id}`);
        const candidates = keys
          .map((key) => (Array.isArray(key.windows) ? key.windows.find((window) => window.id === id) : null))
          .filter(Boolean);
        const primary = candidates.find((window) => window.state === 'active' || window.state === 'stale')
          || candidates[0]
          || null;
        let resetText = '—';
        if (primary) {
          if (primary.state === 'resetting') {
            resetText = t('resetting');
          } else if (primary.resetAt) {
            const clock = formatClock(primary.resetAt);
            const countdown = formatCountdown(primary.resetAt, now);
            resetText = countdown ? `${clock} · ${countdown}` : clock;
          }
        }
        const title = candidates.length > 0
          ? [
            `${t('nextReset')}: ${resetText}`,
            ...candidates.map((window) => `${window.id}: ${window.resetAt ? formatFull(window.resetAt) : t('notConfigured')}`),
          ].join('\n')
          : label;
        return h('div', { style: STYLE.legendCell, title },
          h('div', { style: STYLE.legendName }, label),
          h('div', { style: STYLE.legendReset }, resetText)
        );
      }

      function cell(window) {
        const label = t(`window${window.id}`);

        if (window.state === 'not-configured') {
          return h('div', { style: STYLE.cell, title: `${label}: ${t('notConfigured')}` },
            h('div', { style: { ...STYLE.value, color: 'var(--dsw-alias-label-secondary)' } }, '—')
          );
        }

        if (window.state === 'resetting') {
          return h('div', { style: STYLE.cell, title: `${label}: ${t('resetting')}` },
            h('div', { style: { ...STYLE.value, color: 'var(--dsw-alias-label-secondary)' } }, t('resetting')),
            h('div', { style: STYLE.bar, role: 'progressbar', 'aria-label': label, 'aria-valuetext': t('resetting') },
              h('div', { style: STYLE.track, 'aria-hidden': true })
            )
          );
        }

        const ratio = typeof window.ratio === 'number' && Number.isFinite(window.ratio) ? window.ratio : null;
        const percent = formatPercent(ratio);
        const usedColor = ratio !== null && ratio >= 0.9
          ? 'var(--dsw-alias-state-error-primary)'
          : ratio !== null && ratio >= 0.7
            ? 'var(--dsw-alias-state-warn-primary)'
            : 'var(--dsw-alias-state-success-primary)';
        const percentColor = ratio !== null && ratio >= 0.9
          ? 'var(--dsw-alias-state-error-primary)'
          : ratio !== null && ratio >= 0.7
            ? 'var(--dsw-alias-state-warn-primary)'
            : 'var(--dsw-alias-label-secondary)';
        const used = typeof window.used === 'number' && Number.isFinite(window.used) ? window.used : null;
        const limit = typeof window.limit === 'number' && Number.isFinite(window.limit) ? window.limit : null;
        const remaining = used !== null && limit !== null ? Math.max(0, limit - used) : null;
        const valueText = used === null
          ? (limit === null ? t('unknownUsage') : `—/${formatNumber(limit)}`)
          : `${formatNumber(used)}/${limit === null ? '—' : formatNumber(limit)}`;
        const isStale = window.state === 'stale';
        const fillWidth = ratio === null || ratio <= 0
          ? '0%'
          : `max(6px, ${Math.min(100, Math.max(0, ratio * 100))}%)`;
        const titleParts = [label, valueText];
        if (percent) titleParts.push(percent);
        if (remaining !== null) titleParts.push(`${t('remaining')} ${formatNumber(remaining)}`);
        if (window.resetAt) {
          const clock = formatClock(window.resetAt);
          const countdown = formatCountdown(window.resetAt, now);
          titleParts.push(`${t('resetAt')} ${clock}${countdown ? ` (${countdown})` : ''}`);
        }
        if (window.source) titleParts.push(sourceLabel(window.source));
        if (isStale) titleParts.push(t('stale'));

        return h('div', { style: STYLE.cell, title: titleParts.join(' · ') },
          h('div', { style: STYLE.valueLine },
            h('span', { style: STYLE.value }, `${isStale ? '≈ ' : ''}${valueText}`),
            percent ? h('span', { style: { ...STYLE.percent, color: percentColor } }, percent) : null
          ),
          h('div', {
            style: { ...STYLE.bar, opacity: isStale ? 0.55 : 1 },
            role: 'progressbar',
            'aria-label': label,
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': ratio === null ? undefined : Math.round(Math.min(1, Math.max(0, ratio)) * 100),
            'aria-valuetext': percent || valueText,
          },
          h('div', { style: STYLE.track, 'aria-hidden': true }),
          h('div', {
            style: {
              position: 'relative',
              height: '100%',
              width: fillWidth,
              background: usedColor,
              borderRadius: 999,
              transition: 'width 200ms ease',
            },
          })
          )
        );
      }

      function keyRow(key, index, currentProvider) {
        const windows = Array.isArray(key.windows) ? key.windows : [];
        const byId = new Map(windows.map((window) => [window.id, window]));
        const limited = key.blocked === true || windows.some((window) =>
          (window.state === 'active' || window.state === 'stale')
          && typeof window.ratio === 'number'
          && window.ratio >= 1);
        const label = typeof key.label === 'string' && key.label ? key.label : key.provider;
        const displayLabel = key.provider === 'ustc-llm' && label === 'TokenWorks' ? t('tokenworksRow') : label;
        const keyError = key.ok === false ? errorText(key.error, key.errorDetail) : null;
        const issue = keyError || (limited ? t('limited') : null);
        const isCurrent = typeof currentProvider === 'string'
          ? key.provider === currentProvider
          : key.default || key.provider === defaultProvider;

        return h('div', {
          key: key.provider,
          style: index > 0
            ? { ...STYLE.keyRow, borderTop: '1px solid var(--dsw-alias-border-l1)' }
            : STYLE.keyRow,
        },
        h('div', {
          style: STYLE.key,
          title: [key.provider, label, keyError].filter(Boolean).join(' · '),
        },
        h('span', { style: STYLE.keyLabel }, displayLabel),
        isCurrent
          ? h('span', {
            style: STYLE.star,
            title: typeof currentProvider === 'string'
              ? `${t('currentKey')} · ${currentProvider}`
              : t('default'),
          }, '*')
          : null,
        issue ? h('span', { style: STYLE.issueDot, title: issue }, '!') : null
        ),
        WINDOW_IDS.map((id) => cell(byId.get(id) || {
          id,
          state: 'not-configured',
          source: null,
          used: null,
          limit: null,
          ratio: null,
          resetAt: null,
        }))
        );
      }

      const failed = keys.filter((key) => key.ok === false);
      const versionTitle = updateInfo && updateInfo.updateAvailable
        ? `${t('updateAvailable')} v${updateInfo.latestVersion}`
        : updateChecking
          ? t('updateChecking')
          : t('versionCheck');
      const header = h('div', { style: STYLE.header },
        h('span', { style: STYLE.title }, t('title')),
        h('button', {
          type: 'button',
          style: { ...STYLE.versionButton, opacity: updateChecking ? 0.6 : 1 },
          title: versionTitle,
          'aria-label': `${t('updateTitle')}: ${versionTitle}`,
          disabled: updateChecking,
          onClick: handleVersionClick,
        },
        `v${CLIENT_VERSION}`,
        updateInfo && updateInfo.updateAvailable
          ? h('span', { style: STYLE.versionDot, 'aria-hidden': true })
          : null,
        updateNotice ? h('span', { style: STYLE.versionNote }, updateNotice) : null
        ),
        warnings.length > 0
          ? h('span', { style: STYLE.warn, title: warnings.join('\n'), 'aria-label': t('warnings') }, '!')
          : null,
        error && snapshot ? h('span', { style: STYLE.warn, title: error }, '!') : null,
        h('span', { style: STYLE.meta }, updated ? `${t('updatedLabel')} ${updated}` : ''),
        h('button', {
          type: 'button',
          'aria-label': t('refresh'),
          title: t('refresh'),
          disabled: refreshing,
          onClick: () => { load(true); },
          style: { ...STYLE.refresh, opacity: refreshing ? 0.5 : 1 },
        }, '↻')
      );

      const restartBanner = restartNotice
        ? h('div', { style: STYLE.restartBanner, title: t('restartAfterUpdateHint') },
          t('restartAfterUpdate'))
        : null;

      let body;
      if (loading && !snapshot) {
        body = h('div', { style: STYLE.hint }, h('div', { style: STYLE.hintText }, t('loading')));
      } else if (!snapshot && error) {
        body = h('div', { style: STYLE.hint },
          h('div', { style: STYLE.footerError },
            h('span', { style: STYLE.footerErrorText }, `${t('unavailable')}: ${error}`),
            h('button', { type: 'button', style: STYLE.link, onClick: () => { load(true); } }, t('retry'))
          )
        );
      } else if (keys.length === 0) {
        body = h('div', { style: STYLE.hint },
          h('div', { style: STYLE.hintTitle }, tokenworksNotReady ? t('tokenworksNotReady') : t('noProviders')),
          h('div', { style: STYLE.hintText }, tokenworksNotReady ? t('tokenworksNotReadyHint') : t('noProvidersHint'))
        );
      } else {
        body = h(React.Fragment, null,
          h('div', { style: STYLE.table },
            h('div', { style: STYLE.legendRow },
              h('div', { key: 'corner' }),
              WINDOW_IDS.map((id) => h(React.Fragment, { key: id }, windowLegend(id)))
            ),
            keys.map((key, index) => keyRow(key, index, activeProvider))
          ),
          failed.length > 0
            ? h('div', { style: STYLE.footerError },
              h('span', { style: STYLE.footerErrorText },
                `${failed.length > 1 ? `${failed.length} keys · ` : `${failed[0].label || failed[0].provider}: `}${errorText(failed[0].error, failed[0].errorDetail)}`),
              h('button', { type: 'button', style: STYLE.link, onClick: () => { load(true); } }, t('retry'))
            )
            : null
        );
      }

      const updateModal = updateOpen && updateInfo
        ? h('div', {
          style: STYLE.modalOverlay,
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !updateApplying) setUpdateOpen(false);
          },
        },
        h('div', {
          style: STYLE.modal,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': t('updateTitle'),
          onMouseDown: (event) => event.stopPropagation(),
        },
        h('div', { style: STYLE.modalTitle }, t('updateTitle')),
        h('div', { style: STYLE.modalVersion },
          `${t('updateCurrent')} v${CLIENT_VERSION}  →  ${t('updateLatest')} v${updateInfo.latestVersion}`
        ),
        updateInfo.releaseNotes
          ? h('div', { style: STYLE.modalNotes }, updateInfo.releaseNotes)
          : null,
        updateInfo.releaseUrl
          ? h('a', {
            href: updateInfo.releaseUrl,
            target: '_blank',
            rel: 'noreferrer',
            style: { fontSize: 9, color: 'var(--dsw-alias-brand-primary)', textDecoration: 'none' },
          }, t('updateReleaseLink'))
          : null,
        h('div', { style: STYLE.modalHint },
          updateProviderText(t, updateInfo.provider && updateInfo.provider.id)
        ),
        !updateInfo.canApply && updateInfo.spec
          ? h('div', { style: STYLE.specText }, updateInfo.spec)
          : null,
        updateError ? h('div', { style: STYLE.modalError }, updateError) : null,
        updateResult
          ? h('div', { style: updateRestartPending ? STYLE.modalRestart : STYLE.modalHint }, updateResult)
          : null,
        h('div', { style: STYLE.modalActions },
          updateRestartPending
            ? h('button', {
              type: 'button',
              style: STYLE.primaryButton,
              onClick: () => setUpdateOpen(false),
            }, t('updateClose'))
            : h(React.Fragment, null,
              h('button', {
                type: 'button',
                style: STYLE.secondaryButton,
                disabled: updateApplying,
                onClick: () => setUpdateOpen(false),
              }, t('updateCancel')),
              !updateInfo.canApply && updateInfo.spec
                ? h('button', {
                  type: 'button',
                  style: STYLE.secondaryButton,
                  disabled: updateApplying,
                  onClick: copyUpdateSpec,
                }, t('updateCopy'))
                : null,
              updateInfo.canApply
                ? h('button', {
                  type: 'button',
                  style: { ...STYLE.primaryButton, opacity: updateApplying ? 0.6 : 1 },
                  disabled: updateApplying,
                  onClick: applyUpdate,
                }, updateApplying ? t('updateApplying') : t('updateNow'))
                : null
            )
        )
        ))
        : null;

      return h('div', {
        style: STYLE.root,
        ref: rootRef,
        role: 'group',
        'aria-label': t('title'),
        'data-ustc-quota-root': '',
      },
      header,
      restartBanner,
      body,
      updateModal
      );
    }

    function versionParts(value) {
      return String(value || '')
        .split('.')
        .map((part) => parseInt(part, 10))
        .filter((part) => Number.isFinite(part));
    }

    function isNewerVersion(candidate, current) {
      const left = versionParts(candidate);
      const right = versionParts(current);
      const length = Math.max(left.length, right.length);
      for (let index = 0; index < length; index += 1) {
        const a = left[index] || 0;
        const b = right[index] || 0;
        if (a !== b) return a > b;
      }
      return false;
    }

    function normalizeUpdateInfo(value) {
      if (!value || typeof value !== 'object' || typeof value.latestVersion !== 'string') return null;
      const latest = value.latestVersion.trim().replace(/^v/i, '');
      if (!latest) return null;
      return {
        ...value,
        latestVersion: latest,
        spec: typeof value.spec === 'string' && value.spec
          ? value.spec
          : `https://github.com/Awenforever/dsh-ustc-quota/archive/refs/tags/v${latest}.tar.gz`,
        releaseUrl: typeof value.releaseUrl === 'string' && value.releaseUrl
          ? value.releaseUrl
          : `https://github.com/Awenforever/dsh-ustc-quota/releases/tag/v${latest}`,
        releaseNotes: typeof value.releaseNotes === 'string' ? value.releaseNotes : '',
      };
    }

    function updateProviderText(t, id) {
      if (id === 'official-plugin-updates') return t('updateProviderOfficial');
      if (id === 'dsh-plugin-manager') return t('updateProviderManager');
      return t('updateProviderManual');
    }

    // TokenWorks applies a new Host bundle live but does not necessarily make
    // the already-open renderer load the new client module. The new Host reports
    // its package version in the snapshot; the previous client reloads the page
    // once when it sees a newer Host version. If the carrier caches the module
    // even across a page reload, only a full app restart can replace it.
    function reloadForHostVersion(hostVersion) {
      if (holdHostReload) return;
      if (typeof window === 'undefined' || typeof hostVersion !== 'string') return;
      if (!isNewerVersion(hostVersion, CLIENT_VERSION)) return;
      if (typeof sessionStorage !== 'undefined') {
        try {
          if (sessionStorage.getItem(HOST_VERSION_KEY) === hostVersion) return;
          sessionStorage.setItem(HOST_VERSION_KEY, hostVersion);
        } catch {
          // Storage unavailable: fall through and reload once.
        }
      }
      setTimeout(() => {
        try {
          window.location.reload();
        } catch {
          // Reload blocked by the carrier.
        }
      }, 120);
    }

    // A newly installed/updated client module may be HMR-loaded into an
    // already-running page. Reload that page once so the new sidebar layout is
    // applied from a clean boot. A fresh document already has this bundle, and
    // sessionStorage prevents a reload loop if localStorage is unavailable.
    function reloadOnceAfterClientUpdate() {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
      try {
        const storedVersion = localStorage.getItem(CLIENT_VERSION_KEY);
        if (storedVersion && storedVersion !== CLIENT_VERSION) previousClientVersion = storedVersion;
        if (localStorage.getItem(CLIENT_VERSION_KEY) === CLIENT_VERSION) return;
        localStorage.setItem(CLIENT_VERSION_KEY, CLIENT_VERSION);
        if (typeof performance !== 'undefined' && performance.now() < 10000) return;
        if (typeof sessionStorage !== 'undefined') {
          if (sessionStorage.getItem(CLIENT_RELOAD_KEY) === CLIENT_VERSION) return;
          sessionStorage.setItem(CLIENT_RELOAD_KEY, CLIENT_VERSION);
        }
        setTimeout(() => {
          try {
            window.location.reload();
          } catch {
            // Reload blocked by the carrier; the card is already registered.
          }
        }, 120);
      } catch {
        // Storage/reload unavailable: keep the current page.
      }
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        clientCtx = ctx;
        reloadOnceAfterClientUpdate();
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ustc-quota: locale dictionaries');
        const t = ctx.locale.bind(NS);
        fallbackT = t;
        ctx.slots.inject(SESSION_SLOT, () => ctx.slots.register({
          name: SESSION_SLOT,
          id: SESSION_PROBE_ID,
          order: -1000,
        }, SessionProbe));
        ctx.slots.inject(SLOT, () => ctx.slots.register({
          name: SLOT,
          id: 'ustc-quota',
          order: 0,
          locale: NS,
          inject: () => ({ t }),
        }, QuotaStrip));
      },
    };
  },
});

window.__ModuleLoader__.load({
  id: 'dsh-ustc-quota',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'dsh-ustc-quota';
    const SLOT = 'sidebar.footer.action';
    const ENDPOINT = 'plugins/dsh-ustc-quota/snapshot';
    const WINDOW_IDS = ['3h', '12h', '24h'];

    const zh = {
      title: 'USTC 词元额度',
      updatedLabel: '更新于',
      refresh: '刷新',
      loading: '加载中…',
      noProviders: '未发现 USTC 模型厂商',
      noProvidersHint: '请检查模型设置中 baseURL 为 api.llm.ustc.edu.cn',
      tokenworksNotReady: '词元工坊未登录',
      tokenworksNotReadyHint: '登录词元工坊后会自动读取学校模型额度',
      default: '默认',
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
      default: 'default',
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
        padding: '8px 8px 7px',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 8,
        background: 'var(--dsw-alias-bg-layer-1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontSize: 11,
        lineHeight: 1.3,
        color: 'var(--dsw-alias-label-secondary)',
        fontVariantNumeric: 'tabular-nums',
      },
      header: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        minWidth: 0,
      },
      title: {
        fontWeight: 600,
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 11,
        whiteSpace: 'nowrap',
      },
      meta: {
        flex: 1,
        minWidth: 0,
        fontSize: 9,
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
        fontSize: 12,
        lineHeight: 1,
        padding: '1px 2px',
        borderRadius: 4,
      },
      grid: {
        display: 'grid',
        gridTemplateColumns: '38px repeat(3, minmax(0, 1fr))',
        columnGap: 5,
        rowGap: 4,
        alignItems: 'center',
        minWidth: 0,
      },
      legendCell: {
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      },
      legendName: {
        fontSize: 9,
        fontWeight: 600,
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
        fontWeight: 500,
        fontSize: 10,
      },
      keyLabel: {
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 28,
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
        gap: 1,
      },
      valueLine: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 2,
        minWidth: 0,
      },
      value: {
        minWidth: 0,
        fontSize: 9,
        color: 'var(--dsw-alias-label-primary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
      percent: {
        flex: '0 0 auto',
        fontSize: 9,
        color: 'var(--dsw-alias-label-secondary)',
        whiteSpace: 'nowrap',
      },
      bar: {
        height: 3,
        borderRadius: 1.5,
        background: 'var(--dsw-alias-bg-layer-2)',
        overflow: 'hidden',
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

    // The sidebar footer may put slot occupants in per-entry cells. Collapse the
    // cells that contain only this card, then make the real footer row wrap:
    // existing actions (TokenWorks 更新 / DSH Cordis) keep the first line, the
    // quota card takes a full line below them instead of being squeezed beside.
    const CONTAINER_CSS = `
      :has(> [data-ustc-quota-root]):not(:has(> :not([data-ustc-quota-root]))) { display: contents !important; }
      :has(> :has(> [data-ustc-quota-root])):not(:has(> :not(:has(> [data-ustc-quota-root])))) { display: contents !important; }
      :has(> [data-ustc-quota-root]),
      :has(> :has(> [data-ustc-quota-root])),
      :has(> :has(> :has(> [data-ustc-quota-root]))) { flex-wrap: wrap !important; }
      :has(> [data-ustc-quota-root]),
      :has(> :has(> [data-ustc-quota-root])) { width: 100% !important; min-width: 0 !important; }
    `;

    function QuotaStrip(props) {
      const t = typeof props.t === 'function' ? props.t : fallbackT;
      const [snapshot, setSnapshot] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [loading, setLoading] = React.useState(true);
      const [refreshing, setRefreshing] = React.useState(false);
      const [now, setNow] = React.useState(() => Date.now());
      const requestSeq = React.useRef(0);
      const cancelledRef = React.useRef(false);

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

      const keys = snapshot && Array.isArray(snapshot.keys) ? snapshot.keys : [];
      const warnings = snapshot && Array.isArray(snapshot.warnings) ? snapshot.warnings : [];
      const defaultProvider = snapshot && typeof snapshot.defaultProvider === 'string' ? snapshot.defaultProvider : null;
      const updated = snapshot && snapshot.generatedAt ? formatUpdated(snapshot.generatedAt) : null;
      const tokenworksNotReady = warnings.includes('tokenworks-not-ready');

      if (props.wide === false) return null;

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
          ? candidates
            .map((window) => `${window.id}: ${window.resetAt ? formatFull(window.resetAt) : t('notConfigured')}`)
            .join('\n')
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
              h('div', {
                style: {
                  height: '100%',
                  width: '0%',
                  background: 'var(--dsw-alias-state-idle-primary)',
                  opacity: 0.5,
                },
              })
            )
          );
        }

        const ratio = typeof window.ratio === 'number' && Number.isFinite(window.ratio) ? window.ratio : null;
        const percent = formatPercent(ratio);
        const color = ratio !== null && ratio >= 1
          ? 'var(--dsw-alias-state-error-primary)'
          : ratio !== null && ratio >= 0.7
            ? 'var(--dsw-alias-state-warn-primary)'
            : 'var(--dsw-alias-brand-primary)';
        const used = typeof window.used === 'number' && Number.isFinite(window.used) ? window.used : null;
        const limit = typeof window.limit === 'number' && Number.isFinite(window.limit) ? window.limit : null;
        const valueText = used === null
          ? (limit === null ? t('unknownUsage') : `—/${formatNumber(limit)}`)
          : `${formatNumber(used)}/${limit === null ? '—' : formatNumber(limit)}`;
        const isStale = window.state === 'stale';
        const titleParts = [label, valueText];
        if (percent) titleParts.push(percent);
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
            percent ? h('span', { style: STYLE.percent }, percent) : null
          ),
          h('div', {
            style: STYLE.bar,
            role: 'progressbar',
            'aria-label': label,
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': ratio === null ? undefined : Math.round(Math.min(1, Math.max(0, ratio)) * 100),
            'aria-valuetext': percent || valueText,
          },
          h('div', {
            style: {
              height: '100%',
              width: ratio === null ? '0%' : `${Math.min(100, Math.max(0, ratio * 100))}%`,
              background: color,
              opacity: isStale ? 0.55 : 1,
              transition: 'width 200ms ease',
            },
          })
          )
        );
      }

      function keyRow(key) {
        const windows = Array.isArray(key.windows) ? key.windows : [];
        const byId = new Map(windows.map((window) => [window.id, window]));
        const limited = key.blocked === true || windows.some((window) =>
          (window.state === 'active' || window.state === 'stale')
          && typeof window.ratio === 'number'
          && window.ratio >= 1);
        const label = typeof key.label === 'string' && key.label ? key.label : key.provider;
        const keyError = key.ok === false ? errorText(key.error, key.errorDetail) : null;
        const issue = keyError || (limited ? t('limited') : null);

        return h(React.Fragment, { key: key.provider },
          h('div', {
            style: STYLE.key,
            title: [key.provider, keyError].filter(Boolean).join(' · '),
          },
          h('span', { style: STYLE.keyLabel }, label),
          key.default || key.provider === defaultProvider
            ? h('span', { style: STYLE.star, title: t('default') }, '*')
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
      const header = h('div', { style: STYLE.header },
        h('span', { style: STYLE.title }, t('title')),
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
          h('div', { style: STYLE.grid },
            h('div', { key: 'corner' }),
            WINDOW_IDS.map((id) => h(React.Fragment, { key: id }, windowLegend(id))),
            keys.map(keyRow)
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

      return h('div', {
        style: STYLE.root,
        role: 'group',
        'aria-label': t('title'),
        'data-ustc-quota-root': '',
      },
      h('style', null, CONTAINER_CSS),
      header,
      body
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ustc-quota: locale dictionaries');
        const t = ctx.locale.bind(NS);
        fallbackT = t;
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

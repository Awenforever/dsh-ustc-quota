#!/usr/bin/env node
/**
 * Render the real sidebar card component to a PNG.
 *
 * The DSH page requires its web token, so headless Edge cannot open it directly.
 * This harness loads client.js with a tiny React shim, captures the component
 * the plugin registers on 'sidebar.footer.action', renders its first frame with
 * a seeded snapshot, and writes the exact inline styles the component uses.
 *
 * It verifies what the card draws, not its async behaviour.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const out = process.argv[2] ?? 'docs/screenshots/card.png';
const shotScale = process.env.SHOT_SCALE || '2';
const onlyTheme = process.env.SHOT_ONLY || '';
const source = readFileSync('client.js', 'utf8').replace(/\r\n/g, '\n');

const storage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
};

let captured = null;
const seededPosition = process.env.SHOT_POS === 'right' ? 'right' : 'left';
globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      captured = definition;
    },
  },
  __DSH_BOOT__: { release: { version: '0.2.2-rc.3' } },
  localStorage: (() => { const s = storage(); s.setItem('dsh-ustc-quota:position', seededPosition); return s; })(),
  sessionStorage: storage(),
  location: { reload() {} },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  state: undefined,
};
globalThis.localStorage = window.localStorage;
globalThis.sessionStorage = window.sessionStorage;
globalThis.document = { baseURI: 'http://127.0.0.1/', documentElement: { style: {} } };
Object.defineProperty(globalThis, 'navigator', { value: { language: 'zh-CN' }, configurable: true });
globalThis.performance = { now: () => 0 };
globalThis.fetch = async () => {
  throw new Error('fetch disabled in screenshot harness');
};

// Evaluate the module the way DSH's client loader would.
new Function(source)();

if (!captured) throw new Error('client.js did not call __ModuleLoader__.load');

const shim = {
  createElement(type, props, ...children) {
    const merged = { ...(props || {}) };
    if (children.length === 1) merged.children = children[0];
    else if (children.length > 1) merged.children = children;
    return { type, props: merged };
  },
  useState(initial) {
    const index = this.__index++;
    if (this.__seed && Object.prototype.hasOwnProperty.call(this.__seed, index)) {
      return [this.__seed[index], () => {}];
    }
    const value = typeof initial === 'function' ? initial() : initial;
    return [value, () => {}];
  },
  useRef(value) {
    return { current: value };
  },
  useEffect() {},
  useLayoutEffect() {},
  useMemo(factory) {
    return factory();
  },
  useCallback(fn) {
    return fn;
  },
  useSyncExternalStore(_subscribe, getSnapshot) {
    return getSnapshot();
  },
  __index: 0,
  __seed: null,
};

const dictionary = { zh: {} };
let SidebarSeat = null;
const plugin = captured.factory((id) => {
  if (id === 'react') return shim;
  throw new Error('unexpected require: ' + id);
});

const ctx = {
  effect(fn) {
    if (typeof fn === 'function') fn();
  },
  locale: {
    register(_ns, dictionaries) {
      if (dictionaries && dictionaries.zh) Object.assign(dictionary.zh, dictionaries.zh);
      return () => {};
    },
    bind() {
      return (key) => dictionary.zh[key] || key;
    },
  },
  slots: {
    inject(_name, register) {
      register();
    },
    register(meta, component) {
      if (meta && meta.name === 'sidebar.footer.action') SidebarSeat = component;
      return () => {};
    },
  },
};
plugin.apply(ctx);
if (!SidebarSeat) throw new Error('sidebar seat was not registered');

const windowEntry = (id, used, limit, ratio, resetAt) => ({
  id,
  state: 'active',
  source: 'key',
  used,
  limit,
  ratio,
  resetAt,
});

const snapshot = {
  version: 1,
  generatedAt: '2026-11-15T11:00:00.000Z',
  pollAfterMs: 10000,
  source: 'config',
  warnings: [],
  defaultProvider: 'ustc-lja',
  pluginVersion: '1.1.20',
  keys: [
    {
      provider: 'ustc-wmw',
      label: 'wmw',
      default: false,
      ok: true,
      stale: false,
      fetchedAt: '2026-11-15T10:59:00.000Z',
      blocked: false,
      error: null,
      windows: [
        windowEntry('3h', 0, 30, 0, '2026-11-15T12:00:00+08:00'),
        windowEntry('12h', 9.74, 70, 0.139, '2026-11-15T12:00:00+08:00'),
        windowEntry('24h', 9.74, 100, 0.0974, '2026-11-15T12:00:00+08:00'),
      ],
    },
    {
      provider: 'ustc-wjh',
      label: 'wjh',
      default: false,
      ok: true,
      stale: false,
      fetchedAt: '2026-11-15T10:59:00.000Z',
      blocked: false,
      error: null,
      windows: [
        windowEntry('3h', 12.4, 30, 0.413, '2026-11-15T12:00:00+08:00'),
        windowEntry('12h', 35.2, 70, 0.503, '2026-11-15T12:00:00+08:00'),
        windowEntry('24h', 51.3, 100, 0.513, '2026-11-15T12:00:00+08:00'),
      ],
    },
    {
      provider: 'ustc-lja',
      label: 'lja',
      default: true,
      ok: true,
      stale: false,
      fetchedAt: '2026-11-15T10:59:00.000Z',
      blocked: false,
      error: null,
      windows: [
        windowEntry('3h', 28.6, 30, 0.953, '2026-11-15T12:00:00+08:00'),
        windowEntry('12h', 28.6, 70, 0.409, '2026-11-15T12:00:00+08:00'),
        windowEntry('24h', 28.6, 100, 0.286, '2026-11-15T12:00:00+08:00'),
      ],
    },
  ],
};

// Hook order in QuotaStrip: cardHovered, markHovered, snapshot, error, loading,
// refreshing, now, ...
const hover = process.env.SHOT_HOVER === '1';
shim.__index = 0;
shim.__seed = {
  0: hover,
  1: hover,
  2: snapshot,
  4: false,
  6: Date.parse('2026-11-15T19:30:00+08:00'),
};
const tree = SidebarSeat({ t: (key) => dictionary.zh[key] || key });

const UNITLESS = new Set([
  'fontWeight', 'opacity', 'zIndex', 'lineHeight', 'flex', 'flexGrow', 'flexShrink',
  'order', 'gridColumn', 'gridRow', 'aspectRatio', 'strokeWidth', 'strokeOpacity',
  'fillOpacity', 'tabSize', 'widows', 'orphans', 'zoom',
]);
const styleText = (style) => Object.entries(style || {})
  .filter(([, value]) => value !== null && value !== undefined && value !== '')
  .map(([key, value]) => {
    const name = key.startsWith('--') ? key : key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
    const text = typeof value === 'number' && !UNITLESS.has(key) ? value + 'px' : String(value);
    return name + ':' + text;
  })
  .join(';');

const esc = (text) => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link']);
function render(node) {
  if (node === null || node === undefined || node === false || node === true) return '';
  if (typeof node === 'string' || typeof node === 'number') return esc(node);
  if (Array.isArray(node)) return node.map(render).join('');
  if (typeof node.type === 'function') return render(node.type(node.props || {}));
  const { type, props } = node;
  const attrs = [];
  for (const [key, value] of Object.entries(props || {})) {
    if (key === 'children' || key === 'key' || value === null || value === undefined || value === false) continue;
    if (key === 'style') {
      const text = styleText(value);
      if (text) attrs.push('style="' + esc(text) + '"');
      continue;
    }
    if (key === 'className') {
      attrs.push('class="' + esc(value) + '"');
      continue;
    }
    // SVG keeps a few camelCase attributes in the DOM; everything else maps to kebab-case.
    const SVG_CAMEL = new Set(['viewBox', 'preserveAspectRatio', 'gradientUnits', 'patternUnits', 'clipPathUnits', 'startOffset', 'textLength']);
    const name = key.startsWith('aria-') || key.startsWith('data-')
      ? key
      : SVG_CAMEL.has(key) ? key : key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
    if (value === true) {
      attrs.push(name);
    } else {
      attrs.push(name + '="' + esc(value) + '"');
    }
  }
  const open = '<' + type + (attrs.length ? ' ' + attrs.join(' ') : '') + '>';
  if (VOID.has(type)) return open;
  return open + render(props && props.children) + '</' + type + '>';
}

const card = render(tree);
if (process.env.SHOT_DUMP === '1') {
  const at = card.indexOf('data-ustc-mark');
  console.log('MARKUP ' + card.slice(Math.max(0, at - 260), at + 700));
}
const fonts = '-apple-system, "Segoe UI", "Microsoft YaHei", system-ui, sans-serif';
const light = {
  '--dsw-alias-bg-base': '#ffffff',
  '--dsw-alias-bg-layer-1': '#ffffff',
  '--dsw-alias-bg-layer-2': '#f1f1f4',
  '--dsw-alias-border-l1': '#e5e5ea',
  '--dsw-alias-border-l2': '#d4d4dc',
  '--dsw-alias-label-primary': '#16161c',
  '--dsw-alias-label-secondary': '#6d6d78',
  '--dsw-alias-brand-primary': '#3b6ef5',
  '--dsw-alias-state-success-primary': '#1f9d55',
  '--dsw-alias-state-warn-primary': '#c97b00',
  '--dsw-alias-state-error-primary': '#d32f2f',
  '--dsw-alias-state-idle-primary': '#9a9aa5',
};
const dark = {
  ...light,
  '--dsw-alias-bg-base': '#17171c',
  '--dsw-alias-bg-layer-1': '#1e1e25',
  '--dsw-alias-bg-layer-2': '#2a2a33',
  '--dsw-alias-border-l1': '#33333d',
  '--dsw-alias-border-l2': '#45454f',
  '--dsw-alias-label-primary': '#f2f2f5',
  '--dsw-alias-label-secondary': '#a0a0ab',
};
const vars = (tokens) => Object.entries(tokens).map(([key, value]) => key + ':' + value + ';').join('');

const html = '<!doctype html><html><head><meta charset="utf-8"><title>ustc quota card</title><style>' +
  'body{margin:0;padding:18px;background:#f4f4f6;font-family:' + fonts + ';}' +
  '.row{display:flex;gap:18px;align-items:flex-start;}' +
  '.col{width:340px;display:flex;flex-direction:column;gap:10px;}' +
  '.cap{font:600 11px ' + fonts + ';color:#6d6d78;letter-spacing:.04em;text-transform:uppercase;}' +
  '.light{' + vars(light) + 'background:#ffffff;padding:12px;border-radius:12px;}' +
  '.dark{' + vars(dark) + 'background:#17171c;padding:12px;border-radius:12px;}' +
  '</style></head><body>' +
  (onlyTheme === 'light'
    ? '<div class="row"><div class="col"><div class="cap">light</div><div class="light">' + card + '</div></div></div>'
    : onlyTheme === 'dark'
      ? '<div class="row"><div class="col"><div class="cap">dark</div><div class="dark">' + card + '</div></div></div>'
      : '<div class="row">' +
        '<div class="col"><div class="cap">light</div><div class="light">' + card + '</div></div>' +
        '<div class="col"><div class="cap">dark</div><div class="dark">' + card + '</div></div>' +
        '</div>') +
  '</body></html>';

const zoom = 3;
const headerHtml = '<!doctype html><html><head><meta charset="utf-8"><title>ustc quota header</title><style>' +
  'body{margin:0;padding:0;background:#ffffff;font-family:' + fonts + ';}' +
  '.viewport{width:1020px;height:120px;overflow:hidden;background:#ffffff;}' +
  '.scale{transform:scale(' + zoom + ');transform-origin:top left;width:340px;}' +
  '.light{' + vars(light) + 'padding:10px 9px 8px;}' +
  '</style></head><body><div class="viewport"><div class="scale"><div class="light">' + card + '</div></div></div>' +
  '<script>window.addEventListener("load",function(){var m=document.querySelector("[data-ustc-mark]").getBoundingClientRect();var t=document.querySelector("[data-ustc-title]").getBoundingClientRect();document.title=JSON.stringify({mark:{top:m.top,bottom:m.bottom,height:m.height},title:{top:t.top,bottom:t.bottom,height:t.height}});});</script>' +
  '</body></html>';

const dir = mkdtempSync(join(tmpdir(), 'ustc-shot-'));
const page = join(dir, 'card.html');
const headerPage = join(dir, 'header.html');
writeFileSync(page, html, 'utf8');
writeFileSync(headerPage, headerHtml, 'utf8');
mkdirSync(dirname(out), { recursive: true });
const headerOut = out.replace(/\.png$/i, '-header.png');

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const shot = (url, file, size) => execFileSync(edge, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=' + shotScale,
  '--user-data-dir=' + join(dir, 'profile-' + Math.random().toString(36).slice(2)),
  '--window-size=' + size,
  '--screenshot=' + join(process.cwd(), file),
  'file:///' + url.replace(/\\/g, '/'),
], { stdio: 'ignore' });

const dom = execFileSync(edge, [
  '--headless=new', '--disable-gpu', '--user-data-dir=' + join(dir, 'profile-measure'),
  '--virtual-time-budget=2000', '--dump-dom', 'file:///' + headerPage.replace(/\\/g, '/'),
], { encoding: 'utf8' });
const measured = /<title>(.*?)<\/title>/s.exec(dom);
if (measured) console.log('metrics ' + measured[1]);
shot(page, out, onlyTheme ? '420,470' : '760,470');
shot(headerPage, headerOut, '1040,140');
console.log('wrote ' + out + ' and ' + headerOut + ' (component DOM, real inline styles)');

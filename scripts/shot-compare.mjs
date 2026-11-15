#!/usr/bin/env node
/** Actual-size comparison: our card image (rendered by shot-card.mjs) beside a Memory card built from dsh-loci's real CSS. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const ourImage = process.argv[2] ?? 'docs/screenshots/card-13px.png';
const out = process.argv[3] ?? 'docs/screenshots/compare-13px.png';
const lociSource = readFileSync('../dsh-loci/client.js', 'utf8').replace(/\r\n/g, '\n');
const bt = String.fromCharCode(96);
const cssStart = lociSource.indexOf('const CSS = ' + bt);
const cssOpen = lociSource.indexOf(bt, cssStart) + 1;
const cssClose = lociSource.indexOf('\n' + bt + ';', cssOpen);
if (cssStart < 0 || cssClose < 0) throw new Error('dsh-loci CSS not found');
const lociCss = lociSource.slice(cssOpen, cssClose);

const tokens = {
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
const vars = Object.entries(tokens).map(([k, v]) => k + ':' + v + ';').join('');
const memory = '<div class="loci-card-root" role="button" tabindex="0">' +
  '<div class="loci-card-head">' +
    '<span class="loci-card-mark" aria-hidden="true">' +
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none">' +
        '<path d="M20 4c0 9-6.5 15-16 16 0 0 .5-7 4.5-11S20 4 20 4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M5 20 14 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
      '</svg>' +
    '</span>' +
    '<span class="loci-card-title">Memory</span>' +
    '<button class="loci-card-ver" type="button">v3.0.0</button>' +
    '<span class="loci-card-meta">updated 19:00</span>' +
  '</div>' +
  '<div class="loci-card-grid">' +
    '<div class="loci-card-metric"><span class="loci-card-metric-label">VERIFIED</span><span class="loci-card-metric-value">8</span></div>' +
    '<div class="loci-card-metric"><span class="loci-card-metric-label">PENDING</span><span class="loci-card-metric-value is-warn">1</span></div>' +
    '<div class="loci-card-metric"><span class="loci-card-metric-label">DISPUTED</span><span class="loci-card-metric-value">0</span></div>' +
  '</div>' +
  '<div class="loci-card-barline"><div class="loci-card-bar"><div class="loci-card-bar-fill" style="width:10%"></div></div><span class="loci-card-bar-label">354 / 3584 B</span></div>' +
  '<div class="loci-card-foot"><span>Injected 34</span><span>Opened 12</span><span>Dead 2</span></div>' +
'</div>';

const fileUrl = 'file:///' + join(process.cwd(), ourImage).replace(/\\/g, '/');
const html = '<!doctype html><html><head><meta charset="utf-8"><style>' +
  'body{margin:0;padding:16px;background:#f4f4f6;font-family:-apple-system,"Segoe UI",sans-serif;}' +
  '.row{display:flex;gap:20px;align-items:flex-start;}' +
  '.cap{font:600 10px -apple-system,"Segoe UI",sans-serif;color:#6d6d78;letter-spacing:.05em;text-transform:uppercase;margin:0 0 6px;}' +
  '.ours img{display:block;width:420px;height:auto;}' +
  '.mem{width:340px;padding:10px 9px 8px;background:#fff;border:1px solid #e5e5ea;border-radius:12px;' + vars + '}' +
  lociCss +
  '</style></head><body><div class="row">' +
  '<div class="ours"><div class="cap">USTC quota · 1x · icon 13px</div><img src="' + fileUrl + '"></div>' +
  '<div><div class="cap">dsh-loci Memory · 1x · icon 13px</div><div class="mem">' + memory + '</div></div>' +
  '</div></body></html>';

const dir = mkdtempSync(join(tmpdir(), 'ustc-compare-'));
const page = join(dir, 'compare.html');
writeFileSync(page, html, 'utf8');
mkdirSync(dirname(out), { recursive: true });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
execFileSync(edge, ['--headless=new','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--user-data-dir=' + join(dir, 'profile'),'--window-size=900,560','--screenshot=' + join(process.cwd(), out),'file:///' + page.replace(/\\/g, '/')], { stdio: 'ignore' });
console.log('wrote ' + out + ' (1 CSS px = 1 image px)');
/* =============================================================================
 * V3 CSP P0 — response-header alignment verification
 *
 * STATIC : validates vercel.json structure/order and the exact CSP values,
 *          plus alignment with the V3 meta CSP. Always runs.
 * LIVE   : fetches actual deployed responses and asserts the effective
 *          headers, including that each route carries EXACTLY ONE
 *          Content-Security-Policy header.
 *
 * Run:
 *   node verify/csp_p0_headers.js                      (static only)
 *   CSP_P0_BASE=https://<preview-host> node verify/csp_p0_headers.js
 *
 * Exit codes: 0 = static + live PASS · 3 = static PASS, live not run/unreachable
 *             1 = any FAIL
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const APPROVED_FRAME_SRC = 'https://www.youtube-nocookie.com https://player.vimeo.com';
const results = [];
let liveState = 'not-run';

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function directives(csp) {
  const map = {};
  String(csp || '').split(';').forEach((part) => {
    const token = part.trim();
    if (!token) return;
    const space = token.indexOf(' ');
    if (space === -1) map[token] = '';
    else map[token.slice(0, space)] = token.slice(space + 1).trim();
  });
  return map;
}

/* ------------------------------------------------------------------ static */

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const headerRules = vercel.headers || [];
const globalIndex = headerRules.findIndex((rule) => rule.source === '/(.*)');
const v3Index = headerRules.findIndex((rule) => rule.source === '/v3-prototype/(.*)');
const cspOf = (rule) => (rule.headers || [])
  .filter((h) => h.key.toLowerCase() === 'content-security-policy')
  .map((h) => h.value);

check('vercel.json has global and V3 header rules', globalIndex !== -1 && v3Index !== -1);
check('V3 rule comes after the global rule (same-key override order)', v3Index > globalIndex,
  `global=${globalIndex} v3=${v3Index}`);

const globalCsp = cspOf(headerRules[globalIndex] || {});
const v3Csp = cspOf(headerRules[v3Index] || {});
check('each rule declares exactly one CSP value', globalCsp.length === 1 && v3Csp.length === 1);

const g = directives(globalCsp[0]);
const v = directives(v3Csp[0]);
check("root CSP keeps frame-src 'none'", g['frame-src'] === "'none'");
check("root CSP keeps frame-ancestors 'none'", g['frame-ancestors'] === "'none'");
check('V3 CSP frame-src is exactly the two approved providers',
  v['frame-src'] === APPROVED_FRAME_SRC, v['frame-src']);
check("V3 CSP keeps frame-ancestors 'none'", v['frame-ancestors'] === "'none'");
check('V3 CSP has no wildcard/https:/generic frame permissions',
  !/(\*|\bhttps:\s|youtube\.com|vimeo\.com\/(?!$))/.test(' ' + v['frame-src'] + ' ') &&
  !v['frame-src'].split(' ').some((s) => !['https://www.youtube-nocookie.com', 'https://player.vimeo.com'].includes(s)));

const metaMatch = fs.readFileSync(path.join(ROOT, 'v3-prototype', 'index.html'), 'utf8')
  .match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/i);
const m = directives(metaMatch && metaMatch[1]);
check('V3 meta CSP frame-src matches the response CSP', m['frame-src'] === APPROVED_FRAME_SRC);
['default-src', 'script-src', 'style-src', 'img-src', 'font-src', 'connect-src',
  'worker-src', 'object-src', 'base-uri', 'form-action'].forEach((key) => {
  check(`V3 response CSP does not widen meta ${key}`, v[key] === m[key], `${v[key]} vs ${m[key]}`);
});

const globalOther = (headerRules[globalIndex].headers || []).map((h) => h.key);
check('global rule still carries the non-CSP security headers',
  ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy',
    'Strict-Transport-Security'].every((key) => globalOther.includes(key)));
check('V3 rule sets only the CSP header (others inherited from global)',
  (headerRules[v3Index].headers || []).length === 1);

/* -------------------------------------------------------------------- live */

function fetchHeaders(url) {
  const args = ['-sSI', '--max-time', '25', url];
  if (process.env.CURL_CA_BUNDLE) args.unshift('--cacert', process.env.CURL_CA_BUNDLE);
  const run = cp.spawnSync('curl', args, { encoding: 'utf8' });
  if (run.status !== 0) return { error: (run.stderr || 'curl failed').trim() };
  const lines = run.stdout.split(/\r?\n/);
  const headers = [];
  lines.forEach((line) => {
    const idx = line.indexOf(':');
    if (idx > 0) headers.push([line.slice(0, idx).trim().toLowerCase(), line.slice(idx + 1).trim()]);
  });
  return { status: lines[0], headers };
}

function liveCheck(base) {
  const v3 = fetchHeaders(base.replace(/\/$/, '') + '/v3-prototype/');
  const root = fetchHeaders(base.replace(/\/$/, '') + '/');
  const legal = fetchHeaders(base.replace(/\/$/, '') + '/privacy.html');
  if (v3.error || root.error) {
    liveState = 'unreachable';
    console.log(`LIVE  UNREACHABLE from this network — ${v3.error || root.error}`);
    console.log('LIVE  deployed-header evidence still required (rerun with network access).');
    return;
  }
  liveState = 'ran';
  const cspsOf = (res) => res.headers.filter(([k]) => k === 'content-security-policy').map(([, val]) => val);
  const v3Csps = cspsOf(v3);
  const rootCsps = cspsOf(root);
  check('LIVE V3 response has exactly one CSP header', v3Csps.length === 1, `count=${v3Csps.length}`);
  check('LIVE root response has exactly one CSP header', rootCsps.length === 1, `count=${rootCsps.length}`);
  const lv = directives(v3Csps[0]);
  const lr = directives(rootCsps[0]);
  check('LIVE V3 frame-src allows exactly YouTube-nocookie + Vimeo player',
    lv['frame-src'] === APPROVED_FRAME_SRC, lv['frame-src']);
  check('LIVE V3 blocks arbitrary third-party frame origins',
    !String(lv['frame-src']).split(' ').includes('https://example.com') &&
    !/['"]?\*|https:(\s|$)/.test(lv['frame-src']));
  check("LIVE V3 frame-ancestors remains 'none'", lv['frame-ancestors'] === "'none'");
  check("LIVE root frame-src remains 'none'", lr['frame-src'] === "'none'", lr['frame-src']);
  const has = (res, key, val) => res.headers.some(([k, hv]) => k === key && (!val || hv.includes(val)));
  check('LIVE V3 keeps X-Frame-Options DENY', has(v3, 'x-frame-options', 'DENY'));
  check('LIVE V3 keeps nosniff/HSTS/Referrer/Permissions',
    has(v3, 'x-content-type-options', 'nosniff') && has(v3, 'strict-transport-security') &&
    has(v3, 'referrer-policy') && has(v3, 'permissions-policy'));
  check('LIVE root keeps X-Frame-Options DENY + nosniff', has(root, 'x-frame-options', 'DENY') &&
    has(root, 'x-content-type-options', 'nosniff'));
  if (!legal.error) {
    const legalCsps = cspsOf(legal);
    check('LIVE non-V3 route (/privacy.html) keeps one global CSP with frame-src none',
      legalCsps.length === 1 && directives(legalCsps[0])['frame-src'] === "'none'");
  }
}

const base = process.env.CSP_P0_BASE;
if (base) liveCheck(base);
else console.log('LIVE  skipped — set CSP_P0_BASE=https://<deployment-host> to verify deployed headers.');

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS` +
  (liveState !== 'ran' ? '  (LIVE not verified)' : ''));
process.exit(failed.length ? 1 : (liveState === 'ran' ? 0 : 3));

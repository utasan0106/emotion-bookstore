#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'v3-prototype');
const START = 'a82375f8895a88e4f6b0b4f669bfcecebebe82dc';
const EXPECTED_BRANCH = 'codex/v3-founder-review-ux-fix-20260824';
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const git = (args) => cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const atStart = (rel) => cp.execFileSync('git', ['show', `${START}:v3-prototype/${rel}`], { cwd: ROOT });
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const index = read('index.html');
const app = read('js/app.js');
const css = read('css/v3.css');
const registry = read('js/real_experience_registry.js');
const matching = read('js/cultural_matching.js');
const privacy = read('privacy.html');
const terms = read('terms.html');
const cueSource = read('js/entrance_cue_store.js');
const calendarSource = read('js/calendar_action.js');
const store = fs.readFileSync(path.join(SRC, 'js/store.js'));
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

check('exact bounded non-main branch', git(['branch', '--show-current']) === EXPECTED_BRANCH);
check('Accepted End HEAD is ancestor of work', (() => {
  try { cp.execFileSync('git', ['merge-base', '--is-ancestor', START, 'HEAD'], { cwd: ROOT }); return true; }
  catch (error) { return false; }
})());
check('Interested core store is byte-identical to Accepted End', store.equals(atStart('js/store.js')));

check('Mobile CTA and support copy exact', app.includes("text: 'はじめる'") &&
  app.includes("text: '感情から、次に触れるものを見つけられます。'") &&
  !app.includes("class: 'cta-sub', text: '感情の棚を選ぶ'"));
check('Desktop headline and subcopy exact', ['感情の先に、', '世界がある', '本、映画、音楽、体験。',
  '8つの感情から新たな出会いを。'].every((text) => app.includes(`text: '${text}'`)));
check('Lower Step 1/2 exact', app.includes("desktopTitle: '入口を選ぶ', desktopNote: ['8つの感情の棚から一つ選びます。']") &&
  app.includes("desktopTitle: '寄り道に出会う', desktopNote: ['本、映画、音楽、体験に出会えます。']"));
check('No-emotion route remains reachable from MENU', index.includes('data-nav="no-emotion"') &&
  app.includes("document.querySelectorAll('[data-nav=\"no-emotion\"]')") && app.includes('enterNoEmotion();'));

check('Public Editorial wording uses service subject', app.includes('感情書店の編集基準に基づき、理由を説明できるものだけを選んでいます。') &&
  terms.includes('感情書店の編集基準と確認済みの実在Experience Registryに基づき') &&
  !/人が定めた編集基準|人が決めた編集基準|人が承認した編集基準/.test(index + app + terms));
check('Area display label corrected without value change', app.includes("['tokyo-wide', '東京都内（23区外）']") &&
  matching.includes("'tokyo-wide': '東京都内（23区外）'") && matching.includes("'tokyo-wide'"));
check('Mobile Shelf Detail has in-service back label', app.includes("backLabel: '感情の棚へ戻る'") &&
  css.includes('body:has(.understanding-bridge) .stepbar-back-label'));
check('Mobile Shelf Detail typography bounded', css.includes('.understanding-shelf-identity .display') &&
  css.includes('font-size: 20px') && css.includes('line-height: 1.45'));

check('Image type overlay is absent from rendered DOM', !app.includes("class: 'real-experience-category-label'"));
check('Type remains available in text truth', app.includes('asset.categoryLabel') &&
  (app.includes("class: 'card-meta'") || app.includes("class: 'interested-item-type'")));
check('Interested labels are concise and text-perceivable',
  app.includes("return isInterested(id) ? '保存済み' : '気になる'"));
check('Saved state uses semantic pressed state and red visual token',
  app.includes("'aria-pressed': isInterested") && css.includes('--interest-red: #c8323e'));
check('Saved retrieval is reachable from MENU and Discovery', index.includes('data-nav="interested"') &&
  app.includes("text: '保存済みを見る'") && app.includes("text: '詳しく見る'") &&
  app.includes("text: '保存を解除'"));
check('Saved retrieval has truthful empty state', app.includes('保存済みのものは、まだありません。'));

const cueStorage = new Map();
const cueWindow = {
  localStorage: {
    getItem(key) { return cueStorage.has(key) ? cueStorage.get(key) : null; },
    setItem(key, value) { cueStorage.set(key, value); },
    removeItem(key) { cueStorage.delete(key); }
  }
};
cueStorage.set('v3-interested-entrance-cue-v1', JSON.stringify({
  version: 1, experienceId: 'EXP_007', savedAt: '2026-08-23T01:02:03.000Z', shownAt: '2026-08-23T01:03:03.000Z'
}));
vm.runInNewContext(cueSource, { window: cueWindow, Date, JSON, Object, Array, RegExp, isNaN }, { filename: 'entrance_cue_store.js' });
const savedAt = '2026-08-24T01:02:03.000Z';
const initialCue = cueWindow.V3_ENTRANCE_CUE_STORE.load();
cueWindow.V3_ENTRANCE_CUE_STORE.acknowledge(savedAt);
const cuePayload = JSON.parse(cueStorage.get('entrance-cue-ack-v1'));
check('Entrance cue uses approved standalone local key', cueWindow.V3_ENTRANCE_CUE_STORE.KEY === 'entrance-cue-ack-v1');
check('Entrance cue safely discards the retired marker without migration',
  !cueStorage.has('v3-interested-entrance-cue-v1') && initialCue.acknowledgedSavedAt === null);
check('Entrance cue payload is exactly the approved minimum contract',
  JSON.stringify(Object.keys(cuePayload).sort()) === JSON.stringify(['acknowledgedSavedAt', 'version']) &&
  cuePayload.version === 1 && cuePayload.acknowledgedSavedAt === savedAt);
check('Entrance cue carries no private/content/network field',
  !/(experienceId|shownAt|title|description|reason|note|content|url|address|emotion|user|private)/i.test(JSON.stringify(cuePayload)) &&
  !/fetch|XMLHttpRequest|sendBeacon|WebSocket/.test(cueSource));
check('Entrance cue is latest-one and once-per-new-save', app.includes('function prepareEntranceCue') &&
  cueWindow.V3_ENTRANCE_CUE_STORE.shouldShow(savedAt, initialCue) &&
  !cueWindow.V3_ENTRANCE_CUE_STORE.shouldShow(savedAt, cuePayload) &&
  cueWindow.V3_ENTRANCE_CUE_STORE.shouldShow('2026-08-24T01:02:04.000Z', cuePayload) &&
  app.includes('ENTRANCE_CUE_STORE.shouldShow(latest.savedAt, entranceCueMarker)') &&
  app.includes('ENTRANCE_CUE_STORE.acknowledge(entranceCueItem.savedAt)'));

const opened = [];
const calendarWindow = {
  URLSearchParams,
  open(url, target, features) { opened.push({ url, target, features }); return { opener: 'parent' }; }
};
vm.runInNewContext(calendarSource, { window: calendarWindow, Date, Object, RegExp, Number, String, isNaN }, { filename: 'calendar_action.js' });
const calendarUrl = calendarWindow.V3_CALENDAR_ACTION.buildUrl({
  title: '公開体験',
  placeDetail: { officialSummary: '公開されている説明' },
  actionDestination: { url: 'https://example.com/official' },
  physicalDestination: { approved: true, address: '東京都新宿区' }
}, { when: 'datetime', date: '2026-08-25', time: '10:30' });
check('Google Calendar event URL is built locally', calendarUrl.startsWith('https://calendar.google.com/calendar/render?') &&
  calendarUrl.includes('action=TEMPLATE') && calendarUrl.includes('dates=20260825T103000%2F20260825T113000'));
check('Calendar module causes no request/open before explicit call', opened.length === 0 &&
  !/fetch|XMLHttpRequest|sendBeacon|new\s+Image/.test(calendarSource));
calendarWindow.V3_CALENDAR_ACTION.open({ title: '公開体験' }, { when: 'today' });
check('Calendar explicit action opens a new noopener window', opened.length === 1 && opened[0].target === '_blank' &&
  opened[0].features === 'noopener,noreferrer');
check('Plan success copy is positive and not called sync', app.includes('この端末に予定を保存しました。日時はあとから変更できます。') &&
  app.includes('Googleカレンダーに追加') && !app.includes('外部カレンダーとは同期していません。'));
check('Privacy and Terms disclose the bounded Calendar action',
  privacy.includes('Google Calendar（<code>calendar.google.com</code>）') &&
  privacy.includes('本文などの非公開記録は送りません') &&
  terms.includes('同期やアカウント接続は行いません'));
check('Privacy and Terms disclose the standalone local marker',
  [privacy, terms].every((page) =>
    page.includes('最後に表示済みとした保存時刻のみをlocalStorageへ保存します') &&
    page.includes('2026年8月24日版')));

const preloadCount = (index.match(/rel="preload" as="image"/g) || []).length;
const heroBytes = fs.statSync(path.join(SRC, 'assets/canonical-m01-w01/m01_hero.webp')).size;
const detailBytes = fs.statSync(path.join(SRC, 'assets/real-experience/EXP_007_shinjuku_gyoen_official_landscape-1440.webp')).size;
const fontBytes = fs.readdirSync(path.join(SRC, 'assets/fonts/subset'))
  .reduce((sum, name) => sum + fs.statSync(path.join(SRC, 'assets/fonts/subset', name)).size, 0);
check('Only responsive LCP hero variants are preloaded', preloadCount === 2 &&
  index.includes('m01_hero.webp') && index.includes('w01_hero.webp'));
check('Hero and approved Detail visual have bounded transfer bytes', heroBytes < 100000 && detailBytes < 400000,
  `hero=${heroBytes} detail=${detailBytes}`);
check('Self-hosted Japanese font subset total is bounded', fontBytes < 1000000, `fonts=${fontBytes}`);
check('Below-fold and shelf collection images are lazy', app.includes("width: '200', height: '212', loading: 'lazy', decoding: 'async'") &&
  app.includes("width: '135', height: '145', loading: 'lazy', decoding: 'async'"));
check('LCP hero has dimensions, eager decode hint and high priority', app.includes("width: '941', height: '680', loading: 'eager', decoding: 'async'") &&
  app.includes("fetchpriority: 'high'"));
check('Vercel asset cache policy is explicit', vercel.headers.some((entry) =>
  entry.source === '/v3-prototype/assets/(.*)' && entry.headers.some((header) =>
    header.key === 'Cache-Control' && /s-maxage=31536000/.test(header.value))));

check('Registry delta is visual-path only for EXP_007', (() => {
  const before = atStart('js/real_experience_registry.js').toString();
  return before.replace('EXP_007_shinjuku_gyoen_official_landscape.jpg', 'EXP_007_shinjuku_gyoen_official_landscape-1440.webp') === registry;
})());
check('No content mount or video activation', !/records:\s*Object\.freeze\(\[\s*\{/.test(read('js/public_editorial_content.js')) &&
  !/autoplay=1/.test(index + app));

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);

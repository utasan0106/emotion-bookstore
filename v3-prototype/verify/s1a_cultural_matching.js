#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const BASELINE = 'eca334f9671bee07833892b2476aac118f8ed018';
const EXPECTED_BRANCH = 'codex/v3-cultural-matching-s1a-20260824';
const app = fs.readFileSync(path.join(ROOT, 'v3-prototype/js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'v3-prototype/css/v3.css'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'v3-prototype/index.html'), 'utf8');
let passed = 0;
let failed = 0;

function git(args, options) {
  return cp.execFileSync('git', args, Object.assign({ cwd: ROOT, encoding: 'utf8' }, options)).trim();
}

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log('PASS  ' + name + (detail ? ' — ' + detail : ''));
  } else {
    failed += 1;
    console.log('FAIL  ' + name + (detail ? ' — ' + detail : ''));
  }
}

function block(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  return from >= 0 && to > from ? source.slice(from, to) : '';
}

function atBaseline(file) {
  return cp.execFileSync('git', ['show', BASELINE + ':' + file], { cwd: ROOT });
}

check('exact S1A branch', git(['branch', '--show-current']) === EXPECTED_BRANCH,
  git(['branch', '--show-current']));
let baselineAncestor = true;
try { cp.execFileSync('git', ['merge-base', '--is-ancestor', BASELINE, 'HEAD'], { cwd: ROOT }); }
catch (error) { baselineAncestor = false; }
check('V3_RELEASE_BASELINE is an ancestor of HEAD', baselineAncestor, BASELINE);

const protectedFiles = [
  'vercel.json',
  'v3-prototype/privacy.html',
  'v3-prototype/terms.html',
  'v3-prototype/js/action_destination.js',
  'v3-prototype/js/analytics.js',
  'v3-prototype/js/data.js',
  'v3-prototype/js/interested_retrieval.js',
  'v3-prototype/js/personalize.js',
  'v3-prototype/js/public_editorial.js',
  'v3-prototype/js/public_editorial_content.js',
  'v3-prototype/js/real_experience_registry.js',
  'v3-prototype/js/store.js'
];
protectedFiles.forEach((file) => {
  check('protected baseline byte-identical: ' + file,
    fs.readFileSync(path.join(ROOT, file)).equals(atBaseline(file)));
});

const baselineScripts = atBaseline('v3-prototype/index.html').toString('utf8')
  .match(/<script\s+src="[^"]+"/g) || [];
const currentScripts = index.match(/<script\s+src="[^"]+"/g) || [];
check('first-paint script set unchanged', JSON.stringify(currentScripts) === JSON.stringify(baselineScripts));
check('Product connect-src remains none', /connect-src 'none'/.test(index));

const jsonLdMatch = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const cspHash = jsonLdMatch
  ? crypto.createHash('sha256').update(jsonLdMatch[1]).digest('base64') : '';
check('JSON-LD exact CSP hash present', index.includes("'sha256-" + cspHash + "'"), cspHash);

check('deck contract distinguishes malformed, empty and ready',
  app.includes("return 'error';") && app.includes("return deck.ids.length === 0 ? 'empty' : 'ready';"));
check('finite contract is capped at three', app.includes('deck.ids.length > 3'));
check('duplicate IDs fail closed instead of creating fake depth',
  app.includes('deck.ids.indexOf(id) !== index'));
check('loading, load error, registry error and zero are distinct',
  app.includes("section(isError ? '00-load-error' : '00-loading'") &&
  app.includes("'data-deck-state': 'error'") && app.includes("'data-deck-count': '0'"));
check('incomplete Registry records fail closed before a deck CTA is shown',
  app.includes("if (deckState === 'ready' && !realDeck.ids.every") &&
  app.includes("return Boolean(approvedOutingById(id));"));

const discovery = block(app, 'function surfaceLegacyDiscovery', 'function discoveryAsset');
const navigation = block(app, 'function navigateDeck', 'function completeDeck');
const interested = block(app, 'function toggleInterested', '/* ------------------------------------------------------------ deck helper */');
check('public card has no pass/reject control',
  discovery && !discovery.includes('今回は違う') && !discovery.includes('real-discovery-pass'));
check('swipe only navigates the finite deck',
  discovery.includes('function () { navigateDeck(1, false); }') &&
  discovery.includes('function () { navigateDeck(-1, false); }') &&
  !discovery.includes('decideWithInterest') && !discovery.includes('decide('));
check('touch swipe preserves vertical page scrolling', css.includes('touch-action: pan-y'));
check('Previous and Next are explicit equivalents',
  discovery.includes("'data-deck-navigation': 'previous'") &&
  discovery.includes("'data-deck-navigation': 'next'"));
check('final object ends with a truthful completion action',
  discovery.includes("'data-deck-navigation': 'finish'") && discovery.includes("text: '棚を見終える'"));
check('navigation writes no durable/product preference state',
  navigation && !/persist|saveInterested|removeInterested|decisions|activeId|emit|measure/.test(navigation));
check('deck navigation stops active media before replacing the object',
  navigation.includes('stopActiveMedia();') && navigation.indexOf('stopActiveMedia();') < navigation.indexOf('state.deck.index = nextIndex;'));
check('Interested changes only through an explicit durable toggle',
  interested.includes('STORE.removeInterested(id)') && interested.includes('STORE.saveInterested(id)') &&
  interested.includes('result.ok !== true'));
check('Detail opening does not persist a preference',
  discovery.includes("go('detail');") && !block(discovery, "class: 'btn btn-line real-discovery-detail'", "class: 'btn btn-text real-discovery-interest'").includes('persist'));
check('Arrow keys share finite navigation and ignore interactive/media controls',
  app.includes("'ArrowLeft'") && app.includes("'ArrowRight'") &&
  app.includes('input, textarea, select, [contenteditable="true"], audio, video, iframe, [role="slider"]'));
check('leaving a surface stops local and embedded media',
  app.includes("view.querySelectorAll('audio, video')") && app.includes("frame.src = 'about:blank'"));

const lenses = {
  hajimu: 'この棚では、歩き出す、手を伸ばす、次を探す。そんなふうに、身体や視線が前へ動く場面に注目しています。',
  atatamaru: 'この棚では、世話をする、声をかける、何かを手渡す。そんな小さなやりとりから、人とのつながりが育っていく場面に注目しています。',
  hikareru: 'この棚では、形、細部、素材、音、動き。理由を言葉にする前に、まず目や耳が引かれるところに注目しています。',
  shizumu: 'この棚では、失われたもの、重ねられた時間、静かな場所。すぐに答えを出さず、その重さのそばに留まれるものに注目しています。',
  zawatsuku: 'この棚では、いつもの風景や習慣に、見慣れない一面が現れる。そんな、ものの見方が少し揺れる場面に注目しています。',
  butsukaru: 'この棚では、異なる考え方、素材、方法が出会う。そこで生まれる摩擦から、それぞれの違いが見えてくる場面に注目しています。',
  miwohiku: 'この棚では、少し離れる、いったん手を止める、関わらない。距離を取ることで初めて見えるものに注目しています。',
  mada: 'この棚では、形や意味が一つに決まらず、いくつもの見方が残るものに注目しています。まだ言葉にできなくても、そのまま見比べられる棚です。'
};
Object.entries(lenses).forEach(([id, copy]) => check('approved shelf lens: ' + id, app.includes(id + ": '" + copy + "'")));
check('public editorial voice names 感情書店の編集部',
  app.includes('感情書店の編集部が、理由を説明できるものだけを選んでいます。') &&
  app.includes('感情書店の編集部が、理由を説明できるものだけを置きます。'));
check('superseded vague editorial voice removed from Product page',
  !app.includes('人が定めた編集基準') && !index.includes('人が承認した編集基準'));

const informationContract = block(app, 'function experienceInformationContract', 'function experienceCard');
[
  'identity', 'officialGrounding', 'editorialWhy', 'practicalTruth', 'primaryAction',
  'media', 'freshness', 'rightsProvenance', 'contextFit', 'accessibilityLanguage'
].forEach((key) => check('shared renderer contract field: ' + key, informationContract.includes(key)));
check('unverified real media remains a truthful category fallback',
  app.includes('カテゴリ図版（実画像の表示権利を確認中）'));

check('cool-neutral Cultural surface token present', css.includes('--cultural-surface: #f1f4f5'));
check('white/near-white reading surface token present', css.includes('--reading-surface: #fffefa'));
check('official action remains Deep Navy dominant',
  css.includes('.real-discovery-actions .real-discovery-primary') && css.includes('background: var(--navy)'));
check('finite deck motion is bounded to 240ms',
  css.includes('animation: s1a-deck-next-in 240ms') && css.includes('animation: s1a-deck-previous-in 240ms'));
check('reduced motion uses opacity-only 120ms path',
  css.includes('animation: s1a-deck-fade-in 120ms') &&
  !block(css, '@keyframes s1a-deck-fade-in', '.deck-enter-next').includes('transform'));
check('navigation controls retain >=44px target',
  /\.deck-navigation \.btn\s*\{[\s\S]*?min-height:\s*48px/.test(css));
check('mobile density override exists', css.includes('@media (max-width: 599px)'));
check('desktop Detail practical panels use two columns',
  css.includes('.place-detail > .place-detail-content') && css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));

check('S1B context collection is not introduced',
  !/contextInput|userContext|ageBand|companionType|visitWindow|dailyLineup/i.test(app));
check('no geolocation, external AI, login or cloud sync primitive introduced',
  !/navigator\.geolocation|api\.openai\.com|api\.anthropic\.com|signIn\s*\(|logIn\s*\(|cloudSync\s*\(/.test(app));

console.log('\n' + passed + '/' + (passed + failed) + ' PASS');
process.exitCode = failed ? 1 : 0;

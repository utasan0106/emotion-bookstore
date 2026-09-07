'use strict';
// Host-state checks only. This is not a browser, CSS or audio playback test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const room = path.join(root, 'experiments/culture-room-r1');
const html = fs.readFileSync(path.join(room, 'index.html'), 'utf8');
let focused;
class Element extends EventTarget {
  constructor(id) { super(); this.id = id; this.hidden = false; this.children = []; this.dataset = {}; this.attrs = {}; }
  get childElementCount() { return this.children.length; }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attrs[name] = value; }
  focus() { focused = this; }
  click() { this.dispatchEvent(new Event('click')); }
}
const ids = ['recording-choices', 'player', 'consent', 'load-player', 'close-player', 'player-status', 'recording-kind', 'artist', 'recording-note', 'official-track'];
const elements = Object.fromEntries(ids.map(id => [id, new Element(id)]));
elements['close-player'].hidden = true;
const choices = ['shelter', 'sunset'].map(key => { const e = new Element(key); e.dataset.recording = key; return e; });
const win = new EventTarget();
win.location={href:'https://example.test/?recording=sunset'};
win.history={replaceState:(_,__,url)=>{win.location.href=String(url);}};
const exit=new Element('exit');exit.getAttribute=()=> 'https://boris.bandcamp.com/track/time-to-go-2';
const document = {
  getElementById: id => { assert.ok(elements[id], `known element ${id}`); return elements[id]; },
  querySelectorAll: selector => { if(selector==='a[href]') return [exit]; assert.equal(selector, '[data-recording]'); return choices; },
  createElement: tag => { assert.equal(tag, 'iframe'); return new Element(tag); }
};
vm.runInNewContext(fs.readFileSync(path.join(room, 'room.js'), 'utf8'), {document, window:win, URL});
let checks = 0;
const check = (name, action) => { action(); checks++; console.log(`PASS ${name}`); };
const player = elements.player;
check('direct solo link selects without opening media',()=>assert.match(elements.artist.textContent,/栗原/));
check('noJS has both official exits and hidden controls',()=>{assert.match(html,/id="recording-choices"[^>]*hidden/);assert.match(html,/<noscript>[\s\S]*pedalrecords.bandcamp.com/);});
check('controls enabled after initialization',()=>assert.equal(elements['recording-choices'].hidden,false));
check('initial load creates no external media', () => assert.equal(player.childElementCount, 0));
choices[1].click();
check('selection before consent creates no iframe', () => assert.equal(player.childElementCount, 0));
check('solo selection names the work, not a recording location', () => assert.match(elements['recording-kind'].textContent, /ソロ盤/));
check('solo exact official track', () => assert.equal(elements['official-track'].href, 'https://pedalrecords.bandcamp.com/track/time-to-go'));
elements['load-player'].click();
check('explicit load creates exactly one official solo iframe', () => {
  assert.equal(player.childElementCount, 1);
  assert.equal(new URL(player.children[0].src).hostname, 'bandcamp.com');
  assert.match(player.children[0].src, /track=1718126851/);
});
check('no autoplay grant and no referrer', () => {
  assert.equal(player.children[0].allow, undefined);
  assert.equal(player.children[0].referrerPolicy, 'no-referrer');
  assert.equal(new URL(player.children[0].src).searchParams.has('autoplay'), false);
});
check('loading does not claim audio is playing', () => assert.doesNotMatch(elements['player-status'].textContent, /再生中|聴きました|完了/));
check('hidden trigger hands focus to stop control', () => assert.equal(focused, elements['close-player']));
const firstFrame = player.children[0];
elements['load-player'].click();
check('repeated load never stacks players', () => assert.equal(player.children[0], firstFrame));
choices[0].click();
check('switch destroys previous player and requires a new explicit load', () => {
  assert.equal(player.childElementCount, 0);
  assert.equal(elements.consent.hidden, false);
  assert.equal(elements['close-player'].hidden, true);
});
check('selected buttons report correct state', () => {
  assert.equal(choices[0].attrs['aria-pressed'], 'true');
  assert.equal(choices[1].attrs['aria-pressed'], 'false');
});
elements['load-player'].click();
check('SHELTER uses correct recording, not the similarly named UFO Club one', () => {
  assert.match(player.children[0].src, /track=2437633909/);
  assert.equal(elements['official-track'].href, 'https://boris.bandcamp.com/track/time-to-go-2');
});
choices[0].click();
check('reselecting active choice leaves player intact', () => assert.equal(player.childElementCount, 1));
elements['close-player'].click();
check('stop removes iframe and restores usable focus', () => {
  assert.equal(player.childElementCount, 0);
  assert.equal(focused, elements['load-player']);
});
elements['load-player'].click(); win.dispatchEvent(new Event('pagehide'));
check('pagehide prevents stale player surviving back navigation', () => assert.equal(player.childElementCount, 0));
check('no initial iframe, external image, analytics or preload in document', () => {
  assert.doesNotMatch(html, /<iframe|<img[^>]+src="https?:|preconnect|rel="preload"|analytics-v3|googletagmanager/i);
  assert.match(html, /connect-src 'none'/);
});
check('finite controls, photo timestamp, privacy and official fallback exist', () => {
  assert.equal((html.match(/data-recording=/g) || []).length, 2);
  for (const text of ['2022年9月25日', '2007年の公演写真ではありません', 'Cookie', '公式の曲ページで聴く', '今回のふたつは、ここまで。']) assert.ok(html.includes(text), text);
});
check('prototype remains excluded from Vercel delivery', () => assert.match(fs.readFileSync(path.join(root, '.vercelignore'), 'utf8'), /^\/experiments\/$/m));
check('reality return uses the existing exact shelf query contract', () => assert.ok(html.includes('href="../../shelf.html?shelf=shimokitazawa"')));
elements['load-player'].click();exit.click();
check('official exit destroys player',()=>assert.equal(player.childElementCount,0));
elements['load-player'].click();win.dispatchEvent(Object.assign(new Event('securitypolicyviolation'),{disposition:'enforce',effectiveDirective:'frame-src',blockedURI:'https://bandcamp.com/EmbeddedPlayer/'}));
check('blocked frame returns to official fallback',()=>{assert.equal(player.childElementCount,0);assert.match(elements['player-status'].textContent,/ブロック/);});
check('selection updates bookmark',()=>assert.equal(new URL(win.location.href).searchParams.get('recording'),'shelter'));
console.log(`CULTURE_ROOM_HOST_CONTRACT_GO (${checks}/${checks}); browser, audio, network and visual QA remain separate`);

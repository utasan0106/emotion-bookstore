'use strict';
// Execute the unchanged public video loader together with its experimental host.
// Minimal DOM test double: not a browser, layout, networking or playback test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'experiments/parks-screen-r1');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
let focus;
class Element extends EventTarget {
  constructor(tag, attrs = {}) { super(); this.tag = tag; this.attrs = {...attrs}; this.children = []; this.hidden = 'hidden' in attrs; }
  getAttribute(key) { return this.attrs[key] ?? null; }
  setAttribute(key, value) { this.attrs[key] = value; }
  removeAttribute(key) { delete this.attrs[key]; }
  matches(selector) {
    if (selector[0] === '.') return (this.attrs.class || '').split(' ').includes(selector.slice(1));
    if (selector[0] === '[') return selector.slice(1, -1) in this.attrs;
    return this.tag === selector;
  }
  querySelectorAll(selector) { return this.children.flatMap(e => [...(e.matches(selector) ? [e] : []), ...e.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  appendChild(child) { child.parent = this; this.children.push(child); return child; }
  replaceChildren(...children) { this.children.forEach(c => { c.parent = null; }); this.children = []; children.forEach(c => this.appendChild(c)); }
  set textContent(value) { this.replaceChildren(); this.text = value; }
  get textContent() { return this.text || ''; }
  cloneNode(deep) { const copy = new Element(this.tag, this.attrs); copy.hidden = this.hidden; if (deep) this.children.forEach(c => copy.appendChild(c.cloneNode(true))); return copy; }
  get isConnected() { let node = this; while (node.parent) node = node.parent; return node.tag === 'document'; }
  focus() { focus = this; }
  click() { const ancestors = []; for (let node = this; node; node = node.parent) ancestors.push(node); ancestors.forEach(n => n.dispatchEvent(new Event('click'))); }
}
function setup(withPublicLoader = true, scene = 'film') {
  const document = new Element('document');
  document.readyState = 'complete';
  document.createElement = tag => new Element(tag);
  const host = document.appendChild(new Element('div', {
    class: 'v3-video', 'data-video-id': html.match(/data-video-id="([^"]+)"/)[1],
    'data-video-title': html.match(/data-video-title="([^"]+)"/)[1]
  }));
  const frame = host.appendChild(new Element('div', {class: 'v3-video-frame'}));
  frame.appendChild(new Element('p', {class: 'invitation-title'}));
  frame.appendChild(new Element('span', {class: 'invitation-meta'}));
  frame.appendChild(new Element('button', {class: 'v3-video-load', hidden: ''}));
  const stop = document.appendChild(new Element('button', {hidden: ''}));
  const status = document.appendChild(new Element('p'));
  const exits = [...html.matchAll(/<a\b[^>]*\bdata-leave\b[^>]*\bhref="([^"]+)"/g)].map(m => document.appendChild(new Element('a', {'data-leave': '', href: m[1]})));
  const elements = {trailer: host, 'stop-video': stop, 'video-status': status};
  for (const id of ['scene-choices', 'scene-title', 'scene-note']) elements[id] = document.appendChild(new Element('div', {hidden: ''}));
  elements['official-video'] = exits.find(link => link.getAttribute('href') === 'https://www.youtube.com/watch?v=pm7RBghFt0I');
  const choices = [...html.matchAll(/data-scene="([^"]+)" aria-pressed="([^"]+)"/g)].map(m => elements['scene-choices'].appendChild(new Element('button', {'data-scene':m[1], 'aria-pressed':m[2]})));
  const returns = [...html.matchAll(/data-scene-target="([^"]+)"/g)].map(m => document.appendChild(new Element('a', {'data-scene-target':m[1]})));
  document.getElementById = id => elements[id];
  const window = new EventTarget();
  window.location={href:'https://example.test/?scene='+scene};
  window.history={replaceState:(_,__,url)=>{window.location.href=String(url);}};
  const context = vm.createContext({document, window, URL});
  if (withPublicLoader) vm.runInContext(fs.readFileSync(path.join(root, 'video-embed.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'screen.js'), 'utf8'), context);
  return {host, stop, status, exits, window, elements, choices, returns, button: () => host.querySelector('.v3-video-load'), iframe: () => host.querySelector('iframe')};
}
let count = 0;
const check = (name, fn) => { fn(); count++; console.log('PASS ' + name); };
const deep = setup(true, 'park');
check('direct park URL selects park without playback',()=>{assert.equal(deep.host.getAttribute('data-video-id'),'80y5COiKdDw');assert.equal(deep.iframe(),null);});
const invalid=setup(true,'invalid');
check('invalid selection retains film',()=>assert.equal(invalid.host.getAttribute('data-video-id'),'pm7RBghFt0I'));
const app = setup();
check('initial media remains absent and load control is usable', () => { assert.equal(app.iframe(), null); assert.equal(app.button().hidden, false); assert.equal(app.stop.hidden, true); });
app.button().click();
check('existing component creates the exact official video only after click', () => assert.equal(app.iframe().src, 'https://www.youtube-nocookie.com/embed/pm7RBghFt0I?playsinline=1&rel=0'));
check('origin-only cross-origin referrer and no autoplay permission', () => { assert.equal(app.iframe().referrerPolicy, 'strict-origin-when-cross-origin'); assert.equal(app.iframe().allow, 'encrypted-media; picture-in-picture; fullscreen'); });
check('focus enters native player and stop is visible', () => { assert.equal(focus, app.iframe()); assert.equal(app.stop.hidden, false); });
check('status never claims observed playback or completion', () => assert.doesNotMatch(app.status.textContent, /再生中|視聴済み|完了/));
const first = app.iframe();
app.host.dispatchEvent(new Event('click'));
check('extra clicks never stack players', () => { assert.equal(app.host.querySelectorAll('iframe').length, 1); assert.equal(app.iframe(), first); });
app.stop.click();
check('explicit stop detaches iframe and restores a focused load control', () => { assert.equal(app.iframe(), null); assert.equal(first.isConnected, false); assert.equal(focus, app.button()); assert.equal(app.stop.hidden, true); });
app.button().click();
check('play after stop reuses loader on a fresh frame', () => { assert.ok(app.iframe()); assert.notEqual(app.iframe(), first); });
app.exits[0].click();
check('choosing another work removes background player', () => assert.equal(app.iframe(), null));
app.button().click();
app.elements['official-video'].click();
check('leaving for official page removes background player', () => assert.equal(app.iframe(), null));
app.button().click();
app.window.dispatchEvent(new Event('pagehide'));
check('pagehide removes player and leaves a usable return state', () => { assert.equal(app.iframe(), null); assert.equal(app.button().hidden, false); });
app.button().click();
check('back-cache restored document can load again', () => assert.ok(app.iframe()));
const beforeSwitch = app.iframe();
app.choices[1].click();
check('switching to park detaches film without connecting to another video', () => {
  assert.equal(beforeSwitch.isConnected, false);
  assert.equal(app.iframe(), null);
  assert.equal(app.host.getAttribute('data-video-id'), '80y5COiKdDw');
  assert.deepEqual(app.choices.map(c => c.getAttribute('aria-pressed')), ['false','true']);
  assert.match(app.elements['scene-note'].textContent, /現在の放送案内ではありません/);
  assert.equal(app.elements['official-video'].href, 'https://www.youtube.com/watch?v=80y5COiKdDw');
});
app.button().click();
check('park needs its own explicit load and opens the exact official record', () => {
  assert.equal(app.iframe().src, 'https://www.youtube-nocookie.com/embed/80y5COiKdDw?playsinline=1&rel=0');
  assert.match(app.iframe().title, /みらいレコーズ公式/);
  assert.doesNotMatch(app.iframe().allow, /autoplay/);
});
const parkFrame = app.iframe();
app.choices[1].click();
check('choosing current scene never interrupts or remounts its player', () => assert.equal(app.iframe(), parkFrame));
app.stop.click();
app.button().click();
check('stop and reopen retain chosen park identity', () => { assert.equal(parkFrame.isConnected, false); assert.match(app.iframe().src, /80y5COiKdDw/); });
app.returns[0].click();
check('return to trailer from background selects film without autoplay', () => {
  assert.equal(app.iframe(), null);
  assert.equal(app.host.getAttribute('data-video-id'), 'pm7RBghFt0I');
  assert.deepEqual(app.choices.map(c => c.getAttribute('aria-pressed')), ['true','false']);
  assert.match(app.elements['scene-note'].textContent, /2017年の発売告知/);
});
app.returns[2].click();
app.button().click();
app.window.dispatchEvent(new Event('pagehide'));
check('park background link and pagehide also restore the same bounded scene', () => {
  assert.equal(app.iframe(), null);
  assert.equal(app.host.getAttribute('data-video-id'), '80y5COiKdDw');
  assert.equal(app.button().hidden, false);
});
const unavailable = setup(false);
const blocked = setup(true, 'park');
const violation = (overrides = {}) => Object.assign(new Event('securitypolicyviolation'), {
  disposition: 'enforce', effectiveDirective: 'frame-src',
  blockedURI: 'https://www.youtube-nocookie.com/embed/80y5COiKdDw', ...overrides
});
blocked.button().click();
const unaffected = blocked.iframe();
for (const overrides of [{disposition:'report'}, {effectiveDirective:'img-src'}, {blockedURI:'https://example.test/'}, {blockedURI:'https://www.youtube-nocookie.com.evil.test/'}]) {
  blocked.window.dispatchEvent(violation(overrides));
}
check('unrelated or report-only CSP events do not interrupt media', () => assert.equal(blocked.iframe(), unaffected));
blocked.window.dispatchEvent(violation());
check('blocked park frame is removed and its own official exit gets focus', () => {
  assert.equal(blocked.iframe(), null);
  assert.equal(unaffected.isConnected, false);
  assert.equal(blocked.stop.hidden, true);
  assert.equal(focus, blocked.elements['official-video']);
  assert.equal(blocked.elements['official-video'].href, 'https://www.youtube.com/watch?v=80y5COiKdDw');
  assert.match(blocked.status.textContent, /表示できませんでした/);
  assert.equal(blocked.button().hidden, false);
});
blocked.button().click();
check('retry after a blocked frame preserves the selected material', () => assert.match(blocked.iframe().src, /80y5COiKdDw/));
check('missing shared loader hides inert scene choices and keeps fallback', () => { assert.equal(unavailable.elements['scene-choices'].hidden, true); assert.equal(unavailable.button().hidden, true); assert.equal(unavailable.iframe(), null); assert.ok(html.includes('日活公式YouTubeで観る')); });
check('no initial external embeds, hotlinked thumbnails, analytics or preconnect', () => assert.doesNotMatch(html, /<iframe|<img[^>]+src="https?:|preconnect|preload|analytics-v3|googletagmanager/));
check('exactly three voluntary context choices without tracking or completion gates', () => { assert.equal((html.match(/<details>/g) || []).length, 3); assert.doesNotMatch(html, /type="(?:text|email)"|data-recording|progressbar/); });
check('correct current photo attribution and historical availability qualification', () => { for (const s of ['2024年4月13日', '映画の場面写真ではありません', 'Htanaungg', 'CC BY-SA 4.0', '縮小した既存画像', '2017年の発売告知']) assert.ok(html.includes(s), s); });
check('background claims name interviewees and keep ending-music separate from plot', () => { for (const s of ['瀬田なつき監督は', '監督によると', 'やくしまるえつこ', '作品協賛記事', '映画の結末の解説ではありません']) assert.ok(html.includes(s), s); });
check('bounded reverse chronology has dated primary sources and physical releases', () => {
  assert.deepEqual([...html.matchAll(/<time datetime="([^"]+)"/g)].map(m => m[1]), ['2017', '2016-04-27', '2014-06', '2012-11-12']);
  for (const url of ['https://mirairecords.com/stsr/1025', 'https://mirairecords.com/stsr/999']) assert.ok(html.includes(url));
  assert.ok(html.includes('CD、レコード、カセット'));
});
const threadContext = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'thread_content.js'), 'utf8'), threadContext);
const parks = threadContext.window.V3_THREAD_CONTENT.threads.find(t => t.threadId === 'kichijoji-parks');
check('Thread destination and deeper scene resolve to existing content', () => { assert.ok(parks.scenes.some(s => s.id === 'p2')); assert.ok(html.includes('../../thread.html?thread=kichijoji-parks#th-p2')); assert.ok(html.includes('../../shelf.html?shelf=kichijoji')); });
check('runtime imports and local photo resolve; shared loader runs before host', () => { assert.ok(html.indexOf('../../video-embed.js') < html.indexOf('./screen.js')); for (const f of ['../../video-embed.js', './screen.js', './screen.css', '../../assets/inokashira-pond.jpg']) assert.ok(fs.existsSync(path.resolve(dir, f))); });
check('delivery exclusion and narrow existing provider remain', () => { assert.match(fs.readFileSync(path.join(root, '.vercelignore'), 'utf8'), /^\/experiments\/$/m); assert.ok(html.includes("frame-src https://www.youtube-nocookie.com; connect-src 'none'")); });
console.log(`PARKS_SCREEN_HOST_CONTRACT_GO (${count}/${count}); actual browser, playback and network QA remain separate`);

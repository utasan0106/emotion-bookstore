/* =============================================================================
 * V3 prototype — Core Loop 検証（初期状態から最後まで通す）
 * 実行: NODE_PATH=/opt/node22/lib/node_modules node verify/core_loop.js
 * ========================================================================== */
const { chromium } = require('playwright');
const { start } = require('./serve');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  const { server, base } = await start(4173);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const requests = [];
  page.on('request', (r) => requests.push({ method: r.method(), url: r.url() }));

  const surface = () => page.getAttribute('.surface', 'data-surface');
  const click = async (text) => {
    await page.locator(`button:has-text("${text}")`).first().click();
    await page.waitForTimeout(160);
  };

  await page.goto(base);
  await page.waitForSelector('.surface');
  await page.evaluate(() => document.fonts.ready);

  check('Entrance 表示', (await surface()) === '01-entrance' &&
    (await page.textContent('.display')).replace(/\s+/g, '') === '感じていることから、次に触れるものを見つける。',
    (await page.textContent('.display')).replace(/\s+/g, ''));
  check('M01 Entrance: canonical crop lockup を使用',
    (await page.getAttribute('.brand-lockup', 'src')) === './assets/canonical-m01-w01/m01_stacked_lockup.png');
  check('M01 Entrance: canonical crop hero を使用',
    (await page.getAttribute('.hero-img', 'src')) === './assets/canonical-m01-w01/m01_hero.png' &&
    (await page.evaluate(() => {
      const img = document.querySelector('.hero-img');
      const s = getComputedStyle(img);
      return img.naturalWidth > 0 && s.opacity === '1' && s.filter === 'none' && s.objectFit === 'cover';
    })));
  check('M01 Entrance: canonical step crop / 二重バッジなし',
    (await page.locator('.loop-img').count()) === 4 &&
    (await page.evaluate(() => Array.from(document.querySelectorAll('.loop-img'))
      .every((n, i) => n.getAttribute('src') === './assets/canonical-m01-w01/m01_step_0' + (i + 1) + '.png' && n.alt === ''))) &&
    (await page.evaluate(() => getComputedStyle(document.querySelector('.loop-num')).display === 'none')));
  check('Entrance: 通常表示に Reset Prototype を出さない',
    !(await page.locator('#reset').isVisible()));
  check('M01 Entrance: Core Loop 4 steps / Step 3 exact copy / connectors 3',
    (await page.locator('.loop-step').count()) === 4 &&
    (await page.textContent('.loop-step:nth-child(3) .loop-title .copy-mobile')) === '外へ出る' &&
    (await page.textContent('.loop-step:nth-child(3) .loop-note .copy-mobile')) === '実際に触れてみる' &&
    (await page.locator('.loop-connector').count()) === 3);
  check('M01 Entrance: Trust exact copy',
    (await page.textContent('.trust-mobile')).replace(/\s+/g, '') ===
      '登録不要・入力内容はこの端末を基本に扱います');
  const entranceFonts = await page.evaluate(() => ({
    serif: getComputedStyle(document.querySelector('.display')).fontFamily,
    sans: getComputedStyle(document.querySelector('.trust-mobile')).fontFamily,
    serifLoaded: document.fonts.check('400 24px "Noto Serif JP"', '感じていることから'),
    sansLoaded: document.fonts.check('400 16px "Noto Sans JP"', '登録不要・この端末')
  }));
  check('M01 Entrance: self-host Noto Serif JP / Noto Sans JP が実ロード',
    entranceFonts.serif.startsWith('"Noto Serif JP"') &&
    entranceFonts.sans.startsWith('"Noto Sans JP"') &&
    entranceFonts.serifLoaded && entranceFonts.sansLoaded,
    JSON.stringify(entranceFonts));

  await page.locator('.cta-primary').click(); await page.waitForTimeout(60);
  check('Entrance → Emotion', (await surface()) === '02-emotion');
  check('M02 Emotion: 8 semantic cards / no default selection',
    (await page.locator('.emotion-grid .emotion-card').count()) === 8 &&
    (await page.locator('.emotion-grid button[aria-pressed="true"]').count()) === 0 &&
    (await page.locator('.emotion-card-image').count()) === 8 &&
    (await page.locator('.word-undecided').count()) === 0);

  // selected stateを実操作で保持して確認するため、browser harness内だけroute timerを保留する。
  await page.evaluate(() => {
    window.__m02RealSetTimeout = window.setTimeout;
    window.setTimeout = (fn, delay, ...args) =>
      delay === 120 ? 0 : window.__m02RealSetTimeout(fn, delay, ...args);
  });
  await page.locator('.emotion-card').first().click();
  check('M02 Emotion: one selected state / aria-pressed',
    (await page.locator('.emotion-card[aria-pressed="true"]').count()) === 1 &&
    (await page.locator('.emotion-card').first().getAttribute('aria-pressed')) === 'true');
  await page.locator('.emotion-card').last().click();
  check('M02 Emotion: reselection is one-only / まだ名前がない parity',
    (await page.locator('.emotion-card[aria-pressed="true"]').count()) === 1 &&
    (await page.locator('.emotion-card').last().getAttribute('aria-pressed')) === 'true');
  await page.evaluate(() => { window.setTimeout = window.__m02RealSetTimeout; });

  await page.locator('.stepbar-back').click();
  check('M02 Emotion: Back → Entrance', (await surface()) === '01-entrance');
  await page.locator('.cta-primary').click(); await page.waitForTimeout(60);

  await click('ざわつく');
  check('Emotion → Understanding', (await surface()) === '03-understanding');
  check('Understanding copy',
    (await page.textContent('.body-lg')).includes('何かがまだ定まりきらず'));

  await click('3つ見てみる');
  check('Understanding → Discovery', (await surface()) === '04-discovery');
  check('Discovery candidate 1 / 3',
    (await page.locator('.m03-card').count()) === 1 &&
    (await page.textContent('.m03-card-title')) === 'リトルモア喫茶室');

  const firstTitle = await page.textContent('.m03-card-title');
  await click('気になる');
  check('3 cards: 2枚目へ', (await page.textContent('.m03-card-title')) === '「また、同じ夢を見ていた」');
  await click('前の体験に戻る');
  check('Undo', (await page.textContent('.m03-card-title')) === firstTitle);

  // swipe input（pointer drag）でも同じ判定ができること
  const box = await page.locator('.m03-card').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(80);
  check('Swipe input（右 = 気になる）', (await page.textContent('.m03-card-title')) === '「また、同じ夢を見ていた」');
  await click('前の体験に戻る');

  await click('気になる');
  await click('今回は違う');
  await click('気になる');
  check('3 cards complete → review', (await surface()) === '04-discovery-review');
  check('M04 review: finite 3 / multiple keep has no automatic active',
    (await page.locator('.m04-review-card').count()) === 3 &&
    (await page.locator('.m04-review-card[data-decision="keep"]').count()) === 2 &&
    (await page.locator('.m04-review-card[data-decision="pass"]').count()) === 1 &&
    (await page.locator('.m04-review-card[aria-current="true"]').count()) === 0 &&
    (await page.locator('.m04-primary').isDisabled()));
  await page.locator('.m04-review-card[data-review-id="E01"] .m04-keep').click();
  check('M04 activeId: card / summary / CTA enabled agree',
    (await page.locator('.m04-review-card[data-review-id="E01"]').getAttribute('aria-current')) === 'true' &&
    (await page.textContent('.m04-selection-summary p')) === '選択中：リトルモア喫茶室' &&
    !(await page.locator('.m04-primary').isDisabled()));
  await page.locator('.m04-primary').click();
  check('Detail', (await surface()) === '05-experience-detail');
  const order = await page.locator('.surface .section-title').allTextContents();
  check('Detail 表示順', order.join(',') === '何をするか,なぜここにあるか,実際の情報', order.join(','));

  await click('この体験を選ぶ');
  check('Plan', (await surface()) === '06-plan');
  await page.locator('#plan-today').check();
  await page.locator('button:has-text("予定を残す")').click();
  await page.waitForTimeout(60);
  check('Plan 保存', (await surface()) === '06-plan-saved' &&
    (await page.textContent('.note')).includes('自動では確認しません'));

  await click('入口に戻る');
  check('Return surface', (await page.locator('.return-surface').count()) === 1 &&
    (await page.textContent('.return-text')) === 'この前選んだ体験があります。');

  await page.locator('.return-surface button').click();
  await page.waitForTimeout(60);
  check('Moment Candidate', (await surface()) === '07-moment-candidate' &&
    (await page.textContent('.body-lg')).includes('残しておきたいものはありますか'));

  await click('残すものがある');
  check('Trace', (await surface()) === '08-trace' &&
    (await page.locator('.m05-facet-card').count()) === 9 &&
    (await page.locator('.m05-experience img').count()) === 0);
  const facetLabels = await page.locator('.m05-facet-label').allTextContents();
  check('Trace exact 9 labels/order', facetLabels.join('|') === [
    '空気・雰囲気', '味・香り', '言葉・物語', '音', '光・色', '人・まなざし',
    '場所・風景', '時間の流れ', 'まだ言葉にならないもの'
  ].join('|'), facetLabels.join('|'));
  const beforeTrace = await page.evaluate(() => window.V3_STORE.load());
  check('Trace target = plan.experienceId / text-first hero',
    (await page.locator('.m05-experience').getAttribute('data-trace-experience-id')) === beforeTrace.plan.experienceId &&
    (await page.textContent('.m05-experience-title')) === 'リトルモア喫茶室');
  check('Trace zero state: primary disabled / reason visible / exit available',
    (await page.locator('.m05-primary').isDisabled()) &&
    (await page.locator('#m05-primary-reason').isVisible()) &&
    (await page.locator('button:has-text("今は残さない")').count()) === 1);
  await page.locator('#facet-not-yet-words').check();
  await page.locator('#facet-sound').check();
  await page.locator('#facet-atmosphere').check();
  check('Trace facet 上限 3 / counter / visible max reason',
    (await page.locator('#facet-taste-scent').isDisabled()) &&
    (await page.textContent('.m05-counter')) === '選択中 3 / 3' &&
    (await page.locator('.m05-max-reason').isVisible()));
  await page.locator('button:has-text("これを残す")').click();
  await page.waitForTimeout(80);
  const afterTrace = await page.evaluate(() => window.V3_STORE.load());
  check('Trace save → Entrance / no return prompt',
    (await surface()) === '01-entrance' && (await page.locator('.return-surface').count()) === 0);
  check('Trace canonical order persisted',
    afterTrace.traceFacets.join('|') === '空気・雰囲気|音|まだ言葉にならないもの',
    afterTrace.traceFacets.join('|'));
  check('Trace preserves deck / decisions',
    JSON.stringify(afterTrace.deck) === JSON.stringify(beforeTrace.deck));
  check('Trace closes plan / no personalized deck',
    afterTrace.plan.status === 'closed' && afterTrace.deck.mode === beforeTrace.deck.mode &&
    afterTrace.deck.mode !== 'personalized');
  const postTraceBody = await page.textContent('body');
  check('Trace does not show personalization copy after completion',
    !postTraceBody.includes('前回残ったものから、次の3つ。'));

  const posts = requests.filter((r) => r.method !== 'GET');
  const external = requests.filter((r) => !r.url.startsWith(base));
  check('network POST = 0', posts.length === 0, JSON.stringify(posts));
  check('external request = 0', external.length === 0, JSON.stringify(external));

  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length === 0 ? 0 : 1);
})();

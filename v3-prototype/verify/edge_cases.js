/* =============================================================================
 * V3 prototype — 3件すべて Pass / signal 不足 / Reset の検証
 * 実行: NODE_PATH=/opt/node22/lib/node_modules node verify/edge_cases.js
 * ========================================================================== */
const { chromium } = require('playwright');
const { start } = require('./serve');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  const { server, base } = await start(4175);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const surface = () => page.getAttribute('.surface', 'data-surface');
  const click = async (text) => {
    await page.locator(`button:has-text("${text}")`).first().click();
    await page.waitForTimeout(160);
  };

  await page.goto(base);
  await page.waitForSelector('.surface');
  await page.locator('.cta-primary').click(); await page.waitForTimeout(60); await click('ざわつく'); await click('3つ見てみる');
  await click('今回は違う'); await click('今回は違う'); await click('今回は違う');

  check('3件すべて Pass → M04 Review を維持',
    (await surface()) === '04-discovery-review' &&
    (await page.locator('.m04-review-card[data-decision="pass"]').count()) === 3 &&
    (await page.locator('.m04-all-pass-note').count()) === 1 &&
    (await page.locator('.m04-primary').isDisabled()));
  const choices = await page.locator('.m04-review-actions button').allTextContents();
  check('All-pass 後の正式選択肢',
    choices.join(',') === 'この体験を見てみる→,3つを見直す,今日は終わる', choices.join(','));
  const bodyText = await page.textContent('body');
  check('「もっと見る」系の動線なし', !/もっと|さらに|追加で|20件/.test(bodyText));

  await click('3つを見直す');
  check('3つを見直す → decisions を保持して先頭から再開',
    (await surface()) === '04-discovery' &&
    (await page.textContent('.m03-card-title')) === 'リトルモア喫茶室');

  /* ---------------------------- Trace zero-selection exit / deck invariants */
  await click('気になる'); await click('気になる'); await click('気になる');
  await page.locator('.m04-review-card[data-review-id="E01"] .m04-keep').click();
  await page.locator('.m04-primary').click();
  await page.waitForTimeout(60);
  await click('この体験を選ぶ');
  await page.locator('#plan-later').check();
  await click('予定を残す');
  await click('入口に戻る');
  await page.locator('.return-surface button').click();
  await page.waitForTimeout(60);
  await click('残すものがある');
  const beforeSkip = await page.evaluate(() => window.V3_STORE.load());
  check('Trace 0: primary disabled / visible reason',
    (await page.locator('.m05-primary').isDisabled()) &&
    (await page.locator('#m05-primary-reason').isVisible()));
  await click('今は残さない');
  const afterSkip = await page.evaluate(() => window.V3_STORE.load());
  check('Trace 0 exit → Entrance / return promptなし',
    (await surface()) === '01-entrance' && (await page.locator('.return-surface').count()) === 0);
  check('Trace 0 exit: no traceFacets write',
    JSON.stringify(afterSkip.traceFacets) === JSON.stringify(beforeSkip.traceFacets));
  check('Trace 0 exit: plan closed / deck-decisions invariant',
    afterSkip.plan.status === 'closed' && JSON.stringify(afterSkip.deck) === JSON.stringify(beforeSkip.deck));
  check('Trace 0 exit: personalized deck/copy absent',
    afterSkip.deck.mode !== 'personalized' &&
    !(await page.textContent('body')).includes('前回残ったものから、次の3つ。'));

  /* --------------------------------------- Plan「日時を決める」の mocked 入力 */
  await page.locator('.cta-primary').click(); await page.waitForTimeout(60); await click('ざわつく'); await click('3つ見てみる');
  await click('気になる'); await click('気になる'); await click('気になる');
  await page.locator('.m04-review-card').first().locator('.m04-keep').click();
  await page.locator('.m04-primary').click();
  await page.waitForTimeout(60);
  await click('この体験を選ぶ');
  const hiddenAtFirst = await page.locator('.datetime').isHidden();
  await page.locator('#plan-datetime').check();
  const shownForDatetime = await page.locator('.datetime').isVisible();
  await page.locator('#plan-today').check();
  const hiddenForToday = await page.locator('.datetime').isHidden();
  check('Plan: 日時入力は「日時を決める」選択時のみ表示',
    hiddenAtFirst && shownForDatetime && hiddenForToday,
    `${hiddenAtFirst} / ${shownForDatetime} / ${hiddenForToday}`);

  /* ------------------------------------------------------------------ Reset */
  // Reset Prototype は Header Interaction Contract 4 により debug 時のみ露出する
  await page.goto(base + '?debug=1');
  await page.waitForSelector('.surface');
  check('Reset は ?debug=1 のときだけ表示される', await page.locator('#reset').isVisible());
  await page.locator('#reset').click();
  await page.waitForTimeout(120);
  check('Reset Prototype → Entrance / return surface なし',
    (await surface()) === '01-entrance' && (await page.locator('.return-surface').count()) === 0);
  await page.goto(base);
  await page.waitForSelector('.surface');
  check('通常表示では Reset を出さない', !(await page.locator('#reset').isVisible()));
  check('Reset 後は再読み込みしても初期状態',
    (await surface()) === '01-entrance' && (await page.locator('.return-surface').count()) === 0);

  /* ------------------------------------------- 「今はない」で return を閉じる */
  await page.locator('.cta-primary').click(); await page.waitForTimeout(60); await click('沈む'); await click('3つ見てみる');
  await click('気になる'); await click('今回は違う'); await click('今回は違う');
  await page.locator('.m04-primary').click();
  await page.waitForTimeout(60);
  await click('この体験を選ぶ');
  await page.locator('#plan-weekend').check();
  await click('予定を残す');
  await click('入口に戻る');
  await page.locator('.return-surface button').click();
  await page.waitForTimeout(60);
  await click('今はない');
  check('Moment「今はない」→ Entrance / return surface が消える',
    (await surface()) === '01-entrance' && (await page.locator('.return-surface').count()) === 0);

  // canonical が言い換えを与えているのは「ざわつく」だけ。他の語では説明段落を出さない。
  await page.locator('.cta-primary').click(); await page.waitForTimeout(60);
  await click('心が弾む');
  const plainBody = await page.locator('.body-lg').allTextContents();
  const plainNote = await page.locator('.note').count();
  check('Understanding: 説明文のない語では説明段落を出さない',
    (await surface()) === '03-understanding' && plainBody.length === 1 &&
    plainBody[0] === 'この言葉の隣に、3つの体験を置いています。' && plainNote === 0,
    plainBody.join(' / '));

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length === 0 ? 0 : 1);
})();

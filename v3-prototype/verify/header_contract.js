/* =============================================================================
 * V3 prototype — Header MENU Interaction Contract v0.2（W01 / M01）
 * 実行: NODE_PATH=/opt/node22/lib/node_modules node verify/header_contract.js
 * ========================================================================== */
const fs = require('fs');
const { chromium } = require('playwright');
const { start } = require('./serve');
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  const { server, base } = await start(4184);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined)
  });

  /* ---------------------------------------------------- desktop (>=1200px) */
  const d = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  await d.goto(base);
  await d.waitForSelector('.surface');

  const trigger = d.locator('#headerMenuTrigger');
  const panel = d.locator('#headerNavPanel');
  check('W01: desktop global header を表示', await d.locator('.site-header').isVisible());
  check('W01: old top-right dark CTA を削除', (await d.locator('#headerCta').count()) === 0);
  check('W01: quiet semantic MENU button',
    (await trigger.evaluate((n) => n.tagName)) === 'BUTTON' &&
    (await trigger.textContent()).trim() === 'MENU' &&
    (await trigger.getAttribute('aria-expanded')) === 'false' &&
    (await trigger.getAttribute('aria-controls')) === 'headerNavPanel' &&
    (await trigger.getAttribute('aria-haspopup')) === 'true');
  check('W01: closed state で central 4-item nav を表示しない', !(await panel.isVisible()));
  const visiblePrimaryStarts = await d.evaluate(() => Array.from(document.querySelectorAll('button.btn-primary'))
    .filter((n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden')
    .filter((n) => n.textContent.trim().startsWith('はじめる')).length);
  check('W01: closed visible primary はじめる = concise Hero CTA 1件',
    visiblePrimaryStarts === 1 && (await d.locator('.cta-primary .cta-main').textContent()) === 'はじめる' &&
      (await d.locator('.cta-primary .cta-sub').count()) === 0,
    String(visiblePrimaryStarts));

  const labels = await d.locator('.site-nav-link').allTextContents();
  check('W01: nav 5項目の順序',
    labels.join(',') === '選ばずに見る,保存済みを見る,体験の流れ,感情の棚,よくある質問', labels.join(','));
  check('W01: nav landmark + list semantics / ARIA menu pattern 不使用',
    (await panel.evaluate((n) => n.tagName)) === 'NAV' &&
    (await panel.locator(':scope > ul > li').count()) === 5 &&
    (await d.locator('[role="menu"], [role="menuitem"]').count()) === 0);

  await trigger.click();
  const openGeometry = await panel.boundingBox();
  check('W01: click で finite right-aligned panel を開く',
    await panel.isVisible() && (await trigger.getAttribute('aria-expanded')) === 'true' &&
    openGeometry && openGeometry.width < 400 && openGeometry.height < 400 &&
    openGeometry.x > 1536 / 2,
    openGeometry ? `${Math.round(openGeometry.width)}x${Math.round(openGeometry.height)} @ ${Math.round(openGeometry.x)}` : 'no box');
  check('W01: open 後に first item へ focus',
    await d.evaluate(() => document.activeElement === document.querySelector('#headerNavPanel .site-nav-link')));

  await d.keyboard.press('Escape');
  check('W01: Escape で閉じて trigger へ focus 復帰',
    !(await panel.isVisible()) && (await trigger.getAttribute('aria-expanded')) === 'false' &&
    await d.evaluate(() => document.activeElement === document.getElementById('headerMenuTrigger')));

  await trigger.click();
  await trigger.click();
  check('W01: trigger 再clickで閉じる',
    !(await panel.isVisible()) && (await trigger.getAttribute('aria-expanded')) === 'false');

  await d.keyboard.press('Enter');
  check('W01: Enter で開く', await panel.isVisible() && (await trigger.getAttribute('aria-expanded')) === 'true');
  await d.keyboard.press('Escape');
  await d.keyboard.press('Space');
  check('W01: Space で開く', await panel.isVisible() && (await trigger.getAttribute('aria-expanded')) === 'true');
  await d.keyboard.press('Escape');

  await trigger.click();
  await d.mouse.click(20, 500);
  check('W01: outside click で閉じる',
    !(await panel.isVisible()) && (await trigger.getAttribute('aria-expanded')) === 'false');
  check('W01: hidden panel items は tab order 外',
    await d.evaluate(() => {
      const p = document.getElementById('headerNavPanel');
      return p.hidden && Array.from(p.querySelectorAll('.site-nav-link')).every((n) => n.offsetParent === null);
    }));

  check('W01: logo は #top へのリンク / 説明ラベルあり',
    (await d.getAttribute('.site-logo', 'href')) === '#top' &&
    (await d.getAttribute('.site-logo', 'aria-label')) === 'みんなの感情書店の入口へ戻る' &&
    (await d.getAttribute('.site-logo img', 'src')) === './assets/canonical-m01-w01/w01_horizontal_lockup.png');

  const trustCopy = await d.evaluate(() => Array.from(document.querySelectorAll('.trust-item')).map((n) => ({
    heading: n.querySelector('.trust-heading').textContent,
    support: n.querySelector('.trust-support').textContent,
    icon: n.querySelector('.trust-icon').getAttribute('src')
  })));
  check('W01: Trust 3項目 = distinct icon + exact heading + exact support',
    trustCopy.length === 3 &&
    trustCopy.map((x) => x.heading).join('|') ===
      '登録不要・記録は非公開|記録を外部AIへ送りません|記録はまずこの端末へ' &&
    trustCopy.map((x) => x.support).join('|') ===
      'この端末に保存した記録は公開されません。|この端末に保存した内容を、外部AIへ送る機能はありません。|大切な記録は、あなたの端末に保存されます。' &&
    new Set(trustCopy.map((x) => x.icon)).size === 3,
    JSON.stringify(trustCopy));

  // ロゴ操作で prototype state を初期化しない
  await d.evaluate(() => window.scrollTo(0, 600));
  await d.locator('.site-logo').click();
  await d.waitForTimeout(500);
  check('W01: logo クリックで #top へスクロール / 画面は Entrance のまま',
    (await d.evaluate(() => window.scrollY)) < 10 &&
    (await d.getAttribute('.surface', 'data-surface')) === '01-entrance');

  const openMenu = async (page) => {
    await page.locator('#headerMenuTrigger').click();
    await page.locator('#headerNavPanel').waitFor({ state: 'visible' });
  };

  /* 対象を上端へ寄せる。ページ末尾側の節では最大スクロール位置で止まるため、
     「上端に到達」または「最大スクロールに到達」を満たせば契約どおり。 */
  const scrollCheck = async (page, id) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(120);
    const before = await page.evaluate((x) => document.getElementById(x).getBoundingClientRect().top, id);
    await openMenu(page);
    await page.locator('.site-nav-link', { hasText: id === 'experience-flow' ? '体験の流れ' : 'よくある質問' }).click();
    await page.waitForTimeout(700);
    return page.evaluate((args) => {
      const top = document.getElementById(args.id).getBoundingClientRect().top;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return {
        top, before: args.before, scrollY: window.scrollY,
        atMax: Math.abs(window.scrollY - max) < 2,
        closed: document.getElementById('headerNavPanel').hidden &&
          document.getElementById('headerMenuTrigger').getAttribute('aria-expanded') === 'false'
      };
    }, { id, before });
  };

  const loopScroll = await scrollCheck(d, 'experience-flow');
  check('W01: 体験の流れ → #experience-flow / selection closes panel',
    loopScroll.scrollY > 0 && loopScroll.top < loopScroll.before &&
    (loopScroll.top >= 0 && loopScroll.top < 180 || loopScroll.atMax) && loopScroll.closed,
    `top ${Math.round(loopScroll.top)} / scrollY ${Math.round(loopScroll.scrollY)}${loopScroll.atMax ? ' (最大)' : ''}`);

  const trustScroll = await scrollCheck(d, 'faq');
  check('W01: よくある質問 → #faq / selection closes panel',
    trustScroll.scrollY > 0 && trustScroll.top < trustScroll.before &&
    (Math.abs(trustScroll.top) < 60 || trustScroll.atMax) && trustScroll.closed,
    `top ${Math.round(trustScroll.top)} / scrollY ${Math.round(trustScroll.scrollY)}${trustScroll.atMax ? ' (最大)' : ''}`);
  check('W01: #trust に非表示見出し「よくある質問」',
    (await d.textContent('#trust-heading')) === 'よくある質問' &&
    (await d.evaluate(() => getComputedStyle(document.getElementById('trust-heading')).position === 'absolute')));
  check('W01: FAQ の accordion / modal / 新画面を作っていない',
    (await d.locator('details, dialog, [role="dialog"], [role="tablist"]').count()) === 0);

  // locale は非対話の状態表示
  check('W01: 未提供の言語切替UIを表示しない', (await d.locator('.locale').count()) === 0);

  await openMenu(d);
  await d.locator('.site-nav-link', { hasText: '感情の棚' }).click();
  await d.waitForTimeout(80);
  check('W01: 感情の言葉 → W02 Emotion（別画面を作らない）',
    (await d.getAttribute('.surface', 'data-surface')) === '02-emotion' && !(await panel.isVisible()));
  check('W02: approved Global Header MENU closed stateを継承',
    await d.locator('.site-header').isVisible() && await trigger.isVisible() &&
    (await trigger.getAttribute('aria-expanded')) === 'false' && !(await panel.isVisible()));
  check('W02: canonical hero / 8 emotion cards',
    (await d.locator('.emotion-card').count()) === 8 &&
    (await d.getAttribute('.emotion-hero img', 'src')) === './assets/canonical-m02-w02/w02_hero.png');
  await openMenu(d);
  check('W02: MENU open stateは現在の5項目panel',
    await panel.isVisible() && (await panel.locator('.site-nav-link').count()) === 5);
  await d.keyboard.press('Escape');

  await d.goto(base); await d.waitForSelector('.surface');
  await openMenu(d);
  await d.locator('.site-nav-link', { hasText: '感情の棚' }).click();
  await d.waitForTimeout(80);
  check('W01: nav 感情の棚 → W02 Emotion',
    (await d.getAttribute('.surface', 'data-surface')) === '02-emotion' && !(await panel.isVisible()));

  await d.goto(base); await d.waitForSelector('.surface');
  await d.mouse.move(0, 0);
  await d.waitForTimeout(250);
  const menuStyle = await d.evaluate(() => {
    const s = getComputedStyle(document.getElementById('headerMenuTrigger'));
    return { background: s.backgroundColor, minHeight: parseFloat(s.minHeight), border: s.borderTopWidth };
  });
  check('W01: MENU is quiet control, not dark CTA',
    menuStyle.background === 'rgba(0, 0, 0, 0)' && menuStyle.minHeight >= 44,
    JSON.stringify(menuStyle));
  await d.close();

  /* ------------------------------------------------- reduced motion は即時 */
  const rm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await rm.goto(base); await rm.waitForSelector('.surface');
  await openMenu(rm);
  await rm.locator('.site-nav-link', { hasText: '体験の流れ' }).click();
  await rm.waitForTimeout(60);
  const rmScroll = await rm.evaluate(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return { scrollY: window.scrollY, atMax: Math.abs(window.scrollY - max) < 2,
             top: document.getElementById('experience-flow').getBoundingClientRect().top };
  });
  check('reduced motion: 即時スクロール（補間なし）',
    rmScroll.scrollY > 0 && (rmScroll.top >= 0 && rmScroll.top < 180 || rmScroll.atMax),
    `60ms 後 scrollY ${Math.round(rmScroll.scrollY)}${rmScroll.atMax ? ' (最大)' : ''}`);
  await rm.close();

  /* ------------------------------------------ <1200px でも service MENU は到達可能 */
  for (const width of [390, 430, 768, 1199]) {
    const m = await browser.newPage({ viewport: { width, height: 900 } });
    await m.goto(base); await m.waitForSelector('.surface');
    check(`M01 ${width}px: header / MENU を表示し panel は閉じる`,
      await m.locator('.site-header').isVisible() &&
      await m.locator('#headerMenuTrigger').isVisible() && !(await m.locator('#headerNavPanel').isVisible()));
    await openMenu(m);
    check(`M01 ${width}px: MENU から no-emotion / saved route へ到達可能`,
      await m.locator('[data-nav="no-emotion"]').isVisible() &&
      await m.locator('[data-nav="interested"]').isVisible());
    await m.keyboard.press('Escape');
    check(`M01 ${width}px: Hero CTA は canonical navy`,
      (await m.evaluate(() => getComputedStyle(document.querySelector('.cta-primary')).backgroundColor)) === 'rgb(13, 35, 57)');
    await m.close();
  }

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length === 0 ? 0 : 1);
})();

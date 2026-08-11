/* ============================================================
 * Visual Refit V2 — Production Mount bootstrap
 * ------------------------------------------------------------
 * 役割は「既存の画面遷移に合わせて、対応する V2 画面を表示する」ことだけ。
 *
 * このファイルが絶対に持たない責務
 *   - 遷移そのもの（既存 goToPage() / goToShelf() が唯一の入口）
 *   - storage / DataRepository / localStorage の読み書き
 *   - GA4（trackAnalyticsEvent）の呼び出し
 *   - 外部通信
 *   - history / router
 *   - 保存・製本・削除・復元などの業務ロジック（すべて既存実装のまま）
 *
 * 既存 DOM は削除しない。main.js は多数の getElementById に依存しているため、
 * 旧UIは DOM に残したまま CSS で隠す（v2-mount.css の .v2-legacy-hidden）。
 * ============================================================ */
(function (global) {
  'use strict';
  if (global.__V2_MOUNTED__) return;
  global.__V2_MOUNTED__ = true;

  var doc = global.document;

  /* 既存ページID → V2 画面番号。navigation-adapter の SCREENS と同じ対応。 */
  var PAGE_TO_SCREEN = {
    counter: '02',
    shelves: '03',
    desk: '05',
    bookshelf: '06'
  };

  function currentPageId() {
    var tab = doc.querySelector('.page-tab.active[data-page]');
    if (tab) return tab.getAttribute('data-page');
    var open = doc.querySelector('.experience-page.is-active');
    return open ? open.id : null;
  }

  /* 表紙（入店前）かどうか。既存の body.experience-open が唯一の判定材料。 */
  function isCover() {
    return !doc.body.classList.contains('experience-open');
  }

  /* 直前に同期した既存ページ。同じページで何度も subview を張り替えない。 */
  var lastPageId = null;

  /* 表示中の V2 画面を、既存の現在地に合わせて切り替える。
     ページ本体の表示/非表示は既存 activateExperiencePage() が行う。
     ここが面倒を見るのは「同じ既存ページに複数ある V2 画面」（03/04・06/07/08）だけ。

     既存 goToPage() は V2 の subview 概念を知らないため、
     旧ナビや既存コードから遷移したときは subview が未設定のままになる。
     その場合だけ、承認済み API（NavigationAdapter.go の subviewOnly）で既定の
     subview を選び直す。subviewOnly は既存関数を呼ばないので、
     再描画・GA4・storage・外部通信のいずれも発生しない。 */
  function syncScreens() {
    var cover = doc.querySelector('[data-v2-screen="01"]');
    if (cover) cover.classList.toggle('is-v2-current', isCover());

    var pageId = currentPageId();
    if (!pageId || isCover()) { lastPageId = null; return; }

    var nav = global.V2NavigationAdapter;
    if (!nav || typeof nav.go !== 'function') return;

    /* 既に同じページで subview が立っているなら触らない
       （07 を開いている最中に 06 へ引き戻さないため）。 */
    var current = doc.documentElement.getAttribute('data-v2-subview');
    if (pageId === lastPageId && current) return;

    var target = null;
    if (pageId === 'shelves') {
      /* 03 と 04 は emotion-shelf-adapter が入口文脈を持つ。
         文脈が無いときは一覧（03）が既定。 */
      target = (current === 'shelf-detail') ? null : '03';
    } else if (pageId === 'bookshelf') {
      /* 06 / 08 の出し分けは bookshelf-adapter の resolveScreen が唯一の判断者
         （冊数を数えるのは Adapter の責務。ここでは結果を受け取るだけ）。 */
      if (current === 'bookshelf-reader') target = null;
      else if (global.V2BookshelfAdapter &&
               typeof global.V2BookshelfAdapter.resolveScreen === 'function') {
        target = global.V2BookshelfAdapter.resolveScreen();
      } else {
        target = '06';
      }
    }

    lastPageId = pageId;
    if (target) nav.go(target, { subviewOnly: true });
  }

  function boot() {
    if (!global.V2NavigationAdapter) return;

    global.V2NavigationAdapter.mount();
    if (global.V2BookshelfAdapter) {
      global.V2BookshelfAdapter.connectNavigation();
      global.V2BookshelfAdapter.mount();
    }
    if (global.V2FormAdapter) global.V2FormAdapter.mount();
    if (global.V2NavigationAdapter.startThemeBridge) {
      global.V2NavigationAdapter.startThemeBridge();
    }

    doc.documentElement.setAttribute('data-v2-mounted', 'true');
    syncScreens();

    /* 既存の遷移後に V2 側の表示を追従させる。
       既存関数を書き換えず、DOM の変化だけを見る（MutationObserver）。 */
    if (global.MutationObserver) {
      var mo = new global.MutationObserver(function () { syncScreens(); });
      mo.observe(doc.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', function () { global.setTimeout(boot, 0); });
  } else {
    global.setTimeout(boot, 0);
  }
})(window);

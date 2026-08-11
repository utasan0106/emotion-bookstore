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

  /* --------------------------------------------------------------------
   * Secondary Utility（U1/L1/L2/L3 への入口）
   * 既存 openExperienceMenu() を呼ぶだけ。メニューの中身・設定・法務文書は
   * すべて既存実装のまま（新機能・新文言を作らない）。
   * ------------------------------------------------------------------ */
  function wireUtilityMenu() {
    var btns = doc.querySelectorAll('[data-v2-open-menu]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        if (typeof global.openExperienceMenu === 'function') global.openExperienceMenu();
      });
    }
  }

  /* --------------------------------------------------------------------
   * 07 Secondary：編集 / この一冊を削除
   * 検証・確認ダイアログ・保存・失敗時の巻き戻しは、すべて既存 bookModal の
   * 実装（modalEdit / modalDel）をそのまま使う。ここは入口を開くだけ。
   * 編集面が既存モーダルであることは known exception として報告済み。
   * ------------------------------------------------------------------ */
  function openLegacyBookAction(actionId) {
    var bs = global.V2BookshelfAdapter;
    if (!bs || typeof bs.getSelectedEntry !== 'function') return;
    var entry = bs.getSelectedEntry();
    if (!entry) return;
    if (typeof global.openBook !== 'function') return;
    global.openBook(entry);
    if (actionId) {
      var btn = doc.getElementById(actionId);
      if (btn) btn.click();
    }
  }

  function wireReaderSecondary() {
    var edits = doc.querySelectorAll('[data-v2-reader-edit]');
    var dels = doc.querySelectorAll('[data-v2-reader-delete]');
    var i;
    for (i = 0; i < edits.length; i++) {
      edits[i].addEventListener('click', function () { openLegacyBookAction('modalEdit'); });
    }
    for (i = 0; i < dels.length; i++) {
      dels[i].addEventListener('click', function () { openLegacyBookAction('modalDel'); });
    }

    /* モーダルが閉じたら V2 側の表示を実データへ追随させる。
       削除済みなら読書位置を離れて 06/08 の既存判定へ戻る。 */
    var modal = doc.getElementById('bookModal');
    if (modal && global.MutationObserver) {
      var wasOpen = !modal.classList.contains('hidden');
      var mo = new global.MutationObserver(function () {
        var openNow = !modal.classList.contains('hidden');
        if (wasOpen && !openNow) {
          var bs = global.V2BookshelfAdapter;
          var nav = global.V2NavigationAdapter;
          if (bs) {
            if (typeof bs.render === 'function') bs.render();
            var entry = (typeof bs.getSelectedEntry === 'function') ? bs.getSelectedEntry() : null;
            if (entry) {
              if (typeof bs.renderReader === 'function') bs.renderReader();
            } else if (nav && typeof nav.go === 'function') {
              if (typeof bs.clearSelectedBook === 'function') bs.clearSelectedBook();
              var target = (typeof bs.resolveScreen === 'function') ? bs.resolveScreen() : '06';
              nav.go(target, { subviewOnly: true });
            }
          }
        }
        wasOpen = openNow;
      });
      mo.observe(modal, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* --------------------------------------------------------------------
   * Returning User / Entry Policy（MASTER §6）
   * 承認済みの既存 key（library / draft）を READ-ONLY で確認し、
   * 利用履歴が確かめられたときだけ 02 へ。判定不能なら 01 のまま（canonical fallback）。
   * 新しい永続 storage key は追加しない。GA4 は既存 goToPage 経路のまま増やさない。
   * ------------------------------------------------------------------ */
  function resolveReturningUser() {
    if (typeof global.loadJSON !== 'function') return;
    var nav = global.V2NavigationAdapter;
    if (!nav || typeof nav.go !== 'function') return;
    Promise.all([
      global.loadJSON('emotion-bookstore-library', null),
      global.loadJSON('emotion-bookstore-draft', null)
    ]).then(function (r) {
      var lib = r[0], draft = r[1];
      var hasBooks = !!(lib && Array.isArray(lib) && lib.length > 0);
      var hasDraft = !!(draft && typeof draft.text === 'string' && draft.text.trim());
      /* 利用者がすでに自分で入店していたら何もしない */
      if (!isCover()) return;
      if (hasBooks || hasDraft) nav.go('02');
    }).catch(function () { /* 判定不能：canonical fallback = 01 のまま */ });
  }

  function boot() {
    if (!global.V2NavigationAdapter) return;

    global.V2NavigationAdapter.mount();
    if (global.V2BookshelfAdapter) {
      global.V2BookshelfAdapter.connectNavigation();
      global.V2BookshelfAdapter.mount();
    }
    if (global.V2EmotionShelfAdapter) global.V2EmotionShelfAdapter.mount();
    if (global.V2FormAdapter) global.V2FormAdapter.mount();
    if (global.V2NavigationAdapter.startThemeBridge) {
      global.V2NavigationAdapter.startThemeBridge();
    }

    wireUtilityMenu();
    wireReaderSecondary();

    doc.documentElement.setAttribute('data-v2-mounted', 'true');
    syncScreens();
    resolveReturningUser();

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

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
    /* HARDEN-02：既存遷移のたびに掛け直す。旧UIの中身は既存側が
       innerHTML ごと差し替えることがあるが、inert は差し替えの外側
       （CSS が隠しているのと同じ要素）に付くため維持される。
       属性は inert のみで、class は触らないので下の MutationObserver
       （attributeFilter:['class']）を再帰的に起こすことはない。 */
    applyLegacyInert();

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
   * HARDEN-02：視覚的に隠している旧UIを、Tab順序とアクセシビリティツリー
   * からも退場させる。
   *
   * 対象は v2-mount.css が視覚的に隠している集合と完全に同一。それ以外の
   * 旧UI（#bookModal / #experienceMenu / #unfiledShelfPicker 等の body 直下
   * オーバーレイ）は V2 からも実際に使うため、ここでは一切触れない。
   *
   * inert を選んだ理由（依存監査の結果）：
   *   - element.value の読み書き、合成 input/change イベント、
   *     element.click()、getElementById はいずれも inert 下でも動作する。
   *     したがって form-adapter の srcBtn.click()／pushField() など、
   *     既存の製本フローと adapter の呼び出し規約はそのまま保たれる。
   *   - disabled は使わない（form の値送出契約を壊すため）。
   *   - 旧 DOM は削除しない。既存ロジックは V2 側へ移植し直さない。
   *
   * inert 下で唯一変わるのは element.focus() が通らなくなること。対象は
   * いずれも「V2 では画面外に clip 済みの要素へ focus を移す」既存経路で、
   * mount 中は元から不可視要素へ focus が飛ぶ状態だったため、
   * 静かな no-op になることで悪化はしない（focus は現在位置に留まる）。
   * ------------------------------------------------------------------ */
  var LEGACY_HIDDEN_SEL = [
    '.entrance.hero > *:not(.v2-page)',
    '#counter > *:not(.v2-page)',
    '#shelves > *:not(.v2-page)',
    '#desk > *:not(.v2-page)',
    '#bookshelf > *:not(.v2-page)',
    '.experience-bar',
    '.page-nav',
    '.doma',
    '.shop-footer'
  ].join(',');

  function applyLegacyInert() {
    if (!doc || typeof doc.querySelectorAll !== 'function') return;
    var els = doc.querySelectorAll(LEGACY_HIDDEN_SEL);
    for (var i = 0; i < els.length; i++) {
      if (!els[i].hasAttribute('inert')) els[i].setAttribute('inert', '');
    }
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

    /* PKT-3 Data / Backup：既存ボタンをそのまま同期 click するだけの入口。
       バックアップ形式・復元処理・保存キー・GA4・外部通信には一切触れない。
       復元はファイル選択を伴うため、写真と同じく同期呼び出しを守る。 */
    var bridges = doc.querySelectorAll('[data-v2-legacy-click]');
    for (var b = 0; b < bridges.length; b++) {
      bridges[b].addEventListener('click', function (ev) {
        var id = ev.currentTarget.getAttribute('data-v2-legacy-click');
        var target = id ? doc.getElementById(id) : null;
        if (target) target.click();
      });
    }
  }

  /* --------------------------------------------------------------------
   * ADDENDUM / Photo：05 の写真欄を V2 へ再露出する
   *
   * 既存契約（変更しない）
   *   #photoChooseBtn … 選択ダイアログを開く既存の唯一の入口
   *   #photoInput     … <input type="file">。change で既存の圧縮・保存が走る
   *   #photoPreview   … 既存プレビュー（.hidden の有無が唯一の状態）
   *   #photoPreviewImg… 既存プレビュー画像（src が dataURL）
   *   #photoRemove    … 既存の取り外し
   *   attachedPhoto / entry.image … 製本時の保存経路（そのまま）
   *
   * ここでやること
   *   V2 のボタン → 既存ボタンを同期的に click する（iOS で file chooser が
   *   確実に開くよう、利用者の click ハンドラ内で同期呼び出しにする。既存
   *   実装が守っている前提をそのまま踏襲し、setTimeout / Promise を挟まない）。
   *   既存プレビューの状態を V2 側へ写す（MutationObserver。polling しない）。
   *
   * やらないこと
   *   backend upload / external upload / fetch / XHR / sendBeacon
   *   storage schema・photo compression contract・GA4 への関与
   * ------------------------------------------------------------------ */
  var PHOTO = {
    choose: 'photoChooseBtn',
    input: 'photoInput',
    preview: 'photoPreview',
    image: 'photoPreviewImg',
    remove: 'photoRemove'
  };

  function v2Photo(key) { return doc.querySelector('[data-v2-photo="' + key + '"]'); }

  function legacyPhotoAttached() {
    var prev = doc.getElementById(PHOTO.preview);
    return !!(prev && !prev.classList.contains('hidden'));
  }

  /* V2 側のプレビュー表示・選択ボタン文言を、既存側の状態へ追随させる。
     写真そのもの（dataURL）は既存 img の src を読むだけで、複製も保存もしない。 */
  function syncPhotoView() {
    var attached = legacyPhotoAttached();
    var box = v2Photo('preview');
    var img = v2Photo('image');
    var srcImg = doc.getElementById(PHOTO.image);
    if (img && srcImg && img.src !== srcImg.src) img.src = srcImg.src || '';
    if (box) {
      if (attached) box.removeAttribute('hidden');
      else box.setAttribute('hidden', '');
    }
    refreshV2PhotoLabels();
  }

  /* 選択ボタンの文言は「まだ無い＝挟む／既にある＝選び直す」で入れ替える。
     文言は既存 MESSAGES（photoLabel / v2c05PhotoReplace）から引く。 */
  function refreshV2PhotoLabels() {
    var btn = v2Photo('choose');
    if (!btn || typeof global.t !== 'function') return;
    var key = legacyPhotoAttached() ? 'v2c05PhotoReplace' : 'photoLabel';
    btn.setAttribute('data-i18n', key);
    var label = global.t(key);
    if (typeof label === 'string' && label !== key) btn.textContent = label;
  }
  global.refreshV2PhotoLabels = refreshV2PhotoLabels;

  function wirePhotoBridge() {
    var chooseV2 = v2Photo('choose');
    var removeV2 = v2Photo('remove');
    var srcChoose = doc.getElementById(PHOTO.choose);
    var srcRemove = doc.getElementById(PHOTO.remove);

    if (chooseV2 && srcChoose) {
      chooseV2.addEventListener('click', function () {
        /* 同期呼び出し。既存ボタンは inert 下でも click() が通る（focus のみ不可）。 */
        srcChoose.click();
      });
    }
    if (removeV2 && srcRemove) {
      removeV2.addEventListener('click', function () {
        srcRemove.click();
        syncPhotoView();
      });
    }

    /* 既存プレビューの表示状態と画像の差し替えを写す。 */
    var prev = doc.getElementById(PHOTO.preview);
    if (prev && global.MutationObserver) {
      var mo = new global.MutationObserver(function () { syncPhotoView(); });
      mo.observe(prev, { attributes: true, attributeFilter: ['class'] });
      var srcImg = doc.getElementById(PHOTO.image);
      if (srcImg) {
        var moImg = new global.MutationObserver(function () { syncPhotoView(); });
        moImg.observe(srcImg, { attributes: true, attributeFilter: ['src'] });
      }
    }
    syncPhotoView();
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

    /* LIMITED FIX-3（2026-08-19朝）：⋮操作メニュー（details）の閉じ挙動。
       presentation のみ：操作後・Escape・外側クリックで閉じる。
       編集/削除の実体は上の openLegacyBookAction（既存 bookModal 経路）のまま。 */
    var more = doc.querySelector('.v2c07__more');
    if (more) {
      var moreSummary = more.querySelector('summary');
      var closeMore = function () { if (more.open) more.removeAttribute('open'); };
      more.addEventListener('click', function (ev) {
        var t = ev.target;
        while (t && t !== more) {
          if (t.hasAttribute && (t.hasAttribute('data-v2-reader-edit') || t.hasAttribute('data-v2-reader-delete'))) { closeMore(); break; }
          t = t.parentNode;
        }
      });
      doc.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && more.open) {
          closeMore();
          if (moreSummary && moreSummary.focus) moreSummary.focus();
        }
      });
      doc.addEventListener('click', function (ev) {
        if (more.open && !more.contains(ev.target)) closeMore();
      }, true);
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
    wirePhotoBridge();

    doc.documentElement.setAttribute('data-v2-mounted', 'true');
    /* FIX-11：boot 状態はここで解除する。data-v2-mounted が付いた＝
       v2-mount.css が効き始めた瞬間なので、旧UIが見える隙間ができない。
       index.html 側の fail-safe は、ここへ到達しなかった場合だけ働く。 */
    if (typeof global.__v2ClearBooting === 'function') global.__v2ClearBooting();
    else doc.documentElement.removeAttribute('data-v2-booting');
    applyLegacyInert();   /* HARDEN-02：CSS で隠すのと同じ時点で Tab / AT からも外す */
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

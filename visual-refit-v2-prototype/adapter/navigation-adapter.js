/* =============================================================================
 * Visual Refit V2 — navigation-adapter（Phase 3 Step 1）
 * -----------------------------------------------------------------------------
 * 役割
 *   Phase 2 で確定した V2 の 01〜08 と、既存本番の遷移処理をつなぐ最小の橋渡し。
 *   遷移そのものは実装せず、既存関数を呼ぶだけに徹する。
 *
 * 画面対応（Phase 3 Step 1 で確定）
 *   01 表紙          … 表紙（body.experience-open を外した状態）
 *   02 入店後メニュー … #counter
 *   03 感情の棚      … #shelves 内の V2 subview（shelves-index）
 *   04 大棚の中      … #shelves 内の V2 subview（shelf-detail）
 *   05 編纂室        … #desk
 *   06 自分の本棚    … #bookshelf 内の V2 subview（bookshelf-list）
 *   07 一冊を読む    … #bookshelf 内の V2 subview（bookshelf-reader）
 *   08 空状態        … #bookshelf 内の V2 subview（bookshelf-empty）
 *
 * 呼ぶ既存処理（唯一の遷移入口）
 *   enterBookExperience() / returnToCover() / goToPage(id) / goToShelf(shelfId)
 *   いずれもグローバル関数として解決し、存在しない環境では何もしない（no-op）。
 *
 * このAdapterが絶対に持たない責務
 *   - GA4（trackAnalyticsEvent）の直接呼び出し
 *     → view_shelf 等は goToPage() / goToShelf() の内部でのみ発火する
 *   - inert / aria-hidden の付与・除去
 *     → 既存 activateExperiencePage() の契約に委ねる。ここでは一切触らない
 *   - setActivePageTab() の代替実装
 *     → 現在地は .page-tab.active を「読むだけ」で、書き込まない
 *   - storage / DataRepository / IndexedDB / localStorage の読み書き
 *   - 外部通信 / fetch / XHR
 *   - history / hash / pushState / popstate（新 router を作らない）
 *   - prototype の QA 用 ?theme= 処理（本番へ持ち込まない。ここには存在しない）
 *   - 7大棚 → 21感情のデータ変換（Step 3 の emotion-shelf-adapter の責務）
 *   - 本棚データの読み取り・描画（Step 2 以降の責務）
 * ========================================================================== */

(function (global) {
  'use strict';

  // 同じ script が誤って2回評価された場合の保護。
  // 既に定義済みなら何もしない（listener の二重登録・API の作り直しを防ぐ）。
  // singleton framework は導入せず、この早期 return だけで足りる。
  if (global.V2NavigationAdapter) return;

  var doc = global.document;

  /* ---------------------------------------------------------------------------
   * 画面対応表
   * page   … 既存 goToPage() へ渡すID。null は表紙（goToPage を呼ばない）
   * subview… V2 側だけが持つ副画面ID。既存本番には対応概念が無い
   * ------------------------------------------------------------------------ */
  var SCREENS = {
    '01': { page: null,        subview: null },
    '02': { page: 'counter',   subview: null },
    '03': { page: 'shelves',   subview: 'shelves-index' },
    '04': { page: 'shelves',   subview: 'shelf-detail' },
    '05': { page: 'desk',      subview: null },
    '06': { page: 'bookshelf', subview: 'bookshelf-list' },
    '07': { page: 'bookshelf', subview: 'bookshelf-reader' },
    '08': { page: 'bookshelf', subview: 'bookshelf-empty' }
  };

  /* Global Navigation の3項目（Phase 2 正式仕様）。順序も文言もここでは決めない。
     V2 の DOM 側 data-v2-nav の値と、遷移先 V2 画面の対応だけを持つ。 */
  var NAV_TO_SCREEN = {
    'shelves':   '03',
    'desk':      '05',
    'bookshelf': '06'   // 06 / 08 の出し分けは resolveBookshelfScreen フックへ委譲
  };

  /* 既存ページID → Global Navigation の現在地キー。
     counter（02）は3項目のどれでもないため現在地を立てない。 */
  var PAGE_TO_NAV = {
    'shelves':   'shelves',
    'desk':      'desk',
    'bookshelf': 'bookshelf'
  };

  var state = {
    screen: null,     // 最後に go() で指定された V2 画面ID
    subview: null,    // 最後に確定した subview
    mounted: false
  };

  /* 06 / 08 の出し分け。Step 1 では本棚データを読まないため、既定は常に 06。
     Step 2 で bookshelf-adapter が「蔵書0冊なら 08」を注入できるよう関数で差し替え可能にする。
     このAdapter自身は libraryCache / storage を一切参照しない。 */
  var resolveBookshelfScreen = function () { return '06'; };

  /* ---------------------------------------------------------------------------
   * 既存関数の解決（再実装しない）
   * 見つからない環境（prototype 単体・QAハーネス）では静かに false を返す。
   * ------------------------------------------------------------------------ */
  function existing(name) {
    var fn = global[name];
    return (typeof fn === 'function') ? fn : null;
  }

  function callExisting(name, arg) {
    var fn = existing(name);
    if (!fn) return false;
    if (arguments.length > 1) fn(arg); else fn();
    return true;
  }

  /* ---------------------------------------------------------------------------
   * 現在地の同期
   * 既存 setActivePageTab() が更新した .page-tab.active を「読むだけ」。
   * 本番DOMが無い環境では、直前に go() で指定した画面から求める。
   * ------------------------------------------------------------------------ */
  function currentPageId() {
    if (doc) {
      var activeTab = doc.querySelector('.page-tab.active');
      if (activeTab && activeTab.dataset && activeTab.dataset.page) {
        return activeTab.dataset.page;
      }
    }
    var s = SCREENS[state.screen];
    return (s && s.page) ? s.page : null;
  }

  function syncNavCurrent() {
    if (!doc) return null;
    // 01 表紙には Global Navigation が無い。既存 returnToCover() は .page-tab.active を
    // 消さないため、表紙にいる間だけは現在地を明示的に無しへ落とす（本番DOMは書き換えない）。
    var navKey = (state.screen === '01') ? null : (PAGE_TO_NAV[currentPageId()] || null);
    var items = doc.querySelectorAll('[data-v2-nav]');
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var isCurrent = !!navKey && el.getAttribute('data-v2-nav') === navKey;
      el.classList.toggle('v2-navbar__item--current', isCurrent);
      // 現在地は視覚（class）と支援技術（aria-current）を必ず一致させる。
      // 非現在項目は属性自体を削除する（aria-current="false" を残さない）。
      if (isCurrent) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    }
    return navKey;
  }

  /* ---------------------------------------------------------------------------
   * subview の切り替え
   * 既存本番に対応概念が無い V2 固有の状態。ここで持つのは状態のみで、
   * inert / aria-hidden には一切触れない（既存 activateExperiencePage の契約を守る）。
   * ------------------------------------------------------------------------ */
  function applySubview(subview) {
    state.subview = subview || null;
    if (!doc) return;
    var root = doc.documentElement;
    if (state.subview) root.setAttribute('data-v2-subview', state.subview);
    else root.removeAttribute('data-v2-subview');

    var els = doc.querySelectorAll('[data-v2-subview-of]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      el.classList.toggle(
        'is-v2-current-subview',
        el.getAttribute('data-v2-subview-of') === state.subview
      );
    }
  }

  /* ---------------------------------------------------------------------------
   * 遷移
   * 既存 goToPage() / goToShelf() を唯一の入口として維持する。
   * opts.shelfId が与えられた 04 への遷移のみ goToShelf() を使う
   * （7大棚 → 感情ID の変換は Step 3 の emotion-shelf-adapter が行う。ここでは受け取るだけ）。
   * ------------------------------------------------------------------------ */
  function go(target, opts) {
    opts = opts || {};
    var screen = normalizeTarget(target);
    if (!screen) return false;

    var def = SCREENS[screen];
    state.screen = screen;

    if (def.page === null) {
      // 01 表紙へ戻る。既存 returnToCover() のみを使う
      callExisting('returnToCover');
      applySubview(null);
      syncNavCurrent();
      return true;
    }

    // 店内へ入る（冪等）。GA4・inert はこの中と goToPage の中でだけ動く
    callExisting('enterBookExperience');

    if (screen === '04' && opts.shelfId) {
      // 個別棚への遷移は既存 goToShelf() に委ねる（内部で goToPage('shelves') まで行う）
      callExisting('goToShelf', opts.shelfId);
    } else {
      callExisting('goToPage', def.page);
    }

    applySubview(def.subview);
    syncNavCurrent();
    return true;
  }

  /* data-v2-go / data-v2-nav の値を V2 画面IDへ正規化する。
     '01'〜'08' はそのまま、'shelves' / 'desk' / 'bookshelf' は Global Nav の3項目。 */
  function normalizeTarget(target) {
    if (!target) return null;
    var key = String(target);
    if (SCREENS[key]) return key;
    if (key === 'bookshelf') {
      var resolved = String(resolveBookshelfScreen());
      return SCREENS[resolved] ? resolved : '06';
    }
    if (NAV_TO_SCREEN[key]) return NAV_TO_SCREEN[key];
    return null;
  }

  /* ---------------------------------------------------------------------------
   * DAY / NIGHT 一方向ブリッジ
   * 既存 applyNightModeIfNeeded() が付ける body.night を読み取り、
   * V2 の :root[data-v2-theme] へ写すだけ。body 側へは書き戻さない。
   * 時刻判定・保存・URLパラメータ解釈はここでは一切行わない。
   * ------------------------------------------------------------------------ */
  var themeObserver = null;

  function syncTheme() {
    if (!doc || !doc.body) return null;
    var theme = doc.body.classList.contains('night') ? 'night' : 'day';
    doc.documentElement.setAttribute('data-v2-theme', theme);
    return theme;
  }

  function startThemeBridge() {
    if (!doc || !doc.body || themeObserver) return false;
    syncTheme();
    if (typeof global.MutationObserver !== 'function') return false;
    themeObserver = new global.MutationObserver(function () { syncTheme(); });
    themeObserver.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
    return true;
  }

  function stopThemeBridge() {
    if (themeObserver) { themeObserver.disconnect(); themeObserver = null; }
  }

  /* ---------------------------------------------------------------------------
   * 配線
   * [data-v2-go]  … 単発の遷移（01 の入店する / 02 の3カード / 03 のメニューへ / 04 の棚へ戻る）
   * [data-v2-nav] … Global Navigation の3項目
   * どちらも click のみ。キーボード操作は要素本来の挙動（button / Enter・Space）に委ねる。
   * ------------------------------------------------------------------------ */
  function onActivate(ev) {
    var el = ev.currentTarget;
    var target = el.getAttribute('data-v2-go') || el.getAttribute('data-v2-nav');
    var shelfId = el.getAttribute('data-v2-shelf-id') || null;
    if (!target) return;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    go(target, shelfId ? { shelfId: shelfId } : null);
  }

  function mount(root) {
    if (!doc) return false;
    var scope = root || doc;
    var els = scope.querySelectorAll('[data-v2-go], [data-v2-nav]');
    for (var i = 0; i < els.length; i++) {
      els[i].removeEventListener('click', onActivate);
      els[i].addEventListener('click', onActivate);
    }
    state.mounted = true;
    syncNavCurrent();
    return true;
  }

  function unmount(root) {
    if (!doc) return false;
    var scope = root || doc;
    var els = scope.querySelectorAll('[data-v2-go], [data-v2-nav]');
    for (var i = 0; i < els.length; i++) els[i].removeEventListener('click', onActivate);
    state.mounted = false;
    return true;
  }

  global.V2NavigationAdapter = {
    SCREENS: SCREENS,
    NAV_TO_SCREEN: NAV_TO_SCREEN,
    PAGE_TO_NAV: PAGE_TO_NAV,
    go: go,
    mount: mount,
    unmount: unmount,
    syncNavCurrent: syncNavCurrent,
    currentPageId: currentPageId,
    startThemeBridge: startThemeBridge,
    stopThemeBridge: stopThemeBridge,
    syncTheme: syncTheme,
    setBookshelfResolver: function (fn) {
      if (typeof fn === 'function') resolveBookshelfScreen = fn;
    },
    getState: function () {
      return { screen: state.screen, subview: state.subview, mounted: state.mounted };
    }
  };
})(typeof window !== 'undefined' ? window : this);

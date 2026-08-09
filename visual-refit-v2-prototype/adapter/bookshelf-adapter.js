/* =============================================================================
 * Visual Refit V2 — bookshelf-adapter（Phase 3 Step 2）
 * -----------------------------------------------------------------------------
 * 役割は「既存 library の VIEW ADAPTER」のみ。データを所有しない。
 *
 *   1. library の READ-ONLY 取得
 *   2. known-empty / known-nonempty / unknown の判定
 *   3. V2NavigationAdapter への 06 / 08 resolver 供給
 *   4. 06 の READ-ONLY 描画（背表紙・総冊数）
 *   5. refresh / mount / unmount lifecycle
 *   6. QA 用の synthetic fixture 注入
 *
 * これ以外の責務を持たない。特に以下は絶対にしない。
 *   - entries / entry の変更（push/pop/shift/unshift/splice/sort/reverse/delete/代入）
 *   - 複製 library・shadow database・cache storage・派生永続状態の作成
 *   - localStorage / IndexedDB / DataRepository への読み書き
 *   - fetch / XHR / sendBeacon / WebSocket / EventSource
 *   - GA4（trackAnalyticsEvent / gtag / dataLayer）
 *   - history / hash / pushState / popstate / URLSearchParams
 *   - inert / aria-hidden / focus trap の自前実装
 *   - polling / setInterval / storage observer / MutationObserver による library 監視
 *   - main.js の monkey patch、保存フックへの割り込み
 *   - 本を開く（07）／編集／削除／製本
 *   - 本文・題名の console 出力、error message への entry 内容の混入
 *
 * library の取得元
 *   既定は main.js のトップレベル束縛 libraryCache を「読むだけ」。
 *   main.js は classic script なので、別 script からは自由変数として参照できる。
 *   window.libraryCache を新設しない。main.js を変更しない。
 *   取得できない環境では unknown を返し、08（空状態）へは送らない。
 * ========================================================================== */

(function (global) {
  'use strict';

  // 同じ script が誤って2回評価された場合の保護（navigation-adapter と同じ方針）。
  if (global.V2BookshelfAdapter) return;

  var doc = global.document;

  /* ---------------------------------------------------------------------------
   * 状態（すべて一時 ViewModel。永続化しない）
   * ------------------------------------------------------------------------ */
  var STATUS = { OK: 'ok', UNKNOWN: 'unknown' };

  var state = {
    status: STATUS.UNKNOWN,   // 'ok' | 'unknown'
    count: null,              // number | null（unknown のとき null）
    rendered: 0,              // 直近の描画で作った背表紙の数
    mounted: false,
    lastError: null           // エラーの「種類」だけ。entry 内容は入れない
  };

  var fixture = null;         // QA 用 synthetic fixture（本番経路では常に null）
  var customReader = null;    // setLibraryReader() で差し替えた reader

  /* ---------------------------------------------------------------------------
   * library reader
   * 既定 reader は既存 libraryCache を読むだけ。存在しなければ undefined。
   * storage / IndexedDB / DataRepository への直接 fallback は行わない。
   * ------------------------------------------------------------------------ */
  function defaultReader() {
    try {
      /* eslint-disable-next-line no-undef */
      return (typeof libraryCache !== 'undefined') ? libraryCache : undefined;
    } catch (e) {
      return undefined;
    }
  }

  function setLibraryReader(fn) {
    // 関数以外は受け付けない。async reader は今回サポート外として明示的に拒否する
    // （勝手に Promise 対応を増やさない）。
    customReader = (typeof fn === 'function') ? fn : null;
    return customReader !== null;
  }

  /* 読み取り結果を必ず {status, entries} へ正規化する。
     Array 以外（undefined / null / object / 数値 / 文字列 / throw / Promise）は
     すべて unknown。unknown は「0冊」ではない。 */
  function readLibrary() {
    if (fixture !== null) {
      if (Array.isArray(fixture)) {
        state.lastError = null;
        return { status: STATUS.OK, entries: fixture };
      }
      state.lastError = 'fixture_not_array';
      return { status: STATUS.UNKNOWN, entries: [] };
    }
    var raw;
    try {
      raw = customReader ? customReader() : defaultReader();
    } catch (e) {
      state.lastError = 'reader_threw';
      return { status: STATUS.UNKNOWN, entries: [] };
    }
    if (raw && typeof raw.then === 'function') {
      // 非同期 reader は今回サポート外。待たずに unknown 扱いにする
      state.lastError = 'reader_async_unsupported';
      return { status: STATUS.UNKNOWN, entries: [] };
    }
    if (!Array.isArray(raw)) {
      state.lastError = 'reader_not_array';
      return { status: STATUS.UNKNOWN, entries: [] };
    }
    state.lastError = null;
    return { status: STATUS.OK, entries: raw };
  }

  /* ---------------------------------------------------------------------------
   * 06 / 08 の出し分け
   *   0冊        → 08
   *   1冊以上    → 06
   *   unknown    → 06（safe fallback。空と断定しない）
   * 月フィルタ・selectedShelfMonth・category は判定に使わない。
   * unfiled も moyamoya も category 不明も「1冊」として数える。
   * ------------------------------------------------------------------------ */
  function evaluate() {
    var r = readLibrary();
    state.status = r.status;
    state.count = (r.status === STATUS.OK) ? r.entries.length : null;
    return r;
  }

  function resolveScreen() {
    var r = evaluate();
    if (r.status !== STATUS.OK) return '06';
    return r.entries.length === 0 ? '08' : '06';
  }

  /* ---------------------------------------------------------------------------
   * 決定的な見た目（ViewModel）
   * entry から決定的に導く。Math.random を使わない。entry へ書き戻さない。
   * 同じデータからは常に同じ DOM が生成される。
   * ------------------------------------------------------------------------ */
  var SPINE_MIN = 262, SPINE_MAX = 296;   // Phase 2 の背表紙高さレンジに合わせる
  var TITLE_FALLBACK = 'まだ、題名のない本';

  function stableHash(str) {
    var h = 5381, s = String(str == null ? '' : str);
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  /* 表示用の題名。元 entry は書き換えない。
     空文字・null・undefined のみ fallback。空白のみの題名は既存仕様に無い
     正規化を勝手に足さないため、そのまま表示する（消えて見える場合がある）。 */
  function viewTitle(entry) {
    if (!entry || typeof entry !== 'object') return TITLE_FALLBACK;
    var t = entry.title;
    if (t === null || t === undefined) return TITLE_FALLBACK;
    if (typeof t !== 'string') return TITLE_FALLBACK;
    if (t === '') return TITLE_FALLBACK;
    return t;
  }

  function viewSpineHeight(entry, index) {
    var seed = stableHash(
      (entry && typeof entry === 'object' ? (entry.id || '') : '') + '/' +
      (entry && typeof entry === 'object' ? (typeof entry.title === 'string' ? entry.title : '') : '') + '/' +
      index
    );
    return SPINE_MIN + (seed % (SPINE_MAX - SPINE_MIN + 1));
  }

  /* ---------------------------------------------------------------------------
   * 描画（READ-ONLY）
   * entries は slice() も取らずに順に読むだけ。並べ替え・重複除去・修復はしない。
   * 文字はすべて textContent。innerHTML でユーザーデータを扱わない。
   * ------------------------------------------------------------------------ */
  function findRack(scope) {
    return (scope || doc).querySelector('[data-v2-bookshelf="rack"]');
  }
  function findCount(scope) {
    return (scope || doc).querySelector('[data-v2-bookshelf="count"]');
  }

  function clearSpines(rack) {
    var old = rack.querySelectorAll('[data-v2-book]');
    for (var i = 0; i < old.length; i++) {
      if (old[i].parentNode) old[i].parentNode.removeChild(old[i]);
    }
  }

  function buildSpine(entry, index) {
    var spine = doc.createElement('span');
    spine.className = 'v2-shelf__spine';
    spine.setAttribute('data-v2-book', String(index));
    spine.style.height = 'calc(' + viewSpineHeight(entry, index) + ' * var(--v2-px))';

    var title = doc.createElement('span');
    title.className = 'v2-shelf__spine-title';
    title.textContent = viewTitle(entry);   // textContent のみ。HTML として解釈させない
    spine.appendChild(title);
    return spine;
  }

  function render(scope) {
    if (!doc) return { ok: false, reason: 'no_document' };
    var rack = findRack(scope);
    var countEl = findCount(scope);
    if (!rack && !countEl) return { ok: false, reason: 'no_target' };

    var r = evaluate();

    if (countEl) {
      // 中立表示のみ。達成・目標・残り冊数の表現は作らない
      countEl.textContent = (r.status === STATUS.OK) ? (r.entries.length + '冊') : '';
    }

    if (!rack) {
      state.rendered = 0;
      return { ok: true, reason: 'count_only', status: r.status };
    }

    clearSpines(rack);
    var made = 0;
    if (r.status === STATUS.OK) {
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < r.entries.length; i++) {
        try {
          frag.appendChild(buildSpine(r.entries[i], i));
          made++;
        } catch (e) {
          // entry の内容はログにもエラーにも載せない。位置だけを残す
          state.lastError = 'render_entry_failed@' + i;
        }
      }
      // 入口スロット（ことばを残す）より前に差し込み、棚の並び順を保つ
      var addSlot = rack.querySelector('.v2-shelf__add');
      if (addSlot) rack.insertBefore(frag, addSlot);
      else rack.appendChild(frag);
    }
    state.rendered = made;
    return { ok: true, status: r.status, rendered: made };
  }

  /* ---------------------------------------------------------------------------
   * refresh
   * reader 再取得 → 判定更新 → 06 再描画 のみ。
   * polling / timer / observer は持たない。外部（製本完了など）から呼ばれる想定。
   * ------------------------------------------------------------------------ */
  function refresh(scope) {
    var r = render(scope);
    syncNavigationResolver();
    return { status: state.status, count: state.count, rendered: state.rendered, render: r };
  }

  /* ---------------------------------------------------------------------------
   * Navigation Adapter 連携
   * 既存 setBookshelfResolver() のみを使う。V2NavigationAdapter が無くても落ちない。
   * ------------------------------------------------------------------------ */
  function syncNavigationResolver() {
    var nav = global.V2NavigationAdapter;
    if (!nav || typeof nav.setBookshelfResolver !== 'function') return false;
    nav.setBookshelfResolver(resolveScreen);
    return true;
  }

  /* ---------------------------------------------------------------------------
   * lifecycle
   * mount / unmount は何度呼ばれても安全。listener を持たないため二重登録もしない
   * （06 の操作要素は navigation-adapter が一元管理する）。
   * ------------------------------------------------------------------------ */
  function mount(scope) {
    state.mounted = true;
    syncNavigationResolver();
    render(scope);
    return true;
  }

  function unmount(scope) {
    state.mounted = false;
    if (doc) {
      var rack = findRack(scope);
      if (rack) clearSpines(rack);
      var countEl = findCount(scope);
      if (countEl) countEl.textContent = '';
    }
    state.rendered = 0;
    return true;
  }

  /* ---------------------------------------------------------------------------
   * QA 用 synthetic fixture
   * 本番経路では使わない。fixture を入れている間だけ reader より優先される。
   * ------------------------------------------------------------------------ */
  function setFixture(entries) {
    fixture = (entries === null || entries === undefined) ? null : entries;
    return fixture;
  }
  function clearFixture() { fixture = null; }

  global.V2BookshelfAdapter = {
    STATUS: STATUS,
    TITLE_FALLBACK: TITLE_FALLBACK,
    setLibraryReader: setLibraryReader,
    readLibrary: readLibrary,
    resolveScreen: resolveScreen,
    render: render,
    refresh: refresh,
    mount: mount,
    unmount: unmount,
    connectNavigation: syncNavigationResolver,
    setFixture: setFixture,
    clearFixture: clearFixture,
    viewTitle: viewTitle,
    getState: function () {
      return {
        status: state.status,
        count: state.count,
        rendered: state.rendered,
        mounted: state.mounted,
        lastError: state.lastError,
        usingFixture: fixture !== null,
        usingCustomReader: customReader !== null
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);

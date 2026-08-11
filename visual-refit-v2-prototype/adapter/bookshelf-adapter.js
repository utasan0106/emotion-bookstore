/* =============================================================================
 * Visual Refit V2 — bookshelf-adapter（Phase 3 Step 2 / Step 3C）
 * -----------------------------------------------------------------------------
 * 役割は「既存 library の VIEW ADAPTER」のみ。データを所有しない。
 *
 *   1. library の READ-ONLY 取得
 *   2. known-empty / known-nonempty / unknown の判定
 *   3. V2NavigationAdapter への 06 / 08 resolver 供給
 *   4. 06 の READ-ONLY 描画（背表紙・総冊数）
 *   5. refresh / mount / unmount lifecycle
 *   6. QA 用の synthetic fixture 注入
 *   7. selectedBookId の保持と 07 の READ-ONLY 描画（Step 3C）
 *
 * 【selectedBookId（Step 3C・CEO決裁）】
 *   ページ内メモリのみ。localStorage / IndexedDB / sessionStorage / URL query /
 *   history state へ新規保存しない。source of truth は常に既存 library で、
 *   表示のたびに id から引き直す（entry の clone を保持・書き戻ししない）。
 *   本が見つからない場合は偽の本を描かず、既存 resolveScreen() の判断で 06 / 08 へ戻す。
 *
 * 【07 の field mapping（既存 openBook の挙動を再現する。迂回しない）】
 *   title  … 既存 fallback（まだ、題名のない本）を再利用
 *   story  … 本文。既存 openBook は sealed でも無条件に表示するため、ここでも隠さない
 *   sealed … 既存と同じく「日付の隣の注記」としてのみ扱う。閲覧制御ではない
 *   note   … 既存 openBook が「あれば表示」する仕様のため踏襲
 *   image  … 既存保存済みの data: URI のときだけ表示（新規 network を発生させない）
 *   date / category … 既存 formatDate / CATEGORIES label 相当の読み取りのみ
 *   tweetUrl … 表示しない（CEO決裁）
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
    selectedBookId: null,     // 07 で開いている本のID。メモリのみ・永続化しない
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

  /* 一冊はネイティブ button（Step 3C）。Enter / Space は button 本来の挙動に委ねる。
     role="button" / tabindex / 独自 keydown は使わない。入れ子の操作要素も作らない。
     aria-label は題名までに留める（本文・棚名・日付は読み上げ名に混ぜない）。
     Beta0（MASTER HANDOFF v0.9）：06 は背表紙の帯ではなく「私的蔵書の一冊」
     カードとして描く。題名に加え、補助情報として日付と気持ちラベルを添える
     （どちらも既存 entry の読み取りのみ。stats / 件数比較は作らない）。 */
  function buildSpine(entry, index) {
    var spine = doc.createElement('button');
    spine.type = 'button';
    spine.className = 'v2-shelf__spine';
    spine.setAttribute('data-v2-book', String(index));
    var id = (entry && typeof entry === 'object' && entry.id !== null && entry.id !== undefined)
      ? String(entry.id) : '';
    if (id) spine.setAttribute('data-v2-book-id', id);

    /* 表紙面。写真素材は使わない（無地。ASSET REQUIRED は報告済み） */
    var cover = doc.createElement('span');
    cover.className = 'v2-shelf__cover';
    cover.setAttribute('aria-hidden', 'true');
    spine.appendChild(cover);

    var title = doc.createElement('span');
    title.className = 'v2-shelf__spine-title';
    title.textContent = viewTitle(entry);   // textContent のみ。HTML として解釈させない
    spine.appendChild(title);

    var dateText = viewDate(entry);
    if (dateText) {
      var date = doc.createElement('span');
      date.className = 'v2-shelf__spine-date';
      date.textContent = dateText;
      spine.appendChild(date);
    }

    var emotionText = shelfLabelOf(entry);
    if (emotionText) {
      var emotion = doc.createElement('span');
      emotion.className = 'v2-shelf__spine-emotion';
      emotion.textContent = emotionText;
      spine.appendChild(emotion);
    }

    spine.setAttribute('aria-label', viewTitle(entry) + 'を開く');
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

  /* ===========================================================================
   * Step 3C — selectedBookId と 07（一冊を読む）
   * ======================================================================== */

  /* source of truth は常に既存 library。id から毎回引き直し、clone を保持しない。 */
  function getSelectedEntry() {
    if (state.selectedBookId === null) return null;
    var r = readLibrary();
    if (r.status !== STATUS.OK) return null;
    for (var i = 0; i < r.entries.length; i++) {
      var e = r.entries[i];
      if (!e || typeof e !== 'object') continue;
      if (e.id === null || e.id === undefined) continue;
      if (String(e.id) === state.selectedBookId) return e;
    }
    return null;
  }

  /* 本を選んで 07 へ。06⇄07 は同じ既存ページ（#bookshelf）内の subview 移動なので
     subviewOnly を使う（実測：既存 route では activateExperiencePage が毎回走るが、
     subviewOnly では 0。GA4 / storage / network はどちらも 0）。
     04（#shelves）から呼ばれた場合は currentPageId が一致しないため、
     navigation-adapter が従来どおり既存 goToPage('bookshelf') で遷移する。 */
  function selectBook(bookId, scope) {
    if (bookId === null || bookId === undefined || bookId === '') {
      state.lastError = 'select_missing_id';
      return false;
    }
    state.selectedBookId = String(bookId);
    var nav = global.V2NavigationAdapter;
    if (nav && typeof nav.go === 'function') nav.go('07', { subviewOnly: true });
    renderReader(scope);
    return true;
  }

  function clearSelectedBook(scope) {
    state.selectedBookId = null;
    renderReader(scope);
    return true;
  }

  /* 07 → 06。library が 0 冊なら既存 resolveScreen() の判断に従って 08 へ。
     新しい empty ロジックは作らない。browser history には依存しない。 */
  function leaveReader(scope) {
    state.selectedBookId = null;
    var target = resolveScreen();          // '06' or '08'（unknown は '06'）
    var nav = global.V2NavigationAdapter;
    if (nav && typeof nav.go === 'function') nav.go(target, { subviewOnly: true });
    renderReader(scope);
    render(scope);
    return target;
  }

  /* ---------------------------------------------------------------------------
   * 07 の READ-ONLY 描画
   * 文字はすべて textContent。既存 openBook の扱いを再現し、迂回しない。
   * ------------------------------------------------------------------------ */
  var STORE_LABEL = 'この端末';

  function readerEl(key, scope) {
    return (scope || doc).querySelector('[data-v2-reader="' + key + '"]');
  }

  /* 棚名。既存 CATEGORIES の label を読むだけ。未収納（unfiled）や不明IDは空にする。 */
  function shelfLabelOf(entry) {
    if (!entry || typeof entry.category !== 'string') return '';
    var cats;
    try {
      /* eslint-disable-next-line no-undef */
      cats = (typeof CATEGORIES !== 'undefined' && Array.isArray(CATEGORIES)) ? CATEGORIES : null;
    } catch (e) { cats = null; }
    if (!cats && global.V2EmotionShelfAdapter &&
        typeof global.V2EmotionShelfAdapter.readCategories === 'function') {
      cats = global.V2EmotionShelfAdapter.readCategories();
    }
    if (!cats) return '';
    for (var i = 0; i < cats.length; i++) {
      if (cats[i] && cats[i].id === entry.category && typeof cats[i].label === 'string') {
        return cats[i].label;
      }
    }
    return '';
  }

  function viewDate(entry) {
    if (!entry || typeof entry.date !== 'string' || !entry.date) return '';
    var d = new Date(entry.date);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  /* 既存 openBook と同じ意味づけ。sealed は「日付の隣の注記」であり閲覧制御ではない。
     したがって sealed でも本文を隠さないし、解除UIも作らない。 */
  var SEALED_NOTE = '以前を振り返って綴った一冊';

  function viewStory(entry) {
    if (!entry || typeof entry.story !== 'string') return '';
    return entry.story;
  }

  /* 既存保存済みの data: URI のときだけ表示する。http(s) 等は新規 network を
     発生させうるため描かない（既存データは書き換えない。表示を控えるだけ）。 */
  function safeImage(entry) {
    if (!entry || typeof entry.image !== 'string' || !entry.image) return '';
    return /^data:image\//i.test(entry.image) ? entry.image : '';
  }

  function charCount(str) {
    if (typeof str !== 'string' || !str) return 0;
    // 絵文字・サロゲートペアを1文字として数える
    return Array.from(str).length;
  }

  /* 接続済みの欄なので、値が無いときは「中立プレースホルダー枠」を残さない。
     枠だけが残ると、値が無いのではなく取得に失敗したように見えるため、欄ごと畳む。
     静的シェル（screens/07-reader.html を単体で開いた場合）は Adapter を読み込まないので
     Phase 1 と同じプレースホルダー表示のまま変わらない。 */
  function setText(el, text) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    if (text) el.appendChild(doc.createTextNode(text));
    el.classList.remove('v2-placeholder');
    el.classList.toggle('is-v2-empty', !text);
  }

  function renderReader(scope) {
    if (!doc) return { ok: false, reason: 'no_document' };
    var titleEl = readerEl('title', scope);
    var bodyEl = readerEl('body', scope);
    if (!titleEl && !bodyEl) return { ok: false, reason: 'no_target' };

    var entry = getSelectedEntry();

    // 選択されていない／本が見つからない：偽の本を描かず、私的データも DOM に残さない
    if (!entry) {
      setText(titleEl, '');
      setText(bodyEl, '');
      setText(readerEl('shelf', scope), '');
      setText(readerEl('sealed', scope), '');
      setText(readerEl('date', scope), '');
      setText(readerEl('chars', scope), '');
      setText(readerEl('store', scope), '');
      setText(readerEl('note', scope), '');
      hideCover(scope);
      var noteBox = readerEl('note-box', scope);
      if (noteBox) noteBox.setAttribute('hidden', '');
      return { ok: true, found: false, selectedBookId: state.selectedBookId };
    }

    var story = viewStory(entry);
    setText(titleEl, viewTitle(entry));
    setText(bodyEl, story);
    setText(readerEl('shelf', scope), shelfLabelOf(entry));
    setText(readerEl('sealed', scope), entry.sealed ? SEALED_NOTE : '');
    setText(readerEl('date', scope), viewDate(entry));
    setText(readerEl('chars', scope), String(charCount(story)) + '字');
    setText(readerEl('store', scope), STORE_LABEL);

    var noteText = (typeof entry.note === 'string') ? entry.note : '';
    var box = readerEl('note-box', scope);
    setText(readerEl('note', scope), noteText);
    if (box) {
      if (noteText) box.removeAttribute('hidden');
      else box.setAttribute('hidden', '');
    }

    applyCover(safeImage(entry), viewTitle(entry), scope);
    // 長文でも読み位置を先頭から始める（既存の保存・状態には触れない）
    if (bodyEl && typeof bodyEl.scrollTop === 'number') bodyEl.scrollTop = 0;

    return { ok: true, found: true, selectedBookId: state.selectedBookId,
             chars: charCount(story), hasNote: !!noteText, hasImage: !!safeImage(entry),
             sealed: !!entry.sealed };
  }

  function hideCover(scope) {
    var cover = readerEl('cover', scope);
    if (!cover) return;
    var img = cover.querySelector('img');
    if (img && img.parentNode) img.parentNode.removeChild(img);
    cover.classList.add('v2-placeholder');
  }

  function applyCover(src, alt, scope) {
    var cover = readerEl('cover', scope);
    if (!cover) return;
    var img = cover.querySelector('img');
    if (!src) {
      if (img && img.parentNode) img.parentNode.removeChild(img);
      cover.classList.add('v2-placeholder');
      return;
    }
    if (!img) {
      img = doc.createElement('img');
      img.className = 'v2-reader__cover-img';
      cover.appendChild(img);
    }
    img.alt = alt ? (alt + 'の写真') : '';
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    cover.classList.remove('v2-placeholder');
  }

  /* ---------------------------------------------------------------------------
   * refresh
   * reader 再取得 → 判定更新 → 06 再描画 のみ。
   * polling / timer / observer は持たない。外部（製本完了など）から呼ばれる想定。
   * ------------------------------------------------------------------------ */
  function refresh(scope) {
    var r = render(scope);
    var rd = renderReader(scope);
    syncNavigationResolver();
    return { status: state.status, count: state.count, rendered: state.rendered,
             render: r, reader: rd };
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
  /* 背表紙は再描画で作り直されるため、棚コンテナ側で1つだけ購読する
     （背表紙ごとに listener を付けない＝多重登録が構造的に起きない）。
     入口スロット「ことばを残す」は data-v2-go を持つので navigation-adapter が担当する。 */
  function delegateSpine(ev) {
    var t = ev.target;
    while (t && t !== ev.currentTarget) {
      if (t.getAttribute && t.getAttribute('data-v2-book-id')) {
        selectBook(t.getAttribute('data-v2-book-id'));
        return;
      }
      t = t.parentNode;
    }
  }

  function onReaderBack() { leaveReader(); }

  function mount(scope) {
    state.mounted = true;
    syncNavigationResolver();
    if (doc) {
      var rack = findRack(scope);
      if (rack) {
        rack.removeEventListener('click', delegateSpine);
        rack.addEventListener('click', delegateSpine);
      }
      var backs = (scope || doc).querySelectorAll('[data-v2-reader-back]');
      for (var i = 0; i < backs.length; i++) {
        backs[i].removeEventListener('click', onReaderBack);
        backs[i].addEventListener('click', onReaderBack);
      }
    }
    render(scope);
    renderReader(scope);
    return true;
  }

  function unmount(scope) {
    state.mounted = false;
    if (doc) {
      var rack = findRack(scope);
      if (rack) {
        rack.removeEventListener('click', delegateSpine);
        clearSpines(rack);
      }
      var backs = (scope || doc).querySelectorAll('[data-v2-reader-back]');
      for (var i = 0; i < backs.length; i++) backs[i].removeEventListener('click', onReaderBack);
      var countEl = findCount(scope);
      if (countEl) countEl.textContent = '';
      // 私的データを DOM に残さない
      state.selectedBookId = null;
      renderReader(scope);
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
    SEALED_NOTE: SEALED_NOTE,
    STORE_LABEL: STORE_LABEL,
    selectBook: selectBook,
    clearSelectedBook: clearSelectedBook,
    leaveReader: leaveReader,
    getSelectedEntry: getSelectedEntry,
    renderReader: renderReader,
    getState: function () {
      return {
        status: state.status,
        count: state.count,
        rendered: state.rendered,
        selectedBookId: state.selectedBookId,
        mounted: state.mounted,
        lastError: state.lastError,
        usingFixture: fixture !== null,
        usingCustomReader: customReader !== null
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);

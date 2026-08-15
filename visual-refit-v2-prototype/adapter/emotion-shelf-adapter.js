/* =============================================================================
 * Visual Refit V2 — emotion-shelf-adapter（Phase 3 Step 3A / 3A.1 / 3B.1）
 * -----------------------------------------------------------------------------
 * 役割は「既存21感情データ＋既存 library の VIEW ADAPTER」のみ。データを所有しない。
 *
 *   1. 7大棚＋特別入口「まだ名前がない」の READ-ONLY mapping を持つ
 *   2. 大棚ID → 既存感情ID配列 の解決（CATEGORIES は読むだけ）
 *   3. 03 → 04 の入口文脈（originMajorShelfId）をメモリ上だけで保持する
 *   4. 04 の READ-ONLY 描画（大棚名・説明・その大棚の感情語）
 *   5. 03 → 04 遷移は既存 goToShelf() / V2NavigationAdapter 経由のみ
 *   6. 04 の4領域（ことば／いま／作品／自分の本）の DOM 切替（Step 3B.1）
 *   7. 「自分の本」の READ-ONLY 文脈絞り込み描画（Step 3B.1）
 *   8. QA 用の synthetic fixture 注入
 *
 * これ以外の責務を持たない。特に以下は絶対にしない。
 *   - CATEGORIES / TEXTURE_GROUPS の変更・複製保存・並べ替え・重複除去
 *   - library / entry の変更（push/pop/splice/sort/reverse/delete/代入）
 *   - localStorage / IndexedDB / DataRepository への読み書き
 *   - fetch / XHR / sendBeacon / WebSocket / EventSource
 *   - GA4（trackAnalyticsEvent / gtag / dataLayer）
 *   - history / hash / pushState / replaceState / URLSearchParams への永続化
 *   - setInterval / polling / observer による監視
 *   - inert / aria-hidden / focus trap の自前実装
 *   - 作品API・Bluesky・「いま」データ取得・自動仕入れ
 *   - QUOTE_POOL / QUOTE_POOL_EN / STORIES_POOL / BOOK_POOL / MUSIC_QUERIES /
 *     RECOMMEND_TEMPLATES / DETOUR_POOL の参照
 *   - FICTIONAL_SHELF_STORIES_ENABLED の読み替え・上書き
 *   - activeCategory から「どの大棚だったか」を逆引きすること
 *     （shitto が複数配架のため逆引きは原理的に一意にならない）
 *
 * 【4領域（Step 3B.1・CEO決裁）】
 *   領域切替は 04 内部の DOM 切替だけ。goToPage / goToShelf /
 *   NavigationAdapter の subviewOnly は呼ばない。
 *   GA4 発火なし・storage write なし・network なし。初期表示は「ことば」。
 *   ARIA は WAI-ARIA tab pattern を部分実装せず、
 *   button + aria-pressed + hidden panel の単純構造を使う。
 *
 * 【「自分の本」の文脈絞り込み（Step 3B.1・CEO決裁）】
 *   A. activeEmotionId あり      → entry.category === activeEmotionId（完全一致）
 *   B. activeEmotionId なし＋大棚 → その大棚の emotions に含まれる category
 *   C. origin = all              → 既存21感情のいずれかに属する category
 *   D. origin = まだ名前がない    → category === 'moyamoya' のみ
 *   E. category === 'unfiled'    → 04 では表示しない（06 で引き続きアクセス可能）
 *   shitto は「惹かれる」「ぶつかる」の両文脈に出る（正式仕様・重複バグではない）。
 *   ただし同一パネル内は entry.id で dedupe する。
 *   大棚横断の合算冊数・総蔵書数との比較UIは作らない。
 *
 * 【7大棚 mapping（CEO 決裁 2026-08-09・正本）】
 *   大棚は固定所属 taxonomy ではなく、感情へ入る「編集上の入口」である。
 *   shitto（嫉妬）は「惹かれる」「ぶつかる」の両方へ配架する（重複ミスではない）。
 *   canonical priority は primary=惹かれる / secondary=ぶつかる。
 *   ただし 03→04 で利用者が実際に通った入口文脈が常に canonical priority より優先される。
 * ========================================================================== */

(function (global) {
  'use strict';

  // 同じ script が2回評価された場合の保護（他の Adapter と同じ方針）
  if (global.V2EmotionShelfAdapter) return;

  var doc = global.document;

  /* ---------------------------------------------------------------------------
   * Localization bridge
   * 既存 main.js の t() / categoryLabelFor() / categoryDefFor() / currentLang() を
   * 唯一の翻訳源として使う。V2 専用の第二 i18n 辞書は作らない。
   * main.js を読み込まない prototype harness では JA フォールバックがそのまま出る
   * （従来の表示と同一）ため、harness の挙動は変わらない。
   * ------------------------------------------------------------------------ */
  function T(key, ja) {
    if (typeof global.t === 'function') {
      var v = global.t(key);
      if (typeof v === 'string' && v !== key) return v;
    }
    return ja;
  }
  function TF(key, ja, vars) {
    var s = T(key, ja);
    for (var k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) {
        s = s.split('{' + k + '}').join(vars[k]);
      }
    }
    return s;
  }
  function isEN() {
    return (typeof global.currentLang === 'function') && global.currentLang() === 'en';
  }
  function catLabel(cat) {
    if (!cat) return '';
    if (typeof global.categoryLabelFor === 'function') return global.categoryLabelFor(cat);
    return cat.label || '';
  }
  function catDef(cat) {
    if (!cat) return '';
    if (typeof global.categoryDefFor === 'function') return global.categoryDefFor(cat);
    return cat.def || '';
  }


  /* ---------------------------------------------------------------------------
   * 7大棚 mapping（正本）
   * emotions の順序は決裁順のまま保持する。alphabetical sort 等は行わない。
   * lead は Phase 3 Step 3A.1 で CEO 決裁された正式コピー
   *（ざわつく・まだ名前がない は Phase 2 からの承認済み文をそのまま維持）。
   * ------------------------------------------------------------------------ */
  var MAJOR_SHELVES = [
    { id: 'hazumu',   name: '心が弾む',      emotions: ['ureshii', 'wakuwaku', 'hokorashii'],
      lead: 'うれしさや期待が、\n内側で弾んでいるあたり。' },
    { id: 'atatamaru', name: '心があたたまる', emotions: ['ando', 'kansha', 'itooshii'],
      lead: 'ほっとしたり、大切に思ったり、\n内側がやわらぐあたり。' },
    { id: 'hikareru', name: '惹かれる',      emotions: ['akogare', 'shitto', 'natsukashii'],
      lead: '自分の外にあるものへ、\n心が向いていくあたり。' },
    { id: 'shizumu',  name: '沈む',          emotions: ['kanashii', 'kodoku', 'gakkari'],
      lead: '気持ちの重さが、\n静かに残っているあたり。' },
    { id: 'zawatsuku', name: 'ざわつく',     emotions: ['fuan', 'aseri', 'odoroki'],
      lead: '先が読めないときや、気持ちが落ち着かず\n動きつづけるあたり。' },
    { id: 'butsukaru', name: 'ぶつかる',     emotions: ['ikari', 'kuyashii', 'shitto'],
      lead: '収まりきらない気持ちが、\n内側でぶつかるあたり。' },
    { id: 'miwohiku',  name: '身を引く',     emotions: ['hazukashii', 'ushirometai', 'keno'],
      lead: '少し離れたい、隠れたい。\nそんな距離が生まれるあたり。' }
  ];

  /* 大棚の表示名 / lead は既存 MESSAGES の V2 キーから引く。
     辞書が無い環境（harness）では定義そのままの JA が出る。 */
  function shelfKeyOf(id) { return String(id).split('-').join(''); }
  function shelfName(def) {
    if (!def) return '';
    return T('v2Shelf' + shelfKeyOf(def.id), def.name);
  }
  function shelfLead(def) {
    if (!def) return '';
    return T('v2ShelfLead' + shelfKeyOf(def.id), def.lead);
  }

  /* 特別入口。8番目の大棚ではない */
  var CROSSWAY = {
    id: 'namae-ga-nai', name: 'まだ名前がない', emotions: ['moyamoya'],
    lead: 'まだ、どのことばにも\n決めたくないときに。'
  };

  /* 「すべての感情語を見る」。既存21感情を1回ずつ。所属を作らない */
  var ALL_CONTEXT_ID = 'all';

  /* 複数配架の canonical priority。入口文脈が無いときだけ使う */
  var CANONICAL_PRIMARY = { shitto: 'hikareru' };

  /* 04 の4領域。順序は Core Ver.2 の IA のまま。増やさない・減らさない */
  var REGIONS = ['kotoba', 'ima', 'sakuhin', 'jibun'];
  var DEFAULT_REGION = 'kotoba';

  /* 既存 main.js の UNFILED_CATEGORY_ID と同じ値。04 では常に除外する。
     既存定数を import できない環境でも判定が壊れないようリテラルで持つが、
     この値で既存データを書き換えることは一切しない（読み取り比較のみ）。 */
  var UNFILED_ID = 'unfiled';

  /* 04 は 06「自分の本棚」の縮小コピーにしない。まず3冊まで */
  var MY_BOOKS_LIMIT = 3;

  /* 題名が無い本の表示名。bookshelf-adapter と同じ文言を使う
     （bookshelf-adapter があればそちらの実装を優先して呼ぶ） */
  function titleFallback() { return T('v2BookTitleFallback', 'まだ、題名のない本'); }

  /* ---------------------------------------------------------------------------
   * 一時状態（メモリのみ。永続化しない）
   * ------------------------------------------------------------------------ */
  var state = {
    originMajorShelfId: null,  // 03 から通った入口。'all' も入りうる
    activeEmotionId: null,     // 04 で選択中の感情ID
    activeRegion: DEFAULT_REGION, // 04 の選択中の領域（ことば／いま／作品／自分の本）
    lastOriginTriggerId: null, // 04→03 で focus を戻す先（DOM の識別子のみ）
    returnToScreen: null,      // 04 に入る直前に見えていた V2 画面（戻り先）
    mounted: false,
    lastError: null
  };

  var fixtureCategories = null;   // QA 用。本番経路では常に null

  /* ---------------------------------------------------------------------------
   * CATEGORIES の READ-ONLY 参照
   * data.js のトップレベル束縛を自由変数として読むだけ。複製保存しない。
   * ------------------------------------------------------------------------ */
  function readCategories() {
    if (fixtureCategories !== null) {
      return Array.isArray(fixtureCategories) ? fixtureCategories : null;
    }
    try {
      /* eslint-disable-next-line no-undef */
      return (typeof CATEGORIES !== 'undefined' && Array.isArray(CATEGORIES)) ? CATEGORIES : null;
    } catch (e) {
      return null;
    }
  }

  function findCategory(id) {
    var cats = readCategories();
    if (!cats) return null;
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      if (c && c.id === id) return c;
    }
    return null;
  }

  /* ---------------------------------------------------------------------------
   * mapping の解決（すべて新しい配列を返す。元データは触らない）
   * ------------------------------------------------------------------------ */
  function getMajorShelves() {
    return MAJOR_SHELVES.map(function (s) {
      return { id: s.id, name: shelfName(s), lead: shelfLead(s), emotions: s.emotions.slice() };
    });
  }

  function getShelfDef(shelfId) {
    if (shelfId === CROSSWAY.id) return CROSSWAY;
    for (var i = 0; i < MAJOR_SHELVES.length; i++) {
      if (MAJOR_SHELVES[i].id === shelfId) return MAJOR_SHELVES[i];
    }
    return null;
  }

  /* 大棚に属する感情IDの配列。重複配架された感情も消さない（順序も決裁順のまま）。 */
  function emotionIdsOf(shelfId) {
    if (shelfId === ALL_CONTEXT_ID) {
      var cats = readCategories();
      if (!cats) return [];
      // 既存21感情を1回ずつ。データ順をそのまま使い、並べ替えない
      var ids = [], seen = {};
      for (var i = 0; i < cats.length; i++) {
        var c = cats[i];
        if (!c || typeof c.id !== 'string') continue;
        if (seen[c.id]) continue;
        seen[c.id] = true;
        ids.push(c.id);
      }
      return ids;
    }
    var def = getShelfDef(shelfId);
    return def ? def.emotions.slice() : [];
  }

  /* 入口文脈が無い状態で感情へ到達した場合の canonical fallback。
     複数配架でない感情は、最初に見つかった大棚を返す。 */
  function canonicalShelfOf(emotionId) {
    if (CANONICAL_PRIMARY[emotionId]) return CANONICAL_PRIMARY[emotionId];
    if (CROSSWAY.emotions.indexOf(emotionId) !== -1) return CROSSWAY.id;
    for (var i = 0; i < MAJOR_SHELVES.length; i++) {
      if (MAJOR_SHELVES[i].emotions.indexOf(emotionId) !== -1) return MAJOR_SHELVES[i].id;
    }
    return null;
  }

  /* 表示に使う大棚文脈。入口文脈があれば必ずそれを優先する。 */
  function effectiveShelfId() {
    if (state.originMajorShelfId) return state.originMajorShelfId;
    if (state.activeEmotionId) return canonicalShelfOf(state.activeEmotionId);
    return null;
  }

  /* ---------------------------------------------------------------------------
   * 03 → 04
   * originMajorShelfId をメモリへ保持し、既存 goToShelf() 経由で 04 へ移動する。
   * URL / history / storage には一切書かない。
   * ------------------------------------------------------------------------ */
  function enterShelf(shelfId, opts) {
    opts = opts || {};
    var ids = emotionIdsOf(shelfId);
    state.originMajorShelfId = shelfId || null;
    // 「大棚を覗く」と「感情語を選ぶ」は別の行為。入口では感情語を自動選択しない。
    // 1語しかない「まだ名前がない」でも同じ扱いにする。
    state.activeEmotionId = null;
    // 大棚に入り直したら領域も初期状態（ことば）へ戻す。
    // 前の棚で「自分の本」を見ていた状態を、別の棚へ持ち越さない。
    state.activeRegion = DEFAULT_REGION;
    state.lastOriginTriggerId = opts.triggerId || null;

    var nav = global.V2NavigationAdapter;
    if (nav && typeof nav.go === 'function') {
      // 入口では shelfId を渡さない＝既存 goToShelf() を呼ばない。
      // さらに 03 と 04 は同じ既存ページ（#shelves）の subview なので、
      // 既に #shelves にいる場合は goToPage() も呼ばず subview だけを切り替える。
      // これにより「大棚を覗くだけ」で view_shelf・既存 category 再描画・
      // その派生の storage / 外部通信が一切起きない。
      nav.go('04', { subviewOnly: true });
    }
    render();
    return { shelfId: state.originMajorShelfId, emotions: ids, active: state.activeEmotionId };
  }

  /* 04 内で感情語を選ぶ。大棚文脈は変えない（入口文脈を保持したまま）。
     利用者が明示的に感情語 button を押したときだけ既存 goToShelf() が走り、
     既存の view_shelf / storage / 外部通信が既存どおりに発生する。
     Adapter からは新イベント・新 storage・新通信を一切追加しない。 */
  function selectEmotion(emotionId) {
    var ids = emotionIdsOf(effectiveShelfId());
    if (ids.indexOf(emotionId) === -1 && emotionId !== null) {
      // 文脈外の感情は選択しない（勝手に文脈を作り替えない）
      state.lastError = 'emotion_not_in_context';
      return false;
    }
    state.activeEmotionId = emotionId;
    state.lastError = null;
    var nav = global.V2NavigationAdapter;
    if (nav && typeof nav.go === 'function' && emotionId) {
      nav.go('04', { shelfId: emotionId });
    }
    render();
    return true;
  }

  /* 04 → 03。入口文脈は捨てるが、focus を戻す先だけ返す。 */
  function leaveToIndex() {
    var triggerId = state.lastOriginTriggerId;
    state.originMajorShelfId = null;
    state.activeEmotionId = null;
    var nav = global.V2NavigationAdapter;
    // 04 → 03 も同じ既存ページ内の subview 移動。既存関数は呼ばない。
    if (nav && typeof nav.go === 'function') nav.go('03', { subviewOnly: true });
    restoreFocus(triggerId);
    state.lastOriginTriggerId = null;
    return triggerId;
  }

  /* focus 復帰。inert / aria-hidden / focus trap には触れない。
     対象が見つからない・focus 不能なら静かに何もしない。 */
  function restoreFocus(triggerId) {
    if (!doc || !triggerId) return false;
    var el = doc.querySelector('[data-v2-shelf-trigger="' + triggerId + '"]');
    if (!el || typeof el.focus !== 'function') return false;
    try { el.focus(); } catch (e) { return false; }
    return doc.activeElement === el;
  }

  /* ---------------------------------------------------------------------------
   * 04「ことば」READ-ONLY 描画（個別感情の 意味 / ニュアンス / 近い言葉）
   * - 意味は既存 CATEGORIES.def（canonical）を読むだけ
   * - ニュアンス / 近い言葉は canonical 供給点 V2_EMOTION_WORDS からのみ表示。
   *   存在しない field は生成・推定せず非表示（CONTENT_REQUIRED として報告）
   * - 大棚文脈（感情語未選択）では表示しない（選択カードが表示される）
   * ------------------------------------------------------------------------ */
  /* 04「ことば」詳細の表示データ。
     EN のときは EN 表示層を優先し、無い ID / field は JA canonical へ落ちる。
     canonical（V2_EMOTION_WORDS）は読むだけで、書き換えも上書きもしない。 */
  function wordsFor(emotionId) {
    var ja = (global.V2_EMOTION_WORDS || {})[emotionId] || {};
    if (!isEN()) return ja;
    var en = (global.V2_EMOTION_WORDS_EN || {})[emotionId];
    if (!en) return ja;
    return {
      imi: (typeof en.imi === 'string' && en.imi) ? en.imi : ja.imi,
      nuance: (typeof en.nuance === 'string' && en.nuance) ? en.nuance : ja.nuance,
      near_words: (Array.isArray(en.near_words) && en.near_words.length) ? en.near_words : ja.near_words
    };
  }

  function buildWordBlock(head, node) {
    var wrap = doc.createElement('div');
    wrap.className = 'v2c04__wd';
    var h = doc.createElement('h3');
    h.className = 'v2c04__wd-h';
    h.textContent = head;
    wrap.appendChild(h);
    wrap.appendChild(node);
    return wrap;
  }

  function renderWordDetail(scope) {
    if (!doc) return { ok: false, reason: 'no_document' };
    var body = q('[data-v2-worddetail="body"]', scope);
    if (!body) return { ok: false, reason: 'no_target' };
    clearChildren(body);
    body.removeAttribute('data-v2-worddetail-state');
    if (!state.activeEmotionId) {
      body.setAttribute('hidden', '');
      return { ok: true, status: 'shelf_context' };
    }
    body.removeAttribute('hidden');
    var cat = findCategory(state.activeEmotionId);
    var words = wordsFor(state.activeEmotionId);
    var missing = [], made = 0;

    var imi = (typeof words.imi === 'string' && words.imi)
      ? words.imi
      : (cat && typeof cat.def === 'string' ? catDef(cat) : '');
    if (imi) {
      var pI = doc.createElement('p');
      pI.className = 'v2c04__wd-body';
      pI.textContent = imi;
      body.appendChild(buildWordBlock(T('v2WordMeaning', '意味'), pI));
      made++;
    } else { missing.push('imi'); }

    if (typeof words.nuance === 'string' && words.nuance) {
      var pN = doc.createElement('p');
      pN.className = 'v2c04__wd-body';
      pN.textContent = words.nuance;
      body.appendChild(buildWordBlock(T('v2WordNuance', 'ニュアンス'), pN));
      made++;
    } else { missing.push('nuance'); }

    if (Array.isArray(words.near_words) && words.near_words.length) {
      var row = doc.createElement('div');
      row.className = 'v2c04__wd-chips';
      for (var i = 0; i < words.near_words.length; i++) {
        var chip = doc.createElement('span');   // 非interactive（tag管理UIにしない）
        chip.className = 'v2c04__wd-chip';
        chip.textContent = String(words.near_words[i]);
        row.appendChild(chip);
      }
      body.appendChild(buildWordBlock(T('v2WordNear', '近い言葉'), row));
      made++;
    } else { missing.push('near_words'); }

    var st = missing.length === 0 ? 'ready'
      : (made > 0 ? 'partial:' + missing.join('+') : 'emotion_definition_missing');
    body.setAttribute('data-v2-worddetail-state', st);
    return { ok: true, status: st, made: made, missing: missing };
  }

  /* ---------------------------------------------------------------------------
   * 04「作品」READ-ONLY 描画（Beta0 static Editorial Snapshot のみ）
   * - approved snapshot（V2_EDITORIAL_SNAPSHOTS）以外から作品を生成しない
   * - runtime 外部API・cover 画像・外部遷移・affiliate なし
   * - 追加2作品が approved でない限り「もう2つ見る」を作らない
   * - snapshot 不足時は既存の安全な HOLD 表示（仕入れ中）を維持する
   * ------------------------------------------------------------------------ */
  function workTypeLabels() {
    return {
      book: T('v2WorkTypeBook', '本'),
      film: T('v2WorkTypeFilm', '映画'),
      music: T('v2WorkTypeMusic', '音楽')
    };
  }

  function buildWorkCard(item) {
    var li = doc.createElement('li');
    li.className = 'v2c04__work';
    li.setAttribute('data-v2-work-id', String(item.item_id || ''));

    var type = doc.createElement('span');
    type.className = 'v2c04__work-type';
    type.textContent = workTypeLabels()[item.type] || String(item.type || '');
    li.appendChild(type);

    var title = doc.createElement('span');
    title.className = 'v2c04__work-title';
    title.textContent = String(item.title || '');
    li.appendChild(title);

    var creator = doc.createElement('span');
    creator.className = 'v2c04__work-creator';
    creator.textContent = String(item.creator || '');
    li.appendChild(creator);

    var reason = doc.createElement('span');
    reason.className = 'v2c04__work-reason';
    reason.textContent = String(item.editorial_reason || '');
    li.appendChild(reason);
    return li;
  }

  function buildWorksHold() {
    var box = doc.createElement('div');
    box.className = 'v2c04__works-hold';
    var t = doc.createElement('p');
    t.className = 'v2c04__works-hold-title';
    t.textContent = T('v2c04WorksHoldTitle', 'この棚の作品は、ただいま仕入れ中です。');
    box.appendChild(t);
    var n = doc.createElement('p');
    n.className = 'v2c04__works-hold-note';
    n.textContent = T('v2c04WorksHoldNote', 'また立ち寄ったときに、静かに並んでいるはずです。');
    box.appendChild(n);
    return box;
  }

  function renderWorks(scope) {
    if (!doc) return { ok: false, reason: 'no_document' };
    var body = q('[data-v2-works="body"]', scope);
    if (!body) return { ok: false, reason: 'no_target' };
    clearChildren(body);
    body.removeAttribute('data-v2-works-count');

    var snaps = global.V2_EDITORIAL_SNAPSHOTS || {};
    var snap = state.activeEmotionId ? snaps[state.activeEmotionId] : null;
    var items = snap && Array.isArray(snap.items) ? snap.items : [];
    var ok = items.length >= 3 && items.slice(0, 3).every(function (it) {
      return it && it.title && it.creator && it.editorial_reason && it.type;
    });
    if (!ok) {
      // works_0_or_unapproved / 大棚文脈: 安全な HOLD。作品を生成しない。
      body.appendChild(buildWorksHold());
      body.setAttribute('data-v2-works-count', '0');
      return { ok: true, status: 'hold', rendered: 0 };
    }
    var list = doc.createElement('ul');
    list.className = 'v2c04__worklist';
    for (var i = 0; i < 3; i++) list.appendChild(buildWorkCard(items[i]));
    body.appendChild(list);
    // 追加2作品は additional_approved === true かつ approved item がある場合のみ。
    // 現 Beta0 snapshot は未承認のため「もう2つ見る」を生成しない。
    body.setAttribute('data-v2-works-count', '3');
    return { ok: true, status: 'ok', rendered: 3 };
  }

  /* ---------------------------------------------------------------------------
   * 04 の READ-ONLY 描画
   * 文字はすべて textContent。既存 CATEGORIES の label / def を読むだけ。
   * ------------------------------------------------------------------------ */
  function q(sel, scope) { return (scope || doc).querySelector(sel); }

  function render(scope) {
    if (!doc) return { ok: false, reason: 'no_document' };
    var titleEl = q('[data-v2-emotion="title"]', scope);
    var leadEl = q('[data-v2-emotion="lead"]', scope);
    var wordsEl = q('[data-v2-emotion="words"]', scope);
    if (!titleEl && !leadEl && !wordsEl) return { ok: false, reason: 'no_target' };

    var shelfId = effectiveShelfId();
    /* R2-02：04 に「どの大棚から入ったか」を渡す。値は既存の大棚 id のみ。
       CSS 側がこの文脈で既存 --tint を halo / haze へ反映する。
       storage・GA4・外部通信には一切関与しない表示専用の属性。 */
    if (doc && doc.documentElement) {
      doc.documentElement.setAttribute('data-v2-shelf-context', shelfId || '');
    }
    var def = (shelfId === ALL_CONTEXT_ID)
      ? { id: ALL_CONTEXT_ID,
          name: T('v2ShelfAllName', 'すべての感情語'),
          lead: T('v2ShelfAllLead', '21のことばを、まとめて見わたせます。') }
      : getShelfDef(shelfId);

    /* 04 hero contract: 感情語が選択されている間は個別感情の label / def を
       表示する（大棚名を 04 の identity として固定しない）。未選択（大棚文脈）は
       従来どおり大棚 name / lead。データは既存 CATEGORIES を読むだけ。 */
    var activeCat = state.activeEmotionId ? findCategory(state.activeEmotionId) : null;
    if (titleEl) {
      titleEl.textContent = (activeCat && typeof activeCat.label === 'string')
        ? catLabel(activeCat)
        : (def ? shelfName(def) : '');
    }
    if (leadEl) {
      leadEl.textContent = '';
      if (activeCat && typeof activeCat.def === 'string') {
        leadEl.appendChild(doc.createTextNode(catDef(activeCat)));
      } else if (def && def.lead) {
        var lines = shelfLead(def).split('\n');
        for (var li = 0; li < lines.length; li++) {
          if (li > 0) leadEl.appendChild(doc.createElement('br'));
          leadEl.appendChild(doc.createTextNode(lines[li]));
        }
      }
    }

    var made = 0;
    if (wordsEl) {
      var oldCards = wordsEl.querySelectorAll('[data-v2-emotion-id]');
      for (var i = 0; i < oldCards.length; i++) {
        if (oldCards[i].parentNode) oldCards[i].parentNode.removeChild(oldCards[i]);
      }
      if (activeCat) {
        /* 個別感情表示中: 同棚感情カードを「ことば」内容として出さない（R2契約）。
           選択カードは大棚文脈（未選択時）だけに出す。 */
        wordsEl.setAttribute('hidden', '');
        wordsEl.setAttribute('data-v2-emotion-count', '0');
      } else {
        wordsEl.removeAttribute('hidden');
        var ids = emotionIdsOf(shelfId);
        var frag = doc.createDocumentFragment();
        for (var k = 0; k < ids.length; k++) {
          try { frag.appendChild(buildWordCard(ids[k], k)); made++; }
          catch (e) { state.lastError = 'render_word_failed@' + k; }
        }
        wordsEl.appendChild(frag);
        wordsEl.setAttribute('data-v2-emotion-count', String(ids.length));
      }
    }
    renderWordDetail(scope);

    renderWorks(scope);

    // 文脈（大棚／感情語）が変わったら「自分の本」の絞り込み結果も必ず追随させる。
    // 領域の選択状態そのものはここでは変えない。
    renderRegions(scope);
    return { ok: true, shelfId: shelfId, rendered: made };
  }

  function buildWordCard(emotionId, index) {
    var cat = findCategory(emotionId);
    var card = doc.createElement('button');
    card.type = 'button';
    card.className = 'v2-word-card';
    card.setAttribute('data-v2-emotion-id', emotionId);
    // 同じ感情が同一画面に2回出ることは無いが、index も持たせて位置を特定可能にする
    card.setAttribute('data-v2-emotion-index', String(index));
    if (emotionId === state.activeEmotionId) {
      card.classList.add('v2-word-card--current');
      card.setAttribute('aria-current', 'true');
    }

    var name = doc.createElement('span');
    name.className = 'v2-word-card__name';
    name.textContent = cat && typeof cat.label === 'string' ? catLabel(cat) : emotionId;
    card.appendChild(name);

    var slot = doc.createElement('span');
    slot.className = 'v2-word-card__slot v2-placeholder';
    slot.setAttribute('aria-hidden', 'true');
    card.appendChild(slot);

    var desc = doc.createElement('span');
    desc.className = 'v2-word-card__desc';
    desc.textContent = cat && typeof cat.def === 'string' ? catDef(cat) : '';
    card.appendChild(desc);
    return card;
  }

  /* ---------------------------------------------------------------------------
   * 04 の4領域（Step 3B.1）
   * 04 内部の DOM 切替だけ。既存遷移関数・GA4・storage・network に触れない。
   * ------------------------------------------------------------------------ */
  function isRegion(id) { return REGIONS.indexOf(id) !== -1; }

  function selectRegion(regionId, scope) {
    if (!isRegion(regionId)) {
      state.lastError = 'unknown_region';
      return false;
    }
    state.activeRegion = regionId;
    state.lastError = null;
    renderRegions(scope);
    return true;
  }

  /* 選択状態（見た目）と aria-pressed（プログラム上の状態）を同じ1か所で書く。
     両者がずれる余地を構造的に作らない。 */
  function renderRegions(scope) {
    if (!doc) return { ok: false, reason: 'no_document' };
    var root = scope || doc;
    var tabs = root.querySelectorAll('[data-v2-region]');
    var panels = root.querySelectorAll('[data-v2-region-panel]');
    if (!tabs.length && !panels.length) return { ok: false, reason: 'no_target' };

    /* Beta0（MASTER HANDOFF v0.9）：04 は tab 切替ではなく
       「ことば → 作品 → 自分の本」を縦に歩く一枚ページになった。
       tab（[data-v2-region]）が DOM に無い場合は walk モードとして
       全 panel を常時表示し、「自分の本」も常に描画する。
       tab がある環境（旧 harness）では従来の切替をそのまま維持する。 */
    state.walkMode = tabs.length === 0;

    var i;
    for (i = 0; i < tabs.length; i++) {
      var rid = tabs[i].getAttribute('data-v2-region');
      tabs[i].setAttribute('aria-pressed', rid === state.activeRegion ? 'true' : 'false');
    }
    for (i = 0; i < panels.length; i++) {
      var pid = panels[i].getAttribute('data-v2-region-panel');
      if (state.walkMode || pid === state.activeRegion) panels[i].removeAttribute('hidden');
      else panels[i].setAttribute('hidden', '');
    }
    var my = renderMyBooks(scope);
    return { ok: true, region: state.activeRegion, myBooks: my };
  }

  /* ---------------------------------------------------------------------------
   * 「自分の本」（Step 3B.1）
   * 既存 library を READ-ONLY で読む。読み口は bookshelf-adapter に一本化し、
   * ここで libraryCache / storage / DataRepository を直接触らない。
   * ------------------------------------------------------------------------ */
  function readLibraryEntries() {
    var bs = global.V2BookshelfAdapter;
    if (!bs || typeof bs.readLibrary !== 'function') {
      // 読み口が無い環境では「0冊」と断定しない
      return { status: 'unknown', entries: [] };
    }
    var r;
    try { r = bs.readLibrary(); } catch (e) { return { status: 'unknown', entries: [] }; }
    if (!r || r.status !== 'ok' || !Array.isArray(r.entries)) {
      return { status: 'unknown', entries: [] };
    }
    return { status: 'ok', entries: r.entries };
  }

  /* いま見ている 04 の文脈で「自分の本」に出してよい感情IDの集合。
     A/B/C/D は emotionIdsOf() の既存解決をそのまま使う（別ロジックを作らない）。
     E（unfiled）はどの集合にも入らないが、念のため明示的にも除外する。 */
  function myBookContextIds() {
    if (state.activeEmotionId) return [state.activeEmotionId];
    var shelfId = effectiveShelfId();
    if (!shelfId) return [];
    return emotionIdsOf(shelfId);
  }

  /* 文脈に合う本だけを、libraryCache の順序のまま返す。
     並べ替え・修復・書き戻しはしない。entry は読むだけ。
     同一パネル内は entry.id で dedupe する（shitto の二重配架は文脈側の仕様であり、
     同じ本が同じパネルに2回出ることとは別）。 */
  function filterMyBooks(entries, allowIds) {
    var allow = {}, i;
    for (i = 0; i < allowIds.length; i++) {
      var a = allowIds[i];
      if (typeof a === 'string' && a && a !== UNFILED_ID) allow[a] = true;
    }
    var out = [], seen = {};
    for (i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!e || typeof e !== 'object') continue;
      var c = e.category;
      if (typeof c !== 'string' || c === UNFILED_ID) continue;
      if (allow[c] !== true) continue;
      // id が無い壊れた entry も落とさない。位置で一意化するだけ
      var key = (e.id === null || e.id === undefined) ? ('@' + i) : ('#' + String(e.id));
      if (seen[key]) continue;
      seen[key] = true;
      out.push(e);
    }
    return out;
  }

  function bookTitle(entry) {
    var bs = global.V2BookshelfAdapter;
    if (bs && typeof bs.viewTitle === 'function') {
      try { return bs.viewTitle(entry); } catch (e) { /* 下の fallback へ */ }
    }
    if (!entry || typeof entry !== 'object') return titleFallback();
    var t = entry.title;
    if (typeof t !== 'string' || t === '') return titleFallback();
    return t;
  }

  /* 表示用の棚名。既存 CATEGORIES の label を読むだけ。 */
  function bookShelfLabel(entry) {
    var cat = entry ? findCategory(entry.category) : null;
    return (cat && typeof cat.label === 'string') ? catLabel(cat) : '';
  }

  /* 表示用の日付。既存 entry.date（ISO文字列）を読むだけ。
     不正値は静かに空文字にする（entry は書き換えない）。 */
  function bookDate(entry) {
    if (!entry || typeof entry.date !== 'string' || !entry.date) return '';
    var d = new Date(entry.date);
    if (isNaN(d.getTime())) return '';
    if (isEN()) {
      var MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return MN[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  /* 本カードはネイティブ button（Step 3C）。カード全体が1つの操作要素で、
     入れ子の操作要素は作らない（nested interactive 禁止）。
     一覧では本文 story・写真 image・tweetUrl を出さない。文字はすべて textContent。 */
  function buildBookCard(entry, index) {
    var li = doc.createElement('li');
    li.className = 'v2-book-card-item';

    var card = doc.createElement('button');
    card.type = 'button';
    card.className = 'v2-book-card';
    card.setAttribute('data-v2-mybook', String(index));
    var id = (entry && typeof entry === 'object' && entry.id !== null && entry.id !== undefined)
      ? String(entry.id) : '';
    if (id) card.setAttribute('data-v2-book-id', id);

    var titleText = bookTitle(entry);
    var title = doc.createElement('span');
    title.className = 'v2-book-card__title';
    title.textContent = titleText;
    card.appendChild(title);

    var parts = [];
    var label = bookShelfLabel(entry);
    var date = bookDate(entry);
    if (label) parts.push(label);
    if (date) parts.push(date);
    if (parts.length) {
      var meta = doc.createElement('span');
      meta.className = 'v2-book-card__meta';
      meta.textContent = parts.join(isEN() ? ' \u00b7 ' : '\u3000');
      card.appendChild(meta);
    }
    // 読み上げ名は題名までに留める（棚名・日付・本文は名前に混ぜない）
    card.setAttribute('aria-label', TF('v2BookOpenAria', '{title}を開く', { title: titleText }));
    li.appendChild(card);
    return li;
  }

  function buildEmpty(titleText, noteText) {
    var box = doc.createElement('div');
    box.className = 'v2-detail__empty';
    var t = doc.createElement('p');
    t.className = 'v2-detail__empty-title';
    t.textContent = titleText;
    box.appendChild(t);
    var n = doc.createElement('p');
    n.className = 'v2-detail__empty-note';
    n.textContent = noteText;
    box.appendChild(n);
    return box;
  }

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  /* ---------------------------------------------------------------------------
   * 04 →（06 / 07）
   * 遷移そのものは持たない。既存 V2NavigationAdapter / V2BookshelfAdapter に委ねる。
   * ------------------------------------------------------------------------ */

  /* 「本棚ですべて見る」→ 06（蔵書0冊なら bookshelf-adapter の既存判定で 08）。
     04 の originMajorShelfId / activeEmotionId は書き換えない（復元も要求しない）。 */
  function openBookshelf() {
    var nav = global.V2NavigationAdapter;
    if (!nav || typeof nav.go !== 'function') return false;
    // 'bookshelf' は navigation-adapter 側で resolveBookshelfScreen() を通り 06 / 08 に解決される
    return nav.go('bookshelf');
  }

  /* 04 の本カード → 07。選んだ本だけを memory-only の selectedBookId にする。 */
  function openBook(bookId) {
    var bs = global.V2BookshelfAdapter;
    if (!bs || typeof bs.selectBook !== 'function') {
      state.lastError = 'bookshelf_adapter_missing';
      return false;
    }
    return bs.selectBook(bookId);
  }

  function delegateMyBooks(ev) {
    var t = ev.target;
    while (t && t !== ev.currentTarget) {
      if (t.getAttribute) {
        if (t.hasAttribute('data-v2-mybooks-all')) { openBookshelf(); return; }
        var id = t.getAttribute('data-v2-book-id');
        if (id) { openBook(id); return; }
      }
      t = t.parentNode;
    }
  }

  function renderMyBooks(scope) {
    if (!doc) return { ok: false, reason: 'no_document' };
    var body = q('[data-v2-mybooks="body"]', scope);
    if (!body) return { ok: false, reason: 'no_target' };

    // 選択されていない間は私的データを hidden な DOM に残さない
    // （walk モードでは「自分の本」節が常に見えているため常に描画する）
    clearChildren(body);
    body.removeAttribute('data-v2-mybooks-count');
    if (!state.walkMode && state.activeRegion !== 'jibun') {
      return { ok: true, region: state.activeRegion, rendered: 0, shown: 0 };
    }

    var lib = readLibraryEntries();
    if (lib.status !== 'ok') {
      // unknown は「0冊」ではない。空状態コピーを出さず、何も断定しない
      state.lastError = 'library_unknown';
      return { ok: true, status: 'unknown', rendered: 0, shown: 0 };
    }

    var books = filterMyBooks(lib.entries, myBookContextIds());
    if (books.length === 0) {
      /* 空状態コピーは MASTER_SPEC §4.4 の正本文言 */
      body.appendChild(buildEmpty(
        T('v2MyBooksEmptyTitle', 'この気持ちで残した本は、まだありません。'),
        T('v2MyBooksEmptyNote', '書くことからでも、棚を眺めることからでも始められます。')
      ));
      body.setAttribute('data-v2-mybooks-count', '0');
      return { ok: true, status: 'ok', rendered: 0, shown: 0, matched: 0 };
    }

    var list = doc.createElement('ul');
    list.className = 'v2-detail__books';
    var shown = Math.min(books.length, MY_BOOKS_LIMIT);
    for (var i = 0; i < shown; i++) {
      try { list.appendChild(buildBookCard(books[i], i)); }
      catch (e) { state.lastError = 'render_book_failed@' + i; }
    }
    body.appendChild(list);

    if (books.length > MY_BOOKS_LIMIT) {
      // Step 3C：06「自分の本棚」へ接続した。04 の絞り込み状態は 06 へ持ち込まない
      // （06 は全蔵書）。合算冊数・総蔵書数との比較は表示しない。
      var more = doc.createElement('button');
      more.type = 'button';
      more.className = 'v2-detail__more';
      more.setAttribute('data-v2-mybooks-all', '');
      more.textContent = T('v2MyBooksSeeAll', '本棚ですべて見る');
      body.appendChild(more);
    }

    // 現在パネル内の unique 件数のみ。大棚横断の合算ではない
    body.setAttribute('data-v2-mybooks-count', String(books.length));
    return { ok: true, status: 'ok', rendered: shown, shown: shown, matched: books.length };
  }

  /* ---------------------------------------------------------------------------
   * 配線
   * 03 の大棚入口（native button）と 04 の感情語カードのみ。
   * click だけを購読し、Enter / Space は button 本来の挙動に委ねる。
   * ------------------------------------------------------------------------ */
  function onShelfEnter(ev) {
    var el = ev.currentTarget;
    var shelfId = el.getAttribute('data-v2-shelf');
    if (!shelfId) return;
    state.returnToScreen = visibleScreenId();
    enterShelf(shelfId, { triggerId: el.getAttribute('data-v2-shelf-trigger') || shelfId });
  }

  /* いま見えている V2 画面の番号。history には触れない。 */
  function visibleScreenId() {
    if (!doc) return null;
    var pages = doc.querySelectorAll('.v2-page[data-v2-screen]');
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      var cs = global.getComputedStyle ? global.getComputedStyle(p) : null;
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) continue;
      if (p.getClientRects && p.getClientRects().length === 0) continue;
      return p.getAttribute('data-v2-screen');
    }
    return null;
  }

  function onWordSelect(ev) {
    var el = ev.currentTarget;
    var id = el.getAttribute('data-v2-emotion-id');
    if (id) selectEmotion(id);
  }

  /* 「棚へ戻る」は直前にいた画面へ戻す。
     この build は adapter の非目標として history / pushState を持たないため、
     history.back() を使うとサイトの外へ出てしまう。そこで 04 に入る直前の
     V2 画面を覚えておき、そこへ戻す。分からない場合だけ従来どおり 03 へ。
     04 自身へは戻さない（ループを作らない）。 */
  function onLeave() {
    /* 感情語を選んだあとの「戻る」は、まず直前の大棚へ戻す。
       selectEmotion() は 04 の中で activeEmotionId を差し替えるだけで、
       戻り先を1段も積まないため、そのままだと大棚を飛び越して
       returnToScreen（多くは 03）へ出てしまっていた。
       ここでは activeEmotionId だけを外して 04 を描き直す。これは
       enterShelf() 直後とまったく同じ状態なので、大棚の見え方は変わらない。

       04 へ戻し直しているのは、この戻るボタンが
       data-v2-go="03" と data-v2-shelf-back の両方を持っており、
       navigation-adapter の onActivate が先に走って 03 へ移ってしまうため。
       その後にここで 04 の subview へ戻す（既存 FIX-G の onLeave も
       同じ「あとから上書きする」形で動いている）。
       ・使うのは enterShelf() と同じ nav.go('04', { subviewOnly: true })。
         03 と 04 は同じ既存ページ（#shelves）の subview なので goToPage() は走らない。
       ・shelfId 付きの nav.go() は goToShelf() 経由で view_shelf を発火させるため、
         ここでは絶対に使わない（GA4 / storage / 外部通信を増やさない）
       ・activeRegion は触らない（領域の選択は利用者の文脈として保つ）
       大棚から入っていない場合（originMajorShelfId なし）は戻る先の大棚が
       存在しないので、従来どおり 04 の外へ出る。 */
    if (state.activeEmotionId && state.originMajorShelfId) {
      state.activeEmotionId = null;
      state.lastError = null;
      var navBack = global.V2NavigationAdapter;
      if (navBack && typeof navBack.go === 'function') {
        navBack.go('04', { subviewOnly: true });
      }
      render();
      return state.lastOriginTriggerId;
    }

    var back = state.returnToScreen;
    state.returnToScreen = null;
    if (back && back !== '04') {
      var nav = global.V2NavigationAdapter;
      if (nav && typeof nav.go === 'function') {
        var triggerId = state.lastOriginTriggerId;
        state.originMajorShelfId = null;
        state.activeEmotionId = null;
        try {
          nav.go(back, { subviewOnly: back === '03' });
          restoreFocus(triggerId);
          state.lastOriginTriggerId = null;
          return triggerId;
        } catch (err) { /* 失敗したら下の既定経路へ落とす */ }
      }
    }
    return leaveToIndex();
  }

  function mount(scope) {
    if (!doc) return false;
    var root = scope || doc;
    var triggers = root.querySelectorAll('[data-v2-shelf]');
    for (var i = 0; i < triggers.length; i++) {
      triggers[i].removeEventListener('click', onShelfEnter);
      triggers[i].addEventListener('click', onShelfEnter);
    }
    var backs = root.querySelectorAll('[data-v2-shelf-back]');
    for (var j = 0; j < backs.length; j++) {
      backs[j].removeEventListener('click', onLeave);
      backs[j].addEventListener('click', onLeave);
    }
    var words = q('[data-v2-emotion="words"]', root);
    if (words) {
      words.removeEventListener('click', delegateWord);
      words.addEventListener('click', delegateWord);
    }
    var regions = q('[data-v2-regions]', root);
    if (regions) {
      regions.removeEventListener('click', delegateRegion);
      regions.addEventListener('click', delegateRegion);
    }
    // 本カード・「本棚ですべて見る」は再描画で作り直されるため、
    // ここでもコンテナ側で1つだけ購読する
    var myBooks = q('[data-v2-mybooks="body"]', root);
    if (myBooks) {
      myBooks.removeEventListener('click', delegateMyBooks);
      myBooks.addEventListener('click', delegateMyBooks);
    }
    state.mounted = true;
    render(scope);
    return true;
  }

  /* 感情語カードは再描画で作り直されるため、コンテナ側で1つだけ購読する
     （カードごとに listener を付けない＝多重登録が構造的に起きない） */
  function delegateWord(ev) {
    var t = ev.target;
    while (t && t !== ev.currentTarget) {
      if (t.getAttribute && t.getAttribute('data-v2-emotion-id')) {
        onWordSelect({ currentTarget: t });
        return;
      }
      t = t.parentNode;
    }
  }

  /* 領域タブも同じ方針でコンテナ側に1つだけ購読する。
     タブは4つ固定だが、per-button listener を作らないことで
     mount を何度呼んでも多重登録が構造的に起きない状態を保つ。 */
  function delegateRegion(ev) {
    var t = ev.target;
    while (t && t !== ev.currentTarget) {
      if (t.getAttribute && t.getAttribute('data-v2-region')) {
        selectRegion(t.getAttribute('data-v2-region'));
        return;
      }
      t = t.parentNode;
    }
  }

  function unmount(scope) {
    if (!doc) return false;
    var root = scope || doc;
    var triggers = root.querySelectorAll('[data-v2-shelf]');
    for (var i = 0; i < triggers.length; i++) triggers[i].removeEventListener('click', onShelfEnter);
    var backs = root.querySelectorAll('[data-v2-shelf-back]');
    for (var j = 0; j < backs.length; j++) backs[j].removeEventListener('click', onLeave);
    var words = q('[data-v2-emotion="words"]', root);
    if (words) words.removeEventListener('click', delegateWord);
    var regions = q('[data-v2-regions]', root);
    if (regions) regions.removeEventListener('click', delegateRegion);
    // 私的データを DOM に残さない
    var body = q('[data-v2-mybooks="body"]', root);
    if (body) body.removeEventListener('click', delegateMyBooks);
    if (body) {
      clearChildren(body);
      body.removeAttribute('data-v2-mybooks-count');
    }
    state.mounted = false;
    return true;
  }

  global.V2EmotionShelfAdapter = {
    MAJOR_SHELVES: getMajorShelves,
    CROSSWAY_ID: CROSSWAY.id,
    ALL_CONTEXT_ID: ALL_CONTEXT_ID,
    CANONICAL_PRIMARY: CANONICAL_PRIMARY,
    readCategories: readCategories,
    emotionIdsOf: emotionIdsOf,
    canonicalShelfOf: canonicalShelfOf,
    effectiveShelfId: effectiveShelfId,
    REGIONS: function () { return REGIONS.slice(); },
    DEFAULT_REGION: DEFAULT_REGION,
    MY_BOOKS_LIMIT: MY_BOOKS_LIMIT,
    UNFILED_ID: UNFILED_ID,
    get TITLE_FALLBACK() { return titleFallback(); },
    enterShelf: enterShelf,
    selectEmotion: selectEmotion,
    selectRegion: selectRegion,
    openBookshelf: openBookshelf,
    openBook: openBook,
    myBookContextIds: myBookContextIds,
    filterMyBooks: filterMyBooks,
    leaveToIndex: leaveToIndex,
    restoreFocus: restoreFocus,
    /* ★Localization：applyLanguage() から呼ばれ、描画済みの 04 を現在の言語で描き直す。
       storage / GA4 / 外部通信には触れず、選択中の感情・領域・入口文脈も変えない。 */
    refreshLocale: function () {
      if (!state.mounted) return false;
      try { render(); } catch (e) { /* ignore */ }
      try { renderRegions(); } catch (e) { /* ignore */ }
      try { renderMyBooks(); } catch (e) { /* ignore */ }
      return true;
    },
    render: render,
    renderRegions: renderRegions,
    renderMyBooks: renderMyBooks,
    mount: mount,
    unmount: unmount,
    setCategoriesFixture: function (cats) { fixtureCategories = (cats === undefined) ? null : cats; },
    clearCategoriesFixture: function () { fixtureCategories = null; },
    getState: function () {
      return {
        originMajorShelfId: state.originMajorShelfId,
        activeEmotionId: state.activeEmotionId,
        activeRegion: state.activeRegion,
        effectiveShelfId: effectiveShelfId(),
        lastOriginTriggerId: state.lastOriginTriggerId,
        mounted: state.mounted,
        lastError: state.lastError,
        usingFixture: fixtureCategories !== null
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);

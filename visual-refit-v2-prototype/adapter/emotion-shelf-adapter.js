/* =============================================================================
 * Visual Refit V2 — emotion-shelf-adapter（Phase 3 Step 3A）
 * -----------------------------------------------------------------------------
 * 役割は「既存21感情データの VIEW ADAPTER」のみ。データを所有しない。
 *
 *   1. 7大棚＋特別入口「まだ名前がない」の READ-ONLY mapping を持つ
 *   2. 大棚ID → 既存感情ID配列 の解決（CATEGORIES は読むだけ）
 *   3. 03 → 04 の入口文脈（originMajorShelfId）をメモリ上だけで保持する
 *   4. 04 の READ-ONLY 描画（大棚名・説明・その大棚の感情語）
 *   5. 03 → 04 遷移は既存 goToShelf() / V2NavigationAdapter 経由のみ
 *   6. QA 用の synthetic fixture 注入
 *
 * これ以外の責務を持たない。特に以下は絶対にしない。
 *   - CATEGORIES / TEXTURE_GROUPS の変更・複製保存・並べ替え・重複除去
 *   - localStorage / IndexedDB / DataRepository への読み書き
 *   - fetch / XHR / sendBeacon / WebSocket / EventSource
 *   - GA4（trackAnalyticsEvent / gtag / dataLayer）
 *   - history / hash / pushState / replaceState / URLSearchParams への永続化
 *   - setInterval / polling / observer による監視
 *   - inert / aria-hidden / focus trap の自前実装
 *   - 作品API・Bluesky・「いま」データ取得・自動仕入れ
 *   - activeCategory から「どの大棚だったか」を逆引きすること
 *     （shitto が複数配架のため逆引きは原理的に一意にならない）
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
   * 7大棚 mapping（正本）
   * emotions の順序は決裁順のまま保持する。alphabetical sort 等は行わない。
   * lead は Phase 3 Step 3A で新規に書いた UI コピー（ざわつくのみ Phase 2 承認済み文）。
   * ------------------------------------------------------------------------ */
  var MAJOR_SHELVES = [
    { id: 'hazumu',   name: '心が弾む',      emotions: ['ureshii', 'wakuwaku', 'hokorashii'],
      lead: '心が軽く上を向いて、\n弾んでいるあたり。' },
    { id: 'atatamaru', name: '心があたたまる', emotions: ['ando', 'kansha', 'itooshii'],
      lead: '張っていたものがほどけて、\nあたたかくなるあたり。' },
    { id: 'hikareru', name: '惹かれる',      emotions: ['akogare', 'shitto', 'natsukashii'],
      lead: '遠くにあるものへ、\n心が引かれていくあたり。' },
    { id: 'shizumu',  name: '沈む',          emotions: ['kanashii', 'kodoku', 'gakkari'],
      lead: '静かに重くなって、\n下へ沈んでいくあたり。' },
    { id: 'zawatsuku', name: 'ざわつく',     emotions: ['fuan', 'aseri', 'odoroki'],
      lead: '先が読めないときや、気持ちが落ち着かず\n動きつづけるあたり。' },
    { id: 'butsukaru', name: 'ぶつかる',     emotions: ['ikari', 'kuyashii', 'shitto'],
      lead: '内側で熱がぶつかって、\n収まりきらないあたり。' },
    { id: 'miwohiku',  name: '身を引く',     emotions: ['hazukashii', 'ushirometai', 'keno'],
      lead: 'そっと身を引いて、\n距離を取りたくなるあたり。' }
  ];

  /* 特別入口。8番目の大棚ではない */
  var CROSSWAY = {
    id: 'namae-ga-nai', name: 'まだ名前がない', emotions: ['moyamoya'],
    lead: 'まだ、どのことばにも\n決めたくないときに。'
  };

  /* 「すべての感情語を見る」。既存21感情を1回ずつ。所属を作らない */
  var ALL_CONTEXT_ID = 'all';

  /* 複数配架の canonical priority。入口文脈が無いときだけ使う */
  var CANONICAL_PRIMARY = { shitto: 'hikareru' };

  /* ---------------------------------------------------------------------------
   * 一時状態（メモリのみ。永続化しない）
   * ------------------------------------------------------------------------ */
  var state = {
    originMajorShelfId: null,  // 03 から通った入口。'all' も入りうる
    activeEmotionId: null,     // 04 で選択中の感情ID
    lastOriginTriggerId: null, // 04→03 で focus を戻す先（DOM の識別子のみ）
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
      return { id: s.id, name: s.name, lead: s.lead, emotions: s.emotions.slice() };
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
    state.activeEmotionId = ids.length ? ids[0] : null;
    state.lastOriginTriggerId = opts.triggerId || null;

    var nav = global.V2NavigationAdapter;
    if (nav && typeof nav.go === 'function') {
      // 既存 goToShelf() は感情IDを受け取る。感情が解決できない場合は
      // 棚IDを渡さず 04 の subview 遷移だけを行う（既存関数を騙さない）。
      nav.go('04', state.activeEmotionId ? { shelfId: state.activeEmotionId } : null);
    }
    render();
    return { shelfId: state.originMajorShelfId, emotions: ids, active: state.activeEmotionId };
  }

  /* 04 内で感情語を選ぶ。大棚文脈は変えない（入口文脈を保持したまま） */
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
    if (nav && typeof nav.go === 'function') nav.go('03');
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
    var def = (shelfId === ALL_CONTEXT_ID)
      ? { id: ALL_CONTEXT_ID, name: 'すべての感情語', lead: '21のことばを、まとめて見わたせます。' }
      : getShelfDef(shelfId);

    if (titleEl) titleEl.textContent = def ? def.name : '';
    if (leadEl) {
      leadEl.textContent = '';
      if (def && def.lead) {
        var lines = def.lead.split('\n');
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
      var ids = emotionIdsOf(shelfId);
      var frag = doc.createDocumentFragment();
      for (var k = 0; k < ids.length; k++) {
        try { frag.appendChild(buildWordCard(ids[k], k)); made++; }
        catch (e) { state.lastError = 'render_word_failed@' + k; }
      }
      wordsEl.appendChild(frag);
      wordsEl.setAttribute('data-v2-emotion-count', String(ids.length));
    }
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
    name.textContent = cat && typeof cat.label === 'string' ? cat.label : emotionId;
    card.appendChild(name);

    var slot = doc.createElement('span');
    slot.className = 'v2-word-card__slot v2-placeholder';
    slot.setAttribute('aria-hidden', 'true');
    card.appendChild(slot);

    var desc = doc.createElement('span');
    desc.className = 'v2-word-card__desc';
    desc.textContent = cat && typeof cat.def === 'string' ? cat.def : '';
    card.appendChild(desc);
    return card;
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
    enterShelf(shelfId, { triggerId: el.getAttribute('data-v2-shelf-trigger') || shelfId });
  }

  function onWordSelect(ev) {
    var el = ev.currentTarget;
    var id = el.getAttribute('data-v2-emotion-id');
    if (id) selectEmotion(id);
  }

  function onLeave() { leaveToIndex(); }

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

  function unmount(scope) {
    if (!doc) return false;
    var root = scope || doc;
    var triggers = root.querySelectorAll('[data-v2-shelf]');
    for (var i = 0; i < triggers.length; i++) triggers[i].removeEventListener('click', onShelfEnter);
    var backs = root.querySelectorAll('[data-v2-shelf-back]');
    for (var j = 0; j < backs.length; j++) backs[j].removeEventListener('click', onLeave);
    var words = q('[data-v2-emotion="words"]', root);
    if (words) words.removeEventListener('click', delegateWord);
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
    enterShelf: enterShelf,
    selectEmotion: selectEmotion,
    leaveToIndex: leaveToIndex,
    restoreFocus: restoreFocus,
    render: render,
    mount: mount,
    unmount: unmount,
    setCategoriesFixture: function (cats) { fixtureCategories = (cats === undefined) ? null : cats; },
    clearCategoriesFixture: function () { fixtureCategories = null; },
    getState: function () {
      return {
        originMajorShelfId: state.originMajorShelfId,
        activeEmotionId: state.activeEmotionId,
        effectiveShelfId: effectiveShelfId(),
        lastOriginTriggerId: state.lastOriginTriggerId,
        mounted: state.mounted,
        lastError: state.lastError,
        usingFixture: fixtureCategories !== null
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);

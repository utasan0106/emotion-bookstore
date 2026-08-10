/* =============================================================================
 * Visual Refit V2 — form-adapter（Phase 3 Step 3D）
 * -----------------------------------------------------------------------------
 * 役割は「V2 の 05 UI と、既存の正式な書く／製本経路をつなぐ橋渡し」のみ。
 * 保存・製本・下書き・検証・GA4 のロジックを一切持たない（再実装しない）。
 *
 * 既存側の正式な入口（このAdapterが使う唯一の経路）
 *   #storyInput   … 本文。既存の input listener が下書き保存・文字数・題名提案を担う
 *   #titleInput   … 題名（任意。空欄時の fallback も既存側が持つ）
 *   #submitStory  … 製本。検証・保存・読み戻し確認・GA4・二重防止はすべて既存実装
 *   #deskMsg      … 既存の検証／結果メッセージ。V2 はこれを写すだけ
 *   #storyCount   … 既存の文字数表示（STORY_LIMIT 超過時の .over も既存側）
 *   #unfiledShelfSkip … 製本成功後の「今は棚を決めず、本棚へ」。既存の離脱経路
 *
 * 絶対にしない
 *   - book object を独自 schema で作って DataRepository へ書くこと
 *   - 保存 / IndexedDB / localStorage / DataRepository / saveJSON への直接アクセス
 *   - 新しい draft key・新しい storage key の作成、既存 draft の勝手な削除
 *   - 独自 validation の追加、既存 validation の書き換え
 *   - GA4（trackAnalyticsEvent / gtag / dataLayer）の直接呼び出し・新イベント追加
 *   - 本文・題名・写真の外部送信、fetch / XHR / sendBeacon
 *   - 04 で見ていた感情を製本 category へ暗黙適用すること
 *     （既存仕様どおり初回製本は必ず UNFILED_CATEGORY_ID。意味づけは利用者主権）
 *   - 題名入力を必須へ戻すこと
 *   - main.js の関数の書き換え・monkey patch
 *
 * start_writing について
 *   既存 handleGenuineStartWritingInput は Event.isTrusted で「利用者本人の入力」を
 *   判定する。V2 の本文欄から既存 #storyInput へ値を写す操作は合成イベントになり
 *   isTrusted=false なので発火しない。そこで、既存関数そのものを V2 の本文欄にも
 *   listener として付け、利用者の実入力（isTrusted=true）で既存の共有ガードにより
 *   1回だけ発火させる。イベント名・パラメータ・発火条件は既存のまま。
 * ========================================================================== */

(function (global) {
  'use strict';

  if (global.V2FormAdapter) return;

  var doc = global.document;

  var EXISTING = {
    story: 'storyInput',
    title: 'titleInput',
    submit: 'submitStory',
    msg: 'deskMsg',
    count: 'storyCount',
    unfiledPicker: 'unfiledShelfPicker',
    unfiledSkip: 'unfiledShelfSkip'
  };

  var state = {
    mounted: false,
    submitting: false,     // 二重 submit のV2側ガード（既存 btn.disabled と併用）
    lastOutcome: null,     // 'success' | 'error' | 'validation' | null
    lastError: null
  };

  var observers = [];
  var pending = null;      // 進行中の製本試行（1件のみ）

  function byId(id) { return doc ? doc.getElementById(id) : null; }
  function q(sel, scope) { return (scope || doc) ? (scope || doc).querySelector(sel) : null; }

  function v2(key, scope) { return q('[data-v2-write="' + key + '"]', scope); }

  /* ---------------------------------------------------------------------------
   * 既存側へ値を渡す
   * 値を代入したうえで既存 input listener を起動する（合成イベント）。
   * これにより既存の下書き保存・文字数・題名提案がそのまま動く。
   * start_writing は isTrusted=false のため、ここでは発火しない（既存仕様どおり）。
   * ------------------------------------------------------------------------ */
  function pushField(existingId, value) {
    var el = byId(existingId);
    if (!el) return false;
    if (el.value === value) return true;
    el.value = value;
    try { el.dispatchEvent(new global.Event('input', { bubbles: true })); }
    catch (e) { state.lastError = 'dispatch_failed'; }
    return true;
  }

  function pushAll(scope) {
    var s = v2('story', scope), t = v2('title', scope);
    var ok = true;
    if (s) ok = pushField(EXISTING.story, s.value) && ok;
    if (t) ok = pushField(EXISTING.title, t.value) && ok;
    return ok;
  }

  /* 既存側 → V2（下書き復元など、既存側が値を書き換えたときに引き取る） */
  function pull(scope) {
    var s = v2('story', scope), t = v2('title', scope);
    var es = byId(EXISTING.story), et = byId(EXISTING.title);
    if (s && es && s.value !== es.value) s.value = es.value;
    if (t && et && t.value !== et.value) t.value = et.value;
    syncMirrors(scope);
    return true;
  }

  /* ---------------------------------------------------------------------------
   * 既存の表示（メッセージ・文字数・ボタン活性）を V2 へ写す
   * 文言・判定は既存側のものをそのまま使う。V2 で作り直さない。
   * ------------------------------------------------------------------------ */
  function syncMirrors(scope) {
    var msgEl = v2('msg', scope), srcMsg = byId(EXISTING.msg);
    if (msgEl && srcMsg) {
      var text = srcMsg.textContent || '';
      if (msgEl.textContent !== text) msgEl.textContent = text;
      msgEl.classList.toggle('is-v2-empty', !text);
    }
    var cntEl = v2('count', scope), srcCnt = byId(EXISTING.count);
    if (cntEl && srcCnt) {
      if (cntEl.textContent !== srcCnt.textContent) cntEl.textContent = srcCnt.textContent;
      // 上限超過の表現も既存 .over の有無をそのまま写す
      cntEl.classList.toggle('is-over', srcCnt.classList.contains('over'));
    }
    var titleCnt = v2('title-count', scope), tEl = v2('title', scope);
    if (titleCnt && tEl) {
      titleCnt.textContent = Array.from(tEl.value || '').length + ' / ' + (tEl.maxLength > 0 ? tEl.maxLength : 16);
    }
    var bindBtn = v2('bind', scope), srcBtn = byId(EXISTING.submit);
    if (bindBtn && srcBtn) bindBtn.disabled = !!srcBtn.disabled;
    return true;
  }

  /* ---------------------------------------------------------------------------
   * 製本
   * 検証・保存・読み戻し・GA4・二重防止はすべて既存 #submitStory の中で起きる。
   * ここは「値を渡して既存ボタンを押す」だけ。
   * ------------------------------------------------------------------------ */
  function bind(scope) {
    var srcBtn = byId(EXISTING.submit);
    if (!srcBtn) { state.lastError = 'no_existing_submit'; return false; }
    if (srcBtn.disabled || state.submitting) { state.lastError = 'already_submitting'; return false; }

    pushAll(scope);

    // 成否の判定に使う開始時点の状態（library は読むだけ）
    pending = {
      scope: scope || null,
      countBefore: libraryCount(),
      settled: false
    };
    state.submitting = true;
    state.lastOutcome = null;

    srcBtn.click();     // ← 既存の正式な製本入口。ここから先は既存実装
    syncMirrors(scope);

    // 同期的に終わる経路（本文空欄などの検証停止）はこの時点で既に確定している
    settleIfDecided();
    return true;
  }

  /* library は bookshelf-adapter の READ-ONLY 読み口経由でのみ数える */
  function libraryCount() {
    var bs = global.V2BookshelfAdapter;
    if (!bs || typeof bs.readLibrary !== 'function') return null;
    try {
      var r = bs.readLibrary();
      return (r && r.status === 'ok' && Array.isArray(r.entries)) ? r.entries.length : null;
    } catch (e) { return null; }
  }

  function pickerVisible() {
    var box = byId(EXISTING.unfiledPicker);
    return !!(box && !box.classList.contains('hidden'));
  }

  /* 成否が確定したか判定する。
     成功シグナル：既存の受け取り頁（unfiledShelfPicker）が出た、または蔵書が1冊増えた。
     どちらも既存実装の結果であり、V2 が独自に保存したものではない。 */
  function settleIfDecided() {
    if (!pending || pending.settled) return;
    var srcBtn = byId(EXISTING.submit);
    var countNow = libraryCount();
    var grew = (pending.countBefore !== null && countNow !== null && countNow > pending.countBefore);

    if (pickerVisible() || grew) {
      pending.settled = true;
      state.submitting = false;
      state.lastOutcome = 'success';
      onBindSuccess(pending.scope);
      return;
    }
    // 既存ボタンが押せる状態へ戻っている＝既存側で停止した（検証エラー／保存エラー）
    if (srcBtn && !srcBtn.disabled) {
      pending.settled = true;
      state.submitting = false;
      state.lastOutcome = (byId(EXISTING.msg) && byId(EXISTING.msg).textContent) ? 'error' : null;
      onBindStopped(pending.scope);
    }
  }

  /* 成功：既存の離脱経路（今は棚を決めず、本棚へ）をそのまま使い、V2 は 06 を表示する。
     新しい永続 flag（new badge / recent flag / 新 storage field）は付けない。
     並び順も既存 library の順のまま触らない。 */
  function onBindSuccess(scope) {
    var skip = byId(EXISTING.unfiledSkip);
    if (skip && pickerVisible()) skip.click();   // 既存 goToPage('bookshelf') 等はこの中

    var bs = global.V2BookshelfAdapter;
    if (bs && typeof bs.refresh === 'function') bs.refresh();

    var nav = global.V2NavigationAdapter;
    if (nav && typeof nav.go === 'function') nav.go('bookshelf');   // 0冊なら既存 resolver が 08

    pull(scope);
    syncMirrors(scope);
  }

  /* 停止（検証エラー・保存エラー）：05 に留まる。本文・下書きには触れない。 */
  function onBindStopped(scope) {
    syncMirrors(scope);
    var msgEl = v2('msg', scope);
    if (msgEl && msgEl.textContent) {
      // 既存メッセージの内容は書き換えず、読み上げだけ確実にする
      msgEl.setAttribute('role', 'status');
    }
  }

  /* ---------------------------------------------------------------------------
   * 監視
   * 既存側の DOM 変化（メッセージ・文字数・ボタン活性・受け取り頁）を写すためだけに使う。
   * library / storage の監視はしない。polling / setInterval も使わない。
   * ------------------------------------------------------------------------ */
  function observe(target, opts, cb) {
    if (!target || typeof global.MutationObserver !== 'function') return null;
    var mo = new global.MutationObserver(cb);
    mo.observe(target, opts);
    observers.push(mo);
    return mo;
  }

  function startObservers(scope) {
    var onAny = function () { syncMirrors(scope); settleIfDecided(); };
    observe(byId(EXISTING.msg), { childList: true, characterData: true, subtree: true }, onAny);
    observe(byId(EXISTING.count), { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] }, onAny);
    observe(byId(EXISTING.submit), { attributes: true, attributeFilter: ['disabled'] }, onAny);
    observe(byId(EXISTING.story), { attributes: true, attributeFilter: ['value'] }, function () { pull(scope); });
    if (doc && doc.body) {
      observe(doc.body, { childList: true }, function () { settleIfDecided(); });
    }
  }

  function stopObservers() {
    for (var i = 0; i < observers.length; i++) {
      try { observers[i].disconnect(); } catch (e) { /* ignore */ }
    }
    observers = [];
  }

  /* ---------------------------------------------------------------------------
   * 配線
   * ------------------------------------------------------------------------ */
  function onStoryInput(ev) {
    var el = ev.currentTarget;
    pushField(EXISTING.story, el.value);
    syncMirrors();
  }
  function onTitleInput(ev) {
    var el = ev.currentTarget;
    pushField(EXISTING.title, el.value);
    syncMirrors();
  }
  function onBindClick() { bind(); }

  function mount(scope) {
    if (!doc) return false;
    var s = v2('story', scope), t = v2('title', scope), btn = v2('bind', scope);

    if (s) {
      s.removeEventListener('input', onStoryInput);
      s.addEventListener('input', onStoryInput);
      // 既存の start_writing 判定関数そのものを付ける（再実装しない）。
      // 利用者の実入力だけが isTrusted=true になり、既存の共有ガードで1回だけ発火する。
      if (typeof global.handleGenuineStartWritingInput === 'function') {
        s.removeEventListener('input', global.handleGenuineStartWritingInput);
        s.addEventListener('input', global.handleGenuineStartWritingInput);
      }
      s.disabled = false;
      s.removeAttribute('aria-disabled');
    }
    if (t) {
      t.removeEventListener('input', onTitleInput);
      t.addEventListener('input', onTitleInput);
      t.disabled = false;
      t.removeAttribute('aria-disabled');
    }
    if (btn) {
      btn.removeEventListener('click', onBindClick);
      btn.addEventListener('click', onBindClick);
      btn.disabled = false;
      btn.removeAttribute('aria-disabled');
    }

    stopObservers();
    startObservers(scope);
    pull(scope);          // 既存側に下書きが復元済みなら引き取る
    state.mounted = true;
    return true;
  }

  function unmount(scope) {
    if (!doc) return false;
    var s = v2('story', scope), t = v2('title', scope), btn = v2('bind', scope);
    if (s) {
      s.removeEventListener('input', onStoryInput);
      if (typeof global.handleGenuineStartWritingInput === 'function') {
        s.removeEventListener('input', global.handleGenuineStartWritingInput);
      }
    }
    if (t) t.removeEventListener('input', onTitleInput);
    if (btn) btn.removeEventListener('click', onBindClick);
    stopObservers();
    pending = null;
    state.submitting = false;
    state.mounted = false;
    return true;
  }

  global.V2FormAdapter = {
    EXISTING: EXISTING,
    mount: mount,
    unmount: unmount,
    bind: bind,
    push: pushAll,
    pull: pull,
    sync: syncMirrors,
    settle: settleIfDecided,
    getState: function () {
      return {
        mounted: state.mounted,
        submitting: state.submitting,
        lastOutcome: state.lastOutcome,
        lastError: state.lastError,
        pending: pending ? { settled: pending.settled, countBefore: pending.countBefore } : null
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);

/* =============================================================================
 * V3 Isolated UX Prototype — surfaces and state transitions
 * -----------------------------------------------------------------------------
 * 既存9 Surfaceは固定。PASS C1の公開Editorial detailは、有限2-slotから
 * 到達する補助surfaceとしてのみ追加し、feed/navigation系の画面を増やさない。
 * analytics network 送信 0 / 外部 AI 0 / login 0。
 * 外部遷移は approved Action Destination の HTTPS action だけを扱う。
 * ========================================================================== */
(function (global) {
  'use strict';

  var D = global.V3_DATA;
  var STORE = global.V3_STORE;
  var P = global.V3_PERSONALIZE;
  var AD = global.V3_ACTION_DESTINATION;
  var REAL = global.V3_REAL_EXPERIENCE_REGISTRY;
  var INTERESTED = global.V3_INTERESTED_RETRIEVAL;
  var PUBLIC_EDITORIAL = global.V3_PUBLIC_EDITORIAL;
  var MEASUREMENT = global.V3_ANALYTICS;

  var state = STORE.emptyState();
  var interested = STORE.emptyInterested();
  var interestPending = {};
  var screen = 'entrance';
  var view, live, stepbar;
  var interestedLayer = null;
  var interestedOpener = null;
  var selectedEditorialId = null;
  var historyReady = false;
  var measurementSequence = 0;
  var navigationSequence = 0;
  var pendingDeckMotion = null;
  var pendingFocusSelector = null;

  /* ---------------------------------------------------------------- helpers */

  function h(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function reducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function announce(message) {
    live.textContent = '';
    global.setTimeout(function () { live.textContent = message; }, 30);
  }

  function persist() { return STORE.save(state); }

  function cloneState() {
    return JSON.parse(JSON.stringify(state));
  }

  function restoreState(snapshot) {
    state = snapshot;
    /* Keep the in-memory fallback aligned with the restored UI state. The
       result remains fail-closed and is deliberately not presented as saved. */
    STORE.save(state);
  }

  function nextMeasurementToken(kind) {
    measurementSequence += 1;
    return kind + ':' + measurementSequence;
  }

  function measureOnce(eventName, token) {
    if (!MEASUREMENT || typeof MEASUREMENT.emitOnce !== 'function') return false;
    try {
      return MEASUREMENT.emitOnce(eventName, token, {}).ok === true;
    } catch (error) {
      /* Measurement availability must never block Product behavior. */
      return false;
    }
  }

  function measureDurableSave(saveResult, token) {
    if (!MEASUREMENT || typeof MEASUREMENT.emitDurableSave !== 'function') return false;
    try {
      return MEASUREMENT.emitDurableSave(saveResult, token).ok === true;
    } catch (error) {
      return false;
    }
  }

  function measureCurrentView() {
    var eventByScreen = {
      entrance: 'v3_entrance_view',
      discovery: 'v3_discovery_view',
      'editorial-detail': 'v3_editorial_open',
      moment: 'v3_return_view',
      trace: 'v3_trace_start'
    };
    var eventName = eventByScreen[screen];
    if (eventName) measureOnce(eventName, 'view:' + navigationSequence);
  }

  function stopActiveMedia() {
    if (!view) return;
    view.querySelectorAll('audio, video').forEach(function (media) {
      try { media.pause(); } catch (error) { /* removal still stops playback */ }
    });
    view.querySelectorAll('iframe').forEach(function (frame) {
      try { frame.src = 'about:blank'; } catch (error) { /* fail closed on removal */ }
    });
  }

  /* S1A has no public Review surface. Normalize the retired route before it
     reaches History or rendering; stale/malformed decks remain fail-closed. */
  function normalizePublicScreen(next) {
    if (next !== 'review') return next;
    return currentDeckMatchesSelectedShelf() ? 'none' : 'understanding';
  }

  function go(next, options) {
    stopActiveMedia();
    screen = normalizePublicScreen(next);
    navigationSequence += 1;
    if (historyReady && !(options && options.fromHistory)) {
      try {
        global.history.pushState({ v3Screen: screen }, '', global.location.href);
      } catch (error) {
        /* The local prototype remains usable when History API is unavailable. */
      }
    }
    render();
  }

  function metaLine(experience) {
    return [experience.type, experience.duration, experience.price].filter(function (value) {
      return Boolean(value);
    }).join(' ／ ');
  }

  function approvedRealDeck(emotionId) {
    if (!REAL || typeof REAL.deckForEmotion !== 'function') return null;
    try { return REAL.deckForEmotion(emotionId); }
    catch (error) { return null; }
  }

  function publicDeckState(deck) {
    if (!deck || !Array.isArray(deck.ids) || deck.ids.length > 3 ||
        deck.ids.some(function (id, index) {
          return typeof id !== 'string' || !id || deck.ids.indexOf(id) !== index;
        })) {
      return 'error';
    }
    return deck.ids.length === 0 ? 'empty' : 'ready';
  }

  function selectedShelf() {
    return D.emotionById(state.emotion);
  }

  function selectedShelfLabel() {
    var shelf = selectedShelf();
    return shelf ? shelf.label : '';
  }

  var PUBLIC_SHELF_LENS = Object.freeze({
    hajimu: 'この棚では、歩き出す、手を伸ばす、次を探す。そんなふうに、身体や視線が前へ動く場面に注目しています。',
    atatamaru: 'この棚では、世話をする、声をかける、何かを手渡す。そんな小さなやりとりから、人とのつながりが育っていく場面に注目しています。',
    hikareru: 'この棚では、形、細部、素材、音、動き。理由を言葉にする前に、まず目や耳が引かれるところに注目しています。',
    shizumu: 'この棚では、失われたもの、重ねられた時間、静かな場所。すぐに答えを出さず、その重さのそばに留まれるものに注目しています。',
    zawatsuku: 'この棚では、いつもの風景や習慣に、見慣れない一面が現れる。そんな、ものの見方が少し揺れる場面に注目しています。',
    butsukaru: 'この棚では、異なる考え方、素材、方法が出会う。そこで生まれる摩擦から、それぞれの違いが見えてくる場面に注目しています。',
    miwohiku: 'この棚では、少し離れる、いったん手を止める、関わらない。距離を取ることで初めて見えるものに注目しています。',
    mada: 'この棚では、形や意味が一つに決まらず、いくつもの見方が残るものに注目しています。まだ言葉にできなくても、そのまま見比べられる棚です。'
  });

  function selectedShelfLens() {
    return PUBLIC_SHELF_LENS[state.emotion] || '';
  }

  function approvedOutingById(id) {
    var deck = approvedRealDeck(state.emotion);
    if (publicDeckState(deck) === 'error' || deck.ids.indexOf(id) === -1) return null;
    var experience = null;
    try { experience = REAL && REAL.byId ? REAL.byId(id) : null; }
    catch (error) { return null; }
    return experience && experienceInformationContract(experience) ? experience : null;
  }

  function activeDeckCount() {
    return state.deck && state.deck.ids ? state.deck.ids.length : 0;
  }

  function publicEditorialRecords() {
    var content = global.V3_PUBLIC_EDITORIAL_CONTENT;
    return content && Array.isArray(content.records) ? content.records : [];
  }

  function publicEditorialOptions() {
    return {
      shelfIds: D.EMOTIONS.map(function (item) { return item.id; }),
      asOf: new Date().toISOString().slice(0, 10)
    };
  }

  function activeEditorialForShelf(shelfId) {
    if (!PUBLIC_EDITORIAL || !PUBLIC_EDITORIAL.resolveForShelf) return [];
    return PUBLIC_EDITORIAL.resolveForShelf(
      publicEditorialRecords(), shelfId, publicEditorialOptions()
    ).items;
  }

  function activeEditorialById(shelfId, connectionId) {
    if (!PUBLIC_EDITORIAL || !PUBLIC_EDITORIAL.findActive || !connectionId) return null;
    return PUBLIC_EDITORIAL.findActive(
      publicEditorialRecords(), shelfId, connectionId, publicEditorialOptions()
    );
  }

  function isInterested(id) {
    return interested.items.some(function (item) { return item.experienceId === id; });
  }

  function usesDurableInterest(id) {
    var experience = D.byId(id);
    return Boolean(experience && experience.sourceClass === 'approved-real-experience');
  }

  function interestedLabel(id) {
    return isInterested(id) ? '気になる・保存済み' : '気になる';
  }

  function interestedFocusable() {
    if (!interestedLayer) return [];
    return Array.prototype.slice.call(interestedLayer.querySelectorAll(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    ));
  }

  function setBackgroundInert(value) {
    [document.querySelector('.site-header'), stepbar, view,
      document.querySelector('.legal-footer')].forEach(function (node) {
      if (!node) return;
      node.inert = value;
      if (value) node.setAttribute('aria-hidden', 'true');
      else node.removeAttribute('aria-hidden');
    });
  }

  function closeInterestedLayer(restoreFocus) {
    if (!interestedLayer) return;
    document.removeEventListener('keydown', onInterestedKeydown);
    interestedLayer.remove();
    interestedLayer = null;
    document.body.classList.remove('has-interested-layer');
    setBackgroundInert(false);
    if (restoreFocus && interestedOpener && document.contains(interestedOpener)) {
      interestedOpener.focus();
    }
    interestedOpener = null;
  }

  function onInterestedKeydown(event) {
    if (!interestedLayer) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeInterestedLayer(true);
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = interestedFocusable();
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function viewInterestedItem(item) {
    if (!item || item.status !== 'actionable') return;
    closeInterestedLayer(false);
    state.emotion = item.shelfId;
    startDeck('real-approved', [item.experienceId]);
    state.selectedId = item.experienceId;
    persist();
    measureOnce('v3_experience_select', nextMeasurementToken('experience-select'));
    go('detail');
    announce('保存していた体験の詳細を開きました。');
  }

  function removeInterestedItem(item, button) {
    if (!item || !item.experienceId || button.disabled) return;
    button.disabled = true;
    STORE.removeInterested(item.experienceId).then(function (result) {
      if (!result || result.ok !== true) {
        button.disabled = false;
        announce('保存の解除に失敗しました。保存済みの状態を保ちます。');
        return;
      }
      interested = result.value;
      if (interested.items.length === 0) {
        closeInterestedLayer(false);
        render();
        announce('保存を解除しました。');
        return;
      }
      renderInterestedLayer();
      announce('保存を解除しました。');
    }).catch(function () {
      button.disabled = false;
      announce('保存の解除に失敗しました。保存済みの状態を保ちます。');
    });
  }

  function interestedRow(item) {
    var actionable = item.status === 'actionable';
    var text = actionable ? [
      h('p', { class: 'interested-item-type', text: item.type }),
      h('h3', { class: 'interested-item-title', text: item.title }),
      item.place ? h('p', { class: 'interested-item-place', text: item.place }) : null
    ] : [
      h('h3', { class: 'interested-item-title', text: '現在は案内できません' }),
      h('p', {
        class: 'interested-item-unavailable',
        text: '最新の確認条件を満たしていないため、詳細は表示していません。'
      })
    ];
    var actions = [];
    if (actionable) {
      actions.push(h('button', {
        class: 'btn btn-line btn-sm', type: 'button',
        onclick: function () { viewInterestedItem(item); }
      }, [h('span', { text: '見る' })]));
    }
    var removeButton = h('button', {
      class: 'btn btn-text btn-sm', type: 'button'
    }, [h('span', { text: '保存を解除' })]);
    removeButton.addEventListener('click', function () {
      removeInterestedItem(item, removeButton);
    });
    actions.push(removeButton);
    return h('li', {
      class: 'interested-item' + (actionable ? '' : ' is-unavailable')
    }, [
      h('div', { class: 'interested-item-copy' }, text),
      h('div', { class: 'interested-item-actions' }, actions)
    ]);
  }

  function renderInterestedLayer() {
    if (!interestedLayer) return;
    var panel = interestedLayer.querySelector('.interested-panel');
    var items = INTERESTED ? INTERESTED.resolveAll(interested) : [];
    panel.textContent = '';
    var closeButton = h('button', {
      class: 'interested-close', type: 'button', 'aria-label': '閉じる',
      onclick: function () { closeInterestedLayer(true); }
    }, [h('span', { 'aria-hidden': 'true', text: '×' })]);
    panel.appendChild(closeButton);
    panel.appendChild(h('p', { class: 'eyebrow', text: 'この端末に保存したもの' }));
    panel.appendChild(h('h2', {
      class: 'interested-title', id: 'interested-title', text: '気になるもの'
    }));
    panel.appendChild(h('p', {
      class: 'interested-note',
      text: '保存した新しい順です。現在の確認条件を満たすものだけ、詳細を開けます。'
    }));
    panel.appendChild(h('ul', { class: 'interested-list' }, items.map(interestedRow)));
    closeButton.focus();
  }

  function openInterestedLayer(opener) {
    if (!interested.items.length) return;
    closeInterestedLayer(false);
    interestedOpener = opener;
    interestedLayer = h('div', {
      class: 'interested-layer', role: 'dialog', 'aria-modal': 'true',
      'aria-labelledby': 'interested-title',
      onclick: function (event) {
        if (event.target === interestedLayer) closeInterestedLayer(true);
      }
    }, [h('div', { class: 'interested-panel' })]);
    document.body.appendChild(interestedLayer);
    document.body.classList.add('has-interested-layer');
    setBackgroundInert(true);
    document.addEventListener('keydown', onInterestedKeydown);
    renderInterestedLayer();
  }

  /* Existing Discovery semantics stay authoritative. For approved real
     Experiences, durable save/remove completes before the decision/UI moves. */
  function decideWithInterest(id, value, onSuccess) {
    var shouldMeasureSave = value === 'keep' && !isInterested(id);
    var saveToken = shouldMeasureSave ? nextMeasurementToken('experience-save') : null;
    function completeDecision() {
      if (onSuccess) onSuccess();
      else decide(id, value);
    }
    if (!usesDurableInterest(id)) { completeDecision(); return; }
    if (interestPending[id]) return;
    if (value === 'pass' && !isInterested(id)) { completeDecision(); return; }

    interestPending[id] = true;
    var operation = value === 'keep' ? STORE.saveInterested(id) : STORE.removeInterested(id);
    operation.then(function (result) {
      delete interestPending[id];
      if (shouldMeasureSave) measureDurableSave(result, saveToken);
      if (!result || result.ok !== true) {
        render();
        announce(value === 'keep'
          ? '端末に保存できませんでした。気になる状態にはしていません。'
          : '保存の解除に失敗しました。保存済みの状態を保ちます。');
        return;
      }
      interested = result.value;
      completeDecision();
    }).catch(function () {
      delete interestPending[id];
      render();
      announce(value === 'keep'
        ? '端末に保存できませんでした。気になる状態にはしていません。'
        : '保存の解除に失敗しました。保存済みの状態を保ちます。');
    });
  }

  /* Public Cultural Matching uses explicit bookmark semantics only. Browsing,
     Detail and media never call this function and never alter Interested. */
  function toggleInterested(id) {
    if (!usesDurableInterest(id) || interestPending[id]) return;
    var wasInterested = isInterested(id);
    var saveToken = wasInterested ? null : nextMeasurementToken('experience-save');
    interestPending[id] = true;
    var operation = wasInterested ? STORE.removeInterested(id) : STORE.saveInterested(id);
    operation.then(function (result) {
      delete interestPending[id];
      if (!wasInterested) measureDurableSave(result, saveToken);
      if (!result || result.ok !== true) {
        render();
        announce(wasInterested
          ? '保存の解除に失敗しました。保存済みの状態を保ちます。'
          : '端末に保存できませんでした。気になる状態にはしていません。');
        return;
      }
      interested = result.value;
      pendingFocusSelector = '.real-discovery-interest';
      render();
      announce(wasInterested ? '気になるものから外しました。' : 'この端末の気になるものに保存しました。');
    }).catch(function () {
      delete interestPending[id];
      render();
      announce(wasInterested
        ? '保存の解除に失敗しました。保存済みの状態を保ちます。'
        : '端末に保存できませんでした。気になる状態にはしていません。');
    });
  }

  /* ------------------------------------------------------------ deck helper */

  function finiteDiscoveryIds(ids) {
    var authority = D.DISCOVERY_FIXTURES.map(function (fixture) { return fixture.recordId; });
    var ordered = (ids || []).filter(function (id) { return authority.indexOf(id) !== -1; });
    authority.forEach(function (id) {
      if (ordered.indexOf(id) === -1) ordered.push(id);
    });
    return ordered.slice(0, 3);
  }

  function startDeck(mode, ids, facets) {
    if (mode === 'base') ids = finiteDiscoveryIds(ids);
    state.deck = {
      mode: mode,
      ids: ids,
      index: 0,
      decisions: {},
      activeId: null,
      facets: facets || []
    };
  }

  function navigateDeck(delta, preserveControlFocus) {
    if (!state.deck || state.deck.mode !== 'real-approved' ||
        publicDeckState(state.deck) !== 'ready') return false;
    var nextIndex = state.deck.index + delta;
    if (nextIndex < 0 || nextIndex >= state.deck.ids.length) return false;
    stopActiveMedia();
    state.deck.index = nextIndex;
    pendingDeckMotion = delta > 0 ? 'next' : 'previous';
    pendingFocusSelector = preserveControlFocus
      ? (delta > 0 ? '.deck-next-action' : '.deck-previous-action') : null;
    render();
    var experience = approvedOutingById(state.deck.ids[state.deck.index]);
    announce('候補 ' + (state.deck.index + 1) + ' / ' + state.deck.ids.length +
      (experience ? '「' + experience.title + '」' : '') + 'を表示しました。');
    return true;
  }

  function completeDeck() {
    if (!state.deck || state.deck.mode !== 'real-approved' ||
        publicDeckState(state.deck) !== 'ready') return;
    go('none');
    announce('この棚は、ここまでです。');
  }

  function deckHasId(id) {
    return Boolean(state.deck && id && state.deck.ids.indexOf(id) !== -1);
  }

  function validActiveId() {
    if (!state.deck || !deckHasId(state.deck.activeId)) return null;
    return state.deck.decisions[state.deck.activeId] === 'keep' ? state.deck.activeId : null;
  }

  function deckKept() {
    if (!state.deck) return [];
    return state.deck.ids.filter(function (id) {
      return state.deck.decisions[id] === 'keep';
    });
  }

  function deckPassed() {
    if (!state.deck) return [];
    return state.deck.ids.filter(function (id) {
      return state.deck.decisions[id] === 'pass';
    });
  }

  function decide(id, value) {
    /* Never write an undefined/foreign decision key. */
    if (!deckHasId(id) || (value !== 'keep' && value !== 'pass')) return;
    state.deck.decisions[id] = value;
    if (value === 'pass' && state.deck.activeId === id) state.deck.activeId = null;
    state.deck.index += 1;
    if (state.deck.index >= state.deck.ids.length && state.deck.mode === 'base') {
      var kept = deckKept();
      state.deck.activeId = kept.length === 1 ? kept[0] : null;
    }
    persist();
    if (state.deck.index >= state.deck.ids.length) {
      if (state.deck.mode === 'base') {
        go('review');
        announce(kept.length === 0
          ? activeDeckCount() + 'つすべてを「今回は違う」としました。'
          : activeDeckCount() + 'つの体験を見終えました。');
      } else {
        go(deckKept().length > 0 ? 'review' : 'none');
      }
    } else {
      render();
      announce(value === 'keep' ? '気になる、として次へ進みました。' : '今回は違う、として次へ進みました。');
    }
  }

  function undo() {
    if (!state.deck || state.deck.index === 0) return;
    state.deck.index -= 1;
    delete state.deck.decisions[state.deck.ids[state.deck.index]];
    persist();
    render();
    announce('前の体験に戻りました。');
  }

  /* ------------------------------------------------------------------ icons */
  /* UI icon のみ。ロゴは承認済みアセットを使用し、再描画・組版は行わない。 */

  var ICON_PATHS = {
    heart: 'M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20Z',
    book: 'M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4Zm16 0h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6Z',
    window: 'M5 4h14v16H5Zm7 0v16M5 12h14',
    bookmark: 'M7 4h10v16l-5-4-5 4Z',
    lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6Z',
    location: 'M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
    calendar: 'M6 3v3M18 3v3M4 7h16v13H4ZM4 10h16',
    yenCircle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 7l4 5 4-5M12 12v6M8.5 13.5h7M8.5 16h7',
    back: 'M15 5l-7 7 7 7'
  };

  function icon(name, size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (size) { svg.setAttribute('width', size); svg.setAttribute('height', size); }
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ICON_PATHS[name]);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.4');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  /* ---------------------------------------------------------------- stepbar */
  /* canonical がヘッダーを定義しているのは M02–M05 / W02–W05 のみ。
     canonical のない surface では back のみを出し、step 番号を作らない。 */

  function stepbarConfig() {
    var word = D.emotionById(state.emotion);
    var deck = state.deck;
    var count = activeDeckCount();
    switch (screen) {
      case 'emotion':
        return { back: 'entrance', title: '感情の棚を選ぶ', count: '1 / 3', progress: 1 / 3, step: 'STEP 1' };
      case 'understanding':
        return { back: 'emotion' };
      case 'editorial-detail':
        return { back: 'understanding' };
      case 'discovery':
        return {
          back: deck && deck.mode === 'personalized' ? 'entrance' : 'understanding',
          title: deck && deck.mode === 'personalized' ? '次の' + count + 'つ' : (word ? word.label : ''),
          count: deck ? (deck.index + 1) + ' / ' + deck.ids.length : '',
          progress: deck ? (deck.index + 1) / deck.ids.length : 0,
          step: 'STEP 2 / 4',
          stepTitle: count + 'つの文化物を見る',
          hint: count > 1 ? '前へ／次へで、ひとつずつ見られます' : 'ひとつの文化物を、ゆっくり見られます'
        };
      case 'review':
      case 'none':
        return {
          back: 'discovery', title: count + 'つ見ました', count: count + ' / ' + count, progress: 1,
          step: 'STEP 2 / 4', stepTitle: count + 'つの文化物を見る',
          hint: 'この棚は、ここまでです'
        };
      case 'detail':
        return { back: validActiveId() ? 'review' : 'discovery' };
      case 'plan':
        return { back: 'detail' };
      case 'moment':
        return { back: 'entrance' };
      case 'trace':
        return {
          back: 'moment', backLabel: '戻る', count: '4 / 4', progress: 1,
          step: 'STEP 4 / 4', stepTitle: '触れたあとに、残ったものを選ぶ'
        };
      default:
        return null;
    }
  }

  function renderStepbar() {
    stepbar.textContent = '';
    var config = stepbarConfig();
    var progressPercent;
    if (!config) return;

    var back = h('button', {
      class: 'stepbar-back', type: 'button',
      'aria-label': config.backLabel || '前の画面へ戻る',
      onclick: function () { go(config.back); }
    }, [
      h('span', { class: 'stepbar-back-label', text: config.backLabel || '戻る' })
    ]);

    var center = h('p', { class: 'stepbar-title' }, [
      config.step ? h('span', { class: 'stepbar-step', text: config.step + (config.stepTitle ? '　' + config.stepTitle : '') }) : null,
      config.title ? h('span', { text: config.title }) : null
    ]);

    var right = h('p', { class: 'stepbar-count', text: config.count || '' });

    var nodes = [h('div', { class: 'stepbar-row' }, [back, center, right])];
    if (config.progress) {
      progressPercent = Math.round(config.progress * 100);
      nodes.push(h('div', {
        class: 'stepbar-progress', role: 'progressbar',
        'aria-label': '体験の進行状況', 'aria-valuemin': '0', 'aria-valuemax': '100',
        'aria-valuenow': String(progressPercent)
      }, [
        h('span', { class: 'stepbar-progress-value is-' + progressPercent })
      ]));
    }
    nodes.forEach(function (node) { stepbar.appendChild(node); });
  }

  /* --------------------------------------------------------------- surfaces */

  function surfaceEntrance() {
    /* 99_v3 canonical からの未改変pixel cropのみを使用する。
       Crop座標・hash・使用条件は ASSET_MANIFEST.json に固定する。 */
    var hero = h('picture', { class: 'hero' }, [
      h('source', { media: '(min-width: 1200px)', srcset: './assets/canonical-m01-w01/w01_hero.png' }),
      h('img', {
        class: 'hero-img',
        src: './assets/canonical-m01-w01/m01_hero.png',
        alt: '外の世界へ続く道を歩く人のイラスト',
        width: '941', height: '680'
      })
    ]);

    var copy = h('div', { class: 'entrance-copy' }, [
      h('p', { class: 'brand-lockup-wrap' }, [
        h('img', {
          class: 'brand-lockup', src: './assets/canonical-m01-w01/m01_stacked_lockup.png',
          alt: 'みんなの感情書店 EMOTION BOOKSTORE', width: '402', height: '260'
        })
      ]),
      h('h1', { class: 'display', tabindex: '-1', id: 'surface-title' }, [
        h('span', { class: 'display-line', text: '感じていることから、' }),
        h('span', { class: 'display-line', text: '次に触れるものを見つける。' })
      ]),
      h('p', { class: 'lede' }, [
        h('span', { class: 'lede-line', text: '気になる感情の棚をのぞくと、' }),
        h('span', { class: 'lede-line', text: '理由のある寄り道が見つかります。' }),
        h('span', { class: 'lede-line', text: 'そして、実際に触れたあとに残ったものを、' }),
        h('span', { class: 'lede-line', text: '自分だけの記録として残せます。' })
      ]),
      h('button', {
        class: 'btn btn-primary cta-primary', type: 'button',
        onclick: function () { go('emotion'); }
      }, [
        h('span', { class: 'cta-main', text: 'はじめる' }),
        h('span', { class: 'cta-sub', text: '感情の棚を選ぶ' })
      ]),
      interested.items.length ? h('button', {
        class: 'interested-entry', type: 'button',
        onclick: function (event) { openInterestedLayer(event.currentTarget); }
      }, [icon('heart'), h('span', { text: '気になるものを見る' })]) : null
    ]);

    var nodes = [h('div', { class: 'entrance-hero' }, [copy, hero])];

    if (state.plan && state.plan.status === 'open') {
      var planned = D.byId(state.plan.experienceId);
      nodes.push(h('aside', { class: 'return-surface', 'aria-label': '前回の予定' }, [
        h('p', { class: 'return-text', text: 'この前選んだ体験があります。' }),
        h('button', {
          class: 'btn btn-quiet', type: 'button',
          onclick: function () { go('moment'); }
        }, [h('span', { text: planned ? planned.title : '体験を見る' })])
      ]));
    }

    nodes.push(loopSection());
    nodes.push(trustSection());
    nodes.push(experienceFlowSection());
    nodes.push(faqSection());

    var surface = section('01-entrance', nodes);
    surface.classList.add('entrance');
    return surface;
  }

  /* Core Loop 4 steps。M01/W01のcopyは99_v3 canonicalを文字単位で固定する。 */
  var LOOP_STEPS = [
    {
      asset: '01',
      mobileTitle: '感情の棚を選ぶ', mobileNote: ['気になる棚を', 'ひとつのぞく'],
      desktopTitle: '感情の棚を選ぶ', desktopNote: ['今の気持ちと違っても、', '気になる棚をのぞく']
    },
    {
      asset: '02',
      mobileTitle: '寄り道に出会う', mobileNote: ['理由のある候補を見る'],
      desktopTitle: '寄り道に出会う', desktopNote: ['棚の角度から置かれた、', '理由のある候補を見る']
    },
    {
      asset: '03',
      mobileTitle: '外へ出る', mobileNote: ['実際に触れてみる'],
      desktopTitle: '実際に触れる', desktopNote: ['読む・観る・聴く・訪れる。', '外の世界とつながる']
    },
    {
      asset: '04',
      mobileTitle: '残ったものを残す', mobileNote: ['次の出会いの', '手がかりにする'],
      desktopTitle: '残ったものを残す', desktopNote: ['心に残ったものを選んで、', '自分だけの記録にする']
    }
  ];

  function copyLines(lines, className) {
    return h('span', { class: className }, lines.map(function (line) {
      return h('span', { class: 'copy-line', text: line });
    }));
  }

  function loopSection() {
    return h('ul', { class: 'loop', id: 'core-loop', 'aria-label': '体験の流れ' }, LOOP_STEPS.map(function (step, i) {
      return h('li', { class: 'loop-step' }, [
        h('span', { class: 'loop-visual' }, [
          h('span', { class: 'loop-num', 'aria-hidden': 'true', text: String(i + 1) }),
          h('picture', {}, [
            h('source', {
              media: '(min-width: 1200px)',
              srcset: './assets/canonical-m01-w01/w01_step_' + step.asset + '.png'
            }),
            h('img', {
              class: 'loop-img', alt: '',
              src: './assets/canonical-m01-w01/m01_step_' + step.asset + '.png'
            })
          ])
        ]),
        i < LOOP_STEPS.length - 1 ? h('span', {
          class: 'loop-connector', 'aria-hidden': 'true', text: '•••'
        }) : null,
        h('p', { class: 'loop-title' }, [
          h('span', { class: 'copy-mobile', text: step.mobileTitle }),
          h('span', { class: 'copy-desktop', text: step.desktopTitle })
        ]),
        h('p', { class: 'loop-note' }, [
          copyLines(step.mobileNote, 'copy-mobile'),
          copyLines(step.desktopNote, 'copy-desktop')
        ])
      ]);
    }));
  }

  /* 99_v3 canonicalのcopyを改稿せず再現する。PRODUCTION_COPY_REVIEW_REQUIRED */
  var TRUST_ITEMS = [
    {
      asset: 'private',
      heading: '登録不要・記録は非公開',
      support: 'この端末に保存した記録は公開されません。'
    },
    {
      asset: 'no_ai',
      heading: '記録を外部AIへ送りません',
      support: 'この端末に保存した内容を、外部AIへ送る機能はありません。'
    },
    {
      asset: 'device',
      heading: '記録はまずこの端末へ',
      support: '大切な記録は、あなたの端末に保存されます。'
    }
  ];

  function trustSection() {
    var items = TRUST_ITEMS.map(function (item) {
      return h('article', { class: 'trust-item' }, [
        h('img', {
          class: 'trust-icon', alt: '',
          src: './assets/canonical-m01-w01/w01_trust_' + item.asset + '.png'
        }),
        h('span', { class: 'trust-copy' }, [
          h('strong', { class: 'trust-heading', text: item.heading }),
          h('span', { class: 'trust-support', text: item.support })
        ])
      ]);
    });
    return h('section', { class: 'trust', id: 'trust', 'aria-labelledby': 'trust-heading' },
      [
        h('h2', { class: 'sr-only', id: 'trust-heading', text: 'よくある質問' }),
        h('p', { class: 'trust-mobile' }, [
          icon('lock'),
          h('span', { text: '登録不要・この端末に保存した記録は公開されません' })
        ]),
        h('div', { class: 'trust-desktop' }, items)
      ]);
  }

  /* W01 MENU destination copy. PRODUCTION_COPY_REVIEW_REQUIRED */
  var EXPERIENCE_FLOW_ITEMS = [
    {
      title: '感情の棚をひとつ選ぶ',
      copy: '今の気持ちと同じでなくて大丈夫です。少し気になる棚を、ひとつのぞきます。'
    },
    {
      title: '理由のある寄り道を見る',
      copy: '感情書店の編集部が、理由を説明できるものだけを置きます。0件の棚もあります。'
    },
    {
      title: '気になるものに触れる',
      copy: 'すぐに触れる、あとで予定する、今回は選ばない。決めるのはあなたです。'
    },
    {
      title: '残ったものを、必要なら残す',
      copy: '体験のあとに自分の中に残ったものを、必要なら自分の記録として残せます。'
    }
  ];

  var W01_FAQS = [
    {
      question: '登録は必要ですか？',
      answer: '登録しなくても利用できます。現在のV3 Releaseは、アカウントを作らずに使えます。'
    },
    {
      question: '感情の棚は診断ですか？',
      answer: 'いいえ。今の感情を当てたり、性格を判定したりするものではありません。今の気持ちと同じ棚でなくても、気になる棚を自由にのぞけます。'
    },
    {
      question: '選んだ棚はあとから変えられますか？',
      answer: 'はい。あとから選び直せます。「まだ名前がない」も、ひとつの正式な選択肢です。'
    },
    {
      question: '自分の記録は公開されますか？',
      answer: '自分の記録は公開されません。現在のV3ではこの端末のブラウザに保存し、外部サービスへ送信しません。公式サイトや地図を開いた後は、移動先の方針が適用されます。'
    },
    {
      question: 'AIが自分の本文を読みますか？',
      answer: 'この端末に保存した記録を外部AIへ送る機能はありません。'
    },
    {
      question: '位置情報は自動で使われますか？',
      answer: 'いいえ。現在のV3では位置情報を取得しません。地図を開く場合も、公開されている目的地だけをGoogle Mapsへ渡します。'
    }
  ];

  function experienceFlowSection() {
    return h('section', {
      class: 'w01-editorial-section w01-experience-flow',
      'aria-labelledby': 'experience-flow'
    }, [
      h('div', { class: 'w01-editorial-heading' }, [
        h('h2', { id: 'experience-flow', tabindex: '-1', text: '体験の流れ' }),
        h('p', { text: '感じていることから、次に触れるものを見つけるまで。' })
      ]),
      h('ol', { class: 'w01-experience-list' }, EXPERIENCE_FLOW_ITEMS.map(function (item, index) {
        return h('li', {}, [
          h('span', { class: 'w01-experience-number', 'aria-hidden': 'true', text: String(index + 1) }),
          h('h3', { text: item.title }),
          h('p', { text: item.copy })
        ]);
      }))
    ]);
  }

  function faqSection() {
    return h('section', {
      class: 'w01-editorial-section w01-faq',
      'aria-labelledby': 'faq'
    }, [
      h('div', { class: 'w01-editorial-heading' }, [
        h('h2', { id: 'faq', tabindex: '-1', text: 'よくある質問' })
      ]),
      h('div', { class: 'w01-faq-list' }, W01_FAQS.map(function (item, index) {
        var answerId = 'faq-answer-' + (index + 1);
        var answer = h('p', { id: answerId, class: 'w01-faq-answer', text: item.answer, hidden: true });
        var button = h('button', {
          class: 'w01-faq-trigger', type: 'button',
          'aria-expanded': 'false', 'aria-controls': answerId,
          onclick: function () {
            var expanded = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            answer.hidden = expanded;
          }
        }, [
          h('span', { text: item.question }),
          h('span', { class: 'w01-faq-mark', 'aria-hidden': 'true', text: '+' })
        ]);
        return h('article', { class: 'w01-faq-item' }, [
          h('h3', {}, [button]),
          answer
        ]);
      }))
    ]);
  }

  function surfaceEmotion() {
    var transitionToken = 0;

    function chooseEmotion(word, event) {
      var button = event.currentTarget;
      var token = ++transitionToken;
      document.querySelectorAll('.emotion-card').forEach(function (node) {
        node.setAttribute('aria-pressed', node === button ? 'true' : 'false');
      });
      state.emotion = word.id;
      state.deck = null;
      persist();
      measureOnce('v3_emotion_select', nextMeasurementToken('emotion-select'));

      /* selected stateをpaintしてから既存Understanding routeへ進む。 */
      global.setTimeout(function () {
        if (token === transitionToken && screen === 'emotion' && state.emotion === word.id) {
          go('understanding');
        }
      }, 120);
    }

    function descriptionPhraseLines(description) {
      var semanticWrap = {
        'どの言葉もしっくりこない': ['どの言葉も', 'しっくりこない']
      };
      var phrases = description.split('、');
      var lines = [];
      phrases.forEach(function (phrase, index) {
        var parts = semanticWrap[phrase] || [phrase];
        parts.forEach(function (part, partIndex) {
          lines.push(h('span', {
            class: 'emotion-description-phrase',
            text: part + (index < phrases.length - 1 && partIndex === parts.length - 1 ? '、' : '')
          }));
        });
      });
      return lines;
    }

    var list = h('ul', {
      class: 'emotion-grid', 'aria-label': '感情の棚をひとつ選ぶ'
    }, D.EMOTIONS.map(function (word) {
      return h('li', {}, [
        h('button', {
          class: 'emotion-card', type: 'button',
          'data-emotion-label': word.label,
          'aria-label': word.label + '。' + word.description,
          'aria-pressed': state.emotion === word.id ? 'true' : 'false',
          onclick: function (event) { chooseEmotion(word, event); }
        }, [
          h('span', { class: 'emotion-card-media', 'aria-hidden': 'true' }, [
            h('img', {
              class: 'emotion-card-image', alt: '',
              src: './assets/canonical-m02-w02/' + word.asset
            })
          ]),
          h('span', { class: 'emotion-card-copy' }, [
            h('strong', { class: 'emotion-card-label', text: word.label }),
            h('span', { class: 'emotion-card-description' }, descriptionPhraseLines(word.description))
          ])
        ])
      ]);
    }));

    var heading = h('h1', {
      class: 'emotion-heading', tabindex: '-1', id: 'surface-title'
    }, [
      h('span', { class: 'emotion-heading-mobile emotion-mobile-only' }, [
        h('span', { class: 'emotion-copy-line', text: 'どんな感情の棚を、' }),
        h('span', { class: 'emotion-copy-line', text: 'のぞいてみますか？' })
      ]),
      h('span', { class: 'emotion-heading-desktop emotion-desktop-only' }, [
        h('span', { class: 'emotion-copy-line', text: 'どんな感情の棚を、' }),
        h('span', { class: 'emotion-copy-line', text: 'のぞいてみますか？' })
      ])
    ]);

    var supportCopy = '今の気持ちと同じでなくて大丈夫です。少し気になる棚を、ひとつ。';
    var supportBreak = supportCopy.indexOf('。') + 1;
    var support = h('p', { class: 'emotion-support' }, [
      h('span', { class: 'emotion-copy-line emotion-support-choice' }, [
        h('span', { text: supportCopy.slice(0, supportBreak) }),
        h('br', { class: 'emotion-support-mobile-break' }),
        h('span', { text: supportCopy.slice(supportBreak) })
      ])
    ]);

    var intro = h('div', { class: 'emotion-intro' }, [
      h('div', { class: 'emotion-intro-copy' }, [
        h('p', { class: 'emotion-eyebrow emotion-desktop-only', text: 'STEP 1' }),
        heading,
        support
      ]),
      h('picture', { class: 'emotion-hero emotion-desktop-only' }, [
        h('img', {
          src: './assets/canonical-m02-w02/w02_hero.png', alt: '',
          width: '756', height: '300'
        })
      ])
    ]);

    var gridQuestion = h('h2', {
      class: 'emotion-grid-question emotion-desktop-only', text: '感情の棚'
    });

    var guidance = h('div', { class: 'emotion-guidance' }, [
      h('p', { class: 'emotion-guidance-copy' }, [
        h('span', {
          class: 'emotion-copy-line emotion-guidance-choice',
          'aria-label': 'どの棚をのぞくか迷うときは、「まだ名前がない」を選んでも大丈夫です。'
        }, [
          h('span', { class: 'emotion-guidance-choice-line', text: 'どの棚をのぞくか迷うときは、' }),
          h('span', { class: 'emotion-guidance-choice-line', text: '「まだ名前がない」を選んでも大丈夫です。' })
        ]),
        h('span', {
          class: 'emotion-copy-line emotion-guidance-trust-copy emotion-desktop-only',
          text: '選んだ棚は、今回の探索の手がかりとして使われます。性格や心理状態を決めつけません。'
        })
      ])
    ]);

    /* Canonical exact Trust copy。PRODUCTION_COPY_REVIEW_REQUIRED */
    var trust = h('div', { class: 'emotion-selection-trust' }, [
      h('span', { class: 'emotion-trust-icon', 'aria-hidden': 'true' }, [icon('lock')]),
      h('p', { class: 'emotion-trust-copy' }, [
        h('span', {
          class: 'emotion-copy-line emotion-trust-primary',
          'aria-label': '選んだ棚は、今回の探索の手がかりとして使われます。'
        }, [
          h('span', { class: 'emotion-trust-primary-line', text: '選んだ棚は、' }),
          h('span', { class: 'emotion-trust-primary-line', text: '今回の探索の手がかりとして使われます。' })
        ]),
        h('span', { class: 'emotion-copy-line', text: '性格や心理状態を決めつけません。' })
      ])
    ]);

    var surface = section('02-emotion', [
      intro,
      gridQuestion,
      list,
      h('aside', { class: 'emotion-footer', 'aria-label': '選択についての案内' }, [guidance, trust])
    ]);
    surface.classList.add('emotion-selection');
    return surface;
  }

  function surfaceUnderstanding() {
    var word = D.emotionById(state.emotion);
    var realDeck = approvedRealDeck(state.emotion);
    var deckState = publicDeckState(realDeck);
    if (deckState === 'ready' && !realDeck.ids.every(function (id) {
      return Boolean(approvedOutingById(id));
    })) deckState = 'error';
    var deckCount = deckState === 'ready' ? realDeck.ids.length : 0;
    var editorialItems = activeEditorialForShelf(state.emotion);
    var outcome = [];

    outcome.push(h('p', {
      class: 'body-lg understanding-editorial-note',
      text: selectedShelfLens()
    }));
    outcome.push(h('hr', { class: 'rule' }));
    if (deckState === 'error') {
      outcome.push(h('div', { class: 'understanding-error', 'data-deck-state': 'error' }, [
        h('h2', { class: 'section-title', text: 'いま、棚の案内を読み込めません' }),
        h('p', {
          class: 'body-lg',
          text: '確認済みの情報を正しく読み込めなかったため、候補は表示していません。'
        }),
        h('p', { class: 'note', text: '通信や情報の不備を、0件の案内として扱うことはしません。' }),
        h('div', { class: 'actions' }, [
          h('button', {
            class: 'btn btn-line', type: 'button', onclick: function () { render(); }
          }, [h('span', { text: 'もう一度確認する' })]),
          h('button', {
            class: 'btn btn-text', type: 'button', onclick: function () { go('emotion'); }
          }, [h('span', { text: '棚へ戻る' })])
        ])
      ]));
    } else if (deckState === 'empty') {
      outcome.push(h('div', { class: 'understanding-empty', 'data-deck-count': '0' }, [
        h('h2', { class: 'section-title', text: 'いま案内できる寄り道はありません' }),
        h('p', { class: 'body-lg', text: 'この棚には、いま置けるものがありません。' }),
        h('p', {
          class: 'note',
          text: '数をそろえるために、確認できていない体験を置くことはしません。'
        }),
        h('div', { class: 'actions' }, [
          h('button', {
            class: 'btn btn-line', type: 'button', onclick: function () { go('emotion'); }
          }, [h('span', { text: '別の棚をのぞく' })])
        ])
      ]));
    } else {
      outcome.push(h('p', {
        class: 'body-lg', 'data-deck-count': String(deckCount),
        text: 'この棚から案内できる寄り道は、' + deckCount + 'つです。'
      }));
      outcome.push(h('p', {
        class: 'note',
        text: '感情書店の編集部が、理由を説明できるものだけを選んでいます。'
      }));
      outcome.push(h('div', { class: 'actions' }, [
        h('button', {
          class: 'btn btn-primary', type: 'button',
          onclick: function () {
            startDeck('real-approved', realDeck.ids);
            persist();
            go('discovery');
          }
        }, [h('span', { text: deckCount + 'つの寄り道を見る' })])
      ]));
    }

    var identity = h('div', { class: 'understanding-identity-column' }, [
      h('p', { class: 'eyebrow', text: 'のぞいている感情の棚' }),
      h('div', { class: 'understanding-shelf-identity' }, [
        word ? h('img', {
          class: 'understanding-shelf-image', alt: '',
          src: './assets/canonical-m02-w02/' + word.asset
        }) : null,
        h('h1', {
          class: 'display display-sm', tabindex: '-1', id: 'surface-title',
          text: word ? word.label : ''
        })
      ])
    ]);
    var understandingChildren = [
      h('div', { class: 'understanding-panel' }, [
        identity,
        h('div', { class: 'understanding-outcome-column' }, outcome)
      ])
    ];
    if (editorialItems.length) understandingChildren.push(publicEditorialShelf(editorialItems));
    var surface = section('03-understanding', understandingChildren);
    surface.classList.add('understanding-bridge');
    surface.setAttribute('data-selected-shelf', state.emotion || '');
    return surface;
  }

  function editorialSlotLabel(record) {
    if (record.slot_type === 'fresh') {
      if (record.content_type === 'video') return '今週の映像';
      if (record.content_type === 'book') return '今週の一冊';
      if (record.content_type === 'place') return '今週の場所';
      return '今週の編集';
    }
    if (record.content_type === 'video') return 'この棚の映像';
    if (record.content_type === 'book') return 'この棚の一冊';
    if (record.content_type === 'place') return 'この棚の場所';
    return 'この棚の編集';
  }

  function openEditorialDetail(record) {
    if (!record || !record.connection_id) return;
    selectedEditorialId = record.connection_id;
    go('editorial-detail');
  }

  function publicEditorialCard(record) {
    var nodes = [];
    if (record.display_visual) {
      nodes.push(h('img', {
        class: 'public-editorial-card-visual', src: record.display_visual.src,
        alt: record.display_visual.alt, loading: 'lazy'
      }));
    }
    nodes.push(h('div', { class: 'public-editorial-card-copy' }, [
      h('p', { class: 'eyebrow', text: editorialSlotLabel(record) }),
      h('h3', { class: 'public-editorial-card-title', text: record.headline }),
      h('p', { class: 'public-editorial-card-lead', text: record.lead }),
      h('button', {
        class: 'btn btn-text public-editorial-card-action', type: 'button',
        onclick: function () { openEditorialDetail(record); }
      }, [h('span', { text: 'のぞく' }), h('span', { 'aria-hidden': 'true', text: '→' })])
    ]));
    return h('article', {
      class: 'public-editorial-card',
      'data-editorial-slot': record.slot_type,
      'data-connection-id': record.connection_id
    }, nodes);
  }

  function publicEditorialShelf(items) {
    return h('section', {
      class: 'public-editorial-shelf', 'aria-labelledby': 'public-editorial-heading'
    }, [
      h('div', { class: 'public-editorial-shelf-heading' }, [
        h('p', { class: 'eyebrow', text: '編集部が置いたもの' }),
        h('h2', {
          class: 'section-title', id: 'public-editorial-heading',
          text: 'この棚から、もうひとつ。'
        })
      ]),
      h('div', { class: 'public-editorial-grid' }, items.slice(0, 2).map(publicEditorialCard))
    ]);
  }

  function editorialTargetMeta(target) {
    return [target.kind, target.creator, target.release].filter(function (value) {
      return Boolean(value);
    }).join(' ／ ');
  }

  function surfaceEditorialDetail() {
    var word = selectedShelf();
    var record = activeEditorialById(state.emotion, selectedEditorialId);
    var nodes;
    var action;
    var media;
    var mediaIntentToken = nextMeasurementToken('editorial-media-intent');
    var editorialActionToken = nextMeasurementToken('editorial-action');
    if (!word || !record) return surfaceUnderstanding();

    if (record.video) {
      media = h('div', {
        class: 'public-editorial-video',
        'data-video-first-paint': 'provider-request-0'
      }, [
        h('p', { class: 'eyebrow', text: record.video.video_provider }),
        h('h2', { class: 'public-editorial-video-title', text: record.video.video_title }),
        h('p', { class: 'public-editorial-video-creator', text: record.video.creator_name })
      ]);
      action = h('button', {
        class: 'btn btn-primary public-editorial-primary', type: 'button',
        'data-video-activation': record.video.embed_status,
        onclick: function () {
          measureOnce('v3_editorial_media_intent', mediaIntentToken);
          if (record.video.embed_status === 'link_only') {
            measureOnce('v3_editorial_action', editorialActionToken);
          }
          if (PUBLIC_EDITORIAL.activateVideo(record, media)) {
            announce(record.video.embed_status === 'allowed'
              ? '映像を読み込みました。' : '公式の映像を新しいタブで開きました。');
          }
        }
      }, [
        h('span', { text: record.video.embed_status === 'allowed' ? '映像を再生' : '公式の映像を開く' }),
        h('span', { 'aria-hidden': 'true', text: record.video.embed_status === 'allowed' ? '▶' : '↗' })
      ]);
    } else {
      media = record.display_visual ? h('img', {
        class: 'public-editorial-detail-visual', src: record.display_visual.src,
        alt: record.display_visual.alt
      }) : null;
      action = h('button', {
        class: 'btn btn-primary public-editorial-primary', type: 'button',
        onclick: function () {
          measureOnce('v3_editorial_action', editorialActionToken);
          if (PUBLIC_EDITORIAL.openPrimary(record)) announce('公式の行き先を新しいタブで開きました。');
        }
      }, [
        h('span', { text: record.primary_action.label }),
        h('span', { 'aria-hidden': 'true', text: '↗' })
      ]);
    }

    nodes = [
      h('button', {
        class: 'public-editorial-breadcrumb', type: 'button',
        onclick: function () { go('understanding'); }
      }, [
        h('span', { 'aria-hidden': 'true', text: '←' }),
        h('span', { text: '「' + word.label + '」の棚へ' })
      ]),
      h('div', { class: 'public-editorial-detail-hero' }, [
        h('div', { class: 'public-editorial-detail-copy' }, [
          h('p', { class: 'eyebrow', text: editorialSlotLabel(record) }),
          h('h1', {
            class: 'display display-sm public-editorial-headline', tabindex: '-1',
            id: 'surface-title', text: record.headline
          }),
          h('p', { class: 'body-lg public-editorial-lead', text: record.lead }),
          action
        ]),
        media
      ]),
      record.word_contour ? h('section', { class: 'public-editorial-detail-section' }, [
        h('h2', { class: 'section-title', text: '言葉の輪郭' }),
        h('p', { class: 'body-lg', text: record.word_contour })
      ]) : null,
      h('section', { class: 'public-editorial-detail-section' }, [
        h('h2', { class: 'section-title', text: '編集部より' }),
        h('p', { class: 'body-lg', text: record.editorial_note })
      ]),
      h('section', { class: 'public-editorial-detail-section' }, [
        h('h2', { class: 'section-title', text: record.target.title }),
        h('p', { class: 'card-meta', text: editorialTargetMeta(record.target) }),
        h('p', { class: 'note', text: record.source_context.summary })
      ]),
      h('section', { class: 'public-editorial-detail-section public-editorial-reason' }, [
        h('h2', { class: 'section-title', text: 'なぜ、これをここに？' }),
        h('p', { class: 'body-lg', text: record.editorial_reason })
      ]),
      h('div', { class: 'public-editorial-evidence-grid' }, [
        h('section', { class: 'public-editorial-detail-section' }, [
          h('h2', { class: 'section-title', text: '確認した事実' }),
          h('p', { class: 'body-lg', text: record.fact_anchor })
        ]),
        h('section', { class: 'public-editorial-detail-section' }, [
          h('h2', { class: 'section-title', text: 'この棚とのつながり' }),
          h('p', { class: 'body-lg', text: record.source_context.label })
        ])
      ]),
      h('dl', { class: 'public-editorial-provenance' }, [
        h('div', {}, [h('dt', { text: '出典' }), h('dd', { text: record.provenance.source_name })]),
        h('div', {}, [h('dt', { text: '確認日' }), h('dd', { text: record.checked_at.slice(0, 10) })]),
        h('div', {}, [h('dt', { text: '権利・表示' }), h('dd', { text: record.rights_status })])
      ]),
      h('div', { class: 'actions actions-quiet public-editorial-return' }, [
        h('button', {
          class: 'btn btn-text', type: 'button', onclick: function () { go('understanding'); }
        }, [h('span', { text: '棚へ戻る' })])
      ])
    ];

    return section('03-editorial-detail', nodes);
  }

  function cardEditorialHook(experience) {
    var reason = experience && experience.placeDetail && experience.placeDetail.placementReason
      ? experience.placeDetail.placementReason : experience.reason;
    return reason;
  }

  function cardOfficialSummary(experience) {
    /* Discovery card は公式一次情報にもとづく一行の導入だけを見せる。
       全文は Detail の「どんな場所か」で出典付きで読む。 */
    return experience && experience.placeDetail && experience.placeDetail.officialSummary
      ? experience.placeDetail.officialSummary : null;
  }

  function discoveryPracticalFacts(experience) {
    var access = experience && experience.placeDetail && experience.placeDetail.access;
    if (!access) return [];
    return [
      { label: '最寄駅', value: access.nearestStation },
      { label: '徒歩', value: access.walkingTime }
    ];
  }

  /* Shared display contract for every touched Cultural Matching renderer.
     New content types fail closed when a required layer is missing instead of
     silently dropping Fact / Why / Action / Media / provenance information. */
  function experienceInformationContract(experience) {
    if (!experience) return null;
    var place = experience.placeDetail;
    var source = place && place.officialSource;
    var actions = approvedDestinationActions(experience);
    var primaryAction = actions.filter(function (action) { return action.kind === 'primary'; })[0];
    var media = experience.visualAsset;
    var contract = {
      identity: experience.title && experience.type ? {
        title: experience.title, type: experience.type
      } : null,
      officialGrounding: place && place.description && place.officialSummary && source &&
        source.sourceName && source.sourceUrl && source.verifiedOn ? {
          summary: place.officialSummary,
          description: place.description,
          source: source
        } : null,
      editorialWhy: place && place.placementReason ? place.placementReason : experience.reason,
      practicalTruth: experience.duration && experience.price && place && place.access ? {
        duration: experience.duration,
        price: experience.price,
        access: place.access,
        recommendedStay: place.recommendedStay
      } : null,
      primaryAction: primaryAction || null,
      media: media || null,
      freshness: experience.freshness && experience.freshness.recheckBy ? experience.freshness : null,
      rightsProvenance: media && media.status && media.sourceOwner && media.rightsBasis && media.checkedAt ? {
        status: media.status,
        sourceOwner: media.sourceOwner,
        rightsBasis: media.rightsBasis,
        checkedAt: media.checkedAt,
        fallbackReason: media.fallbackReason || null
      } : null,
      contextFit: experience.contextFit || { status: 'not_collected_in_s1a' },
      accessibilityLanguage: media && media.altTextJa ? {
        language: 'ja', altText: media.altTextJa
      } : null
    };
    var required = [
      'identity', 'officialGrounding', 'editorialWhy', 'practicalTruth',
      'primaryAction', 'media', 'freshness', 'rightsProvenance',
      'contextFit', 'accessibilityLanguage'
    ];
    return required.every(function (key) { return Boolean(contract[key]); }) ? contract : null;
  }

  function experienceCard(experience, contract, counter, actions) {
    var facts = discoveryPracticalFacts(experience);
    return h('article', { class: 'card real-discovery-card', 'aria-label': experience.title }, [
      h('div', { class: 'real-discovery-media' }, [
        counter ? h('p', { class: 'eyebrow real-discovery-counter', text: counter }) : null,
        experienceVisual(experience, 'card')
      ]),
      h('div', { class: 'real-discovery-copy' }, [
        h('p', { class: 'real-discovery-shelf', text: '「' + selectedShelfLabel() + '」の棚から' }),
        h('h2', { class: 'card-title', text: experience.title }),
        h('p', { class: 'card-meta', text: metaLine(experience) }),
        h('p', {
          class: 'real-discovery-official', text: contract.officialGrounding.summary
        }),
        facts.length ? h('dl', { class: 'real-discovery-facts' }, facts.map(function (fact) {
          return h('div', {}, [h('dt', { text: fact.label }), h('dd', { text: fact.value })]);
        })) : null,
        h('section', { class: 'real-discovery-reason', 'aria-label': 'この棚に置いた理由' }, [
          h('h3', { text: 'なぜ、この棚に？' }),
          h('p', { class: 'card-reason', text: contract.editorialWhy })
        ]),
        h('div', { class: 'real-discovery-actions' }, actions || [])
      ])
    ]);
  }

  function experienceVisual(experience, context) {
    var asset = experience && experience.visualAsset;
    if (!asset || asset.status === 'hold' || !asset.localAssetPath) return null;
    var isFallback = asset.status === 'brand_fallback_ready';
    var isCategoryVisual = isFallback && asset.assetType === 'category_visual';
    var isBrandFallback = isFallback && asset.assetType === 'brand_fallback';
    var children = [
      h('img', {
        class: 'real-experience-visual-image fit-' + asset.fitMode,
        src: asset.localAssetPath,
        alt: asset.altTextJa,
        loading: 'eager',
        decoding: 'async'
      })
    ];
    if (isFallback) {
      children.push(h('span', {
        class: 'real-experience-category-label',
        text: asset.categoryLabel
      }));
      children.push(h('span', {
        class: 'real-experience-media-status',
        text: 'カテゴリ図版（実画像の表示権利を確認中）'
      }));
    }
    if (asset.attributionRequired && asset.attributionText) {
      children.push(h('figcaption', {
        class: 'real-experience-attribution',
        text: asset.attributionText
      }));
    }
    return h('figure', {
      class: 'real-experience-visual real-experience-visual--' + context +
        (isCategoryVisual ? ' is-category-visual' :
          (isBrandFallback ? ' is-brand-fallback' : ' is-real-visual')),
      'data-visual-status': asset.status,
      'data-visual-asset-type': asset.assetType,
      'data-visual-category': asset.categoryLabel
    }, children);
  }

  function attachSwipe(card, onLeft, onRight) {
    var startX = 0, active = false, dx = 0;
    var soft = reducedMotion();

    function down(event) {
      if (event.button !== undefined && event.button !== 0) return;
      /* カード全体で pointer capture を取ると、pointerup が card へ retarget され、
         card 内の button に click が発火しなくなる（mouse で顕著）。
         操作要素の上から始まった pointer では swipe を開始しない。 */
      if (event.target && event.target.closest &&
          event.target.closest('button, a, input, select, textarea, label, [role="button"]')) return;
      active = true; startX = event.clientX; dx = 0;
      card.setPointerCapture && card.setPointerCapture(event.pointerId);
      card.classList.add('is-dragging');
    }
    function move(event) {
      if (!active) return;
      dx = event.clientX - startX;
      if (!soft) card.style.transform = 'translateX(' + (dx * 0.6) + 'px)';
    }
    function up() {
      if (!active) return;
      active = false;
      card.classList.remove('is-dragging');
      card.style.transform = '';
      var threshold = Math.min(96, card.offsetWidth * 0.25);
      if (dx <= -threshold) onLeft();
      else if (dx >= threshold) onRight();
    }

    card.addEventListener('pointerdown', down);
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', up);
  }

  function surfaceLegacyDiscovery(deck, experience, counter) {
    var isReal = deck.mode === 'real-approved';
    var count = activeDeckCount();
    var shelfLabel = selectedShelfLabel();
    var contract = experienceInformationContract(experience);
    if (!contract) return surfaceUnderstanding();
    var primaryAction = contract.primaryAction;
    var nodes = [
      h('h1', {
        class: 'deck-lead', tabindex: '-1', id: 'surface-title',
        text: isReal ? '「' + shelfLabel + '」の棚から、' + count + 'つの文化物を。' : '前回残ったものから、次の' + count + 'つ。'
      })
    ];
    var cardActions = [];
    if (primaryAction) {
      cardActions.push(h('button', {
        class: 'btn btn-primary real-discovery-primary', type: 'button',
        'data-action-destination': primaryAction.kind,
        onclick: function () { openApprovedDestination(primaryAction, experience); }
      }, [h('span', { text: primaryAction.label }), h('span', { 'aria-hidden': 'true', text: '↗' })]));
    }
    cardActions.push(h('button', {
      class: 'btn btn-line real-discovery-detail', type: 'button',
      onclick: function () {
        state.selectedId = experience.id;
        measureOnce('v3_experience_select', nextMeasurementToken('experience-select'));
        go('detail');
      }
    }, [h('span', { text: '詳しく見る' })]));
    cardActions.push(h('button', {
      class: 'btn btn-text real-discovery-interest', type: 'button',
      'aria-pressed': isInterested(experience.id) ? 'true' : 'false',
      'data-interest-state': isInterested(experience.id) ? 'saved' : 'unsaved',
      onclick: function () { toggleInterested(experience.id); }
    }, [icon('bookmark'), h('span', { text: interestedLabel(experience.id) })]));
    var card = experienceCard(experience, contract, counter, cardActions);
    if (count > 1) {
      attachSwipe(card,
        function () { navigateDeck(1, false); },
        function () { navigateDeck(-1, false); });
    }
    nodes.push(h('div', { class: 'card-stage' }, [card]));
    var navigation = [];
    if (deck.index > 0) {
      navigation.push(h('button', {
        class: 'btn btn-line deck-previous-action', type: 'button',
        'data-deck-navigation': 'previous', onclick: function () { navigateDeck(-1, true); }
      }, [h('span', { 'aria-hidden': 'true', text: '←' }), h('span', { text: '前を見る' })]));
    }
    if (deck.index < count - 1) {
      navigation.push(h('button', {
        class: 'btn btn-line deck-next-action', type: 'button',
        'data-deck-navigation': 'next', onclick: function () { navigateDeck(1, true); }
      }, [h('span', { text: '次を見る' }), h('span', { 'aria-hidden': 'true', text: '→' })]));
    } else {
      navigation.push(h('button', {
        class: 'btn btn-line deck-next-action deck-finish-action', type: 'button',
        'data-deck-navigation': 'finish', onclick: completeDeck
      }, [h('span', { text: '棚を見終える' })]));
    }
    nodes.push(h('nav', {
      class: 'deck-navigation' + (deck.index === 0 ? ' is-first' : ''),
      'aria-label': '文化物を前後に見る'
    }, navigation));
    var surface = section(isReal ? '04-discovery' : '09-personalized-discovery', nodes);
    if (isReal) surface.setAttribute('data-selected-shelf', state.emotion || '');
    return surface;
  }

  function discoveryAsset(file) {
    return './assets/canonical-m03-w03/' + file;
  }

  function discoveryFixtureById(recordId) {
    for (var i = 0; i < D.DISCOVERY_FIXTURES.length; i += 1) {
      if (D.DISCOVERY_FIXTURES[i].recordId === recordId) return D.DISCOVERY_FIXTURES[i];
    }
    return null;
  }

  function discoveryLines(lines, className) {
    return (lines || []).map(function (line) {
      return h('span', { class: className || 'discovery-copy-line', text: line });
    });
  }

  function approvedDestinationActions(experience) {
    return AD ? AD.actionsForExperience(experience) : [];
  }

  function openApprovedDestination(action, experience) {
    var token = arguments.length > 2 ? arguments[2] : nextMeasurementToken('external-open');
    if (!AD || !experience || !AD.openAction(action, experience.id)) {
      announce('この行き先は開けません。');
      return;
    }
    measureOnce('v3_external_open', token);
  }

  function destinationActionHandler(action, experience) {
    var token = nextMeasurementToken('external-open');
    return function () { openApprovedDestination(action, experience, token); };
  }

  function singleKeepToReview(recordId) {
    /* HQ-finalized W03 mode: SINGLE_KEEP_TO_REVIEW. */
    if (!deckHasId(recordId) || !discoveryFixtureById(recordId)) return;
    state.deck.ids.forEach(function (id) {
      state.deck.decisions[id] = id === recordId ? 'keep' : 'pass';
    });
    state.deck.index = state.deck.ids.length;
    state.deck.activeId = recordId;
    persist();
    go('review');
    announce('気になる体験を1つ選び、Reviewへ進みました。');
  }

  function mobileDiscoveryCard(fixture, recordId) {
    var experience = D.byId(recordId);
    var destinationActions = approvedDestinationActions(experience);
    var mediaChildren = [
      h('img', {
        class: 'm03-card-image' + (fixture.slot === 'cafe' ? '' : ' is-portrait'),
        src: discoveryAsset(fixture.mobileAsset), alt: '',
        width: fixture.slot === 'cafe' ? '346' : '', height: fixture.slot === 'cafe' ? '270' : ''
      })
    ];
    if (fixture.slot === 'cafe') {
      mediaChildren.push(h('span', { class: 'm03-location-badge' }, [
        h('strong', { text: '清澄白河' }),
        h('span', { text: '徒歩12分' })
      ]));
    }

    var content = [
      h('h2', { class: 'm03-card-title', text: fixture.mobileTitle })
    ];
    if (fixture.address) {
      content.push(h('p', { class: 'm03-address' }, [
        h('span', { class: 'discovery-inline-icon', 'aria-hidden': 'true' }, [icon('location')]),
        h('span', { text: fixture.address })
      ]));
    }
    if (fixture.creator) content.push(h('p', { class: 'm03-creator', text: fixture.creator }));
    if (fixture.description && fixture.slot !== 'cafe') {
      content.push(h('p', { class: 'm03-description', text: fixture.description }));
    }
    if (fixture.mobileFacts.length) {
      content.push(h('dl', { class: 'm03-facts' }, fixture.mobileFacts.map(function (fact, index) {
        var mark;
        if (index === 2) {
          mark = h('span', { class: 'm03-fact-mark m03-fact-mark-price', 'aria-hidden': 'true' }, [icon('yenCircle')]);
        } else if (index === 3) {
          mark = h('span', { class: 'm03-fact-mark', 'aria-hidden': 'true' }, [icon('calendar')]);
        } else {
          mark = h('span', { class: 'm03-fact-mark', 'aria-hidden': 'true', text: ['◇', '◷'][index] });
        }
        return h('div', { class: 'm03-fact' }, [
          mark,
          h('dd', { text: fact.value }),
          h('dt', { text: fact.label })
        ]);
      })));
    }
    if (fixture.mobileReason.length) {
      content.push(h('div', { class: 'm03-editorial' }, [
        h('p', { class: 'm03-editorial-heading', text: 'Editorial Reason' }),
        h('p', { class: 'm03-editorial-copy' }, discoveryLines(fixture.mobileReason))
      ]));
    }
    destinationActions.forEach(function (action) {
      content.push(h('button', {
        class: 'm03-external-action', type: 'button',
        'data-action-destination': action.kind,
        onclick: destinationActionHandler(action, experience)
      }, [
        h('span', { class: 'discovery-inline-icon', 'aria-hidden': 'true', text: '↗' }),
        h('span', { text: action.label }),
        h('span', { class: 'm03-external-chevron', 'aria-hidden': 'true', text: '›' })
      ]));
    });

    var card = h('article', {
      class: 'm03-card', 'aria-label': fixture.mobileTitle,
      'data-discovery-slot': fixture.slot
    }, [
      h('div', { class: 'm03-card-media' }, mediaChildren),
      h('div', { class: 'm03-card-content' }, content)
    ]);
    attachSwipe(card,
      function () { decide(recordId, 'pass'); },
      function () { decide(recordId, 'keep'); });
    return card;
  }

  function desktopDiscoveryStep() {
    var count = activeDeckCount();
    return h('div', { class: 'w03-step-row', 'aria-label': 'Discoveryの進行状況' }, [
      h('button', {
        class: 'w03-step-back', type: 'button',
        onclick: function () { go('emotion'); }
      }, [icon('back'), h('span', { text: '感情の棚に戻る' })]),
      h('p', { class: 'w03-step-title' }, [
        h('span', { text: 'STEP 2/4' }),
        h('strong', { text: count + 'つの寄り道から選ぶ' })
      ]),
      h('p', { class: 'w03-step-hint', text: count + 'つのうち、気になるものを選んでください' })
    ]);
  }

  function desktopDiscoveryMain(fixture, fixtureIndex, galleryIndex, onGallery, onKeep) {
    var experience = D.byId(fixture.recordId);
    var gallery = fixture.slot === 'cafe' ? fixture.gallery : [];
    var mainFile = fixture.desktopAsset;
    if (fixture.slot === 'cafe' && galleryIndex > 0) mainFile = gallery[galleryIndex];

    var media = [
      h('div', { class: 'w03-main-image-wrap' }, [
        h('img', {
          class: 'w03-main-image' + (fixture.slot === 'cafe' ? '' : ' is-portrait'),
          src: discoveryAsset(mainFile), alt: ''
        })
      ])
    ];
    if (gallery.length) {
      media.push(h('div', { class: 'w03-thumbnails', 'aria-label': '写真を選ぶ' }, gallery.map(function (file, index) {
        return h('button', {
          class: 'w03-thumbnail', type: 'button',
          'aria-label': '写真' + (index + 1) + 'を表示',
          'aria-pressed': galleryIndex === index ? 'true' : 'false',
          onclick: function () { onGallery(index); }
        }, [h('img', { src: discoveryAsset(file), alt: '' })]);
      })));
      media.push(h('div', { class: 'w03-gallery-dots', 'aria-hidden': 'true' }, gallery.map(function (file, index) {
        return h('span', { class: galleryIndex === index ? 'is-active' : '' });
      })));
    }

    var detail = [
      h('p', { class: 'w03-category-line' }, [
        h('span', { class: 'w03-category', text: fixture.category }),
        h('span', { class: 'w03-relation', text: fixture.relation })
      ]),
      h('h1', { class: 'w03-main-title' }, discoveryLines(fixture.desktopTitle)),
      fixture.creator ? h('p', { class: 'w03-creator', text: fixture.creator }) : null,
      h('p', { class: 'w03-description', text: fixture.description })
    ];
    if (fixture.desktopFacts.length) {
      detail.push(h('dl', { class: 'w03-facts' }, fixture.desktopFacts.map(function (fact, index) {
        return h('div', { class: 'w03-fact' }, [
          h('span', { class: 'w03-fact-mark', 'aria-hidden': 'true', text: ['⌖', '◷', '¥', '◷'][index] }),
          h('dt', { text: fact.label }),
          h('dd', {}, [
            h('strong', { text: fact.value }),
            fact.note ? h('span', { text: fact.note }) : null
          ])
        ]);
      })));
    }
    if (fixture.desktopReason.length) {
      detail.push(h('div', { class: 'w03-editorial' }, [
        h('div', { class: 'w03-editorial-copy-wrap' }, [
          h('h2', { text: 'Editorial Reason' }),
          h('p', {}, discoveryLines(fixture.desktopReason))
        ]),
        h('img', {
          class: 'w03-editorial-decoration', alt: '',
          src: discoveryAsset('w03_editorial_decoration.png')
        })
      ]));
    }

    var actions = [];
    approvedDestinationActions(experience).forEach(function (action) {
      actions.push(h('button', {
        class: 'w03-link-button', type: 'button',
        'data-action-destination': action.kind,
        onclick: destinationActionHandler(action, experience)
      }, [h('span', { text: action.label }), h('span', { 'aria-hidden': 'true', text: '↗' })]));
    });
    actions.push(h('button', {
      class: 'w03-keep-button', type: 'button',
      onclick: onKeep
    }, [icon('heart'), h('span', { text: '気になる' })]));
    detail.push(h('div', { class: 'w03-main-actions' }, actions));

    return h('div', {
      class: 'w03-main-card', 'data-active-slot': fixture.slot,
      'data-active-index': String(fixtureIndex)
    }, [
      h('div', { class: 'w03-gallery' }, media),
      h('article', { class: 'w03-detail', 'aria-label': fixture.mobileTitle }, detail)
    ]);
  }

  function desktopAlternateCard(fixture, fixtureIndex, onDetail, onKeep) {
    return h('article', { class: 'w03-alternate-card', 'data-discovery-slot': fixture.slot }, [
      h('img', { class: 'w03-alternate-image', src: discoveryAsset(fixture.desktopAsset), alt: '' }),
      h('div', { class: 'w03-alternate-copy' }, [
        h('p', { class: 'w03-alternate-meta' }, [
          h('span', { text: fixture.category }),
          h('span', { text: fixture.relation })
        ]),
        h('h3', { text: fixture.mobileTitle }),
        h('p', { class: 'w03-alternate-creator', text: fixture.creator }),
        h('p', { class: 'w03-alternate-description', text: fixture.description })
      ]),
      h('div', { class: 'w03-alternate-actions' }, [
        h('button', { class: 'w03-detail-button', type: 'button', onclick: onDetail }, [
          h('span', { text: '詳細を見る' })
        ]),
        h('button', {
          class: 'w03-alternate-keep', type: 'button',
          'aria-label': fixture.mobileTitle + 'を気になるにする',
          'aria-pressed': 'false', onclick: onKeep
        }, [icon('heart')])
      ])
    ]);
  }

  function safeCanonicalDiscoverySurface() {
    var count = activeDeckCount();
    var surface = section('04-discovery', [
      h('h1', {
        class: 'sr-only', tabindex: '-1', id: 'surface-title',
        text: '気になる' + count + 'つの体験から選ぶ'
      }),
      h('button', {
        class: 'm03-undo discovery-mobile-only', type: 'button',
        onclick: function () { go('emotion'); }
      }, [h('span', { text: '感情の棚に戻る' })]),
      h('div', { class: 'discovery-desktop-only' }, [desktopDiscoveryStep()])
    ]);
    surface.classList.add('discovery-canonical');
    return surface;
  }

  function surfaceCanonicalDiscovery(deck) {
    /* Canonical copy is prototype-only. PRODUCTION_COPY_REVIEW_REQUIRED
       PROTOTYPE_FIXTURE_NOT_VERIFIED / PRODUCTION_RIGHTS_UNREVIEWED */
    var recordId = deck.ids[deck.index];
    var count = activeDeckCount();
    var fixtures = deck.ids.map(discoveryFixtureById);
    var fixture = discoveryFixtureById(recordId);
    if (!recordId || !fixture || fixtures.some(function (item) { return !item; })) {
      return safeCanonicalDiscoverySurface();
    }
    var mobileCard = mobileDiscoveryCard(fixture, recordId);

    var mobileNodes = [
      h('div', { class: 'm03-intro' }, [
        h('h1', { class: 'm03-headline' }, [
          h('span', { text: '「' + selectedShelfLabel() + '」の棚から、' }),
          h('span', { text: count + 'つの寄り道を。' })
        ]),
        h('p', { class: 'm03-support', text: 'まずは、1つ目の体験を見てみましょう。' })
      ]),
      h('div', { class: 'm03-card-stage' }, [mobileCard]),
      h('div', { class: 'm03-decisions' }, [
        h('button', {
          class: 'm03-decision m03-pass', type: 'button',
          onclick: function () { decide(recordId, 'pass'); }
        }, [h('span', { text: '今回は違う' })]),
        h('button', {
          class: 'm03-decision m03-keep', type: 'button',
          onclick: function () { decide(recordId, 'keep'); }
        }, [h('span', { text: '気になる' })])
      ]),
      h('p', { class: 'm03-swipe-hint' }, [
        h('span', { 'aria-hidden': 'true', text: '⇄' }),
        h('span', { text: 'カードを左右に動かすこともできます' })
      ])
    ];
    if (deck.index > 0) {
      mobileNodes.push(h('button', {
        class: 'm03-undo', type: 'button', onclick: undo
      }, [h('span', { text: '前の体験に戻る' })]));
    }

    var mainSlot = h('div', { class: 'w03-main-slot' });
    var activeIndex = Math.max(0, deck.ids.indexOf(recordId));
    var galleryIndex = 0;
    function renderMain() {
      var active = fixtures[activeIndex];
      mainSlot.textContent = '';
      mainSlot.appendChild(desktopDiscoveryMain(
        active, activeIndex, galleryIndex,
        function (index) { galleryIndex = index; renderMain(); announce('写真' + (index + 1) + 'を表示しました。'); },
        function () { singleKeepToReview(active.recordId); }
      ));
    }
    function showDetail(index) {
      activeIndex = index;
      galleryIndex = 0;
      renderMain();
      announce(fixtures[index].mobileTitle + 'の詳細を表示しました。');
    }
    renderMain();

    var alternateIndexes = fixtures.map(function (item, index) { return index; }).filter(function (index) {
      return index !== activeIndex;
    });
    var alternateList = h('div', { class: 'w03-alternate-list' }, alternateIndexes.map(function (index) {
      return desktopAlternateCard(
        fixtures[index], index,
        function () { showDetail(index); },
        function () { singleKeepToReview(fixtures[index].recordId); }
      );
    }));
    function scrollAlternates(amount) {
      if (alternateList.scrollBy) alternateList.scrollBy({ left: amount, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }

    var desktopNodes = [
      desktopDiscoveryStep(),
      mainSlot,
      h('section', { class: 'w03-alternates', 'aria-labelledby': 'w03-other-heading' }, [
        h('div', { class: 'w03-alternate-intro' }, [
          h('h2', { id: 'w03-other-heading', text: '他の' + Math.max(0, count - 1) + 'つの体験も見る' }),
          h('p', { text: '左右にスクロールできます' })
        ]),
        h('button', {
          class: 'w03-scroll-button is-left', type: 'button', 'aria-label': '前の体験を見る',
          onclick: function () { scrollAlternates(-320); }
        }, [h('span', { 'aria-hidden': 'true', text: '‹' })]),
        alternateList,
        h('button', {
          class: 'w03-scroll-button is-right', type: 'button', 'aria-label': '次の体験を見る',
          onclick: function () { scrollAlternates(320); }
        }, [h('span', { 'aria-hidden': 'true', text: '›' })])
      ]),
      h('p', { class: 'w03-editorial-note', text: 'ここで紹介しているのは編集部の視点です。選ぶのはあなた自身の気持ちです。' })
    ];

    var surface = section('04-discovery', [
      h('h1', {
        class: 'sr-only', tabindex: '-1', id: 'surface-title',
        text: '気になる' + count + 'つの体験から選ぶ'
      }),
      h('div', { class: 'discovery-mobile discovery-mobile-only' }, mobileNodes),
      h('div', { class: 'discovery-desktop discovery-desktop-only' }, desktopNodes)
    ]);
    surface.classList.add('discovery-canonical');
    return surface;
  }

  function surfaceDiscovery() {
    var deck = state.deck;
    if (!deck || deck.mode !== 'real-approved' || !deck.ids.length) {
      return surfaceUnderstanding();
    }
    var experience = approvedOutingById(deck.ids[deck.index]);
    if (!experience) return surfaceUnderstanding();
    var counter = (deck.index + 1) + ' / ' + deck.ids.length;
    return surfaceLegacyDiscovery(deck, experience, counter);
  }

  function personalizedExplanation(facets) {
    var quoted = (facets || []).map(function (f) { return '「' + f + '」'; }).join('');
    return '前回、次の出会いの手がかりとして' + quoted + 'が選ばれました。そこから' + activeDeckCount() + 'つ置いています。';
  }

  function legacyJudgementRow(id) {
    var experience = D.byId(id);
    var value = state.deck.decisions[id];
    var row = [
      experienceVisual(experience, 'review'),
      h('h3', { class: 'row-title', text: experience.title }),
      h('p', { class: 'row-meta', text: metaLine(experience) })
    ];
    var controls = [
      h('button', {
        class: 'btn btn-line btn-sm', type: 'button',
        'aria-pressed': isInterested(id) ? 'true' : 'false',
        'data-interest-state': isInterested(id) ? 'saved' : 'unsaved',
        onclick: function () {
          decideWithInterest(id, 'keep', function () {
            state.deck.decisions[id] = 'keep';
            persist(); render();
            announce(experience.title + ' を 気になる に変更しました。');
          });
        }
      }, [h('span', { text: interestedLabel(id) })]),
      h('button', {
        class: 'btn btn-line btn-sm', type: 'button',
        'aria-pressed': value === 'pass' ? 'true' : 'false',
        onclick: function () {
          decideWithInterest(id, 'pass', function () {
            state.deck.decisions[id] = 'pass';
            persist();
            if (deckKept().length === 0) { go('none'); return; }
            render();
            announce(experience.title + ' を 今回は違う に変更しました。');
          });
        }
      }, [h('span', { text: '今回は違う' })])
    ];
    if (value === 'keep') {
      controls.push(h('button', {
        class: 'btn btn-solid btn-sm', type: 'button',
        onclick: function () {
          state.selectedId = id;
          persist();
          measureOnce('v3_experience_select', nextMeasurementToken('experience-select'));
          go('detail');
        }
      }, [h('span', { text: '詳しく見る' })]));
    }
    row.push(h('div', { class: 'row-actions' }, controls));
    return h('li', { class: 'row' }, row);
  }

  function surfaceLegacyReview() {
    var kept = deckKept();
    var passed = deckPassed();
    var nodes = [];

    nodes.push(h('h1', { class: 'question', tabindex: '-1', id: 'surface-title', text: '気になる、と選んだもの。' }));
    nodes.push(h('p', {
      class: 'note', text: '「' + selectedShelfLabel() + '」の棚から見た、今回の寄り道です。'
    }));
    nodes.push(h('ul', { class: 'rows' }, kept.map(legacyJudgementRow)));

    if (passed.length > 0) {
      nodes.push(h('h2', { class: 'section-title', text: '今回は違う、と選んだもの。' }));
      nodes.push(h('ul', { class: 'rows rows-quiet' }, passed.map(legacyJudgementRow)));
    }

    nodes.push(h('div', { class: 'actions actions-quiet' }, [
      h('button', {
        class: 'btn btn-text', type: 'button',
        onclick: function () {
          state.deck.index = 0;
          state.deck.decisions = {};
          persist();
          go('discovery');
        }
      }, [h('span', { text: activeDeckCount() + 'つをもう一度見る' })])
    ]));

    return section(state.deck.mode === 'personalized' ? '09-personalized-discovery-review' : '04-discovery-review', nodes);
  }

  function reviewReason(fixture, desktop) {
    var lines = desktop ? fixture.desktopReason : fixture.mobileReason;
    if (lines && lines.length) return lines;
    var experience = D.byId(fixture.recordId);
    return experience && experience.reason ? [experience.reason] : [];
  }

  function reviewFacts(facts, className) {
    if (!facts || !facts.length) return null;
    return h('dl', { class: 'm04-facts ' + className }, facts.map(function (fact) {
      return h('div', { class: 'm04-fact' }, [
        h('dt', { text: fact.label }),
        h('dd', {}, [
          h('strong', { text: fact.value }),
          fact.note ? h('span', { text: fact.note }) : null
        ])
      ]);
    }));
  }

  function reviewDecision(recordId, value) {
    if (!state.deck || state.deck.mode !== 'base' || !deckHasId(recordId) ||
        !discoveryFixtureById(recordId) || (value !== 'keep' && value !== 'pass')) return;
    state.deck.decisions[recordId] = value;
    if (value === 'keep') state.deck.activeId = recordId;
    else if (state.deck.activeId === recordId) state.deck.activeId = null;
    persist();
    render();
    var fixture = discoveryFixtureById(recordId);
    if (deckPassed().length === state.deck.ids.length) {
      announce(activeDeckCount() + 'つすべてを「今回は違う」としました。');
    } else if (value === 'keep') {
      announce(fixture.mobileTitle + 'を気になるにして、選択中にしました。');
    } else {
      announce(fixture.mobileTitle + 'を今回は違うに変更しました。');
    }
  }

  function reviewCard(fixture, activeId) {
    var decision = state.deck.decisions[fixture.recordId];
    var isActive = activeId === fixture.recordId;
    var desktopReason = reviewReason(fixture, true);
    var classes = 'm04-review-card';
    if (decision === 'keep') classes += ' is-keep';
    if (decision === 'pass') classes += ' is-pass';
    if (isActive) classes += ' is-active';

    var body = [
      h('p', { class: 'm04-card-context' }, [
        h('span', { text: fixture.category }),
        h('span', { text: fixture.relation })
      ]),
      h('h2', { class: 'm04-card-title', text: fixture.mobileTitle }),
      fixture.creator ? h('p', { class: 'm04-card-creator', text: fixture.creator }) : null,
      fixture.description ? h('p', { class: 'm04-card-description', text: fixture.description }) : null,
      reviewFacts((fixture.mobileFacts || []).slice(0, 3), 'm04-mobile-only'),
      reviewFacts(fixture.desktopFacts, 'm04-desktop-only'),
      desktopReason.length ? h('div', { class: 'm04-editorial m04-desktop-only' }, [
        h('p', { class: 'm04-editorial-label', text: 'Editorial Reason' }),
        h('p', { class: 'm04-editorial-copy' }, discoveryLines(desktopReason))
      ]) : null,
      h('div', { class: 'm04-card-actions', 'aria-label': fixture.mobileTitle + 'の判定' }, [
        h('button', {
          class: 'm04-decision m04-pass', type: 'button',
          'aria-pressed': decision === 'pass' ? 'true' : 'false',
          onclick: function () { reviewDecision(fixture.recordId, 'pass'); }
        }, [h('span', { text: '今回は違う' })]),
        h('button', {
          class: 'm04-decision m04-keep', type: 'button',
          'aria-pressed': decision === 'keep' ? 'true' : 'false',
          onclick: function () { reviewDecision(fixture.recordId, 'keep'); }
        }, [icon('heart'), h('span', { text: '気になる' })])
      ])
    ];

    return h('article', {
      class: classes,
      'data-review-id': fixture.recordId,
      'data-decision': decision || 'unreviewed',
      'aria-current': isActive ? 'true' : null,
      'aria-label': fixture.mobileTitle
    }, [
      h('picture', { class: 'm04-card-media' }, [
        h('source', { media: '(min-width: 1200px)', srcset: discoveryAsset(fixture.desktopAsset) }),
        h('img', {
          class: 'm04-card-image' + (fixture.slot === 'cafe' ? '' : ' is-portrait'),
          src: discoveryAsset(fixture.mobileAsset), alt: ''
        })
      ]),
      h('div', { class: 'm04-card-body' }, body),
      isActive ? h('span', { class: 'm04-selected-mark' }, [
        h('span', { 'aria-hidden': 'true', text: '✓' }),
        h('span', { text: '選択中' })
      ]) : null
    ]);
  }

  function reviewToDiscovery() {
    state.deck.index = 0;
    persist();
    go('discovery');
  }

  function clearReviewActive() {
    state.deck.activeId = null;
    persist();
    render();
    announce('選択中の体験を解除しました。');
  }

  function chooseReviewActive() {
    var activeId = validActiveId();
    if (!activeId) return;
    state.selectedId = activeId;
    persist();
    measureOnce('v3_experience_select', nextMeasurementToken('experience-select'));
    go('detail');
  }

  function surfaceCanonicalReview() {
    var fixtures = state.deck.ids.map(discoveryFixtureById).filter(function (fixture) { return fixture; });
    var count = activeDeckCount();
    var activeId = validActiveId();
    if (state.deck.activeId !== activeId) state.deck.activeId = activeId;
    var activeFixture = activeId ? discoveryFixtureById(activeId) : null;
    var allPass = deckPassed().length === state.deck.ids.length;

    var intro = h('div', { class: 'm04-review-intro' }, [
      h('button', {
        class: 'm04-review-back m04-mobile-only', type: 'button',
        'aria-label': count + 'つの体験を見直す', onclick: reviewToDiscovery
      }, [icon('back')]),
      h('div', { class: 'm04-title-row' }, [
        h('h1', { class: 'm04-review-title', tabindex: '-1', id: 'surface-title', text: count + 'つ見ました' }),
        h('p', { class: 'm04-progress-count', text: count + ' / ' + count })
      ]),
      h('div', { class: 'm04-progress-dots', 'aria-label': count + 'つ中' + count + 'つを確認済み' },
        state.deck.ids.map(function () { return h('span', { class: 'is-complete' }); })),
      h('p', { class: 'm04-emotion-fixture', text: '「' + selectedShelfLabel() + '」の棚から' }),
      h('p', {
        class: 'm04-mobile-instruction m04-mobile-only',
        text: '気になったものを、ひとつ選んでください。'
      }),
      h('p', { class: 'm04-review-helper', text: 'この画面で、「気になる」／「今回は違う」を見直せます。' })
    ]);

    var nodes = [
      h('div', { class: 'm04-desktop-only' }, [desktopDiscoveryStep()]),
      intro,
      h('ul', { class: 'm04-review-grid', 'aria-label': count + 'つの体験の判定を見直す' }, fixtures.map(function (fixture) {
        return h('li', {}, [reviewCard(fixture, activeId)]);
      }))
    ];

    if (activeFixture) {
      nodes.push(h('div', { class: 'm04-selection-summary', 'aria-live': 'polite' }, [
        h('img', { src: discoveryAsset(activeFixture.mobileAsset), alt: '' }),
        h('p', { text: '選択中：' + activeFixture.mobileTitle }),
        h('button', {
          class: 'm04-reset-active m04-desktop-only', type: 'button', onclick: clearReviewActive
        }, [h('span', { text: '選び直す' })])
      ]));
    }

    if (allPass) {
      nodes.push(h('p', {
        class: 'm04-all-pass-note',
        text: count + 'つすべてを「今回は違う」とした場合は、ここで終了することも、もう一度' + count + 'つを見ることもできます。'
      }));
    }

    var actions = [
      h('button', {
        class: 'm04-primary', type: 'button', disabled: activeId ? null : true,
        onclick: chooseReviewActive
      }, [h('span', { text: 'この体験を見てみる' }), h('span', { 'aria-hidden': 'true', text: '→' })]),
      h('button', {
        class: 'm04-secondary', type: 'button', onclick: reviewToDiscovery
      }, [h('span', { text: count + 'つを見直す' })])
    ];
    if (allPass) {
      actions.push(h('button', {
        class: 'm04-exit', type: 'button', onclick: function () { go('entrance'); }
      }, [h('span', { text: '今日は終わる' })]));
    }
    nodes.push(h('div', { class: 'm04-review-actions' }, actions));

    var surface = section('04-discovery-review', nodes);
    surface.classList.add('review-canonical');
    return surface;
  }

  function surfaceReview() {
    /* Defensive renderer: even a future direct call cannot expose legacy
       keep/pass semantics after bypassing the routing boundary. */
    return currentDeckMatchesSelectedShelf() ? surfaceNone() : surfaceUnderstanding();
  }

  function surfaceNone() {
    var count = activeDeckCount();
    var actions = [
      h('button', {
        class: 'btn btn-line', type: 'button',
        onclick: function () {
          state.deck.index = Math.max(0, state.deck.ids.length - 1);
          go('discovery');
        }
      }, [h('span', { text: '前の文化物へ' })]),
      h('button', {
        class: 'btn btn-primary', type: 'button', onclick: function () { go('understanding'); }
      }, [h('span', { text: '棚へ戻る' })])
    ];
    if (interested.items.length) {
      actions.push(h('button', {
        class: 'btn btn-text', type: 'button',
        onclick: function (event) { openInterestedLayer(event.currentTarget); }
      }, [h('span', { text: '気になるものを見る' })]));
    }
    var surface = section('04-discovery-none', [
      h('div', { class: 'deck-completion' }, [
        h('p', { class: 'eyebrow', text: '「' + selectedShelfLabel() + '」の棚' }),
        h('h1', {
          class: 'question', tabindex: '-1', id: 'surface-title',
          text: 'この棚は、ここまでです。'
        }),
        h('p', {
          class: 'body-lg',
          text: count === 1
            ? 'ひとつの文化物を見終えました。ここで終えても、棚へ戻っても大丈夫です。'
            : count + 'つの文化物を見終えました。続けるための候補は自動で足しません。'
        }),
        h('div', { class: 'actions' }, actions)
      ])
    ]);
    surface.setAttribute('data-selected-shelf', state.emotion || '');
    return surface;
  }

  function surfaceDetail() {
    var experience = approvedOutingById(state.selectedId);
    if (!experience) return surfaceUnderstanding();
    var contract = experienceInformationContract(experience);
    if (!contract) return surfaceUnderstanding();
    var isReal = experience && experience.sourceClass === 'approved-real-experience';
    var placeDetail = experience && experience.placeDetail;
    var approvedActions = approvedDestinationActions(experience).map(function (action) {
      return action;
    });
    var primaryAction = approvedActions.filter(function (action) { return action.kind === 'primary'; })[0];
    var secondaryActions = approvedActions.filter(function (action) { return action.kind !== 'primary'; });
    var detailActions = [];
    if (primaryAction) {
      detailActions.push(h('button', {
        class: 'btn btn-primary detail-primary-action', type: 'button',
        'data-action-destination': primaryAction.kind,
        onclick: destinationActionHandler(primaryAction, experience)
      }, [h('span', { text: primaryAction.label }), h('span', { 'aria-hidden': 'true', text: '↗' })]));
    }
    secondaryActions.forEach(function (action) {
      detailActions.push(h('button', {
        class: 'btn btn-text detail-utility-action', type: 'button',
        'data-action-destination': action.kind,
        onclick: destinationActionHandler(action, experience)
      }, [
        h('span', { text: placeDetail && action.kind === 'maps' ? '地図で見る' : action.label }),
        h('span', { 'aria-hidden': 'true', text: '↗' })
      ]));
    });
    detailActions.push(
      h('button', {
        class: 'btn btn-line detail-plan-action', type: 'button',
        onclick: function () {
          if (state.recentIds.indexOf(experience.id) === -1) state.recentIds.push(experience.id);
          persist();
          go('plan');
        }
      }, [h('span', { text: '日時を決めて予定を残す' })]),
      h('button', {
        class: 'btn btn-text', type: 'button',
        onclick: function () { go(validActiveId() ? 'review' : 'discovery'); }
      }, [h('span', { text: '戻る' })])
    );

    /* Release closure reader order:
       1) title / identity  2) 公式説明（出典明示）  3) なぜ、この棚に？
       4) 実用情報  5) Primary Action
       公式説明は公式一次情報に基づく要約であり、公式文の転載ではない。 */
    var officialSource = contract.officialGrounding.source;
    var summary = [
      h('p', { class: 'eyebrow detail-shelf-context', text: '「' + selectedShelfLabel() + '」の棚から' }),
      h('h1', {
        class: 'display display-sm' + (placeDetail ? ' place-detail-title' : ''),
        tabindex: '-1', id: 'surface-title', text: experience.title
      }),
      h('p', {
        class: 'card-meta' + (placeDetail ? ' place-detail-meta' : ''),
        text: metaLine(experience)
      }),
      placeDetail ? h('section', {
        class: 'detail-official-description', 'aria-labelledby': 'detail-official-title'
      }, [
        h('h2', { class: 'section-title', id: 'detail-official-title', text: 'どんな場所か' }),
        officialSource ? h('p', {
          class: 'detail-official-attribution', text: officialSource.attributionLabel
        }) : null,
        h('p', { class: 'body-lg place-detail-body', text: contract.officialGrounding.description }),
        officialSource ? h('p', { class: 'detail-official-provenance' }, [
          h('span', { text: '出典：' }),
          h('a', {
            class: 'detail-official-source-link',
            href: officialSource.sourceUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
            text: officialSource.sourceName
          }),
          h('span', { text: '（' + officialSource.verifiedOn + ' 確認）' })
        ]) : null
      ]) : null,
      h('section', { class: 'detail-editorial-reason', 'aria-labelledby': 'detail-reason-title' }, [
        h('h2', { class: 'section-title', id: 'detail-reason-title', text: 'なぜ、この棚に？' }),
        h('p', {
          class: 'body-lg place-detail-body',
          text: contract.editorialWhy
        })
      ]),
      h('dl', { class: 'detail-trust-meta', 'aria-label': '情報とメディアの確認状況' }, [
        h('div', {}, [
          h('dt', { text: '情報確認' }),
          h('dd', { text: contract.officialGrounding.source.verifiedOn.replace(/-/g, '.') })
        ]),
        h('div', {}, [
          h('dt', { text: 'メディア' }),
          h('dd', {
            text: contract.rightsProvenance.status === 'real_ready'
              ? '権利・出典を確認した実画像'
              : '感情書店のカテゴリ図版（実画像の表示権利を確認中）'
          })
        ])
      ])
    ];
    var nodes = [
      h('div', { class: 'detail-hero' }, [
        h('div', { class: 'detail-visual-column' }, [experienceVisual(experience, 'detail')]),
        h('div', { class: 'detail-summary-column' }, summary)
      ])
    ];
    if (placeDetail) {
      nodes.push(h('div', { class: 'place-detail-content' }, [
        h('section', { class: 'place-detail-section' }, [
          h('h2', { class: 'section-title', text: 'おすすめの過ごし方' }),
          h('p', { class: 'body-lg place-detail-body', text: contract.practicalTruth.recommendedStay })
        ]),
        h('section', { class: 'place-detail-section place-detail-access' }, [
          h('h2', { class: 'section-title', text: '訪れるための情報' }),
          h('dl', { class: 'facts place-detail-facts' }, [
            h('dt', { text: '住所' }), h('dd', { text: placeDetail.access.address }),
            h('dt', { text: '最寄駅' }), h('dd', { text: placeDetail.access.nearestStation }),
            h('dt', { text: '徒歩' }), h('dd', { text: placeDetail.access.walkingTime })
          ])
        ])
      ]));
    } else {
      /* canonical は What / Practical information の本文を与えていないため、
         prototype data にある事実（tag・duration・price）だけを並べる。
         体験の説明文を prototype 側で創作しない。 */
      nodes.push(h('h2', { class: 'section-title', text: '何をするか' }));
      nodes.push(h('p', { class: 'tags', text: (experience.tags || []).join(' ・ ') }));
    }
    if (!isReal) {
      nodes.push(h('h2', { class: 'section-title', text: '実際の情報' }));
      nodes.push(h('dl', { class: 'facts' }, [
        h('dt', { text: '時間' }), h('dd', { text: experience.duration }),
        h('dt', { text: '料金' }), h('dd', { text: experience.price })
      ]));
      nodes.push(h('p', {
        class: 'note',
        text: 'これはUX確認用のprototype dataです。実在の店舗・イベントではありません。'
      }));
    }
    nodes.push(h('div', { class: 'actions detail-actions' }, detailActions));
    var surface = section('05-experience-detail', nodes);
    if (placeDetail) surface.classList.add('place-detail');
    return surface;
  }

  function planSummary(plan) {
    if (!plan || !plan.when) return '';
    var quick = {
      today: '今日', tomorrow: '明日', weekend: '今週末', later: 'あとで決める'
    };
    if (plan.when !== 'datetime') return quick[plan.when] || '';
    if (!plan.date) return '';
    var date = new Date(plan.date + 'T00:00:00');
    var label = isNaN(date.getTime()) ? plan.date : new Intl.DateTimeFormat('ja-JP', {
      month: 'long', day: 'numeric', weekday: 'short'
    }).format(date);
    return label + (plan.time ? ' ' + plan.time : '');
  }

  function surfacePlan() {
    var current = state.plan && state.plan.experienceId === state.selectedId ? state.plan : null;
    var chosen = current ? current.when : null;
    var dateWrap;
    var dateInput;
    var timeInput;
    var summary;
    var submit;

    function draftPlan() {
      return {
        when: chosen,
        date: chosen === 'datetime' ? dateInput.value : '',
        time: chosen === 'datetime' ? timeInput.value : '',
        experienceId: state.selectedId,
        status: 'open'
      };
    }

    function syncPlanForm() {
      var custom = chosen === 'datetime';
      dateWrap.hidden = !custom;
      var label = chosen ? planSummary(draftPlan()) : '';
      summary.textContent = label ? '選択中：' + label : '日付を選んでください。';
      submit.disabled = !chosen || (custom && !dateInput.value);
    }

    dateInput = h('input', {
      type: 'date', id: 'plan-date', value: current && current.date ? current.date : '',
      onchange: syncPlanForm
    });
    timeInput = h('input', {
      type: 'time', id: 'plan-time', value: current && current.time ? current.time : '',
      onchange: syncPlanForm
    });
    dateWrap = h('div', { class: 'datetime', hidden: chosen !== 'datetime' }, [
      h('label', { for: 'plan-date', text: '日付' }),
      dateInput,
      h('label', { for: 'plan-time', text: '時刻（任意）' }),
      timeInput
    ]);
    summary = h('p', { class: 'plan-selection-summary', 'aria-live': 'polite' });
    submit = h('button', {
      class: 'btn btn-primary', type: 'submit', disabled: true
    }, [h('span', { text: '予定を残す' })]);

    var planOptions = [
      { id: 'today', label: '今日' },
      { id: 'tomorrow', label: '明日' },
      { id: 'weekend', label: '今週末' },
      { id: 'datetime', label: '日付を選ぶ' }
    ];
    /* Preserve an already-saved legacy "later" choice without showing it as a
       new default option. The persisted field set and storage key stay exact. */
    if (current && current.when === 'later') {
      planOptions.push({ id: 'later', label: 'あとで決める' });
    }

    var options = planOptions.map(function (option) {
      var input = h('input', {
        type: 'radio', name: 'plan-when', id: 'plan-' + option.id, value: option.id,
        checked: chosen === option.id ? true : null,
        onchange: function () { chosen = option.id; syncPlanForm(); }
      });
      return h('div', { class: 'choice plan-choice' }, [
        input,
        h('label', { for: 'plan-' + option.id, text: option.label })
      ]);
    });

    var actionNodes = [submit];
    if (current) {
      var removePlanButton = h('button', {
        class: 'btn btn-text', type: 'button',
        onclick: function () {
          var beforeRemove = cloneState();
          removePlanButton.disabled = true;
          state.plan = null;
          persist().then(function (result) {
            if (result && result.ok === true) {
              go('detail');
              announce('予定を取り消しました。');
              return;
            }
            restoreState(beforeRemove);
            removePlanButton.disabled = false;
            announce('予定を取り消せませんでした。保存済みの予定を保ちます。');
          }).catch(function () {
            restoreState(beforeRemove);
            removePlanButton.disabled = false;
            announce('予定を取り消せませんでした。保存済みの予定を保ちます。');
          });
        }
      }, [h('span', { text: '予定を取り消す' })]);
      actionNodes.push(removePlanButton);
    }

    var form = h('form', {
      class: 'plan-form',
      onsubmit: function (event) {
        event.preventDefault();
        if (submit.disabled) return;
        var beforeSave = cloneState();
        form.setAttribute('aria-busy', 'true');
        submit.disabled = true;
        state.plan = draftPlan();
        state.traceFacets = [];
        persist().then(function (result) {
          form.removeAttribute('aria-busy');
          if (result && result.ok === true) {
            go('plan-saved');
            return;
          }
          restoreState(beforeSave);
          syncPlanForm();
          announce('端末に予定を保存できませんでした。予定は保存済みにしていません。');
        }).catch(function () {
          form.removeAttribute('aria-busy');
          restoreState(beforeSave);
          syncPlanForm();
          announce('端末に予定を保存できませんでした。予定は保存済みにしていません。');
        });
      }
    }, [
      h('fieldset', { class: 'choices plan-choices' }, [
        h('legend', { class: 'question', text: 'いつやってみますか？' })
      ].concat(options).concat([dateWrap])),
      summary,
      h('div', { class: 'actions' }, actionNodes)
    ]);
    syncPlanForm();

    var surface = section('06-plan', [
      h('h1', { class: 'sr-only', tabindex: '-1', id: 'surface-title', text: 'いつやってみますか？' }),
      form
    ]);
    surface.classList.add('plan-surface');
    return surface;
  }

  function surfacePlanSaved() {
    var summary = planSummary(state.plan);
    var surface = section('06-plan-saved', [
      h('div', { class: 'plan-saved-panel' }, [
        h('div', { class: 'plan-saved-heading' }, [
          h('span', { class: 'plan-saved-icon', 'aria-hidden': 'true' }, [icon('calendar')]),
          h('h1', { class: 'display display-sm', tabindex: '-1', id: 'surface-title', text: '予定を残しました。' })
        ]),
        summary ? h('p', { class: 'plan-saved-summary', text: summary }) : null,
        h('p', { class: 'note', text: 'この端末に保存しました。外部カレンダーとは同期していません。' }),
        h('div', { class: 'actions' }, [
          h('button', {
            class: 'btn btn-line', type: 'button', onclick: function () { go('plan'); }
          }, [h('span', { text: '日時を変更する' })]),
          h('button', {
            class: 'btn btn-text', type: 'button', onclick: function () { go('entrance'); }
          }, [h('span', { text: '入口に戻る' })])
        ])
      ])
    ]);
    surface.classList.add('plan-saved-surface');
    return surface;
  }

  function surfaceMoment() {
    var experience = D.byId(state.plan.experienceId);
    return section('07-moment-candidate', [
      h('h1', { class: 'display display-sm', tabindex: '-1', id: 'surface-title',
        text: 'この前選んだ「' + experience.title + '」。' }),
      h('p', { class: 'body-lg', text: 'この体験で、残しておきたいものはありますか？' }),
      h('div', { class: 'stack' }, [
        h('button', {
          class: 'btn btn-solid', type: 'button',
          onclick: function () { go('trace'); }
        }, [h('span', { text: '残すものがある' })]),
        h('button', {
          class: 'btn btn-line', type: 'button',
          onclick: function (event) {
            var beforeClose = cloneState();
            var closeButton = event.currentTarget;
            closeButton.disabled = true;
            state.plan.status = 'closed';
            persist().then(function (result) {
              if (result && result.ok === true) {
                go('entrance');
                return;
              }
              restoreState(beforeClose);
              closeButton.disabled = false;
              announce('端末に状態を保存できませんでした。予定は変更していません。');
            }).catch(function () {
              restoreState(beforeClose);
              closeButton.disabled = false;
              announce('端末に状態を保存できませんでした。予定は変更していません。');
            });
          }
        }, [h('span', { text: '今はない' })]),
        h('button', {
          class: 'btn btn-text', type: 'button',
          onclick: function () { go('entrance'); }
        }, [h('span', { text: 'あとで' })])
      ])
    ]);
  }

  function normalizeTraceSelection(selection) {
    var requested = selection || [];
    return D.FACETS.map(function (facet) { return facet.label; }).filter(function (label) {
      return requested.indexOf(label) !== -1;
    }).slice(0, 3);
  }

  function traceExperienceFacts(facts, className) {
    if (!facts || !facts.length) return null;
    return h('dl', { class: 'm05-experience-facts ' + className }, facts.map(function (fact) {
      return h('div', { class: 'm05-experience-fact' }, [
        h('dt', { text: fact.label }),
        h('dd', {}, [
          h('strong', { text: fact.value }),
          fact.note ? h('span', { text: fact.note }) : null
        ])
      ]);
    }));
  }

  function traceExperienceReason(lines, className) {
    if (!lines || !lines.length) return null;
    return h('p', { class: 'm05-experience-reason ' + className }, discoveryLines(lines, 'm05-copy-line'));
  }

  function surfaceTrace() {
    var targetId = state.plan && state.plan.experienceId;
    var fixture = discoveryFixtureById(targetId);
    var selected = [];
    var boxes = [];
    var counter;
    var maxReason;
    var primaryReason;
    var summaryList;
    var submit;
    var traceCompleteToken = nextMeasurementToken('trace-complete');
    var traceSkipToken = nextMeasurementToken('trace-skip');

    function updateSummary() {
      if (!summaryList) return;
      summaryList.textContent = '';
      normalizeTraceSelection(selected).forEach(function (label) {
        summaryList.appendChild(h('li', { class: 'm05-summary-item' }, [
          h('span', { text: label }),
          h('button', {
            class: 'm05-summary-remove', type: 'button',
            'aria-label': label + 'を外す',
            onclick: function () {
              selected = selected.filter(function (value) { return value !== label; });
              sync(label + 'を外しました。選択中 ' + selected.length + ' / 3。');
            }
          }, [h('span', { 'aria-hidden': 'true', text: '×' })])
        ]));
      });
    }

    function sync(message) {
      selected = normalizeTraceSelection(selected);
      boxes.forEach(function (box) {
        box.checked = selected.indexOf(box.value) !== -1;
        box.disabled = !box.checked && selected.length >= 3;
      });
      counter.textContent = '選択中 ' + selected.length + ' / 3';
      submit.disabled = selected.length === 0;
      primaryReason.hidden = selected.length !== 0;
      maxReason.hidden = selected.length < 3;
      updateSummary();
      if (message) announce(message);
    }

    var choices = D.FACETS.map(function (facet) {
      var id = 'facet-' + facet.id;
      var box = h('input', {
        class: 'm05-facet-input', type: 'checkbox', id: id, value: facet.label,
        onchange: function (event) {
          var checked = event.currentTarget.checked;
          if (checked && selected.indexOf(facet.label) === -1) {
            if (selected.length >= 3) {
              event.currentTarget.checked = false;
              sync('最大3つまで選べます。別の項目を選ぶには、選択中の項目を1つ外してください。');
              return;
            }
            selected.push(facet.label);
          } else if (!checked) {
            selected = selected.filter(function (value) { return value !== facet.label; });
          }
          var message = facet.label + (checked ? 'を選びました。' : 'を外しました。') +
            '選択中 ' + selected.length + ' / 3。';
          if (selected.length === 3) {
            message += '最大3つまで選んでいます。別の項目を選ぶには、選択中の項目を1つ外してください。';
          }
          sync(message);
        }
      });
      boxes.push(box);
      return h('div', { class: 'm05-facet-card' }, [
        box,
        h('label', { for: id }, [
          h('span', { class: 'm05-facet-check', 'aria-hidden': 'true', text: '✓' }),
          h('span', { class: 'm05-facet-label', text: facet.label }),
          h('span', { class: 'm05-facet-sublabel', text: facet.sublabel })
        ])
      ]);
    });

    counter = h('p', { class: 'm05-counter', 'aria-live': 'off', text: '選択中 0 / 3' });
    maxReason = h('p', {
      class: 'm05-max-reason', hidden: true,
      text: '最大3つまで選んでいます。別の項目を選ぶには、選択中の項目を1つ外してください。'
    });
    primaryReason = h('p', {
      class: 'm05-primary-reason', id: 'm05-primary-reason',
      text: '1つ以上選ぶと残せます。'
    });
    summaryList = h('ul', { class: 'm05-summary-list' });

    submit = h('button', {
      class: 'btn btn-primary m05-primary', type: 'submit', disabled: true,
      'aria-describedby': 'm05-primary-reason'
    }, [h('span', { text: 'これを残す' })]);

    var skip = h('button', {
      class: 'btn btn-text m05-skip', type: 'button',
      onclick: function () {
        if (!state.plan) return;
        var beforeSkip = cloneState();
        form.setAttribute('aria-busy', 'true');
        skip.disabled = true;
        submit.disabled = true;
        state.plan.status = 'closed';
        persist().then(function (result) {
          form.removeAttribute('aria-busy');
          if (result && result.ok === true) {
            measureOnce('v3_trace_skip', traceSkipToken);
            go('entrance');
            return;
          }
          restoreState(beforeSkip);
          skip.disabled = false;
          sync();
          announce('端末に状態を保存できませんでした。記録は変更していません。');
        }).catch(function () {
          form.removeAttribute('aria-busy');
          restoreState(beforeSkip);
          skip.disabled = false;
          sync();
          announce('端末に状態を保存できませんでした。記録は変更していません。');
        });
      }
    }, [h('span', { text: '今は残さない' })]);

    var form = h('form', {
      class: 'm05-trace-form',
      onsubmit: function (event) {
        event.preventDefault();
        var normalized = normalizeTraceSelection(selected);
        if (!normalized.length || !state.plan) return;
        var beforeTrace = cloneState();
        form.setAttribute('aria-busy', 'true');
        submit.disabled = true;
        skip.disabled = true;
        state.traceFacets = normalized;
        state.plan.status = 'closed';
        persist().then(function (result) {
          form.removeAttribute('aria-busy');
          if (result && result.ok === true) {
            measureOnce('v3_trace_complete', traceCompleteToken);
            go('entrance');
            return;
          }
          restoreState(beforeTrace);
          skip.disabled = false;
          sync();
          announce('端末に記録を保存できませんでした。記録は保存済みにしていません。');
        }).catch(function () {
          form.removeAttribute('aria-busy');
          restoreState(beforeTrace);
          skip.disabled = false;
          sync();
          announce('端末に記録を保存できませんでした。記録は保存済みにしていません。');
        });
      }
    }, [
      h('fieldset', { class: 'm05-facet-fieldset' }, [
        h('legend', { class: 'sr-only', text: '心に残っているものを最大3つまで選ぶ' }),
        h('div', { class: 'm05-facet-grid' }, choices)
      ]),
      h('div', { class: 'm05-selection-status' }, [counter, maxReason]),
      h('div', { class: 'm05-actions' }, [submit, primaryReason, skip]),
      h('p', { class: 'm05-privacy', text: '選んだ内容は、この端末内だけに保存されます。公開されません。' })
    ]);

    var hero = fixture ? h('article', {
      class: 'm05-experience', 'data-trace-experience-id': fixture.recordId
    }, [
      h('p', { class: 'm05-experience-category', text: fixture.category }),
      h('h2', { class: 'm05-experience-title', text: fixture.mobileTitle }),
      fixture.creator ? h('p', { class: 'm05-experience-creator', text: fixture.creator }) : null,
      fixture.description ? h('p', { class: 'm05-experience-description', text: fixture.description }) : null,
      traceExperienceFacts(fixture.mobileFacts, 'm05-mobile-only'),
      traceExperienceFacts(fixture.desktopFacts, 'm05-desktop-only'),
      traceExperienceReason(fixture.mobileReason, 'm05-mobile-only'),
      traceExperienceReason(fixture.desktopReason, 'm05-desktop-only')
    ]) : null;

    var content = h('div', { class: 'm05-content' }, [
      hero,
      h('h1', {
        class: 'm05-heading', tabindex: '-1', id: 'surface-title',
        text: 'この体験で、残しておきたいものはありますか？'
      }),
      h('p', {
        class: 'm05-helper',
        text: '心に残っているものを、最大3つまで選べます。選ばなくても大丈夫です。'
      }),
      h('p', {
        class: 'm05-explanation',
        text: 'ここで選ぶ言葉は、あなたを分類するものではありません。体験の中で残ったものを、自分で選ぶための手がかりです。'
      }),
      form
    ]);

    var summary = h('aside', { class: 'm05-summary m05-desktop-only', 'aria-label': '選択中の項目' }, [
      h('p', { class: 'm05-summary-count', text: '選択中の項目' }),
      summaryList
    ]);

    var surface = section('08-trace', [h('div', { class: 'm05-layout' }, [content, summary])]);
    surface.classList.add('trace-phase1');
    sync();
    return surface;
  }

  function section(name, children) {
    return h('section', { class: 'surface', 'data-surface': name, 'aria-labelledby': 'surface-title' }, children);
  }

  /* ----------------------------------------------------------------- render */

  var SURFACES = {
    entrance: surfaceEntrance,
    emotion: surfaceEmotion,
    understanding: surfaceUnderstanding,
    'editorial-detail': surfaceEditorialDetail,
    discovery: surfaceDiscovery,
    review: surfaceReview,
    none: surfaceNone,
    detail: surfaceDetail,
    plan: surfacePlan,
    'plan-saved': surfacePlanSaved,
    moment: surfaceMoment,
    trace: surfaceTrace
  };

  function currentDeckMatchesSelectedShelf() {
    var approved = approvedRealDeck(state.emotion);
    if (publicDeckState(approved) !== 'ready' || !state.deck ||
        state.deck.mode !== 'real-approved' || publicDeckState(state.deck) !== 'ready') return false;
    if (state.deck.ids.length !== approved.ids.length) return false;
    return approved.ids.every(function (id, index) { return state.deck.ids[index] === id; });
  }

  function failClosedStaleShelfRoute() {
    if (['discovery', 'review', 'none', 'detail'].indexOf(screen) === -1) return;
    if (currentDeckMatchesSelectedShelf()) return;
    state.deck = null;
    state.decisions = {};
    state.selectedId = null;
    screen = 'understanding';
    persist();
  }

  function failClosedEditorialRoute() {
    if (screen !== 'editorial-detail') return;
    if (activeEditorialById(state.emotion, selectedEditorialId)) return;
    selectedEditorialId = null;
    screen = 'understanding';
  }

  function onDeckKeydown(event) {
    if (screen !== 'discovery' || !state.deck || state.deck.mode !== 'real-approved' ||
        activeDeckCount() < 2 || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    var target = event.target;
    if (target && target.closest && target.closest(
      'input, textarea, select, [contenteditable="true"], audio, video, iframe, [role="slider"]'
    )) return;
    var moved = event.key === 'ArrowLeft'
      ? navigateDeck(-1, true) : navigateDeck(1, true);
    if (moved) event.preventDefault();
  }

  function render() {
    failClosedStaleShelfRoute();
    failClosedEditorialRoute();
    screen = normalizePublicScreen(screen);
    var build = SURFACES[screen] || surfaceEntrance;
    var next = build();
    if (pendingDeckMotion && screen === 'discovery') {
      next.classList.add(pendingDeckMotion === 'next' ? 'deck-enter-next' : 'deck-enter-previous');
    }
    pendingDeckMotion = null;
    renderStepbar();
    view.textContent = '';
    view.appendChild(next);
    var focusTarget = pendingFocusSelector ? view.querySelector(pendingFocusSelector) : null;
    pendingFocusSelector = null;
    var title = document.getElementById('surface-title');
    if (focusTarget) focusTarget.focus();
    else if (title) title.focus();
    measureCurrentView();
  }

  function renderStartupState(kind) {
    var isError = kind === 'error';
    var nodes = [
      h('p', { class: 'eyebrow', text: isError ? '読み込みエラー' : '準備中' }),
      h('h1', {
        class: 'question', tabindex: '-1', id: 'surface-title',
        text: isError ? '入口を開けませんでした' : '書店の入口を準備しています'
      }),
      h('p', {
        class: 'body-lg',
        text: isError
          ? '端末内の状態を正しく読み込めなかったため、空の棚としては表示していません。'
          : '確認済みの案内と、この端末に残したものを読み込んでいます。'
      })
    ];
    if (isError) {
      nodes.push(h('div', { class: 'actions' }, [
        h('button', {
          class: 'btn btn-primary', type: 'button', onclick: function () { global.location.reload(); }
        }, [h('span', { text: 'もう一度読み込む' })])
      ]));
    }
    view.textContent = '';
    view.appendChild(section(isError ? '00-load-error' : '00-loading', nodes));
  }

  function resetPrototype() {
    closeInterestedLayer(false);
    STORE.clear().then(function (result) {
      if (!result || result.ok !== true) {
        announce('prototype の状態を初期化できませんでした。');
        return;
      }
      state = STORE.emptyState();
      selectedEditorialId = null;
      screen = 'entrance';
      navigationSequence += 1;
      render();
      announce('prototype の状態を初期化しました。');
    }).catch(function () {
      announce('prototype の状態を初期化できませんでした。');
    });
  }

  /* Header Interaction Contract v0.3
     - >=1200px の MENU から既存4導線だけを開く
     - logo / 体験の流れ / よくある質問 は同一ページ内スクロール
     - はじめる / 感情の棚 は Hero CTA と同じ遷移（W02 Emotion）
     - W01の体験の流れ / FAQは有限のbelow-fold editorial content
     - 新しい画面・locale 機能は作らない */
  function scrollToId(id) {
    var target = document.getElementById(id) || document.querySelector('[id="' + id + '"]');
    if (!target) return;
    target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    try { target.focus({ preventScroll: true }); }
    catch (error) { target.focus(); }
  }

  function bindHeader() {
    var trigger = document.getElementById('headerMenuTrigger');
    var panel = document.getElementById('headerNavPanel');
    var firstItem = panel.querySelector('.site-nav-link');
    /* v0.2 static shellとの互換性を保ちつつ、今回承認されたW01 destinationsを
       runtime DOMの正式なanchorにする。 */
    panel.querySelector('a[href="#core-loop"]').setAttribute('href', '#experience-flow');
    panel.querySelector('a[href="#trust"]').setAttribute('href', '#faq');

    function closeHeaderMenu(restoreFocus) {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus();
    }

    function openHeaderMenu() {
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      firstItem.focus();
    }

    trigger.addEventListener('click', function () {
      if (trigger.getAttribute('aria-expanded') === 'true') closeHeaderMenu(true);
      else openHeaderMenu();
    });

    document.querySelectorAll('[data-nav="start"]').forEach(function (node) {
      node.addEventListener('click', function () {
        closeHeaderMenu(false);
        go('emotion');
      });
    });
    document.querySelectorAll('[data-nav="scroll"]').forEach(function (node) {
      node.addEventListener('click', function (event) {
        event.preventDefault();
        closeHeaderMenu(false);
        if (screen !== 'entrance') go('entrance');
        scrollToId(node.getAttribute('href').slice(1));
      });
    });
    document.querySelector('.site-logo').addEventListener('click', function (event) {
      event.preventDefault();
      scrollToId('top');
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') {
        closeHeaderMenu(true);
      }
    });
    document.addEventListener('click', function (event) {
      if (trigger.getAttribute('aria-expanded') === 'true' &&
          !panel.contains(event.target) && event.target !== trigger) {
        closeHeaderMenu(false);
      }
    });
    global.addEventListener('resize', function () {
      if (global.innerWidth < 1200 && trigger.getAttribute('aria-expanded') === 'true') {
        closeHeaderMenu(false);
      }
    });
  }

  function boot() {
    view = document.getElementById('view');
    live = document.getElementById('live');
    stepbar = document.getElementById('stepbar');
    document.getElementById('reset').addEventListener('click', resetPrototype);
    bindHeader();
    document.addEventListener('keydown', onDeckKeydown);
    renderStartupState('loading');

    /* Reset Prototype は Visual Canonical に無い debug 用。?debug=1 のときだけ露出する。 */
    if (/[?&]debug=1(&|$)/.test(global.location.search)) {
      document.getElementById('debugFooter').hidden = false;
    }

    Promise.all([STORE.load(), STORE.loadInterested()]).then(function (loaded) {
      state = loaded[0];
      interested = loaded[1];
      screen = 'entrance';
      try {
        global.history.replaceState({ v3Screen: 'entrance' }, '', global.location.href);
        historyReady = true;
      } catch (error) {
        historyReady = false;
      }
      global.addEventListener('popstate', function (event) {
        var target = event.state && event.state.v3Screen;
        var requested = target && SURFACES[target] ? target : 'entrance';
        screen = normalizePublicScreen(requested);
        if (screen !== requested) {
          try {
            global.history.replaceState({ v3Screen: screen }, '', global.location.href);
          } catch (error) {
            /* Rendering remains normalized if History replacement is unavailable. */
          }
        }
        navigationSequence += 1;
        render();
      });
      navigationSequence += 1;
      render();
    }).catch(function () {
      renderStartupState('error');
      announce('端末内の状態を読み込めませんでした。');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);

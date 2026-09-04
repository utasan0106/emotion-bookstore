/* Cultural Thread — renderer (RC).
   thread.html?thread=<id> を thread_content.js から描く。
   - 不明 / 欠落の id は fail-closed（generic な文と入口への出口だけ）。
   - 保存しない。位置情報・カメラ・fetch・XHR・計測 event を使わない。
   - 読む場所（remote / onsite）は合図の文だけを変える。事実・関係・資料・
     検証状態・並び順は変えない。
   - CLAIM / SUPPORT / EDITORIAL READING は DOM を分ける。読みは
     fact badge・検証状態・verified relation の見た目を継がない。
   - scene.beats[] は数に依らず描く（六拍はこの Thread の learned_from 固有の構成）。 */
(function () {
  'use strict';

  var CONTENT = window.V3_THREAD_CONTENT;
  var root = document.getElementById('threadRoot');
  var live = document.getElementById('live');
  if (!root) return;

  var GENERIC_TITLE = 'みんなの感情書店｜スレッド';
  var LOST = { line: 'このスレッドはありません。', exit: '入口へ戻る', href: './index.html' };
  var LAYER = { claim: '事実', support: '裏づけ', reading: '編集部の読み' };
  var VERIFICATION = {
    single_source: '検証状態：単一資料',
    corroborated: '検証状態：複数の資料が一致',
    source_difference: '検証状態：資料間に年次差',
    unresolved: '検証状態：未解決'
  };
  var SUPPORT_MODE = { direct_statement: '資料の記述', oral_testimony: '口述', editorial_synthesis: '編集部の整理' };
  var ORDER_NOTE = '※並び順は、資料の正しさの順位ではありません。';

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key.slice(0, 2) === 'on') el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : value);
    });
    (children || []).forEach(function (child) { if (child) el.appendChild(child); });
    return el;
  }

  function find(list, id) {
    for (var i = 0; i < (list || []).length; i++) if (list[i] && list[i].id === id) return list[i];
    return null;
  }

  function nodeLabel(thread, id) {
    var node = find(thread.nodes, id);
    return node ? node.label : String(id || '');
  }

  function hostPath(url) {
    return String(url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  /* ------------------------------------------------------- CLAIM / SUPPORT */

  function factBadge(text) {
    return h('p', { class: 'th-fact-badge', text: text });
  }

  function sourceCard(source, variant) {
    return h('li', { class: 'th-source', 'data-source-id': source.id, 'data-source-kind': source.kind }, [
      h('p', { class: 'th-source-kind', text: source.kindLabel }),
      h('p', { class: 'th-source-name', text: source.name }),
      variant ? h('p', { class: 'th-source-variant' }, [
        h('span', { class: 'th-source-variant-year', text: variant.display }),
        h('span', { class: 'th-source-variant-reading', text: variant.reading })
      ]) : null,
      h('p', { class: 'th-source-link-row' }, [
        h('a', {
          class: 'th-source-link',
          href: source.url,
          target: '_blank',
          rel: 'noopener noreferrer',
          referrerpolicy: 'no-referrer'
        }, [h('span', { text: hostPath(source.url) }), h('span', { 'aria-hidden': 'true', text: ' ↗' })])
      ])
    ]);
  }

  /* 資料の引き出し。並びは content の sourceIds の順（公式 → 地域の文化
     アーカイブ）。並び順は正しさの順位ではない、と必ず添える。 */
  function evidenceDrawer(thread, item) {
    var ids = Array.isArray(item.sourceIds) ? item.sourceIds : [];
    var variants = (item.temporal && Array.isArray(item.temporal.variants)) ? item.temporal.variants : [];
    var cards = [];
    ids.forEach(function (id) {
      var source = find(thread.sources, id);
      if (!source) return;
      var variant = null;
      variants.forEach(function (v) { if (v.sourceId === id) variant = v; });
      cards.push(sourceCard(source, variant));
    });
    if (!cards.length) return null;
    var children = [h('ol', { class: 'th-sources' }, cards)];
    if (cards.length >= 2) children.push(h('p', { class: 'th-order-note', text: ORDER_NOTE }));
    if (item.differenceNote) children.push(h('p', { class: 'th-difference-note', text: item.differenceNote }));
    return h('details', { class: 'th-evidence' }, [
      h('summary', { class: 'th-evidence-summary' }, [
        h('span', { text: '資料を見る（' + cards.length + '件）' })
      ]),
      h('div', { class: 'th-evidence-body' }, children)
    ]);
  }

  function supportBlock(thread, item) {
    var modes = (item.supportMode || []).map(function (m) { return SUPPORT_MODE[m] || m; }).join('・');
    return h('div', { class: 'th-support', 'data-layer': 'support' }, [
      factBadge(LAYER.support),
      h('p', { class: 'th-verification', 'data-verification': item.verificationState, text: VERIFICATION[item.verificationState] || '検証状態：不明' }),
      modes ? h('p', { class: 'th-support-mode', text: '裏づけの種類：' + modes }) : null,
      evidenceDrawer(thread, item)
    ]);
  }

  function claimBlock(item, extra) {
    return h('div', { class: 'th-claim', 'data-layer': 'claim' }, [
      factBadge(LAYER.claim),
      h('p', { class: 'th-claim-text', text: item.claim })
    ].concat(extra || []));
  }

  function relationCard(thread, rel) {
    var head = h('p', { class: 'th-relation-time' }, [
      h('span', { class: 'th-relation-year', text: rel.temporal ? rel.temporal.display : '' }),
      h('span', { class: 'th-relation-sep', 'aria-hidden': 'true', text: ' ／ ' }),
      h('span', { class: 'th-relation-verb', text: rel.displayVerb })
    ]);
    var nodes = h('p', { class: 'th-relation-nodes' }, [
      h('span', { class: 'th-node', text: nodeLabel(thread, rel.from) }),
      h('span', { class: 'th-node-arrow', 'aria-hidden': 'true', text: ' → ' }),
      h('span', { class: 'th-node', text: nodeLabel(thread, rel.to) })
    ]);
    var extra = [];
    if (rel.via) extra.push(h('p', { class: 'th-relation-via', text: '仲介：' + nodeLabel(thread, rel.via) }));
    if (rel.spatial && rel.spatial.display) extra.push(h('p', { class: 'th-relation-spatial', text: rel.spatial.display }));
    return h('section', {
      class: 'th-relation',
      'data-relation-id': rel.id,
      'data-relation-type': rel.relationType,
      'data-verification': rel.verificationState,
      'aria-label': (rel.temporal ? rel.temporal.display + ' ' : '') + rel.displayVerb
    }, [head, nodes, claimBlock(rel, extra), supportBlock(thread, rel)]);
  }

  function factCard(thread, fact) {
    return h('section', { class: 'th-fact', 'data-fact-id': fact.id, 'data-verification': fact.verificationState }, [
      claimBlock(fact, fact.temporal && fact.temporal.display ? [h('p', { class: 'th-fact-time', text: fact.temporal.display })] : []),
      supportBlock(thread, fact)
    ]);
  }

  /* --------------------------------------------------- EDITORIAL READING */

  /* 読みは fact badge・検証状態・relation の見た目を継がない。
     参照 id は data 属性に残すだけで、verified relation としては描かない。 */
  function readingBlock(reading) {
    if (!reading || !reading.text) return null;
    return h('section', {
      class: 'th-reading',
      'data-layer': 'reading',
      'data-refs': (reading.refs || []).join(' ')
    }, [
      h('p', { class: 'th-reading-label', text: LAYER.reading }),
      h('p', { class: 'th-reading-text', text: reading.text })
    ]);
  }

  /* ------------------------------------------------------------- 合図 */

  var mode = 'remote';

  function cueBlock(cue) {
    if (!cue) return null;
    return h('div', { class: 'th-cue' }, [
      h('p', { class: 'th-cue-label', text: cue.label || '合図' }),
      h('p', {
        class: 'th-cue-text',
        'data-cue-remote': cue.remote || '',
        'data-cue-onsite': cue.onsite || cue.remote || '',
        text: mode === 'onsite' ? (cue.onsite || cue.remote || '') : (cue.remote || '')
      })
    ]);
  }

  function repaintCues() {
    Array.prototype.forEach.call(root.querySelectorAll('.th-cue-text'), function (el) {
      var next = el.getAttribute('data-cue-' + mode);
      if (next === null || next === '') next = el.getAttribute('data-cue-remote') || '';
      el.textContent = next;
    });
  }

  /* ----------------------------------------------------------- 六拍など */

  function pairList(items) {
    return h('dl', { class: 'th-pair' }, (items || []).map(function (item) {
      return h('div', { class: 'th-pair-item' }, [
        h('dt', { class: 'th-pair-name', text: item.name }),
        h('dd', { class: 'th-pair-text', text: item.text })
      ]);
    }));
  }

  function beatBlock(thread, beat) {
    var body = [];
    if (beat.lead) body.push(h('p', { class: 'th-beat-lead', text: beat.lead }));
    if (beat.kind === 'pair' || beat.kind === 'names') body.push(pairList(beat.items));
    else if (beat.kind === 'question') body.push(h('p', { class: 'th-question', text: beat.line }));
    else if (beat.kind === 'evidence') {
      body.push(h('ol', { class: 'th-evidence-list' }, (beat.items || []).map(function (line) {
        return h('li', { class: 'th-evidence-item', text: line });
      })));
    } else if (beat.kind === 'reveal') {
      (beat.relationIds || []).forEach(function (id) {
        var rel = find(thread.relations, id);
        if (rel) body.push(relationCard(thread, rel));
      });
    } else if (beat.kind === 'cue') body.push(cueBlock(beat.cue));
    return h('section', { class: 'th-beat', 'data-beat': beat.id, 'data-beat-kind': beat.kind }, [
      h('p', { class: 'th-beat-label', text: beat.label || '' })
    ].concat(body));
  }

  function figureBlock(image) {
    if (!image || !image.src) return null;
    return h('figure', { class: 'th-figure' }, [
      h('img', {
        class: 'th-figure-image',
        src: image.src,
        alt: image.alt || '',
        width: image.width,
        height: image.height,
        decoding: 'async',
        referrerpolicy: 'no-referrer'
      })
    ]);
  }

  function realityBlock(thread) {
    var pr = thread.presentReturn || {};
    var children = [h('p', { class: 'th-reality-lead', text: pr.lead || '' })];
    children.push(h('ol', { class: 'th-destinations' }, (thread.realityDestinations || []).map(function (d) {
      return h('li', { class: 'th-destination', 'data-destination-id': d.id }, [
        h('a', {
          class: 'th-destination-link',
          href: d.url,
          target: '_blank',
          rel: 'noopener noreferrer',
          referrerpolicy: 'no-referrer'
        }, [h('span', { class: 'th-destination-label', text: d.label }), h('span', { 'aria-hidden': 'true', text: ' ↗' })]),
        d.why ? h('p', { class: 'th-destination-why', text: 'このThreadとの関係：' + d.why }) : null,
        d.note ? h('p', { class: 'th-destination-note', text: d.note }) : null
      ]);
    })));
    if (Array.isArray(pr.notes) && pr.notes.length) {
      children.push(h('div', { class: 'th-status' }, [
        h('p', { class: 'th-status-title', text: pr.statusTitle || 'いまの状況' }),
        h('ul', { class: 'th-status-list' }, pr.notes.map(function (n) {
          return h('li', { class: 'th-status-item', 'data-status': n.status }, [
            h('span', { text: n.text }),
            n.checkedAt ? h('span', { class: 'th-status-checked', text: '（最終確認：' + n.checkedAt + '）' }) : null
          ]);
        }))
      ]));
    }
    var ending = thread.ending || {};
    children.push(h('div', { class: 'th-end' }, [
      h('p', { class: 'th-end-line', text: ending.line || 'このスレッドは、ここまでです。' }),
      h('p', { class: 'th-end-exit' }, [
        h('a', { class: 'th-exit', href: ending.exitHref || './index.html', text: ending.exitLabel || '入口へ戻る' })
      ])
    ]));
    return children;
  }

  function sceneBlock(thread, scene) {
    var titleId = 'th-' + scene.id + '-title';
    var body = [h('h2', { id: titleId, class: 'th-scene-title', text: scene.title })];
    if (scene.figure) body.push(figureBlock(thread.image));
    if (scene.lead) body.push(h('p', { class: 'th-scene-lead', text: scene.lead }));
    (scene.factIds || []).forEach(function (id) {
      var fact = find(thread.facts, id);
      if (fact) body.push(factCard(thread, fact));
    });
    (scene.relationIds || []).forEach(function (id) {
      var rel = find(thread.relations, id);
      if (rel) body.push(relationCard(thread, rel));
    });
    (scene.beats || []).forEach(function (beat) { body.push(beatBlock(thread, beat)); });
    if (scene.cue) body.push(cueBlock(scene.cue));
    if (scene.close) body.push(h('p', { class: 'th-scene-close', text: scene.close }));
    body.push(readingBlock(scene.editorialReading));
    if (scene.kind === 'reality') body = body.concat(realityBlock(thread));
    return h('section', { class: 'th-scene', id: 'th-' + scene.id, 'data-scene': scene.id, 'aria-labelledby': titleId }, body);
  }

  /* ------------------------------------------------------------- 見出し */

  function modeFieldset(thread) {
    var modes = thread.modes || {};
    var options = Array.isArray(modes.options) ? modes.options : [];
    var inputs = options.map(function (opt) {
      var input;
      var label = h('label', { class: 'th-mode-option' }, [
        (input = h('input', {
          class: 'th-mode-input',
          type: 'radio',
          name: 'thread-mode',
          value: opt.id,
          onchange: function () {
            if (!input.checked) return;
            mode = opt.id;
            repaintCues();
            if (live) live.textContent = '読む場所を「' + opt.label + '」にしました。合図の文だけが変わります。';
          }
        })),
        h('span', { class: 'th-mode-label', text: opt.label })
      ]);
      if (opt.isDefault) { input.checked = true; mode = opt.id; }
      return label;
    });
    return h('fieldset', { class: 'th-mode' }, [
      h('legend', { class: 'th-mode-legend', text: modes.legend || '' }),
      h('div', { class: 'th-mode-options' }, inputs),
      modes.note ? h('p', { class: 'th-mode-note', text: modes.note }) : null
    ]);
  }

  function headerBlock(thread) {
    return h('header', { class: 'th-head' }, [
      h('p', { class: 'th-eyebrow', text: thread.eyebrow }),
      h('h1', { class: 'th-title', text: thread.title }),
      h('p', { class: 'th-subject', text: thread.subjectLabel }),
      h('p', { class: 'th-editor', text: thread.editor }),
      h('p', { class: 'th-lens', text: thread.lens }),
      h('p', { class: 'th-checked', text: thread.checkedLabel || ('最終確認：' + thread.checkedAt) }),
      h('ul', { class: 'th-guidance' }, (thread.guidance || []).map(function (line) {
        return h('li', { class: 'th-guidance-item', text: line });
      })),
      modeFieldset(thread)
    ]);
  }

  /* --------------------------------------------------------------- 描画 */

  function renderThread(thread) {
    document.title = thread.documentTitle || GENERIC_TITLE;
    root.textContent = '';
    root.appendChild(h('article', { class: 'th-thread', 'data-thread-id': thread.threadId }, [
      headerBlock(thread)
    ].concat((thread.scenes || []).map(function (scene) { return sceneBlock(thread, scene); }))));
    repaintCues();
  }

  function renderLost() {
    document.title = GENERIC_TITLE;
    root.textContent = '';
    root.appendChild(h('section', { class: 'th-lost', 'aria-label': LOST.line }, [
      h('p', { class: 'th-lost-line', text: LOST.line }),
      h('p', { class: 'th-end-exit' }, [h('a', { class: 'th-exit', href: LOST.href, text: LOST.exit })])
    ]));
    if (live) live.textContent = LOST.line;
  }

  var requested = new URLSearchParams(location.search).get('thread') || '';
  var thread = null;
  if (CONTENT && Array.isArray(CONTENT.threads) && requested) {
    for (var i = 0; i < CONTENT.threads.length; i++) {
      if (CONTENT.threads[i] && CONTENT.threads[i].threadId === requested) thread = CONTENT.threads[i];
    }
  }
  if (!thread) { renderLost(); return; }
  renderThread(thread);
})();

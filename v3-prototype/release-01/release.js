(function () {
  'use strict';

  var CONTENT = window.V3_RELEASE_CONTENT;
  var live = document.getElementById('live');
  var lastTrigger = null;

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

  // 日本語見出しの折返しを markup 側で決める。.jp-phrase は word-break: keep-all
  // なので、通常は phrase 境界（<wbr>）でしか改行できない。Chromium 専用の
  // word-break: auto-phrase に Safari の正しさを依存させない。
  // phrases が無い / 連結が本文と一致しない場合は、必ず本文そのものを出す。
  function jpHeading(tag, attrs, phrases, text) {
    if (!Array.isArray(phrases) || phrases.join('') !== text) {
      var plain = {};
      Object.keys(attrs).forEach(function (key) { plain[key] = attrs[key]; });
      plain.text = text;
      return h(tag, plain);
    }
    var children = [];
    phrases.forEach(function (phrase, i) {
      if (i) children.push(document.createElement('wbr'));
      children.push(h('span', { class: 'jp-phrase', text: phrase }));
    });
    return h(tag, attrs, children);
  }

  function queryParams() {
    return new URLSearchParams(location.search);
  }

  function shelfById(id) {
    if (!CONTENT || !Array.isArray(CONTENT.shelves)) return null;
    for (var i = 0; i < CONTENT.shelves.length; i++) {
      if (CONTENT.shelves[i].id === id) return CONTENT.shelves[i];
    }
    return null;
  }

  // 期限の切れた current を「まだ有効」として見せない。差し替えは人の編集でだけ
  // 行うので、client 側で勝手に別の Object へ置き換えることはしない。
  function shelfHasExpiredCurrent(shelf) {
    var now = Date.now();
    return shelf.objects.some(function (object) {
      if (!object.expiresAt) return false;
      var at = Date.parse(object.expiresAt);
      return !isNaN(at) && at <= now;
    });
  }

  /* ---------------------------------------------------------------- 玄関 */

  function shelfEntry(shelf, index) {
    var n = String(index + 1).padStart(2, '0');
    return h('a', {
      class: 'shelf-entry' + (shelf.role === 'flagship' ? ' is-flagship' : ''),
      href: './shelf.html?shelf=' + encodeURIComponent(shelf.id),
      'data-shelf-id': shelf.id
    }, [
      h('span', { class: 'shelf-number' }, [
        h('span', { class: 'plate-n', text: n }),
        h('span', { class: 'plate-sep', text: ' / ' }),
        h('span', { class: 'plate-of', text: '04' })
      ]),
      h('span', { class: 'shelf-name', text: shelf.name }),
      jpHeading('span', { class: 'shelf-tagline' }, null, shelf.tagline),
      h('span', { class: 'shelf-mark', 'aria-hidden': 'true', text: '→' })
    ]);
  }

  function renderFoyer() {
    var list = document.getElementById('shelfList');
    if (!list) return;
    if (!CONTENT || !Array.isArray(CONTENT.shelves) || CONTENT.shelves.length !== 4) {
      list.textContent = 'この書店はいま準備中です。';
      live.textContent = 'この書店はいま準備中です。';
      return;
    }
    CONTENT.shelves.forEach(function (shelf, index) {
      list.appendChild(shelfEntry(shelf, index));
    });
    if (list.querySelectorAll('.shelf-entry').length === 4) {
      var endPlate = document.querySelector('.end-plate');
      if (endPlate) endPlate.hidden = false;
    }
  }

  /* ---------------------------------------------------------------- 棚 */

  var grid = document.getElementById('objectGrid');
  var dialog = document.getElementById('detailDialog');
  var detail = document.getElementById('detailContent');
  var closeButton = document.getElementById('closeDialog');

  function haltShelf(message) {
    if (grid) grid.textContent = message;
    var endPlate = document.querySelector('.end-plate');
    if (endPlate) endPlate.hidden = true;
    if (live) live.textContent = message;
  }

  function blockMissingMedia() {
    haltShelf('この棚はいま準備中です。');
    return true;
  }

  // Real Media の出し方の決まりごと:
  // - frame の縦横比は media 自身の実寸から取る。Object の identity を frame の
  //   都合で切らない。
  // - 実写を持たない対象には V3 独自の活字図版を組む。既存の表紙・ポスター・
  //   スチル・チラシは模写しない。
  // - 一覧の alt は Reveal の答えを名指ししない。
  function media(object, className, isFirst, isListContext) {
    var m = object.media;
    var alt = isListContext ? m.listAlt : m.detailAlt;
    if (m.kind === 'plate') {
      return h('div', {
        class: 'media-frame ' + className + ' media-plate',
        'data-crop': 'none',
        style: '--plate-ratio: ' + m.ratio
      }, [
        h('div', { class: 'plate-inner', role: 'img', 'aria-label': alt }, [
          h('span', { class: 'plate-rule', 'aria-hidden': 'true' }),
          jpHeading('span', { class: 'plate-word', 'aria-hidden': 'true' }, null, m.plateWord),
          h('span', { class: 'plate-sub', 'aria-hidden': 'true', text: m.plateSub })
        ])
      ]);
    }
    return h('div', {
      class: 'media-frame ' + className,
      'data-crop': m.crop || 'none',
      style: '--media-w: ' + m.width + '; --media-h: ' + m.height
    }, [
      h('img', {
        src: m.url,
        alt: alt,
        onerror: blockMissingMedia,
        width: m.width,
        height: m.height,
        loading: 'eager',
        fetchpriority: isFirst ? 'high' : 'auto',
        decoding: 'async',
        referrerpolicy: 'no-referrer'
      })
    ]);
  }

  function card(object, index) {
    var button;
    var n = String(index + 1).padStart(2, '0');
    var hookId = 'hook-' + object.id;
    var openId = 'open-' + object.id;
    return h('article', { class: 'object-card', 'data-object-id': object.id }, [
      media(object, 'card-media', index === 0, true),
      h('div', { class: 'card-body' }, [
        h('p', { class: 'card-number' }, [
          h('span', { class: 'plate-n', text: n }),
          h('span', { class: 'plate-sep', text: ' / ' }),
          h('span', { class: 'plate-of', text: '03' })
        ]),
        // 一覧では Real Media と Hook だけ。種別・地名は開いたあとの payoff 側に置く。
        jpHeading('h3', { class: 'object-hook', id: hookId }, object.hookPhrases, object.hook),
        (button = h('button', {
          class: 'open-button', type: 'button',
          'aria-labelledby': openId + ' ' + hookId,
          onclick: function () { lastTrigger = button; openDetail(object, index); }
        }, [
          h('span', { class: 'open-word', id: openId, text: 'ひらく' }),
          h('span', { class: 'open-mark', 'aria-hidden': 'true', text: '→' })
        ]))
      ])
    ]);
  }

  function rightsRow(key, valueNode) {
    return h('div', { class: 'rights-row' }, [
      h('span', { class: 'rights-key', text: key }),
      h('span', { class: 'rights-value' }, [valueNode])
    ]);
  }

  function link(href, text) {
    return h('a', {
      class: 'rights-link', href: href, target: '_blank',
      rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', text: text
    });
  }

  // 実写は CC 表示に必要な要素をすべて出す。活字図版は「これは V3 が組んだ図版で、
  // 既存の表紙やポスターではない」ことを明記し、事実の出典を別に示す。
  function rightsBlock(object) {
    if (object.media.kind === 'plate') {
      return h('section', { class: 'rights-note' }, [
        h('h3', { class: 'rights-title', text: 'この図版について' }),
        rightsRow('作成', h('span', { text: 'みんなの感情書店' })),
        rightsRow('種類', h('span', { text: 'この棚のために組んだ活字図版。既存の表紙・ポスター・スチル・チラシは使っていません' })),
        rightsRow('事実の出典', link(object.factsSourceUrl, '公式ページ')),
        rightsRow('変更', h('span', { text: '該当なし' }))
      ]);
    }
    var r = object.rights || {};
    return h('section', { class: 'rights-note' }, [
      h('h3', { class: 'rights-title', text: 'この写真について' }),
      rightsRow('撮影', h('span', { text: r.author })),
      rightsRow('出典', link(r.sourceUrl, r.source)),
      rightsRow('利用条件', r.licenseUrl ? link(r.licenseUrl, r.license) : h('span', { text: r.license })),
      rightsRow('変更', h('span', { text: r.modification }))
    ]);
  }

  function openDetail(object, index) {
    detail.textContent = '';
    var facts = h('dl', { class: 'facts-list' }, object.facts.map(function (row) {
      return h('div', { class: 'fact-row' }, [
        h('dt', { text: row[0] }),
        h('dd', { text: row[1] })
      ]);
    }));

    detail.appendChild(h('article', { class: 'detail-article', 'data-object-id': object.id }, [
      h('p', { class: 'detail-count' }, [
        h('span', { class: 'plate-n', text: String(index + 1).padStart(2, '0') }),
        h('span', { class: 'plate-sep', text: ' / ' }),
        h('span', { class: 'plate-of', text: '03' })
      ]),
      media(object, 'detail-media', true),
      h('div', { class: 'detail-copy' }, [
        // 開いた時点で Hook は既知。payoff は Reveal なので、Reveal を見出しにする。
        jpHeading('p', { class: 'detail-hook-echo' }, object.hookPhrases, object.hook),
        jpHeading('h2', { id: 'detailTitle', class: 'detail-reveal' }, object.revealPhrases, object.reveal),
        h('p', { class: 'object-meta', text: object.typeLabel + ' · ' + object.placeName }),
        h('section', { class: 'verified-block' }, [
          h('h3', { text: '行く前にわかること' }),
          facts
        ]),
        h('div', { class: 'detail-actions' }, [
          h('a', {
            class: 'official-action',
            href: object.actionUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
            referrerpolicy: 'no-referrer'
          }, [h('span', { text: object.actionLabel }), h('span', { 'aria-hidden': 'true', text: '↗' })])
        ]),
        // 権利表記。Official Action の下、詳細の最下部にだけ置く。
        rightsBlock(object)
      ])
    ]));

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    // 2件目以降を開いたとき、前の Object のスクロール位置が残っていると
    // Real Media と Reveal を飛ばした途中から始まってしまう。必ず頭から見せる。
    dialog.scrollTop = 0;
  }

  function closeDetail() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    if (lastTrigger) lastTrigger.focus();
  }

  function renderShelf() {
    if (!grid) return;
    var requested = queryParams().get('shelf') || 'tokyo';
    var shelf = shelfById(requested);

    if (!shelf) {
      document.title = 'みんなの感情書店｜棚';
      haltShelf('その棚は見つかりませんでした。');
      var lost = document.querySelector('.hero h1');
      if (lost) lost.textContent = 'その棚は、ありません。';
      var exit = h('p', { class: 'end-exit lost-exit' }, [
        h('a', { class: 'other-shelves', href: './index.html', text: 'ほかの棚を見る' })
      ]);
      grid.parentNode.appendChild(exit);
      return;
    }

    document.title = 'みんなの感情書店｜' + shelf.name;
    document.body.setAttribute('data-shelf', shelf.id);
    var title = document.querySelector('.hero h1');
    if (title) {
      title.textContent = '';
      shelf.tagline.split('、').forEach(function (part, i, all) {
        title.appendChild(h('span', {
          class: 'hero-line', text: i < all.length - 1 ? part + '、' : part
        }));
      });
    }
    var label = document.getElementById('shelfLabel');
    if (label) label.textContent = shelf.name + ' / 全3点';

    if (shelf.objects.length !== 3) return haltShelf('この棚はいま準備中です。');
    // 期限切れの会期・公演を「いま」として見せない。棚ごと閉じる。
    if (shelfHasExpiredCurrent(shelf)) return haltShelf('この棚はいま準備中です。');

    shelf.objects.forEach(function (object, index) {
      grid.appendChild(card(object, index));
    });

    if (grid.querySelectorAll('.object-card').length === 3) {
      var endPlate = document.querySelector('.end-plate');
      if (endPlate) endPlate.hidden = false;
    }

    closeButton.addEventListener('click', closeDetail);
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) closeDetail();
    });
    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeDetail();
    });
  }

  if (!CONTENT || !Array.isArray(CONTENT.shelves)) {
    haltShelf('この書店はいま準備中です。');
    return;
  }
  if (document.getElementById('shelfList')) renderFoyer();
  if (grid) renderShelf();
})();

(function () {
  'use strict';

  var CONTENT = window.TOKYO_PILOT_CONTENT;
  var grid = document.getElementById('objectGrid');
  var dialog = document.getElementById('detailDialog');
  var detail = document.getElementById('detailContent');
  var closeButton = document.getElementById('closeDialog');
  var live = document.getElementById('live');
  var lastTrigger = null;

  if (!CONTENT || !Array.isArray(CONTENT.objects) || CONTENT.objects.length !== 3) {
    grid.textContent = '現在、この棚は準備中です。';
    return;
  }

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

  function queryParams() {
    return new URLSearchParams(location.search);
  }

  function isParticipantMode() {
    return queryParams().get('participant') === '1';
  }

  // 参加者サイクルの fail-closed。
  // 前提が崩れたら、半端な棚を見せずに止める。内部の事情は書かない。
  function haltParticipantCycle() {
    grid.textContent = 'この棚はいま準備中です。';
    var endPlate = document.querySelector('.end-plate');
    if (endPlate) endPlate.hidden = true;
    live.textContent = 'この棚はいま準備中です。';
    return true;
  }

  // media がまだ同一オリジンに置かれていない。
  function blockUnlocalizedParticipantCycle() {
    if (!isParticipantMode() || CONTENT.feature.mediaPolicy === 'same-origin-localized') return false;
    return haltParticipantCycle();
  }

  // 掲載事実の期限が切れている。古い営業情報を「まだ有効」として見せない。
  function blockStaleParticipantCycle() {
    if (!isParticipantMode()) return false;
    var now = Date.now();
    var stale = CONTENT.objects.some(function (object) {
      if (!object.expiresAt) return false;
      var at = Date.parse(object.expiresAt);
      return !isNaN(at) && at <= now;
    });
    return stale ? haltParticipantCycle() : false;
  }

  // Real Media が配信されなかった。灰色の枠を3つ並べたまま続けない。
  function blockMissingMediaParticipantCycle() {
    if (!isParticipantMode()) return false;
    return haltParticipantCycle();
  }

  function orderFromQuery() {
    var params = queryParams();
    var requested = (params.get('order') || 'abc').toLowerCase();
    var valid = ['abc', 'acb', 'bac', 'bca', 'cab', 'cba'];
    if (valid.indexOf(requested) === -1) requested = 'abc';
    var map = { a: CONTENT.objects[0], b: CONTENT.objects[1], c: CONTENT.objects[2] };
    return requested.split('').map(function (key) { return map[key]; });
  }

  // Real Media の出し方の決まりごと:
  // - frame の縦横比は media 自身の実寸から取る。Object の identity を frame の
  //   都合で切らない。切ってよい端があるなら content 側の mediaCrop が決める。
  // - 棚は3件で終わるので3枚とも遅延させずに読む。lazy は3件では節約にならず、
  //   スクロール中に灰色の枠だけが出る危険が残る。
  // - 一覧の alt は Reveal の答えを名指ししない。読み上げ利用者だけが先に
  //   答えを受け取ることのないようにする。
  function media(object, className, isFirst, isListContext) {
    return h('div', {
      class: 'media-frame ' + className,
      'data-crop': object.mediaCrop || 'none',
      style: '--media-w: ' + object.mediaWidth + '; --media-h: ' + object.mediaHeight
    }, [
      h('img', {
        src: object.mediaUrl,
        alt: isListContext ? (object.cardMediaAlt || object.mediaAlt) : object.mediaAlt,
        onerror: blockMissingMediaParticipantCycle,
        width: object.mediaWidth,
        height: object.mediaHeight,
        loading: 'eager',
        fetchpriority: isFirst ? 'high' : 'auto',
        decoding: 'async',
        referrerpolicy: 'no-referrer'
      })
    ]);
  }

  function card(object, index) {
    var button;
    var article = h('article', { class: 'object-card', 'data-object-id': object.id }, [
      h('div', { class: 'card-number', text: String(index + 1).padStart(2, '0') + ' / 03' }),
      media(object, 'card-media', index === 0, true),
      h('div', { class: 'card-body' }, [
        // 一覧では Real Media と Hook だけを出す。種別・地名は開いたあとの payoff 側に置く。
        h('h3', { class: 'object-hook', text: object.hook }),
        (button = h('button', {
          class: 'open-button', type: 'button',
          onclick: function () { lastTrigger = button; openDetail(object, index); }
        }, [h('span', { text: 'ひらく' })]))
      ])
    ]);
    return article;
  }

  // CC 表示に必要な要素をすべて出す: 著作者 / 出典 / ライセンス名 /
  // ライセンス条文への link / 加えた変更。出典ファイルページへの link も残す。
  function rightsBlock(object) {
    var r = object.rights || {};
    var rows = [
      h('div', { class: 'rights-row' }, [
        h('span', { class: 'rights-key', text: '撮影' }),
        h('span', { class: 'rights-value', text: r.author })
      ]),
      h('div', { class: 'rights-row' }, [
        h('span', { class: 'rights-key', text: '出典' }),
        h('span', { class: 'rights-value' }, [
          h('a', {
            class: 'rights-link', href: r.sourceUrl, target: '_blank',
            rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', text: r.source
          })
        ])
      ]),
      h('div', { class: 'rights-row' }, [
        h('span', { class: 'rights-key', text: '利用条件' }),
        h('span', { class: 'rights-value' }, [
          r.licenseUrl
            ? h('a', {
                class: 'rights-link', href: r.licenseUrl, target: '_blank',
                rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', text: r.license
              })
            : h('span', { text: r.license })
        ])
      ]),
      h('div', { class: 'rights-row' }, [
        h('span', { class: 'rights-key', text: '変更' }),
        h('span', { class: 'rights-value', text: r.modification })
      ])
    ];
    return h('section', { class: 'rights-note' }, [
      h('h3', { class: 'rights-title', text: 'この写真について' })
    ].concat(rows));
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
      h('p', { class: 'detail-count', text: String(index + 1).padStart(2, '0') + ' / 03' }),
      media(object, 'detail-media', true),
      h('div', { class: 'detail-copy' }, [
        // 開いた時点で Hook は既知。payoff は Reveal なので、Reveal を見出しにする。
        h('p', { class: 'detail-hook-echo', text: object.hook }),
        h('h2', { id: 'detailTitle', class: 'detail-reveal', text: object.reveal }),
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
        // 一覧には絶対に出さない。読めない大きさにもしない。
        rightsBlock(object)
      ])
    ]));

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    // 2件目以降を開いたとき、前に開いた Object のスクロール位置が残っていると
    // Real Media と Reveal を飛ばした途中から始まってしまう。必ず頭から見せる。
    dialog.scrollTop = 0;
    // 開いたことは dialog の accessible name（= Reveal）が伝える。
    // ここで重ねて読み上げると、payoff の直前に余計な一文が挟まる。
  }

  function closeDetail() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    if (lastTrigger) lastTrigger.focus();
  }

  // 描く前に、参加者へ出してよい状態か確かめる。
  if (blockUnlocalizedParticipantCycle()) return;
  if (blockStaleParticipantCycle()) return;

  orderFromQuery().forEach(function (object, index) {
    grid.appendChild(card(object, index));
  });

  // 3件が実際に並んだときだけ、終わりを出す。
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
})();

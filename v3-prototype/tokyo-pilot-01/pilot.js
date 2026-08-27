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

  function haltParticipantCycle(reason) {
    grid.textContent = 'この棚はいま準備中です。';
    var endPlate = document.querySelector('.end-plate');
    if (endPlate) endPlate.hidden = true;
    live.textContent = 'この棚はいま準備中です。';
    return reason;
  }

  function blockUnlocalizedParticipantCycle() {
    if (!isParticipantMode() || CONTENT.feature.mediaPolicy === 'same-origin-localized') return false;
    return haltParticipantCycle(true);
  }

  // 掲載事実に期限があるものは、期限を過ぎたら参加者へ出さない。
  // 古い営業情報を「まだ有効」として見せないための fail-closed。
  function blockStaleParticipantCycle() {
    if (!isParticipantMode()) return false;
    var now = Date.now();
    var stale = CONTENT.objects.some(function (object) {
      if (!object.expiresAt) return false;
      var at = Date.parse(object.expiresAt);
      return !isNaN(at) && at <= now;
    });
    if (!stale) return false;
    return haltParticipantCycle(true);
  }

  function orderFromQuery() {
    var params = queryParams();
    var requested = (params.get('order') || 'abc').toLowerCase();
    var valid = ['abc', 'acb', 'bac', 'bca', 'cab', 'cba'];
    if (valid.indexOf(requested) === -1) requested = 'abc';
    var map = { a: CONTENT.objects[0], b: CONTENT.objects[1], c: CONTENT.objects[2] };
    return requested.split('').map(function (key) { return map[key]; });
  }

  // frame は media 自身の縦横比を使う。Object の identity を crop で壊さないため、
  // 切ってよい端は content 側の mediaCrop が決める（'none' なら一切切らない）。
  // 棚は3件で終わる。Real Media が出ていないと Hook も成立しないので、
  // 3枚とも遅延させずに読む（lazy は3件では節約にならず、灰色の枠だけが残る）。
  // 一覧では alt も Reveal の答えを名指ししない。読み上げ利用者だけが
  // 先に答えを受け取ることのないようにする。
  function media(object, className, eager, listContext) {
    return h('div', {
      class: 'media-frame ' + className,
      'data-crop': object.mediaCrop || 'none',
      style: '--media-w: ' + object.mediaWidth + '; --media-h: ' + object.mediaHeight
    }, [
      h('img', {
        src: object.mediaUrl,
        alt: listContext ? (object.cardMediaAlt || object.mediaAlt) : object.mediaAlt,
        width: object.mediaWidth,
        height: object.mediaHeight,
        loading: 'eager',
        fetchpriority: eager ? 'high' : 'auto',
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
        // 権利表記は必須だが、Official Action と並べると行き先が二択に見える。
        h('p', { class: 'rights-note' }, [
          h('a', {
            class: 'rights-link', href: object.rightsUrl, target: '_blank',
            rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', text: object.attribution
          })
        ])
      ])
    ]));

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    live.textContent = object.objectName + 'の詳細を開きました。';
  }

  function closeDetail() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    if (lastTrigger) lastTrigger.focus();
  }

  if (blockUnlocalizedParticipantCycle()) return;
  if (blockStaleParticipantCycle()) return;

  orderFromQuery().forEach(function (object, index) {
    grid.appendChild(card(object, index));
  });

  closeButton.addEventListener('click', closeDetail);
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) closeDetail();
  });
  dialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    closeDetail();
  });
})();

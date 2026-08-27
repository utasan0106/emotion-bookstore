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

  function blockUnlocalizedParticipantCycle() {
    if (!isParticipantMode() || CONTENT.feature.mediaPolicy === 'same-origin-localized') return false;
    grid.textContent = 'このテストは準備中です。';
    var endPlate = document.querySelector('.end-plate');
    if (endPlate) endPlate.hidden = true;
    live.textContent = '実画像の準備が完了するまで、このテストは開始できません。';
    return true;
  }

  function orderFromQuery() {
    var params = queryParams();
    var requested = (params.get('order') || 'abc').toLowerCase();
    var valid = ['abc', 'acb', 'bac', 'bca', 'cab', 'cba'];
    if (valid.indexOf(requested) === -1) requested = 'abc';
    var map = { a: CONTENT.objects[0], b: CONTENT.objects[1], c: CONTENT.objects[2] };
    return requested.split('').map(function (key) { return map[key]; });
  }

  function media(object, className, eager) {
    return h('div', { class: 'media-frame ' + className }, [
      h('img', {
        src: object.mediaUrl,
        alt: object.mediaAlt,
        loading: eager ? 'eager' : 'lazy',
        decoding: 'async',
        referrerpolicy: 'no-referrer'
      })
    ]);
  }

  function card(object, index) {
    var button;
    var article = h('article', { class: 'object-card', 'data-object-id': object.id }, [
      h('div', { class: 'card-number', text: String(index + 1).padStart(2, '0') + ' / 03' }),
      media(object, 'card-media', index === 0),
      h('div', { class: 'card-body' }, [
        h('p', { class: 'object-meta', text: object.typeLabel + ' · ' + object.placeName }),
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
        h('p', { class: 'object-meta', text: object.typeLabel + ' · ' + object.placeName }),
        h('h2', { id: 'detailTitle', class: 'detail-hook', text: object.hook }),
        h('p', { class: 'detail-reveal', text: object.reveal }),
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
          }, [h('span', { text: object.actionLabel }), h('span', { 'aria-hidden': 'true', text: '↗' })]),
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

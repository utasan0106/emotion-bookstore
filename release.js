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

  function formatVerifiedDate(value) {
    var m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    return Number(m[1]) + '年' + Number(m[2]) + '月' + Number(m[3]) + '日';
  }

  function shelfById(id) {
    // 旧東京deep linkは、壊さず吉祥寺へ静かに引き継ぐ。
    if (id === 'tokyo') id = 'kichijoji';
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


  /* ---------------------------------------------------------- 共通 MENU */

  var WEEKLY_FAVORITES_KEY = 'emotionBookstore.v3.weeklyFavorites.v1';

  function readWeeklyFavorites() {
    try {
      var raw = localStorage.getItem(WEEKLY_FAVORITES_KEY);
      var items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(items)) items = [];
      var now = Date.now();
      var liveItems = items.filter(function (item) {
        if (!item || !item.id || !item.shelfId || !item.title) return false;
        if (!item.expiresAt) return true;
        var at = Date.parse(item.expiresAt);
        return isNaN(at) || at > now;
      });
      if (liveItems.length !== items.length) localStorage.setItem(WEEKLY_FAVORITES_KEY, JSON.stringify(liveItems));
      return liveItems;
    } catch (_) {
      return [];
    }
  }

  function writeWeeklyFavorites(items) {
    try {
      localStorage.setItem(WEEKLY_FAVORITES_KEY, JSON.stringify(items));
      return true;
    } catch (_) {
      return false;
    }
  }

  function weeklyFavoriteRecord(shelf, feature) {
    return {
      id: 'weekly:' + shelf.id + ':' + (feature.expiresAt || feature.title),
      shelfId: shelf.id,
      shelfName: shelf.area || shelf.name || '',
      title: feature.title,
      dateLabel: feature.dateLabel || '',
      expiresAt: feature.expiresAt || ''
    };
  }

  function isWeeklyFavorite(id) {
    return readWeeklyFavorites().some(function (item) { return item.id === id; });
  }

  function toggleWeeklyFavorite(record) {
    var items = readWeeklyFavorites();
    var found = items.some(function (item) { return item.id === record.id; });
    var next = found ? items.filter(function (item) { return item.id !== record.id; }) : items.concat([record]);
    return { saved: !found, ok: writeWeeklyFavorites(next) };
  }

  function renderMenuFavorites() {
    var box = document.getElementById('siteMenuFavorites');
    if (!box) return;
    box.textContent = '';
    var items = readWeeklyFavorites();
    if (!items.length) {
      box.appendChild(h('p', { class: 'site-menu-favorites-empty', text: 'まだありません。' }));
      return;
    }
    items.forEach(function (item) {
      box.appendChild(h('a', {
        class: 'site-menu-favorite-link',
        href: './shelf.html?shelf=' + encodeURIComponent(item.shelfId)
      }, [
        h('span', { class: 'site-menu-favorite-town', text: item.shelfName }),
        h('span', { class: 'site-menu-favorite-title', text: item.title }),
        h('span', { class: 'site-menu-favorite-mark', 'aria-hidden': 'true', text: '→' })
      ]));
    });
  }

  function initSiteMenu() {
    var button = document.getElementById('siteMenuButton');
    var menu = document.getElementById('siteMenu');
    var close = document.getElementById('siteMenuClose');
    if (!button || !menu || !close) return;

    function openMenu() {
      var current = document.body.getAttribute('data-shelf') || '';
      Array.prototype.forEach.call(menu.querySelectorAll('[data-menu-shelf]'), function (link) {
        if (current && link.getAttribute('data-menu-shelf') === current) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      renderMenuFavorites();
      if (typeof menu.showModal === 'function') menu.showModal();
      else menu.setAttribute('open', '');
    }

    function closeMenu() {
      if (typeof menu.close === 'function' && menu.open) menu.close();
      else menu.removeAttribute('open');
      button.focus();
    }

    button.addEventListener('click', openMenu);
    close.addEventListener('click', closeMenu);
    menu.addEventListener('click', function (event) { if (event.target === menu) closeMenu(); });
    menu.addEventListener('cancel', function (event) { event.preventDefault(); closeMenu(); });
  }

  function googleCalendarUrl(feature) {
    var params = new URLSearchParams();
    params.set('action', 'TEMPLATE');
    params.set('text', feature.title || '');
    params.set('dates', feature.calendarDates || '');
    params.set('details', (feature.why || '') + '\n' + (feature.actionUrl || ''));
    params.set('location', feature.venue || '');
    return 'https://calendar.google.com/calendar/render?' + params.toString();
  }

  function renderWeeklyFeature(shelf) {
    var section = document.getElementById('weeklyFeature');
    var box = document.getElementById('weeklyFeatureContent');
    if (!section || !box) return;
    section.hidden = true;
    box.textContent = '';
    var feature = shelf && shelf.weeklyFeature;
    if (!feature) return;
    var expires = Date.parse(feature.expiresAt || '');
    if (!isNaN(expires) && expires <= Date.now()) return;

    var favorite = weeklyFavoriteRecord(shelf, feature);
    var favoriteButton = h('button', {
      class: 'weekly-feature-secondary weekly-feature-favorite',
      type: 'button',
      'aria-pressed': isWeeklyFavorite(favorite.id) ? 'true' : 'false'
    });
    function paintFavorite() {
      var saved = isWeeklyFavorite(favorite.id);
      favoriteButton.setAttribute('aria-pressed', saved ? 'true' : 'false');
      favoriteButton.textContent = saved ? '気になる済み' : '気になる';
    }
    favoriteButton.addEventListener('click', function () {
      var result = toggleWeeklyFavorite(favorite);
      if (!result.ok) { favoriteButton.textContent = '保存できません'; return; }
      paintFavorite();
      renderMenuFavorites();
    });
    paintFavorite();

    var calendarLink = h('a', {
      class: 'weekly-feature-secondary weekly-feature-calendar',
      href: googleCalendarUrl(feature),
      target: '_blank',
      rel: 'noopener noreferrer',
      referrerpolicy: 'no-referrer'
    }, [
      h('span', { text: 'Googleカレンダーに追加' }),
      h('span', { 'aria-hidden': 'true', text: '↗' })
    ]);

    box.appendChild(h('article', { class: 'weekly-feature-card' }, [
      h('div', { class: 'weekly-feature-meta' }, [
        h('p', { class: 'weekly-feature-date', text: feature.dateLabel }),
        h('p', { class: 'weekly-feature-venue', text: feature.venue }),
        h('p', {
          class: 'weekly-feature-verified',
          text: '公式情報の確認日: ' + formatVerifiedDate(feature.verifiedAt)
        })
      ]),
      jpHeading('h2', { id: 'weeklyFeatureTitle', class: 'weekly-feature-title' }, feature.titlePhrases, feature.title),
      h('p', { class: 'weekly-feature-why', text: feature.why }),
      h('div', { class: 'weekly-feature-actions' }, [
        h('a', {
          class: 'weekly-feature-official',
          href: feature.actionUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          referrerpolicy: 'no-referrer'
        }, [h('span', { text: feature.actionLabel }), h('span', { 'aria-hidden': 'true', text: '↗' })]),
        favoriteButton,
        calendarLink
      ])
    ]));
    section.hidden = false;
  }

  /* ---------------------------------------------------------------- 玄関 */

  function shelfEntryMedia(shelf) {
    var m = shelf && (shelf.entryMedia || shelf.heroMedia);
    if (!m || !m.url) return null;

    var isIllustration = !!(shelf.entryMedia && m === shelf.entryMedia);
    var children = [
      h('div', { class: 'shelf-entry-media-frame' }, [
        h('img', {
          src: m.url,
          alt: m.alt || (shelf.area + 'の街の風景'),
          loading: 'lazy',
          decoding: 'async',
          referrerpolicy: 'no-referrer',
          width: m.width,
          height: m.height
        })
      ])
    ];

    if (!isIllustration) {
      var credit = ['写真: ' + (m.author || ''), m.source || '', m.license || '']
        .filter(Boolean)
        .join(' / ');
      children.push(h('figcaption', { class: 'shelf-entry-media-credit', text: credit }));
    }

    return h('figure', {
      class: 'shelf-entry-media' + (isIllustration ? ' is-entry-illustration' : '')
    }, children);
  }

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
      shelfEntryMedia(shelf),
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
    renderCategoryIndex();
    renderDetour();
  }

  function detourMedia(item) {
    var m = item && item.media;
    if (!m) return null;

    if (m.kind === 'cover') {
      return h('figure', { class: 'detour-media detour-cover' }, [
        h('div', { class: 'detour-media-frame' }, [
          h('img', {
            src: m.url,
            alt: m.alt || '',
            loading: 'lazy',
            decoding: 'async',
            referrerpolicy: 'no-referrer'
          })
        ]),
        h('figcaption', { class: 'detour-media-source' }, [
          h('a', {
            href: m.sourceUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
            referrerpolicy: 'no-referrer',
            text: m.sourceLabel
          })
        ])
      ]);
    }

    if (m.kind === 'publisher-link') {
      return h('div', { class: 'detour-media detour-publisher-plate' }, [
        h('a', {
          class: 'detour-media-frame detour-publisher-link',
          href: m.sourceUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          referrerpolicy: 'no-referrer'
        }, [
          h('span', { class: 'detour-publisher-kicker', text: 'BOOK' }),
          h('span', { class: 'detour-publisher-title', text: '書影を公式ページで見る' }),
          h('span', { class: 'detour-video-mark', 'aria-hidden': 'true', text: '↗' })
        ])
      ]);
    }

    if (m.kind === 'youtube') {
      var frame = h('div', { class: 'detour-media-frame' });
      var button = h('button', {
        class: 'detour-video-play',
        type: 'button',
        onclick: function () {
          var videoId = m.videoId || '';
          if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
          var iframe = h('iframe', {
            class: 'detour-video-iframe',
            title: m.videoTitle || item.title,
            allow: 'autoplay; encrypted-media; picture-in-picture',
            allowfullscreen: true,
            referrerpolicy: 'strict-origin-when-cross-origin',
            src: 'https://www.youtube-nocookie.com/embed/' +
              encodeURIComponent(videoId) + '?autoplay=1&playsinline=1&rel=0'
          });
          frame.textContent = '';
          frame.appendChild(iframe);
        }
      }, [
        h('span', { class: 'detour-video-source', text: m.sourceLabel }),
        h('span', { class: 'detour-video-label', text: m.buttonLabel }),
        h('span', { class: 'detour-video-mark', 'aria-hidden': 'true', text: '▶' })
      ]);
      frame.appendChild(button);
      return h('div', { class: 'detour-media detour-video' }, [frame]);
    }

    return null;
  }

  function detourDestinations(item) {
    var items = Array.isArray(item.destinations) ? item.destinations : [];
    if (!items.length) return null;
    return h('div', { class: 'detour-destinations' }, items.map(function (destination) {
      return h('a', {
        class: 'detour-destination' + (destination.affiliate ? ' is-affiliate' : ''),
        href: destination.url,
        target: '_blank',
        rel: destination.affiliate ? 'sponsored noopener noreferrer' : 'noopener noreferrer',
        referrerpolicy: 'no-referrer',
        text: destination.label + (destination.affiliate ? '（PR）' : '')
      });
    }));
  }

  function renderDetour() {
    var box = document.getElementById('detourList');
    var title = document.getElementById('detour-title');
    if (!box || !title || !CONTENT || !CONTENT.detour) return;
    var d = CONTENT.detour;
    title.textContent = '';
    var theme = jpHeading('span', { class: 'detour-theme-copy' }, d.themePhrases, d.theme || '');
    while (theme.firstChild) title.appendChild(theme.firstChild);
    box.textContent = '';
    (d.items || []).slice(0, 3).forEach(function (item) {
      box.appendChild(h('article', { class: 'detour-item' }, [
        detourMedia(item),
        h('p', { class: 'detour-kind', text: item.kind }),
        h('h3', { class: 'detour-name', text: item.title }),
        h('p', { class: 'detour-creator', text: item.creator }),
        h('p', { class: 'detour-why', text: item.why }),
        h('p', { class: 'detour-action' }, [
          h('a', {
            class: 'detour-link', href: item.actionUrl, target: '_blank',
            rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', text: item.actionLabel
          })
        ]),
        detourDestinations(item)
      ]));
    });
  }

  /* ------------------------------------------------------------ 種類の索引 */

  function isLive(object) {
    if (!object.expiresAt) return true;
    var at = Date.parse(object.expiresAt);
    return isNaN(at) ? true : at > Date.now();
  }

  function categoryShelfById(id) {
    return id ? shelfById(id) : null;
  }

  function objectsInCategory(categoryId, townId) {
    var out = [];
    CONTENT.shelves.forEach(function (shelf) {
      if (townId && shelf.id !== townId) return;
      shelf.objects.forEach(function (object) {
        if (!isLive(object)) return;
        if ((object.categoryIds || []).indexOf(categoryId) === -1) return;
        out.push({ shelf: shelf, object: object });
      });
    });
    return out;
  }

  function archiveInCategory(categoryId, townId) {
    var archive = CONTENT && Array.isArray(CONTENT.archive) ? CONTENT.archive : [];
    return archive.filter(function (entry) {
      if (townId && entry.shelfId !== townId) return false;
      return (entry.categoryIds || []).indexOf(categoryId) !== -1;
    });
  }

  function categoryResult(entry) {
    var o = entry.object;
    return h('article', { class: 'result-row', 'data-object-id': o.id }, [
      h('p', { class: 'result-meta' }, [
        h('span', { class: 'result-town', text: entry.shelf.area }),
        h('span', { class: 'plate-sep', text: ' / ' }),
        h('span', { class: 'result-type', text: o.typeLabel })
      ]),
      h('h4', { class: 'result-name', text: o.objectName }),
      jpHeading('p', { class: 'result-hook' }, o.hookPhrases, o.hook),
      h('p', { class: 'result-go' }, [
        h('a', {
          class: 'result-link',
          href: './shelf.html?shelf=' + encodeURIComponent(entry.shelf.id)
        }, [
          h('span', { text: 'この棚で見る' }),
          h('span', { 'aria-hidden': 'true', text: '→' })
        ])
      ])
    ]);
  }

  function archiveResult(entry) {
    var shelf = categoryShelfById(entry.shelfId);
    var area = entry.area || (shelf && shelf.area) || '';
    var children = [
      h('p', { class: 'result-meta' }, [
        h('span', { class: 'result-town', text: area }),
        h('span', { class: 'plate-sep', text: ' / ' }),
        h('span', { class: 'result-type', text: entry.typeLabel || '過去の棚' }),
        h('span', { class: 'archive-status', text: 'ARCHIVE' })
      ]),
      h('h4', { class: 'result-name', text: entry.title }),
      h('p', { class: 'result-hook', text: entry.summary || '' }),
      entry.verifiedAt ? h('p', {
        class: 'archive-verified',
        text: '掲載時の公式情報確認日: ' + formatVerifiedDate(entry.verifiedAt)
      }) : null
    ];

    if (entry.actionUrl) {
      children.push(h('p', { class: 'result-go' }, [
        h('a', {
          class: 'result-link',
          href: entry.actionUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          referrerpolicy: 'no-referrer'
        }, [
          h('span', { text: entry.actionLabel || '公式情報を見る' }),
          h('span', { 'aria-hidden': 'true', text: '↗' })
        ])
      ]));
    }

    return h('article', {
      class: 'result-row archive-result-row',
      'data-archive-id': entry.id
    }, children);
  }

  function renderCategoryResults(categoryId, townId) {
    var box = document.getElementById('categoryResults');
    var archiveSection = document.getElementById('categoryArchive');
    var archiveBox = document.getElementById('categoryArchiveResults');
    if (!box) return;

    box.textContent = '';
    if (archiveBox) archiveBox.textContent = '';
    if (archiveSection) archiveSection.hidden = true;
    if (!categoryId) return;

    var category = null;
    CONTENT.categories.forEach(function (c) {
      if (c.id === categoryId) category = c;
    });
    if (!category) return;

    var entries = objectsInCategory(categoryId, townId);
    var archived = archiveInCategory(categoryId, townId);
    var shelf = categoryShelfById(townId);
    var scopeName = shelf ? shelf.area : 'すべての街';

    box.appendChild(h('p', { class: 'result-count' }, [
      h('span', { class: 'result-count-name', text: category.name + ' / ' + scopeName }),
      h('span', { class: 'result-count-n', text: 'いま ' + entries.length + ' 件' })
    ]));

    if (!entries.length) {
      box.appendChild(h('p', {
        class: 'result-empty',
        text: 'この組み合わせは、いま棚にありません。'
      }));
    } else {
      entries.forEach(function (entry) {
        box.appendChild(categoryResult(entry));
      });
    }

    if (archiveSection && archiveBox && archived.length) {
      archived.forEach(function (entry) {
        archiveBox.appendChild(archiveResult(entry));
      });
      archiveSection.hidden = false;
    }
  }

  function renderCategoryIndex() {
    var index = document.getElementById('categoryIndex');
    var townIndex = document.getElementById('categoryTownIndex');
    if (!index || !townIndex || !Array.isArray(CONTENT.categories)) return;

    var requestedCategory = queryParams().get('category') || '';
    var requestedTown = queryParams().get('town') || '';
    var knownCategory = CONTENT.categories.some(function (c) {
      return c.id === requestedCategory;
    });
    var knownTown = CONTENT.shelves.some(function (shelf) {
      return shelf.id === requestedTown;
    });

    var selectedCategory = knownCategory ? requestedCategory : '';
    var selectedTown = knownTown ? requestedTown : '';

    function nextUrl() {
      var params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedTown) params.set('town', selectedTown);
      var q = params.toString();
      return './index.html' + (q ? '?' + q : '');
    }

    function paint() {
      Array.prototype.forEach.call(index.querySelectorAll('.category-link'), function (a) {
        var on = a.dataset.categoryId === selectedCategory;
        a.setAttribute('aria-current', on ? 'true' : 'false');
        a.className = 'category-link' + (on ? ' is-selected' : '');
        var count = objectsInCategory(a.dataset.categoryId, selectedTown).length;
        var countNode = a.querySelector('.category-count');
        if (countNode) countNode.textContent = String(count);
      });

      Array.prototype.forEach.call(
        townIndex.querySelectorAll('.category-town-link'),
        function (a) {
          var on = (a.dataset.townId || '') === selectedTown;
          a.setAttribute('aria-current', on ? 'true' : 'false');
          a.className = 'category-town-link' + (on ? ' is-selected' : '');
        }
      );

      renderCategoryResults(selectedCategory, selectedTown);
    }

    var towns = [{ id: '', name: 'すべて' }].concat(
      CONTENT.shelves.map(function (shelf) {
        return { id: shelf.id, name: shelf.area };
      })
    );

    towns.forEach(function (town) {
      townIndex.appendChild(h('a', {
        class: 'category-town-link',
        href: town.id ? './index.html?town=' + encodeURIComponent(town.id) : './index.html',
        'data-town-id': town.id,
        onclick: function (event) {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
          event.preventDefault();
          selectedTown = town.id;
          if (history.replaceState) history.replaceState(null, '', nextUrl());
          paint();
        }
      }, [h('span', { text: town.name })]));
    });

    CONTENT.categories.forEach(function (category) {
      var count = objectsInCategory(category.id, selectedTown).length;
      index.appendChild(h('a', {
        class: 'category-link',
        href: './index.html?category=' + encodeURIComponent(category.id),
        'data-category-id': category.id,
        onclick: function (event) {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
          event.preventDefault();
          selectedCategory = selectedCategory === category.id ? '' : category.id;
          if (history.replaceState) history.replaceState(null, '', nextUrl());
          paint();
        }
      }, [
        h('span', { class: 'category-name', text: category.name }),
        h('span', { class: 'category-count', text: String(count) })
      ]));
    });

    paint();
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

  function listPlate(object) {
    var place = (object.placeName || '').split(' / ').pop() || '';
    return h('div', {
      class: 'media-frame card-media media-plate list-plate',
      'data-crop': 'none'
    }, [
      h('div', { class: 'plate-inner', role: 'img', 'aria-label': object.objectName + 'の活字図版' }, [
        h('span', { class: 'plate-rule', 'aria-hidden': 'true' }),
        jpHeading('span', { class: 'plate-word', 'aria-hidden': 'true' }, null, object.objectName),
        h('span', { class: 'plate-sub', 'aria-hidden': 'true', text: place + ' / ' + object.typeLabel })
      ])
    ]);
  }

  function card(object, index) {
    var button;
    var n = String(index + 1).padStart(2, '0');
    var hookId = 'hook-' + object.id;
    var openId = 'open-' + object.id;
    return h('article', { class: 'object-card', 'data-object-id': object.id }, [
      listPlate(object),
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
        h('p', {
          class: 'detail-freshness',
          text: '公式情報の確認日: ' + formatVerifiedDate(object.verifiedAt)
        }),
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
    var requested = queryParams().get('shelf') || 'kichijoji';
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

    renderWeeklyFeature(shelf);

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

  /* ------------------------------------------------------ 候補を教える */

  // backend は無い。入力は browser の中だけで定型文になる。
  // URL / query / 計測 / 端末内保存のどこにも入力値を置かない。
  // 外部へ開くのは利用者がその操作を押したときだけで、候補文は URL に載せない。
  function renderSuggest() {
    var form = document.getElementById('suggestForm');
    if (!form) return;
    var name = document.getElementById('sg-name');
    var url = document.getElementById('sg-url');
    var category = document.getElementById('sg-category');
    var note = document.getElementById('sg-note');
    var count = document.getElementById('sg-count');
    var output = document.getElementById('sg-output');
    var copy = document.getElementById('sg-copy');
    var status = document.getElementById('sg-copy-status');

    (CONTENT.categories || []).forEach(function (c, i) {
      category.appendChild(h('option', { value: c.id, text: c.name, selected: i === 0 }));
    });

    function categoryName() {
      var found = '';
      (CONTENT.categories || []).forEach(function (c) { if (c.id === category.value) found = c.name; });
      return found;
    }

    function compose() {
      var lines = ['みんなの感情書店に、候補を1つ。'];
      lines.push('');
      lines.push('場所・作品名: ' + (name.value.trim() || '（未記入）'));
      lines.push('種類: ' + categoryName());
      if (url.value.trim()) lines.push('URL: ' + url.value.trim());
      if (note.value.trim()) {
        lines.push('気になったところ:');
        lines.push(note.value.trim());
      }
      return lines.join('\n');
    }

    function repaint() {
      count.textContent = String(note.value.length);
      output.value = compose();
      status.textContent = '';
    }

    [name, url, category, note].forEach(function (el) {
      el.addEventListener('input', repaint);
      el.addEventListener('change', repaint);
    });
    form.addEventListener('submit', function (event) { event.preventDefault(); });

    copy.addEventListener('click', function () {
      // 空欄や壊れた URL のままコピーさせない。判定は browser 標準の
      // constraint validation にまかせる。独自の検証機構は作らない。
      if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
        status.textContent = '必須項目を確認してください。';
        return;
      }
      var text = output.value;
      function manual() {
        // Clipboard が使えない環境。選択だけしてあげて、あとは手でコピーしてもらう。
        output.focus();
        output.select();
        status.textContent = 'コピーできませんでした。上の文を選んで手でコピーしてください。';
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          status.textContent = 'コピーしました。';
        }, manual);
      } else {
        manual();
      }
    });

    repaint();
  }

  initSiteMenu();

  if (!CONTENT || !Array.isArray(CONTENT.shelves)) {
    haltShelf('この書店はいま準備中です。');
    return;
  }
  if (document.getElementById('shelfList')) renderFoyer();
  if (grid) renderShelf();
  renderSuggest();
})();

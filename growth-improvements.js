(function () {
  'use strict';

  var CONTENT = window.V3_RELEASE_CONTENT || { archive: [], shelves: [], categories: [] };
  var INTEREST_KEY = 'emotionBookstore.v3.interested.v2';
  var LEGACY_WEEKLY_KEY = 'emotionBookstore.v3.weeklyFavorites.v1';

  /* 旧 HOME の有限 category / town / archive 索引は explore.html（compatibility
     surface）が引き継ぐ。Canonical HOME には戻さない。 */
  var EXPLORE_PAGE = './explore.html';
  var LEGACY_UNAVAILABLE_LABEL = '旧HOME掲載項目';
  /* 現在の受け手が無い旧 HOME の record kind。無関係な section へ振らない
     （NO EVIDENCE = NO ROUTE）。 */
  var LEGACY_KINDS_WITHOUT_SURFACE = { detour: true, 'weekly-video': true };
  var LEGACY_HASH_NOTICE = {
    '#weekly-detour': '旧HOMEの「今週の寄り道」は、いまのHOMEにありません。',
    '#weekly-video-title': '旧HOMEの「今週の一本」は、いまのHOMEにありません。'
  };

  function parseTime(value) {
    var at = Date.parse(value || '');
    return isNaN(at) ? null : at;
  }

  function generatedWeeklyArchiveEntries(content, now) {
    if (!content || !Array.isArray(content.shelves)) return [];
    var atNow = typeof now === 'number' ? now : Date.now();
    var out = [];
    content.shelves.forEach(function (shelf) {
      var feature = shelf && shelf.weeklyFeature;
      var expires = feature && parseTime(feature.expiresAt);
      if (!feature || expires === null || expires > atNow) return;
      out.push({
        id: 'weekly:' + shelf.id + ':' + (feature.expiresAt || feature.title),
        sourceKind: 'weekly-feature',
        shelfId: shelf.id,
        area: shelf.area || shelf.name || '',
        categoryIds: Array.isArray(feature.categoryIds) && feature.categoryIds.length ? feature.categoryIds.slice() : ['experience'],
        title: feature.title,
        typeLabel: '今週の特集',
        summary: feature.why || '',
        actionLabel: feature.actionLabel || '公式情報を見る',
        actionUrl: feature.actionUrl || '',
        verifiedAt: feature.verifiedAt || '',
        archivedAt: feature.expiresAt || ''
      });
    });
    return out;
  }

  function archiveEntryForWeeklyFavorite(item, now) {
    var atNow = typeof now === 'number' ? now : Date.now();
    var expires = parseTime(item && item.expiresAt);
    if (expires === null || expires > atNow) return null;
    var archive = Array.isArray(CONTENT.archive) ? CONTENT.archive : [];
    for (var i = 0; i < archive.length; i++) {
      var entry = archive[i];
      if (!entry || entry.sourceKind !== 'weekly-feature') continue;
      if (entry.shelfId !== item.shelfId || entry.title !== item.title) continue;
      if (item.expiresAt && entry.archivedAt && entry.archivedAt !== item.expiresAt) continue;
      return entry;
    }
    return null;
  }

  function normalizeInterestedItems(items, now) {
    var atNow = typeof now === 'number' ? now : Date.now();
    var out = [];
    var seen = {};
    (Array.isArray(items) ? items : []).forEach(function (item) {
      if (!item || !item.id || !item.title) return;
      var next = item;
      if (item.kind === 'weekly-feature' && item.expiresAt) {
        var expires = parseTime(item.expiresAt);
        if (expires !== null && expires <= atNow) {
          var archived = archiveEntryForWeeklyFavorite(item, atNow);
          if (!archived) return;
          next = archiveRecord(archived);
        }
      }
      if (seen[next.id]) return;
      seen[next.id] = true;
      out.push(next);
    });
    return out;
  }

  /* ---- 旧 HOME 由来の href を現在の受け手へ読み替える（pure） ----------------
     HOME は VISUAL_CANONICAL の5 section 構成になり、旧 anchor
     （#by-kind / #archive / #weekly-detour / #weekly-video-title）は消えた。
     端末内に保存済みの record は旧 href を持ったままなので、表示時にだけ
     読み替える。保存形式・保存内容は書き換えない。
       旧 HOME の #by-kind（bare）                       → ./explore.html
       旧 HOME の ?category=X&town=Y#by-kind             → ./explore.html?category=X&town=Y
       旧 HOME の #archive                               → ./explore.html#archive
       旧 HOME の #weekly-detour / #weekly-video-title   → null（現在の受け手が無い）
     explore.html / shelf.html の href はそのまま返す（何度通しても同じ結果）。 */
  function splitHref(href) {
    var hashAt = href.indexOf('#');
    var hash = hashAt < 0 ? '' : href.slice(hashAt);
    var rest = hashAt < 0 ? href : href.slice(0, hashAt);
    var queryAt = rest.indexOf('?');
    return {
      pathname: queryAt < 0 ? rest : rest.slice(0, queryAt),
      query: queryAt < 0 ? '' : rest.slice(queryAt + 1),
      hash: hash
    };
  }

  function isHomePath(pathname) {
    return pathname === './index.html' || pathname === 'index.html' || pathname === '/index.html';
  }

  function queryValue(query, key) {
    var parts = (query || '').split('&');
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf('=');
      if ((eq < 0 ? parts[i] : parts[i].slice(0, eq)) !== key) continue;
      try {
        return decodeURIComponent((eq < 0 ? '' : parts[i].slice(eq + 1)).replace(/\+/g, ' '));
      } catch (_) {
        return '';
      }
    }
    return '';
  }

  /* explore.html の URL。受け手のある引数（category / town）だけを載せる。 */
  function exploreHref(params, hash) {
    var out = [];
    if (params && params.category) out.push('category=' + encodeURIComponent(params.category));
    if (params && params.town) out.push('town=' + encodeURIComponent(params.town));
    return EXPLORE_PAGE + (out.length ? '?' + out.join('&') : '') + (hash || '');
  }

  function migrateLegacyHref(href) {
    if (typeof href !== 'string') return href;
    var parts = splitHref(href);
    if (!isHomePath(parts.pathname)) return href;
    if (parts.hash === '#by-kind') {
      return exploreHref({
        category: queryValue(parts.query, 'category'),
        town: queryValue(parts.query, 'town')
      }, '');
    }
    if (parts.hash === '#archive') return exploreHref(null, '#archive');
    if (LEGACY_HASH_NOTICE[parts.hash]) return null;
    return href;
  }

  /* record の現在の行き先。null は「現在の受け手が無い。非リンクで残す」。 */
  function recordRoute(record) {
    if (!record) return null;
    if (LEGACY_KINDS_WITHOUT_SURFACE[record.kind]) return null;
    if (record.href) return migrateLegacyHref(record.href);
    if (record.shelfId) return './shelf.html?shelf=' + encodeURIComponent(record.shelfId);
    return './index.html';
  }

  function archiveRecord(entry) {
    return {
      id: 'archive:' + entry.id,
      kind: 'archive',
      kindLabel: entry.typeLabel || 'ARCHIVE',
      title: entry.title,
      area: entry.area || '',
      shelfId: entry.shelfId || '',
      categoryIds: (entry.categoryIds || []).slice(),
      href: exploreHref(null, '#archive'),
      archivedAt: entry.archivedAt || ''
    };
  }

  window.V3_GROWTH = {
    generatedWeeklyArchiveEntries: generatedWeeklyArchiveEntries,
    normalizeInterestedItems: normalizeInterestedItems,
    migrateLegacyHref: migrateLegacyHref,
    recordRoute: recordRoute,
    archiveRecord: archiveRecord
  };

  if (!Array.isArray(CONTENT.archive)) CONTENT.archive = [];
  generatedWeeklyArchiveEntries(CONTENT).forEach(function (entry) {
    if (!CONTENT.archive.some(function (current) { return current && current.id === entry.id; })) {
      CONTENT.archive.push(entry);
    }
  });

  if (typeof document === 'undefined') return;

  function injectStyles() {
    if (document.getElementById('growth-improvement-styles')) return;
    var style = document.createElement('style');
    style.id = 'growth-improvement-styles';
    style.textContent = [
      '.growth-interest-button{appearance:none;border:1px solid currentColor;background:transparent;color:inherit;font:inherit;letter-spacing:.04em;padding:.58rem .8rem;cursor:pointer}',
      '.growth-interest-button[aria-pressed="true"]{background:rgba(255,255,255,.08)}',
      '.growth-card-interest{margin-top:.7rem}',
      '.growth-detail-interest{margin-top:.85rem}',
      '.growth-traversal{margin-top:1.3rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,.22)}',
      '.growth-traversal-title{margin:0 0 .55rem;font-size:.78rem;letter-spacing:.1em}',
      '.growth-traversal-links{display:flex;flex-wrap:wrap;gap:.55rem 1rem;margin:0}',
      '.growth-traversal-links a{color:inherit;text-underline-offset:.2em}',
      '.growth-archive{margin-top:clamp(3rem,8vw,7rem)}',
      '.growth-archive-list{display:grid;gap:1rem;margin-top:1rem}',
      '.growth-archive-item{padding:1rem 0;border-top:1px solid rgba(255,255,255,.22)}',
      '.growth-archive-item h3{margin:.25rem 0 .45rem}',
      '.growth-archive-meta,.growth-archive-summary{margin:.25rem 0}',
      '.growth-action-link{display:inline-flex;gap:.45em;align-items:baseline}',
      '.site-menu-favorite-kind{opacity:.68;font-size:.78em}',
      '.site-menu-favorite-link.is-unavailable{opacity:.72}',
      '.site-menu-favorite-unavailable{color:inherit;font-size:.72em;letter-spacing:.06em;white-space:nowrap}',
      '@media (max-width:640px){.growth-interest-button{min-height:44px}.growth-traversal-links{display:grid}}'
    ].join('');
    document.head.appendChild(style);
  }

  function readInterested() {
    try {
      var parsed = JSON.parse(localStorage.getItem(INTEREST_KEY) || '[]');
      if (!Array.isArray(parsed)) parsed = [];
      var normalized = normalizeInterestedItems(parsed);
      if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
        localStorage.setItem(INTEREST_KEY, JSON.stringify(normalized));
      }
      return normalized;
    } catch (_) {
      return [];
    }
  }

  function writeInterested(items) {
    try {
      localStorage.setItem(INTEREST_KEY, JSON.stringify(items));
      return true;
    } catch (_) {
      return false;
    }
  }

  function upsertInterested(record, shouldSave) {
    var items = readInterested().filter(function (item) { return item.id !== record.id; });
    if (shouldSave) items.push(record);
    return writeInterested(items);
  }

  function isInterested(id) {
    return readInterested().some(function (item) { return item.id === id; });
  }

  function renderInterestedMenu() {
    var box = document.getElementById('siteMenuFavorites');
    if (!box) return;
    var items = readInterested();
    box.textContent = '';
    if (!items.length) {
      var empty = document.createElement('p');
      empty.className = 'site-menu-favorites-empty';
      empty.textContent = 'まだありません。';
      box.appendChild(empty);
      return;
    }
    items.forEach(function (item) {
      var route = recordRoute(item);
      var row = document.createElement(route ? 'a' : 'div');
      row.className = 'site-menu-favorite-link' + (route ? '' : ' is-unavailable');
      if (route) row.href = route;
      var town = document.createElement('span');
      town.className = 'site-menu-favorite-town';
      town.textContent = item.area || item.kindLabel || '';
      var title = document.createElement('span');
      title.className = 'site-menu-favorite-title';
      title.textContent = item.title;
      var kind = document.createElement('span');
      kind.className = 'site-menu-favorite-kind';
      kind.textContent = item.archivedAt ? 'ARCHIVE' : (item.kindLabel || '');
      var mark = document.createElement('span');
      if (route) {
        mark.className = 'site-menu-favorite-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = '→';
      } else {
        /* 現在の受け手が無い旧 HOME の record。消さず、無関係な section へも
           振らず、題名と meta を保ったまま非リンクで残す。 */
        mark.className = 'site-menu-favorite-mark site-menu-favorite-unavailable';
        mark.textContent = LEGACY_UNAVAILABLE_LABEL;
      }
      row.appendChild(town);
      row.appendChild(title);
      if (kind.textContent) row.appendChild(kind);
      row.appendChild(mark);
      box.appendChild(row);
    });
  }

  function makeInterestButton(record, extraClass) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'growth-interest-button' + (extraClass ? ' ' + extraClass : '');
    function paint() {
      var on = isInterested(record.id);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.textContent = on ? '気になる済み' : '気になる';
    }
    button.addEventListener('click', function () {
      var next = !isInterested(record.id);
      if (!upsertInterested(record, next)) {
        button.textContent = '保存できません';
        return;
      }
      paint();
      renderInterestedMenu();
    });
    paint();
    return button;
  }

  function shelfById(id) {
    var shelves = Array.isArray(CONTENT.shelves) ? CONTENT.shelves : [];
    for (var i = 0; i < shelves.length; i++) if (shelves[i].id === id) return shelves[i];
    return null;
  }

  function objectById(id) {
    var shelves = Array.isArray(CONTENT.shelves) ? CONTENT.shelves : [];
    for (var i = 0; i < shelves.length; i++) {
      for (var j = 0; j < shelves[i].objects.length; j++) {
        if (shelves[i].objects[j].id === id) return { shelf: shelves[i], object: shelves[i].objects[j] };
      }
    }
    return null;
  }

  function objectRecord(shelf, object) {
    return {
      id: 'object:' + object.id,
      kind: 'object',
      kindLabel: object.typeLabel || '掲載物',
      title: object.objectName || object.reveal || object.hook,
      area: shelf.area || shelf.name || '',
      shelfId: shelf.id,
      categoryIds: (object.categoryIds || []).slice(),
      href: './shelf.html?shelf=' + encodeURIComponent(shelf.id)
    };
  }

  function migrateWeeklyFavorites() {
    var legacy = [];
    try {
      legacy = JSON.parse(localStorage.getItem(LEGACY_WEEKLY_KEY) || '[]');
      if (!Array.isArray(legacy)) legacy = [];
    } catch (_) { legacy = []; }
    if (!legacy.length) return;
    var existing = readInterested();
    legacy.forEach(function (item) {
      var id = 'weekly:' + String(item.id || '').replace(/^weekly:/, '');
      if (existing.some(function (current) { return current.id === id; })) return;
      existing.push({
        id: id,
        kind: 'weekly-feature',
        kindLabel: '今週の特集',
        title: item.title,
        area: item.shelfName || '',
        shelfId: item.shelfId || '',
        href: item.shelfId ? './shelf.html?shelf=' + encodeURIComponent(item.shelfId) : './index.html',
        expiresAt: item.expiresAt || ''
      });
    });
    writeInterested(normalizeInterestedItems(existing));
  }

  function decorateObjectCards() {
    Array.prototype.forEach.call(document.querySelectorAll('.object-card[data-object-id]'), function (card) {
      if (card.querySelector('.growth-card-interest')) return;
      var found = objectById(card.getAttribute('data-object-id'));
      var body = card.querySelector('.card-body');
      if (!found || !body) return;
      body.appendChild(makeInterestButton(objectRecord(found.shelf, found.object), 'growth-card-interest'));
    });

    Array.prototype.forEach.call(document.querySelectorAll('.result-row[data-object-id]'), function (row) {
      if (row.querySelector('.growth-card-interest')) return;
      var found = objectById(row.getAttribute('data-object-id'));
      if (!found) return;
      row.appendChild(makeInterestButton(objectRecord(found.shelf, found.object), 'growth-card-interest'));
    });
  }

  function addTraversal(container, shelf, object) {
    if (!container || container.querySelector('.growth-traversal')) return;
    var categoryIds = object.categoryIds || [];
    if (!categoryIds.length) return;
    var section = document.createElement('section');
    section.className = 'growth-traversal';
    var title = document.createElement('p');
    title.className = 'growth-traversal-title';
    title.textContent = '街 × 種類で、もう少し見る';
    var links = document.createElement('p');
    links.className = 'growth-traversal-links';
    categoryIds.forEach(function (categoryId) {
      var category = (CONTENT.categories || []).filter(function (c) { return c.id === categoryId; })[0];
      if (!category) return;
      /* 旧「種類から見る」（街 × 種類の有限索引）は explore.html が引き継ぐ。
         link が宣言している意図（この街の / ほかの街の）を URL に保つ。 */
      var sameTown = document.createElement('a');
      sameTown.href = exploreHref({ category: category.id, town: shelf.id }, '');
      sameTown.textContent = shelf.area + 'の' + category.name;
      links.appendChild(sameTown);
      var allTowns = document.createElement('a');
      allTowns.href = exploreHref({ category: category.id }, '');
      allTowns.textContent = 'ほかの街の' + category.name;
      links.appendChild(allTowns);
    });
    section.appendChild(title);
    section.appendChild(links);
    container.appendChild(section);
  }

  function decorateDetail() {
    var article = document.querySelector('.detail-article[data-object-id]');
    if (!article || article.querySelector('.growth-detail-interest')) return;
    var found = objectById(article.getAttribute('data-object-id'));
    var copy = article.querySelector('.detail-copy');
    if (!found || !copy) return;
    var actions = copy.querySelector('.detail-actions');
    var button = makeInterestButton(objectRecord(found.shelf, found.object), 'growth-detail-interest');
    if (actions) actions.appendChild(button); else copy.appendChild(button);
    addTraversal(copy, found.shelf, found.object);
  }

  function syncWeeklyFeature() {
    var shelfId = document.body.getAttribute('data-shelf') || '';
    var shelf = shelfById(shelfId);
    var feature = shelf && shelf.weeklyFeature;
    var button = document.querySelector('.weekly-feature-favorite');
    if (!feature || !button) return;
    var record = {
      id: 'weekly:' + shelf.id + ':' + (feature.expiresAt || feature.title),
      kind: 'weekly-feature', kindLabel: '今週の特集', title: feature.title,
      area: shelf.area || shelf.name || '', shelfId: shelf.id,
      href: './shelf.html?shelf=' + encodeURIComponent(shelf.id), expiresAt: feature.expiresAt || ''
    };
    function syncFromLegacyButton() {
      upsertInterested(record, button.getAttribute('aria-pressed') === 'true');
      renderInterestedMenu();
    }
    if (button.getAttribute('aria-pressed') === 'true') upsertInterested(record, true);
    button.addEventListener('click', function () { setTimeout(syncFromLegacyButton, 0); });
  }

  function decorateArchiveRows() {
    Array.prototype.forEach.call(document.querySelectorAll('.archive-result-row[data-archive-id]'), function (row) {
      if (row.querySelector('.growth-card-interest')) return;
      var id = row.getAttribute('data-archive-id');
      var entry = (CONTENT.archive || []).filter(function (item) { return item.id === id; })[0];
      if (entry) row.appendChild(makeInterestButton(archiveRecord(entry), 'growth-card-interest'));
    });
  }

  /* ARCHIVE は explore.html の明示的な host（#archiveHost）にだけ描く。
     Canonical HOME や shelf / suggest / data / credits の #main には触れない
     （時間経過で HOME の構成が変わらないこと）。entries が 0 のあいだは host を
     hidden のまま残し、空の UI を出さない。 */
  function renderTopArchive() {
    var host = document.getElementById('archiveHost');
    if (!host || document.getElementById('archive')) return;
    var entries = Array.isArray(CONTENT.archive) ? CONTENT.archive.slice() : [];
    if (!entries.length) { host.hidden = true; return; }
    entries.sort(function (a, b) { return (parseTime(b.archivedAt) || 0) - (parseTime(a.archivedAt) || 0); });
    var section = document.createElement('section');
    section.id = 'archive';
    section.className = 'foyer growth-archive';
    section.setAttribute('aria-labelledby', 'growthArchiveTitle');
    var eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow'; eyebrow.textContent = 'ARCHIVE';
    var heading = document.createElement('h2');
    heading.id = 'growthArchiveTitle'; heading.className = 'entry-axis'; heading.textContent = 'これまでの特集・棚';
    var list = document.createElement('div');
    list.className = 'growth-archive-list';
    entries.forEach(function (entry) {
      var article = document.createElement('article');
      article.className = 'growth-archive-item';
      var meta = document.createElement('p'); meta.className = 'growth-archive-meta';
      meta.textContent = [entry.area || '', entry.typeLabel || 'ARCHIVE'].filter(Boolean).join(' / ');
      var h3 = document.createElement('h3'); h3.textContent = entry.title;
      var summary = document.createElement('p'); summary.className = 'growth-archive-summary'; summary.textContent = entry.summary || '';
      article.appendChild(meta); article.appendChild(h3); article.appendChild(summary);
      if (entry.actionUrl) {
        var a = document.createElement('a');
        a.className = 'growth-action-link'; a.href = entry.actionUrl; a.target = '_blank';
        a.rel = 'noopener noreferrer'; a.referrerPolicy = 'no-referrer';
        a.textContent = (entry.actionLabel || '公式情報を見る') + ' ↗';
        article.appendChild(a);
      }
      article.appendChild(makeInterestButton(archiveRecord(entry), 'growth-card-interest'));
      list.appendChild(article);
    });
    section.appendChild(eyebrow); section.appendChild(heading); section.appendChild(list);
    host.appendChild(section);
    host.hidden = false;
    /* #archive は runtime で生まれる。#archive 付きで開かれたときは browser の
       fragment scroll が先に走って空振りしていることがあるので、ここで揃える。 */
    if (location.hash === '#archive') section.scrollIntoView();
  }

  /* explore.html#archive で開いたが、まだ Archive が無いとき。空の UI は出さず、
     live region で知らせるだけにする。 */
  function announceArchiveHash() {
    if (location.hash !== '#archive' || document.getElementById('archive')) return;
    if (!document.getElementById('archiveHost')) return;
    var live = document.getElementById('live');
    if (live) live.textContent = 'Archiveは、まだありません。';
  }

  /* Archive が実在するときだけ、MENU に explore.html#archive への導線を足す。 */
  function addArchiveMenuLink() {
    var entries = Array.isArray(CONTENT.archive) ? CONTENT.archive : [];
    if (!entries.length) return;
    var href = exploreHref(null, '#archive');
    Array.prototype.forEach.call(document.querySelectorAll('.site-menu-secondary'), function (nav) {
      if (nav.querySelector('a[href="' + href + '"]')) return;
      var a = document.createElement('a');
      a.className = 'site-menu-secondary-link'; a.href = href;
      a.innerHTML = '<span>Archiveを見る</span><span aria-hidden="true">→</span>';
      nav.appendChild(a);
    });
  }

  /* 旧 HOME の hash を持ったまま Canonical HOME が開かれたとき。
       #by-kind（?category / ?town 付きも） → explore.html（history を増やさない replace）
       #archive                            → explore.html#archive
       #weekly-detour / #weekly-video-title → 現在の受け手が無い。無関係な section へ
                                              飛ばさず hash を外し、live region で知らせる。
     explore.html から HOME へ戻す処理は無いので loop しない。 */
  function settleLegacyHomeHash() {
    if (!document.body || !document.body.classList.contains('home-canonical')) return;
    var hash = location.hash;
    var query = location.search.replace(/^\?/, '');
    if (hash === '#by-kind') {
      location.replace(exploreHref({
        category: queryValue(query, 'category'),
        town: queryValue(query, 'town')
      }, ''));
      return;
    }
    if (hash === '#archive') {
      location.replace(exploreHref(null, '#archive'));
      return;
    }
    if (LEGACY_HASH_NOTICE[hash]) {
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
      var live = document.getElementById('live');
      if (live) live.textContent = LEGACY_HASH_NOTICE[hash];
    }
  }

  function unifyOfficialActions() {
    Array.prototype.forEach.call(document.querySelectorAll('.official-action,.weekly-feature-official,.detour-link,.archive-result-row .result-link'), function (a) {
      a.classList.add('growth-action-link');
      if (!a.querySelector('[aria-hidden="true"]')) {
        var mark = document.createElement('span');
        mark.setAttribute('aria-hidden', 'true'); mark.textContent = '↗';
        a.appendChild(mark);
      }
    });
  }

  function enhance() {
    injectStyles();
    migrateWeeklyFavorites();
    decorateObjectCards();
    decorateArchiveRows();
    renderTopArchive();
    announceArchiveHash();
    addArchiveMenuLink();
    syncWeeklyFeature();
    unifyOfficialActions();
    renderInterestedMenu();

    var detail = document.getElementById('detailContent');
    if (detail && typeof MutationObserver !== 'undefined') {
      new MutationObserver(function () {
        decorateDetail();
        unifyOfficialActions();
      }).observe(detail, { childList: true, subtree: true });
    }

    var categoryResults = document.getElementById('categoryResults');
    var categoryArchiveResults = document.getElementById('categoryArchiveResults');
    [categoryResults, categoryArchiveResults].forEach(function (node) {
      if (!node || typeof MutationObserver === 'undefined') return;
      new MutationObserver(function () {
        decorateObjectCards(); decorateArchiveRows(); unifyOfficialActions();
      }).observe(node, { childList: true, subtree: true });
    });

    var menuButton = document.getElementById('siteMenuButton');
    if (menuButton) menuButton.addEventListener('click', function () { setTimeout(renderInterestedMenu, 0); });
  }

  settleLegacyHomeHash();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance);
  else enhance();
})();

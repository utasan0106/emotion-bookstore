(function () {
  'use strict';

  var CONTENT = window.V3_RELEASE_CONTENT || { archive: [], shelves: [], categories: [] };
  var INTEREST_KEY = 'emotionBookstore.v3.interested.v2';
  var LEGACY_WEEKLY_KEY = 'emotionBookstore.v3.weeklyFavorites.v1';

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

  window.V3_GROWTH = {
    generatedWeeklyArchiveEntries: generatedWeeklyArchiveEntries
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
      '.growth-detour-interest{margin-top:.65rem}',
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
      '@media (max-width:640px){.growth-interest-button{min-height:44px}.growth-traversal-links{display:grid}}'
    ].join('');
    document.head.appendChild(style);
  }

  function readInterested() {
    try {
      var parsed = JSON.parse(localStorage.getItem(INTEREST_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(function (item) { return item && item.id && item.title; }) : [];
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

  function recordHref(record) {
    if (record.href) return record.href;
    if (record.shelfId) return './shelf.html?shelf=' + encodeURIComponent(record.shelfId);
    return './index.html';
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
      var a = document.createElement('a');
      a.className = 'site-menu-favorite-link';
      a.href = recordHref(item);
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
      mark.className = 'site-menu-favorite-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '→';
      a.appendChild(town);
      a.appendChild(title);
      if (kind.textContent) a.appendChild(kind);
      a.appendChild(mark);
      box.appendChild(a);
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

  function archiveRecord(entry) {
    return {
      id: 'archive:' + entry.id,
      kind: 'archive',
      kindLabel: entry.typeLabel || 'ARCHIVE',
      title: entry.title,
      area: entry.area || '',
      shelfId: entry.shelfId || '',
      categoryIds: (entry.categoryIds || []).slice(),
      href: './index.html#archive',
      archivedAt: entry.archivedAt || ''
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
    writeInterested(existing);
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
      var sameTown = document.createElement('a');
      sameTown.href = './index.html?category=' + encodeURIComponent(categoryId) + '&town=' + encodeURIComponent(shelf.id) + '#by-kind';
      sameTown.textContent = shelf.area + 'の' + category.name;
      links.appendChild(sameTown);
      var allTowns = document.createElement('a');
      allTowns.href = './index.html?category=' + encodeURIComponent(categoryId) + '#by-kind';
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

  function decorateDetour() {
    var items = CONTENT.detour && Array.isArray(CONTENT.detour.items) ? CONTENT.detour.items : [];
    Array.prototype.forEach.call(document.querySelectorAll('.detour-item'), function (node, index) {
      if (node.querySelector('.growth-detour-interest') || !items[index]) return;
      var item = items[index];
      node.appendChild(makeInterestButton({
        id: 'detour:' + (CONTENT.detour.weekOf || '') + ':' + item.title,
        kind: 'detour', kindLabel: item.kind || '寄り道', title: item.title,
        area: '今週の寄り道', href: './index.html#weekly-detour'
      }, 'growth-detour-interest'));
    });
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

  function decorateWeeklyVideo() {
    var copy = document.querySelector('.weekly-video-copy');
    var play = document.getElementById('weeklyVideoPlay');
    var title = document.getElementById('weekly-video-title');
    if (!copy || !play || !title || copy.querySelector('.growth-video-interest')) return;
    copy.appendChild(makeInterestButton({
      id: 'weekly-video:' + (play.getAttribute('data-video-id') || title.textContent),
      kind: 'weekly-video', kindLabel: '今週の一本', title: title.textContent,
      area: '今週の、街と気持ち。', href: './index.html#weekly-video-title'
    }, 'growth-video-interest'));
  }

  function decorateArchiveRows() {
    Array.prototype.forEach.call(document.querySelectorAll('.archive-result-row[data-archive-id]'), function (row) {
      if (row.querySelector('.growth-card-interest')) return;
      var id = row.getAttribute('data-archive-id');
      var entry = (CONTENT.archive || []).filter(function (item) { return item.id === id; })[0];
      if (entry) row.appendChild(makeInterestButton(archiveRecord(entry), 'growth-card-interest'));
    });
  }

  function renderTopArchive() {
    var main = document.getElementById('main');
    if (!main || document.getElementById('archive')) return;
    var entries = Array.isArray(CONTENT.archive) ? CONTENT.archive.slice() : [];
    if (!entries.length) return;
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
    var closing = document.querySelector('.foyer-closing');
    main.insertBefore(section, closing || main.lastChild);

    Array.prototype.forEach.call(document.querySelectorAll('.site-menu-secondary'), function (nav) {
      if (nav.querySelector('a[href="./index.html#archive"]')) return;
      var a = document.createElement('a');
      a.className = 'site-menu-secondary-link'; a.href = './index.html#archive';
      a.innerHTML = '<span>Archiveを見る</span><span aria-hidden="true">→</span>';
      nav.appendChild(a);
    });
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
    decorateDetour();
    decorateWeeklyVideo();
    decorateArchiveRows();
    renderTopArchive();
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance);
  else enhance();
})();

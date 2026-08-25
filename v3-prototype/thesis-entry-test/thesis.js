/* =============================================================================
 * V3 PRODUCT THESIS ENTRY TEST 01 — isolated entry-structure comparison
 * -----------------------------------------------------------------------------
 * これは Production implementation ではない。Product Thesis 比較専用の
 * isolated prototype であり、既存 V3 の UI / logic を一切上書きしない。
 *
 * 共有条件（3案で完全に同一）:
 *   - コンテンツ: 現行 Human-approved registry から解決した同一 pool
 *   - Visual: 既存 v3.css / visual-system-v1.css と承認済み実 asset のみ
 *   - Detail surface: 3案で同一の構造・同一の情報
 * 変えるのは「入口構造」だけ。
 *
 * 禁止事項の実装上の担保:
 *   - storage / localStorage / sessionStorage / IndexedDB を一切使わない
 *     （store.js を読み込まない。気になるは memory-only の in-page state）
 *   - analytics.js を読み込まない（GA4 差分 0）
 *   - fetch / XHR / beacon / iframe / 外部 host を持たない
 *   - recommendation / personalization / random / ranking を持たない
 *     （並び順は registry の SHELF_IDS 固定順のみ）
 * ========================================================================== */
(function (global) {
  'use strict';

  var D = global.V3_DATA;
  var REAL = global.V3_REAL_EXPERIENCE_REGISTRY;
  var MATCHING = global.V3_CULTURAL_MATCHING;
  var AD = global.V3_ACTION_DESTINATION;

  var view = document.getElementById('view');
  var live = document.getElementById('live');

  /* ------------------------------------------------------------ DOM builder */
  /* app.js と同一方式。innerHTML は使わない。 */
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
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  function icon(name) {
    var paths = {
      heart: 'M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20Z',
      back: 'M15 5l-7 7 7 7'
    };
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', paths[name]);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.4');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  function announce(message) {
    if (!live) return;
    live.textContent = '';
    global.setTimeout(function () { live.textContent = message; }, 30);
  }

  /* ------------------------------------------------- 現行 Product copy（複写） */
  /* Control を有利／不利にしないため、現行 V3 の copy を改稿せず複写する。
     ここは prototype 専用の複写であり、Product 側の定義は変更していない。 */
  var SHELF_LENS = {
    hajimu: 'この棚では、歩き出す、手を伸ばす、次を探す。そんなふうに、身体や視線が前へ動く場面に注目しています。',
    atatamaru: 'この棚では、世話をする、声をかける、何かを手渡す。そんな小さなやりとりから、人とのつながりが育っていく場面に注目しています。',
    hikareru: 'この棚では、形、細部、素材、音、動き。理由を言葉にする前に、まず目や耳が引かれるところに注目しています。',
    shizumu: 'この棚では、失われたもの、重ねられた時間、静かな場所。すぐに答えを出さず、その重さのそばに留まれるものに注目しています。',
    zawatsuku: 'この棚では、いつもの風景や習慣に、見慣れない一面が現れる。そんな、ものの見方が少し揺れる場面に注目しています。',
    butsukaru: 'この棚では、異なる考え方、素材、方法が出会う。そこで生まれる摩擦から、それぞれの違いが見えてくる場面に注目しています。',
    miwohiku: 'この棚では、少し離れる、いったん手を止める、関わらない。距離を取ることで初めて見えるものに注目しています。',
    mada: 'この棚では、形や意味が一つに決まらず、いくつもの見方が残るものに注目しています。まだ言葉にできなくても、そのまま見比べられる棚です。'
  };
  var TILE_DESCRIPTION = {
    hajimu: '軽やかにひらく',
    atatamaru: 'やさしい光に触れる',
    hikareru: '細部に目を留める',
    shizumu: '静かな重さを見つめる',
    zawatsuku: '揺れる気配をたどる',
    butsukaru: '強い輪郭が交わる',
    miwohiku: '少し離れた景色を見る',
    mada: 'まだ言葉になる前'
  };

  /* 全棚一覧と同じ承認済み category 語彙（Shelf Abundance と同一 mapping）。 */
  var CATEGORY_GROUPS = [
    { id: 'book', label: '本', types: ['Book'] },
    { id: 'film', label: '映画', types: ['Film'] },
    { id: 'music', label: '音楽', types: ['Music'] },
    { id: 'exhibition', label: '展示', types: ['Exhibition'] },
    { id: 'place', label: '場所', types: ['Place', 'Dining'] },
    { id: 'taiken', label: '体験', types: ['Activity', 'Travel'] },
    { id: 'event', label: 'イベント', types: ['Event'] }
  ];

  function categoryGroup(item) {
    var type = item.truth.type;
    return CATEGORY_GROUPS.filter(function (group) {
      return group.types.indexOf(type) !== -1;
    })[0] || null;
  }

  /* ------------------------------------------------------------ content pool */
  /* 3案が共有する唯一の pool。並びは registry の SHELF_IDS 固定順。
     random / ranking / personalization は存在しない。 */
  function buildPool() {
    var items = [];
    if (!REAL || !MATCHING || !AD) return items;
    REAL.SHELF_IDS.forEach(function (shelfId) {
      var collection = REAL.collectionForEmotion(shelfId);
      if (!collection || collection.state !== 'ok') return;
      collection.ids.forEach(function (id) {
        var record = REAL.byId(id);
        if (!record) return;
        var truth = MATCHING.resolvePracticalTruth(record);
        var actions = AD.actionsForExperience(record);
        if (!truth || !actions.length || actions[0].kind !== 'primary') return;
        items.push({
          id: record.id,
          record: record,
          truth: truth,
          shelfId: shelfId,
          word: D.emotionById(shelfId),
          primary: actions[0],
          summary: record.placeDetail ? record.placeDetail.officialSummary : null,
          why: (record.placeDetail && record.placeDetail.placementReason) || record.reason
        });
      });
    });
    return items;
  }

  var POOL = buildPool();

  function itemById(id) {
    return POOL.filter(function (item) { return item.id === id; })[0] || null;
  }

  function itemsForShelf(shelfId) {
    return POOL.filter(function (item) { return item.shelfId === shelfId; });
  }

  /* --------------------------------------------------------------- UI state */
  /* すべて memory-only。reload で消える。端末には何も書かない。 */
  var state = {
    variant: 'a',
    screen: 'entry',
    selectedId: null,
    shelfId: null,
    oneIndex: 0,
    peeked: false,
    marked: {},
    category: 'all'
  };

  function isMarked(id) { return state.marked[id] === true; }

  function toggleMark(id) {
    if (isMarked(id)) delete state.marked[id];
    else state.marked[id] = true;
    announce(isMarked(id) ? '気になるに入れました。' : '気になるから外しました。');
    render();
  }

  function go(screen) {
    state.screen = screen;
    render();
  }

  /* ---------------------------------------------------------- shared pieces */

  function visual(item, context) {
    var asset = item.record.visualAsset;
    if (!asset || !asset.localAssetPath) return null;
    var isFallback = asset.status === 'brand_fallback_ready';
    return h('figure', { class: 'thesis-visual thesis-visual--' + context }, [
      h('img', {
        class: 'thesis-visual-image',
        src: asset.localAssetPath,
        alt: asset.altTextJa,
        loading: context === 'grid' ? 'lazy' : 'eager',
        decoding: 'async'
      }),
      isFallback ? h('figcaption', {
        class: 'thesis-visual-note', text: '感情書店のカテゴリ図版'
      }) : null
    ]);
  }

  function markButton(item, variantClass) {
    return h('button', {
      class: 'btn btn-line thesis-mark ' + (variantClass || ''),
      type: 'button',
      'aria-pressed': isMarked(item.id) ? 'true' : 'false',
      'data-mark-id': item.id,
      onclick: function () { toggleMark(item.id); }
    }, [icon('heart'), h('span', { text: isMarked(item.id) ? '気になる済み' : '気になる' })]);
  }

  function openDetail(item, fromScreen) {
    state.selectedId = item.id;
    state.shelfId = item.shelfId;
    state.detailFrom = fromScreen;
    go('detail');
  }

  function detailButton(item, fromScreen, className) {
    return h('button', {
      class: 'btn btn-primary thesis-detail-entry ' + (className || ''),
      type: 'button',
      'data-detail-id': item.id,
      onclick: function () { openDetail(item, fromScreen); }
    }, [h('span', { text: 'もっと知る' })]);
  }

  /* ------------------------------------------------------- shared: Detail 面 */
  /* 3案で完全に同一。ここが「感情との Editorial relation」を初めて示す面。 */
  function surfaceDetail() {
    var item = itemById(state.selectedId);
    if (!item) return surfaceEntry();
    var back = state.detailFrom || 'entry';
    return h('section', {
      class: 'surface thesis-surface thesis-detail', 'data-thesis-surface': 'detail'
    }, [
      h('button', {
        class: 'btn btn-text thesis-back', type: 'button',
        onclick: function () { go(back); }
      }, [icon('back'), h('span', { text: '戻る' })]),
      h('div', { class: 'thesis-detail-hero' }, [
        h('div', { class: 'thesis-detail-visual' }, [visual(item, 'detail')]),
        h('div', { class: 'thesis-detail-summary' }, [
          h('p', { class: 'thesis-type-label', text: item.truth.typeLabel }),
          h('h1', {
            class: 'display display-sm thesis-detail-title',
            tabindex: '-1', id: 'surface-title', text: item.record.title
          }),
          item.summary ? h('p', { class: 'trust-cue trust-cue-official', text: '公式情報より' }) : null,
          item.summary ? h('p', { class: 'body-lg thesis-detail-summary-text', text: item.summary }) : null
        ])
      ]),
      h('section', { class: 'thesis-detail-block thesis-truth' }, [
        h('h2', { class: 'section-title', text: '訪れる前にわかること' }),
        h('dl', { class: 'thesis-truth-list' }, item.truth.facts.map(function (fact) {
          return h('div', {}, [
            h('dt', { text: fact.label }),
            h('dd', { text: fact.value })
          ]);
        }))
      ]),
      /* Editorial relation — 感情棚との関係を示す唯一の場所（B / C ではここが初出）。 */
      h('section', { class: 'thesis-detail-block thesis-relation' }, [
        h('p', {
          class: 'thesis-relation-shelf',
          text: '感情書店では「' + item.word.label + '」の棚に置いています'
        }),
        h('h2', { class: 'section-title', text: 'なぜ、この棚に？' }),
        h('p', { class: 'body-lg thesis-relation-why', text: item.why })
      ]),
      h('div', { class: 'actions thesis-detail-actions' }, [
        h('button', {
          class: 'btn btn-primary thesis-official-action', type: 'button',
          'data-action-destination': item.primary.kind,
          onclick: function () { AD.openAction(item.primary, item.id); }
        }, [
          h('span', { text: item.primary.label }),
          h('span', { 'aria-hidden': 'true', text: '↗' })
        ]),
        markButton(item, 'thesis-detail-mark'),
        h('button', {
          class: 'btn btn-line thesis-same-shelf', type: 'button',
          onclick: function () { state.shelfId = item.shelfId; go('shelf'); }
        }, [h('span', { text: '「' + item.word.label + '」の棚を見る' })])
      ])
    ]);
  }

  /* -------------------------------------------------------- shared: 棚の一覧面 */
  function surfaceShelf() {
    var shelfId = state.shelfId || REAL.SHELF_IDS[0];
    var word = D.emotionById(shelfId);
    var items = itemsForShelf(shelfId);
    var backScreen = state.variant === 'a' ? 'shelves' : 'entry';
    return h('section', {
      class: 'surface thesis-surface thesis-shelf', 'data-thesis-surface': 'shelf'
    }, [
      h('button', {
        class: 'btn btn-text thesis-back', type: 'button',
        onclick: function () { go(backScreen); }
      }, [icon('back'), h('span', { text: '戻る' })]),
      h('p', { class: 'eyebrow', text: 'のぞいている感情の棚' }),
      h('h1', {
        class: 'display display-sm', tabindex: '-1', id: 'surface-title',
        text: word ? word.label : ''
      }),
      h('p', { class: 'body-lg thesis-shelf-lens', text: SHELF_LENS[shelfId] || '' }),
      h('p', {
        class: 'note thesis-shelf-count',
        text: 'この棚から案内できる寄り道は、' + items.length + 'つです。'
      }),
      h('div', { class: 'thesis-shelf-items' }, items.map(function (item) {
        return h('article', { class: 'thesis-card', 'data-item-id': item.id }, [
          visual(item, 'card'),
          h('div', { class: 'thesis-card-body' }, [
            h('p', { class: 'thesis-type-label', text: item.truth.typeLabel }),
            h('h2', { class: 'thesis-card-title', text: item.record.title }),
            item.summary ? h('p', { class: 'thesis-card-summary', text: item.summary }) : null,
            h('div', { class: 'thesis-card-actions' }, [
              detailButton(item, 'shelf', 'thesis-card-detail'),
              markButton(item, 'thesis-card-mark')
            ])
          ])
        ]);
      }))
    ]);
  }

  /* =========================================================== VARIANT A ==== */
  /* CONTROL — 現行 V3 の「感情から入る」入口をそのまま再現する。
     Home → 感情の棚 → 棚の説明 → 文化物 → Detail の順序も現行どおり。 */

  function surfaceControlHome() {
    return h('section', {
      class: 'surface thesis-surface entrance thesis-control-home',
      'data-thesis-surface': 'a-home'
    }, [
      h('div', { class: 'entrance-hero' }, [
        h('picture', { class: 'hero' }, [
          h('img', {
            class: 'hero-img',
            src: './assets/canonical-m01-w01/w01_hero.webp',
            alt: '本の頁のあいだに開けた青空と道を歩く人の水彩画',
            width: '941', height: '680', loading: 'eager', decoding: 'async'
          })
        ]),
        h('div', { class: 'entrance-copy' }, [
          h('h1', { class: 'display', tabindex: '-1', id: 'surface-title' }, [
            h('span', { class: 'frontstage-headline-line', text: '感情の先に、' }),
            h('span', { class: 'frontstage-headline-line', text: '世界がある' })
          ]),
          h('p', { class: 'lede' }, [
            h('span', { class: 'lede-line', text: '本、映画、音楽、体験。' }),
            h('span', { class: 'lede-line', text: '8つの感情から新たな出会いを。' })
          ]),
          h('p', {
            class: 'entrance-route-note',
            text: '感情から、次に触れるものを見つけられます。'
          }),
          h('div', { class: 'entrance-routes' }, [
            h('button', {
              class: 'btn btn-primary cta-primary thesis-a-start', type: 'button',
              onclick: function () { go('shelves'); }
            }, [h('span', { class: 'cta-main', text: 'はじめる' })])
          ]),
          h('p', { class: 'entrance-culture-note' }, [
            h('span', { class: 'entrance-culture-item', text: '本' }),
            h('span', { class: 'entrance-culture-item', text: '映画' }),
            h('span', { class: 'entrance-culture-item', text: '音楽' }),
            h('span', { class: 'entrance-culture-item', text: '展示・場所・体験' })
          ])
        ])
      ])
    ]);
  }

  function surfaceControlShelves() {
    return h('section', {
      class: 'surface thesis-surface thesis-control-shelves',
      'data-thesis-surface': 'a-shelves'
    }, [
      h('button', {
        class: 'btn btn-text thesis-back', type: 'button',
        onclick: function () { go('entry'); }
      }, [icon('back'), h('span', { text: '戻る' })]),
      h('div', { class: 'emotion-intro' }, [
        h('div', { class: 'emotion-intro-copy' }, [
          h('h1', { class: 'emotion-heading', tabindex: '-1', id: 'surface-title' }, [
            h('span', { class: 'emotion-copy-line', text: 'どんな感情の棚を、' }),
            h('span', { class: 'emotion-copy-line', text: 'のぞいてみますか？' })
          ]),
          h('p', { class: 'emotion-support' }, [
            h('span', { class: 'emotion-copy-line', text: '今の気持ちと同じでなくて大丈夫です。少し気になる棚を、ひとつ。' })
          ])
        ])
      ]),
      h('ul', { class: 'emotion-grid', 'aria-label': '感情の棚をひとつ選ぶ' },
        D.EMOTIONS.map(function (word) {
          return h('li', {}, [
            h('button', {
              class: 'emotion-card', type: 'button',
              'data-emotion-label': word.label,
              'aria-label': word.label + '。' + word.description,
              onclick: function () { state.shelfId = word.id; go('shelf'); }
            }, [
              h('span', { class: 'emotion-card-media', 'aria-hidden': 'true' }, [
                h('img', {
                  class: 'emotion-card-image', alt: '',
                  src: './assets/visual-system-v1/runtime_webp/emotion/emotion_' + word.id + '.webp',
                  width: '960', height: '720', loading: 'lazy', decoding: 'async'
                })
              ]),
              h('span', { class: 'emotion-card-copy' }, [
                h('strong', { class: 'emotion-card-label', text: word.label }),
                h('span', {
                  class: 'emotion-card-description',
                  text: TILE_DESCRIPTION[word.id] || word.description.split('、')[0]
                })
              ])
            ])
          ]);
        }))
    ]);
  }

  /* =========================================================== VARIANT B ==== */
  /* ITEM-FIRST DISCOVERY — First View は実在コンテンツ。感情は主役にしない。
     感情との関係は Detail に入ってから初めて提示する。 */

  function surfaceItemFirst() {
    var groups = CATEGORY_GROUPS.filter(function (group) {
      return POOL.some(function (item) { return categoryGroup(item) === group; });
    });
    var visible = POOL.filter(function (item) {
      if (state.category === 'all') return true;
      var group = categoryGroup(item);
      return Boolean(group && group.id === state.category);
    });

    function chip(id, label) {
      var active = state.category === id;
      return h('button', {
        class: 'thesis-chip' + (active ? ' is-active' : ''),
        type: 'button',
        'aria-pressed': active ? 'true' : 'false',
        'data-chip': id,
        onclick: function () { state.category = id; render(); }
      }, [h('span', { text: label })]);
    }

    return h('section', {
      class: 'surface thesis-surface thesis-item-first',
      'data-thesis-surface': 'b-browse'
    }, [
      h('div', { class: 'thesis-b-intro' }, [
        h('h1', {
          class: 'display display-sm', tabindex: '-1', id: 'surface-title',
          text: '本、映画、音楽、体験。'
        }),
        h('p', { class: 'body-lg thesis-b-lede', text: '気になるものを見つける場所です。' })
      ]),
      h('div', { class: 'thesis-chip-row', role: 'group', 'aria-label': '種類で絞り込む' },
        [chip('all', 'すべて')].concat(groups.map(function (group) {
          return chip(group.id, group.label);
        }))),
      h('div', {
        class: 'thesis-grid', 'data-item-count': String(visible.length)
      }, visible.map(function (item) {
        return h('article', { class: 'thesis-card', 'data-item-id': item.id }, [
          visual(item, 'grid'),
          h('div', { class: 'thesis-card-body' }, [
            h('p', { class: 'thesis-type-label', text: item.truth.typeLabel }),
            h('h2', { class: 'thesis-card-title', text: item.record.title }),
            item.summary ? h('p', { class: 'thesis-card-summary', text: item.summary }) : null,
            h('div', { class: 'thesis-card-actions' }, [
              detailButton(item, 'entry', 'thesis-card-detail'),
              markButton(item, 'thesis-card-mark')
            ])
          ])
        ]);
      }))
    ]);
  }

  /* =========================================================== VARIANT C ==== */
  /* ONE-ITEM — 返答単位を「一個」にする。First View に一覧を出さない。
     「次を見る」は POOL の固定順のみ。random / engagement 最適化は無い。 */

  function surfaceOneItem() {
    var item = POOL[state.oneIndex];
    if (!item) return h('section', { class: 'surface thesis-surface' }, []);
    var nodes = [
      h('p', { class: 'eyebrow thesis-c-eyebrow', text: '今日は、これ。' }),
      h('div', { class: 'thesis-c-stage' }, [visual(item, 'one')]),
      h('p', { class: 'thesis-type-label', text: item.truth.typeLabel }),
      h('h1', {
        class: 'display display-sm thesis-c-title',
        tabindex: '-1', id: 'surface-title', text: item.record.title
      })
    ];
    /* 「何それ？」が発生する一文 = 公式情報にもとづく既存の一行要約。 */
    if (item.summary) {
      nodes.push(h('p', { class: 'body-lg thesis-c-hook', text: item.summary }));
    }
    /* 少し触れる = 承認済み Practical Truth をその場で開くだけ。外部通信はしない。 */
    if (state.peeked) {
      nodes.push(h('dl', { class: 'thesis-truth-list thesis-c-peek' },
        item.truth.facts.slice(0, 3).map(function (fact) {
          return h('div', {}, [
            h('dt', { text: fact.label }),
            h('dd', { text: fact.value })
          ]);
        })));
    } else {
      nodes.push(h('div', { class: 'actions thesis-c-peek-action' }, [
        h('button', {
          class: 'btn btn-line thesis-c-peek-open', type: 'button',
          onclick: function () { state.peeked = true; render(); }
        }, [h('span', { text: '30秒だけ見る' })])
      ]));
    }
    nodes.push(h('div', { class: 'actions thesis-c-actions' }, [
      detailButton(item, 'entry', 'thesis-c-detail'),
      markButton(item, 'thesis-c-mark'),
      h('button', {
        class: 'btn btn-text thesis-c-next', type: 'button',
        onclick: function () {
          state.oneIndex = (state.oneIndex + 1) % POOL.length;
          state.peeked = false;
          render();
          announce('次の一件を表示しました。');
        }
      }, [h('span', { text: '次を見る' })])
    ]));
    nodes.push(h('p', {
      class: 'note thesis-c-position',
      text: (state.oneIndex + 1) + ' / ' + POOL.length + '（固定順）'
    }));
    return h('section', {
      class: 'surface thesis-surface thesis-one-item',
      'data-thesis-surface': 'c-one'
    }, nodes);
  }

  /* ------------------------------------------------------------- variant map */

  var VARIANTS = {
    a: {
      id: 'a', label: 'A｜CONTROL', note: '感情から入る（現行V3の入口を再現）',
      entry: surfaceControlHome
    },
    b: {
      id: 'b', label: 'B｜ITEM-FIRST', note: '実物から入る（感情はDetail以降）',
      entry: surfaceItemFirst
    },
    c: {
      id: 'c', label: 'C｜ONE-ITEM', note: '一個だけ差し出す（次を見るは固定順）',
      entry: surfaceOneItem
    }
  };

  function surfaceEntry() {
    return (VARIANTS[state.variant] || VARIANTS.a).entry();
  }

  var SCREENS = {
    entry: surfaceEntry,
    shelves: surfaceControlShelves,
    shelf: surfaceShelf,
    detail: surfaceDetail
  };

  function setVariant(variantId) {
    if (!VARIANTS[variantId]) return;
    state.variant = variantId;
    state.screen = 'entry';
    state.selectedId = null;
    state.shelfId = null;
    state.oneIndex = 0;
    state.peeked = false;
    state.category = 'all';
    render();
    announce(VARIANTS[variantId].label + 'を表示しました。');
  }

  function renderSwitcher() {
    var bar = document.getElementById('thesisBar');
    if (!bar) return;
    bar.textContent = '';
    bar.appendChild(h('p', { class: 'thesis-bar-label' }, [
      h('span', { class: 'thesis-bar-tag', text: '内部検証用' }),
      h('span', { text: 'PRODUCT THESIS ENTRY TEST 01' })
    ]));
    bar.appendChild(h('div', { class: 'thesis-bar-buttons' },
      ['a', 'b', 'c'].map(function (id) {
        var active = state.variant === id;
        return h('button', {
          class: 'thesis-bar-button' + (active ? ' is-active' : ''),
          type: 'button',
          'aria-pressed': active ? 'true' : 'false',
          'data-variant': id,
          onclick: function () { setVariant(id); }
        }, [h('span', { text: VARIANTS[id].label })]);
      })));
    bar.appendChild(h('p', {
      class: 'thesis-bar-note', text: VARIANTS[state.variant].note
    }));
  }

  function render() {
    renderSwitcher();
    var build = SCREENS[state.screen] || surfaceEntry;
    var next = build();
    view.textContent = '';
    view.appendChild(next);
    document.body.setAttribute('data-thesis-variant', state.variant);
    document.body.setAttribute('data-thesis-screen', state.screen);
    var title = document.getElementById('surface-title');
    if (title) title.focus();
  }

  function initialVariant() {
    var match = /[?&]v=([abc])(?:&|$)/.exec(global.location.search || '');
    return match ? match[1] : 'a';
  }

  state.variant = initialVariant();
  render();

  /* 検証用の read-only 参照。書き込み API は公開しない。 */
  global.__V3_THESIS__ = {
    poolIds: POOL.map(function (item) { return item.id; }),
    variants: Object.keys(VARIANTS)
  };
})(window);

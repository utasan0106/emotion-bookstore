/* =============================================================================
 * V3 Isolated UX Prototype — surfaces and state transitions
 * -----------------------------------------------------------------------------
 * 9 Surface 固定。Modal / bottom sheet 以外の第 10 画面は作らない。
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

  var state = STORE.emptyState();
  var interested = STORE.emptyInterested();
  var interestPending = {};
  var screen = 'entrance';
  var view, live, stepbar;

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

  function persist() { STORE.save(state); }

  function go(next) {
    screen = next;
    render();
  }

  function metaLine(experience) {
    return [experience.type, experience.duration, experience.price].filter(function (value) {
      return Boolean(value);
    }).join(' ／ ');
  }

  function approvedRealDeck(emotionId) {
    return REAL ? REAL.deckForEmotion(emotionId) : null;
  }

  function activeDeckCount() {
    return state.deck && state.deck.ids ? state.deck.ids.length : 0;
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

  /* Existing Discovery semantics stay authoritative. For approved real
     Experiences, durable save/remove completes before the decision/UI moves. */
  function decideWithInterest(id, value, onSuccess) {
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
          ? '3つすべてを「今回は違う」としました。'
          : '3つの体験を見終えました。');
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
    switch (screen) {
      case 'emotion':
        return { back: 'entrance', title: '感情を選ぶ', count: '1 / 3', progress: 1 / 3, step: 'STEP 1' };
      case 'understanding':
        return { back: 'emotion' };
      case 'discovery':
        return {
          back: deck && deck.mode === 'personalized' ? 'entrance' : 'understanding',
          title: deck && deck.mode === 'personalized' ? '次の3つ' : (word ? word.label : ''),
          count: deck ? (deck.index + 1) + ' / ' + deck.ids.length : '',
          progress: deck ? (deck.index + 1) / deck.ids.length : 0,
          step: 'STEP 2 / 4',
          stepTitle: '気になる3つの体験から選ぶ',
          hint: '3つのうち、気になるものを1つ選んでください'
        };
      case 'review':
      case 'none':
        return {
          back: 'discovery', title: '3つ見ました', count: '3 / 3', progress: 1,
          step: 'STEP 2 / 4', stepTitle: '気になる3つの体験から選ぶ',
          hint: '3つのうち、気になるものを1つ選んでください'
        };
      case 'detail':
        return { back: 'review' };
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
    if (!config) return;

    var back = h('button', {
      class: 'stepbar-back', type: 'button',
      'aria-label': config.backLabel || '前の画面へ戻る',
      onclick: function () { go(config.back); }
    }, [icon('back'), config.backLabel ? h('span', { text: config.backLabel }) : null]);

    var center = h('p', { class: 'stepbar-title' }, [
      config.step ? h('span', { class: 'stepbar-step', text: config.step + (config.stepTitle ? '　' + config.stepTitle : '') }) : null,
      config.title ? h('span', { text: config.title }) : null
    ]);

    var right = h('p', { class: 'stepbar-count', text: config.count || '' });

    var nodes = [h('div', { class: 'stepbar-row' }, [back, center, right])];
    if (config.progress) {
      nodes.push(h('div', { class: 'stepbar-progress' }, [
        h('span', { style: 'width:' + Math.round(config.progress * 100) + '%' })
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
        h('span', { class: 'lede-line', text: 'いまの気持ちに近い言葉を選ぶと、' }),
        h('span', { class: 'lede-line', text: 'あなたにそっと寄り添う体験が見つかります。' }),
        h('span', { class: 'lede-line', text: 'そして、実際に触れたあとに残ったものを、' }),
        h('span', { class: 'lede-line', text: '自分だけの記録として残せます。' })
      ]),
      h('button', {
        class: 'btn btn-primary cta-primary', type: 'button',
        onclick: function () { go('emotion'); }
      }, [
        h('span', { class: 'cta-main', text: 'はじめる' }),
        h('span', { class: 'cta-sub', text: '感情の言葉を選ぶ' })
      ])
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
      mobileTitle: '感情を選ぶ', mobileNote: ['いまの気持ちを', '言葉にする'],
      desktopTitle: '感情を選ぶ', desktopNote: ['いまの気持ちを', '言葉にする']
    },
    {
      asset: '02',
      mobileTitle: '体験に出会う', mobileNote: ['3つの候補を見る'],
      desktopTitle: '体験に出会う', desktopNote: ['感情に近い3つの候補から、', '気になるものを見つける']
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
      heading: '登録不要・完全に非公開',
      support: 'あなたの記録はあなただけのものです。'
    },
    {
      asset: 'no_ai',
      heading: 'AIは使用しません',
      support: '本文をAIが読むことはありません。'
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
          h('span', { text: '登録不要・入力内容はこの端末を基本に扱います' })
        ]),
        h('div', { class: 'trust-desktop' }, items)
      ]);
  }

  /* W01 MENU destination copy. PRODUCTION_COPY_REVIEW_REQUIRED */
  var EXPERIENCE_FLOW_ITEMS = [
    {
      title: '感情の言葉をひとつ選ぶ',
      copy: '正解はありません。いまの自分に近い言葉を、出会いの入口にします。'
    },
    {
      title: '3つの体験を見る',
      copy: '本、映画、場所などから、少しずつ角度の違う3つの体験を置きます。'
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
      answer: '登録しなくても利用できます。V3 Beta0の基本体験は、アカウントを作らずに使える設計です。'
    },
    {
      question: '感情の言葉は診断ですか？',
      answer: 'いいえ。感情の言葉は出会いの入口です。正解を決めたり、あなたの状態を判定したりするものではありません。'
    },
    {
      question: '選んだ言葉はあとから変えられますか？',
      answer: 'はい。あとから選び直せます。「まだ名前がない」も、ひとつの正式な選択肢です。'
    },
    {
      question: '自分の記録は公開されますか？',
      answer: '自分の記録は公開を前提に扱いません。現在のBeta0では、この端末で扱うことを基本にしています。'
    },
    {
      question: 'AIが自分の本文を読みますか？',
      answer: '現在のBeta0では、privateな本文を外部AIへ送る設計にはしません。'
    },
    {
      question: '位置情報は自動で使われますか？',
      answer: '現在のBeta0では、自動で位置情報を取得しません。将来利用する場合も、本人が明示的に選べることを前提にします。'
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
      h('div', { class: 'w01-faq-list' }, W01_FAQS.map(function (item) {
        return h('article', { class: 'w01-faq-item' }, [
          h('h3', { text: item.question }),
          h('p', { text: item.answer })
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

      /* selected stateをpaintしてから既存Understanding routeへ進む。 */
      global.setTimeout(function () {
        if (token === transitionToken && screen === 'emotion' && state.emotion === word.id) {
          go('understanding');
        }
      }, 120);
    }

    function descriptionPhraseLines(description) {
      var phrases = description.split('、');
      return phrases.map(function (phrase, index) {
        return h('span', {
          class: 'emotion-description-phrase',
          text: phrase + (index < phrases.length - 1 ? '、' : '')
        });
      });
    }

    var list = h('ul', {
      class: 'emotion-grid', 'aria-label': '感情の言葉をひとつ選ぶ'
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
        h('span', { class: 'emotion-copy-line', text: 'いま、' }),
        h('span', { class: 'emotion-copy-line', text: 'どの言葉の近くにいますか？' })
      ]),
      h('span', { class: 'emotion-heading-desktop emotion-desktop-only' }, [
        h('span', { class: 'emotion-copy-line', text: 'いまの気持ちに、' }),
        h('span', { class: 'emotion-copy-line', text: 'いちばん近い言葉を選ぶ' })
      ])
    ]);

    var support = h('p', { class: 'emotion-support' }, [
      h('span', { class: 'emotion-copy-line', text: '正解はありません。' }),
      h('span', {
        class: 'emotion-copy-line emotion-support-choice',
        'aria-label': 'いまのあなたに、いちばんしっくりくる言葉をひとつ選んでください。'
      }, [
        h('span', { class: 'emotion-support-choice-line', text: 'いまのあなたに、いちばんしっくりくる言葉を' }),
        h('span', { class: 'emotion-support-choice-line', text: 'ひとつ選んでください。' })
      ]),
      h('span', {
        class: 'emotion-copy-line emotion-desktop-only',
        text: 'あとから選び直すこともできます。'
      })
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
      class: 'emotion-grid-question emotion-desktop-only', text: 'どの言葉の近くにいますか？'
    });

    var guidance = h('div', { class: 'emotion-guidance' }, [
      h('img', {
        class: 'emotion-guidance-leaf', alt: '',
        src: './assets/canonical-m02-w02/guidance_leaf.png', width: '70', height: '72'
      }),
      h('p', { class: 'emotion-guidance-copy' }, [
        h('span', {
          class: 'emotion-copy-line emotion-guidance-choice',
          'aria-label': 'どの言葉もしっくりこないときは、「まだ名前がない」を選んでも大丈夫です。'
        }, [
          h('span', { class: 'emotion-guidance-choice-line', text: 'どの言葉もしっくりこないときは、' }),
          h('span', { class: 'emotion-guidance-choice-line', text: '「まだ名前がない」を選んでも大丈夫です。' })
        ]),
        h('span', {
          class: 'emotion-copy-line emotion-guidance-trust-copy emotion-desktop-only',
          text: '選んだ言葉は、あなただけの手がかりとして使われます。他の人に見られることはありません。'
        })
      ])
    ]);

    /* Canonical exact Trust copy。PRODUCTION_COPY_REVIEW_REQUIRED */
    var trust = h('div', { class: 'emotion-selection-trust' }, [
      h('span', { class: 'emotion-trust-icon', 'aria-hidden': 'true' }, [icon('lock')]),
      h('p', { class: 'emotion-trust-copy' }, [
        h('span', {
          class: 'emotion-copy-line emotion-trust-primary',
          'aria-label': '選んだ言葉は、あなただけの手がかりとして使われます。'
        }, [
          h('span', { class: 'emotion-trust-primary-line', text: '選んだ言葉は、' }),
          h('span', { class: 'emotion-trust-primary-line', text: 'あなただけの手がかりとして使われます。' })
        ]),
        h('span', { class: 'emotion-copy-line', text: '他の人に見られることはありません。' })
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
    var copy = D.UNDERSTANDING[state.emotion];
    var realDeck = approvedRealDeck(state.emotion);
    var deckCount = realDeck ? realDeck.ids.length : 3;
    var nodes = [];

    nodes.push(h('p', { class: 'eyebrow', text: '選んだ言葉' }));
    nodes.push(h('h1', { class: 'display display-sm', tabindex: '-1', id: 'surface-title', text: word ? word.label : '' }));
    if (copy) {
      nodes.push(h('p', { class: 'body-lg', text: copy.body }));
      nodes.push(h('p', { class: 'note', text: copy.note }));
    }
    nodes.push(h('hr', { class: 'rule' }));
    nodes.push(h('p', {
      class: 'body-lg',
      text: 'この言葉の隣に、' + deckCount + 'つの体験を置いています。'
    }));
    nodes.push(h('div', { class: 'actions' }, [
      h('button', {
        class: 'btn btn-primary', type: 'button',
        onclick: function () {
          if (realDeck) startDeck('real-approved', realDeck.ids);
          else startDeck('base', P.baseDeck(state.recentIds));
          persist();
          go('discovery');
        }
      }, [h('span', { text: deckCount + 'つ見てみる' })])
    ]));

    return section('03-understanding', nodes);
  }

  function experienceCard(experience, counter) {
    return h('article', { class: 'card', 'aria-label': experience.title }, [
      counter ? h('p', { class: 'eyebrow', text: counter }) : null,
      experienceVisual(experience, 'card'),
      h('h2', { class: 'card-title', text: experience.title }),
      h('p', { class: 'card-meta', text: metaLine(experience) }),
      h('p', { class: 'card-reason', text: experience.reason })
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
    var nodes = [
      h('h1', {
        class: 'deck-lead', tabindex: '-1', id: 'surface-title',
        text: isReal ? 'この言葉の隣に、2つの体験。' : '前回残ったものから、次の3つ。'
      }),
      h('p', {
        class: 'note',
        text: isReal ? '作品と場所を、一つずつ見ていきます。' : personalizedExplanation(deck.facets)
      })
    ];
    var card = experienceCard(experience, counter);
    attachSwipe(card,
      function () { decideWithInterest(experience.id, 'pass'); },
      function () { decideWithInterest(experience.id, 'keep'); });
    nodes.push(h('div', { class: 'card-stage' }, [card]));
    nodes.push(h('p', { class: 'hint', text: 'カードを左右に動かすか、下のボタンで選べます。' }));
    nodes.push(h('div', { class: 'decision' }, [
      h('button', {
        class: 'btn btn-line', type: 'button',
        onclick: function () { decideWithInterest(experience.id, 'pass'); }
      }, [h('span', { text: '今回は違う' })]),
      h('button', {
        class: 'btn btn-solid', type: 'button',
        'aria-pressed': isInterested(experience.id) ? 'true' : 'false',
        'data-interest-state': isInterested(experience.id) ? 'saved' : 'unsaved',
        onclick: function () { decideWithInterest(experience.id, 'keep'); }
      }, [h('span', { text: interestedLabel(experience.id) })])
    ]));
    if (deck.index > 0) {
      nodes.push(h('div', { class: 'actions actions-quiet' }, [
        h('button', { class: 'btn btn-text', type: 'button', onclick: undo },
          [h('span', { text: '前の体験に戻る' })])
      ]));
    }
    return section('09-personalized-discovery', nodes);
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
    if (!AD || !experience || !AD.openAction(action, experience.id)) {
      announce('この行き先は開けません。');
    }
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
        onclick: function () { openApprovedDestination(action, experience); }
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
    return h('div', { class: 'w03-step-row', 'aria-label': 'Discoveryの進行状況' }, [
      h('button', {
        class: 'w03-step-back', type: 'button',
        onclick: function () { go('emotion'); }
      }, [icon('back'), h('span', { text: '感情の言葉に戻る' })]),
      h('p', { class: 'w03-step-title' }, [
        h('span', { text: 'STEP 2/4' }),
        h('strong', { text: '気になる3つの体験から選ぶ' })
      ]),
      h('p', { class: 'w03-step-hint', text: '3つのうち、気になるものを1つ選んでください' })
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
        onclick: function () { openApprovedDestination(action, experience); }
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
    var surface = section('04-discovery', [
      h('h1', {
        class: 'sr-only', tabindex: '-1', id: 'surface-title',
        text: '気になる3つの体験から選ぶ'
      }),
      h('button', {
        class: 'm03-undo discovery-mobile-only', type: 'button',
        onclick: function () { go('emotion'); }
      }, [h('span', { text: '感情の言葉に戻る' })]),
      h('div', { class: 'discovery-desktop-only' }, [desktopDiscoveryStep()])
    ]);
    surface.classList.add('discovery-canonical');
    return surface;
  }

  function surfaceCanonicalDiscovery(deck) {
    /* Canonical copy is prototype-only. PRODUCTION_COPY_REVIEW_REQUIRED
       PROTOTYPE_FIXTURE_NOT_VERIFIED / PRODUCTION_RIGHTS_UNREVIEWED */
    var recordId = deck.ids[deck.index];
    var fixtures = deck.ids.map(discoveryFixtureById);
    var fixture = discoveryFixtureById(recordId);
    if (!recordId || !fixture || fixtures.some(function (item) { return !item; })) {
      return safeCanonicalDiscoverySurface();
    }
    var mobileCard = mobileDiscoveryCard(fixture, recordId);

    var mobileNodes = [
      h('div', { class: 'm03-intro' }, [
        h('h1', { class: 'm03-headline' }, [
          h('span', { text: '「ざわつく」を入口に、' }),
          h('span', { text: '3つの体験を選びました。' })
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
          h('h2', { id: 'w03-other-heading', text: '他の2つの体験も見る' }),
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
        text: '気になる3つの体験から選ぶ'
      }),
      h('div', { class: 'discovery-mobile discovery-mobile-only' }, mobileNodes),
      h('div', { class: 'discovery-desktop discovery-desktop-only' }, desktopNodes)
    ]);
    surface.classList.add('discovery-canonical');
    return surface;
  }

  function surfaceDiscovery() {
    var deck = state.deck;
    var experience = D.byId(deck.ids[deck.index]);
    var counter = (deck.index + 1) + ' / ' + deck.ids.length;
    if (deck.mode === 'personalized' || deck.mode === 'real-approved') {
      return surfaceLegacyDiscovery(deck, experience, counter);
    }
    return surfaceCanonicalDiscovery(deck);
  }

  function personalizedExplanation(facets) {
    var quoted = (facets || []).map(function (f) { return '「' + f + '」'; }).join('');
    return '前回、次の出会いの手がかりとして' + quoted + 'が選ばれました。そこから3つ置いています。';
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
      announce('3つすべてを「今回は違う」としました。');
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
    go('detail');
  }

  function surfaceCanonicalReview() {
    var fixtures = state.deck.ids.map(discoveryFixtureById).filter(function (fixture) { return fixture; });
    var activeId = validActiveId();
    if (state.deck.activeId !== activeId) state.deck.activeId = activeId;
    var activeFixture = activeId ? discoveryFixtureById(activeId) : null;
    var allPass = deckPassed().length === state.deck.ids.length;

    var intro = h('div', { class: 'm04-review-intro' }, [
      h('button', {
        class: 'm04-review-back m04-mobile-only', type: 'button',
        'aria-label': '3つの体験を見直す', onclick: reviewToDiscovery
      }, [icon('back')]),
      h('div', { class: 'm04-title-row' }, [
        h('h1', { class: 'm04-review-title', tabindex: '-1', id: 'surface-title', text: '3つ見ました' }),
        h('p', { class: 'm04-progress-count', text: '3 / 3' })
      ]),
      h('div', { class: 'm04-progress-dots', 'aria-label': '3つ中3つを確認済み' }, [
        h('span', { class: 'is-complete' }),
        h('span', { class: 'is-complete' }),
        h('span', { class: 'is-complete' })
      ]),
      h('p', { class: 'm04-emotion-fixture', text: '「ざわつく」を入口に' }),
      h('p', {
        class: 'm04-mobile-instruction m04-mobile-only',
        text: '気になったものを、ひとつ選んでください。'
      }),
      h('p', { class: 'm04-review-helper', text: 'この画面で、「気になる」／「今回は違う」を見直せます。' })
    ]);

    var nodes = [
      h('div', { class: 'm04-desktop-only' }, [desktopDiscoveryStep()]),
      intro,
      h('ul', { class: 'm04-review-grid', 'aria-label': '3つの体験の判定を見直す' }, fixtures.map(function (fixture) {
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
        text: '3つすべてを「今回は違う」とした場合は、ここで終了することも、もう一度3つを見ることもできます。'
      }));
    }

    var actions = [
      h('button', {
        class: 'm04-primary', type: 'button', disabled: activeId ? null : true,
        onclick: chooseReviewActive
      }, [h('span', { text: 'この体験を見てみる' }), h('span', { 'aria-hidden': 'true', text: '→' })]),
      h('button', {
        class: 'm04-secondary', type: 'button', onclick: reviewToDiscovery
      }, [h('span', { text: '3つを見直す' })])
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
    if (state.deck && state.deck.mode === 'base') return surfaceCanonicalReview();
    return surfaceLegacyReview();
  }

  function surfaceNone() {
    var count = activeDeckCount();
    return section('04-discovery-none', [
      h('h1', {
        class: 'question', tabindex: '-1', id: 'surface-title',
        text: '今日は、この' + count + 'つでした。'
      }),
      h('div', { class: 'stack' }, [
        h('button', {
          class: 'btn btn-line', type: 'button',
          onclick: function () {
            state.deck.index = 0;
            state.deck.decisions = {};
            persist();
            go('discovery');
          }
        }, [h('span', { text: count + 'つをもう一度見る' })]),
        h('button', {
          class: 'btn btn-line', type: 'button',
          onclick: function () { go('emotion'); }
        }, [h('span', { text: '入口を変える' })]),
        h('button', {
          class: 'btn btn-text', type: 'button',
          onclick: function () { go('entrance'); }
        }, [h('span', { text: '今日は終わる' })])
      ])
    ]);
  }

  function surfaceDetail() {
    var experience = D.byId(state.selectedId);
    var isReal = experience && experience.sourceClass === 'approved-real-experience';
    var destinationActions = approvedDestinationActions(experience).map(function (action) {
      return h('button', {
        class: action.kind === 'primary' ? 'btn btn-line' : 'btn btn-text',
        type: 'button',
        'data-action-destination': action.kind,
        onclick: function () { openApprovedDestination(action, experience); }
      }, [h('span', { text: action.label }), h('span', { 'aria-hidden': 'true', text: '↗' })]);
    });
    var detailActions = destinationActions.concat([
      h('button', {
        class: 'btn btn-primary', type: 'button',
        onclick: function () {
          if (state.recentIds.indexOf(experience.id) === -1) state.recentIds.push(experience.id);
          persist();
          go('plan');
        }
      }, [h('span', { text: 'この体験を選ぶ' })]),
      h('button', {
        class: 'btn btn-text', type: 'button',
        onclick: function () { go('review'); }
      }, [h('span', { text: '戻る' })])
    ]);
    var nodes = [
      experienceVisual(experience, 'detail'),
      h('h1', { class: 'display display-sm', tabindex: '-1', id: 'surface-title', text: experience.title }),
      h('p', { class: 'card-meta', text: metaLine(experience) }),

      /* canonical は What / Practical information の本文を与えていないため、
         prototype data にある事実（tag・duration・price）だけを並べる。
         体験の説明文を prototype 側で創作しない。 */
      h('h2', { class: 'section-title', text: '何をするか' }),
      h('p', { class: 'tags', text: (experience.tags || []).join(' ・ ') }),

      h('h2', { class: 'section-title', text: 'なぜここにあるか' }),
      h('p', { class: 'body-lg', text: experience.reason })
    ];
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
    nodes.push(h('div', { class: 'actions' }, detailActions));
    return section('05-experience-detail', nodes);
  }

  function surfacePlan() {
    var chosen = null;
    var dateWrap;

    var options = D.PLAN_OPTIONS.map(function (option) {
      var input = h('input', {
        type: 'radio', name: 'plan-when', id: 'plan-' + option.id, value: option.id,
        onchange: function () {
          chosen = option.id;
          dateWrap.hidden = option.id !== 'datetime';
          submit.disabled = false;
        }
      });
      return h('div', { class: 'choice' }, [
        input,
        h('label', { for: 'plan-' + option.id, text: option.label })
      ]);
    });

    dateWrap = h('div', { class: 'datetime', hidden: true }, [
      h('label', { for: 'plan-date', text: '日付' }),
      h('input', { type: 'date', id: 'plan-date' }),
      h('label', { for: 'plan-time', text: '時刻' }),
      h('input', { type: 'time', id: 'plan-time' })
    ]);

    var submit = h('button', {
      class: 'btn btn-primary', type: 'submit', disabled: true
    }, [h('span', { text: '予定を残す' })]);

    var form = h('form', {
      class: 'plan-form',
      onsubmit: function (event) {
        event.preventDefault();
        if (!chosen) return;
        state.plan = {
          when: chosen,
          date: chosen === 'datetime' ? document.getElementById('plan-date').value : '',
          time: chosen === 'datetime' ? document.getElementById('plan-time').value : '',
          experienceId: state.selectedId,
          status: 'open'
        };
        state.traceFacets = [];
        persist();
        go('plan-saved');
      }
    }, [
      h('fieldset', { class: 'choices' }, [
        h('legend', { class: 'question', text: 'いつやってみますか？' })
      ].concat(options).concat([dateWrap])),
      h('div', { class: 'actions' }, [submit])
    ]);

    return section('06-plan', [
      h('h1', { class: 'sr-only', tabindex: '-1', id: 'surface-title', text: 'いつやってみますか？' }),
      form
    ]);
  }

  function surfacePlanSaved() {
    return section('06-plan-saved', [
      h('h1', { class: 'display display-sm', tabindex: '-1', id: 'surface-title', text: '予定を残しました。' }),
      h('p', { class: 'note', text: '感情書店は、この予定が実行されたかを自動では確認しません。' }),
      h('div', { class: 'actions' }, [
        h('button', {
          class: 'btn btn-line', type: 'button',
          onclick: function () { go('entrance'); }
        }, [h('span', { text: '入口に戻る' })])
      ])
    ]);
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
          onclick: function () {
            state.plan.status = 'closed';
            persist();
            go('entrance');
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
        state.plan.status = 'closed';
        persist();
        go('entrance');
      }
    }, [h('span', { text: '今は残さない' })]);

    var form = h('form', {
      class: 'm05-trace-form',
      onsubmit: function (event) {
        event.preventDefault();
        var normalized = normalizeTraceSelection(selected);
        if (!normalized.length || !state.plan) return;
        state.traceFacets = normalized;
        state.plan.status = 'closed';
        persist();
        go('entrance');
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
    discovery: surfaceDiscovery,
    review: surfaceReview,
    none: surfaceNone,
    detail: surfaceDetail,
    plan: surfacePlan,
    'plan-saved': surfacePlanSaved,
    moment: surfaceMoment,
    trace: surfaceTrace
  };

  function render() {
    var build = SURFACES[screen] || surfaceEntrance;
    var next = build();
    renderStepbar();
    view.textContent = '';
    view.appendChild(next);
    var title = document.getElementById('surface-title');
    if (title) title.focus();
  }

  function resetPrototype() {
    STORE.clear().then(function () {
      state = STORE.emptyState();
      screen = 'entrance';
      render();
      announce('prototype の状態を初期化しました。');
    });
  }

  /* Header Interaction Contract v0.3
     - >=1200px の MENU から既存4導線だけを開く
     - logo / 体験の流れ / よくある質問 は同一ページ内スクロール
     - はじめる / 感情の言葉 は Hero CTA と同じ遷移（W02 Emotion）
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

    /* Reset Prototype は Visual Canonical に無い debug 用。?debug=1 のときだけ露出する。 */
    if (/[?&]debug=1(&|$)/.test(global.location.search)) {
      document.getElementById('debugFooter').hidden = false;
    }

    Promise.all([STORE.load(), STORE.loadInterested()]).then(function (loaded) {
      state = loaded[0];
      interested = loaded[1];
      screen = 'entrance';
      render();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);

/* =============================================================================
 * FOUNDER_MEDIA_REVIEW_01 — isolated prototype
 * -----------------------------------------------------------------------------
 * 目的: Founder が「見たいか」だけを判定する。デザイン評価用ではない。
 * 表示は 1 対象につき Real Media → Hook → 対象名 のみ。
 * 長文説明・感情説明・棚説明・推薦理由は出さない。
 *
 * 実装上の禁止（本ファイルで担保）:
 *   - 画像・動画の無断ダウンロード / 転載 / キャッシュを行わない
 *     （media は公式が公開している埋め込みのみ。ローカル資産は 1 件も持たない）
 *   - 埋め込み可否が確認できない media は MEDIA HOLD とし、表示しない
 *   - HOLD を別対象で置換しない（対象は 6 件のまま固定）
 *   - いいね / 保存 / シェア / 検索 / 感情選択 / ランキング / 無限スクロールを持たない
 *   - storage / GA4 / 外部 API 呼び出しを持たない
 * ========================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- 対象定義 */
  /* media: null = MEDIA HOLD（埋め込み可否が未確認）。
     verified な埋め込みが得られた場合のみ
     { provider: 'youtube-nocookie', id: '<videoId>', title: '<公式タイトル>' }
     を入れる。provider は埋め込みが公式に提供されているものだけを許可する。

     hook: null = HOOK HOLD（事実アンカーと矛盾 / 未確認のため実装しない）。 */
  var ITEMS = [
    {
      key: 'dawn',
      name: '分身ロボットカフェ DAWN ver.β',
      hook: 'このロボット、AIじゃない。',
      hookState: 'fact_consistent',
      media: null,
      mediaState: 'hold_unverified'
    },
    {
      key: 'snake',
      name: '東京スネークセンター',
      hook: null,
      hookState: 'hold_unverified_number',
      media: null,
      mediaState: 'hold_unverified'
    },
    {
      key: 'muscle',
      name: '筋肉女子 マッスルガールズ',
      hook: null,
      hookState: 'hold_fact_conflict',
      media: null,
      mediaState: 'hold_unverified'
    },
    {
      key: 'ninja',
      name: '忍者体験カフェ 東京浅草',
      hook: '忍者、見るんじゃなくてやる。',
      hookState: 'fact_consistent',
      media: null,
      mediaState: 'hold_unverified'
    },
    {
      key: 'sample',
      name: '食品サンプル製作体験カフェ',
      hook: '偽物を作って、本物を食べる。',
      hookState: 'fact_consistent_conditional',
      media: null,
      mediaState: 'hold_unverified'
    },
    {
      key: 'toy',
      name: '東京おもちゃ美術館',
      hook: '美術館なのに、遊べます。',
      hookState: 'fact_consistent',
      media: null,
      mediaState: 'hold_unverified'
    }
  ];

  /* --------------------------------------------------------------- DOM 構築 */
  function h(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value === true ? '' : value);
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  var EMBED_BASE = {
    'youtube-nocookie': 'https://www.youtube-nocookie.com/embed/'
  };

  /* 公式が提供する埋め込みのみを描画する。ローカルへの複製は行わない。 */
  function mediaNode(item) {
    if (!item.media || !EMBED_BASE[item.media.provider]) {
      return h('div', {
        class: 'fmr-media fmr-media-hold',
        'data-media-state': item.mediaState,
        role: 'note',
        'aria-label': 'この対象のMediaは未確定です'
      }, [
        h('p', { class: 'fmr-hold-label', text: 'MEDIA HOLD' }),
        h('p', { class: 'fmr-hold-note', text: '埋め込み可否が未確認のため表示していません' })
      ]);
    }
    return h('div', { class: 'fmr-media', 'data-media-state': 'embedded' }, [
      h('iframe', {
        class: 'fmr-embed',
        src: EMBED_BASE[item.media.provider] + item.media.id,
        title: item.media.title || item.name,
        loading: 'lazy',
        referrerpolicy: 'strict-origin-when-cross-origin',
        allow: 'encrypted-media; picture-in-picture',
        allowfullscreen: true,
        frameborder: '0'
      })
    ]);
  }

  function hookNode(item) {
    if (!item.hook) {
      return h('p', {
        class: 'fmr-hook fmr-hook-hold',
        'data-hook-state': item.hookState,
        text: 'HOOK HOLD'
      });
    }
    return h('p', {
      class: 'fmr-hook', 'data-hook-state': item.hookState, text: item.hook
    });
  }

  function card(item) {
    return h('article', { class: 'fmr-card', 'data-item': item.key }, [
      mediaNode(item),
      h('div', { class: 'fmr-copy' }, [
        hookNode(item),
        h('h2', { class: 'fmr-name', text: item.name })
      ])
    ]);
  }

  function render() {
    var list = document.getElementById('fmrList');
    if (!list) return;
    list.textContent = '';
    ITEMS.forEach(function (item) { list.appendChild(card(item)); });
    document.body.setAttribute('data-item-count', String(ITEMS.length));
    document.body.setAttribute(
      'data-media-embedded',
      String(ITEMS.filter(function (i) { return Boolean(i.media); }).length)
    );
  }

  render();

  /* 検証用の read-only 参照のみ。書き込み API は公開しない。 */
  global.__FMR__ = {
    items: ITEMS.map(function (i) {
      return { key: i.key, hookState: i.hookState, mediaState: i.mediaState };
    })
  };
})(window);

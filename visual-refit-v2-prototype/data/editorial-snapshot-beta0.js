/* ---------------------------------------------------------------------------
 * 04「作品」Beta0 static Editorial Snapshot（表示payloadのみ）
 *
 * 正本: data/04_Beta0_EditorialSnapshot_kanashii_v0_1.json
 *       （snapshot_id: eb-beta0-kanashii-20260812-v0.1 / APPROVED_FOR_04_BETA0_QA）
 * 方針: publication_policy に従い title / creator / type / editorial_reason のみを
 *       表示に使う。第三者 cover / jacket / poster / 歌詞 / 引用 / 外部遷移 /
 *       affiliate / runtime 外部API補充は行わない。
 * 追加2作品: 未承認のため存在しない（「もう2つ見る」は表示しない契約）。
 * これは静的な編集データであり、storage / GA4 / network には一切触れない。
 * ------------------------------------------------------------------------ */
(function (global) {
  'use strict';
  global.V2_EDITORIAL_SNAPSHOTS = {
    kanashii: {
      snapshot_id: 'eb-beta0-kanashii-20260812-v0.1',
      status: 'APPROVED_FOR_04_BETA0_QA',
      additional_approved: false,
      items: [
        { item_id: 'eb-beta0-kanashii-book-001',  type: 'book',
          title: 'わたしを離さないで', creator: 'カズオ・イシグロ',
          editorial_reason: '限られた時間を知りながら交わされた友情と愛情が、後から静かに重みを増す。' },
        { item_id: 'eb-beta0-kanashii-music-001', type: 'music',
          title: '真夏の通り雨', creator: '宇多田ヒカル',
          editorial_reason: '別れた後に残る景色を、声と余白が時間のように引き延ばす。' },
        { item_id: 'eb-beta0-kanashii-film-001',  type: 'film',
          title: 'ドライブ・マイ・カー', creator: '濱口竜介',
          editorial_reason: '失った人への言葉にならない感情が、運転と稽古の時間の中で少しずつ姿を変える。' }
      ]
    }
  };
})(typeof window !== 'undefined' ? window : this);

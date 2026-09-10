'use strict';
// 会場から辿る。
//
// カタログを数えて分かったこと：作品はすでに会場を軸に固まっている。同じ部屋で録られた
// 演奏が5曲あり、その部屋の50年史が1冊あり、今週その部屋で3つ催しがある。
// 「街 → 分類 → 作品 → 外へ」という一直線では、この交差が読者に見えない。
//
// **会場は会期で消えない。** 催しが終わっても、この索引は空にならない。
//
// 新しいURLは作らない。会場ページは索引であって行き先ではなく、
// 作品と催しがそれぞれ自分の検証済みの公式リンクを持っている。
//
// works に書いた作品は、編集部が書いた文（題名・紹介・関係の説明・作り手）の中に
// `mention` の文字列が実際に入っていることをビルドで確かめる。入っていなければ落ちる。
// 会場の紐付けを推測で足せないようにするため。
const venues = [
  {
    id: 'jirokichi', name: '高円寺JIROKICHI', city: 'koenji', mention: 'JIROKICHI',
    lead: '1970年代から続く高円寺のライブハウス。その50年を書いた本と、いま行われている演奏。',
    works: ['jirokichi'], eventVenue: 'JIROKICHI'
  },
  {
    id: 'za-koenji', name: '座・高円寺', city: 'koenji', mention: '座・高円寺',
    lead: 'この劇場のドキュメンタリー映画祭が選んだ作品と、いま舞台にかかっているもの。',
    works: ['monterey-pop', 'unnameable-dance', 'ramen-heads', 'rokkoku-kitchen', 'shogakko'],
    eventVenue: '座・高円寺'
  },
  {
    id: 'shelter', name: '下北沢SHELTER', city: 'shimokitazawa', mention: 'SHELTER',
    lead: 'この場所で録られた演奏と、この場所そのものを撮った映像。',
    works: ['kaho-asa', 'bilingualboy-love', 'sleepinside-recycle', 'mabuta-roundabout', 'shelter-news'],
    eventVenue: 'SHELTER'
  },
  {
    id: 'star-pines-cafe', name: "STAR PINE'S CAFE", city: 'kichijoji', mention: 'STAR PINE',
    lead: '吉祥寺のライブハウスで鳴った演奏を、録音から辿る。',
    works: ['yoshida-night-edge', 'yoshida-tinderness', 'kobayashi-kokuhaku', 'uchu-mao-haircolor', 'takeuchi-ai-rain'],
    eventVenue: "STAR PINE"
  },
  {
    id: 'jinbocho-theater', name: '神保町シアター', city: 'jinbocho', mention: '神保町シアター',
    lead: '街の映画館が組んだ特集から、古い日本映画へ寄り道する。',
    works: ['ginga', 'ugetsu'], eventVenue: '神保町シアター'
  }
];

// 紐付けが編集部の文に裏づけられていること。裏づけの無い関係は出さない。
function verify(items) {
  const seen = new Set();
  for (const v of venues) {
    if (seen.has(v.id)) throw new Error('Duplicate venue id: ' + v.id);
    seen.add(v.id);
    if (!v.works.length) throw new Error('A venue page needs at least one work: ' + v.id);
    for (const id of v.works) {
      const item = items.find(i => i.city === v.city && i.id === id);
      if (!item) throw new Error('Venue names a work that is not published: ' + v.id + '/' + id);
      const written = [item.title, item.creator, item.hook, item.relationNote].join(' ');
      if (!written.includes(v.mention))
        throw new Error('編集部の文が会場に触れていない。推測で紐付けない: ' + v.id + '/' + id);
    }
  }
  return venues;
}

module.exports = {venues, verify};

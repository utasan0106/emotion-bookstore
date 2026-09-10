'use strict';
// 場所そのものを扱った作品のコーナー。
//
// ファウンダー許可（2026-09-11）：「特定の街のものだけではなく、このサイトが置く意義が
// あるものならコーナーを設けていい。」置く意義をどう決めるかが要る。決めなければ
// 「編集部の好きなもの一覧」になり、それは Current Product の定義にない。
//
// **ここでの基準：本屋・古書店・映画館・ライブハウス・劇場そのものを扱っていること。**
// 街との関係ではなく、文化が生まれる場所との関係で棚に置く。Reality Return を街から
// 場所へ一般化したもので、読者が最後に行く先は同じ（実在の書店・映画館・劇場）である。
// だから4つの街に縛られない。将来、どの街にも属さない作品が来たときも、この棚に入る。
//
// 記録と物語を混ぜない。編集部自身が書き分けている：
//   「下北沢のライブハウスを舞台にした小説。実在バンドのインディーズ時代を
//    記録した本ではありません。」
// 場所の歴史を記録したものと、場所を舞台にした物語は、読者にとって別のものである。
const kinds = ['書店', '本屋', '古書', '古本', '映画館', 'ライブハウス', '劇場'];

const groups = [
  {
    id: 'record', title: '場所を記録したもの',
    lead: 'その店、その劇場、その映画館が、どう始まってどう続いてきたか。人が書き、撮った記録です。',
    works: [
      'koenji/jirokichi',                // ライブハウスの50年史
      'shimokitazawa/shelter-news',      // ライブハウスの紹介映像
      'shimokitazawa/honda',             // 劇場文化をつくった人の評伝
      'kichijoji/cinema-history',        // 映画館3館の歩み
      'kichijoji/baus',                  // 映画館の歩みをもとにした作品
      'jinbocho/gyokueido',              // 古書店の紹介
      'jinbocho/italia',                 // 古書店の紹介
      'jinbocho/iwanami-hall',           // 閉館した映画館の公式記録
      'jinbocho/used-book-festival'      // 通りが本棚になる催しの記録
    ]
  },
  {
    id: 'story', title: '場所を舞台にした物語',
    lead: '実在の記録ではありません。その場所に人を立たせたら何が起きるか、を書いた作品です。',
    works: [
      'shimokitazawa/indies',            // ライブハウスを舞台にした小説
      'shimokitazawa/gekijyo',           // 劇場と街が重なる映画
      'kichijoji/honnoniwa',             // シェア型書店を舞台にした小説
      'jinbocho/morisaki',               // 古書店を舞台にした小説
      'jinbocho/morisaki-sequel',
      'jinbocho/morisaki-film',          // 同じ小説の映画
      'jinbocho/furuhon',
      'jinbocho/furuhon-sequel',
      'jinbocho/kaijin'                  // 古書収集を扱うミステリー
    ]
  }
];

// 置く理由が編集部の文に書いてあること。無ければ落とす。推測で棚を増やさない。
function verify(items) {
  const seen = new Set();
  for (const g of groups) for (const key of g.works) {
    if (seen.has(key)) throw new Error('同じ作品が二つの組に入っている: ' + key);
    seen.add(key);
    const [city, id] = key.split('/');
    const item = items.find(i => i.city === city && i.id === id);
    if (!item) throw new Error('公開されていない作品を並べようとしている: ' + key);
    const written = [item.title, item.creator, item.hook, item.relationNote].join(' ');
    if (!kinds.some(k => written.includes(k)))
      throw new Error('編集部の文が場所に触れていない。推測で棚に入れない: ' + key);
  }
  return groups;
}

module.exports = {groups, kinds, verify};

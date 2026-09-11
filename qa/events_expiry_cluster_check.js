#!/usr/bin/env node
'use strict';
// 「再確認期限が同じ日に固まっている」ことを、切れる前に見つけられるか。
//
// 2026-09-21 に公開中24件が一度に表示から外れかけた。期限が全件 2026-09-20 で
// 揃っていたためで、10日前に人が気づくまで誰も知らなかった。
// tools/review-culture-events.js は当時「切れてから」しか鳴らさなかった。
//
// ここで固定するのは、その道具がいま「切れる前に」鳴ること。
// 実データは補充のたびに変わるので、合成データで契約だけを見る。

const assert = require('node:assert/strict');
const { expiringClusters, CLUSTER, HORIZON_DAYS } = require('../tools/review-culture-events');
const { events } = require('../tools/weekly-outings-source');

const ev = (id, reviewThrough, dates) => ({ id, reviewThrough, dates });

// 1. 事故の再現：期限が同じ日に揃い、その日を過ぎても会期が残っている。
//    人が10日かけて見つけたものを、その日のうちに名指しできること。
{
  const incident = [
    ev('a', '2026-09-20', ['2026-09-22', '2026-09-24']),
    ev('b', '2026-09-20', ['2026-09-26']),
    ev('c', '2026-09-20', ['2026-10-02']),
  ];
  const found = expiringClusters(incident, '2026-09-11');
  assert.equal(found.length, 1, '同じ日に固まった期限を1件のかたまりとして出す');
  assert.equal(found[0].date, '2026-09-20');
  assert.equal(found[0].days, 9, '何日後かを示す。切れてからでは遅い');
  assert.deepEqual(found[0].ids, ['a', 'b', 'c'], '消える催しを名指しする');
}

// 2. 会期が先に終わる催しは、期限が切れても公開面から何も減らない。数えない。
{
  const harmless = [
    ev('a', '2026-09-20', ['2026-09-13']),
    ev('b', '2026-09-20', ['2026-09-18']),
    ev('c', '2026-09-20', ['2026-09-20']),
  ];
  assert.deepEqual(expiringClusters(harmless, '2026-09-11'), [],
    '会期が先に終わるものは、期限が揃っていても穴を空けない');
}

// 3. 期限が散っていれば鳴らない。一度に消えないかぎり下限は割らない。
{
  const spread = [
    ev('a', '2026-09-20', ['2026-09-30']),
    ev('b', '2026-09-21', ['2026-09-30']),
    ev('c', '2026-09-22', ['2026-09-30']),
  ];
  assert.deepEqual(expiringClusters(spread, '2026-09-11'), [],
    '一日ずつ散っていれば、まとめては消えない');
}

// 4. 遠い先は鳴らさない。補充には公式ページを辿る時間が要るが、先回りしすぎても雑音になる。
{
  const far = [
    ev('a', '2026-12-01', ['2026-12-10']),
    ev('b', '2026-12-01', ['2026-12-10']),
    ev('c', '2026-12-01', ['2026-12-10']),
  ];
  assert.deepEqual(expiringClusters(far, '2026-09-11'), [], HORIZON_DAYS + '日より先は見ない');
}

// 5. 閾値。街ごとの下限3件を割りうる数から鳴る。
{
  const under = Array.from({ length: CLUSTER - 1 },
    (_, i) => ev('x' + i, '2026-09-20', ['2026-09-30']));
  assert.deepEqual(expiringClusters(under, '2026-09-11'), [], CLUSTER + '件未満では鳴らさない');
  const at = Array.from({ length: CLUSTER },
    (_, i) => ev('y' + i, '2026-09-20', ['2026-09-30']));
  assert.equal(expiringClusters(at, '2026-09-11').length, 1, CLUSTER + '件で鳴る');
}

// 6. 期限切れ済みのものは expired 側の仕事。ここでは二重に数えない。
{
  const already = [
    ev('a', '2026-09-01', ['2026-09-30']),
    ev('b', '2026-09-01', ['2026-09-30']),
    ev('c', '2026-09-01', ['2026-09-30']),
  ];
  assert.deepEqual(expiringClusters(already, '2026-09-11'), [], '切れ済みはここでは数えない');
}

// 7. いまの実データ。鳴るなら、それは本当に手当てが要るということ。
const live = expiringClusters(events, new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10));
if (live.length) {
  console.log('注意：会期が残ったまま一度に消える催しがあります。');
  for (const c of live) console.log('  ' + c.date + '（' + c.days + '日後）に ' + c.count + '件: ' + c.ids.join(' / '));
}

console.log('PASS 期限の固まりを、切れる前に（' + HORIZON_DAYS + '日以内・' + CLUSTER + '件から）名指しできる');

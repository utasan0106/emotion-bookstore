# Preview verify — handoff

Integration branch: `claude/tokyo-pilot-final-ending-20260828`
Art Direction canonical: `claude/tokyo-discovery-experience-gqfjuo` @ `bbadc0172fab690e57fde36050cf53ad309a3d3e`

このファイルは expected HEAD を持たない。tracked document に「自分自身を含む
最終 commit SHA」を書くと、更新するたびに自己参照になり、実行条件として成立
しないため。checkout の同一性は文書ではなく evidence 側で担保する:

- `preview_verify.js` が実行時の `git rev-parse HEAD` を evidence の
  `sourceGitHead` に記録する
- `freeze.py` が freeze 時の current HEAD と evidence の `sourceGitHead` の
  一致を要求する

## Status: NOT EXECUTABLE from the Claude environment

FAIL ではない。この開発環境から Vercel へ到達できないため実行できない、という事実。
実測（curl、V3.1 / V3.2 / V3.2.1 / final ending で再確認。retry loop はしていない）:

```
https://vercel.com                    -> 000 (接続不可)
https://api.vercel.com/v6/deployments -> 000 (接続不可)
https://*.vercel.app/                 -> 000 (接続不可)
```

Vercel の credential もこの環境には無く、利用できる GitHub MCP tool に
「ref に対する check run 一覧」が無いため deployment URL も特定できない。

したがって:

- `preview_verify.js` 未実行
- Preview bytes と checkout の一致は未確認
- Freeze は実行していない（Preview GO / Founder Visual GO / JIT freshness の
  3つが揃うまで実行しない）

## 外部ネットワークのある環境での手順

```bash
git fetch origin claude/tokyo-pilot-final-ending-20260828
EXACT_HEAD="$(git rev-parse origin/claude/tokyo-pilot-final-ending-20260828)"
git checkout --detach "$EXACT_HEAD"
cd v3-prototype/tokyo-pilot-01
NODE_PATH=/opt/node22/lib/node_modules node qa/human-test-v3/preview_verify.js \
  'https://<immutable-deployment-url>/v3-prototype/tokyo-pilot-01/'
```

期待: `PREVIEW_V3_VERIFY_GO`

`<immutable-deployment-url>` は、この branch の該当 commit に対して provider が
発行した deployment-specific な immutable URL。branch alias は使わない。alias
しか無い場合でもそこで Freeze しない。

`git checkout --detach "$EXACT_HEAD"` によって、evidence に記録される
`sourceGitHead` は「operator が実際に fetch した branch tip」になる。文書側で
SHA を突き合わせる必要はない。

`preview_verify.js` が確認するもの: 参加者7ファイルの byte 一致 /
neutral ending / Return priming 語の不在 / Real Media 3枚の decode と contain /
CC deed への直リンク / Official Action 前の外部 request 0 /
`qa/human-test-v3/**` 等の内部ファイルが公開配信されていないこと。

## 参加者が読む 7 ファイルの byte manifest（V3.2.4 checkout 実測）

これは operator が手元 checkout を目視確認するための参考値であり、実行条件
ではない。正となる比較は `preview_verify.js` が checkout から都度算出する。

```
index.html                  ef7710542e79e9ce60df4adcacd73295cef474c4ac22017b7c402d9d5bd9c9ad   2966
pilot.css                   0f945d8be0f11a903c01346a85098857068cdfe9987a8b4bd1b9c0e3b4d08d57  20647
pilot_content.js            c94222cfd44d661f274aec362ec0bf67f8f9326dd1bee7685b085dbf33f5f240   6968
pilot.js                    9033401c89651703132f1d58c5f4d3b9ec3febdf3a3769c4cd0086d66d2558e4  11888
assets/manuscript-cafe.png  832f06fa774966f02025d188bf4ae786abdd1fe69f1d338d6e43017754617315 368960
assets/hachiko.jpg          c634b597e9b09461159890784f15b2956ff810ee66c895cd92b19867e28a2767 353928
assets/meguro-tapeworm.jpg  21ed2ffbe847c755c28f675d08b1cbec40ec1477e4e688f78f07b666c5ec45c4 258119
```

V3.2 からの差分は `index.html` / `pilot.css` / `pilot.js` / `pilot_content.js`。
すべて日本語見出しの折返し制御。終了見出しは `.end-phrase` + `<wbr>` で
`この棚は、` / `3つで終わりです。` に固定。Object title と Detail Reveal は
`.jp-phrase` + `<wbr>` で意味単位を保つ。wording はいずれも不変で、phrase を
連結すると元の hook / reveal と1文字も違わないことを `pilot_check.js` と
`qa/measurement_integrity_check.js` が guard する。Real Media 3枚は byte 不変。

さらに V3.2.4 で `pilot.css` だけを editorial refinement 分だけ更新した
（touch-action / mobile dialog radius・高さ / mobile backdrop / 閉じるの
focus 表現 / coarse touch の hover 打ち消し）。wording・Hook・Reveal・
Real Media・rights・Official Action・外部通信・JS は無変更で、
`index.html` / `pilot.js` / `pilot_content.js` は byte 不変。

## Historical / audit note

過去 revision の記録であって、実行条件ではない。

```
V3.1   integrated HEAD  cd4d20c
V3.2   integrated HEAD  c4c2ba13dda0da47fcc732b7f4c3f71dcf4ac9d0
V3.2.1 integrated HEAD  ccf0c410e4973a6c953b0eda93046ca4921bd5c6
V3.2 final contract     2e6bace69c46e44d24c28b1177bf84f194788633
```

## そのあと

Preview GO / Founder Visual GO / JIT freshness の3つが揃うまで Freeze しない。
`--visual-gate founder-go` を Founder の代理で渡さない。
手順は `README.md` の Exact sequence を参照。

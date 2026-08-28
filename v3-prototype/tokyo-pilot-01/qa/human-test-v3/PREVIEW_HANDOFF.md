# Preview verify — handoff

Integration branch: `claude/tokyo-pilot-human-test-v32-20260828`
Integrated HEAD: `573e64e3b062a425fad45659fa5bda27ca424439`
Art Direction canonical: `claude/tokyo-discovery-experience-gqfjuo` @ `bbadc0172fab690e57fde36050cf53ad309a3d3e`

## Status: NOT EXECUTABLE from the Claude environment

FAIL ではない。この開発環境から Vercel へ到達できないため実行できない、という事実。
実測（curl、V3.1 に続き V3.2 でも再確認。retry loop はしていない）:

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

## 外部ネットワークのある環境での 1 コマンド

```bash
git fetch origin claude/tokyo-pilot-human-test-v32-20260828 \
 && git checkout claude/tokyo-pilot-human-test-v32-20260828 \
 && [ "$(git rev-parse HEAD)" = "573e64e3b062a425fad45659fa5bda27ca424439" ] \
 && cd v3-prototype/tokyo-pilot-01 \
 && NODE_PATH=/opt/node22/lib/node_modules node qa/human-test-v3/preview_verify.js \
      'https://<exact-deployment-url>/v3-prototype/tokyo-pilot-01/'
```

期待: `PREVIEW_V3_VERIFY_GO`

branch alias ではなく deployment-specific な immutable URL を使う。alias しか
無い場合でもそこで Freeze しない。

`preview_verify.js` が確認するもの: 参加者7ファイルの byte 一致 /
neutral ending / Return priming 語の不在 / Real Media 3枚の decode と contain /
CC deed への直リンク / Official Action 前の外部 request 0 /
`qa/human-test-v3/**` 等の内部ファイルが公開配信されていないこと。

## 参加者が読む 7 ファイルの byte manifest（V3.2 統合 checkout 実測）

```
index.html                  752d748b65a6dda3333f98b9656263de2ecd3729f228b9583e840b6f1df3d833   2400
pilot.css                   970435c56f6e9883971d5a9b35177d6ab133899b2d7a1c0cd8c52fb96b5e7527  17293
pilot_content.js            ddb3ae20489882e7b8154bdf0a5beb51640a8fdaea21725c8b1a763baebfc85d   6324
pilot.js                    57204ae78e19eda67cefd7efab146aceae9daa25ba9f910c120da24415f8697d  10806
assets/manuscript-cafe.png  832f06fa774966f02025d188bf4ae786abdd1fe69f1d338d6e43017754617315 368960
assets/hachiko.jpg          c634b597e9b09461159890784f15b2956ff810ee66c895cd92b19867e28a2767 353928
assets/meguro-tapeworm.jpg  21ed2ffbe847c755c28f675d08b1cbec40ec1477e4e688f78f07b666c5ec45c4 258119
```

V3.1（`cd4d20c`）からの差分は `pilot.css` のみ。終了見出しの日本語折返し
1宣言の追加による。他 6 ファイルは byte 不変。

## そのあと

Preview GO / Founder Visual GO / JIT freshness の3つが揃うまで Freeze しない。
`--visual-gate founder-go` を Founder の代理で渡さない。
手順は `README.md` の Exact sequence を参照。

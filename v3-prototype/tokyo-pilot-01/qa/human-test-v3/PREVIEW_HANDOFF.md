# Preview verify — handoff

Integration branch: `claude/tokyo-pilot-human-test-v31-20260828`
Integrated HEAD: `2ca37ebf041120789970e5b86d537d6a2011396c`

## なぜ Claude 側で完了していないか

この開発環境の network egress proxy が Vercel を全面的に遮断している。
実測（curl, 2026-08-28）:

```
https://vercel.com                                          -> 接続不可 (000)
https://api.vercel.com/v6/deployments                        -> 接続不可 (000)
https://<branch-alias>.vercel.app/                           -> 接続不可 (000)
https://example.vercel.app/                                  -> 接続不可 (000)
```

Vercel の credential もこの環境には無い。GitHub 側も、利用できる MCP tool に
「ref に対する check run 一覧」が無いため、Vercel が付けた deployment URL を
特定できない。

したがって `preview_verify.js` は **未実行**。
Preview bytes と checkout の一致は **未確認**。
これは PASS でも FAIL でもなく、この環境では実行できないという事実。

## 外部ネットワークのある環境でやること

```bash
git fetch origin claude/tokyo-pilot-human-test-v31-20260828
git checkout claude/tokyo-pilot-human-test-v31-20260828
git rev-parse HEAD    # 2ca37ebf041120789970e5b86d537d6a2011396c であること

cd v3-prototype/tokyo-pilot-01
NODE_PATH=/opt/node22/lib/node_modules node qa/human-test-v3/preview_verify.js \
  'https://<exact-deployment-url>/v3-prototype/tokyo-pilot-01/'
# 期待: PREVIEW_V3_VERIFY_GO
```

branch alias ではなく deployment-specific な immutable URL を使う
（Freeze は URL に紐づくため）。

## 参加者が読む 7 ファイルの byte manifest（統合ブランチ checkout 実測）

`preview_verify.js` はこれと remote を突き合わせる。手で確認したい場合の参照値。

```
index.html                  752d748b65a6dda3333f98b9656263de2ecd3729f228b9583e840b6f1df3d833   2400
pilot.css                   f5f429e78b018fbe108ab7dd49111c85cb735d80f42a65f9bf3b67f27727fed5  17054
pilot_content.js            ddb3ae20489882e7b8154bdf0a5beb51640a8fdaea21725c8b1a763baebfc85d   6324
pilot.js                    57204ae78e19eda67cefd7efab146aceae9daa25ba9f910c120da24415f8697d  10806
assets/manuscript-cafe.png  832f06fa774966f02025d188bf4ae786abdd1fe69f1d338d6e43017754617315 368960
assets/hachiko.jpg          c634b597e9b09461159890784f15b2956ff810ee66c895cd92b19867e28a2767 353928
assets/meguro-tapeworm.jpg  21ed2ffbe847c755c28f675d08b1cbec40ec1477e4e688f78f07b666c5ec45c4 258119
```

## そのあと

Preview GO と Founder Visual GO と JIT freshness の3つが揃うまで Freeze しない。
`--visual-gate founder-go` を Founder の代理で渡さない。
手順は `README.md` の Exact sequence を参照。

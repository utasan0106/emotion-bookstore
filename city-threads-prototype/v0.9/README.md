# City Threads v0.9 — 高円寺 → 阿波おどり vertical slice（isolated prototype）

- 単一ファイル `index.html`。外部通信・計測・保存・フォント読込・音の自動再生なし。
- Production（ルート `index.html` / `shelf.html` / `release*.js` / GA4）とは一切共有しない。runtime からの参照 0 件。
- 設計と v0.8 の問題分析は `BLUEPRINT.md`。
- QA は `qa/ct_qa.js`（Playwright、ローカル静的サーバのみ）。証跡は `qa/evidence/`。

```
NODE_PATH=/opt/node22/lib/node_modules node city-threads-prototype/v0.9/qa/ct_qa.js
```

史実は `FACTS.md`（Fact台帳）に一次Source URL・該当箇所・確認日を記録し、裏付けの取れたものだけを
「出典特定 2026-09-02・人の目視確認待ち」として画面に載せている（SOURCE-TRACE READY。検索インデックス経由・全文未閲覧のため、Human Test 前に人が一次ページを目視するGateが残る）。
画像・映像・ポスター・連名・賞名は Rights / Fact 確認まで載せない。横糸（高円寺→下北沢）は HQ判断で HOLD。

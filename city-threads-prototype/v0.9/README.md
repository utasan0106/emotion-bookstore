# City Threads v0.9 — 高円寺 → 阿波おどり vertical slice（isolated prototype）

- 単一ファイル `index.html`。外部通信・計測・保存・フォント読込・音の自動再生なし。
- Production（ルート `index.html` / `shelf.html` / `release*.js` / GA4）とは一切共有しない。runtime からの参照 0 件。
- 設計と v0.8 の問題分析は `BLUEPRINT.md`。
- QA は `qa/ct_qa.js`（Playwright、ローカル静的サーバのみ）。証跡は `qa/evidence/`。

```
NODE_PATH=/opt/node22/lib/node_modules node city-threads-prototype/v0.9/qa/ct_qa.js
```

史実（1957・徳島交流・独立連・演舞場拡大・1976 海外遠征・2025 受賞連・歴代ポスター）は、
CEO指示で杉並区／東京高円寺阿波おどり振興協会由来と示されたものだけを使い、
画面上でも「編集部の一次確認待ち」と明示している。画像・映像・ポスター・連名は Rights / Fact 確認まで載せない。

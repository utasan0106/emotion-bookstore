# Culture room R1 — 非公開試作

目的：下北沢SHELTERでの実際の録音と同曲のソロ盤を、自分で選んで聴く。

repo rootを通常のHTTP静的サーバーで開き、`/experiments/culture-room-r1/`へ進む。`index.html`のfile直開きは再生・CSPの正式QA方法ではない。

これは本番に出ている機能ではない。`.vercelignore`の `/experiments/` 除外は維持する。本番CSPではBandcampは未許可。本番で「実装済みの音楽体験」として説明しない。

方針・出典・次工程は `../../docs/culture-experience-r2/`。

```bash
node qa/culture_room_contract_check.js
node qa/release_check.js
node qa/measurement_v04_selftest.js
```

## 未完了ゲート

- 実画面390 / 430 / 1440、拡大・キーボード・読み込み失敗時のQA。この環境のCloud BrowserがローカルHTTPおよびfile表示を拒否したため、代替のブラウザ起動等で回避せず未検証とする。
- 両方の埋込iframe内で音が出ること、切替・閉じるで実音が止まること。ホスト状態テストは実再生の証拠ではない。
- 提供元のアルバム自動次曲移行。SHELTER標準プレイヤーで実際に確認した。サイト側は停止操作を用意するが、曲末の自動停止を保証しない。有限な同曲比較として許容するか、単曲提供方式へ変更するかは公開前に判断する。
- 新providerの第三者通信・Cookie確認と、本番Trust/CSPの必要最小変更を別途レビューする。

独立試作を確認するためにProductionへpromoteしない。今の本番Journey・計測・Atlas降格・4棚3件は変更していない。

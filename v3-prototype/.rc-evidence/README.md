# RC Evidence — V3 Release Closure 2026-08-24

`RC_EVIDENCE.txt` … branch/HEAD、変更ファイルとSHA-256、保護スコープ、テスト結果。

`screens/` … 8棚 × 390×844 / 430×932 / 1440×1000 の実ブラウザ撮影（72枚）。
容量が大きいためrepoには含めない。次で再生成できる。

```
cd v3-prototype
node verify/release_closure_runtime_cert.js
```

撮影は `.surface` の 160ms fade-in 完了を待ってから行う。
待たずに撮ると実際より色が薄く写るため、証跡としては使わないこと。

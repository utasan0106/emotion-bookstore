# 街を立体で辿る（β）— attribution / license

Production Beta 0（高円寺だけ）。

## Project PLATEAU
3D都市モデル（建築物 maxlod2-latest、自治体コード 13115 杉並区）と PLATEAU-Ortho は
Project PLATEAU / 国土交通省 の配信サービスを利用します。
- https://www.mlit.go.jp/plateau/
- https://docs.plateauview.mlit.go.jp/
- https://docs.plateauview.mlit.go.jp/datasets/ortho/

PLATEAU の配信は試行運用であり、可用性・サービスレベルは保証されていません。
配信に失敗・遅延しても、同じ文化データを使う 2.5D 表示で内容は読めます。

## CesiumJS
https://cesium.com/platform/cesiumjs/ （Apache License 2.0）。Cesium の credit surface は表示したまま、
PLATEAU の attribution を画面上に明示します。

## 文化データ
thread_content.js（koenji-dance-history）と同じ資料に基づきます。現在の 3D 都市モデルは歴史の証拠ではなく、
1957 年は商店街の通りという範囲（案内帯）まで、1961 / 1961–62 / 1963 は地点を作りません。

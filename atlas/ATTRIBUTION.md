# 街を立体で辿る（β）— attribution / license / lineage

Production Beta 0（高円寺だけ）。Correction C: CesiumJS / PLATEAU 配信サービスの runtime 利用を廃止し、
公式データから事前に取り出した same-origin の派生データだけを読む Cultural Signal Lens。

## 現在の街の形（出典）

出典：3D都市モデル（Project PLATEAU）杉並区（2025年度）（国土交通省）を加工して作成

- dataset: `3D都市モデル（Project PLATEAU）杉並区（2025年度）`（作成年月日 2026年3月13日、
  3D都市モデル標準製品仕様書 第5.0版、CityGML 2.0、EPSG:6697）
- catalog: https://www.geospatial.jp/ckan/dataset/plateau-13115-suginami-ku-2025
- package: `13115_suginami-ku_pref_2025_citygml_1_op.zip`
  （SHA-256 `9deaa984f060956f9aa2cde2507113ed7d3fcfffa0a53846081715ef68ca3816`）
- 使用 mesh: `53394541` / `53394542`（建築物 `bldg`・交通（道路）`tran`）
- 抽出: `tools/plateau/extract_koenji_corridor.py`（stdlib、offline、決定的）。
  建物は `bldg:lod0RoofEdge` と `bldg:measuredHeight`、道路は `tran:lod1MultiSurface`。
  範囲は現在の表示窓 `[139.6465, 35.7027, 139.652, 35.7066]`（歴史上の境界ではない）。
- lineage: `tools/plateau/koenji/*.lineage.json`（source GML SHA → gml:id → derived GeoJSON SHA、status GO）。
  派生 feature の id は source の `gml:id` そのもの。
- license: 同梱 README の「利用に関する留意事項」に基づき、政府標準利用規約（第2.0版）を選択
  （CC BY 4.0 / ODC BY / ODbL も提示されている）。
- 同梱 README の注意: 原典資料の位置の正しさの違いや、作成された時期の違いにより、
  現状を正確に反映していない場合がある。

## runtime

- 外部配信元 0（Cesium 0 / PLATEAU 配信サービス 0 / タイル 0 / WebAssembly 0）。
- 位置情報 0 / カメラ 0 / 入力欄 0 / 保存 0 / 計測 0。
- 外部サイト（資料・公式情報・出典）は allowlist の host だけ、押したときだけ。

## 文化データ

thread_content.js（koenji-dance-history）と同じ資料に基づく。現在の街の形は歴史の証拠ではなく、
1957 年は『商店街の通り』という範囲まで（この版では線を引かない）、1961 / 1961–62 / 1963 は地点を作らない。
現在の駅は PLATEAU の建物（用途コード 431、中央線の位置に東西に伸びる 2 棟）から導いた目安。

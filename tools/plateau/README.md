# tools/plateau — Koenji Cultural Signal Lens: offline PLATEAU pipeline（Correction C）

`/atlas/` が読む現在の街の形は、公式 Project PLATEAU データから **offline** で取り出した
same-origin の GeoJSON だけです。runtime は Cesium / PLATEAU 配信サービス / タイル / WebAssembly を
使いません。このディレクトリは、その派生データの **lineage（出所の連鎖）** を再現・検証するための
無償ツールチェーン（Python 3 stdlib + lxml のみ、有償変換サービス 0）です。

```
official CityGML（SHA-256）→ audit（CityGML 2.0 / gml:id 一覧）→ extract（bbox crop、gml:id 保持）
→ verify_lineage（output id ⊆ source gml:id、derived SHA）→ certificate（GO）
→ promote（certificate SHA == file SHA、identity 13115 / 2025 / 2.0）→ /atlas/data/
→ production_spatial_qa（GO）→ qa/atlas_check.js（毎回、SHA を再検証）
```

## 対象 dataset（exact identity）

- `3D都市モデル（Project PLATEAU）杉並区（2025年度）`（作成 2026年3月13日、標準製品仕様書 第5.0版）
- https://www.geospatial.jp/ckan/dataset/plateau-13115-suginami-ku-2025
- package `13115_suginami-ku_pref_2025_citygml_1_op.zip`
  SHA-256 `9deaa984f060956f9aa2cde2507113ed7d3fcfffa0a53846081715ef68ca3816`
- mesh `53394541` / `53394542`（`udx/bldg/*_bldg_6697_op.gml`、`udx/tran/*_tran_6697_op.gml`）
- CityGML **2.0** だけを許可（3.0 は HOLD、parse できても自動で受け入れない）
- 詳細と各ファイルの SHA-256: `koenji/source-manifest.json`

## 手順（再現）

`$RAW` = 展開した公式 package（または HQ RAW HANDOFF）のディレクトリ、`$WORK` = 作業ディレクトリ。

```bash
# 1. source audit（lxml）— SHA-256、CityGML version、gml:id 一覧、measuredHeight
for m in 53394541 53394542; do
  python3 tools/plateau/audit_citygml_source.py $RAW/udx/bldg/${m}_bldg_6697_op.gml $WORK/audits/${m}_bldg.audit.json --feature Building
  python3 tools/plateau/audit_citygml_source.py $RAW/udx/tran/${m}_tran_6697_op.gml $WORK/audits/${m}_tran.audit.json --feature Road
done

# 2. bounded extraction（stdlib、決定的、同じ入力 → byte-identical）
python3 tools/plateau/extract_koenji_corridor.py \
  --bldg $RAW/udx/bldg/53394541_bldg_6697_op.gml --bldg $RAW/udx/bldg/53394542_bldg_6697_op.gml \
  --tran $RAW/udx/tran/53394541_tran_6697_op.gml --tran $RAW/udx/tran/53394542_tran_6697_op.gml \
  --bbox 139.6465,35.7027,139.6520,35.7066 --precision 6 \
  --out-buildings $WORK/koenji-plateau-2025-buildings.geojson \
  --out-roads $WORK/koenji-plateau-2025-roads.geojson \
  --report $WORK/extract-report.json

# 3. lineage certificate（output feature id ⊆ source gml:id、derived SHA を記録）
python3 tools/plateau/verify_lineage.py --geojson $WORK/koenji-plateau-2025-buildings.geojson \
  --audit $WORK/audits/53394541_bldg.audit.json --audit $WORK/audits/53394542_bldg.audit.json \
  --output tools/plateau/koenji/koenji-plateau-2025-buildings.lineage.json
python3 tools/plateau/verify_lineage.py --geojson $WORK/koenji-plateau-2025-roads.geojson \
  --audit $WORK/audits/53394541_tran.audit.json --audit $WORK/audits/53394542_tran.audit.json \
  --output tools/plateau/koenji/koenji-plateau-2025-roads.lineage.json

# 4. promotion gate（certificate SHA == file SHA でなければ HOLD）→ atlas/data/
python3 tools/plateau/promote_verified_data.py \
  --buildings $WORK/koenji-plateau-2025-buildings.geojson --roads $WORK/koenji-plateau-2025-roads.geojson \
  --building-lineage tools/plateau/koenji/koenji-plateau-2025-buildings.lineage.json \
  --road-lineage tools/plateau/koenji/koenji-plateau-2025-roads.lineage.json \
  --source-manifest tools/plateau/koenji/source-manifest.json --data-dir atlas/data

# 5. gates
python3 tools/plateau/production_spatial_qa.py --root atlas --lineage-dir tools/plateau/koenji
node qa/atlas_check.js
```

派生データを変更したら 3 → 4 → 5 をやり直す（certificate を作り直さない限り promotion は HOLD）。

## 抽出の内容

- Building: `gml:id`、`bldg:lod0RoofEdge`（全 polygon、exterior + interior）、`bldg:measuredHeight`（m）、mesh。
  PLATEAU の `-9999`（未計測）は高さとして出さず `null`。
- Road: `gml:id`、`tran:lod1MultiSurface`（全 polygon）、mesh。
- 座標: EPSG:6697 の posList（lat lon height）→ GeoJSON `[lon, lat]`、小数 6 桁。
  clipping / simplification / 手描き / 合成 geometry は無し。feature id = source `gml:id`。
- 範囲 `[139.6465, 35.7027, 139.652, 35.7066]` は高円寺駅周辺の **現在の表示窓**（約 497 m × 433 m）。
  歴史上の境界ではなく、1957–1963 年の出来事の位置を示すものではない。

## 出所の記録（repo 内）

- `koenji/source-manifest.json` — dataset identity、package / GML / metadata / codelist の SHA-256、license、抽出条件
- `koenji/audits/*.audit.json` — source audit の compact 版（gml:id 一覧は count + SHA-256 で保持。
  完全版は HQ evidence bundle）
- `koenji/*.lineage.json` — lineage certificate（status GO、derived GeoJSON SHA）
- `atlas/data/runtime-spatial.json` / `koenji-plateau-2025-*` — promotion の出力（provenance を含む）

## ツールの由来

- `audit_citygml_source.py` / `verify_lineage.py` — HQ Resume Pack v0.5（PLATEAU_KOENJI_OFFLINE_PIPELINE）から無改変。
- `promote_verified_data.py` / `production_spatial_qa.py` — 同 pack（CULTURAL_SIGNAL_LENS_R3 v0.5）の gate を
  この repo 用に最小調整（identity 検証は同一、provenance に dataset / license / 抽出条件を追加、SHA 再検証を追加）。
- `extract_koenji_corridor.py` — この repo 用（stdlib、offline、決定的）。

## license / attribution

同梱 README「利用に関する留意事項」に基づき 政府標準利用規約（第2.0版）を選択（CC BY 4.0 / ODC BY / ODbL も提示）。
表示: `出典：3D都市モデル（Project PLATEAU）杉並区（2025年度）（国土交通省）を加工して作成`。
README の注意「原典資料の位置の正しさの違いや、作成された時期の違いにより、現状を正確に反映していない場合がある」を
Atlas に表示し、current geometry を historical evidence として扱わない。

# みんなの感情書店 V3 — Claude Code 共通ルール

現行本番と最新 `main`、Founder/HQ の正式指示を正とする。
このファイルは Current Product / hard rules / authority / gate を定める。
画面固有の px 値・個別 task 手順・進捗ログ・Research 履歴はここに書かず、
各 Task Brief / Spec / Visual Canonical に置く。

## Current Product

- **みんなの感情書店 V3 — Human-curated Cultural Exploration**（有限の文化案内）。
- 人が選んだ街・本・映画・音楽・映像・人・出来事・場所を、有限に並べて案内する。
- 各 Object は Official / primary destination（公式サイト・会場・配信元など）へ接続する。
- これは Infinite Feed **ではない**。
- Popularity ranking **ではない**。
- Psychological profiling **ではない**。
- AI taste prediction service **ではない**。

### Core principles

- 本人より先に本人を決めない。
- 人を編集しない。世界との接点を編集する。
- Human Editorial first（採否・順序・文言は編集部が決める）。
- NO EVIDENCE = NO ROUTE / NO BRIDGE。
- Cross-media is first-class（街だけに縮小しない）。
- Reality Return is first-class（Web 内で完結させない）。

## Product layers

書くとき・判断するときに必ず区別する。Prototype と Research を
Production の現在機能として書かない。

- **Production** — 現在公開されている V3 Cultural Guide（ドメイン直下）。
- **Prototype** — City Threads、Relation Reveal、その他 isolated experiments。
  `v3-prototype/` `visual-refit-v2-prototype/` `experiments/` 等。配信面に出さない。
- **Research / Strategy** — After-Culture、B2B / B2G、Cultural Relationship Graph、
  将来の Lens、その他未実装仮説。実装済みとして扱わない。

## Cultural Thread architecture（strategic）

- **Cultural Thread** = 文化の関係を辿る体験。
- **City Thread** = 街から始まる Cultural Thread の一種。City Guide だけに縮小しない。
- Book / Film / Music / Video を削除しない。
- Object type 候補：Place / Book / Film / Music / Video / Person / Event /
  Organization / Document / Exhibition / Performance。
- Relation は Evidence-backed。例：`adapted_from` / `filmed_at` / `recorded_at` /
  `performed_at` / `founded_by` / `learned_from` / `documented_by` / `moved_to`。
- 裏付けのない Relation は出さない（NO EVIDENCE = NO BRIDGE）。

## Reality Return

- Thread の終点は Web 内完結ではない。辿った文化の続きを、店舗・劇場・書店・映画館・
  ライブ会場・展覧会・文化施設・いま触れられる作品へ返す。
- generic recommendation にしない。人気順・広告順・affiliate 順で並べない。
- Thread との Relation を説明できるものだけを出す。

## Historical V1 / V2（Archive）

- private writing / bookification / personal bookshelf / private emotional record は
  History / Archive として残してよい（`archive/emotion-diary-service/`、配信停止済み）。
- Current Product 定義の冒頭や、Claude の現在の判断基準として使わない。
- 「誰にも見せない気持ちを一冊にする私的な書店」を Current Project definition として復活させない。

## Current Visual Direction

- Current top-level Art Direction：**CONTENT-LED IMMERSIVE TIME**
  — コンテンツの中へ入り、そのコンテンツに引っ張られて、街と時間を移動する Web 体験。
- B-V4 EDITORIAL TIME は Typography / Evidence / Editorial restraint の
  **positive reference**（Design Artifact CLOSED）。Current runtime target として書かない。
- Current HOME：Founder/HQ 承認済み HOME 画像が VISUAL_CANONICAL。
  画像なし・text-only の状態で忠実実装を開始しない。
- HOME は街紹介サイトではなく「文化のつながりを辿る場所」。
- HOME section order：1. HERO / 2. 街から入る / 3. 作品から入る /
  4. いま辿れるスレッド / 5. 現実へ出る。

## Visual implementation rule

Visual Canonical がある場合、Claude は Designer ではなく **Frontend Implementer**。

- YOU MUST NOT reinterpret / redesign / modernize / beautify / simplify。
- YOU MUST NOT generic AI landing page 化・SaaS dashboard 化する。
- YOU MUST NOT 指定にない cards / pills / modal を足す。
- 必要な Visual choice が未定義なら、勝手に選ばず `SPEC_CONFLICT_HOLD` を返す。

Mandatory flow：

1. Visual Canonical を実際に読む
2. Visual Contract 作成
3. Minimum implementation
4. Real browser screenshot
5. same-size side-by-side
6. overlay / image diff
7. BLOCKER / MAJOR / MINOR 分類
8. root cause 順に Limited Fix
9. Human Review

- Automated QA / Claude の SELF PASS だけでは Visual GO にならない。
- Font は必ず実 load を確認する：`document.fonts.check` / computed font /
  screenshot 上の実描画。fallback 描画を成果物として提出しない。

## Working style

- 1課題・1ブランチ。スコープ外の改善・新機能・リファクタを勝手に混ぜない。
- 変更前に `git status` と対象コードを確認する。
- 既存ロジックを再利用し、必要最小限の差分を優先する。
- 既知 FAIL と今回起因の FAIL を必ず分離する。

## Testing

- IMPORTANT: 変更後は関連テストを実行し、今回起因の新規 FAIL を 0 にする。
- IMPORTANT: テストを削除・skip して緑にしない。仕様変更時は新しい正式契約を検証する。
- 端末内保存・棚・Object 契約・期限（`current` / `expiresAt`）・GA4・外部通信に
  影響しうる変更では、影響有無を明記する。
- 可能なら `git diff --check` と構文チェックも実行する。

## Guardrails

- YOU MUST NOT merge to `main` without Founder/HQ approval.
- YOU MUST NOT deploy to Production without Founder/HQ approval.
- YOU MUST NOT force-push.
- YOU MUST NOT add external data transmission unless explicitly approved.
- YOU MUST NOT send user-written text, photos, or private data to external services.
- YOU MUST NOT change GA4 event definitions unless the task explicitly requires it.
- YOU MUST NOT introduce diagnosis, emotion scoring, psychological inference,
  streaks, rankings, or gamification.
- YOU MUST NOT change storage keys, storage format, or deletion behavior
  unless explicitly in scope.
- YOU MUST NOT 裏付けのない Relation / Route / Bridge を出す。
- YOU MUST NOT Rights 不明の画像・映像・音源を使う。

## Founder / HQ authority

Founder/HQ が決める：Product meaning / Priority / Brand / Art Direction /
Visual Canonical / Rights-sensitive decision / GO・HOLD・KILL /
main merge / Production deploy。

Claude は承認済み仕様を忠実に実装する。判断が必要で未定義なら止めて確認する。

## Git / delivery

- Design Artifact と Product delivery は別 Gate。同じ commit に混ぜない。
- YOU MUST NOT Founder/HQ 承認なしに main へ merge する。
- YOU MUST NOT Production へ deploy する。
- YOU MUST NOT force-push する。
- YOU MUST NOT autonomous に PR を作る。
- Visual task 中に scope を広げない。
- `deliver-artifact` を Design review artifact の保存だけのために使わない。

## Model routing

指示ごとに推奨モデルを記載する。

- **Opus** — Product / Art Direction、Visual Canonical interpretation、
  Context reconciliation、complex specification、Red Team、GO / HOLD 前の監査。
- **Fable** — frozen spec の限定実装、mechanical fixes、repeated QA、
  screenshot generation、bounded responsive adjustment。

## Completion report

タスク終了時は次だけを報告する：

1. changed files
2. what changed
3. tests and results
4. 端末内保存 / 棚 / Object 契約 / GA4 / 外部通信の変更有無
5. remaining concerns（max 3）
6. Preview に出せる状態か

その後 STOP し、承認を待つ。

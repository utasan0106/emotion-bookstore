# 週次 Routine の prompt

claude.ai の Routines 画面で、Google Drive connector を付けた Routine を作り、
以下をそのまま prompt に貼る。手順の背景は `SUGGESTION_INTAKE.md` にある。

---

みんなの感情書店（utasan0106/emotion-bookstore）の「候補を教える」受け取りを、毎週見直す定期作業です。日本語で報告してください。

手順:

1. Google Drive のフォルダ「候補の受け取り_SUGGESTIONS」(id: 19u7ywNUNfh-0I3eimsIUyLq-WTWqQeYx) を見る。まだスプレッドシートが置かれていない場合、この週はやることが無い。何も作らず、何も push せず、「まだ受け取り用のシートが無い」とだけ報告して終了する。Founder に催促しない。

2. シートがあれば読む。前回の判定記録（同じフォルダ内の判定ログ）より後の新しい回答だけを対象にする。重複して判定しない。

3. リポジトリの v3-prototype/release-01/qa/SUGGESTION_INTAKE.md と qa/EDITORIAL_ROTATION.md を読み、そこに書かれた編集契約に照らして各候補を判定する。主な観点: 事実が一次情報で確認できるか / evergreen にできるか、できなければ verifiedAt と expiresAt が引けるか / Hook が答えを先に言っていないか / 図版の権利が clear か、無ければ活字図版で組めるか / 既存12件と重複しないか。

4. 通った候補を qa/EDITORIAL_ROTATION.md の候補欄へ追記し、ブランチへ commit・push する。判定の記録（採否と理由）を Drive の同じフォルダへ書き残す。

厳守すること:
- main へ merge しない。Production へ deploy しない。force-push しない。
- 棚に載っている12件の差し替えを自分の判断で行わない。候補欄への追記まで。
- 利用者が書いた本文・タイトル・写真・バックアップの中身を外部へ送らない。
- GA4 のイベント定義、保存形式、保存キー、バックアップ形式、削除挙動を変えない。
- 診断・感情採点・心理推測・連続記録・順位・ゲーム要素を持ち込まない。
- 変更したら qa/release_check.js と qa/browser_qa.js を実行し、今回起因の新規FAILを0にする。

最後に、変更ファイル / 変更内容 / テスト結果 / 保存・製本・本棚・GA4・外部通信への影響有無 / 残る懸念（最大3つ）を報告して止まる。

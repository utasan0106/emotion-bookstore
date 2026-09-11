# メディア運営とAI：世界の実践を調べて、ここへ持ち帰る

2026-09-11。ファウンダーの指示「メディア運営とAIとの関係や進め方について
世界中から調査して活かせる部分は存分に活かして」への回答。

調べたのは公開されている報道・研究である。**この作業環境から読めた範囲**であり、
各社への取材はしていない。出典は末尾に置いた。

---

## 1. 大手が実際にどうしているか

**共通しているのは「AIは記者を置き換えない」という立て方**である。
やり方は各社で違い、その違いは資金・価値観・使命を映している。

| | やり方 |
|---|---|
| **Guardian**（2026-03 更新） | 生成AIの使用を**限定的に許可**。画像の代替テキスト案、議会文書の分析、音声の文字起こしなど。条件は三つ——編集基準に沿うこと、**人の監督下にあること**、**上級編集者の明示的な許可**を得ること |
| **Reuters** | AIを「force multiplier」と位置づけ、大量の文書を分析し パターンを見つける用途に使う。**各段階にガバナンスの検問所**を置き、編集上の説明責任を保つ |
| **BBC** | AIが関わった記事は**公開前に人の sign-off を必須**とする。記事の先頭にAI開示ラベルを導入した |

BBCと欧州放送連合（EBU）は2025年10月、**AIアシスタントがニュースを45%の割合で
誤って伝える**という調査を公表した。出典の誤り、details の捏造、古い情報が原因である。

### ここへの持ち帰り

**「AIに事実を作らせない」は、既にこのサイトの設計になっている。**
催しは公式ページを実際に開いて8項目を確認し、確認できないものは載せない。
今日『女優魂2026』の上映日程を PDF から読もうとして失敗したとき、
私は推測で埋めずに見送った（その判断自体は後で誤りと分かったが、
**埋めなかったことは正しかった**）。45%の誤りは、この作り方なら入ってこない。

---

## 2. 失敗は「量 × 開示不足 × レビュー不足」で起きている

**CNET**（2022-11〜2023-01）
AIが書いた金融解説記事77本を、"CNET Money Staff" という署名で静かに公開した。
読者は署名にカーソルを合わせないと自動生成と分からなかった。
発覚後の内部監査で、**77本中41本に訂正**が入った。半数以上である。
一部は「substantial（実質的）」な訂正だった。

**Sports Illustrated**（2023-11）
**実在しない著者名**で77本が公開された。複数に訂正が必要だった。

両方に共通するのは三つ。**量を出すことが目的化し、開示が不十分で、
人のレビューが足りなかった。**

### ここへの持ち帰り

- **量は既に目的から外してある。** `CLAUDE.md` は「有限に並べて案内する」と定め、
  `SELECTION-20260910.md` は「件数は目標であって、根拠の代わりにはならない。
  枠を埋めるために基準未満を残さない」と書いている。守られている
- **署名の偽装はしていない。** 編集部名義で、AI利用は記事に明記してある
- **レビューは、いま穴が空いている。** §4 に書く

---

## 3. AIラベルは、貼れば貼るほど信頼が上がるわけではない

ここがいちばん意外だった。研究が示しているのは次のことである。

**見出しに「AI-generated」と貼ると、内容が真実でも、実際には人間が書いていても、
読者はその見出しを不正確だと感じ、共有したがらなくなる。**
読者は「AIラベル＝全自動」と受け取るためである。

だから実務では次が推奨されている。

- **「generated（生成した）」と「assisted（補助した）」を区別する。**
  前者は全面的にAIが書いたこと、後者は補助を意味する。読者はこの差を読む
- **程度に応じた開示**（fully AI-generated / partially AI-assisted / low AI-augmented）
- **AIの関与と並べて、人の関与も見せる。** 「AIだけで作った」と誤解されるのを防ぐ

### ここへの持ち帰り

**催しページ全部に「AI」と貼るのは、たぶん逆効果である。**
事実（日程・料金・会場）は公式で確認した人間の仕事であり、
そこへ無差別にAIラベルを貼ると、確認した事実まで疑われる。

いま既にあるものを確認すると、**この設計はおおむね研究の推奨に合っている**。

| 面 | いまの開示 | 評価 |
|---|---|---|
| 街の記事（essays） | 「AIを資料探索・比較・文章化に使用しています」＋見出しに「AIで街を多角的に読む」 | **assisted の表現。適切** |
| AI生成イラスト | credits.html に「AIで制作したオリジナルイラスト。実在する街・店舗の写真ではありません」 | **generated の表現。適切** |
| 催しページ | 「主催者・会場の情報確認：日付」「過ごし方は編集上の提案です」 | **人の関与が見えている。ラベルより効く** |

足りないのは**ラベルではなく、確認そのもの**である。次へ。

---

## 4. いま空いている穴：編集部の確認を待たずに公開された

2026-09-11 に催し19件を足した。`hook`（一文）と `relation`（なぜこの街か）は
**私が書いた下書き**で、ファウンダーの承認を得たうえで書いたものである。
引き継ぎ書には「掲載前に編集部が読む前提」と記録した。

**しかし、その確認を待たずにマージし、本番へ出た。**

CNETの教訓に照らすと、これは同じ型の入口である。量は19件と小さく、
事実は公式で確認済みで、文言も限定的（一文の hook と事実の要約）だが、
**「人が読む前提のものが、読まれないまま出る」構造は同じ**である。

19件で済んでいるうちに、構造を直す。

### やったこと

1. **確認待ちをデータに持たせた。** `editorialReview:'pending'` を19件に付けた。
   配信面には出ない（`events-data.js` は必要な項目だけを書き出している）
2. **週次の点検で件数を出す。** `review-culture-events.js` が
   「編集部の確認待ち N件」を報告する。溜まれば毎週見える
3. **溜まったら止まる。** 10件を超えたら、その週は新しい下書きを作らない。
   確認が追いつかないまま増やすのは、CNETがやったことそのものである

確認が済んだ催しは `editorialReview` を外す。それだけで件数が減る。

---

## 5. 調べた結果、変えなくてよいと分かったこと

調査は「足すもの」を見つけるためだけのものではない。
**既に正しくやっていることを確認する**ためでもある。

- **人の sign-off**（BBC）→ `CLAUDE.md` の Founder/HQ authority と同じ立て方
- **上級編集者の明示的な許可**（Guardian）→ 今日の「下書きまで作ってよいか」の確認がこれ
- **各段階のガバナンス検問所**（Reuters）→ `AUTONOMY-20260911.md` §2 の止まる条件
- **AIに事実を作らせない** → 公式ページ確認、NO EVIDENCE = NO BRIDGE

**大手が何年もかけて辿り着いた線と、ここで引いた線は、だいたい同じ場所にある。**
違うのは規模だけである。

---

## 出典

- [As AI reshapes newsrooms, leading media outlets are charting different paths for its use（The Conversation, 2026-07）](https://theconversation.com/as-ai-reshapes-newsrooms-leading-media-outlets-are-charting-different-paths-for-its-use-283565)
- [How three newsrooms are charting different paths for AI use（Nieman Journalism Lab, 2026-07）](https://www.niemanlab.org/2026/07/how-three-newsrooms-are-charting-different-paths-for-ai-use/)
- [Reuters, BBC and Guardian chart distinct newsroom paths for using AI tools（Media Copilot）](https://mediacopilot.ai/newsroom-ai-strategies/)
- [Sports Illustrated is latest media company damaged by an AI experiment gone wrong（NY1 / AP, 2023-11）](https://ny1.com/nyc/all-boroughs/news/2023/11/29/sports-illustrated-is-latest-media-company-damaged-by-an-ai-experiment-gone-wrong)
- [Can AI-Generated Content be Trusted? Lessons from CNET's AI Debacle](https://cut-the-saas.com/ai/can-ai-generated-content-be-trusted-lessons-from-cnets-ai-debacle)
- [How should news organizations label their AI use for audiences?（Nieman Lab, 2026-06）](https://www.niemanlab.org/2026/06/how-should-news-organizations-label-their-ai-use-for-audiences-new-studies-suggest-some-answers/)
- [Designed by Journalists, but Is It for Readers? Rethinking AI Disclosures and Transparency in News（arXiv）](https://arxiv.org/html/2606.11116)
- [People are skeptical of headlines labeled as AI-generated, even if true or human-made（PMC）](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11443540/)
- [“Transparency is More Than a Label”: Audiences' Information Needs for AI Use Disclosures in News（Digital Journalism, 2026）](https://www.tandfonline.com/doi/full/10.1080/21670811.2026.2700592)

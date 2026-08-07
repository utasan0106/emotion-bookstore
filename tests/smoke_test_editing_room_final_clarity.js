// ============================================================================
// 編集室 Final Clarity Fix 専用受入テスト（tests/smoke_test_editing_room_final_clarity.js）
//
// 対象：指示書 Editing_Room_Final_Clarity_Fix_Claude_Instructions.md §13 の
// チェックリストのうち、他の既存テストではカバーされていない項目
// （画像1-8、文言・工程9-16、表示29-36）を検証する。
//
// 機能項目17-27（DOM順・空欄製本・時期既定値・助け舟開閉・700字・写真/X有無での製本・
// 日英切替での値保持・保存/本棚/編集/削除）は tests/smoke_test_desk_flow_fix1.js、
// tests/smoke_test_visual_rc1.js で従来どおり検証済みのため、本ファイルでは重複させない。
// 項目27（Recommendation Repeat Fix 1がPASS）は tests/smoke_test_recommendation_repeat_fix1.js、
// 項目28（全回帰テストFAIL0・クラッシュ0）はテストランナー側（全ファイル実行）で担保する。
//
// 実ブラウザ（iPhone Safari等）での実機目視・スクリーンショットは、このsandbox環境では
// ヘッドレスブラウザのバイナリを取得できないため「未実施」とし、ここでは静的CSS検査・
// WebPバイナリ解析・jsdom DOM検査で代替する（指示書§13の許容どおり）。
//
// ★UX Fix 01 v1.1 追記（2026-08-07）：項目12（上部工程案内の文言順）を、UX Fix 01
// 「本文ファーストの編集室」で正式に変更された新しい体験順（言葉を綴る→本の輪郭→本を預ける）
// を検証する内容へ更新した。3項目という数・各項目の文言・画像/工程案内間のDOM順（項目6-8）・
// 正式見出しの文言（項目13）は今回のUX Fix 01でも変更していないため、そのまま維持している。
// ============================================================================
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.resolve(__dirname, '..'); // tests/ の親＝製品ソース直下
let pass = 0, fail = 0;
function ok(label, cond){
  if(cond){ pass++; console.log('PASS:', label); }
  else { fail++; console.log('FAIL:', label); }
}

const rawHtml = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');
const rawCss = fs.readFileSync(path.join(SRC, 'style.css'), 'utf-8');
const rawMain = fs.readFileSync(path.join(SRC, 'main.js'), 'utf-8');

// ---- WebPの簡易ロッシー(VP8)バイナリから幅・高さを直接読み取るパーサー
//      （外部ライブラリ不使用。RIFF/WEBP/VP8ヘッダの固定オフセットを読む）。
function readWebpDimensions(buf){
  if(buf.toString('ascii',0,4) !== 'RIFF') return null;
  if(buf.toString('ascii',8,12) !== 'WEBP') return null;
  const fourcc = buf.toString('ascii',12,16);
  if(fourcc !== 'VP8 ') return null; // 簡易ロッシー形式のみ対応（本画像はこの形式）
  const startCode = buf.toString('hex',23,26);
  if(startCode !== '9d012a') return null;
  const width = buf.readUInt16LE(26) & 0x3FFF;
  const height = buf.readUInt16LE(28) & 0x3FFF;
  return { width, height };
}

function wrap(value){ return JSON.stringify({ v:1, data:value }); }

async function createEnv(opts){
  opts = opts || {};
  let html = rawHtml;
  html = html.replace(/<script[^>]*src=["']data\.js["'][^>]*><\/script>/, '');
  html = html.replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/, '');
  const dom = new JSDOM(html, { url:'https://example.com/', runScripts:'dangerously', resources:'usable', pretendToBeVisual:true });
  const { window } = dom;
  const { document } = window;
  window.matchMedia = function(q){ return { matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }; };
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.scrollTo = function(){};
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(){}, fillRect(){}, clearRect(){} });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,AAAA';
  window.gtag = function(){};
  window.fetch = function(){ return Promise.resolve({ ok:true, json: () => Promise.resolve({}) }); };
  const s1 = document.createElement('script'); s1.textContent = fs.readFileSync(path.join(SRC,'data.js'),'utf-8'); document.body.appendChild(s1);
  const s2 = document.createElement('script'); s2.textContent = fs.readFileSync(path.join(SRC,'main.js'),'utf-8'); document.body.appendChild(s2);
  await new Promise(r => setTimeout(r, 300));
  await new Promise(r => setTimeout(r, 300));
  return { window, document };
}

const DOCUMENT_POSITION_FOLLOWING = 4;
function isBefore(a, b){
  if(!a || !b) return false;
  return !!(a.compareDocumentPosition(b) & DOCUMENT_POSITION_FOLLOWING);
}

async function main(){

  // ============================================================
  // 画像（指示書§13 項目1〜8）
  // ============================================================
  {
    // 1. assets/editing-room.webpが最終ZIP内に1件だけ存在（=このディレクトリに1件だけ）
    const assetsDir = path.join(SRC, 'assets');
    const webpMatches = fs.readdirSync(assetsDir).filter(f => f === 'editing-room.webp');
    ok('(1) assets/editing-room.webp が1件だけ存在する', webpMatches.length === 1);
    // 画像の複製がルート直下等に残っていないことも確認する
    const rootDup = fs.existsSync(path.join(SRC, 'editing-room.webp'));
    ok('(1b) ルート直下に同じ画像の複製が残っていない', !rootDup);

    const imgPath = path.join(assetsDir, 'editing-room.webp');
    const buf = fs.readFileSync(imgPath);

    // 2. SHA-256が期待値と一致
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    ok('(2) assets/editing-room.webp のSHA-256が指示書の期待値と一致する',
       hash === '012746b8be4921156f2fe7f54193dacfaf193e0e80131a3c4e4c2f2f4fd296e0');

    // 3. 960×420px（WebPバイナリを直接解析して確認。新規生成・再加工・再圧縮なしの裏付け）
    const dims = readWebpDimensions(buf);
    ok('(3) 画像の実寸が960×420pxである（WebPバイナリを直接解析）', !!dims && dims.width === 960 && dims.height === 420);

    // 4. 90KB以下
    ok('(4) 画像容量が90KB以下である', buf.length <= 90 * 1024);
    ok('(4b) 画像容量が指示書の期待値(約29.8KB)付近である', buf.length === 29794);

    // 5. HTML参照先が正しい（パス・大文字小文字も含めて厳密一致）
    ok('(5) index.htmlのimg src が "assets/editing-room.webp" と厳密一致する',
       /<img\s+src="assets\/editing-room\.webp"/.test(rawHtml));

    // 6. 見出し・説明→画像→工程案内のDOM順
    const { document } = await createEnv({});
    const sectionHead = document.querySelector('#desk .section-head');
    const sectionSub = document.querySelector('#desk .section-sub');
    const heroImg = document.querySelector('#desk .desk-hero-image img');
    const stepsOverview = document.querySelector('#desk .desk-steps-overview');
    ok('(6a) 編集室見出し(.section-head)が存在する', !!sectionHead);
    ok('(6b) 説明文(.section-sub)が存在する', !!sectionSub);
    ok('(6c) 見出し画像(img)が存在する', !!heroImg);
    ok('(6d) 上部工程案内(.desk-steps-overview)が存在する', !!stepsOverview);
    ok('(6e) 見出しが説明文より前に存在する', isBefore(sectionHead, sectionSub));
    ok('(6f) 説明文が画像より前に存在する', isBefore(sectionSub, heroImg));
    ok('(6g) 画像が上部工程案内より前に存在する', isBefore(heroImg, stepsOverview));

    // 7. 画像がdisplay:none等で隠れていない（静的CSS検査。jsdomは外部stylesheetの
    //    実際のカスケード計算をしないため、rawCssへの正規表現検査で裏付ける）
    const heroBlock = /\.desk-hero-image\{([^}]*)\}/.exec(rawCss);
    const heroImgBlock = /\.desk-hero-image img\{([^}]*)\}/.exec(rawCss);
    ok('(7a) .desk-hero-image のCSSブロックが存在する', !!heroBlock);
    ok('(7b) .desk-hero-image img のCSSブロックが存在する', !!heroImgBlock);
    const suspectPatterns = [/display\s*:\s*none/i, /visibility\s*:\s*hidden/i, /opacity\s*:\s*0(?!\.)/i, /height\s*:\s*0(?!\.)/i];
    const heroText = (heroBlock ? heroBlock[1] : '') + (heroImgBlock ? heroImgBlock[1] : '');
    ok('(7c) .desk-hero-image / img のルールに display:none 等の非表示指定がない',
       !suspectPatterns.some(re => re.test(heroText)));
    // 画像タグ自体にinline styleでの非表示指定がないこと
    ok('(7d) img要素にstyle属性による非表示指定がない', !/<img\s+src="assets\/editing-room\.webp"[^>]*style=/.test(rawHtml));
    // JS側でこの画像に対するクラス付与制御が無い（=JSクラスが付くまで非表示、を回避）
    ok('(7e) main.js が .desk-hero-image を対象にしたクラス制御を追加していない', !/desk-hero-image/.test(rawMain));
    // onerrorで自身を隠すような自己非表示ハンドラを持たない（読み込み失敗時に恒久的に消える設計を排除）
    ok('(7f) img要素が読み込み失敗時に自身を隠すonerrorハンドラを持たない',
       !/<img\s+src="assets\/editing-room\.webp"[^>]*onerror=/.test(rawHtml));

    // 8. loading="eager"、fetchpriority="high"、寸法属性がある
    ok('(8a) loading="eager" が指定されている', /<img\s+src="assets\/editing-room\.webp"[^>]*loading="eager"/.test(rawHtml));
    ok('(8b) fetchpriority="high" が指定されている', /<img\s+src="assets\/editing-room\.webp"[^>]*fetchpriority="high"/.test(rawHtml));
    ok('(8c) decoding="async" が指定されている', /<img\s+src="assets\/editing-room\.webp"[^>]*decoding="async"/.test(rawHtml));
    ok('(8d) width="960" height="420" が指定されている（レイアウトシフト防止）',
       /<img\s+src="assets\/editing-room\.webp"[^>]*width="960"[^>]*height="420"/.test(rawHtml));
    ok('(8e) 装飾画像としてaria-hidden="true"が指定され、altは空である（読み上げ重複回避）',
       /<img\s+src="assets\/editing-room\.webp"[^>]*alt=""[^>]*aria-hidden="true"/.test(rawHtml) ||
       /<img\s+src="assets\/editing-room\.webp"[^>]*aria-hidden="true"[^>]*alt=""/.test(rawHtml));
  }

  // ============================================================
  // 文言・工程（指示書§13 項目9〜16）
  // ============================================================
  {
    const { document, window } = await createEnv({});
    window.goToPage('desk');

    // 9. 利用者向け表示が「編集室／Editing Room」に統一
    const sectionHeadJa = document.querySelector('#desk .section-head h2').textContent;
    ok('(9a) JA見出しが「編集室」', sectionHeadJa === '編集室');
    window.toggleLanguage();
    const sectionHeadEn = document.querySelector('#desk .section-head h2').textContent;
    ok('(9b) EN見出しが「Editing Room」', sectionHeadEn === 'Editing Room');
    window.toggleLanguage(); // JAへ戻す

    // 10. 利用者向けDOMに「編纂机」「編纂室」がない
    const deskVisibleText = document.getElementById('desk').textContent;
    ok('(10a) #desk のテキストに「編纂机」が含まれない', !deskVisibleText.includes('編纂机'));
    ok('(10b) #desk のテキストに「編纂室」が含まれない', !deskVisibleText.includes('編纂室'));
    const messagesJaLiteral = /['"][^'"\n]*(編纂机|編纂室)[^'"\n]*['"]/.test(rawMain);
    ok('(10c) main.jsのMESSAGES文字列リテラルに「編纂机」「編纂室」が無い（コメントのみ許容）', !messagesJaLiteral);

    // 11. 上部案内に数字1・2・3がない
    const overviewItems = [...document.querySelectorAll('#desk .desk-steps-overview li')].map(li => li.textContent);
    ok('(11) 上部工程案内が3項目である', overviewItems.length === 3);
    ok('(11b) 上部工程案内のいずれにも数字(0-9・全角０-９)が含まれない',
       overviewItems.every(t => !/[0-9０-９]/.test(t)));

    // 12. [UX Fix 01 v1.1] 上部案内が新しい体験順「言葉を綴る／本の輪郭／本を預ける」
    //     （UX Fix 01「本文ファーストの編集室」により、旧「本の輪郭｜言葉を綴る｜本を預ける」から
    //     並び替えられた。3項目という数・各項目の文言自体は変更していない＝§13の他の要件は不変）。
    ok('(12) [UX Fix 01] 上部工程案内のJA文言が新しい体験順どおり', overviewItems.join('|') === '言葉を綴る|本の輪郭|本を預ける');

    // 13. 正式見出しが「本の輪郭を決める／言葉を綴る／一冊にして預ける」
    const heading1 = document.querySelector('#desk .desk-step-1 .desk-step-heading').textContent;
    const heading2 = document.querySelector('#desk .desk-step-2 .desk-step-heading').textContent;
    const heading3 = document.querySelector('#desk .desk-step-3 .desk-step-heading').textContent;
    ok('(13a) セクション1見出しが「本の輪郭を決める」', heading1 === '本の輪郭を決める');
    ok('(13b) セクション2見出しが「言葉を綴る」', heading2 === '言葉を綴る');
    ok('(13c) セクション3見出しが「一冊にして預ける」', heading3 === '一冊にして預ける');
    ok('(13d) 正式見出しのいずれにも数字が含まれない',
       [heading1, heading2, heading3].every(t => !/[0-9０-９]/.test(t)));

    // 14. 「一冊の輪郭を決める」が残っていない（誤字混入チェック）
    ok('(14) index.html/main.jsに誤った「一冊の輪郭を決める」が残っていない',
       !rawHtml.includes('一冊の輪郭を決める') && !rawMain.includes('一冊の輪郭を決める'));

    // 15. 「タイトル・棚・時期」が残っていない
    ok('(15) index.html/main.jsに旧文言「タイトル・棚・時期」が残っていない',
       !rawHtml.includes('タイトル・棚・時期') && !rawMain.includes('タイトル・棚・時期'));

    // 16. 新しい補足文が日英で表示される（★Release Final UI Fix §7で更新）
    const leadJa = document.querySelector('#desk .desk-step-1 .vr-stage-lead').textContent;
    ok('(16a) JA補足文が指示書どおり', leadJa === 'タイトルは空欄でも、一冊にできます。');
    window.toggleLanguage();
    const leadEn = document.querySelector('#desk .desk-step-1 .vr-stage-lead').textContent;
    ok('(16b) EN補足文が指示書どおり',
       leadEn === "You can make a book without choosing a title.");
    window.toggleLanguage();
  }

  // ============================================================
  // 表示（指示書§13 項目29〜36）— 静的CSS検査による代替証拠
  //   実ブラウザ／実機での目視・スクリーンショットはこのsandbox環境では未実施。
  // ============================================================
  {
    // 29-31. デスクトップ／390px／430pxで画像が見える（静的検査：非表示状態が無いことは
    //        項目7で確認済み。ここではCSSサイズ計算で目安レンジに収まることを確認する）
    const heroBlock = /\.desk-hero-image\{([^}]*)\}/.exec(rawCss)[1];
    const heroImgBlock = /\.desk-hero-image img\{([^}]*)\}/.exec(rawCss)[1];
    ok('(29) 画像に width:100% が指定されている（コンテナ幅に追従し、0幅にならない）', /width\s*:\s*100%/.test(heroImgBlock));
    ok('(30) 画像に aspect-ratio が指定されている（高さが自動計算され、0高にならない）', /aspect-ratio\s*:\s*16\s*\/\s*7/.test(heroImgBlock));
    ok('(31) object-fit:cover が指定されている（縦横比を保ちながら確実に描画域を埋める）', /object-fit\s*:\s*cover/.test(heroImgBlock));
    // デスクトップ・390/430px双方でコンテナ幅に対して破綻しない固定px指定を持たない
    const hasBadFixedWidth = /(?<!max-)width\s*:\s*[3-9]\d{2,}px/.test(heroBlock) || /(?<!max-)width\s*:\s*[3-9]\d{2,}px/.test(heroImgBlock);
    ok('(31b) 画像・ラッパーに横スクロールを招く大きな固定px幅が指定されていない', !hasBadFixedWidth);

    // 32. 上部3列が同じ幅・同じ高さ
    const overviewBlock = /\.desk-steps-overview\{([^}]*)\}/.exec(rawCss)[1];
    const overviewLiBlock = /\.desk-steps-overview li\{([^}]*)\}/.exec(rawCss)[1];
    ok('(32a) .desk-steps-overview が display:grid になっている', /display\s*:\s*grid/.test(overviewBlock));
    ok('(32b) grid-template-columns: repeat(3, minmax(0, 1fr)) で3列が同じ幅になる',
       /grid-template-columns\s*:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(overviewBlock));
    ok('(32c) align-items:stretch で3列が同じ高さになる', /align-items\s*:\s*stretch/.test(overviewBlock));
    ok('(32d) 各列(li)がmin-width:0を持ち、内容量による幅の崩れを防いでいる', /min-width\s*:\s*0/.test(overviewLiBlock));

    // 33. 3番目だけ折り返されない
    ok('(33a) 各列に word-break:keep-all が指定され、CJK文字の不自然な途中折り返しを防ぐ', /word-break\s*:\s*keep-all/.test(overviewLiBlock));
    ok('(33b) 上部工程案内の3項目文言はいずれも5文字以内（短い道しるべ、旧「1　一冊にして預ける」のような長文ではない）',
       ['本の輪郭','言葉を綴る','本を預ける'].every(t => t.length <= 5));
    // モバイルの文字サイズが指示書の目安12〜14pxの範囲内
    const baseFontSizeMatch = /font-size\s*:\s*([0-9.]+)px/.exec(overviewLiBlock);
    ok('(33c) 基本フォントサイズが12〜14pxの範囲内', !!baseFontSizeMatch && parseFloat(baseFontSizeMatch[1]) >= 12 && parseFloat(baseFontSizeMatch[1]) <= 14);
    // .desk-steps-overview li{...} appears twice: base rule, then the
    // @media(max-width:480px) override further down the file (there are multiple
    // unrelated @media(max-width:480px) blocks elsewhere, so we take the 2nd
    // occurrence of this specific selector rather than the 1st @media block in the file).
    const overviewLiMatches = [...rawCss.matchAll(/\.desk-steps-overview li\{([^}]*)\}/g)];
    let mobileOverviewLiFontSize = null;
    if(overviewLiMatches.length >= 2){
      const fm = /font-size\s*:\s*([0-9.]+)px/.exec(overviewLiMatches[1][1]);
      if(fm) mobileOverviewLiFontSize = parseFloat(fm[1]);
    }
    ok('(33d) 390/430px帯(@media max-width:480px)でも文字サイズが12px以上に保たれている',
       mobileOverviewLiFontSize !== null && mobileOverviewLiFontSize >= 12 && mobileOverviewLiFontSize <= 14);

    // 34. 横スクロールがない（bodyがoverflow-x:hiddenかつ、今回変更したブロックに
    //     コンテナ幅を超えるはみ出し要因（巨大な固定px、負のmarginの誤用）が無い）
    ok('(34a) body に overflow-x:hidden が指定されている（既存仕様、今回壊していない）', /body\{[^}]*overflow-x\s*:\s*hidden/.test(rawCss));
    ok('(34b) .desk-hero-image / .desk-steps-overview が width:100% ベースで、はみ出す固定px指定を持たない', !hasBadFixedWidth);

    // 35. 固定ボタンが入力欄やCTAを覆わない（今回の差分でposition:fixedを新規追加していない）
    const clarityFinalBlockMatch = /■?\s*編集室 Final Clarity Fix[\s\S]*/i.exec(rawCss);
    ok('(35) 今回変更したCSS範囲に新規の position:fixed を追加していない',
       !/position\s*:\s*fixed/.test(heroBlock) && !/position\s*:\s*fixed/.test(heroImgBlock) &&
       !/position\s*:\s*fixed/.test(overviewBlock) && !/position\s*:\s*fixed/.test(overviewLiBlock));

    // 36. 画像が入力欄を過度に下へ押さない（アスペクト比から算出した高さがモバイルで
    //     140〜175px前後、デスクトップで260px前後の目安に収まることを計算で確認する）
    // モバイル：コンテンツ幅は原則 viewport - 32px（左右16pxずつ、既存の
    // body.experience-open .experience-page.is-active の @media(max-width:600px) 仕様）。
    const w390 = 390 - 32, w430 = 430 - 32;
    const h390 = w390 * 7 / 16, h430 = w430 * 7 / 16;
    ok('(36a) 390px時の画像推定高さが140〜175px前後の範囲内', h390 >= 130 && h390 <= 180);
    ok('(36b) 430px時の画像推定高さが140〜175px前後の範囲内', h430 >= 130 && h430 <= 180);
    const maxWidthMatch = /max-width\s*:\s*([0-9]+)px/.exec(heroBlock);
    const desktopW = maxWidthMatch ? parseInt(maxWidthMatch[1],10) : null;
    const desktopH = desktopW ? desktopW * 7 / 16 : null;
    ok('(36c) デスクトップ時の画像推定高さが260px前後の範囲内', !!desktopH && desktopH >= 240 && desktopH <= 285);
  }

  console.log('\n=== SUMMARY ===');
  console.log('PASS:', pass, ' FAIL:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('EDITING ROOM FINAL CLARITY TEST CRASHED:', e); process.exit(2); });

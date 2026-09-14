'use strict';
/* 共有されたときのカードの契約。
 *
 * 2026-09-14 以前、索引対象163ページのうち og:image を持っていたのは3ページだけで、
 * 催し43件には OGP が一つも無かった。Xに貼られたリンクは、カード画像の無い
 * ただの文字列として出ていた。表示が増えてもクリックにならない形だった。
 *
 * ここが固定するのは四つ。
 *  1. 索引に出すページは、共有されたときに何のページか分かる meta を持つ
 *  2. 扉は同一オリジンの 1200x630 ブランド画像ひとつ。ほかの製品の画像を借りない
 *  3. 扉を持つなら twitter:card は summary_large_image（summary だと小さく縮む）
 *  4. 催しの説明は1件ずつ違う。43件が同じ一文を名乗らない
 *
 * 実寸が 1200x630 であることは qa/release_check.js が PNG の IHDR を直接読んで見る。
 * ここでは重複させない。
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = require('../tools/build-design-redesign');

/* 契約は独立した文字列で持つ。tools/site-ogp.js を読み込んでしまうと、
   実装を変えたときに契約も一緒に動いて、何も検査しなくなる。 */
const IMAGE = 'https://emotionbookstore.com/assets/ogp-official-artwork-20260901.png';
const CARD = 'summary_large_image';
const FOREIGN = ['shop-seal.png', 'ogp-v2.jpg', 'ogp.png', 'emotion-bookstore.vercel.app'];

const failures = [];
const attr = (src, re) => (src.match(re) || [])[1];
const isNoindex = src => /name="robots" content="[^"]*noindex/.test(src);

let indexable = 0;
const eventDescriptions = new Map();

for (const page of pages) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) { failures.push(`${page}: missing`); continue; }
  const src = fs.readFileSync(file, 'utf8');

  /* noindex は「検索結果に出さない」であって「共有させない」ではない。
     suggest.html は noindex のまま扉を持つ（qa/release_check.js の既存契約）。
     だからここでは、noindex 一般にカードを禁じない。
     禁じるのは outings/ の、役目を終えて 404 にせず残してある URL だけである。
     あれは読者に配る場所ではないので、共有の扉を出さないと決めた。 */
  if (isNoindex(src)) {
    if (page.startsWith('outings/') && src.includes('property="og:image"')) {
      failures.push(`${page}: a retired outings URL must not advertise a share card`);
    }
    continue;
  }
  indexable++;

  for (const tag of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image',
                     'og:image:width', 'og:image:height', 'og:image:alt']) {
    if (!src.includes(`property="${tag}"`)) failures.push(`${page}: missing ${tag}`);
  }

  const image = attr(src, /property="og:image" content="([^"]*)"/);
  if (image && image !== IMAGE) failures.push(`${page}: og:image must be ${IMAGE}, got ${image}`);
  const w = attr(src, /property="og:image:width" content="([^"]*)"/);
  const h = attr(src, /property="og:image:height" content="([^"]*)"/);
  if (w !== '1200' || h !== '630') failures.push(`${page}: og:image must be declared 1200x630, got ${w}x${h}`);

  const card = attr(src, /name="twitter:card" content="([^"]*)"/);
  if (card !== CARD) failures.push(`${page}: twitter:card must be ${CARD}, got ${card}`);

  for (const foreign of FOREIGN) {
    if (src.includes(foreign)) failures.push(`${page}: must not borrow another product's image (${foreign})`);
  }

  /* カードに出るのは説明文である。空や極端に短い説明は、貼られても中身が伝わらない。 */
  const description = attr(src, /property="og:description" content="([^"]*)"/) || '';
  if (description.length < 20) failures.push(`${page}: og:description too short (${description.length})`);

  const url = attr(src, /property="og:url" content="([^"]*)"/) || '';
  if (!url.startsWith('https://emotionbookstore.com/')) {
    failures.push(`${page}: og:url must be an absolute emotionbookstore.com address, got ${url}`);
  }

  if (page.startsWith('outings/events/')) eventDescriptions.set(page, description);
}

/* 催し43件が同じ一文を名乗ると、カードを見ても何の催しか分からない。
   説明は hook・街・会場・日程から1件ずつ組まれる。重複はその回帰である。 */
{
  const seen = new Map();
  for (const [page, description] of eventDescriptions) {
    if (seen.has(description)) failures.push(`${page}: og:description repeats ${seen.get(description)}`);
    else seen.set(description, page);
  }
  if (eventDescriptions.size < 40) {
    failures.push(`expected the event pages to carry share cards, found ${eventDescriptions.size}`);
  }
}

if (indexable < 160) failures.push(`expected at least 160 indexable pages to carry a card, found ${indexable}`);

if (failures.length) {
  for (const f of failures) console.error('FAIL ' + f);
  console.error(`SOCIAL_CARD_FAIL: ${failures.length} problem(s)`);
  process.exit(1);
}
console.log(`PASS social cards: ${indexable} indexable pages, ${eventDescriptions.size} distinct event descriptions, one 1200x630 same-origin door`);

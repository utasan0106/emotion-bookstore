'use strict';
// 共有されたときのカード。リンクだけが貼られて中身が伝わらない状態をなくす。
//
// og:image は同一オリジンに置いた、ブランドの正規データから起こした 1200x630 の扉。
// ほかの製品の画像を借りない（qa/release_check.js の既存契約と同じ扉を使う）。
// 街の写真を使わないのは、縦長で 1200x630 に合わず、新しく切り直すことが
// Art Direction の判断になるためである。切り直した扉が用意されたら、ここを差し替える。
//
// twitter:card が summary だと、画像は小さな正方形に縮む。1200x630 の扉を
// 持っているなら summary_large_image が正しい。契約は qa/release_check.js が固定する。
const IMAGE = 'https://emotionbookstore.com/assets/ogp-official-artwork-20260901.png';
const WIDTH = 1200;
const HEIGHT = 630;
const ALT = 'みんなの感情書店';
const SITE_NAME = 'みんなの感情書店';
const CARD = 'summary_large_image';

const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// 扉そのもの。og:image を出すページは必ずこの4つを揃える。
// crawler は width/height を検証しないので、宣言と実寸の一致は release_check が見る。
function imageTags() {
  return `<meta property="og:image" content="${IMAGE}">`
    + `<meta property="og:image:width" content="${WIDTH}">`
    + `<meta property="og:image:height" content="${HEIGHT}">`
    + `<meta property="og:image:alt" content="${esc(ALT)}">`
    + `<meta name="twitter:card" content="${CARD}">`;
}

// ページ側で og:type/title/description/url を既に出している場合は imageTags() だけを足す。
// 何も無いページ（催しなど）はこちらで一式を出す。
function tags({title, description, url, type = 'website'}) {
  return `<meta property="og:type" content="${esc(type)}">`
    + `<meta property="og:site_name" content="${esc(SITE_NAME)}">`
    + `<meta property="og:title" content="${esc(title)}">`
    + `<meta property="og:description" content="${esc(description)}">`
    + `<meta property="og:url" content="${esc(url)}">`
    + imageTags();
}

module.exports = {IMAGE, WIDTH, HEIGHT, ALT, SITE_NAME, CARD, imageTags, tags};

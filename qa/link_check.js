'use strict';

/* 外部リンクの死活確認。
 *
 * この棚の約束は「行く前にわかること」と「公式へ行けること」なので、
 * 公式リンクが切れていたら、それは体裁の問題ではなく内容の誤りになる。
 * 2026-08-29、映画『街の上で』の公式ドメインが ERR_SSL_PROTOCOL_ERROR で
 * 落ちているのを Founder が実機で見つけた。静的検査では気づけない種類の壊れ方。
 *
 * ただし Claude の開発環境は proxy policy で全ての外部 host に届かない。
 * 届かないことを「切れている」と報告するのは嘘なので、この script は
 * 3値で答える:
 *
 *   OK             到達して 2xx/3xx が返った
 *   DEAD           到達したが、内容として壊れている（4xx/5xx、TLS 不正、名前解決不能）
 *   NOT OBSERVABLE proxy に止められていて、この環境からは判定できない
 *
 * DEAD が1つでもあれば exit 1。NOT OBSERVABLE は exit 0 だが、
 * 何件観測できなかったかを必ず出す。「全部 OK」と「全部見えていない」を
 * 同じ緑にしない。
 *
 * 使い方（外部ネットワークのある環境で）:
 *   node qa/link_check.js
 */

const path = require('path');
const fs = require('fs');
const vm = require('vm');

/* release_content.js は browser 向けに window へ代入する形なので、
   他の QA script と同じく sandbox に読み込む。require はできない。 */
const root = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'release_content.js'), 'utf8'), sandbox);
const CONTENT = sandbox.window.V3_RELEASE_CONTENT;
/* Thread の資料・現実への行き先も同じ扱い（thread_content.js も window へ代入する形）。 */
const threadSandbox = { window: {} };
vm.createContext(threadSandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'thread_content.js'), 'utf8'), threadSandbox);
const THREADS = (threadSandbox.window.V3_THREAD_CONTENT || {}).threads || [];

/* --- 検査対象の収集 ---------------------------------------------------- */

const targets = [];
function add(url, where) {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return;
  targets.push({ url, where });
}

for (const shelf of CONTENT.shelves) {
  for (const o of shelf.objects) {
    const at = `${shelf.id}/${o.id}`;
    add(o.actionUrl, `${at} actionUrl`);
    add(o.factsSourceUrl, `${at} factsSourceUrl`);
    /* rights は object 直下にある。media の中だと決めつけると、
       Commons の出典と CC deed を丸ごと取りこぼす。両方見る。 */
    const rights = o.rights || (o.media && o.media.rights);
    if (rights) {
      add(rights.sourceUrl, `${at} rights.sourceUrl`);
      add(rights.licenseUrl, `${at} rights.licenseUrl`);
    }
  }
}

/* html に直接書かれた外部リンクも拾う。content 側だけ見ていると
   suggest.html の公式 X のような手書きの href を取りこぼす。 */
for (const file of ['index.html', 'shelf.html', 'suggest.html', 'thread.html']) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  for (const m of src.matchAll(/href="(https?:\/\/[^"]+)"/g)) add(m[1], `${file} href`);
}

/* Thread: 資料（sources）と現実への行き先（realityDestinations）。 */
for (const t of THREADS) {
  for (const s of t.sources || []) add(s.url, `thread:${t.threadId} source ${s.id}`);
  for (const d of t.realityDestinations || []) add(d.url, `thread:${t.threadId} destination ${d.id}`);
}

/* 同じ URL を何度も叩かない。相手のサーバに対して礼儀がないし、
   どこで使われているかは1行にまとめた方が読みやすい。 */
const byUrl = new Map();
for (const t of targets) {
  if (!byUrl.has(t.url)) byUrl.set(t.url, []);
  byUrl.get(t.url).push(t.where);
}

/* --- 1件の判定 ---------------------------------------------------------- */

const { execFile } = require('child_process');

function probe(url) {
  return new Promise((resolve) => {
    /* HEAD を拒む server が実際にある（405 を返す）。その場合だけ GET に落とす。
       -L で redirect は追う。公式サイトは http -> https や www 付与を挟むことが多い。 */
    const args = ['-sS', '-o', '/dev/null', '-w', '%{http_code} %{url_effective}',
                  '-L', '--max-time', '25', '--retry', '1', '-A',
                  'emotion-bookstore-link-check/1.0', url];
    execFile('curl', ['-I', ...args], (err1, out1, errOut1) => {
      const first = parse(out1, errOut1, err1);
      if (first.verdict === 'OK' || first.verdict === 'NOT OBSERVABLE') return resolve(first);
      execFile('curl', args, (err2, out2, errOut2) => {
        const second = parse(out2, errOut2, err2);
        /* HEAD が 4xx/5xx でも GET が通るなら、利用者にとっては生きている。 */
        resolve(second.verdict === 'OK' ? second : worse(first, second));
      });
    });
  });
}

function parse(stdout, stderr, err) {
  const text = String(stderr || '') + String(err && err.message || '');
  /* proxy policy による遮断。到達していないので、内容の判定に使ってはいけない。 */
  if (/CONNECT tunnel failed|Received HTTP code 40[37] from proxy|connect_rejected/i.test(text)) {
    return { verdict: 'NOT OBSERVABLE', detail: 'proxy policy によりこの環境からは到達不可' };
  }
  const m = String(stdout || '').trim().match(/^(\d{3})\s*(\S*)/);
  const code = m ? Number(m[1]) : 0;
  const landed = m && m[2] ? m[2] : '';
  if (code >= 200 && code < 400) return { verdict: 'OK', detail: `${code}`, landed };
  if (code >= 400) return { verdict: 'DEAD', detail: `HTTP ${code}`, landed };

  /* code 0 = 応答なし。原因を分けて出す。TLS 不正は今回の machinouede.com の壊れ方。 */
  if (/SSL|TLS|certificate/i.test(text)) return { verdict: 'DEAD', detail: 'TLS エラー（証明書またはプロトコル不正）' };
  if (/Could not resolve host|name resolution/i.test(text)) return { verdict: 'DEAD', detail: '名前解決できない' };
  if (/Connection refused|Failed to connect|Couldn't connect to server/i.test(text)) return { verdict: 'DEAD', detail: '接続できない' };
  if (/Operation timed out|timed out/i.test(text)) return { verdict: 'DEAD', detail: 'タイムアウト' };
  return { verdict: 'NOT OBSERVABLE', detail: (text.split('\n')[0] || '原因不明').slice(0, 90) };
}

function worse(a, b) { return a.verdict === 'DEAD' ? a : b; }

/* --- 実行 --------------------------------------------------------------- */

(async () => {
  const urls = [...byUrl.keys()].sort();
  const dead = [];
  const unobserved = [];
  let ok = 0;

  for (const url of urls) {
    const r = await probe(url);
    const mark = r.verdict === 'OK' ? 'OK  ' : r.verdict === 'DEAD' ? 'DEAD' : '?   ';
    console.log(`${mark} ${url}  (${r.detail})`);
    for (const w of byUrl.get(url)) console.log(`       ${w}`);
    if (r.verdict === 'OK') ok++;
    else if (r.verdict === 'DEAD') dead.push({ url, r });
    else unobserved.push({ url, r });
  }

  console.log('');
  console.log(`checked=${urls.length} OK=${ok} DEAD=${dead.length} NOT_OBSERVABLE=${unobserved.length}`);

  if (dead.length) {
    console.log('');
    console.log('切れているリンク:');
    for (const d of dead) {
      console.log(`  ${d.url} — ${d.r.detail}`);
      for (const w of byUrl.get(d.url)) console.log(`      ${w}`);
    }
    console.log('');
    console.log('RELEASE_LINK_CHECK_FAIL');
    process.exit(1);
  }

  if (unobserved.length === urls.length) {
    console.log('RELEASE_LINK_CHECK_NOT_OBSERVABLE — 全て proxy に遮断された。この結果は GO ではない。');
    process.exit(0);
  }
  if (unobserved.length) {
    console.log(`RELEASE_LINK_CHECK_PARTIAL — ${unobserved.length}件が未観測。外部ネットワークのある環境で再実行する。`);
    process.exit(0);
  }
  console.log('RELEASE_LINK_CHECK_GO');
})();

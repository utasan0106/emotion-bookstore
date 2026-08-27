#!/usr/bin/env node
/**
 * Tokyo Pilot 01 — 外部 Human Test サイクルの gate
 *
 * 静的契約 / media 証跡 / 実ブラウザ QA をまとめて回し、
 * 一つの GO / NO-GO を出す。機械で確認できない前提条件も必ず表示する。
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node qa/cycle_gate.js [配信URL]
 *
 * 配信URL を渡すと、参加者へ配る 18 名分の URL も出す。
 *   例: node qa/cycle_gate.js https://example.vercel.app/v3-prototype/tokyo-pilot-01/
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const ORDERS = ['abc', 'acb', 'bac', 'bca', 'cab', 'cba'];

function run(label, cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  const out = ((r.stdout || '') + (r.stderr || '')).trimEnd();
  const ok = r.status === 0;
  console.log(`\n── ${label} ──`);
  console.log(out || '(no output)');
  if (r.error) console.log(`(実行できませんでした: ${r.error.message})`);
  return { ok, out };
}

const steps = [
  run('静的契約 / 事実の期限', process.execPath, ['pilot_check.js', '--external-cycle']),
  run('media 証跡（実バイト・寸法・SHA-256）', 'python', ['media_validate.py']),
  run('実ブラウザ QA', process.execPath, ['qa/browser_qa.js'])
];

const passed = steps.every(s => s.ok);

console.log('\n' + '='.repeat(64));
console.log(passed ? '機械 gate: GO' : '機械 gate: NO-GO');
console.log('='.repeat(64));

// 期限の残りを、GO のときも必ず見せる。
try {
  const vm = require('vm');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'pilot_content.js'), 'utf8'), sandbox);
  const dated = sandbox.window.TOKYO_PILOT_CONTENT.objects.filter(o => o.expiresAt);
  if (dated.length) {
    console.log('\n掲載事実の期限:');
    for (const o of dated) {
      const left = Math.floor((Date.parse(o.expiresAt) - Date.now()) / 3600000);
      const note = left < 0 ? '期限切れ — 再確認するまで参加者に出せない'
        : left < 48 ? `残り約 ${left} 時間 — サイクル中に切れないか確認する`
        : `残り約 ${left} 時間`;
      console.log(`  ${o.id}: ${o.expiresAt}  (${note})`);
    }
  }
} catch (e) {
  console.log('\n(期限の読み取りに失敗: ' + e.message + ')');
}

console.log(`
機械で確認できない前提条件 — これが済むまで参加者に見せない:

  公式一次情報を、サイクル直前に人が読み直す。
  変わっていたら verifiedAt / expiresAt / facts を更新してから、この gate を回し直す。

    カフェの営業         https://koenji-sankakuchitai.blog.jp/ManuscriptWritingCafe/
    ハチ公の展示記録     https://db.kahaku.go.jp/exh/detail?cls=col_z1_01&pkey=1759522
    目黒の開館・入館料   https://www.kiseichu.org/information

  確認できないものを推定で埋めない。読めなければサイクルを止めて記録する。`);

const baseUrl = process.argv[2];
if (baseUrl && passed) {
  const root = baseUrl.replace(/\/?(index\.html)?$/, '/');
  console.log('\n参加者へ配る URL（順序効果を相殺する固定割り当て）:\n');
  for (let i = 0; i < 18; i++) {
    const id = 'P' + String(i + 1).padStart(2, '0');
    console.log(`  ${id}  ${root}index.html?participant=1&order=${ORDERS[i % 6]}`);
  }
  console.log('\n記録は HUMAN_TEST_SCORECARD.csv に、匿名 ID のまま書く。');
} else if (!baseUrl) {
  console.log('\n（配信URL を引数に渡すと、参加者 18 名分の URL も出します）');
}

process.exit(passed ? 0 : 1);

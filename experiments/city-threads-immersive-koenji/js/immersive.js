/* City Threads Immersive — 高円寺 × 阿波おどり（層）
   native scroll のみ。scroll 中だけ rAF で層を更新し、idle 時は描画しない。
   外部通信・保存・計測なし。 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = $('stage'), layersEl = $('layers');
  const layers = Array.from(document.querySelectorAll('.layer'));
  const beats = Array.from(document.querySelectorAll('.beat'));
  const anchorYear = $('anchorYear'), anchorProgress = $('anchorProgress'), live = $('live');
  const TOTAL = 5;
  const NEAR = 220, DEEP = 380, MIN_OP = 0.12;

  if (!CSS.supports || !CSS.supports('transform-style', 'preserve-3d')) document.documentElement.classList.add('no-3d');

  /* ---- 状態 ---- */
  let p = 0;                 // 0..5 の連続量（時間の位置）
  let currentId = '';        // 到着している beat
  let currentYear = 2026;
  let nearIndex = -1;        // 資料に近づいている層
  let tween = null, ticking = false, motionTimer = 0;

  const cssNum = (name, fallback) => { const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); return Number.isFinite(v) ? v : fallback; };
  const depthScale = () => cssNum('--depth-scale', 1);
  const entranceIn = document.querySelector('#b0 .beat-in');
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---- scrollY → p：beat の中では停止、境界の手前 70vh から境界までで次の層へ移る（境界＝次の beat の上端で到着） ---- */
  function progressFromScroll() {
    const y = window.scrollY, vh = window.innerHeight;
    const tops = beats.map((b) => b.offsetTop);
    let v = 0;
    for (let i = 0; i < beats.length - 1; i++) {
      const boundary = tops[i + 1];
      const a = boundary - vh * 0.7, b = boundary;
      v = i + ease(clamp((y - a) / (b - a), 0, 1));
      if (y < b) break;
      v = i + 1;
    }
    return v;
  }

  /* ---- 層の配置：d = p − i。まだ来ていない層は手前から落ち着き、過ぎた層は奥へ沈んで薄く残る ---- */
  function layout() {
    const ds = depthScale(), rm = reduce() || document.documentElement.classList.contains('no-3d');
    const sox = cssNum('--stack-ox', 2.2), soy = cssNum('--stack-oy', 1.6);
    // Entrance の文（ヒント・層を開く）は First Pull が始まると静かに退く（mobile のみ。層の運動を隠さない）
    if (entranceIn && window.innerWidth < 900) entranceIn.style.opacity = clamp(1 - p * 2.5, 0, 1).toFixed(3);
    layers.forEach((el, i) => {
      const d = p - i;
      let z = 0, op = 1, sc = 1;
      if (rm) { op = Math.abs(d) < 0.5 ? 1 : MIN_OP; }
      else if (d < 0) { const t = clamp(-d, 0, 1); z = NEAR * t * ds; op = 1 - ease(t); sc = 1 + 0.06 * t; }
      else { z = -DEEP * d * ds; op = Math.max(MIN_OP, 1 - 0.55 * d); }
      if (i === 5 && op > 0.86) op = 0.86;                       // 現在の写真は最後、奥の層が透ける
      if (nearIndex >= 0) { if (i === nearIndex) { z = rm ? 0 : 140 * ds; op = 1; } else op = Math.min(op, 0.35); }
      // 過ぎた層はわずかに横へずれて積み重なる（紙の縁が見える）
      const ox = (i % 2 ? 1 : -1) * Math.min(2.4, Math.max(0, d)) * sox;
      const oy = -Math.min(2.4, Math.max(0, d)) * soy;
      el.style.transform = `translate3d(calc(-50% + ${ox}%), calc(-50% + ${oy}%), ${z.toFixed(1)}px) scale(${sc.toFixed(3)})`;
      el.style.opacity = op.toFixed(3);
      el.classList.toggle('is-here', Math.abs(d) < 0.5);
    });
  }

  /* ---- TIME_SHIFT：錨の年 ---- */
  function setYear(target, label) {
    target = Number(target);
    if (tween) cancelAnimationFrame(tween);
    const from = currentYear, dur = reduce() ? 0 : 400, start = performance.now();
    const step = (now) => {
      const t = dur ? clamp((now - start) / dur, 0, 1) : 1;
      anchorYear.textContent = String(Math.round(from + (target - from) * ease(t)));
      if (t < 1) tween = requestAnimationFrame(step);
      else { currentYear = target; tween = null; if (label) anchorYear.insertAdjacentHTML('beforeend', `<small>${label}</small>`); }
    };
    if (from === target) { anchorYear.textContent = String(target); if (label) anchorYear.insertAdjacentHTML('beforeend', `<small>${label}</small>`); return; }
    step(start);
  }

  /* ---- 到着：もっとも近い beat ---- */
  function arrive(node, silentHash) {
    if (!node || node.id === currentId) return;
    currentId = node.id;
    beats.forEach((b) => b.classList.toggle('is-here', b === node));
    const y = node.dataset.year, lab = node.dataset.yearLabel || '', stepN = Number(node.dataset.step);
    setYear(y, lab);
    const lab2 = (window.innerWidth < 900 && node.dataset.short) ? node.dataset.short : node.dataset.label;
    anchorProgress.innerHTML = stepN ? `<b>${stepN} / ${TOTAL}</b>　${lab2}` : '';
    live.textContent = stepN ? `${lab ? y + lab : y + '年'}。${stepN}／${TOTAL}、${node.dataset.label}` : '高円寺、2026年';
    if (!silentHash) history.replaceState(history.state, '', `#koenji/${stepN ? y : 'start'}`);
    if (stepN >= 1) $('trace').classList.add('is-gone'); else $('trace').classList.remove('is-gone');
  }
  function locate() {
    p = progressFromScroll();
    layout();
    const idx = clamp(Math.round(p), 0, beats.length - 1);
    arrive(beats[idx]);
  }

  /* ---- scroll：rAF は scroll 中だけ。idle では一切呼ばない ---- */
  function onScroll() {
    if (ticking) return;
    ticking = true;
    stage.classList.add('is-motion');
    clearTimeout(motionTimer);
    motionTimer = setTimeout(() => stage.classList.remove('is-motion'), 160);
    requestAnimationFrame(() => { ticking = false; locate(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { locate(); });

  /* ---- 移動 ---- */
  function go(id, instant) {
    const node = $(id);
    if (!node) return;
    node.scrollIntoView({ behavior: instant || reduce() ? 'instant' : 'smooth', block: 'start' });
    const h = node.querySelector('h2, h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    if (instant) locate();
  }
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));

  /* ---- 痕跡：写真の角に触れる → 文化の層が立ち上がる（TRACE_REVEAL） ---- */
  const trace = $('trace'), direction = $('direction');
  let opened = false;
  function openDirection() {
    if (opened) return;
    opened = true;
    direction.hidden = false;
    trace.classList.add('is-open');
    trace.setAttribute('aria-expanded', 'true');
    $('hint').textContent = '阿波おどり。この街に、69年ぶんの時間がある。';
    requestAnimationFrame(() => requestAnimationFrame(() => { direction.classList.add('is-open'); $('goOrigin').scrollIntoView({ block: 'nearest', behavior: reduce() ? 'instant' : 'smooth' }); }));
    live.textContent = '阿波おどり。1957年から2026年まで、5つの節目。';
  }
  trace.addEventListener('pointerdown', (e) => { if (e.button === 0) openDirection(); });
  trace.addEventListener('click', openDirection);
  trace.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDirection(); $('goOrigin').focus(); } });

  /* ---- 資料に近づく（EVIDENCE inspection）：dialog + 層が手前へ。Close で元の位置・フォーカスへ ---- */
  const dlg = $('inspect');
  let inspectFrom = null, inspectScroll = 0;
  function openInspect(plate, btn, push) {
    inspectFrom = btn; inspectScroll = window.scrollY;
    nearIndex = Number(plate.dataset.layer);
    $('inspectTitle').textContent = plate.dataset.title;
    $('inspectYear').textContent = plate.dataset.year;
    $('inspectSource').textContent = plate.dataset.source;
    $('inspectUrl').textContent = plate.dataset.url;
    $('inspectConfirms').textContent = plate.dataset.confirms;
    $('inspectKicker').innerHTML = `<b>${plate.querySelector('.lab b').textContent}</b>　資料に近づく`;
    stage.classList.remove('is-motion');
    layout();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    if (push) history.pushState({ inspect: true }, '', location.hash);
    live.textContent = `${plate.dataset.title} に近づきました。`;
  }
  function closeInspect() {
    if (!dlg.open) return;
    dlg.close();
    nearIndex = -1;
    layout();
    window.scrollTo({ top: inspectScroll, behavior: 'instant' });
    if (inspectFrom) inspectFrom.focus({ preventScroll: true });
    live.textContent = '元の年へ戻りました。';
  }
  document.querySelectorAll('[data-inspect]').forEach((btn) => btn.addEventListener('click', () => openInspect(btn.closest('.plate'), btn, true)));
  $('inspectClose').addEventListener('click', () => { if (history.state && history.state.inspect) history.back(); else closeInspect(); });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); $('inspectClose').click(); });   // Escape
  dlg.addEventListener('click', (e) => { if (e.target === dlg) $('inspectClose').click(); });
  window.addEventListener('popstate', () => { if (dlg.open && !(history.state && history.state.inspect)) closeInspect(); });

  /* ---- URL から復元 ---- */
  function restore() {
    const m = location.hash.replace(/^#/, '').match(/^koenji\/(start|\d{4})$/);
    if (m && m[1] !== 'start') {
      const b = beats.find((x) => x.dataset.year === m[1]);
      if (b) { go(b.id, true); return; }
    }
    locate();
  }
  // 出典と資料の畳み：Desktop は従来どおり開いた状態、mobile は畳む
  const fold = $('sourcesFold');
  if (fold && window.innerWidth >= 900) fold.open = true;
  const img = document.querySelector('.layer[data-i="0"] img');
  if (img && !img.complete) img.addEventListener('load', () => layout(), { once: true });
  restore();
})();

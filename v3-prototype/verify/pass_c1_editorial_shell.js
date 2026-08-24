/* =============================================================================
 * V3 PASS C1 — Two-slot public Editorial shell contract
 * Run: node verify/pass_c1_editorial_shell.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const editorialSource = read('js/public_editorial.js');
const contentSource = read('js/public_editorial_content.js');
const actionSource = read('js/action_destination.js');
const appSource = read('js/app.js');
const indexSource = read('index.html');
const cssSource = read('css/v3.css');
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function loadRuntime() {
  const opened = [];
  let createCount = 0;
  const document = {
    createElement(tag) {
      createCount += 1;
      return {
        tagName: tag,
        attrs: {},
        setAttribute(name, value) { this.attrs[name] = String(value); }
      };
    }
  };
  const window = {
    URL,
    document,
    open(url, target, features) {
      opened.push({ url, target, features });
      return { opener: 'initial' };
    }
  };
  vm.runInNewContext(actionSource, { window, URL, Object }, { filename: 'action_destination.js' });
  vm.runInNewContext(editorialSource, {
    window, URL, Object, Array, Date, RegExp, isNaN
  }, { filename: 'public_editorial.js' });
  return { E: window.V3_PUBLIC_EDITORIAL, window, opened, getCreateCount: () => createCount };
}

const shelves = [
  'hajimu', 'atatamaru', 'hikareru', 'shizumu',
  'zawatsuku', 'butsukaru', 'miwohiku', 'mada'
];
const options = { shelfIds: shelves, asOf: '2026-08-23' };

function baseRecord(slotType = 'fresh') {
  return {
    connection_id: `SYNTHETIC_${slotType.toUpperCase()}_01`,
    slot_id: `mada-${slotType}`,
    slot_type: slotType,
    content_type: 'book',
    shelf_id: 'mada',
    status: 'ready',
    headline: '検証用の編集接続',
    lead: '公開Editorial shellだけを確かめる合成テストです。',
    source_context: {
      label: '合成された公開文脈',
      summary: '実データや利用者の私的情報を含まない検証用要約です。'
    },
    target: {
      title: '合成ターゲット',
      kind: '本',
      creator: '検証者',
      release: '2026'
    },
    fact_anchor: '合成テストであることだけを事実アンカーにしています。',
    editorial_reason: '選択した棚と接続する表示構造だけを検証します。',
    editorial_note: '最終判断がhuman_approvedで明示されることを確かめます。',
    word_contour: '診断ではなく、公開編集の入口として扱います。',
    human_approved: true,
    primary_action: {
      type: 'official_page', nextAction: 'read', officiality: 'official',
      url: 'https://example.com/official', label: '公式ページを見る'
    },
    provenance: {
      source_name: 'Synthetic Authority',
      source_url: 'https://example.com/source',
      evidence_ref: 'SYNTHETIC_TEST_ONLY'
    },
    rights_status: 'approved',
    checked_at: '2026-08-20',
    recheck_at: '2026-12-31'
  };
}

function videoRecord(embedStatus) {
  const record = baseRecord('fresh');
  record.connection_id = `SYNTHETIC_VIDEO_${embedStatus.toUpperCase()}`;
  record.content_type = 'video';
  record.target.kind = '映像';
  record.primary_action = {
    type: 'official_viewing', nextAction: 'view', officiality: 'official',
    url: 'https://example.com/watch', label: '公式の映像を見る'
  };
  record.rights_status = embedStatus === 'link_only' ? 'link_only' : 'approved';
  record.video_provider = 'youtube';
  record.video_url = 'https://example.com/video-authority';
  record.video_title = '合成映像';
  record.creator_name = '合成制作者';
  record.thumbnail_display_basis = 'neutral_no_thumbnail';
  record.embed_status = embedStatus;
  record.official_fallback_url = 'https://example.com/watch';
  if (embedStatus === 'allowed') {
    record.video_embed_url = 'https://www.youtube-nocookie.com/embed/TEST_123';
  }
  return record;
}

const runtime = loadRuntime();
const E = runtime.E;
const contentWindow = {};
vm.runInNewContext(contentSource, { window: contentWindow, Object }, { filename: 'public_editorial_content.js' });

function boundedGeometry(viewport) {
  const surface = Math.min(1040, viewport - 32);
  const columns = viewport >= 700 ? 2 : 1;
  const gap = columns === 2 ? 12 : 0;
  const card = (surface - gap) / columns;
  return { viewport, surface, columns, card, overflow: surface > viewport || card <= 0 };
}

check('0 Editorial slots', E.resolveForShelf([], 'mada', options).items.length === 0);
check('1 Fresh slot', (() => {
  const items = E.resolveForShelf([baseRecord('fresh')], 'mada', options).items;
  return items.length === 1 && items[0].slot_type === 'fresh';
})());
check('1 Evergreen slot', (() => {
  const items = E.resolveForShelf([baseRecord('evergreen')], 'mada', options).items;
  return items.length === 1 && items[0].slot_type === 'evergreen';
})());
check('Fresh + Evergreen ordered and capped at two', (() => {
  const items = E.resolveForShelf([baseRecord('evergreen'), baseRecord('fresh')], 'mada', options).items;
  return items.length === 2 && items[0].slot_type === 'fresh' && items[1].slot_type === 'evergreen';
})());
check('wrong shelf never leaks', E.resolveForShelf([baseRecord('fresh')], 'hajimu', options).items.length === 0);

const hold = baseRecord('fresh'); hold.status = 'hold';
const expiredStatus = baseRecord('fresh'); expiredStatus.status = 'expired';
const stale = baseRecord('fresh'); stale.recheck_at = '2026-08-22';
const notHuman = baseRecord('fresh'); notHuman.human_approved = false;
check('hold does not render', E.resolveForShelf([hold], 'mada', options).items.length === 0);
check('expired status does not render', E.resolveForShelf([expiredStatus], 'mada', options).items.length === 0);
check('freshness-expired does not render', E.resolveForShelf([stale], 'mada', options).items.length === 0);
check('human_approved false does not render', E.resolveForShelf([notHuman], 'mada', options).items.length === 0);

const duplicate = baseRecord('fresh'); duplicate.connection_id = 'SYNTHETIC_FRESH_02'; duplicate.slot_id = 'mada-fresh-2';
const duplicateResult = E.resolveForShelf([baseRecord('fresh'), duplicate], 'mada', options);
check('duplicate slot fails closed', duplicateResult.items.length === 0 &&
  duplicateResult.rejected.some((item) => item.reasons.includes('DUPLICATE_SLOT_FAIL_CLOSED')));
const duplicateIdEvergreen = baseRecord('evergreen'); duplicateIdEvergreen.slot_id = 'mada-fresh';
check('duplicate slot_id across slot types fails closed',
  E.resolveForShelf([baseRecord('fresh'), duplicateIdEvergreen], 'mada', options).items.length === 0);

const noProvenance = baseRecord('fresh'); delete noProvenance.provenance;
check('missing provenance fails closed', E.resolveForShelf([noProvenance], 'mada', options).items.length === 0);
const privateField = baseRecord('fresh'); privateField.private_body = 'SYNTHETIC_PRIVATE_PLACEHOLDER';
check('private/raw-equivalent field fails closed', E.resolveForShelf([privateField], 'mada', options).items.length === 0);
const unknownField = baseRecord('fresh'); unknownField.unreviewed_payload = 'SYNTHETIC_UNKNOWN';
check('unknown record field fails closed', E.resolveForShelf([unknownField], 'mada', options).items.length === 0);
const externalVisual = baseRecord('fresh'); externalVisual.display_visual = {
  src: 'https://example.com/thumbnail.jpg', alt: '', rights_basis: 'synthetic'
};
check('external first-paint visual fails closed', E.resolveForShelf([externalVisual], 'mada', options).items.length === 0);

const linkOnly = E.resolveForShelf([videoRecord('link_only')], 'mada', options).items[0];
check('video link_only is active without iframe URL', Boolean(linkOnly) && linkOnly.video.embed_status === 'link_only' &&
  linkOnly.video.video_embed_url === null);
check('zero provider element/request before explicit click', runtime.getCreateCount() === 0 &&
  !/<iframe\b|rel=["'](?:preconnect|prefetch)/i.test(indexSource));
const linkMount = { firstChild: null, appendChild() { throw new Error('link_only must not append iframe'); } };
check('video link_only opens verified fallback only after click', E.activateVideo(linkOnly, linkMount) === true &&
  runtime.opened.length === 1 && runtime.opened[0].url === 'https://example.com/watch' &&
  runtime.opened[0].features === 'noopener,noreferrer' && runtime.getCreateCount() === 0);

const allowed = E.resolveForShelf([videoRecord('allowed')], 'mada', options).items[0];
const mount = {
  firstChild: null,
  appended: null,
  removeChild() {},
  appendChild(node) { this.appended = node; this.firstChild = node; }
};
check('approved embed URL uses intended privacy host', Boolean(allowed) &&
  allowed.video.video_embed_url.startsWith('https://www.youtube-nocookie.com/embed/'));
check('embed created only on explicit activation', runtime.getCreateCount() === 0 &&
  E.activateVideo(allowed, mount) === true && runtime.getCreateCount() === 1 &&
  mount.appended.attrs.src === allowed.video.video_embed_url);

const unknownVideo = videoRecord('unknown');
check('missing/unknown video rights = no broken player', E.resolveForShelf([unknownVideo], 'mada', options).items.length === 0);
const badEmbed = videoRecord('allowed'); badEmbed.video_embed_url = 'https://www.youtube.com/embed/TEST_123';
check('unapproved embed domain fails closed', E.resolveForShelf([badEmbed], 'mada', options).items.length === 0);

check('Product-active real Editorial registry intentionally empty', /records:\s*Object\.freeze\(\[\]\)/.test(contentSource));
check('public content schema version matches resolver contract',
  contentWindow.V3_PUBLIC_EDITORIAL_CONTENT.schema_version === E.SCHEMA_VERSION);
check('unapproved finalist facts absent from Product data', !/(Sayonara|Eric Bates|2011)/i.test(contentSource));
check('synthetic facts isolated to verifier', !/(合成ターゲット|Synthetic Authority)/.test(editorialSource + contentSource + appSource));
check('runtime module order is deterministic',
  indexSource.indexOf('./js/action_destination.js') < indexSource.indexOf('./js/public_editorial.js') &&
  indexSource.indexOf('./js/public_editorial.js') < indexSource.indexOf('./js/public_editorial_content.js') &&
  indexSource.indexOf('./js/public_editorial_content.js') < indexSource.indexOf('./js/app.js'));

check('Understanding mounts no placeholder when zero',
  appSource.includes('if (editorialItems.length) understandingChildren.push(publicEditorialShelf(editorialItems));'));
check('Understanding cards max at two', appSource.includes('items.slice(0, 2).map(publicEditorialCard)'));
check('Editorial slots remain separate from Outing deck count',
  appSource.includes("var deckCount = deckState === 'ready' ? realDeck.ids.length : 0;") &&
  appSource.includes('var editorialItems = activeEditorialForShelf(state.emotion);'));
check('browser Back route and quiet shelf return exist',
  appSource.includes("case 'editorial-detail':") && appSource.includes("return { back: 'understanding' };") &&
  appSource.includes("text: '棚へ戻る'"));
check('detail shell contains required editorial structure', [
  '言葉の輪郭', '編集部より', 'なぜ、これをここに？', '確認した事実', 'この棚とのつながり', '出典', '確認日'
].every((label) => appSource.includes(label)));
check('video first paint has no iframe creation in app renderer',
  !appSource.slice(appSource.indexOf('function surfaceEditorialDetail'), appSource.indexOf('function cardEditorialHook')).includes('createElement'));
check('explicit video control is required', appSource.includes("'data-video-activation': record.video.embed_status") &&
  appSource.includes('PUBLIC_EDITORIAL.activateVideo(record, media)'));
check('missing active detail fails closed to shelf',
  appSource.includes('if (!word || !record) return surfaceUnderstanding();') &&
  appSource.includes('function failClosedEditorialRoute()'));

check('visible focus uses existing global focus-visible contract', cssSource.includes(':focus-visible'));
check('Editorial touch targets >=44', cssSource.includes('.public-editorial-card-action') &&
  cssSource.includes('min-height: 44px;') && cssSource.includes('.public-editorial-primary'));
check('responsive 390/430/1440 CSS path is bounded', cssSource.includes('.public-editorial-grid') &&
  cssSource.includes('@media (min-width: 700px)') && cssSource.includes('@media (min-width: 900px)'));
['390', '430', '1440'].forEach((width) => {
  const geometry = boundedGeometry(Number(width));
  check(`${width}px deterministic Editorial geometry has no horizontal overflow`,
    geometry.overflow === false && geometry.surface <= geometry.viewport,
    JSON.stringify(geometry));
});
check('reduced-motion path remains present', cssSource.includes('@media (prefers-reduced-motion: reduce)'));
check('no network/analytics sender added', !/\bfetch\s*\(|XMLHttpRequest|sendBeacon|\bgtag\s*\(|dataLayer\.push/.test(editorialSource + contentSource + appSource));
check('no geolocation/external AI/login/cloud sync added',
  !/navigator\s*\.\s*geolocation|api\.openai|anthropic|generativelanguage|oauth|signIn|cloudSync/i
    .test(editorialSource + contentSource + appSource));

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);

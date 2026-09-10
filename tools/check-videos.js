#!/usr/bin/env node
'use strict';
// Ask YouTube whether a video is real, public and embeddable — without opening
// youtube.com. www.googleapis.com is reachable from the build environment even when
// the video pages are not, so the Data API answers the only questions the catalogue
// needs before an object can be published:
//
//   does the id resolve · is it public · can it be embedded · who published it
//
// The key is read from YOUTUBE_API_KEY and never printed, stored or committed. Set it
// as an environment variable on the environment, not in this repository.
//
//   node tools/check-videos.js <id|url> [...]
//   node tools/check-videos.js --catalogue          every id already published
//
// A row marked NG must not be published. "embeddable: false" means the owner has
// turned off embedding: the player would refuse to load even though the video exists,
// so it belongs on an external link, not in a click-to-load frame.

const key = process.env.YOUTUBE_API_KEY;
if (!key) {
  console.error('YOUTUBE_API_KEY is not set. Add it to the environment and run again.');
  console.error('Nothing was requested; no id was checked.');
  process.exit(2);
}

const idOf = value => {
  const direct = String(value).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(direct)) return direct;
  const m = direct.match(/(?:v=|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

const args = process.argv.slice(2);
let ids;
if (args.includes('--catalogue')) {
  // Everything the site publishes: city objects, the trailers attached to them, and
  // the short films, which live in their own list and are just as public. A mode
  // called --catalogue that quietly skipped a list would be worse than no mode.
  const { items, commonVideos } = require('./city-discovery-source');
  ids = [...new Set([
    ...items.flatMap(i => [i.videoId, i.trailerVideoId]),
    ...commonVideos.map(v => v.videoId),
  ].filter(Boolean))];
  console.error('公開中の ' + ids.length + '本を点検します（街の作品・予告編・短編集）。');
} else {
  const bad = args.filter(a => !idOf(a));
  if (!args.length || bad.length) {
    console.error(bad.length ? 'Not a video id or url: ' + bad.join(', ') : 'Give one or more video ids or urls, or --catalogue.');
    process.exit(2);
  }
  ids = [...new Set(args.map(idOf))];
}

// The API takes fifty ids per call, so a whole catalogue costs one or two requests.
const chunks = [];
for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));

(async () => {
  const found = new Map();
  for (const chunk of chunks) {
    const url = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,status,contentDetails'
      + '&id=' + chunk.join(',') + '&key=' + encodeURIComponent(key);
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      // Never echo the url back: it carries the key.
      console.error('YouTube API returned ' + res.status + '. ' + body.slice(0, 300));
      process.exit(1);
    }
    for (const item of (await res.json()).items || []) found.set(item.id, item);
  }

  let ng = 0;
  for (const id of ids) {
    const v = found.get(id);
    if (!v) { ng++; console.log('NG ' + id + '  存在しない、または非公開・削除済み'); continue; }
    const privacy = v.status.privacyStatus;
    const embeddable = v.status.embeddable;
    const ok = privacy === 'public' && embeddable;
    if (!ok) ng++;
    console.log((ok ? 'OK ' : 'NG ') + id
      + '  ' + privacy + (embeddable ? '' : ' / 埋め込み不可')
      + '\n      題名   : ' + v.snippet.title
      + '\n      公開元 : ' + v.snippet.channelTitle
      + '\n      公開日 : ' + v.snippet.publishedAt.slice(0, 10)
      + '\n      長さ   : ' + (v.contentDetails.duration || '').replace('PT', '').toLowerCase());
  }
  console.log('\n' + ids.length + '本を確認。公開・埋め込み可： ' + (ids.length - ng) + '本、要確認： ' + ng + '本。');
  console.log('公開元が権利者本人のチャンネルかどうかは、この結果からは判定できません。');
  process.exit(ng ? 1 : 0);
})().catch(err => { console.error(String(err && err.message || err).slice(0, 300)); process.exit(1); });

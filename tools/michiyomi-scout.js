'use strict';

/*
 * Read-only Michiyomi scout for editorial research.
 *
 * This tool never publishes candidates, downloads Mapillary images, or writes
 * product inventory. It checks coverage first, then returns nearby scene
 * metadata for human editorial review.
 */

const DEFAULT_BASE = 'https://michiyomi.dev';

function finiteNumber(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(name + ' must be a finite number');
  return n;
}

function positiveInt(value, name, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(name + ' must be an integer from ' + min + ' to ' + max);
  }
  return n;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (value == null || value.startsWith('--')) throw new Error('Missing value for --' + key);
    args[key] = value;
    i++;
  }
  const lat = finiteNumber(args.lat, 'lat');
  const lon = finiteNumber(args.lon, 'lon');
  if (lat < -90 || lat > 90) throw new Error('lat out of range');
  if (lon < -180 || lon > 180) throw new Error('lon out of range');
  return {
    lat,
    lon,
    radiusM: positiveInt(args.radius || '500', 'radius', 1, 1000),
    limit: positiveInt(args.limit || '12', 'limit', 1, 50),
    yearFrom: args['year-from'] == null ? null : positiveInt(args['year-from'], 'year-from', 2000, 2100),
    baseUrl: (args.base || DEFAULT_BASE).replace(/\/$/, '')
  };
}

function normalizeScene(scene, envelope) {
  if (!scene || scene.id == null) throw new Error('scene id is required');
  const captureYear = Number(scene.capture_year);
  if (!Number.isInteger(captureYear)) throw new Error('capture_year is required for scene ' + scene.id);
  if (!scene.image_page || !/^https:\/\/www\.mapillary\.com\//.test(scene.image_page)) {
    throw new Error('Mapillary source page is required for scene ' + scene.id);
  }
  return {
    sceneId: String(scene.id),
    captureYear,
    distanceM: Number.isFinite(Number(scene.distance_m)) ? Number(scene.distance_m) : null,
    summary: String(scene.summary || ''),
    imagePage: scene.image_page,
    generationId: scene.generation?.id || scene.generation_id || null,
    model: scene.model || null,
    snapshot: envelope.snapshot || null,
    attribution: envelope.license?.attribution || null,
    licenseId: envelope.license?.id || null
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'emotion-bookstore-michiyomi-research/1.0 (+https://emotionbookstore.com/)'
    }
  });
  if (!response.ok) {
    throw new Error('Michiyomi request failed ' + response.status + ': ' + url);
  }
  return response.json();
}

function buildUrl(baseUrl, path, params) {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }
  return url;
}

async function scout(options) {
  const common = {
    lat: options.lat,
    lon: options.lon,
    radius_m: options.radiusM
  };
  const coverageUrl = buildUrl(options.baseUrl, '/v1/coverage', {
    ...common,
    year_from: options.yearFrom
  });
  const coverage = await fetchJson(coverageUrl);

  const releasedCount = Number(
    coverage.released_count ??
    coverage.count ??
    coverage.n_scenes ??
    coverage.total ??
    0
  );

  let scenes = {
    snapshot: coverage.snapshot || null,
    license: coverage.license || null,
    results: []
  };

  if (releasedCount > 0 || Array.isArray(coverage.results)) {
    const scenesUrl = buildUrl(options.baseUrl, '/v1/scenes/nearby', {
      ...common,
      limit: options.limit,
      year_from: options.yearFrom
    });
    scenes = await fetchJson(scenesUrl);
  }

  return {
    source: 'michiyomi',
    fetchedAt: new Date().toISOString(),
    query: {
      lat: options.lat,
      lon: options.lon,
      radiusM: options.radiusM,
      limit: options.limit,
      yearFrom: options.yearFrom
    },
    coverage: {
      snapshot: coverage.snapshot || null,
      releasedCount: Number.isFinite(releasedCount) ? releasedCount : null,
      rawCountFields: {
        released_count: coverage.released_count ?? null,
        count: coverage.count ?? null,
        n_scenes: coverage.n_scenes ?? null,
        total: coverage.total ?? null
      }
    },
    candidates: (scenes.results || []).map(scene => normalizeScene(scene, scenes))
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await scout(options);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, normalizeScene, buildUrl, scout };

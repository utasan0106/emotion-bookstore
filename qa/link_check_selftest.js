'use strict';
const assert = require('assert');
const { parse, combine, decodeHtmlUrl } = require('./link_check');
let count = 0;
function verdict(response, expected) { assert.strictEqual(response.verdict, expected); count++; }
for (const status of [200, 204, 301]) verdict(parse(status + ' https://example.org/', '', null), 'OK');
for (const status of [404, 410]) verdict(parse(status + ' https://example.org/', '', null), 'DEAD');
for (const status of [401, 403, 405, 429, 500, 502, 503]) verdict(parse(status + ' https://example.org/', '', null), 'REVIEW');
for (const message of ['Operation timed out', 'Could not resolve host', 'SSL certificate problem', 'Failed to connect']) verdict(parse('000', message, new Error(message)), 'REVIEW');
verdict(parse('000', 'CONNECT tunnel failed', new Error('proxy')), 'NOT OBSERVABLE');
verdict(parse('302 https://example.org/', '', new Error('Maximum redirects followed')), 'REVIEW');
const p = code => parse(code + ' https://example.org/', '', null);
verdict(combine(p(404), p(200)), 'OK');
verdict(combine(p(405), p(200)), 'OK');
verdict(combine(p(404), p(404)), 'DEAD');
verdict(combine(p(410), p(410)), 'DEAD');
verdict(combine(p(404), p(403)), 'REVIEW');
verdict(combine(p(403), p(404)), 'REVIEW');
verdict(combine(p(404), { verdict: 'NOT OBSERVABLE', detail: 'proxy' }), 'REVIEW');
for (const [input, expected] of [
  ['https://example.org/?a=1&amp;b=2', 'https://example.org/?a=1&b=2'],
  ['https://example.org/?a=1&#38;b=2', 'https://example.org/?a=1&b=2'],
  ['https://example.org/?a=1&#x26;b=2', 'https://example.org/?a=1&b=2'],
  ['https://example.org/?a=&amp;#38;', 'https://example.org/?a=&#38;'],
  ['https://example.org/?a=&#99999999;', 'https://example.org/?a=&#99999999;']
]) { assert.strictEqual(decodeHtmlUrl(input), expected); count++; }
console.log(`LINK_CHECK_SELFTEST_GO (${count} checks; network requests 0)`);

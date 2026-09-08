'use strict';
const assert=require('node:assert/strict');
const inventory=require('../tools/catalogue-inventory')();
const {items,excludedItems}=require('../tools/city-discovery-source');
assert.equal(inventory.rows.length,16);
assert.equal(inventory.rows.reduce((n,r)=>n+r.published,0),items.length);
assert.equal(inventory.rows.reduce((n,r)=>n+r.held,0),excludedItems.length);
assert.equal(new Set(inventory.candidates.map(c=>c.id)).size,excludedItems.length);
const published=new Set(items.map(i=>i.city+'/'+i.id));
for(const candidate of inventory.candidates) {
  assert.equal(candidate.status,'hold');
  assert.equal(candidate.autoPublish,false);
  assert.ok(!published.has(candidate.id));
  assert.ok(candidate.reason&&candidate.nextCheck&&candidate.sources.length);
}
for(const row of inventory.rows) assert.ok(row.published<=10,'Split a collection before exceeding ten works');
console.log('PASS inventory: '+items.length+' published entries, '+excludedItems.length+' held candidates, 16 city/category cells; no auto-publication');

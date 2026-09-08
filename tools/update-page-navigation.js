'use strict';
const fs=require('node:fs'),path=require('node:path'),chrome=require('./page-chrome');
const root=path.resolve(__dirname,'..');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);
const files=[...fs.readdirSync(root).filter(f=>f.endsWith('.html')).map(f=>path.join(root,f)),...walk(path.join(root,'visit')),...walk(path.join(root,'v3-prototype/culture-experience-r2'))];
for(const f of files){const before=fs.readFileSync(f,'utf8'),after=chrome(before);if(process.argv.includes('--check')){if(before!==after)throw Error('Navigation missing '+f);}else fs.writeFileSync(f,after);}
console.log('PASS shared home/top navigation on '+files.length+' primary and experience pages');

#!/usr/bin/env node
'use strict';

const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const sitemapPath=path.join(root,'sitemap.xml');
const existing=fs.existsSync(sitemapPath)?fs.readFileSync(sitemapPath,'utf8'):'';
const old=new Map();
for(const m of existing.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)){
  const loc=m[1],body=m[2];
  old.set(loc,{
    lastmod:(body.match(/<lastmod>([^<]+)<\/lastmod>/)||[])[1]||'',
    changefreq:(body.match(/<changefreq>([^<]+)<\/changefreq>/)||[])[1]||'',
    priority:(body.match(/<priority>([^<]+)<\/priority>/)||[])[1]||''
  });
}
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const p=path.join(dir,e.name);
  return e.isDirectory()?walk(p):(e.name.endsWith('.html')?[p]:[]);
}):[];
const candidates=[
  path.join(root,'index.html'),
  path.join(root,'works.html'),
  ...fs.readdirSync(root).filter(n=>/^work-[a-z0-9-]+\.html$/.test(n)).map(n=>path.join(root,n)),
  path.join(root,'about.html'),
  ...walk(path.join(root,'visit')),
  ...walk(path.join(root,'discover')),
  ...walk(path.join(root,'outings'))
].filter(fs.existsSync);
let changed=new Set();
try{
  changed=new Set(cp.execFileSync('git',['diff','--name-only'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean));
}catch{}
const jstDate=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
const today=process.env.SITEMAP_DATE||jstDate();
const urls=new Map();
for(const file of candidates){
  const html=fs.readFileSync(file,'utf8');
  if(/<meta name="robots" content="[^"]*noindex/i.test(html)) continue;
  const canonical=(html.match(/<link rel="canonical" href="([^"]+)"/)||[])[1];
  if(!canonical||!canonical.startsWith('https://emotionbookstore.com/')||canonical.includes('?')) continue;
  const rel=path.relative(root,file).replace(/\\/g,'/');
  const prev=old.get(canonical)||{};
  const isChanged=changed.has(rel);
  const isHome=canonical==='https://emotionbookstore.com/';
  const isHub=/\/$/.test(canonical)||canonical.endsWith('/works.html');
  urls.set(canonical,{
    lastmod:isChanged||!prev.lastmod?today:prev.lastmod,
    changefreq:prev.changefreq||(isHome?'weekly':isHub?'weekly':'monthly'),
    priority:prev.priority||(isHome?'1.0':isHub?'0.8':'0.6')
  });
}
const esc=s=>String(s).replace(/&/g,'&amp;');
const out=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
for(const [loc,meta] of [...urls.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
  out.push('  <url>');
  out.push('    <loc>'+esc(loc)+'</loc>');
  if(meta.lastmod) out.push('    <lastmod>'+meta.lastmod+'</lastmod>');
  if(meta.changefreq) out.push('    <changefreq>'+meta.changefreq+'</changefreq>');
  if(meta.priority) out.push('    <priority>'+meta.priority+'</priority>');
  out.push('  </url>');
}
out.push('</urlset>','');
fs.writeFileSync(sitemapPath,out.join('\n'));
console.log('PASS sitemap refresh: '+urls.size+' canonical indexable pages');

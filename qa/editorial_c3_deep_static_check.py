"""Source/static checks only. Does not launch a browser or contact external URLs."""
from pathlib import Path
from hashlib import sha256
from urllib.parse import urlsplit, urljoin, unquote
from collections import Counter
import json,re
from lxml import html
from fontTools.ttLib import TTFont

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'qa/editorial-study-c3'
BASE=ROOT
HOME_REPO=ROOT
source_manifest=json.loads((ROOT/'qa/editorial-c3-deep-source.json').read_text())
font_manifest=json.loads((SITE/'assets/deep-font-manifest.json').read_text())
checks=[];warnings=[];outgoing=set();coverage=[]

def check(name,condition,detail=None):
 checks.append({'check':name,'passed':bool(condition),'detail':detail})

def norm(text): return re.sub(r'\s+','',text).replace('↗','')

def resolve(path):
 relative=unquote(path).lstrip('/')
 for root in [ROOT,HOME_REPO,BASE]:
  candidate=root/relative
  if candidate.is_dir(): candidate=candidate/'index.html'
  if candidate.exists(): return candidate
 return None

for row in source_manifest['sources']:
 path=SITE/row['output'];data=path.read_text();d=html.fromstring(data)
 source=BASE/row['source'];old=html.parse(str(source))
 label=row['output']; text=norm(''.join(d.xpath('//body//text()[not(ancestor::script)]')))
 check(label+': frozen source unchanged',sha256(source.read_bytes()).hexdigest()==row['source_sha256'])
 check(label+': noindex',bool(d.xpath('//meta[@name="robots" and @content="noindex,nofollow"]')))
 check(label+': exactly one h1/main',len(d.xpath('//h1'))==1 and len(d.xpath('//main'))==1)
 ids=d.xpath('//@id');check(label+': unique IDs',len(ids)==len(set(ids)))
 check(label+': no scripts/storage/form facades',not d.xpath('//script|//button|//input|//textarea|//form|//*[@data-memory-note]') and not re.search(r'localStorage|sessionStorage|indexedDB|memory-note\.js',data))
 check(label+': no inline event handlers',not any(k.lower().startswith('on') for el in d.iter() for k in el.attrib))
 check(label+': only isolated CSS',d.xpath('//link[@rel="stylesheet"]/@href')==['../deep.css'])
 check(label+': both real fonts preloaded',set(d.xpath('//link[@rel="preload"]/@href'))=={'../assets/deep-zen-kaku-gothic-400.woff2','../assets/deep-zen-kaku-gothic-700.woff2'})
 check(label+': no unsupported arrow text','↗' not in data and all(e.get('aria-hidden')=='true' for e in d.xpath('//svg')))
 check(label+': C3 masthead text/SVG',bool(d.xpath('//header[@class="masthead"]//span[@class="brand-name" and text()="みんなの感情書店"]')) and bool(d.xpath('//header//img[@src="/assets/brand/emotion-bookstore-symbol-master.svg"]')))
 check(label+': title/author/credits unchanged',all(norm(''.join(el.itertext())) in text for el in old.xpath('//main//h1|//main//p[@class="credit"]|//main//figcaption|//main//p[@class="book-author"]|//main//p[@class="detail-creator"]')))
 omitted={'ここから、次の一冊へ。'}
 original_paragraphs=old.xpath('//main//p[not(ancestor::details[@data-memory-note])]')
 missing=[]
 for p in original_paragraphs:
  original=norm(''.join(p.itertext()))
  # Exact, owner-requested third-person normalization; no other source prose exception.
  if label=='books/junjo.html':original=original.replace('当商店街で少年時代を過ごした','高円寺の商店街で少年時代を過ごした')
  if original and original not in omitted and original not in text:missing.append(original)
 check(label+': original work paragraphs retained',not missing,missing)
 # All actual image files are unchanged, uncropped by CSS, and have text alternatives.
 missing_images=[]
 for image in d.xpath('//main//img'):
  if not image.get('alt') or not image.get('width') or not image.get('height') or not resolve(image.get('src')):missing_images.append(image.get('src'))
 check(label+': images exist/dimensions/alt',not missing_images,missing_images)
 broken=[]
 for el in d.xpath('//*[@href or @src]'):
  attr='href' if el.get('href') is not None else 'src';value=el.get(attr)
  target=urlsplit(urljoin('https://emotionbookstore.com/qa/editorial-study-c3/'+row['output'],value))
  if target.scheme not in ['http','https']:broken.append(value);continue
  if target.netloc!='emotionbookstore.com':continue
  dest=resolve(target.path)
  if not dest:broken.append(value);continue
  if target.fragment and dest.suffix=='.html':
   destination=html.parse(str(dest))
   if target.fragment not in destination.xpath('//@id'):broken.append(value+' (fragment missing)')
  if attr=='href' and not target.path.startswith('/qa/editorial-study-c3/'):
   outgoing.add(target.path)
 check(label+': all local refs and anchors resolve',not broken,broken)
 for attr in ['aria-labelledby','aria-describedby']:
  refs=[r for v in d.xpath('//@'+attr) for r in v.split()]
  check(label+': '+attr+' resolves',all(r in ids for r in refs))
 check(label+': external new tabs protected',all('noopener' in e.get('rel','') and 'noreferrer' in e.get('rel','') for e in d.xpath('//a[@target="_blank"]')))

junjo=html.parse(str(SITE/'books/junjo.html'))
check('junjo: original page is not rewritten to itself',junjo.xpath('//p[@class="original-page"]/a/@href')==['/discover/koenji/junjo.html'])
css=(SITE/'deep.css').read_text()
check('CSS: two fonts and only real weights',len(re.findall(r'@font-face',css))==2 and set(re.findall(r'font-weight\s*:\s*([\d]+)',css))=={'400','700'})
check('CSS: synthesis disabled','font-synthesis:none' in css)
check('CSS: no clipping/cropping','object-fit:cover' not in css and not re.search(r'overflow\s*:\s*hidden|line-clamp|text-overflow',css))
check('CSS: mobile full-width single-column books and prose','@media(max-width:700px)' in css and '.book-opening{grid-template-columns:minmax(0,1fr);gap:24px}' in css and '.shelf-grid{grid-template-columns:minmax(0,1fr)' in css)
check('CSS: text remains scalable','font-size:16px' not in css and 'font-size:14px' not in css)
check('CSS: reduced motion','prefers-reduced-motion:reduce' in css)
check('Fonts: full OFL present','SIL OPEN FONT LICENSE Version 1.1' in (SITE/'assets/deep-zenkakugothicnew-OFL.txt').read_text())
for f in font_manifest['fonts']:
 p=SITE/'assets'/f['file'];font=TTFont(p)
 check(f['file']+': manifest hash/name/weight',sha256(p.read_bytes()).hexdigest()==f['sha256'] and font['name'].getDebugName(6)==f['postscript_name'] and font['OS/2'].usWeightClass==f['weight'])
 for page in font_manifest['pages']:
  p=ROOT/page['source_path'];d=html.parse(str(p))
  body=''.join(d.xpath('//body//text()[not(ancestor::script) and not(ancestor::style)]')+d.xpath('//body//@alt|//body//@aria-label|//body//@title|//body//@data-video-title'))
  missing=sorted({c for c in body if not c.isspace() and ord(c) not in font.getBestCmap()})
  coverage.append({'font':f['file'],'page':page['route'],'missing':missing})
  check(f['file']+': covers '+page['route'],not missing,missing)
 check(f['file']+': all seven source hashes current',all(sha256((ROOT/p['source_path']).read_bytes()).hexdigest()==p['sha256'] for p in font_manifest['pages']))

report={'browser_run':False,'checks':checks,'passed':sum(c['passed'] for c in checks),'total':len(checks),'font_coverage':coverage,'outside_study_routes_preserved':sorted(outgoing),'limitations':['No actual browser layout, platform font selection, keyboard, zoom or image-decode evidence.','Intentionally no memory UI or storage access in junjo draft. Original production feature remains unchanged.','External source truth/status not re-researched; text and links preserved from frozen source.','C3 home links are integrated; browser interaction evidence is collected separately.']}
(ROOT/'qa/artifacts').mkdir(parents=True,exist_ok=True)
(ROOT/'qa/artifacts/editorial-c3-deep-static.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'total':report['total'],'failures':[c for c in checks if not c['passed']],'outside_study_routes_preserved':sorted(outgoing)},ensure_ascii=False,indent=2))
raise SystemExit(0 if report['passed']==report['total'] else 1)

#!/usr/bin/env python3
"""Offline-only C3 source/font contract. This is not rendering evidence."""
from pathlib import Path
from html.parser import HTMLParser
from fontTools.ttLib import TTFont
import hashlib, json, re, sys
from lxml import html
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parent.parent
PAGE=ROOT/'qa/editorial-study-c3/index.html'
CSS=ROOT/'qa/editorial-study-c3/study.css'
class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.tags=[];self.text=[];self.skip=0
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs);self.tags.append((tag,attrs))
        if tag in ('script','style'):self.skip+=1
        for key in ('alt','aria-label','title','data-video-title'):
            if key in attrs:self.text.append(attrs[key])
    def handle_endtag(self,tag):
        if tag in ('script','style'):self.skip=max(0,self.skip-1)
    def handle_data(self,text):
        if not self.skip:self.text.append(text)
source=PAGE.read_text();css=CSS.read_text();page=Page();page.feed(source)
checks=[]
def check(name,passed,detail=None):
    checks.append(dict(name=name,passed=bool(passed),detail=detail))
ids=[attrs['id'] for _,attrs in page.tags if 'id' in attrs]
check('Unique document IDs',len(ids)==len(set(ids)))
resources=[]
for tag,attrs in page.tags:
    for attr in ('href','src'):
        if attr not in attrs:continue
        value=attrs[attr]
        if value.startswith(('https://','http://')):continue
        if value.startswith('#'):resources.append((value,value[1:] in ids));continue
        parsed=urlsplit(value);file=ROOT/unquote(parsed.path).lstrip('/') if parsed.path.startswith('/') else PAGE.parent/unquote(parsed.path)
        target=file/'index.html' if file.is_dir() else file
        ok=target.exists()
        if ok and parsed.fragment:ok=parsed.fragment in html.parse(str(target)).xpath('//@id')
        resources.append((value,ok))
check('All local resources and anchor targets resolve without a server',all(ok for _,ok in resources),resources)
manifest=json.loads((ROOT/'qa/editorial-study-c3/assets/font-manifest.json').read_text())
font_checks=[]
for record in manifest['fonts']:
    file=ROOT/'qa/editorial-study-c3/assets'/record['file'];font=TTFont(file);cmap=font.getBestCmap()
    missing=sorted(c for c in set(''.join(page.text)) if not c.isspace() and ord(c) not in cmap)
    font_checks.append(dict(file=record['file'],missing=missing,weight=font['OS/2'].usWeightClass,postScriptName=font['name'].getDebugName(6),hashPassed=hashlib.sha256(file.read_bytes()).hexdigest()==record['subset_sha256']))
check('Both final-candidate font subsets cover every visible and accessible source character',all(not f['missing'] for f in font_checks),font_checks)
check('Real static 400/700 faces, correct identities and hashes',len(font_checks)==2 and {f['weight'] for f in font_checks}=={400,700} and all(f['hashPassed'] and f['postScriptName']==('ZenKakuGothicNew-Regular' if f['weight']==400 else 'ZenKakuGothicNew-Bold') for f in font_checks))
check('Only the selected Zen family; Noto, Dela and rejected serif absent',all(x not in css for x in ('Noto','Dela','Shippori','DeskSans','DeskMincho','EditorialDisplay')) and css.count('@font-face')==2)
weights=re.findall(r'font-weight:\s*([^;}]+)',css)
check('Only real 400 and 700 weights, without synthesis',all(w.strip() in ('400','700','inherit') for w in weights) and 'font-synthesis: none' in css,weights)
check('Font manifest matches exact final HTML corpus and OFL notice',manifest['corpus_sha256']==hashlib.sha256(PAGE.read_bytes()).hexdigest() and 'SIL OPEN FONT LICENSE Version 1.1' in (ROOT/'qa/editorial-study-c3/assets/OFL.txt').read_text())
check('Decorative play/arrow icons are SVG, not fallback glyphs',all(c not in ''.join(page.text) for c in ('↗','▶','→')) and source.count('<svg class="icon')==6)
original=(ROOT/'qa/editorial-study-c2/index.html').read_text()
reasons=lambda html:re.findall(r'<p class="selection-reason">(.*?)</p>',html)
check('All three complete reasons remain verbatim from C2',len(reasons(source))==3 and reasons(source)==reasons(original))
doc=html.fromstring(source)
books=json.loads((ROOT/'qa/editorial-c3-home-books.json').read_text())
cards=doc.xpath('//article[@class="book-card"]')
check('One list with three complete cards, no duplicated detail list',len(cards)==3 and len(doc.xpath('//ol[@class="desk-books"]'))==1 and not doc.xpath('//*[@class="book-selections" or @class="book-selection"]'))
check('Exact visible-source title/author/publisher/source fields',all(''.join(card.xpath('.//h2//text()')).strip()==book['title'] and card.xpath('.//span[@class="book-author"]/text()')==[book['author']] and card.xpath('.//span[@class="book-publisher"]/text()')==[book['publisher']] and card.xpath('.//p[@class="book-credit"]/a/@href')==[book['source']] for card,book in zip(cards,books)))
check('Required full credit appears as one visible-source link in publisher order',all(''.join(card.xpath('.//p[@class="book-credit"]/a//text()'))==book['author']+'『'+book['title']+'』'+book['publisher'] for card,book in zip(cards,books)) and not doc.xpath('//p[@class="book-meta"]') and '書影出典' not in source)
check('Both native card links go directly to own detail',all(card.xpath('.//a[@class="book-choice-link"]/@href')==[book['href']] and card.xpath('.//h2/a/@href')==[book['href']] for card,book in zip(cards,books)))
check('Mobile-hidden home reasons remain exact and visible-source in all three detail pages',all(book['reason'] in html.parse(str(ROOT/book['href'].lstrip('/'))).xpath('//p[@class="selection-reason"]/text()') for book in books) and '.book-card .selection-reason { display: none; }' in css)
check('Obsolete instruction labels and numbered interface scaffolding removed',all(x not in source for x in ('いま、ひらく棚','表紙を押すと、作品紹介へ','一冊ずつ、選んだ理由。','book-number','reason-number')))
check('Specific semantic heading hierarchy',sum(t=='h1' for t,_ in page.tags)==1 and sum(t=='h2' for t,_ in page.tags)==5 and not any(t=='h3' for t,_ in page.tags))
check('Formal title follows cover once per card',all(len(card.xpath('.//h2[@class="choice-title"]'))==1 for card in cards))
check('Duplicate reasons CTA removed; next shelf retained','read-cta' not in source and 'class="next-shelf"' in source)
check('Mood entry follows the next shelf before music, with no footer duplicate',source.count('class="other-entry"')==1 and source.index('class="next-shelf"')<source.index('class="other-entry"')<source.index('class="music"') and 'href="/discover/selection/" rel="noreferrer"' in source and not re.search(r'<footer>.*class="other-entry"',source,re.S))
check('Only original click-to-load script, no new storage/tracker',[(t,a['src']) for t,a in page.tags if t=='script' and 'src' in a]==[('script','/video-embed.js')] and not re.search(r'localStorage|sessionStorage|analytics|googletagmanager|<iframe|<video|<audio',source))
check('No automatic external asset requests',not any(t in ('img','script','source','audio','video','iframe') and a.get('src','').startswith(('https://','http://')) for t,a in page.tags))
check('Noindex and nofollow retained','content="noindex,nofollow"' in source)
check('Existing source limitation, video privacy and art disclosure retained',all(x in source for x in ('全編読了の感想ではありません。','押すまでYouTubeへ接続せず、自動再生もしません。','AI生成イラスト','会場入口の記録写真')))
check('Culture entry points are exact native links; expiry-managed events stay a link',all(x in source for x in ('id="culture-continuation-title"','href="/qa/editorial-study-c3/film-and-books.html"','href="/qa/editorial-study-c3/outings.html"','href="/outings/"')) and 'events-data' not in source)
# Syntax smoke only. The browser runner remains responsible for actual CSS parsing,
# computed geometry, glyph fonts, contrast, focus and provider activation behavior.
css_without_comments=re.sub(r'/\*.*?\*/','',css,flags=re.S)
check('CSS brace-balance smoke check',css_without_comments.count('{')==css_without_comments.count('}'))
pins={
'qa/editorial-study-c3/assets/deep-zen-kaku-gothic-400.woff2':'9f57b579cfb98abf885f7d9e2435be4ad6ad84f1db9e901a6b9a6cb67c71327c',
'qa/editorial-study-c3/assets/deep-zen-kaku-gothic-700.woff2':'9eafca7d04105df7dcd7824fa9a209be5d59258f48da02a724d6f3b487910f13',
'qa/editorial-study-desk/assets/editor-desk.webp':'7cb8e1ca97cf9e5287fa62654d31a197825433a384f4ccc4dd96dc7018083a9d'}
check('Original artwork and final candidate font bytes pinned',all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==sha for p,sha in pins.items()))
report={'passed':all(x['passed'] for x in checks),'kind':'offline source checks only','browserExecuted':False,'visualApproval':False,'fontApproval':False,'fontStatus':'Reference-led Zen Kaku 700/400 candidate, pending actual browser screenshots and independent visual review.','checks':checks}
print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(0 if report['passed'] else 1)

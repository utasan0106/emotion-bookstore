#!/usr/bin/env python3
"""Offline-only C3 source/font contract. This is not rendering evidence."""
from pathlib import Path
from html.parser import HTMLParser
from fontTools.ttLib import TTFont
import hashlib, json, re, sys
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
        file=ROOT/value.lstrip('/') if value.startswith('/') else PAGE.parent/value
        resources.append((value,file.exists()))
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
check('Decorative play/arrow icons are SVG, not fallback glyphs',all(c not in ''.join(page.text) for c in ('↗','▶','→')) and source.count('<svg class="icon')==4)
original=(ROOT/'qa/editorial-study-c2/index.html').read_text()
reasons=lambda html:re.findall(r'<p class="selection-reason">(.*?)</p>',html)
check('All three complete reasons remain verbatim from C2',len(reasons(source))==3 and reasons(source)==reasons(original))
credits=lambda html:[re.sub('<[^>]+>','',x) for x in re.findall(r'<h[23] id="book-[^"]+">(.*?)</h[23]>',html)]
check('Author/title/publisher credits remain exact',len(credits(source))==3 and credits(source)==credits(original),credits(source))
check('Three native cover-to-reason links',all(re.search(r'class="book-choice-link" href="#book-'+x+r'-title" aria-label="[^"]+"',source) for x in ('one','two','three')))
check('Obsolete instruction labels and numbered interface scaffolding removed',all(x not in source for x in ('いま、ひらく棚','表紙を押すと、作品紹介へ','一冊ずつ、選んだ理由。','book-number','reason-number')))
check('Specific semantic heading hierarchy',sum(t=='h1' for t,_ in page.tags)==1 and sum(t=='h2' for t,_ in page.tags)==4 and not any(t=='h3' for t,_ in page.tags))
check('Three exact titles immediately follow their covers',all('<p class="choice-title">'+title+'</p>' in source for title in ('成瀬は天下を取りにいく','思わず考えちゃう','高円寺純情商店街')) and 'book-perspective' not in source)
check('Duplicate reasons CTA removed; next shelf retained','read-cta' not in source and 'class="next-shelf"' in source)
check('Off-theme entry remains outside primary content',re.search(r'<footer>.*href="/discover/selection/" rel="noreferrer"',source,re.S) is not None)
check('Only original click-to-load script, no new storage/tracker',[(t,a['src']) for t,a in page.tags if t=='script' and 'src' in a]==[('script','/video-embed.js')] and not re.search(r'localStorage|sessionStorage|analytics|googletagmanager|<iframe|<video|<audio',source))
check('No automatic external asset requests',not any(t in ('img','script','source','audio','video','iframe') and a.get('src','').startswith(('https://','http://')) for t,a in page.tags))
check('Noindex and nofollow retained','content="noindex,nofollow"' in source)
check('Existing source limitation, video privacy and art disclosure retained',all(x in source for x in ('全編読了の感想ではありません。','押すまでYouTubeへ接続しません。','AI生成イラスト','会場入口の記録写真')))
# Syntax smoke only. The browser runner remains responsible for actual CSS parsing,
# computed geometry, glyph fonts, contrast, focus and provider activation behavior.
css_without_comments=re.sub(r'/\*.*?\*/','',css,flags=re.S)
check('CSS brace-balance smoke check',css_without_comments.count('{')==css_without_comments.count('}'))
pins={
'qa/editorial-study-c3/assets/zen-kaku-gothic-400.woff2':'9fe94eb29da9e3713be2dd333619ee7f8dcd5eeb973514103f0c41d8b191e547',
'qa/editorial-study-c3/assets/zen-kaku-gothic-700.woff2':'de092db94395d22acf2dfa79e040ce32301c7085798ed9706702f872aeae4fee',
'qa/editorial-study-desk/assets/editor-desk.webp':'7cb8e1ca97cf9e5287fa62654d31a197825433a384f4ccc4dd96dc7018083a9d'}
check('Original artwork and final candidate font bytes pinned',all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==sha for p,sha in pins.items()))
report={'passed':all(x['passed'] for x in checks),'kind':'offline source checks only','browserExecuted':False,'visualApproval':False,'fontApproval':False,'fontStatus':'Reference-led Zen Kaku 700/400 candidate, pending actual browser screenshots and independent visual review.','checks':checks}
print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(0 if report['passed'] else 1)

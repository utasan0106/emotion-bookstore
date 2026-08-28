#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, subprocess
from datetime import datetime, timedelta
from pathlib import Path

HERE=Path(__file__).resolve().parent
PILOT=HERE.parents[1]
RUNTIME=[
 'index.html','pilot.css','pilot_content.js','pilot.js',
 'assets/manuscript-cafe.png','assets/hachiko.jpg','assets/meguro-tapeworm.jpg',
]
VISUAL_EVIDENCE=[
 'qa/art-reset/V3_TOKYO_ART_RESET_MOBILE_390.png',
 'qa/art-reset/V3_TOKYO_ART_RESET_DESKTOP_1440.png',
 'qa/art-reset/V3_TOKYO_ART_RESET_DETAIL_MOBILE_390.png',
 'qa/art-reset/V3_TOKYO_ART_RESET_DETAIL_DESKTOP_1440.png',
]
ROOT_CONTRACT=[
 'MEDIA_LOCALIZATION_EVIDENCE.json','MEDIA_ATTRIBUTION.md','PRODUCT_BET_20260827.md',
 'pilot_check.js','qa/browser_qa.js','qa/cycle_gate.js',
]
OPS=[
 'README.md','scorecard_template.csv','assignments.csv','moderator_sheet.md','recruitment_brief.md',
 'decision_matrix.md','analyze.py','test_analyze.py','preflight.py','prepare_workspace.py',
 'freeze.py','verify_freeze.py','test_freeze.py','preview_verify.js','preview_evidence.json',
]
OFFICIAL={
 'manuscript-cafe':'https://koenji-sankakuchitai.blog.jp/ManuscriptWritingCafe/',
 'hachiko-taxidermy':'https://db.kahaku.go.jp/exh/detail?cls=col_z1_01&pkey=1759522',
 'meguro-tapeworm':'https://www.kiseichu.org/information',
}

def sha(p):
    h=hashlib.sha256();
    with p.open('rb') as f:
        for c in iter(lambda:f.read(1024*1024),b''): h.update(c)
    return h.hexdigest()

def ts(v):
    d=datetime.fromisoformat(v)
    if d.tzinfo is None: raise argparse.ArgumentTypeError('timestamp needs timezone')
    return d

def git_head():
    cp=subprocess.run(['git','rev-parse','HEAD'],cwd=PILOT,capture_output=True,text=True)
    if cp.returncode: raise RuntimeError('freeze requires a git checkout so exact HEAD can be bound')
    return cp.stdout.strip()

def load_content():
    js="global.window={}; require('./pilot_content.js'); process.stdout.write(JSON.stringify(window.TOKYO_PILOT_CONTENT));"
    cp=subprocess.run(['node','-e',js],cwd=PILOT,capture_output=True,text=True,timeout=15)
    if cp.returncode: raise RuntimeError(cp.stderr)
    return json.loads(cp.stdout)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--cafe-verified-at',required=True,type=ts)
    ap.add_argument('--hachiko-verified-at',required=True,type=ts)
    ap.add_argument('--meguro-verified-at',required=True,type=ts)
    ap.add_argument('--max-age-minutes',type=int,default=120)
    ap.add_argument('--preview-url',required=True)
    ap.add_argument('--visual-gate',required=True,choices=['founder-go'])
    ap.add_argument('--note',default='')
    a=ap.parse_args(); now=datetime.now().astimezone(); maxage=timedelta(minutes=a.max_age_minutes)
    if not a.preview_url.startswith('https://') or '/v3-prototype/tokyo-pilot-01' not in a.preview_url:
        print('HUMAN_TEST_V3_FREEZE_FAIL'); print('FAIL - preview-url must be the exact HTTPS Tokyo Pilot Preview path'); return 1
    preview_evidence_path=HERE/'preview_evidence.json'
    if not preview_evidence_path.is_file():
        print('HUMAN_TEST_V3_FREEZE_FAIL'); print('FAIL - preview_evidence.json missing; run preview_verify.js first'); return 1
    preview_evidence=json.loads(preview_evidence_path.read_text(encoding='utf-8'))
    if preview_evidence.get('verdict')!='GO':
        print('HUMAN_TEST_V3_FREEZE_FAIL'); print('FAIL - Preview verification verdict is not GO'); return 1
    if preview_evidence.get('previewUrl','').rstrip('/') != a.preview_url.split('?')[0].rstrip('/'):
        print('HUMAN_TEST_V3_FREEZE_FAIL'); print('FAIL - preview evidence URL does not match --preview-url'); return 1
    try:
        preview_verified=datetime.fromisoformat(preview_evidence['verifiedAt'].replace('Z','+00:00'))
        if now-preview_verified.astimezone(now.tzinfo)>maxage:
            print('HUMAN_TEST_V3_FREEZE_FAIL'); print('FAIL - Preview verification is older than max-age'); return 1
    except Exception:
        print('HUMAN_TEST_V3_FREEZE_FAIL'); print('FAIL - invalid Preview verification timestamp'); return 1
    fresh={'manuscript-cafe':a.cafe_verified_at,'hachiko-taxidermy':a.hachiko_verified_at,'meguro-tapeworm':a.meguro_verified_at}
    errs=[]
    for oid,d in fresh.items():
        if d.astimezone(now.tzinfo)>now+timedelta(minutes=2): errs.append(f'{oid}: verified-at future')
        if now-d.astimezone(now.tzinfo)>maxage: errs.append(f'{oid}: verification older than {a.max_age_minutes}m')
    if errs:
        print('HUMAN_TEST_V3_FREEZE_FAIL'); [print('FAIL - '+e) for e in errs]; return 1

    current_head=git_head()
    if preview_evidence.get('sourceGitHead') != current_head:
        print('HUMAN_TEST_V3_FREEZE_FAIL'); print('FAIL - Preview verification was not run against current Git HEAD'); return 1
    # Preflight must be green on the exact files to be frozen.
    cp=subprocess.run(['python3',str(HERE/'preflight.py')],cwd=PILOT,capture_output=True,text=True,timeout=480)
    if cp.returncode or 'HUMAN_TEST_V3_PREFLIGHT_TECHNICAL_GO_MANUAL_FRESHNESS_REQUIRED' not in cp.stdout:
        print('HUMAN_TEST_V3_FREEZE_FAIL'); print(cp.stdout+cp.stderr); return 1

    files={}
    for rel in RUNTIME+ROOT_CONTRACT+VISUAL_EVIDENCE:
        p=PILOT/rel
        if not p.is_file(): raise RuntimeError('missing '+rel)
        files[rel]={'sha256':sha(p),'bytes':p.stat().st_size,'scope':'pilot'}
    for rel in OPS:
        p=HERE/rel
        if not p.is_file(): raise RuntimeError('missing ops '+rel)
        key='qa/human-test-v3/'+rel
        files[key]={'sha256':sha(p),'bytes':p.stat().st_size,'scope':'operator'}

    content=load_content(); objects=[]
    for o in content['objects']:
        r=o.get('rights') or {}
        objects.append({
            'id':o['id'],'hook':o['hook'],'reveal':o['reveal'],'actionUrl':o['actionUrl'],
            'mediaUrl':o['mediaUrl'],'rights':{
                'author':r.get('author'),'source':r.get('source'),'sourceUrl':r.get('sourceUrl'),
                'license':r.get('license'),'licenseUrl':r.get('licenseUrl'),'modification':r.get('modification'),
            },
            'manualVerifiedAt':fresh[o['id']].isoformat(),'manualEvidenceUrl':OFFICIAL[o['id']],
        })
    manifest={
        'schemaVersion':'tokyo-human-test-v3.1-freeze-1','cycle':'tokyo-pilot-01-cycle-01',
        'measurementVersion':'3.1','sourceGitHead':current_head,'frozenAt':now.isoformat(),
        'previewUrl':a.preview_url.split('?')[0],'previewVerifiedAt':preview_evidence.get('verifiedAt'),'previewMaxAgeMinutes':a.max_age_minutes,'visualGate':a.visual_gate,
        'scope':'isolated-human-test-only','productionPromotion':False,'objects':objects,'files':files,
        'manualFreshnessMaxAgeMinutes':a.max_age_minutes,'note':a.note,
    }
    canonical=json.dumps(manifest,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
    manifest['manifestSha256']=hashlib.sha256(canonical).hexdigest()
    (HERE/'freeze.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('HUMAN_TEST_V3_FREEZE_GO'); print('source_git_head='+manifest['sourceGitHead']); print('manifest_sha256='+manifest['manifestSha256'])
    return 0
if __name__=='__main__': raise SystemExit(main())

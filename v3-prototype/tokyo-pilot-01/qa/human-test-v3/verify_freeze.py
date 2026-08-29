#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, subprocess
from datetime import datetime, timedelta
from pathlib import Path
HERE=Path(__file__).resolve().parent; PILOT=HERE.parents[1]; FREEZE=HERE/'freeze.json'

def sha(p):
    h=hashlib.sha256();
    with p.open('rb') as f:
        for c in iter(lambda:f.read(1024*1024),b''): h.update(c)
    return h.hexdigest()

def main():
    if not FREEZE.is_file(): print('HUMAN_TEST_V3_FREEZE_VERIFY_FAIL\nFAIL - freeze.json missing'); return 1
    d=json.loads(FREEZE.read_text(encoding='utf-8')); errs=[]
    expected_self=d.get('manifestSha256')
    without_self=dict(d); without_self.pop('manifestSha256',None)
    canonical=json.dumps(without_self,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
    actual_self=hashlib.sha256(canonical).hexdigest()
    if expected_self != actual_self:
        errs.append(f'manifest self-hash mismatch: {actual_self} != {expected_self}')
    cp=subprocess.run(['git','rev-parse','HEAD'],cwd=PILOT,capture_output=True,text=True)
    if cp.returncode: errs.append('not a git checkout')
    elif cp.stdout.strip()!=d.get('sourceGitHead'): errs.append(f"git HEAD changed: {cp.stdout.strip()} != {d.get('sourceGitHead')}")
    for rel,m in d.get('files',{}).items():
        p=(PILOT/rel) if m.get('scope')=='pilot' else (HERE/rel.removeprefix('qa/human-test-v3/'))
        if not p.is_file(): errs.append('missing '+rel); continue
        if p.stat().st_size!=m.get('bytes') or sha(p)!=m.get('sha256'): errs.append('file identity changed: '+rel)
    now=datetime.now().astimezone(); maxage=timedelta(minutes=int(d.get('manualFreshnessMaxAgeMinutes',120))); expiries=[]
    for o in d.get('objects',[]):
        try: dt=datetime.fromisoformat(o['manualVerifiedAt']); exp=dt+maxage; expiries.append(exp)
        except Exception: errs.append('invalid manualVerifiedAt: '+str(o.get('id'))); continue
        if now>exp: errs.append(f"manual freshness expired: {o.get('id')} at {exp.isoformat()}")
    if errs:
        print('HUMAN_TEST_V3_FREEZE_VERIFY_FAIL'); [print('FAIL - '+e) for e in errs]; return 1
    print('HUMAN_TEST_V3_FREEZE_VERIFY_GO'); print('source_git_head='+d['sourceGitHead']); print('manifest_sha256='+d['manifestSha256']); print('frozen_files='+str(len(d['files']))); print('freshness_valid_until='+min(expiries).isoformat())
    return 0
if __name__=='__main__': raise SystemExit(main())

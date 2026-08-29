#!/usr/bin/env python3
from __future__ import annotations
import os, signal, subprocess, sys
from datetime import datetime
from pathlib import Path

HERE=Path(__file__).resolve().parent
PILOT=HERE.parents[1]
FAIL=[]; PASS=[]; MANUAL=[]

def run(label, cmd, cwd=None, timeout=240):
    print('CHECK - '+label, flush=True)
    env=os.environ.copy()
    # Claude's browser QA uses a system Playwright install in some runners. Preserve
    # an existing NODE_PATH, otherwise add the known system location if present.
    system_node = Path('/opt/node22/lib/node_modules')
    if 'NODE_PATH' not in env and system_node.exists():
        env['NODE_PATH'] = str(system_node)
    p=subprocess.Popen(cmd,cwd=cwd or PILOT,env=env,start_new_session=True)
    try: rc=p.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        try: os.killpg(p.pid,signal.SIGKILL)
        except ProcessLookupError: pass
        p.wait(); FAIL.append(f'{label}: timeout'); print('FAIL - '+label+' (timeout)'); return
    (PASS if rc==0 else FAIL).append(label if rc==0 else f'{label}: exit {rc}')
    print(('PASS - ' if rc==0 else 'FAIL - ')+label)

run('pilot_check_external_cycle',['node','pilot_check.js','--external-cycle'])
run('media_validate',['python3','media_validate.py'])
run('browser_qa',['node','qa/browser_qa.js'])
run('v3_analyzer_tests',['python3',str(HERE/'test_analyze.py')],cwd=HERE)
run('v3_scorecard_schema',['python3',str(HERE/'analyze.py'),str(HERE/'scorecard_template.csv'),'--json','/tmp/tokyo-v3-empty.json','--md','/tmp/tokyo-v3-empty.md'],cwd=HERE)
run('v3_freeze_tests',['python3',str(HERE/'test_freeze.py')],cwd=HERE)

# Local files cannot prove current truth. They can only block on known expiresAt.
text=(PILOT/'pilot_content.js').read_text(encoding='utf-8')
import re
for raw in re.findall(r"expiresAt:\s*'([^']+)'",text):
    try:
        if datetime.now().astimezone() >= datetime.fromisoformat(raw): FAIL.append(f'known expiresAt reached: {raw}')
    except Exception: FAIL.append(f'invalid expiresAt: {raw}')
MANUAL += [
 'Reverify Cafe schedule/rules on official source immediately before participant exposure.',
 'Reverify Hachiko current display/action on official source immediately before participant exposure.',
 'Reverify Meguro current operation/fact/action on official source immediately before participant exposure.',
]
print('HUMAN_TEST_V3_PREFLIGHT_'+('FAIL' if FAIL else 'TECHNICAL_GO_MANUAL_FRESHNESS_REQUIRED'))
for f in FAIL: print('FAIL - '+f)
for m in MANUAL: print('MANUAL - '+m)
raise SystemExit(1 if FAIL else 0)

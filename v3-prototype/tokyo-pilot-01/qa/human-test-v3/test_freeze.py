#!/usr/bin/env python3
# Unit-level freeze contract test that does not require browser QA or a network-capable environment.
import ast
from pathlib import Path
HERE=Path(__file__).resolve().parent
for name in ['freeze.py','verify_freeze.py','preflight.py','prepare_workspace.py','analyze.py']:
    ast.parse((HERE/name).read_text(encoding='utf-8'))
freeze=(HERE/'freeze.py').read_text(encoding='utf-8')
verify=(HERE/'verify_freeze.py').read_text(encoding='utf-8')
for required in ['sourceGitHead','manualFreshnessMaxAgeMinutes','tokyo-human-test-v3.1-freeze-1','previewUrl','visualGate','VISUAL_EVIDENCE','preview_evidence.json','previewMaxAgeMinutes','Preview verification was not run against current Git HEAD',"'scope':'pilot'","'scope':'operator'",'licenseUrl','modification']:
    assert required in freeze, required
assert 'git HEAD changed' in verify
assert 'file identity changed' in verify
assert 'manual freshness expired' in verify
assert 'manifest self-hash mismatch' in verify
print('HUMAN_TEST_V3_FREEZE_CONTRACT_GO')

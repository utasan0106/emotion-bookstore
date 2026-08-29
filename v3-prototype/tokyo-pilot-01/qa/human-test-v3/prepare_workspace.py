#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'scorecard_template.csv'
DST = ROOT / 'scorecard.local.csv'

if not SRC.is_file():
    print('WORKSPACE_PREP_FAIL - template missing')
    raise SystemExit(1)
if DST.exists():
    print('WORKSPACE_PREP_STOP - scorecard.local.csv already exists; refusing to overwrite participant data')
    raise SystemExit(2)
shutil.copyfile(SRC, DST)
print('HUMAN_TEST_V3_WORKSPACE_READY')
print(DST)
print('Raw participant rows remain local. Do not upload scorecard.local.csv to Drive/GitHub.')

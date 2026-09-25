#!/usr/bin/env python3
"""Liyue regressions; --full additionally traverses authored story branches."""
from pathlib import Path
import subprocess, json, os, sys
root=Path(__file__).resolve().parents[1]
files=['tests/test_save_v013.cjs','tests/v013/audit_liyue_cards.cjs','tests/v013/audit_liyue_targeted.cjs','tests/v013/audit_liyue_targeted_extra.cjs','tests/v013/liyue_final_semantic.cjs','tests/v013/test_fatui_cards.cjs','tests/v013/test_recruitment_ui_readonly.cjs','tests/v013/test_geo_offerings_zibai.cjs']
if '--full' in sys.argv:
 files+=['tests/v013/audit_geo_oculi.cjs','tests/v013/test_liyue_flow.cjs','tests/v013/test_recruitment.cjs','tests/v013/test_relationships.cjs']
results=[]
for file in files:
 run=subprocess.run(['node',file],cwd=root,env={**os.environ,'CRPG_TEST_RELATIONSHIPS':'1'},capture_output=True,text=True)
 results.append({'script':file,'exitCode':run.returncode,'stdout':run.stdout,'stderr':run.stderr})
 print(('PASS ' if run.returncode==0 else 'FAIL ')+file,flush=True)
(root/'reports/suite-v013-results.json').write_text(json.dumps({'scope':'Actual runtime with synthetic prerequisites. DOM is mocked; main battle path uses high stats; collection battle settlement is simulated. Not browser or difficulty QA.','results':results},ensure_ascii=False,indent=2))
sys.exit(any(r['exitCode'] for r in results))

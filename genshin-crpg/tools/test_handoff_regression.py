#!/usr/bin/env python3
"""Targeted regression runner for the v0.13.24 -> current gameplay handoff."""
from pathlib import Path
import subprocess,json,os,sys
root=Path(__file__).resolve().parents[1]
files=[
 'tests/test_combat.cjs',
 'tests/test_dvalin_story.cjs',
 'tests/test_andrius.cjs',
 'tests/test_inventory_presenter.cjs',
 'tests/test_shop_conditions_v08.cjs',
 'tests/test_shops_v09.cjs',
 'tests/test_save_revision.cjs',
 'tests/test_geography_v012.cjs',
 'tools/test_integration.js',
 'tools/test_offline.js',
 'tools/test_chasm_step1.cjs',
 'tools/test_chasm_dist.cjs',
 'tools/test_liyue_mora_step2.cjs',
 'tools/test_liyue_loot_step3.cjs',
 'tools/test_liyue_recruitment_step4.cjs',
 'tools/test_gameplay_step5.cjs',
 'tools/test_gameplay_step6_plus.cjs',
 'tools/test_gameplay_step7_ui.cjs',
 'tools/test_gameplay_step8_ui_assets.cjs',
 'tools/test_gameplay_step9_hotfix.cjs',
]
results=[]
for file in files:
 result=subprocess.run(['node',file],cwd=root,env={**os.environ,'CRPG_TEST_RELATIONSHIPS':'1'},capture_output=True,text=True)
 results.append({'script':file,'exitCode':result.returncode,'stdout':result.stdout,'stderr':result.stderr})
 print(('PASS ' if result.returncode==0 else 'FAIL ')+file)
report={
 'scope':'Handoff regression: combat UI, shops/smith, facility assets, geo quest visibility, Chasm, Liyue prior steps, Azhdaha, regional enhancement, build/offline cache.',
 'scripts':len(results),
 'passed':sum(r['exitCode']==0 for r in results),
 'failed':sum(r['exitCode']!=0 for r in results),
 'results':results
}
(root/'reports/handoff-regression.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:report[k] for k in ['scripts','passed','failed']},ensure_ascii=False))
sys.exit(1 if report['failed'] else 0)

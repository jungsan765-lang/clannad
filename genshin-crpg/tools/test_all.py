#!/usr/bin/env python3
"""Run bounded, passing regressions; full-route gates are explicitly separate."""
from pathlib import Path
import subprocess,json,os,sys
root=Path(__file__).resolve().parents[1]
files=['tests/test_nodes.js','tests/test_state.js','tests/test_story_isekai.js','tests/test_combat.cjs','tests/test_economy.cjs','tests/test_extra_cards.cjs','tests/test_mond_cards.cjs','tests/test_passives.cjs','tests/test_integrated_cards.cjs','tests/test_dvalin_story.cjs','tools/test_integration.js','tools/test_offline.js','tests/test_flow.cjs','tests/test_rules.cjs','tests/test_save_revision.cjs','tests/test_andrius.cjs','tests/test_party.cjs','tests/test_presentation.cjs','tests/test_av_metadata.cjs','tests/test_opening.cjs','tests/test_places.cjs','tests/test_inventory_presenter.cjs','tests/test_places_joint.cjs','tests/test_adventure.cjs','tests/test_quests_v07.cjs','tests/test_version.cjs','tests/test_legend_lodging_v08.cjs','tests/test_shop_conditions_v08.cjs','tests/test_playback_v08.cjs','tests/test_connection_v081.cjs','tests/test_story_v09.cjs','tests/test_shops_v09.cjs','tests/test_exploration_v09.cjs','tests/test_actions_v09.cjs','tests/test_music_v09.cjs','tests/test_balance_v09.cjs','tests/test_life_v010.cjs']
files.append('tests/test_life_ui_v010.cjs')
files.append('tests/test_release_v011.cjs')
files.extend(['tests/test_work_validation.cjs','tests/test_encounter_context.cjs','tests/test_geography_v012.cjs'])
results=[]
for file in files:
 result=subprocess.run(['node',file],cwd=root,env={**os.environ,'CRPG_TEST_RELATIONSHIPS':'1'},capture_output=True,text=True)
 results.append({'script':file,'exitCode':result.returncode,'stdout':result.stdout,'stderr':result.stderr})
 print(('PASS ' if result.returncode==0 else 'FAIL ')+file)
(root/'reports/suite-results.json').write_text(json.dumps({'scope':'Bounded regression suites. Includes current policy/rules/Andrius regressions. Full Mond route completion and real offline browser restart remain unverified.','results':results},ensure_ascii=False,indent=2))
sys.exit(any(r['exitCode'] for r in results))
files.append('tools/test_liyue_mora_step2.cjs')
files.append('tools/test_liyue_loot_step3.cjs')
files.append('tools/test_liyue_recruitment_step4.cjs')
files.append('tools/test_gameplay_step5.cjs')
files.append('tools/test_gameplay_step6_plus.cjs')
files.append('tools/test_gameplay_step7_ui.cjs')
files.append('tools/test_gameplay_step8_ui_assets.cjs')

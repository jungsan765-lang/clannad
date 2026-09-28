#!/usr/bin/env python3
"""Run current release gates; keep failure evidence."""
from pathlib import Path
import concurrent.futures, json, subprocess, time

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/release'
OUT.mkdir(parents=True, exist_ok=True)
subprocess.run(['python3', 'tools/build_server.py'], cwd=ROOT, check=True)
TESTS = [
    'tests/test_online_server.mjs', 'tests/test_authoritative_flow.mjs',
    'tests/test_reading_checkpoint.mjs', 'tests/test_action_recovery.mjs', 'tests/test_update_recovery.cjs', 'tests/test_engine_identity.py',
    'tests/test_combat_catalog_online.mjs', 'tests/test_action_feedback.cjs',
    'tests/test_online_bootstrap_v01343.cjs', 'tests/test_online_title_v01344.cjs',
    'tests/test_local_dev_config.cjs', 'tests/test_local_revision_v0141.cjs',
    'tests/test_story_edition_v0141.cjs', 'tests/test_balance_v0141.cjs', 'tests/test_local_revision_online_v0141.mjs',
    'tests/test_opening.cjs', 'tests/test_mond_content_v01344.cjs',
    'tests/test_mond_full_v01344.cjs', 'tests/test_save_v01344.cjs',
    'tests/test_save_revision.cjs', 'tests/test_work_validation.cjs',
    'tests/test_life_ui_v010.cjs', 'tests/test_playback_v08.cjs',
    'tests/test_presentation.cjs', 'tests/test_access_gear_v01343.cjs',
    'tests/test_gear_ui_v01343.cjs',
    *[f'tests/test_quality_fixes_v013{n}.cjs' for n in [35,36,37,38]],
    'tests/test_liyue_rework_mechanics.cjs', 'tests/test_liyue_rework_flow.cjs',
    'tools/test_field_bosses.cjs', 'tools/test_exclusive_weapons.cjs',
    'tests/test_update_v01341.cjs', 'tests/test_abyss_v01341.cjs',
    'tests/test_osial_v01341.cjs', 'tools/test_story_cleanup_v0140.cjs',
]
def run(test):
    started = time.monotonic()
    result = subprocess.run(['python3' if test.endswith('.py') else 'node', test], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=900)
    (OUT / (Path(test).name + '.log')).write_text(result.stdout)
    row = {'test':test, 'ok':result.returncode == 0, 'seconds':round(time.monotonic()-started, 1)}
    print(json.dumps(row), flush=True)
    return row

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(run, TESTS))
(OUT / 'results.json').write_text(json.dumps(results, indent=2))
raise SystemExit(any(not row['ok'] for row in results))

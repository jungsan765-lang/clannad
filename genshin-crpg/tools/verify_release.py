#!/usr/bin/env python3
"""Run current release gates; keep failure evidence."""
from pathlib import Path
import concurrent.futures, json, subprocess, time, sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/release'
OUT.mkdir(parents=True, exist_ok=True)
subprocess.run([sys.executable, 'tools/build_server.py'], cwd=ROOT, check=True)
TESTS = [
    'tests/test_durable_account.mjs', 'tests/test_durable_migration.mjs', 'tests/test_online_server.mjs', 'tests/test_authoritative_flow.mjs',
    'tests/test_reading_checkpoint.mjs', 'tests/test_action_recovery.mjs', 'tests/test_update_recovery.cjs', 'tests/test_engine_identity.py',
    'tests/test_combat_catalog_online.mjs', 'tests/test_action_feedback.cjs',
    'tests/test_online_bootstrap_v01343.cjs', 'tests/test_online_title_v01344.cjs',
    'tests/test_local_dev_config.cjs', 'tests/test_combat_v0142.cjs', 'tests/test_v0142_combat_summons.cjs', 'tests/test_local_revision_v0141.cjs',
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
    'tests/test_update_v01341.cjs', 'tests/test_abyss_v01341.cjs', 'tests/test_v0144.cjs', 'tests/test_v0148.cjs', 'tests/test_v01410.cjs', 'tests/test_v01411.cjs', 'tests/test_admin_v01412.mjs', 'tests/test_v01413.cjs', 'tests/test_v01415.cjs', 'tests/test_social_v01415.mjs',
    'tests/test_v0151.cjs', 'tests/test_letters_v0151.mjs',
    'tests/test_v0152.cjs', 'tests/test_balance_v0152.cjs', 'tests/test_server_v0152.mjs',
    'tests/test_v0153.cjs', 'tests/test_server_v0153.mjs',
    'tests/test_coop_v0153.cjs', 'tests/test_server_coop_v0153.mjs', 'tests/test_server_coop_world_v0159.mjs', 'tests/test_coop_world_ui_v0159.cjs',
    'tests/test_v0156.cjs', 'tests/test_v0157.cjs', 'tests/test_v0158.mjs',
    'tests/test_osial_v01341.cjs', 'tools/test_story_cleanup_v0140.cjs',
    'tests/test_main_story_k_v0148.cjs',
    'tests/test_fixed_region_live.mjs',
    'tests/test_server_account_audit_fixes.mjs', 'tests/test_server_social_audit_fixes.mjs',
    'tests/test_server_coop_audit_fixes.mjs', 'tests/test_client_audit_fixes.cjs',
    'tests/test_ui_audit_regressions.cjs', 'tests/test_test_banner_v01510.cjs', 'tests/test_version.cjs',
    'tests/test_test_release_pin.cjs', 'tests/test_test_release_transaction.cjs',
    'tests/test_server_capacity_audit_fixes.mjs', 'tests/test_social_concurrency_v01511.mjs',
    'tests/test_asset_followup.cjs', 'tests/test_client_social_followup.cjs',
    'tests/test_wish_ui_audit_fixes.cjs', 'tests/test_puzzle_ui_lifecycle.cjs',
    'tests/test_client_connection_recovery.cjs', 'tests/test_popup_lifecycle_v01512.cjs',
    'tests/test_server_coop_recovery_v01512.mjs',
    'tests/test_feature_boundaries_v01513.cjs', 'tests/test_ui_boundaries_v01513.cjs',
    'tests/test_settings_audio_v01513.cjs', 'tests/test_content_boundaries_v01513.cjs',
    'tests/test_release_isolation_v01513.cjs', 'tests/test_release_isolation_v01513.py',
    'tests/test_server_load_boundaries_v01513.mjs',
    'tests/test_story_asset_bindings.cjs',
    'tests/test_server_remaining_audit_v01513.mjs', 'tests/test_enemy_text_v01514.cjs',
    'tests/test_story_named_text_v01514.cjs', 'tests/test_v01515.cjs', 'tests/test_map_v01516.cjs', 'tests/test_v01517.cjs',
    'tests/v013/test_recruitment_cost_consistency.cjs',
]
def run(test):
    started = time.monotonic()
    result = subprocess.run([sys.executable if test.endswith('.py') else 'node', test], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=900)
    (OUT / (Path(test).name + '.log')).write_text(result.stdout)
    row = {'test':test, 'ok':result.returncode == 0, 'seconds':round(time.monotonic()-started, 1)}
    print(json.dumps(row), flush=True)
    return row

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(run, TESTS))
(OUT / 'results.json').write_text(json.dumps(results, indent=2))
raise SystemExit(any(not row['ok'] for row in results))

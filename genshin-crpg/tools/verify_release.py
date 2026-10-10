#!/usr/bin/env python3
"""Run current release gates; keep failure evidence."""
from pathlib import Path
import concurrent.futures, json, os, subprocess, time, sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/release'
OUT.mkdir(parents=True, exist_ok=True)
subprocess.run([sys.executable, 'tools/build_server.py'], cwd=ROOT, check=True)
TESTS = [
    'tests/test_growth_balance_v01621.cjs',
    'tests/test_noelle_healing_v01621.cjs',
    'tests/test_weekly_retirement_v01621.cjs',
    'tests/test_food_balance_v01620.cjs',
    'tests/test_reaction_fixes_v01619.cjs',
    'tests/test_control_grace_v01619.cjs',
    'tests/test_healing_v01619.cjs',
    'tests/test_shield_balance_v01619.cjs',
    'tests/test_shield_meter_v01619.cjs',
    'tests/test_shield_playback_v01619.cjs',
    'tools/test_boss_boundaries_v01619.cjs',
    'tools/test_other_healers_v01619.cjs',
    'tests/test_element_immunity_v01618.cjs',
    'tests/test_monster_control_fixes_v01618.cjs',
    'tools/test_field_boss_immunity_v01618.cjs',
    'tests/test_shop_supply_v01618.cjs',
    'tests/test_protagonist_support_v01618.cjs',
    'tests/test_food_lodging_v01617.cjs',
    'tests/test_material_rewards_v01616.cjs',
    'tests/test_inn_recovery_pricing_v01615.cjs',
    'tests/test_material_budget_v01615.cjs',
    'tests/test_ascension_balance_v01614.cjs',
    'tests/test_ascension_efficiency_v01613.cjs',
    'tests/test_starlight_price_v01613.cjs',
    'tests/test_katheryne_facility_v01613.cjs',
    'tests/test_task_wording_v01613.cjs',
    'tests/test_task_branches_v01612.cjs',
    'tests/test_task_branches_v01611.cjs',
    'tests/test_tasks_v0169.cjs', 'tests/test_task_catalog_v0169.cjs',
    'tests/test_task_learning_delivery_v0169.cjs', 'tests/test_task_board_v0169.cjs',
    'tests/test_battle_inspection_v0169.cjs', 'tests/test_skill_owner_v0169.cjs',
    'tests/test_live_actor_playback_v0169.cjs', 'tests/test_task_materials_v0169.cjs',
    'tools/audit_task_materials_v0169.cjs',
    'tests/test_combat_boundaries_v0168.cjs', 'tests/test_control_reactions_v0168.cjs',
    'tests/test_gear_effects_v0168.cjs', 'tests/test_food_economy_v0168.cjs',
    'tools/audit_economy_v0168.cjs',
    'tests/test_task_catalog_v0168.cjs', 'tests/test_tasks_expanded_v0168.cjs', 'tests/test_tasks_edge_v0168.cjs',
    'tests/test_xp_pacing_v0168.cjs', 'tests/test_coop_receipt_v0168.mjs', 'tests/test_playback_pause_v0168.cjs',
    'tests/test_defeat_settlement_v0166.cjs', 'tests/test_balance_saves_v0166.cjs',
    'tests/test_skill_fx_v0162.cjs', 'tests/test_rewards_balance_v0161.cjs', 'tests/test_growth_pacing_v0161.cjs', 'tests/test_server_coop_retry_v0161.mjs', 'tests/test_osial_pattern_v0161.cjs',
    'tests/test_life_v0162.cjs', 'tests/test_life_v010.cjs',
    'tests/test_v01525.cjs', 'tests/test_v01524.cjs', 'tests/test_combat_stalemate_v01523.cjs', 'tests/test_tutorial_v01523.cjs', 'tests/test_tutorial_online_v01523.mjs', 'tests/test_growth_v01522.cjs', 'tests/test_growth_online_v01522.mjs', 'tests/test_growth_balance_v01522.cjs',
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
    'tests/test_coop_world_v0160.cjs', 'tests/test_server_coop_roam_v0160.mjs', 'tests/test_coop_world_screen_v0160.cjs', 'tests/test_freeze_v0160.cjs', 'tests/test_battle_lines_v0162.cjs', 'tests/test_landmarks_v0163.cjs', 'tests/test_v0164.cjs', 'tests/test_vfx_v0165.cjs', 'tests/test_v0167.cjs',
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
    'tests/test_story_named_text_v01514.cjs', 'tests/test_v01515.cjs', 'tests/test_map_v01516.cjs', 'tests/test_v01517.cjs', 'tests/test_v01518.cjs', 'tests/test_v01519.cjs', 'tests/test_v01520.cjs', 'tests/test_v01521.cjs',
    'tests/v013/test_recruitment_cost_consistency.cjs',
]
# Runtime hints from the last full successful CI run. They are only used to balance
# independent GitHub Actions shards; unknown/new tests still run and get a neutral cost.
TEST_COST_HINTS = {
    "tests/test_liyue_rework_flow.cjs": 339.5,
    "tests/test_mond_full_v01344.cjs": 234.3,
    "tests/test_v01525.cjs": 193.2,
    "tests/test_action_recovery.mjs": 174.1,
    "tests/test_server_load_boundaries_v01513.mjs": 97.7,
    "tests/test_xp_pacing_v0168.cjs": 96.4,
    "tests/test_v01415.cjs": 86.0,
    "tests/test_feature_boundaries_v01513.cjs": 74.1,
    "tests/test_server_coop_v0153.mjs": 63.6,
    "tests/test_server_coop_roam_v0160.mjs": 63.3,
    "tests/test_server_coop_audit_fixes.mjs": 59.3,
    "tests/test_control_reactions_v0168.cjs": 53.5,
    "tests/test_update_v01341.cjs": 52.8,
    "tests/test_letters_v0151.mjs": 52.7,
    "tests/test_liyue_rework_mechanics.cjs": 51.8,
    "tests/test_coop_receipt_v0168.mjs": 46.0,
    "tests/test_growth_v01522.cjs": 44.6,
    "tests/test_server_account_audit_fixes.mjs": 41.8,
    "tests/test_v0153.cjs": 39.9,
    "tests/test_skill_fx_v0162.cjs": 39.5,
    "tests/test_tasks_v0169.cjs": 38.4,
    "tests/test_life_v0162.cjs": 37.7,
    "tests/test_skill_owner_v0169.cjs": 37.6,
    "tests/test_server_coop_recovery_v01512.mjs": 37.4,
    "tests/test_growth_pacing_v0161.cjs": 36.3,
    "tests/test_abyss_v01341.cjs": 35.3,
    "tests/test_coop_v0153.cjs": 33.4,
    "tests/test_story_asset_bindings.cjs": 33.4,
    "tests/test_task_materials_v0169.cjs": 33.1,
    "tools/test_field_bosses.cjs": 33.0,
    "tests/test_admin_v01412.mjs": 28.7,
    "tests/test_server_v0152.mjs": 28.4,
    "tests/test_balance_v0152.cjs": 27.5,
    "tests/test_v0152.cjs": 27.0,
    "tests/test_tutorial_v01523.cjs": 26.4,
    "tests/test_social_concurrency_v01511.mjs": 25.8,
    "tests/test_social_v01415.mjs": 25.4,
    "tests/test_save_revision.cjs": 24.0,
    "tests/test_combat_boundaries_v0168.cjs": 23.8,
    "tests/test_food_economy_v0168.cjs": 23.4,
    "tests/test_rewards_balance_v0161.cjs": 22.0,
    "tests/test_balance_saves_v0166.cjs": 21.8,
    "tests/test_balance_v0141.cjs": 21.1,
    "tests/test_reading_checkpoint.mjs": 20.4,
    "tests/v013/test_recruitment_cost_consistency.cjs": 19.8,
    "tests/test_server_social_audit_fixes.mjs": 19.6,
    "tests/test_opening.cjs": 18.4,
    "tests/test_task_learning_delivery_v0169.cjs": 17.6,
    "tests/test_life_v010.cjs": 17.4,
    "tests/test_coop_world_v0160.cjs": 17.0,
}
SHARD_COUNT = int(os.environ.get('CRPG_TEST_SHARD_COUNT', '1'))
SHARD_INDEX = int(os.environ.get('CRPG_TEST_SHARD_INDEX', '0'))
if SHARD_COUNT < 1 or not 0 <= SHARD_INDEX < SHARD_COUNT:
    raise SystemExit(f'invalid test shard {SHARD_INDEX}/{SHARD_COUNT}')

def shard_tests(tests):
    if SHARD_COUNT == 1:
        return tests
    shards = [[] for _ in range(SHARD_COUNT)]
    loads = [0.0] * SHARD_COUNT
    for test in sorted(tests, key=lambda name: (-TEST_COST_HINTS.get(name, 1.0), name)):
        target = min(range(SHARD_COUNT), key=lambda index: (loads[index], index))
        shards[target].append(test)
        loads[target] += TEST_COST_HINTS.get(test, 1.0)
    selected = shards[SHARD_INDEX]
    print(json.dumps({
        'kind': 'release_test_shard',
        'index': SHARD_INDEX,
        'count': SHARD_COUNT,
        'tests': len(selected),
        'hintSeconds': round(loads[SHARD_INDEX], 1),
    }), flush=True)
    return selected

TESTS = shard_tests(TESTS)

def run(test):
    started = time.monotonic()
    result = subprocess.run([sys.executable if test.endswith('.py') else 'node', test], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=900)
    (OUT / (Path(test).name + '.log')).write_text(result.stdout)
    row = {'test':test, 'ok':result.returncode == 0, 'seconds':round(time.monotonic()-started, 1)}
    print(json.dumps(row), flush=True)
    return row

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(run, TESTS))
result_name = 'results.json' if SHARD_COUNT == 1 else f'results-shard-{SHARD_INDEX + 1}-of-{SHARD_COUNT}.json'
(OUT / result_name).write_text(json.dumps(results, indent=2))
raise SystemExit(any(not row['ok'] for row in results))

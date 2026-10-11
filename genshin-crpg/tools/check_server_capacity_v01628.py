#!/usr/bin/env python3
"""Focused performance-release regressions; never connects to a deployed server."""
import concurrent.futures
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/capacity-v01628/regression'
TESTS = [
    'tests/test_runtime_capacity_v01628.cjs',
    'tests/test_server_capacity_v01628.mjs',
    # Shared source changes also affect immutable historical-engine overlays.
    # Keep their real old-source replay gates in this focused optimization run.
    'tests/test_enemy_balance_v01627.cjs',
    'tests/test_boss_difficulty_scope_v01624.cjs',
    'tests/test_character_balance_v01625.cjs',
    'tests/test_balance_saves_v0166.cjs',
    'tests/test_rewards_balance_v0161.cjs',
    'tests/test_material_budget_v01615.cjs',
    'tests/test_balance_v0141.cjs',
    'tests/test_balance_v0152.cjs',
    'tests/test_fixed_region_live.mjs',
    'tests/test_admin_balance_v01623.mjs',
    'tests/test_admin_balance_growth_v01623.mjs',
    'tests/test_server_capacity_audit_fixes.mjs',
    'tests/test_server_load_boundaries_v01513.mjs',
    'tests/test_server_remaining_audit_v01513.mjs',
    'tests/test_server_account_audit_fixes.mjs',
    'tests/test_server_social_audit_fixes.mjs',
    'tests/test_server_coop_audit_fixes.mjs',
    'tests/test_server_coop_recovery_v01512.mjs',
    'tests/test_server_coop_retry_v0161.mjs',
    'tests/test_server_coop_roam_v0160.mjs',
    'tests/test_social_concurrency_v01511.mjs',
    'tests/test_letters_v0151.mjs',
    'tests/test_growth_online_v01522.mjs',
    'tests/test_authoritative_flow.mjs',
    'tests/test_reading_checkpoint.mjs',
    'tests/test_action_recovery.mjs',
    'tests/test_durable_account.mjs',
    'tests/test_engine_identity.py',
    'tests/test_release_isolation_v01513.py',
    'tests/test_content_boundaries_v01513.cjs',
    'tests/test_test_release_pin.cjs',
    'tests/test_test_release_transaction.cjs',
]

def run(test):
    start = time.monotonic()
    command = [sys.executable if test.endswith('.py') else 'node', test]
    try:
        result = subprocess.run(command, cwd=ROOT, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=900)
        (OUT / (Path(test).name + '.log')).write_text(result.stdout)
        row = {'test': test, 'ok': result.returncode == 0,
               'exitCode': result.returncode, 'seconds': round(time.monotonic() - start, 2)}
    except subprocess.TimeoutExpired as error:
        (OUT / (Path(test).name + '.log')).write_bytes(error.stdout or b'')
        row = {'test': test, 'ok': False, 'exitCode': None, 'timeout': True}
    print(json.dumps(row), flush=True)
    return row

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    subprocess.run([sys.executable, 'tools/build_server.py'], cwd=ROOT, check=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(run, TESTS))
    (OUT / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
    raise SystemExit(any(not row['ok'] for row in results))

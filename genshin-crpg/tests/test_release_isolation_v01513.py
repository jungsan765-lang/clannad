#!/usr/bin/env python3
"""Player builds exclude test fixtures and editorial history without deleting story prose."""
import argparse
import copy
import json
import os
import re
import runpy
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from release_isolation import assert_release_tree, player_release_notes
from runtime_data import clean_runtime_db, EDITORIAL_TABLES

parser = argparse.ArgumentParser()
parser.add_argument('--built', type=Path)
parser.add_argument('--server', type=Path)
args, unittest_args = parser.parse_known_args()
QA_RESULT = re.compile(r'검사했습니다|검증\s*완료|검사\s*완료|점검\s*완료|테스트\s*통과|QA\s*완료|화면\s*검사는\s*별도')

class ReleaseIsolation(unittest.TestCase):
    def test_editorial_rows_are_removed_without_mutating_source_or_story(self):
        raw = json.loads((ROOT / 'content/db.json').read_text())
        original = copy.deepcopy(raw)
        cleaned, excluded = clean_runtime_db(raw)
        self.assertEqual(raw, original)
        self.assertEqual(EDITORIAL_TABLES, {'28_CANON_AUDIT', '40_CRPG_MIGRATION_PLAN'})
        for name in EDITORIAL_TABLES:
            self.assertGreater(len(raw[name]), 1)
            self.assertEqual(cleaned[name], raw[name][:1])
            self.assertIn(name, excluded)
        # Keep every story/canon/rules sheet, including ordinary words such as '검사'.
        # The two existing state-default sheets are sanitized cell by cell.
        for name in raw:
            if name not in excluded and name not in ('24_CURRENT_STATE', '07_CHAR_DB'):
                self.assertEqual(cleaned[name], raw[name], name)
        for name in ('15_INVENTORY_STATE', '25_CURRENT_ROSTER', '98_SAVE_META'):
            if name in raw:
                self.assertEqual(cleaned[name], raw[name][:1], name)

    def test_both_builders_use_the_same_sanitizer_and_no_runtime_consumes_editorial_sheets(self):
        for name in ('build.py', 'build_server.py'):
            text = (ROOT / 'tools' / name).read_text()
            self.assertIn('from runtime_data import clean_runtime_db', text)
            self.assertRegex(text, r'=clean_runtime_db\(')
        for path in (ROOT / 'source').glob('*.js'):
            if path.name in ('data.js', 'assets.js'):
                continue
            text = path.read_text()
            for name in EDITORIAL_TABLES:
                self.assertNotIn(name, text, str(path))
            self.assertNotRegex(text, r'config\([\'"](?:CANON_AUDIT_SOURCE|NEXT_SHEET)[\'"]')
        build = (ROOT / 'tools/build.py').read_text()
        self.assertNotIn("'mobile-preview.html'", build)
        self.assertNotIn("'issues':manifest['issues']", build)
        self.assertIn('assert_release_tree(OUT)', build)
        scripts = re.findall(r'<script[^>]+src="([^"]+)"', (ROOT / 'source/index.html').read_text())
        self.assertTrue(scripts)
        self.assertFalse(any('test_' in script or 'qa_fixture' in script for script in scripts))

    def test_release_guard_rejects_fixture_pages_data_and_embedded_markers(self):
        cases = {
            'mobile-preview.html': '<h1>화면 검사</h1>',
            'qa.html': '<h1>fixture</h1>',
            'assets/fixtures/screen.json': '{}',
            'reports/result.json': '{}',
            'test_runtime.js': '// test',
            'player.sqlite-wal': 'private state',
            'assets.js': 'window.X="isolated-fixture-password";',
            'data.js': 'window.X="QA-BASE-1";',
        }
        for name, content in cases.items():
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                file = Path(directory) / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(content)
                with self.assertRaises(ValueError):
                    assert_release_tree(directory)
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / 'link').symlink_to(ROOT / 'tests', target_is_directory=True)
            with self.assertRaises(ValueError):
                assert_release_tree(directory)

    def test_release_guard_preserves_normal_korean_story_and_release_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'data.js').write_text('window.CRPG_DATA={"story":"검사 완료, 입장은 아직 기다려 주세요."};')
            (root / 'test-source-sha.txt').write_text('0123456789abcdef')
            (root / 'CREDITS.md').write_text('Illustration credits')
            assert_release_tree(root)

    def test_build_report_cannot_be_written_into_or_replace_release_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'dist'
            target.mkdir()
            sentinel = target / 'existing-release.txt'
            sentinel.write_text('keep existing release on invalid configuration')
            for report in (target, target / 'build.json'):
                with self.subTest(report=str(report)), patch.dict(os.environ, {'CRPG_BUILD_DIR': str(target), 'CRPG_BUILD_REPORT': str(report)}):
                    with self.assertRaisesRegex(SystemExit, 'outside the release directory'):
                        runpy.run_path(str(ROOT / 'tools/build.py'), run_name='__main__')
                self.assertEqual(sentinel.read_text(), 'keep existing release on invalid configuration')

    def test_only_latest_player_release_fields_are_published(self):
        original = {'version': '1', 'changes': ['창을 닫아도 진행 상황이 저장됩니다.'], 'notes': [],
                    'previous': {'changes': ['QA 검증 완료']}, 'internal': 'fixture_user'}
        public = player_release_notes(original)
        self.assertEqual(set(public), {'version', 'changes', 'notes'})
        self.assertNotIn('QA', json.dumps(public, ensure_ascii=False))
        self.assertIn('previous', original)
        latest = player_release_notes(json.loads((ROOT / 'content/release-notes.json').read_text()))
        self.assertNotRegex(json.dumps(latest, ensure_ascii=False), QA_RESULT)
        self.assertNotIn('다운로드 및 검증 완료', (ROOT / 'source/app.js').read_text())

    @unittest.skipUnless(args.built and args.server, 'provide --built and --server after both release builds')
    def test_actual_client_and_server_publish_identical_clean_data(self):
        assert_release_tree(args.built)
        text = (args.built / 'data.js').read_text()
        client_db = json.loads(text.removeprefix('window.CRPG_DATA=').strip().removesuffix(';'))
        engine = args.server.read_text()
        server_db = json.loads(engine.split('\nconst DB=', 1)[1].split(';\nconst R=', 1)[0])
        expected, _ = clean_runtime_db(json.loads((ROOT / 'content/db.json').read_text()))
        self.assertEqual(client_db, expected)
        self.assertEqual(server_db, expected)
        manifest = json.loads((args.built / 'asset-manifest.json').read_text())
        self.assertEqual(manifest['appVersion'], json.loads((ROOT / 'package.json').read_text())['version'])
        prior_save = json.loads((ROOT / 'content/gameplay-revisions/release-isolation-base-save-compatibility.json').read_text())
        for version in [prior_save['saveCompatibilityVersion'], prior_save['contentVersion'], *prior_save['compatibleSaveVersions']]:
            self.assertIn(version, manifest['compatibleSaveVersions'], 'prior saved game must remain readable')
        self.assertNotIn('issues', manifest)
        self.assertEqual(manifest['releaseNotes'], player_release_notes(json.loads((ROOT / 'content/release-notes.json').read_text())))
        self.assertNotRegex(json.dumps(manifest['releaseNotes'], ensure_ascii=False), QA_RESULT)
        self.assertNotIn('previous', manifest['releaseNotes'])
        self.assertIn('export const ENGINE_FINGERPRINT=' + json.dumps(manifest['engineVersion']) + ';', engine)
        packed = {entry['path'] for entry in json.loads((args.built / 'offline-pack.json').read_text())['files']}
        self.assertNotIn('mobile-preview.html', packed)
        self.assertFalse((args.built / 'mobile-preview.html').exists())

if __name__ == '__main__':
    unittest.main(argv=[sys.argv[0]] + unittest_args)

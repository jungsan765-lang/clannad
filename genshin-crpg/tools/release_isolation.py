"""Fail a static game build if local QA output or player data enters the release tree."""
from pathlib import Path
import re

BLOCKED_PARTS = frozenset(['tests', 'fixtures', 'reports', 'evidence', '.local', 'node_modules'])
BLOCKED_NAMES = frozenset(['mobile-preview.html', 'qa.html', 'qa-game.html', '.crpg-qa-output'])
FIXTURE_MARKERS = ('CRPG_QA_LOCAL', 'CRPG_QA_READY', 'isolated-fixture-password', 'fixture_user', 'QA-BASE-')

def player_release_notes(notes):
    """The game shows this release only; preserve editorial history in the source file."""
    return {key: notes[key] for key in ('version', 'changes', 'notes') if key in notes}

def assert_release_tree(directory):
    directory = Path(directory)
    for path in directory.rglob('*'):
        relative = path.relative_to(directory)
        if path.is_symlink():
            raise ValueError('Symlink in release: ' + relative.as_posix())
        if any(part in BLOCKED_PARTS for part in relative.parts) or path.name in BLOCKED_NAMES:
            raise ValueError('Development output in release: ' + relative.as_posix())
        if not path.is_file():
            continue
        if re.match(r'^(?:test_|qa_fixture)', path.name) or re.search(r'\.(?:sqlite(?:3)?|db)(?:-wal|-shm)?$', path.name):
            raise ValueError('Test/player data file in release: ' + relative.as_posix())
        if path.suffix in ('.html', '.js', '.mjs', '.json'):
            text = path.read_text(encoding='utf-8')
            if any(marker in text for marker in FIXTURE_MARKERS):
                raise ValueError('QA fixture marker in release: ' + relative.as_posix())

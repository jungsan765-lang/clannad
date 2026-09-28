#!/usr/bin/env python3
"""Apply the v0.14 content revisions (content/revisions/v0.14.*-*.json, in file-name order) to content/db.json.

Idempotent: every operation sets a final value, so running it again changes nothing.
Operations per patch file:
  updates             {table: {row_id: {col: value}}}         set cells of existing rows (row id = column 0)
  upserts             {table: [row, ...]}                     insert new rows, or replace the row with the same id
  replace_ingredients {recipe_id: [48_RECIPE_INGREDIENT_DB rows]} swap a recipe's ingredient rows
  append_pool         {map_id: {col: ["ITEM:min-max@weight", ...]}} add missing entries to 32_MAP_DB life pools
  story               [{route, node, text?, choice?, type?, speaker?, speaker_ref?, next?}]  set cells of 55/57 story rows
  story_insert        [{route, after, row}]                   add a story row and route the `after` node through it
  deletes             {table: [row_id, ...]}                  remove rows of a non-story table (row id = column 0)
  story_upsert        {table: [row, ...]}                     add story rows (key = route + node id) or replace them in place
"""
from pathlib import Path
import json, sys

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / 'content/db.json'
STORY_TABLES = ('55_MAIN_STORY_DB', '57_MOND_STORY_SCENE_DB')


def fail(message):
    raise SystemExit('v0.14 revision: ' + message)


def row_index(db, table):
    return {r[0]: r for r in db[table][1:] if isinstance(r, list) and r}


def set_cell(row, col, value):
    while len(row) <= col:
        row.append(None)
    row[col] = value


def apply_patch(db, patch):
    for table, rows in patch.get('updates', {}).items():
        index = row_index(db, table)
        for row_id, cells in rows.items():
            if row_id not in index:
                fail(f'{table} has no row {row_id}')
            for col, value in cells.items():
                set_cell(index[row_id], int(col), value)
    for table, ids in patch.get('deletes', {}).items():
        if table in STORY_TABLES:
            fail('deletes cannot address story table ' + table)
        drop = set(ids)
        db[table][1:] = [r for r in db[table][1:] if not (isinstance(r, list) and r and r[0] in drop)]
    for table, rows in patch.get('upserts', {}).items():
        body = db[table]
        for new in rows:
            for i, old in enumerate(body[1:], 1):
                if isinstance(old, list) and old and old[0] == new[0]:
                    body[i] = list(new)
                    break
            else:
                body.append(list(new))
    ingredients = db['48_RECIPE_INGREDIENT_DB']
    for recipe, rows in patch.get('replace_ingredients', {}).items():
        if recipe not in row_index(db, '17_RECIPE_DB'):
            fail('unknown recipe ' + recipe)
        ingredients[1:] = [r for r in ingredients[1:] if not (isinstance(r, list) and len(r) > 1 and r[1] == recipe)]
        ingredients.extend(list(r) for r in rows)
    maps = row_index(db, '32_MAP_DB')
    for map_id, cols in patch.get('append_pool', {}).items():
        if map_id not in maps:
            fail('unknown map ' + map_id)
        for col, entries in cols.items():
            current = [x for x in str(maps[map_id][int(col)] or '').split(';') if x and x != 'NONE']
            have = {x.split(':')[0] for x in current}
            current += [e for e in entries if e.split(':')[0] not in have]
            set_cell(maps[map_id], int(col), ';'.join(current))
    for table, rows in patch.get('story_upsert', {}).items():
        if table not in STORY_TABLES:
            fail('story_upsert needs a story table, not ' + table)
        body = db[table]
        where = {(r[0], r[4]): i for i, r in enumerate(body[1:], 1) if isinstance(r, list) and len(r) > 4}
        for new in rows:
            key = (new[0], new[4])
            if key in where:
                body[where[key]] = list(new)
            else:
                body.append(list(new))
                where[key] = len(body) - 1
    story = {}
    for table in STORY_TABLES:
        for r in db[table][1:]:
            if isinstance(r, list) and len(r) > 4:
                story[(r[0], r[4])] = r
    for change in patch.get('story', []):
        row = story.get((change['route'], change['node']))
        if row is None:
            fail(f"no story row {change['route']} {change['node']}")
        for key, col in (('type', 5), ('speaker_ref', 6), ('speaker', 7), ('text', 9), ('choice', 10), ('next', 13)):
            if key in change:
                set_cell(row, col, change[key])
    for change in patch.get('story_insert', []):
        new = list(change['row'])
        key = (new[0], new[4])
        before = story.get((change['route'], change['after']))
        if before is None:
            fail(f"no story row {change['route']} {change['after']}")
        if key not in story:
            table = next(t for t in STORY_TABLES if before in db[t])
            db[table].insert(db[table].index(before) + 1, new)
            story[key] = new
        else:
            story[key][:] = new  # a rewritten insert replaces the earlier version in place
        set_cell(before, 13, new[4])


def main():
    raw = DB_PATH.read_text(encoding='utf-8')
    db = json.loads(raw)
    files = sorted((ROOT / 'content/revisions').glob('v0.14.*-*.json'))
    if not files:
        fail('no revision files')
    for path in files:
        apply_patch(db, json.loads(path.read_text(encoding='utf-8')))
    out = json.dumps(db, ensure_ascii=False, separators=(',', ':')) + '\n'
    if out == raw:
        print('v0.14 revisions already applied')
        return
    tmp = DB_PATH.with_suffix('.revision-tmp')
    tmp.write_text(out, encoding='utf-8', newline='\n')  # keep LF on Windows too
    tmp.replace(DB_PATH)
    print('v0.14 revisions applied:', ', '.join(p.name for p in files))


if __name__ == '__main__':
    main()

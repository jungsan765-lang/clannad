#!/usr/bin/env python3
"""v0.14.3 companion recruitment stories -> content/revisions/v0.14.3-recruit.json.

The existing legend skeleton rows keep their ids and effects (cost, completion, join).  New rows are
threaded between them: a first-meeting / reunion branch (MET condition), the scene itself, and a
reaction after the join choice.  Run: python tools/editorial/recruit_v0143.py
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
DB = json.loads((ROOT / 'content/db.json').read_text(encoding='utf-8'))
TABLE = '57_MOND_STORY_SCENE_DB'
NOTE = 'v0.14.3 동료 획득 이야기'
PROFILES = {r[2]: r[0] for r in DB['04_CHAR_DB'][1:] if r and r[0] and r[2]}
STORY = {}
for t in ('55_MAIN_STORY_DB', '57_MOND_STORY_SCENE_DB'):
    for r in DB[t][1:]:
        if isinstance(r, list) and len(r) > 4:
            STORY[(r[0], r[4])] = (t, r)

rows = {'55_MAIN_STORY_DB': [], '57_MOND_STORY_SCENE_DB': []}
edits = []


def edit(route, node, **cells):
    if (route, node) not in STORY:
        raise SystemExit('missing story row ' + node)
    edits.append({'route': route, 'node': node, **cells})


class Chain:
    """Builds consecutive story rows; `lines` items are ('N', text), (speaker, text), ('>', label) or ('?', [(label, [lines]), ...])."""

    def __init__(self, route, quest, arc, scene, map_id, table=TABLE, order=1):
        self.route, self.quest, self.arc, self.scene, self.map, self.table, self.order = route, quest, arc, scene, map_id, table, order

    def row(self, node, kind, speaker, text, label, cond, effect, nxt, group):
        ref = ''
        name = ''
        if kind == 'DIALOGUE':
            ref = PROFILES.get(speaker, '')
            name = speaker
        elif kind == 'CHOICE':
            name = '{PLAYER_NAME}'
        r = [self.route, self.quest, self.arc, self.scene, node, kind, ref, name, self.map, text, label, cond, effect, nxt, group, '', 'CRPG_ORIGINAL', self.order, 'ACTIVE', NOTE]
        rows[self.table].append(r)
        return r

    def build(self, prefix, lines, tail, first_cond='', first_group=''):
        """Create rows for `lines`; returns the id to jump to for the first line."""
        entries = []
        made = []
        for i, line in enumerate(lines):
            kind = line[0]
            node = '%s_%02d' % (prefix, i)
            if kind == '>':
                group = node + '_G'
                entries.append(('CHOICE_GROUP:' + group, [(node, group, line[1])], 'single'))
            elif kind == '?':
                group = node + '_G'
                entries.append(('CHOICE_GROUP:' + group, [(node + chr(65 + k), group, opt) for k, opt in enumerate(line[1])], 'multi'))
            else:
                entries.append((node, [(node, None, line)], 'line'))
        for i, (entry, parts, style) in enumerate(entries):
            nxt = entries[i + 1][0] if i + 1 < len(entries) else tail
            cond = first_cond if i == 0 else ''
            grp = first_group if i == 0 else ''
            if style == 'line':
                node, _, (speaker, text) = parts[0]
                kind = 'NARRATION' if speaker == 'N' else 'DIALOGUE'
                made.append(self.row(node, kind, '' if speaker == 'N' else speaker, text, '', cond, '', nxt, grp))
            elif style == 'single':
                node, group, label = parts[0]
                if cond:
                    raise SystemExit('a conditional branch cannot open with a choice: ' + node)
                made.append(self.row(node, 'CHOICE', '', '', label, '', '', nxt, group))
            else:
                if cond:
                    raise SystemExit('a conditional branch cannot open with a choice: ' + parts[0][0])
                for node, group, (label, reply) in parts:
                    target = self.build(node + '_R', reply, nxt) if reply else nxt
                    made.append(self.row(node, 'CHOICE', '', '', label, '', 'LOCAL_CHOICE:%s:%s' % (group, node[-1]), target, group))
        return entries[0][0] if entries else tail


def recruit(legend, route='ROUTE_ISEKAI', **s):
    """Thread a complete recruitment scene through the legend skeleton."""
    d = next(r for r in DB['56_MOND_LEGEND_DB'][1:] if r and r[0] == legend)
    quest, map_id, profile = d[5], d[22], d[1]
    c = Chain(route, quest, legend, legend + '_V143', map_id)
    start, prep = legend + '_START', 'CHOICE_GROUP:' + legend + '_PREP'
    intro = c.build(legend + '_V143_INTRO', s['intro'], prep)
    meet_group = legend + '_V143_MEET'
    c.build(legend + '_V143_FIRST', s['first'], intro, 'MET(%s)=FALSE' % profile, meet_group)
    c.build(legend + '_V143_AGAIN', s['again'], intro, 'MET(%s)=TRUE' % profile, meet_group)
    edit(route, start, text=s['start'], next='CONDITION_GROUP:' + meet_group)
    edit(route, legend + '_PREP_ACCEPT', choice=s['prep'][0])
    edit(route, legend + '_PREP_LATER', choice=s['prep'][1])
    # The work happens where the WORK row stands: the legend's own map, or a field the party travels to.
    place = s.get('field_map') or map_id
    f = Chain(route, quest, legend, legend + '_V143', place)
    field = f.build(legend + '_V143_FIELD', s['field'], 'CHOICE_GROUP:' + legend + '_CHECK_GROUP')
    edit(route, legend + '_WORK', type='NARRATION', speaker_ref='', speaker='', map=place, text=s['work'], next=field)
    edit(route, legend + '_CHECK', choice=s['check'])
    after = c.build(legend + '_V143_AFTER', s['after'], 'CHOICE_GROUP:' + legend + '_JOIN')
    edit(route, legend + '_COMPLETE', text=s['complete'], next=after)
    for key, suffix in (('join', '_JOIN_ACCEPT'), ('later', '_JOIN_LATER')):
        label, reply = s[key]
        target = c.build(legend + '_V143_' + key.upper(), reply, 'SCREEN:CRPG_MAIN')
        edit(route, legend + suffix, choice=label, next=target)
    if s.get('rejoin'):
        edit(route, legend + '_REJOIN_START', text=s['rejoin'])


from recruit_v0143_mond import write_mond  # noqa: E402  (story text lives in its own module)

write_mond(recruit, Chain, edit, STORY)

patch = {'id': 'v0.14.3-recruit', 'story_upsert': {k: v for k, v in rows.items() if v}, 'story': edits}
out = ROOT / 'content/revisions/v0.14.3-recruit.json'
out.write_text(json.dumps(patch, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
print('rows', {k: len(v) for k, v in rows.items()}, 'edits', len(edits))

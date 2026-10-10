#!/usr/bin/env python3
"""Verify same-input native comparisons; outcomes are observations, not targets."""
from pathlib import Path
import gzip, json, hashlib, collections, csv
BASE=Path(__file__).resolve().parent

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def load(phase):
    root=BASE/phase
    data=json.loads(gzip.decompress((root/'native.json.gz').read_bytes()))
    m=json.loads((root/'input_manifest.json').read_text())
    assert len(data['sourceHashes'])==120
    assert data['sourceHashes']==m['sourceHashes']
    assert sha(root/'runner.cjs')==m['runner']
    assert sha(root/'cases.json')==m['cases']
    assert data['rawDbSHA256']==m['rawDbSHA256']
    assert not any(r['errors'] for r in data['rows'])
    assert not any(r['state'] in ['ERROR','INPUT_LIMIT','ENTRY_BLOCKED','NO_RESULT'] for r in data['rows'])
    return data,m

baseline,bm=load('baseline'); final,fm=load('final4')
assert baseline['rawDbSHA256']==final['rawDbSHA256']
rootApprovedHashes=json.loads((BASE/'FINAL_FROZEN_SHA256.json').read_text())
REPO=BASE.parents[3]
for p,h in rootApprovedHashes.items():
    assert final['sourceHashes'][p]==h,(p,'start captured freeze')
    assert sha(REPO/p)==h,(p,'end retained freeze')
assert bm['cases']==fm['cases'] and bm['helper']==fm['helper']
# The final runner permits the four explicitly authorized source checksum changes.
# Its complete native execution, summary and raw-write code is identical.
native_execution=lambda s:s[s.index('const combatLog='):]
assert native_execution((BASE/'baseline/runner.cjs').read_text())==native_execution((BASE/'final4/runner.cjs').read_text())
for p,h in baseline['frozen'].items():
    if p!='source/runtime_balance_admin_v01623.js': assert final['frozen'][p]==h
assert final['frozen']['source/runtime_balance_admin_v01623.js']==final['sourceHashes']['source/runtime_balance_admin_v01623.js']
changed=[p for p,h in baseline['sourceHashes'].items() if final['sourceHashes'][p]!=h]
assert sorted(changed)==sorted(['source/runtime_abyss.js','source/runtime_formations.js','source/runtime_growth_v01522.js','source/runtime_balance_admin_v01623.js']), changed
index=lambda data:{(r['spec']['id'],r['seed']):r for r in data['rows']}
b,f=index(baseline),index(final)
assert b.keys()==f.keys() and len(b)==21
pairs=[]
for key,br in b.items():
    fr=f[key]
    for prop in ['spec','initialHp','equipment','artifactRolls','talents','constellations','operator']:
        assert br[prop]==fr[prop],(key,prop)
    # Compare natural initial stat arrays and consumed opening inventory exactly.
    assert br['rooms'][0]['initialActors']==fr['rooms'][0]['initialActors'],(key,'initial native actors')
    assert br['rooms'][0]['consumed']==fr['rooms'][0]['consumed'],(key,'opening meals')
    for i,room in enumerate(fr['rooms']):
        assert room['initialAbyss']['rulesRevision']==1,(key,'new rules marker')
        if room['nativeProtagonistKO'] and room['chamber']<3 and room['native'].get('victory'):
            assert room['state']=='DOWNED',(key,'KO advanced',room['state'])
            assert room['activeAfter'] is None
            assert len(fr['rooms'])==i+1
            assert fr['clear'] is None
        for actor in room['initialActors']:
            if actor['side']=='ENEMY':
                turn=next(t for t in room['initialOrder'] if t['id']==actor['id'])
                roll=turn['score']-room['initialCombatSpeed'][actor['id']]
                assert 0<=roll<=9,(key,'opening SPD roll',roll)
                assert room['initialCombatSpeed'][actor['id']]==26+room['initialAbyss']['floor']*2
    # Opening RNG is preserved. Product delta corrects only enemy final speed.
    old=br['rooms'][0];new=fr['rooms'][0]
    for actor in old['initialActors']:
        old_turn=next(t for t in old['initialOrder'] if t['id']==actor['id'])
        new_turn=next(t for t in new['initialOrder'] if t['id']==actor['id'])
        expected=old_turn['score']+(old['initialCombatSpeed'][actor['id']]-28 if actor['side']=='ENEMY' else 0)
        assert new_turn['score']==expected,(key,'opening RNG/score',actor['id'])
    pairs.append({'id':key[0],'seed':key[1],'floor':br['spec']['floor'],
                  'baseline':br['state'],'final':fr['state'],
                  'baselineRounds':br['rounds'],'finalRounds':fr['rounds'],
                  'baselineEarlyPcKo':sum(c['nativeProtagonistKO'] and c['chamber']<3 and c['state']=='NEXT' for c in br['rooms']),
                  'finalEarlyPcKoAdvanced':sum(c['nativeProtagonistKO'] and c['chamber']<3 and c['state']=='NEXT' for c in fr['rooms']),
                  'baselineMeals':sum(c['consumed'] for c in br['consumed']),
                  'finalMeals':sum(c['consumed'] for c in fr['consumed']),
                  'baselineRoomStates':[c['state'] for c in br['rooms']],
                  'finalRoomStates':[c['state'] for c in fr['rooms']]})
summary={
 'version':'0.16.26','pairs':21,'nativeRuns':42,
 'baselineRooms':sum(len(r['rooms']) for r in b.values()),
 'finalRooms':sum(len(r['rooms']) for r in f.values()),
 'baselineCounts':dict(collections.Counter(r['state'] for r in b.values())),
 'finalCounts':dict(collections.Counter(r['state'] for r in f.values())),
 'baselineEarlyPcKoAdvanced':sum(p['baselineEarlyPcKo'] for p in pairs),
 'baselineAffectedRuns':sum(p['baselineEarlyPcKo']>0 for p in pairs),
 'finalEarlyPcKoAdvanced':sum(p['finalEarlyPcKoAdvanced'] for p in pairs),
 'errors':0,'inputLimits':0,'entryBlocked':0,
 'runnerPairParity':'Identical complete native execution, fixture, action, summary and raw-write code. Final input preamble additionally allows four authorized source changes and an explicit approved admin source hash.',
 'changedRuntimeSources':changed,
 'baselineFingerprint':baseline['fingerprint'],'finalFingerprint':final['fingerprint'],
 'rawDbSHA256':baseline['rawDbSHA256'],
 'finalRootApprovedFrozenSourceHashes':rootApprovedHashes,
 'coupledObservations':{
  'clearsLostToNativePcKO':sum(p['baseline']=='CLEARED' and p['final']=='DOWNED' for p in pairs),
  'allPreparedC6Outcomes':[r['state'] for r in f.values() if r['spec']['id']=='fixed_f12_c6_guard_feast_healing'],
  'previousNoPcKoClearFinalOutcomes':[r['state'] for key,r in f.items() if b[key]['state']=='CLEARED' and not any(c['nativeProtagonistKO'] for c in b[key]['rooms'])]
 },
 'sameInputsVerified':['natural equipped artifacts and their rolls','all equipment','initial HP','talents','constellations','operator profile','first chamber actor stats','first chamber food consumption','combat RNG seed','opening score roll'],
 'limits':['Diagnostic funded fixtures at Lv60; acquisition and full 12-floor roster climb were not simulated.','Seven selected conditions × three seeds; no all-composition win-rate claim.','KO in chamber3 can legally clear when companions win and is not grouped with early-room advancement bugs.','Opening SPD changes are real even if all chosen Lv60 allies remain faster than enemies.','Food and gear rules/values remain unchanged.'],
 'pairsDetail':pairs
}
(BASE/'comparison.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
with (BASE/'comparison.csv').open('w') as o:
 fields=['id','seed','floor','baseline','final','baselineRounds','finalRounds','baselineEarlyPcKo','finalEarlyPcKoAdvanced','baselineMeals','finalMeals']
 writer=csv.DictWriter(o,fieldnames=fields,extrasaction='ignore');writer.writeheader();writer.writerows(pairs)
print(json.dumps({k:v for k,v in summary.items() if k not in ['pairsDetail','sameInputsVerified','limits']},ensure_ascii=False,indent=2))

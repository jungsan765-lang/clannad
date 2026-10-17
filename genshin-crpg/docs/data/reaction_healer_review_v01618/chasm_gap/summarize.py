import os,tempfile
import json,gzip,pathlib,hashlib,collections
script_dir=pathlib.Path(__file__).resolve().parent
p=pathlib.Path(os.environ.get('CRPG_AUDIT_DATA',os.environ.get('CRPG_AUDIT_OUT',pathlib.Path(tempfile.gettempdir())/'crpg-reaction-healer-review/chasm_gap')))
p.mkdir(parents=True,exist_ok=True)
files=sorted(f for f in p.glob('campaign_*.json.gz') if '_pilot' not in f.name)
outputs=[json.load(gzip.open(f,'rt')) for f in files]
raw={'files':[f.name for f in files],'outputs':outputs,'metadataCorrections':{'oldCapturedAssumption':'Old campaign files described legal phase1 and Traveler C3 E+3 in prose metadata. Actual growth() recorded phase2 at Lv25, native talentLevels() gives Traveler C3 Q+3; no effective talent/phase were forcibly overridden in any fight. routes_and_seeds/scattered_seeds record native levels2/2/5 and4/4/7. These prose metadata corrections do not change raw measurements.'}}
rawpath=p/'native_all.json.gz'
with open(rawpath,'wb') as f:
 f.write(gzip.compress(json.dumps(raw,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9,mtime=0))
rows=[]
for filename,x in zip(files,outputs):
 for r in x['rows']:
  q={k:v for k,v in r.items() if k not in ['battles','equipment','growth']}
  q['file']=filename.name;q['baseMatrix']=not any(a in filename.name for a in ['extra10','native_extra','fourC6']);q['battles']=[]
  for b in r['battles']:
   allyIds={a['id'] for a in b['initial']['actors'] if a['side']=='ALLY'}
   enemyIds={a['id'] for a in b['initial']['actors'] if a['side']=='ENEMY'}
   logs=b['last']['log']
   q['battles'].append({k:b[k] for k in ['i','waits','victory','rounds','before','after','heal','ownDamage','allyDamage','playerInputs','presentationSeconds','reactionCounts']}|{
    'group':b['initial']['group'],'origin':b['initial']['origin'],'balance':b['initial']['balance'],
    'allies':[{'source':a['source'],'level':a['level'],'hp':a['hp'],'maxHp':a['maxHp'],'atk':a['atk'],'def':a['def'],'combatDef':a['combatDef'],'constellation':a.get('consLevel')} for a in b['initial']['actors'] if a['side']=='ALLY'],
    'enemies':[{'source':a['source'],'level':a['level'],'hp':a['hp'],'maxHp':a['maxHp'],'atk':a['atk'],'def':a['def'],'combatDef':a['combatDef'],'grade':a.get('grade'),'variant':a.get('variant'),'immunities':a.get('immunities'),'growthScaled':a.get('growthScaled')} for a in b['initial']['actors'] if a['side']=='ENEMY'],
    'damageLogTotalToAllies':sum(e.get('damage',0) for e in logs if e.get('targetId') in allyIds),'shieldsAbsorbedToAllies':sum(e.get('absorbed',0) for e in logs if e.get('targetId') in allyIds),
    'enemySkipped':sum(bool(e.get('skipped')) and e.get('actor') in {a['name'] for a in b['initial']['actors'] if a['side']=='ENEMY'} for e in logs),
    'endBeforeReward':[{'source':a['source'],'level':a['level'],'hp':a['hp'],'maxHp':a['maxHp']} for a in b['last']['actors'] if a['side']=='ALLY'],
    'result':b['result']})
  rows.append(q)
groups={}
for r in rows:
 key=(r['map'],r['name'],'base' if r['baseMatrix'] else 'supplemental')
 d=groups.setdefault(key,{'map':key[0],'name':key[1],'cohort':key[2],'conditions':0,'firstWins':0,'threeNoInn':0,'wins':0,'losses':0,'rounds':[]})
 d['conditions']+=1;d['firstWins']+=bool(r['battles'] and r['battles'][0]['victory']);d['threeNoInn']+=r['wins']==3;d['wins']+=r['wins'];d['losses']+=r['losses'];d['rounds']+=[b['rounds'] for b in r['battles']]
summary={'fingerprints':sorted(set(x['fingerprint'] for x in outputs)),'raw':rawpath.name,'metadataCorrections':raw['metadataCorrections'],
 'totals':{'conditions':len(rows),'battles':sum(len(r['battles']) for r in rows),'wins':sum(r['wins'] for r in rows),'losses':sum(r['losses'] for r in rows),'errors':sum(len(x['errors']) for x in outputs),'firstWins':sum(bool(r['battles'] and r['battles'][0]['victory']) for r in rows),'threeNoInn':sum(r['wins']==3 for r in rows)},
 'groups':list(groups.values()),'rows':rows,'limitations':['All initial companion levels are deliberately Lv25, not inferred from the screenshot.','Three-fight carrying uses actual XP/rewards/level-ups.','Additional natural seed search selected representative 2-enemy/group3/group4 cases; do not pool them into unbiased win rates.','WAIT 60min proves natural public paths; it is not measured user travel time, and some world days advance before battles. No healing actions used.','Current native AI, petrify/armor/shields/healing/innquote and all enemy/skill rules unchanged.','No real user save, weapons, armor, artifacts, formation/tactics/talents or companion levels were supplied.']}
(p/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
manifest={'baseFingerprint':summary['fingerprints'],'files':{f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(p.iterdir()) if f.is_file() and f.name!='manifest.json' and f.suffix!='.log'}}
(p/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps(summary['totals']));print('raw',manifest['files'][rawpath.name]);print('groups',json.dumps(summary['groups']))

#!/usr/bin/env python3
"""Reproducible static/offline build from a pinned content snapshot and exact asset manifest."""
from pathlib import Path
import json,hashlib,shutil,sys,base64,datetime,re
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'source';OUT=ROOT/'dist';shutil.rmtree(OUT,ignore_errors=True);OUT.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
db=json.loads((ROOT/'content/db.json').read_text())
# Runtime/SAVE sheets retain their header contracts, never another game's progress.
save_tables=['15_INVENTORY_STATE','25_CURRENT_ROSTER','38_COMBAT_STATE','39_COMBAT_LOG','41_PARTY_STATE','42_QUEST_STATE','43_RELATION_STATE','44_RUNTIME_STATE','52_RUNTIME_STATE','54_RELATIONSHIP_STATE']
removed=[]
for name,rows in db.items():
 if name in save_tables or name.startswith(('25_','38_','39_','41_','42_','43_','44_','52_','54_','98_')):
  removed.append(name);db[name]=rows[:1]
# Explicit fresh state starts from declared JSON/type defaults, never live values.
for r in db['24_CURRENT_STATE'][1:]:
 if not r or not r[0]:continue
 typ=str(r[2] if len(r)>2 else '')
 value=r[1] if len(r)>1 else None
 if len(r)<2:r.append('')
 if 'JSON' in typ or str(r[0]).endswith('_JSON'):r[1]='[]' if str(value).startswith('[') else '{}'
 elif typ in ['BOOL','BOOLEAN']:r[1]=False
 elif any(x in typ for x in ['INT','NUMBER','FLOAT']):r[1]=0
 else:r[1]=''
for r in db['07_CHAR_DB'][1:]:
 for key in ['XP','CURRENT_HP','LEVEL_STATE']:
  if key in db['07_CHAR_DB'][0]:
   i=db['07_CHAR_DB'][0].index(key)
   if i<len(r):r[i]=0
content_bytes=json.dumps(db,ensure_ascii=False,separators=(',',':')).encode()
version='2026-09-24-'+sha(content_bytes)[:12]
manifest=json.loads((ROOT/'content/asset-manifest.json').read_text());files={};assets={};maps={}
for aid,a in manifest['assets'].items():
 if a['content_rating']!='GENERAL':continue
 local=ROOT/'assets'/Path(a['file_name']).with_suffix('.webp').name
 if not local.exists() or local.stat().st_size==0:
  original=Path(a['local_path'])
  if not original.is_file():raise SystemExit('Asset missing: '+a['file_name'])
  im=Image.open(original);im.save(local,'WEBP',quality=90,method=6)
 # Serve a display-sized image and a dedicated small portrait. Keep source art unchanged.
 target=OUT/'assets'/local.name;target.parent.mkdir(exist_ok=True)
 cache=ROOT/'.asset-build-cache'/sha(local.read_bytes()+b'view1600x1000-portrait720x900-q84-thumb320x360-q80-v1')
 cache.mkdir(parents=True,exist_ok=True)
 thumb=OUT/'assets'/'thumb'/local.name;thumb.parent.mkdir(exist_ok=True)
 if (cache/'view.webp').is_file() and (cache/'thumb.webp').is_file():
  shutil.copy2(cache/'view.webp',target);shutil.copy2(cache/'thumb.webp',thumb);im=Image.open(target)
 else:
  im=Image.open(local);im.thumbnail((1600,1000) if a['file_name'].startswith('bg_') else (720,900),Image.Resampling.LANCZOS)
  im.save(target,'WEBP',quality=84,method=6)
  small=im.copy();small.thumbnail((320,360),Image.Resampling.LANCZOS);small.save(thumb,'WEBP',quality=80,method=6)
  shutil.copy2(target,cache/'view.webp');shutil.copy2(thumb,cache/'thumb.webp')
 url='assets/'+local.name
 assets[aid]={'url':url,'thumbnail':'assets/thumb/'+local.name,'file_name':a['file_name'],'width':im.width,'height':im.height,'sourceWidth':a['width'],'sourceHeight':a['height'],'category':'GENERAL','sha256':sha(target.read_bytes()),'originalSha256':a['sha256'],'owner':a['owner_id']}
 files[a['file_name']]=url
# Explicit alias: the profile and story use KSR; the supplied Katheryne art is KTH.
assets['ASSET_MOND_KSR_1']={**assets['ASSET_MOND_KTH_1'],'aliasOf':'ASSET_MOND_KTH_1'}
files['mond_ksr_1.png']=files['mond_kth_1.png']
for mid,m in manifest['maps'].items():
 aid=m.get('asset_id');a=assets.get(aid)
 maps[mid]={**m,'url':a['url'] if a else None,'maxWidth':min(1024,a['width']) if a else None}
public={'appVersion':json.loads((ROOT/'package.json').read_text())['version'],'schemaVersion':1,'saveCompatibilityVersion':'schema2-'+sha(content_bytes)[:12]+'-enhance1-mond1-enemy1-boss1-balance1-navigation1-liyueareas1','compatibleSaveVersions':['schema2-'+sha(content_bytes)[:12]+'-enhance1-mond1-enemy1-boss1-balance1-navigation1','schema2-'+sha(content_bytes)[:12]+'-enhance1-mond1-enemy1-boss1-balance1','schema2-'+sha(content_bytes)[:12]+'-enhance1-mond1-enemy1-boss1','schema2-'+sha(content_bytes)[:12]+'-enhance1-mond1-enemy1','schema2-'+sha(content_bytes)[:12]+'-enhance1-mond1','schema2-'+sha(content_bytes)[:12]+'-enhance1','schema2-'+sha(content_bytes)[:12],'schema2-d808adb10498','2026-09-24-d808adb10498-5d4720faca6d','schema2-1aba6753c63c','2026-09-24-1aba6753c63c-7118a6e9849e','schema2-34b2b995711c','schema2-e1936c279a27','schema2-4d2a266ee290','2026-09-24-4d2a266ee290-d6279e592bc5'],'contentVersion':version,'sourceSpreadsheet':'1mpixlPo_5ccd6-Z5bdb5pxfAMND7_C9i1crgALx3R7U','sourceModifiedAt':json.loads((ROOT/'content/source-manifest.json').read_text())['sourceModifiedEnd'],'assets':assets,'maps':maps,'issues':manifest['issues']}
# Story-only revision: all old node IDs and runtime contracts are retained.
public['compatibleSaveVersions']=list(dict.fromkeys(public['compatibleSaveVersions']+['schema2-8c4996fd4ef9-enhance1-mond1-enemy1-boss1-balance1-navigation1-liyueareas1', '2026-09-24-8c4996fd4ef9-233f6704344d', 'schema2-8c4996fd4ef9-enhance1-mond1-enemy1-boss1-balance1-navigation1', 'schema2-8c4996fd4ef9-enhance1-mond1-enemy1-boss1-balance1', 'schema2-8c4996fd4ef9-enhance1-mond1-enemy1-boss1', 'schema2-8c4996fd4ef9-enhance1-mond1-enemy1', 'schema2-8c4996fd4ef9-enhance1-mond1', 'schema2-8c4996fd4ef9-enhance1', 'schema2-8c4996fd4ef9', 'schema2-d808adb10498', '2026-09-24-d808adb10498-5d4720faca6d', 'schema2-1aba6753c63c', '2026-09-24-1aba6753c63c-7118a6e9849e', 'schema2-34b2b995711c', 'schema2-e1936c279a27', 'schema2-4d2a266ee290', '2026-09-24-4d2a266ee290-d6279e592bc5']))
# rev02 changes story content only; retain the exact v0.13.16 cursor/save format.
previous_save=json.loads((ROOT/'content/story-revisions/rev02-base-save-compatibility.json').read_text())
public['compatibleSaveVersions']=list(dict.fromkeys(public['compatibleSaveVersions']+[previous_save['saveCompatibilityVersion'],previous_save['contentVersion']]+previous_save['compatibleSaveVersions']))
# Chasm runtime state is backwards-readable here, not in earlier game executors.
chasm_base=json.loads((ROOT/'content/gameplay-revisions/chasm1-base-save-compatibility.json').read_text())
public['compatibleSaveVersions']=list(dict.fromkeys(public['compatibleSaveVersions']+[public['saveCompatibilityVersion'],chasm_base['saveCompatibilityVersion'],chasm_base['contentVersion']]+chasm_base['compatibleSaveVersions']))
public['saveCompatibilityVersion']+='-chasm1'
# New areas share curated parent scenery; do not label inherited art as exact location photos.
world=json.loads((SRC/'world_content.js').read_text().split('=',1)[1].strip().rstrip(';'))
for area in world['newMaps']:
 parent=maps.get(area['parent']) or maps.get('MAP_DRAGONSPINE' if area['theme'].startswith('DRAGONSPINE') else 'MAP_MOND_PLAINS')
 if parent: maps[area['id']]={**parent,'name':area['name'],'inheritedFrom':area['parent']}
public['releaseNotes']=json.loads((ROOT/'content/release-notes.json').read_text())
public['itemIcons']=json.loads((ROOT/'content/item-icons.json').read_text())
public['sfx']={f['id']:{'url':'audio/genshin-sfx/'+f['file'],'sourceNature':f['sourceNature']} for f in json.loads((ROOT/'assets/audio/genshin-sfx/catalog.json').read_text())['files']}
public['music']=json.loads((ROOT/'assets/audio/music-catalog.json').read_text())
(OUT/'data.js').write_text('window.CRPG_DATA='+content_bytes.decode()+';\n')
(OUT/'assets.js').write_text('window.CRPG_ASSETS='+json.dumps(files,ensure_ascii=False)+';\nwindow.CRPG_MANIFEST='+json.dumps(public,ensure_ascii=False)+';\n')
for f in ['runtime_chasm_skills.js','runtime_liyue_area_content.js','runtime_liyue_areas.js','app_liyue_areas.js','terrain_map.js','runtime_navigation.js','app_navigation.js','runtime_mond_balance.js','runtime_mond_boss_balance.js','app_mond_boss_balance.js','runtime_enemy_content.js','runtime_enemy_skills.js','app_enemy_intel.js','runtime_mond_encounters.js','app_mond_encounters.js','runtime_enhancement.js','app_enhancement.js','runtime_equipment.js','app_equipment.js','runtime_protagonist.js','app_protagonist.js','runtime_liyue_card_content.js','runtime_liyue_cards.js','runtime_liyue_combat.js','runtime_geo_oculi.js','runtime_liyue.js','runtime_recruitment.js','app_recruitment.js','runtime_geography.js','app_discovery.js','runtime_encounter.js','app_combat_fx.js','world_content.js','runtime_world.js','runtime_journey.js','runtime_market.js','app_market.js','app_journey.js','app_tutorial.js','index.html','style.css','app.js','app_legacy.js','app_revision.js','app_party.js','inventory_presenter.js','app_experience.js','app_adventure.js','app_exploration.js','app_life.js','app_version.js','presentation.js','audio_playlists.js','app_av.js','runtime.js','runtime_extensions.js','runtime_story.js','runtime_nodes.js','runtime_events.js','runtime_relationships.js','runtime_combat.js','runtime_mond_cards.js','runtime_economy.js','runtime_passives.js','runtime_rules.js','runtime_andrius.js','runtime_flow.js','runtime_party.js','runtime_opening.js','runtime_places.js','runtime_places_joint.js','runtime_adventure.js','runtime_exploration.js','runtime_life.js','save_adapter.js','NotoSansKR_subset.woff','manifest.webmanifest']:
 path=SRC/f
 if not path.exists():raise SystemExit('Implementation missing: '+f)
 shutil.copy2(path,OUT/f)
shutil.copytree(ROOT/'assets/audio',OUT/'audio')
shutil.copytree(ROOT/'assets/icons',OUT/'assets/icons')
# Exact user-approved terrain images; no crop, resize, generation or recompression.
shutil.copytree(ROOT/'assets/terrain',OUT/'assets/terrain')
shutil.copytree(ROOT/'assets/fonts',OUT/'assets/fonts')
for size in (192,512):
 im=Image.new('RGB',(size,size),'#102b2e');draw=ImageDraw.Draw(im);c=size/2;draw.polygon([(c,size*.13),(size*.60,size*.4),(size*.87,c),(size*.60,size*.6),(c,size*.87),(size*.4,size*.6),(size*.13,c),(size*.4,size*.4)],fill='#e3c38a');im.save(OUT/f'icon-{size}.png')
# Code and content activate as one versioned pack; installed worker never mixes releases.
codehash=sha(b''.join(p.relative_to(OUT).as_posix().encode()+p.read_bytes() for p in sorted(OUT.rglob('*')) if p.is_file())+(SRC/'sw.js').read_bytes())[:12]
pack_version=version+'-'+codehash
public['contentVersion']=pack_version
html=(OUT/'index.html').read_text()
html=re.sub(r'src="([^"]+\.js)"',lambda m:'src="'+m[1]+'?v='+pack_version+'"',html)
html=html.replace('href="style.css"','href="style.css?v='+pack_version+'"')
(OUT/'index.html').write_text(html)
(OUT/'release.json').write_text(json.dumps({'appVersion':public['appVersion'],'packVersion':pack_version}))
(OUT/'assets.js').write_text('window.CRPG_ASSETS='+json.dumps(files,ensure_ascii=False)+';\nwindow.CRPG_MANIFEST='+json.dumps(public,ensure_ascii=False)+';\n')
(OUT/'sw.js').write_text((SRC/'sw.js').read_text().replace('__CONTENT_VERSION__',pack_version))
pack={'version':pack_version,'files':[{'path':p.relative_to(OUT).as_posix(),'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size} for p in sorted(OUT.rglob('*')) if p.is_file() and p.name not in ['offline-pack.json','asset-manifest.json']]}
(OUT/'offline-pack.json').write_text(json.dumps(pack,ensure_ascii=False))
(OUT/'asset-manifest.json').write_text(json.dumps(public,ensure_ascii=False,indent=2))
(ROOT/'reports/build.json').write_text(json.dumps({'version':pack_version,'sourceTabs':len(db),'excludedSaveTables':removed,'assets':len(assets),'fileCount':len(pack['files']),'bytes':sum(x['bytes'] for x in pack['files']),'contentSha256':sha(content_bytes)},indent=2))
print(json.dumps({'version':pack_version,'files':len(pack['files']),'assets':len(assets),'megabytes':round(sum(x['bytes'] for x in pack['files'])/1e6,1)}))

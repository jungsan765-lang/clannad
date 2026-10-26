"""Shared browser/server DB sanitation; no spreadsheet save state ships."""
import copy
# Authoring worksheets have DEV scope in 00_CORE; keep schemas but never ship audit/task prose.
EDITORIAL_TABLES=frozenset(['28_CANON_AUDIT','40_CRPG_MIGRATION_PLAN'])
def clean_runtime_db(raw):
 db=copy.deepcopy(raw)
 # Runtime/SAVE sheets retain their header contracts, never another game's progress.
 save_tables=['15_INVENTORY_STATE','25_CURRENT_ROSTER','38_COMBAT_STATE','39_COMBAT_LOG','41_PARTY_STATE','42_QUEST_STATE','43_RELATION_STATE','44_RUNTIME_STATE','52_RUNTIME_STATE','54_RELATIONSHIP_STATE']
 removed=[]
 for name,rows in db.items():
  if name in EDITORIAL_TABLES or name in save_tables or name.startswith(('25_','38_','39_','41_','42_','43_','44_','52_','54_','98_')):
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
 return db,removed

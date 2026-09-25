#!/usr/bin/env python3
"""Read-only Sheets importer. Credentials remain in a build-machine environment variable.
Usage: CRPG_GOOGLE_ACCESS_TOKEN=... python tools/import_content.py --output content/db.json
       python tools/import_content.py --snapshot snapshot.json --output content/db.json
"""
import argparse,json,os,time,hashlib,urllib.request,urllib.parse
from pathlib import Path
SID='1mpixlPo_5ccd6-Z5bdb5pxfAMND7_C9i1crgALx3R7U'
def get(url,token):
 req=urllib.request.Request(url,headers={'Authorization':'Bearer '+token})
 with urllib.request.urlopen(req,timeout=60) as r:return json.load(r)
def col(n):
 out=''
 while n:n,k=divmod(n-1,26);out=chr(65+k)+out
 return out
def modified(token):return get('https://www.googleapis.com/drive/v3/files/'+SID+'?fields=id,name,modifiedTime,version',token)
def read_live(token):
 # Retry a complete snapshot when an author changes the source during acquisition.
 for attempt in range(3):
  before=modified(token);meta=get('https://sheets.googleapis.com/v4/spreadsheets/'+SID+'?fields=spreadsheetId,sheets.properties',token);db={}
  for sheet in meta['sheets']:
   p=sheet['properties'];name=p['title'];grid=p['gridProperties'];maxrow=grid['rowCount'];maxcol=grid['columnCount'];rows=[]
   # All ranges are bounded. Chunking keeps large dialogue tabs below transfer limits.
   for start in range(1,maxrow+1,100):
    end=min(maxrow,start+99);a1="'"+name.replace("'","''")+"'!A"+str(start)+':'+col(maxcol)+str(end)
    url='https://sheets.googleapis.com/v4/spreadsheets/'+SID+'/values/'+urllib.parse.quote(a1,safe='')+'?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING'
    result=get(url,token);chunk=result.get('values',[]);rows.extend(chunk+[[]]*(end-start+1-len(chunk)))
   while rows and not rows[-1]:rows.pop()
   db[name]=rows
  after=modified(token)
  if before['modifiedTime']==after['modifiedTime'] and before.get('version')==after.get('version'):return db,{'source':SID,'before':before,'after':after,'tabs':len(db),'metadata':meta}
 raise RuntimeError('Source kept changing. No mixed snapshot was committed.')
def validate(db):
 issues=[];counts={}
 for tab,rows in db.items():
  if not rows:issues.append({'table':tab,'row':1,'field':'HEADER','error':'MISSING_HEADER'});continue
  h=rows[0];seen={};counts[tab]=max(0,len(rows)-1)
  id_col=h.index('NODE_ID') if 'NODE_ID'in h else 0
  # Composite tables have explicitly scoped keys, not all first-column values are PKs.
  unique=tab.startswith(('04_','07_','08_','09_','12_','14_','16_','17_','18_','19_','22_','23_','32_','33_','47_','48_','49_','50_','51_','56_','58_')) or 'NODE_ID'in h
  for num,row in enumerate(rows[1:],2):
   if not row or id_col>=len(row) or row[id_col] in ['',None]:continue
   key=str(row[id_col]);key=(str(row[h.index('ROUTE_ID')])+':'+key) if 'NODE_ID'in h else key
   if unique and key in seen:issues.append({'table':tab,'row':num,'id':key,'field':h[id_col],'error':'DUPLICATE_ID','firstRow':seen[key]})
   seen[key]=num
   for i,value in enumerate(row):
    if i>=len(h):continue
    if str(h[i]).endswith('_JSON') and value not in ['',None]:
     try:json.loads(value) if isinstance(value,str) else value
     except (ValueError,TypeError):issues.append({'table':tab,'row':num,'id':key,'field':h[i],'error':'INVALID_JSON'})
    if isinstance(value,str) and value in ['#REF!','#VALUE!','#DIV/0!','#NAME?','#N/A']:issues.append({'table':tab,'row':num,'id':key,'field':h[i],'error':value})
 return {'tables':len(db),'counts':counts,'issues':issues}
def main():
 p=argparse.ArgumentParser();p.add_argument('--snapshot');p.add_argument('--output',default='content/db.json');a=p.parse_args()
 if a.snapshot:db=json.loads(Path(a.snapshot).read_text());meta={'source':SID,'mode':'pinned local snapshot'}
 else:
  token=os.environ.get('CRPG_GOOGLE_ACCESS_TOKEN')
  if not token:raise SystemExit('Set CRPG_GOOGLE_ACCESS_TOKEN on the build machine, or pass --snapshot.')
  db,meta=read_live(token)
 result=validate(db);target=Path(a.output);target.parent.mkdir(parents=True,exist_ok=True)
 if result['issues']:
  report=target.with_suffix('.validation.json');report.write_text(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit('Validation failed; previous content unchanged. '+str(report))
 data=json.dumps(db,ensure_ascii=False,separators=(',',':')).encode();temp=target.with_suffix('.tmp');temp.write_bytes(data);temp.replace(target)
 meta.update(schemaVersion=1,builtAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),sha256=hashlib.sha256(data).hexdigest(),validation=result)
 target.with_suffix('.manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2));print(json.dumps({'ok':True,'tables':len(db),'sha256':meta['sha256']}))
if __name__=='__main__':main()

from pathlib import Path
import json,hashlib,gzip,sys
base=Path(__file__).resolve().parent;manifest=json.loads((base/'MANIFEST.json').read_text());errors=[]
for item in manifest['artifacts']:
 p=base/item['archivedPath'];raw=p.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=item['archivedSHA256']:errors.append(item['archivedPath']+': archived hash')
 if item.get('compression')=='gzip' and not item.get('pathOnlyChanges'):
  if hashlib.sha256(gzip.decompress(raw)).hexdigest()!=item['originalSHA256']:errors.append(item['archivedPath']+': decompressed original hash')
for item in manifest['generatedFiles']:
 if hashlib.sha256((base/item['path']).read_bytes()).hexdigest()!=item['sha256']:errors.append(item['path']+': generated hash')
print(json.dumps({'artifacts':len(manifest['artifacts']),'errors':errors},ensure_ascii=False));sys.exit(bool(errors))

#!/usr/bin/env python3
"""Run tools/build.py on Windows so dist/ gets the same bytes as the Linux build.

- Text is read and written as UTF-8 with LF newlines. Windows would otherwise write CRLF,
  and once git stores LF the offline-pack SHA-256 of every text file stops matching.
- The WebP cache is seeded from the committed dist/ images first, so an unchanged image is
  never re-encoded by a different libwebp version (which would churn hundreds of files).
Usage: python tools/build_windows.py   (needs Pillow: python -m pip install -r requirements.txt)
"""
from pathlib import Path
import hashlib,json,pathlib,runpy,shutil
ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()
seeded=0
for a in json.loads((ROOT/'content/asset-manifest.json').read_text(encoding='utf-8'))['assets'].values():
 if a['content_rating']!='GENERAL':continue
 local=ROOT/'assets'/Path(a['file_name']).with_suffix('.webp').name
 view,thumb=ROOT/'dist/assets'/local.name,ROOT/'dist/assets/thumb'/local.name
 if not(local.is_file() and view.is_file() and thumb.is_file()):continue
 cache=ROOT/'.asset-build-cache'/sha(local.read_bytes()+b'view1600x1000-portrait720x900-q84-thumb320x360-q80-v1')
 if (cache/'view.webp').is_file() and (cache/'thumb.webp').is_file():continue
 cache.mkdir(parents=True,exist_ok=True);shutil.copy2(view,cache/'view.webp');shutil.copy2(thumb,cache/'thumb.webp');seeded+=1
print('seeded image cache entries:',seeded)
read_text,write_text=pathlib.Path.read_text,pathlib.Path.write_text
pathlib.Path.read_text=lambda self,encoding=None,errors=None,newline=None:read_text(self,encoding=encoding or 'utf-8',errors=errors)
pathlib.Path.write_text=lambda self,data,encoding=None,errors=None,newline=None:write_text(self,data,encoding=encoding or 'utf-8',errors=errors,newline='\n')
runpy.run_path(str(ROOT/'tools/build.py'),run_name='__main__')

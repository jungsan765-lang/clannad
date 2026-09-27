"""Identify authoritative rules independently of UI release numbers.

Changing a runtime module, runtime load order or cleaned content requires a Worker
update. App UI and art changes keep the existing server compatible.
"""
import hashlib, json, re

def runtime_files(root):
    html=(root/'source/index.html').read_text()
    return [x for x in re.findall(r'<script src="([^"?]+)',html)
            if x in ('world_content.js','presentation.js') or x.startswith('runtime')]

def engine_fingerprint(root, data):
    digest=hashlib.sha256(b'crpg-conversation-protocol-2\0')
    for name in runtime_files(root):
        digest.update(name.encode()+b'\0'+(root/'source'/name).read_bytes()+b'\0')
    digest.update(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode())
    return 'engine2-'+digest.hexdigest()

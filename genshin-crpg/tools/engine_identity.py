"""Compatibility depends on rules/content/protocol, never Worker implementation."""
import hashlib, json, re

def runtime_files(root):
    html=(root/'source/index.html').read_text()
    return [x for x in re.findall(r'<script src="([^"?]+)',html)
            if x in ('world_content.js','presentation.js') or x.startswith('runtime')]

def rules_fingerprint(root, data):
    protocol=root/'server/protocol.json'
    version=json.loads(protocol.read_text())['version'] if protocol.exists() else 2
    digest=hashlib.sha256(('crpg-protocol-'+str(version)+'\0').encode())
    for name in runtime_files(root):
        digest.update(name.encode()+b'\0'+(root/'source'/name).read_bytes()+b'\0')
    digest.update(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode())
    return 'engine3-'+digest.hexdigest()

def engine_fingerprint(root, data):
    rules=rules_fingerprint(root,data)
    aliases=root/'server/compatibility.json'
    # Preserve the deployed v2 identifier ONLY for these exact unchanged rules.
    mapping=json.loads(aliases.read_text()) if aliases.exists() else {}
    return mapping.get(rules,rules)

def server_build(root):
    digest=hashlib.sha256()
    for p in sorted((root/'server').glob('*.mjs')):
        digest.update(p.name.encode()+b'\0'+p.read_bytes())
    return 'server-'+digest.hexdigest()[:20]

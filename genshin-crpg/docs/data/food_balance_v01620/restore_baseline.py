#!/usr/bin/env python3
"""Restore the exact before-product bytes into a new directory for audits only."""
import argparse,base64,gzip,hashlib,json
from pathlib import Path

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--archive',type=Path,default=Path(__file__).with_name('baseline_product_snapshot.json.gz'))
    args=parser.parse_args()
    if args.out.exists() and any(args.out.iterdir()):
        parser.error('--out must be new or empty; never restore over a product checkout')
    manifest_path=args.archive.with_name('baseline_product_manifest.json')
    manifest=json.loads(manifest_path.read_text())
    archived=args.archive.read_bytes()
    if hashlib.sha256(archived).hexdigest()!=manifest['compressedSHA256']:
        raise ValueError('archive SHA256 mismatch')
    unpacked=gzip.decompress(archived)
    if hashlib.sha256(unpacked).hexdigest()!=manifest['uncompressedSHA256']:
        raise ValueError('uncompressed snapshot SHA256 mismatch')
    snapshot=json.loads(unpacked)
    if snapshot['schema']!='food-baseline-product-v01620-1':
        raise ValueError('unsupported snapshot schema')
    seen=set()
    args.out.mkdir(parents=True,exist_ok=True)
    for entry in snapshot['files']:
        rel=Path(entry['path'])
        if rel.is_absolute() or '..' in rel.parts or entry['path'] in seen:
            raise ValueError('unsafe or duplicate archive path')
        seen.add(entry['path'])
        content=entry['content'].encode('utf-8') if entry['encoding']=='utf8' else base64.b64decode(entry['content'],validate=True)
        blob=hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest()
        if len(content)!=entry['bytes'] or hashlib.sha256(content).hexdigest()!=entry['sha256'] or blob!=entry['gitBlob']:
            raise ValueError('entry hash mismatch: '+entry['path'])
        destination=args.out/rel
        destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_bytes(content)
    if len(seen)!=len(manifest['files']):
        raise ValueError('snapshot file count mismatch')
    print(json.dumps({'baselinePublishedSHA':snapshot['baselinePublishedSHA'],'restoredFiles':len(seen),'verifiedEveryFile':True,'out':str(args.out),'scope':snapshot['scope']},ensure_ascii=False))
if __name__=='__main__':
    main()

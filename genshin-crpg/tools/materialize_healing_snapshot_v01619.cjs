'use strict';
// Restore an isolated audit runtime without touching product files or a save.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),arg=k=>{const i=process.argv.indexOf(k);return i<0?undefined:process.argv[i+1];},label=arg('--snapshot'),out=path.resolve(arg('--out')||'');
if(!['BEFORE_01618','AFTER_450_MATCH'].includes(label)||!arg('--out'))throw new Error('Use --snapshot BEFORE_01618|AFTER_450_MATCH --out /tmp/isolated-audit-root');
if(out===root||out.startsWith(root+path.sep))throw new Error('Snapshot destination must be outside the product repository.');
const snapshots=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'docs/data/healing_v01619_runtime_snapshots.json.gz')))),s=snapshots[label],hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=new Map();for(const [f,expected]of Object.entries(s.loadedSourceSha256)){
 const bytes=Object.hasOwn(s.files,f)?Buffer.from(s.files[f]):fs.readFileSync(path.join(root,f));if(hash(bytes)!==expected)throw new Error('Unchanged audit dependency no longer matches: '+f);files.set(f,bytes);
}
const db=fs.readFileSync(path.join(root,'content/db.json'));if(hash(db)!==s.dbSha256)throw new Error('DB hash no longer matches the fixed 0.16.18 audit.');files.set('content/db.json',db);
// The index itself is an overlay but not a runtime fingerprint component.
files.set('source/index.html',Buffer.from(s.files['source/index.html']));
for(const [f,bytes]of files){const target=path.join(out,f);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
const H=require('./audit_healing_helpers_v01619.cjs'),env=H.load(out);console.log(JSON.stringify({snapshot:label,root:out,files:files.size,fingerprint:env.fingerprint,productFilesChanged:false}));

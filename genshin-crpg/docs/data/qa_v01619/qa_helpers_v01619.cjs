'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),zlib=require('node:zlib'),crypto=require('node:crypto');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function repo(){return process.env.CRPG_AUDIT_ROOT||path.resolve(__dirname,'../../..');}
function outputDir(name='generated'){const p=process.env.CRPG_QA_OUT||path.join(__dirname,name);fs.mkdirSync(p,{recursive:true});return p;}
function outputFile(name){return path.join(outputDir(),name);}
function baseline(root=repo()){
 if(process.env.CRPG_BASELINE_ROOT)return process.env.CRPG_BASELINE_ROOT;
 const snap=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'baseline_runtime_snapshot.json.gz'))));
 const dbPath=process.env.CRPG_DB_PATH||path.join(root,'content/db.json'),raw=fs.readFileSync(dbPath),db=JSON.parse(raw);
 if(sha(JSON.stringify(db))!==snap.dbRuntimeCompactSha256)throw Error('The runtime database differs semantically from the audited baseline. Use CRPG_DB_PATH or an exact baseline checkout.');
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'crpg-v01619-qa-baseline-'));fs.mkdirSync(path.join(out,'source'));fs.mkdirSync(path.join(out,'content'));
 for(const[file,text]of Object.entries(snap.files)){if(sha(text)!==snap.sha256[file])throw Error('Corrupt original runtime snapshot: '+file);fs.writeFileSync(path.join(out,'source',file),text);}
 fs.writeFileSync(path.join(out,'content/db.json'),raw);
 return out;
}
if(require.main===module)console.log(JSON.stringify({baseline:baseline(),note:'Original source120 files reconstructed. Runtime DB is verified semantically and copied without mutation.'}));
module.exports={repo,baseline,outputDir,outputFile};

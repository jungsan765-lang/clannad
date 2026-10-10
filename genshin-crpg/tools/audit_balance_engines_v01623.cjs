'use strict';
// Execute the exact native contract programs on source, built browser and ESM
// engines. Only the environment loader and output destination are substituted.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..'),BROWSER=path.resolve(process.argv[2]||path.join(ROOT,'dist')),OUT=path.resolve(process.argv[3]||path.join(ROOT,'reports/balance-v01623-engines')),SERVER=path.join(ROOT,'server/generated/engine.mjs');
const H=require('./audit_protagonist_v01618.cjs'),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
function browser(){
 const c=vm.createContext({console,Date:class extends Date{static now(){return 1791615600000;}},setTimeout,clearTimeout});c.window=c;vm.runInContext(fs.readFileSync(path.join(BROWSER,'data.js'),'utf8'),c);
 const loaded=[];for(const[,file]of fs.readFileSync(path.join(BROWSER,'index.html'),'utf8').matchAll(/<script src="([^"?]+)(?:\?[^" ]*)?"/g))if(file==='world_content.js'||file==='presentation.js'||file.startsWith('runtime')){const raw=fs.readFileSync(path.join(BROWSER,file));assert.equal(sha(raw),sha(fs.readFileSync(path.join(ROOT,'source',file))),file);loaded.push(file);vm.runInContext(raw.toString(),c,{filename:'built/'+file});}
 assert.equal(loaded.length,120);return{c,db:c.CRPG_DATA,R:c.CRPGRuntime.Runtime,api:c.CRPGRuntime,root:ROOT,fingerprint:JSON.parse(fs.readFileSync(path.join(BROWSER,'release.json'))).engineVersion};
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});assert(!fs.existsSync(path.join(OUT,'summary.json')),'Use a new directory for each execution');
 const rawBefore=sha(fs.readFileSync(path.join(ROOT,'content/db.json'))),source=H.load(ROOT),built=browser(),server=await import(pathToFileURL(SERVER).href),rows=[];assert.equal(built.fingerprint,server.ENGINE_FINGERPRINT);
 const envs=[['source',source],['browser',built],['server',{R:server.R,db:server.DB,api:globalThis.CRPGRuntime,root:ROOT,fingerprint:server.ENGINE_FINGERPRINT}]];
 for(const test of ['test_field_boss_strategy_v01623.cjs','test_daily_boss_targeting_v01623.cjs'])for(const[name,env]of envs){
  const file=path.join(ROOT,'tests',test),code=fs.readFileSync(file,'utf8'),output=path.join(OUT,name+'-'+test+'.json'),nativeRequire=createRequire(file),before=sha(JSON.stringify(env.db)),facade={argv:[process.execPath,file,output],exitCode:0};
  const adaptedRequire=id=>id==='../tools/audit_protagonist_v01618.cjs'?{...H,load:()=>env}:nativeRequire(id);
  vm.runInNewContext(code,{console,require:adaptedRequire,process:facade,__dirname:path.dirname(file),__filename:file,Buffer,setTimeout,clearTimeout,TextEncoder,TextDecoder},{filename:file,timeout:120000});
  const result=JSON.parse(fs.readFileSync(output)),after=sha(JSON.stringify(env.db));assert.equal(result.failed,0);assert.equal(result.passed,result.total);assert.equal(facade.exitCode,0);assert.equal(before,after);
  rows.push({test,engine:name,engineFingerprint:env.fingerprint,toolSHA256:sha(code),output:path.basename(output),outputSHA256:sha(fs.readFileSync(output)),checks:result.total,passed:result.passed,failed:result.failed,rawDbObjectUnchanged:true});
 }
 assert.equal(rawBefore,sha(fs.readFileSync(path.join(ROOT,'content/db.json'))));const result={scope:'Real source/browser/server engines on the recorded local QA DB. Boundary contracts do not prove all-boss manual difficulty, natural account access or production authored DB equality.',rawDbSHA256:rawBefore,rawDbUnchanged:true,engineFingerprint:server.ENGINE_FINGERPRINT,serverEngineSHA256:sha(fs.readFileSync(SERVER)),rows,total:rows.reduce((n,r)=>n+r.checks,0),passed:rows.reduce((n,r)=>n+r.passed,0),failed:0};fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({total:result.total,passed:result.passed,failed:0,engineFingerprint:result.engineFingerprint}));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

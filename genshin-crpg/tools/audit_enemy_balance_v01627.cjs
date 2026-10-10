'use strict';
// The actual source, built browser scripts, and generated server engine execute
// the same exported contracts in isolated workers. Browser VM is not visual UI QA.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{spawnSync}=require('node:child_process');
const H=require('./audit_protagonist_v01618.cjs'),C=require('../tests/test_enemy_balance_v01627.cjs');
const ROOT=path.resolve(__dirname,'..'),BROWSER=path.resolve(process.argv[2]||path.join(ROOT,'dist')),OUT=path.resolve(process.argv[3]||path.join(ROOT,'reports/enemy-v01627-engines'));
const ENGINE=process.argv[4]&&!process.argv[4].startsWith('--')?process.argv[4]:undefined;
const arg=k=>{const i=process.argv.indexOf(k);return i<0?undefined:process.argv[i+1];},EXTRA=arg('--extra');
const RESUME=process.argv.includes('--resume');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const NativeDate=Date,NOW=1791615600000,FixedDate=class extends NativeDate{constructor(...args){super(...(args.length?args:[NOW]));}static now(){return NOW;}};
// Actual build.py/build_server.py apply runtime_data.clean_runtime_db. In this
// pinned authored snapshot its entire effect is these three authoring-only
// worksheets becoming header-only. Every other table must remain byte-for-byte
// equivalent after JSON parsing; a release DB is never a legacy QA replacement.
const RELEASE_HEADER_ONLY=['28_CANON_AUDIT','40_CRPG_MIGRATION_PLAN','98_BACKUP_CHAR_STATS_20260917'];
function releaseDatabase(raw){const db=copy(raw);for(const name of RELEASE_HEADER_ONLY){assert(Array.isArray(db[name]));db[name]=db[name].slice(0,1);}return db;}
function databaseProof(db,authored,releaseMode){
 const expected=releaseMode?releaseDatabase(authored):authored,keys=Object.keys(authored);
 assert.deepEqual(Object.keys(db).sort(),keys.slice().sort(),'same authored table identities');
 for(const name of keys)assert.equal(sha(JSON.stringify(db[name])),sha(JSON.stringify(expected[name])),'actual authored table, with declared production sanitation only: '+name);
 return{policy:releaseMode?'production-release-header-only-authoring':'full-authored-source',tables:keys.length,headerOnlyTables:releaseMode?RELEASE_HEADER_ONLY:[],runtimeDataToolSHA256:sha(fs.readFileSync(path.join(ROOT,'tools/runtime_data.py'))),semanticSHA256:sha(JSON.stringify(db))};
}
function nativeSourceProof(){
 const index=fs.readFileSync(path.join(ROOT,'source/index.html')),scripts=[...index.toString().matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)].map(x=>x[1]);scripts.push('presentation.js');
 const files=[{path:'source/index.html',sha256:sha(index)},...scripts.map(file=>({path:'source/'+file,sha256:sha(fs.readFileSync(path.join(ROOT,'source',file)))}))];
 return{sha256:sha(JSON.stringify(files)),files};
}
function browser(){
 const c=vm.createContext({console,Date:FixedDate,setTimeout,clearTimeout});c.window=c;
 vm.runInContext(fs.readFileSync(path.join(BROWSER,'data.js'),'utf8'),c,{filename:'built/data.js'});
 const loaded=[];
 for(const[,file]of fs.readFileSync(path.join(BROWSER,'index.html'),'utf8').matchAll(/<script src="([^"?]+)(?:\?[^" ]*)?"/g)){
  if(!['world_content.js','liyue_card_content.js','presentation.js'].includes(file)&&!file.startsWith('runtime'))continue;
  const raw=fs.readFileSync(path.join(BROWSER,file));assert.equal(sha(raw),sha(fs.readFileSync(path.join(ROOT,'source',file))),'built native module is exactly current source: '+file);
  loaded.push(file);vm.runInContext(raw.toString(),c,{filename:'built/'+file});
 }
 const sourceNative=[...fs.readFileSync(path.join(ROOT,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)].map(x=>x[1]);sourceNative.push('presentation.js');
 assert.deepEqual(loaded,sourceNative,'exact native load order and complete closure, no omitted built modules');
 return{c,db:c.CRPG_DATA,R:c.CRPGRuntime.Runtime,api:c.CRPGRuntime,root:ROOT,fingerprint:JSON.parse(fs.readFileSync(path.join(BROWSER,'release.json'))).engineVersion,loadedModules:loaded.length};
}
async function worker(){
 globalThis.Date=FixedDate;
 const raw=fs.readFileSync(path.join(ROOT,'content/db.json')),rawHash=sha(raw),authored=JSON.parse(raw),beforeEnv=C.loadBefore();
 const sourceProof=nativeSourceProof(),release=JSON.parse(fs.readFileSync(path.join(BROWSER,'release.json')));assert.equal(release.appVersion,'0.16.27');
 assert.equal(rawHash,C.AUTHORED_DB_SHA256);
 let env;
 if(ENGINE==='source')env=H.load(ROOT);
 else if(ENGINE==='browser')env=browser();
 else if(ENGINE==='server'){const server=await import(pathToFileURL(path.join(ROOT,'server/generated/engine.mjs')).href);assert.equal(server.ENGINE_FINGERPRINT,release.engineVersion,'rebuild both artifacts before running; generated server must match built browser');env={c:globalThis,R:server.R,db:server.DB,api:globalThis.CRPGRuntime,root:ROOT,fingerprint:server.ENGINE_FINGERPRINT};}
 else throw new Error('Unknown engine '+ENGINE);
 const dbProof=databaseProof(env.db,authored,ENGINE!=='source');
 // Genuine old release engines used this same sanitation. Pair both historical
 // and current release engines with the same actual authored release data while
 // retaining the fully verified old source closure and raw DB provenance.
 if(ENGINE!=='source'){databaseProof(beforeEnv.db,authored,false);beforeEnv.db=releaseDatabase(beforeEnv.db);databaseProof(beforeEnv.db,authored,true);}
 env.rawDbSHA256=rawHash;C.productionBootstrap(env);
 const anchors=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/data/balance_v01627/final_anchors.json'),'utf8'));assert.equal(anchors.enemyBalanceRevision,1);
 const contracts=[{file:'tests/test_enemy_balance_v01627.cjs',run:C.run}];
 if(EXTRA){const file=path.resolve(ROOT,EXTRA),additional=require(file);assert.equal(typeof additional.run,'function','extra contract exports native run({env,beforeEnv})');contracts.push({file:path.relative(ROOT,file),run:additional.run});}
 const rows=[];
 for(const test of contracts){
  const dbBefore=sha(JSON.stringify(env.db)),result=test.run({env,beforeEnv,finalAnchors:anchors.bosses,expectedRevision:anchors.enemyBalanceRevision,onCheck:(row,n)=>{if(!row.passed)console.error(ENGINE+' FAIL '+row.id+' '+row.error);else if(n%20===0)console.log(ENGINE+' '+n+' native contracts completed');}});
  assert(Number.isSafeInteger(result.total)&&result.total>0,'contract returns nonempty actual check counts');
  const output=path.join(OUT,ENGINE+'-'+path.basename(test.file)+'.json');fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  assert.equal(result.failed,0,test.file+' on '+ENGINE+' has failed native contracts');assert.equal(result.passed,result.total);
  assert.equal(sha(JSON.stringify(env.db)),dbBefore,'native contract preserves authored DB object');
  rows.push({engine:ENGINE,test:test.file,checks:result.total,passed:result.passed,failed:result.failed,toolSHA256:sha(fs.readFileSync(path.join(ROOT,test.file))),output:path.basename(output),outputSHA256:sha(fs.readFileSync(output)),rawDbObjectUnchanged:true});
  console.log(ENGINE+' '+test.file+' '+result.passed+'/'+result.total);if(global.gc)global.gc();
 }
 assert.equal(sha(fs.readFileSync(path.join(ROOT,'content/db.json'))),rawHash,'authored DB bytes remain unchanged');
 assert.deepEqual(nativeSourceProof(),sourceProof,'native source closure remains frozen during contract execution');
 const summary={engine:ENGINE,fingerprint:env.fingerprint,rawDbSHA256:rawHash,databaseProof:dbProof,sourceProof,beforeFingerprint:beforeEnv.fingerprint,baselineProof:beforeEnv.baselineProof,loadedModules:env.loadedModules??null,rows,total:rows.reduce((n,r)=>n+r.checks,0),passed:rows.reduce((n,r)=>n+r.passed,0),failed:0};
 fs.writeFileSync(path.join(OUT,ENGINE+'-summary.json'),JSON.stringify(summary,null,2)+'\n');
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});if(ENGINE)return worker();
 assert(!fs.existsSync(path.join(OUT,'summary.json')),'Use a fresh output directory; retain completed historical evidence');
 const rawHash=sha(fs.readFileSync(path.join(ROOT,'content/db.json'))),sourceProof=nativeSourceProof(),rows=[],workers=[];
 const expectedTests=['tests/test_enemy_balance_v01627.cjs',...(EXTRA?[path.relative(ROOT,path.resolve(ROOT,EXTRA))]:[])];
 function validateSummary(engine){
  const summary=JSON.parse(fs.readFileSync(path.join(OUT,engine+'-summary.json')));assert.equal(summary.engine,engine);assert.equal(summary.rawDbSHA256,rawHash);assert.deepEqual(summary.sourceProof,sourceProof,'all workers use the same frozen native source closure');assert.equal(summary.failed,0);
  assert.deepEqual(summary.rows.map(r=>r.test),expectedTests,'the same complete contract set ran');
  for(const row of summary.rows){assert.equal(row.engine,engine);assert.equal(row.toolSHA256,sha(fs.readFileSync(path.join(ROOT,row.test))),'resumed contract body is unchanged');const output=fs.readFileSync(path.join(OUT,row.output));assert.equal(row.outputSHA256,sha(output),'recorded result has not changed');const result=JSON.parse(output);assert.equal(result.failed,0);assert.equal(result.passed,result.total);assert.equal(row.checks,result.total);assert.equal(row.passed,result.passed);assert.equal(row.failed,0);assert.equal(row.rawDbObjectUnchanged,true);assert(result.checks.every(c=>c.passed===true||c.ok===true),'all recorded individual checks passed');}
  assert.equal(summary.total,summary.rows.reduce((n,r)=>n+r.checks,0));assert.equal(summary.passed,summary.total);
  if(engine!=='source')assert.equal(summary.fingerprint,JSON.parse(fs.readFileSync(path.join(BROWSER,'release.json'))).engineVersion,'resumed release-native worker matches final built engine');
  return summary;
 }
 for(const engine of ['source','browser','server']){
  let summary;
  if(RESUME&&fs.existsSync(path.join(OUT,engine+'-summary.json'))){summary=validateSummary(engine);console.log(engine+' verified completed worker retained');}
  else{
   assert(!fs.existsSync(path.join(OUT,engine+'-summary.json')),'Use --resume to validate and retain completed workers');
   const started=NativeDate.now(),run=spawnSync(process.execPath,['--max-old-space-size=768','--expose-gc',__filename,BROWSER,OUT,engine,...(EXTRA?['--extra',EXTRA]:[])],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024,timeout:900000});
   fs.writeFileSync(path.join(OUT,engine+'.stdout.log'),run.stdout||'');fs.writeFileSync(path.join(OUT,engine+'.stderr.log'),run.stderr||'');
   const launch={engine,status:run.status,signal:run.signal,error:run.error?{code:run.error.code,message:run.error.message}:null,elapsedMs:NativeDate.now()-started};fs.writeFileSync(path.join(OUT,engine+'.launch.json'),JSON.stringify(launch,null,2)+'\n');
   assert.equal(run.status,0,engine+' native worker failed '+JSON.stringify(launch)+'; see '+engine+'.stderr.log'+(run.stderr?'\n'+run.stderr:''));
   summary=validateSummary(engine);
  }
  workers.push(summary);rows.push(...summary.rows);console.log(engine+' '+summary.passed+'/'+summary.total+' passed');
 }
 const release=JSON.parse(fs.readFileSync(path.join(BROWSER,'release.json')));assert.equal(release.appVersion,'0.16.27');assert.equal(workers.find(s=>s.engine==='server').fingerprint,release.engineVersion,'actual generated server and built browser share the release engine fingerprint');
 assert.equal(sha(fs.readFileSync(path.join(ROOT,'content/db.json'))),rawHash);
 const summary={version:'0.16.27',scope:'Identical native projection/save/equipment/constellation/operator/initiative/reserve/summon/pressure/EXP ledger contracts on actual source, built browser scripts in Node VM, and generated server. Release engines and their genuine previous-engine counterparts use the verified production sanitation of three authoring-only tables; every gameplay table matches the actual authored DB. This is not graphical browser QA, a population clear-rate survey, a natural acquisition simulation, or all-party balance proof.',rawDbSHA256:rawHash,sourceProof,engineFingerprint:release.engineVersion,databasePolicies:workers.map(w=>({engine:w.engine,proof:w.databaseProof||{policy:'full-authored-source',rawDbSHA256:w.rawDbSHA256}})),serverEngineSHA256:sha(fs.readFileSync(path.join(ROOT,'server/generated/engine.mjs'))),orchestratorSHA256:sha(fs.readFileSync(__filename)),rows,total:rows.reduce((n,r)=>n+r.checks,0),passed:rows.reduce((n,r)=>n+r.passed,0),failed:0};
 fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({total:summary.total,passed:summary.passed,failed:0}));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

'use strict';
// Run the exact frozen strategy QA source against three actual engine classes.
// Only its environment loader and report destination are adapted; no assertion,
// party, enemy, damage packet or victory rule in that QA program is rewritten.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict'),zlib=require('node:zlib'),{createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const ROOT='/workspace/scratch/a62414469990/crpg-v01618-work/genshin-crpg',OUT=path.join(ROOT,'docs/data/balance_v01622/release/final_field_boss_revision/strategy_three_engines'),BROWSER=path.resolve(ROOT,'../v01622-field-boss-verification-work/browser'),SERVER=path.join(ROOT,'server/generated/engine.mjs'),TOOL=path.join(ROOT,'tools/test_field_boss_strategy_v01622.cjs');
const H=require(path.join(ROOT,'tools/audit_protagonist_v01618.cjs')),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const copy=x=>JSON.parse(JSON.stringify(x));
function builtBrowser(){
 const c=vm.createContext({console,Date:class extends Date{static now(){return 1791529200000;}},setTimeout,clearTimeout});c.window=c;
 vm.runInContext(fs.readFileSync(path.join(BROWSER,'data.js'),'utf8'),c,{filename:'built/data.js'});
 const loaded=[];for(const[,file]of fs.readFileSync(path.join(BROWSER,'index.html'),'utf8').matchAll(/<script src="([^"?]+)(?:\?[^" ]*)?"/g))if(file==='world_content.js'||file==='presentation.js'||file.startsWith('runtime')){const raw=fs.readFileSync(path.join(BROWSER,file));loaded.push({file,sha256:sha(raw)});vm.runInContext(raw.toString(),c,{filename:'built/'+file});}
 const release=JSON.parse(fs.readFileSync(path.join(BROWSER,'release.json')));
 return{c,db:c.CRPG_DATA,R:c.CRPGRuntime.Runtime,api:c.CRPGRuntime,root:ROOT,fingerprint:release.engineVersion,loaded};
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});assert(!fs.existsSync(path.join(OUT,'results.json')),'Preserve existing run; new folder needed for a new candidate');
 const plan=JSON.parse(fs.readFileSync(path.join(OUT,'../finalized_plan.json'))),expectedContracts=plan.strategyContractCount,code=fs.readFileSync(TOOL,'utf8'),toolSHA=sha(code),source=H.load(ROOT),browser=builtBrowser(),server=await import(pathToFileURL(SERVER).href),serverEnv={R:server.R,db:server.DB,api:globalThis.CRPGRuntime,root:ROOT,fingerprint:server.ENGINE_FINGERPRINT};
 assert.equal(expectedContracts,18);assert.equal(toolSHA,plan.confirmedFinalQASha256['tools/test_field_boss_strategy_v01622.cjs']);
 assert.equal(browser.fingerprint,server.ENGINE_FINGERPRINT);assert.equal(browser.loaded.length,119);
 for(const row of browser.loaded)assert.equal(row.sha256,sha(fs.readFileSync(path.join(ROOT,'source',row.file))));
 const rows=[],dbFile=fs.readFileSync(path.join(ROOT,'content/db.json')),envs=[['source',source],['browser',browser],['server',serverEnv]];
 for(const[name,env]of envs){
  const output=path.join(OUT,name+'.json'),before=sha(JSON.stringify(env.db)),processFacade={argv:[process.execPath,TOOL,output],exitCode:0},nativeRequire=createRequire(TOOL);
  const adaptedRequire=specifier=>specifier==='./audit_protagonist_v01618.cjs'?{...H,load:(root,candidate)=>{assert.equal(root,ROOT);assert.equal(candidate,undefined);return env;}}:nativeRequire(specifier);
  const sandbox={console,require:adaptedRequire,process:processFacade,__dirname:path.dirname(TOOL),__filename:TOOL,Buffer,setTimeout,clearTimeout,TextEncoder,TextDecoder};
  vm.runInNewContext(code,sandbox,{filename:TOOL,timeout:600000});
  const raw=fs.readFileSync(output),report=JSON.parse(raw),after=sha(JSON.stringify(env.db));
  const row={engine:name,engineFingerprint:env.fingerprint,toolSha256:toolSHA,output:path.basename(output),outputBytes:raw.length,outputSha256:sha(raw),contracts:report.total,passed:report.passed,failed:report.failed,exitCode:processFacade.exitCode,rawDbBeforeSha256:before,rawDbAfterSha256:after,dbObjectChanged:before!==after,newRepeatRevivalContracts:report.checks.filter(x=>x.id.startsWith('new3_two_timeouts_then_real_counter:')).map(x=>({id:x.id,passed:x.passed,revived:x.evidence?.revived,successAfterThirdCore:x.evidence?.successAfterThirdCore})),checkIds:report.checks.map(x=>x.id)};
  fs.writeFileSync(output+'.gz',zlib.gzipSync(raw,{mtime:0}));rows.push(row);
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({toolSha256:toolSHA,rows},null,2)+'\n');
  assert.equal(report.total,expectedContracts);assert.equal(report.failed,0);assert.equal(report.passed,expectedContracts);assert.equal(processFacade.exitCode,0);assert.equal(before,after);assert.equal(row.newRepeatRevivalContracts.length,4);assert(row.newRepeatRevivalContracts.every(x=>x.passed&&x.revived===2&&x.successAfterThirdCore));
 }
 assert.equal(sha(dbFile),sha(fs.readFileSync(path.join(ROOT,'content/db.json'))));
 assert.deepEqual(rows[1].checkIds,rows[0].checkIds);assert.deepEqual(rows[2].checkIds,rows[0].checkIds);
 const final={scope:'Exact frozen18contract program executes against actual source/browser/server engine classes; only environment loader/report destination adapter. Oversized phase-boundary packets declared in originaltool, not fullfight difficulty or winrate proof.',engines:3,programRuns:3,contracts:expectedContracts*3,passed:expectedContracts*3,failed:0,sourceRawDbUnchanged:true,sourceProductSHA256:sha(fs.readFileSync(path.join(ROOT,'source/runtime_field_bosses.js'))),toolSha256:toolSHA,engineFingerprint:server.ENGINE_FINGERPRINT,serverEngineSHA256:sha(fs.readFileSync(SERVER)),rows};
 fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify(final,null,2)+'\n');console.log(JSON.stringify({threeEngineStrategy:{engines:3,contracts:expectedContracts*3,passed:expectedContracts*3,failed:0,engineFingerprint:server.ENGINE_FINGERPRINT}}));
})().catch(e=>{console.error(e);process.exitCode=1;});

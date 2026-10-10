'use strict';
// Start actual published-before fights, save at the real combat opening, reload
// unchanged into after, and finish both through the native combat policy.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),arg=n=>{const i=process.argv.indexOf(n);return i<0?null:process.argv[i+1];},before=arg('--source-root'),after=arg('--after-root')||root,out=arg('--out')||path.join(__dirname,'growth_compat.json');
assert(before,'--source-root fixed baseline required');
const A=require('./audit_growth_v01621.cjs'),H=require(path.join(root,'tools/audit_food_lodging_v01617.cjs')),E=H.loadEnvironment(after),cp=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const cases=[{kind:'ASCENSION',element:'PYRO',team:['MOND_KAEYA','LIYUE_XINGQIU','MOND_BARBARA'],enhance:10},{kind:'ASCENSION',element:'HYDRO',team:'story4',enhance:6},{kind:'TALENT',element:'NEUTRAL',team:'five0',enhance:6}];
const rows=[];
for(const spec of cases){
 const {r,owners}=A.setup({...spec,level:55,stage:60,seed:717});
 r.s.domainDaily.wins=3;const [key,site]=Object.entries(A.env.G.domains).find(([,d])=>d.kind===spec.kind&&d.levels.includes(60));r.s.global.CURRENT_MAP_ID=site.map;
 r.giveItem('GROWTH_GEM_PYRO',29725);r.giveItem('GROWTH_GEM_HYDRO',453);r.giveItem('GROWTH_TALENT_LIYUE',4032);
 const historicalInventory=cp(r.s.inventory);
 r.action('DOMAIN_START',{domain:key+':60',element:spec.element});
 if(r.combatOpening?.())r.action('COMBAT_BEGIN');
 const save=cp(r.s),savedRuntime=cp(save.runtime),b=new A.env.R(A.env.db,cp(save)),a=new E.R(E.db,cp(save));
 assert.deepEqual(cp(a.s.runtime),savedRuntime);assert.deepEqual(cp(a.s.inventory),historicalInventory);assert.equal(a.s.global.LAST_ACTION_RECEIPT_JSON,save.global.LAST_ACTION_RECEIPT_JSON);assert.deepEqual(cp(a.s.combatReceipts||{}),cp(save.combatReceipts||{}));
 const promise=cp(b.growthDomainRewards(b.s.runtime.growthDomain,spec.element));assert.deepEqual(cp(a.growthDomainRewards(a.s.runtime.growthDomain,spec.element)),promise);
 const oldOut=A.policy(b),newOut=A.policy(a);assert(oldOut.victory&&newOut.victory,'native old fight should win in both runtimes');
 assert.deepEqual(cp(newOut),cp(oldOut));assert.deepEqual(cp(a.s.inventory),cp(b.s.inventory));assert.deepEqual(cp(a.s.runtime),cp(b.s.runtime));
 const receiptId=newOut.battleId||newOut.id,finishedSave=a.serialize();assert.equal(a.finishBattle(true),undefined);assert.equal(a.serialize(),finishedSave);const restored=new E.R(E.db,cp(a.s));assert.deepEqual(cp(restored.s.combatReceipts[receiptId]),cp(newOut));assert.equal(restored.serialize(),finishedSave);
 rows.push({spec,owners,save,promise,oldResult:oldOut,newResult:newOut,after:cp(a.s),runtimeBytesPreserved:true,existingInventoryPreserved:true,nativeOldAndNewSettlementIdentical:true,receiptReplayStable:true});
}
const raw=Buffer.from(JSON.stringify({schema:1,beforeRoot:before,afterRoot:after,afterSourceSha256:sha(fs.readFileSync(path.join(after,'source/runtime_growth_v01522.js'))),runnerSha256:sha(fs.readFileSync(__filename)),rows},null,2)+'\n');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out+'.gz',zlib.gzipSync(raw,{level:9}));fs.writeFileSync(out,JSON.stringify({schema:1,conditions:rows.length,oldAscensionVersions:[...new Set(rows.filter(x=>x.spec.kind==='ASCENSION').map(x=>x.save.runtime.growthDomain.ascensionRewardVersion))],oldTalentVersions:[...new Set(rows.filter(x=>x.spec.kind==='TALENT').map(x=>x.save.runtime.growthDomain.talentRewardVersion))],allRuntimeBytesPreserved:true,allInventoryPreserved:true,allNativeSettlementsIdentical:true,allReceiptReplaysStable:true,decompressedSha256:sha(raw),compressedSha256:sha(fs.readFileSync(out+'.gz'))},null,2)+'\n');console.log(fs.readFileSync(out,'utf8'));

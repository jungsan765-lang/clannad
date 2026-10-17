'use strict';
// Independent regression diagnosis. Product source is read-only.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),zlib=require('node:zlib');
const qa=require('../qa_helpers_v01619.cjs');
const root=process.env.CRPG_AUDIT_ROOT||path.resolve(__dirname,'../../../..');
const out=process.env.CRPG_STALEMATE_OUT||path.join(__dirname,'generated');
fs.mkdirSync(out,{recursive:true});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),cp=x=>JSON.parse(JSON.stringify(x));
const roots={before:qa.baseline(root),after:root};
function env(kind){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'crpg-stalemate-'+kind+'-'));
 fs.mkdirSync(path.join(dir,'tests'));fs.mkdirSync(path.join(dir,'tools'));
 for(const leaf of ['source','content'])fs.symlinkSync(path.join(roots[kind],leaf),path.join(dir,leaf),'dir');
 for(const f of ['tests/helpers_v011.cjs','tools/audit_balance_v01522.cjs'])fs.copyFileSync(path.join(root,f),path.join(dir,f));
 const helper=require(path.join(dir,'tests/helpers_v011.cjs')),audit=require(path.join(dir,'tools/audit_balance_v01522.cjs'));
 return{...helper,...audit,sourceRoot:roots[kind]};
}
function observe(r){
 let nativeAutoSteps=0,roundStarts=0;const turn=r.aiTurn,round=r.newRound,finish=r.finishBattle;
 r.aiTurn=function(...args){nativeAutoSteps++;return turn.apply(this,args);};
 r.newRound=function(...args){roundStarts++;return round.apply(this,args);};
 r.finishBattle=function(win){if(this.s.runtime)this._independentFinish={victory:win,battle:cp(this.s.runtime)};return finish.call(this,win);};
 return()=>({nativeAiActions:nativeAutoSteps,roundStarts});
}
function record(kind,spec,stable=false,guardMutation=false){
 const e=env(kind),r=e.setup(spec);r.s.global.PRNG_STATE=717;e.observe(r);const counters=observe(r);
 r.startBattle(stable?'EG_ISK_L04_AA2_CART':spec.group,'EXPLICIT');
 const initial=cp(r.s.runtime),preFixtureOpening=!!r.combatOpening?.();
 if(stable){
  for(const a of r.s.runtime.actors){if(a.source==='PLAYER_CUSTOM')a.hp=0;else if(a.side==='ENEMY')a.atk=0;}
 }
 if(guardMutation){
  const source=fs.readFileSync(path.join(e.sourceRoot,'source/runtime_combat.js'),'utf8');
  const body=source.slice(source.indexOf('P.autoUntilPlayer=function()'),source.indexOf('P.combatAction=function('));
  const mutated=body.replace(/ if\(stalled&&!stalled\.actors\.some\([\s\S]*?\n }\n fail\('COMBAT_LOOP'/," fail('COMBAT_LOOP'");
  if(mutated===body)throw Error('Guard mutation did not match exact source');
  e.vm.runInContext('(function(){const P=CRPGRuntime.Runtime.prototype,fail=(c,m)=>{throw new CRPGRuntime.RuleError(c,m);};'+mutated+'})();',e.c);
 }
 const fixture=cp(r.s.runtime);let result,error;
 try{result=e.play(r);}catch(err){error={code:err.code||err.name,message:err.message};}
 const resultJson=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'{}');
 let restored=false,idempotent=false,serialized;
 if(!r.s.runtime){serialized=r.serialize();new e.R(e.db,JSON.parse(serialized));restored=true;r.finishBattle(false);idempotent=r.serialize()===serialized;}
 const row={kind,name:stable?(guardMutation?'STABLE_IMMUNITY_NO_GUARD':'STABLE_IMMUNITY'):spec.group,inputs:spec,stableFixtureEdits:stable?{protagonistHp:0,enemyAtk:0,allOtherActorStatsUnchanged:true}:null,preFixtureOpening,result,error,counters:counters(),initial,fixture,finished:r._independentFinish||null,resultReceipt:resultJson,receiptCount:Object.keys(r.s.combatReceipts||{}).length,runtimeRemaining:!!r.s.runtime,restored,idempotent,remainingBattle:r.s.runtime?cp(r.s.runtime):null};
 const filename=kind+'_'+row.name+'.json.gz';fs.writeFileSync(path.join(out,filename),zlib.gzipSync(JSON.stringify(row)));
 return{kind,name:row.name,result,error,counters:row.counters,rounds:row.finished?.battle.round,actors:row.finished?.battle.actors.map(a=>({id:a.id,source:a.source,side:a.side,hp:a.hp,maxHp:a.maxHp})),resultReceipt:resultJson,receiptCount:row.receiptCount,runtimeRemaining:row.runtimeRemaining,restored,idempotent,initialActors:initial.actors.map(a=>({source:a.source,side:a.side,hp:a.hp,maxHp:a.maxHp,atk:a.atk,def:a.def})),fixtureEdits:row.stableFixtureEdits,file:filename};
}
const specs=[{level:48,team:'five',enhance:6,talent:'mid',formation:'DOUBLE_LINE',map:'MAP_LY_DETAIL_TIANQIU',group:'EG_FB_PRIMO_GEOVISHAP'},{level:56,team:'heal',enhance:6,talent:'mid',formation:'DOUBLE_LINE',map:'MAP_CHASM_DEEP',group:'EG_FB_RUIN_SERPENT'}];
const rows=[];
for(const kind of ['before','after'])for(const spec of specs){const row=record(kind,spec);rows.push(row);console.log(JSON.stringify({kind,name:row.name,result:row.result,error:row.error,counters:row.counters}));}
for(const kind of ['before','after']){const row=record(kind,{level:10,team:['MOND_BARBARA'],enhance:0,talent:1,map:'MAP_MOND_PLAINS'},true);rows.push(row);console.log(JSON.stringify({kind,name:row.name,result:row.result,error:row.error,counters:row.counters}));}
const mutation=record('after',{level:10,team:['MOND_BARBARA'],enhance:0,talent:1,map:'MAP_MOND_PLAINS'},true,true);rows.push(mutation);console.log(JSON.stringify({kind:'after',name:mutation.name,result:mutation.result,error:mutation.error,counters:mutation.counters}));
const autoSources=Object.fromEntries(Object.entries(roots).map(([kind,p])=>{const t=fs.readFileSync(path.join(p,'source/runtime_combat.js'),'utf8');const f=t.slice(t.indexOf('P.autoUntilPlayer=function()'),t.indexOf('P.combatAction=function('));return[kind,{sha256:hash(f),bytes:Buffer.byteLength(f)}];}));
const summary={collectedUTC:new Date().toISOString(),baselinePublishedSHA:'1e1b2442b53d42873d29556898f5f612d52d0c7a',productSourceUnmodified:true,autoSources,autoUntilPlayerIdentical:autoSources.before.sha256===autoSources.after.sha256,rows,limitations:'The stable regression is a declared input boundary: dead protagonist and zero enemy attack. No AI, damage, immunity or round function is replaced. The separate no-guard counterfactual changes only the 2,000-step settlement guard in VM memory; its COMBAT_LOOP failure is expected. Natural boss fixtures preserve original level, roster, gear, talents and seed.'};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({summary:path.join(out,'summary.json'),autoUntilPlayerIdentical:summary.autoUntilPlayerIdentical}));

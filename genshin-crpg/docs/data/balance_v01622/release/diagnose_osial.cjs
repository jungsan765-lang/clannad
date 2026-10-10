'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root='/workspace/scratch/a62414469990/crpg-v01618-work/genshin-crpg';
const {setup,observe}=require(path.join(root,'tools/audit_balance_v01522.cjs'));
const {policy}=require(path.join(root,'tools/audit_balance_v0161.cjs'));
const out=path.join(root,'docs/data/balance_v01622/release/osial_diagnostic');fs.mkdirSync(out,{recursive:true});
const cp=x=>JSON.parse(JSON.stringify(x)),team=['MOND_FISCHL','LIYUE_XIANGLING','MOND_BARBARA'],rows=[];
function guardPolicy(r){
 if(r.s.runtime&&r.combatOpening?.())r.action('COMBAT_BEGIN');
 const choices=[];
 for(let n=0;r.s.runtime&&n<400;n++){
  const b=r.s.runtime;if(b.liyueInterlude){r.action('LIYUE_INTERLUDE_ACK');continue;}if(b.interlude){r.action('STORY_NEXT',{node:r.storyActiveNodeId()});continue;}
  const a=b.actors.find(a=>a.source==='PLAYER_CUSTOM'),cards=r.combatCards().filter(x=>!x.reason),enemies=b.actors.filter(a=>a.side==='ENEMY'&&a.hp>0);
  let card=cards.find(x=>x.id==='SYS_MOND_WIND_ROUTE');if(!card&&b.subduedPending)card=cards.find(x=>x.id===b.storyConfig?.orb_action?.id);
  // Use existing support skills on the first round; guard thereafter. No actor/monster edits.
  if(!card&&b.round===1)card=cards.find(x=>x.id==='PLAYER_ISEKAI_E');
  if(!card)card=cards.find(x=>x.id==='PLAYER_BASIC_GUARD');
  if(!card){r.autoUntilPlayer();continue;}
  const t=(card.targets||[]).map(t=>enemies.find(e=>e.id===t.id)||t).sort((a,b)=>(a.hp??Infinity)-(b.hp??Infinity))[0];
  choices.push({round:b.round,card:card.id,playerHp:a?.hp,playerMaxHp:a?.maxHp});r.action('COMBAT',{card:card.id,...(t?{target:t.id}:{})});
 }
 const x=r.s.runtime?{victory:false,stalled:true,rounds:r.s.runtime.round}:JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'{}');return {...x,choices};
}
const files=['source/runtime_rules.js','source/runtime_combat.js','source/runtime_growth_v01522.js','source/runtime_liyue_cards.js','content/db.json','tools/audit_balance_v01522.cjs','tools/audit_balance_v0161.cjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));const before=hashes();
for(const mode of ['current_standard','legacy_defense_only_counterfactual','current_first_E_then_guard'])for(const seed of [717,4242,9031]){
 const route='ROUTE_ISEKAI',r=setup({level:60,route,team,enhance:10,talent:8,map:'MAP_OSIAL_BATTLE'});
 r.s.flags.FLAG_ISK_L01_LEAF='K1';r.storySetCursor('ISK_L04_K1_040');r.s.global.PRNG_STATE=seed;observe(r);r.startBattle('EG_ISK_L04_OSIAL','STORY:ISK_L04_K1_040',{confirmed:true,companions:team});
 if(mode==='legacy_defense_only_counterfactual')delete r.s.runtime.defenseRevision;
 const fixture={route,mode,seed,defenseRevision:r.s.runtime.defenseRevision??null,healingBalanceRevision:r.s.runtime.healingBalanceRevision??null,actors:cp(r.s.runtime.actors),objective:cp(r.s.runtime.liyueObjective),growth:Object.fromEntries(['PLAYER_CUSTOM',...team].map(id=>[id,{...r.growth(id),phase:r.growthPhase(id),talents:r.s.talents[id],constellation:r.s.constellations?.[id]||0,equipment:r.s.inventory.filter(x=>x.equipped&&x.owner===id).map(x=>({...x,name:r.row('16_EQUIP_DB',x.equip)[1]}))}]))};
 const startingSave=cp(r.s),result=mode==='current_first_E_then_guard'?guardPolicy(r):policy(r),last=cp(r._auditLast);
 const row={fixture,result,final:last,deluge:last?.log.filter(x=>x.card==='OSIAL_DELUGE'&&(Object.hasOwn(x,'damage')||x.miss))};rows.push(row);
 const native={...row,startingSave,finalSave:cp(r.s)};fs.writeFileSync(path.join(out,`${mode}_${seed}.json.gz`),zlib.gzipSync(JSON.stringify(native),{mtime:0}));
 fs.writeFileSync(path.join(out,'observations.json'),JSON.stringify({schema:1,beforeHashes:before,afterHashes:hashes(),assumptions:{syntheticOwnership:true,level:60,phase:6,enhance:10,talent:8,constellation:0,artifactCount:0,noEnemyEdits:true,noForcedWin:true,legacyDefenseOnlyCounterfactual:'Only delete defenseRevision on identical newly initialized battle; current healing policy is retained. This is a controlled counterfactual, not an old savedbattle.'},rows},null,2)+'\n');
 console.log(JSON.stringify({mode,seed,victory:result.victory,reason:last?.defeatReason,rounds:result.rounds,objective:last?.objective,allies:last?.actors.filter(a=>a.side==='ALLY').map(a=>({source:a.source,hp:a.hp,maxHp:a.maxHp})),deluge:row.deluge?.length}));
}
if(JSON.stringify(before)!==JSON.stringify(hashes()))throw Error('Diagnostic inputs drifted');

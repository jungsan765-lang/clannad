'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../../..');
const H=require(ROOT+'/docs/data/balance_v01622/fieldboss_counter_final/audit_protagonist_v01618.cjs');
const cp=x=>x===undefined?null:JSON.parse(JSON.stringify(x));
const cases=JSON.parse(fs.readFileSync(process.argv[2]));
const out=process.argv[3],limit=Number(process.argv[4]||80);
const env=H.load(ROOT),FB=env.api.fieldBosses;
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const inputFiles=[...fs.readFileSync(ROOT+'/source/index.html','utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)].map(m=>'source/'+m[1]);
inputFiles.push('source/index.html','source/presentation.js','content/db.json');
const inputs=Object.fromEntries(inputFiles.map(f=>[f,hash(ROOT+'/'+f)]));
const data={version:'0.16.22 baseline',fingerprint:env.fingerprint,inputs,assumptions:{party:'Native fixed four; traveler C0 plus three companions. Owned level/phase/talents/equipment/constellation fixtures granted legally. Initial full HP once. No food/inn/tools/artifacts.',comparison:'Same team at C0 and C6 is within-team constellation comparison. Cross-rarity team comparison remains composition-dependent.',policy:'Only public protagonist COMBAT actions; companion native AI unchanged. GUARD_ONLY measures autonomous party completion, not zero-player-input AFK.'},rows:[],errors:[]};
for(const spec of cases){const wall=Date.now();try{
 const ids=spec.ids||['LIYUE_XIANGLING','MOND_KAEYA','MOND_BARBARA'];
 const level=spec.level||FB.bosses[spec.boss].level,enhance=spec.enhance??(level>=30?6:3);
 const r=H.setup(env,{level,team:ids,route:'ROUTE_TRAVELER',seed:spec.seed||717,map:FB.bosses[spec.boss].map,enhance,talent:spec.talent});
 if(spec.constellation)for(const id of ids){r.giveItem('STELLA_'+id,spec.constellation);for(let n=0;n<spec.constellation;n++)r.action('CONSTELLATION_UNLOCK',{char:id});}
 r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;for(const id of ids)r.s.chars[id].hp=r.character(id).maxHp;
 const meter=H.observe(env,r),audit={enemyAttempts:0,enemyHpDamage:0,enemyShieldDamage:0,playerHpDamage:0,companionHpDamage:0,rounds:{},actions:[],minHp:{},koEvents:[],manualGuards:0};
 const capture=()=>{for(const a of r.s.runtime?.actors||[])if(a.side==='ALLY'){audit.minHp[a.source]=Math.min(audit.minHp[a.source]??1,a.hp/a.maxHp);}};
 const d=r.damage;r.damage=function(a,t,...rest){if(a.side==='ENEMY'&&t.side==='ALLY')audit.enemyAttempts++;return d.call(this,a,t,...rest);};
 const app=r.applyDamage;r.applyDamage=function(a,t,n,o){const hp=t.hp,shield=(t.shields||[]).reduce((s,x)=>s+x.value,0),res=app.call(this,a,t,n,o),dh=Math.max(0,hp-t.hp),ds=Math.max(0,shield-(t.shields||[]).reduce((s,x)=>s+x.value,0));if(a.side==='ENEMY'&&t.side==='ALLY'){audit.enemyHpDamage+=dh;audit.enemyShieldDamage+=ds;if(hp>0&&t.hp<=0)audit.koEvents.push({round:r.s.runtime?.round,target:t.source,actor:a.source,card:o?.card});}if(a.side==='ALLY'&&t.side==='ENEMY')audit[a.source==='PLAYER_CUSTOM'?'playerHpDamage':'companionHpDamage']+=dh;capture();return res;};
 const ai=r.aiTurn;r.aiTurn=function(a,...args){const b=r.s.runtime;if(a.side==='ENEMY')audit.rounds[b.round]=(audit.rounds[b.round]||0)+1;return ai.call(this,a,...args);};
 const route=FB.route(spec.boss);r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT'});
 const initial=r.s.runtime,initialActors=cp(initial.actors),startFieldBoss=cp(initial.fieldBoss);
 if(r.combatOpening?.())r.action('COMBAT_BEGIN');
 let n=0;for(;r.s.runtime&&n<limit;n++){
  const b=r.s.runtime;if(b.liyueInterlude){r.action('LIYUE_INTERLUDE_ACK');continue;}if(b.interlude){r.action('STORY_NEXT',{node:r.storyActiveNodeId()});continue;}
  const cards=r.combatCards().filter(x=>!x.reason),foes=b.actors.filter(x=>x.side==='ENEMY'&&x.hp>0);let card,target;
  if(spec.policy==='GUARD_ONLY'){card=cards.find(x=>x.id==='PLAYER_BASIC_GUARD');audit.manualGuards++;}
  card??=cards.find(x=>/PLAYER_TRAVELER_ANEMO_Q$/.test(x.id));card??=cards.find(x=>x.id==='PLAYER_TRAVELER_ANEMO_E');card??=cards.find(x=>x.id==='PLAYER_BASIC_ATTACK')||cards.find(x=>x.id==='PLAYER_BASIC_GUARD');
  if(!card){r.autoUntilPlayer();continue;}
  target=card.targets.map(t=>foes.find(a=>a.id===t.id)||t).sort((a,b)=>(a.hp??Infinity)-(b.hp??Infinity))[0];
  const boss=b.actors.find(x=>x.source===spec.boss);audit.actions.push({round:b.round,card:card.id,target:target?.id,bossHp:boss?.hp,revival:cp(boss?.fb?.revival),telegraph:cp(b.fieldBoss?.telegraph)});
  r.action('COMBAT',{card:card.id,...(target?{target:target.id}:{}),...(card.id==='PLAYER_TRAVELER_ANEMO_E'?{branch:'HOLD'}:{})});capture();
 }
 const active=r.s.runtime,last=r._auditLast||active||initial,receipt=active?{stalled:true,victory:false,rounds:active.round}:JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'{}');
 const count={};for(const log of last.log||[])if(log.card)count[log.card]=(count[log.card]||0)+1;
 const row={...spec,ids,level,enhance,equipment:cp(r.s.inventory.filter(x=>x.equipped)),effectiveTalents:Object.fromEntries(['PLAYER_CUSTOM',...ids].map(id=>[id,cp(r.talentLevels(id))])),constellations:cp(r.s.constellations),initialActors,startFieldBoss,receipt,outcome:active?'INPUT_LIMIT':receipt.victory?'VICTORY':'DEFEAT',inputs:n,rounds:receipt.rounds,finalBattleHp:last.actors.filter(x=>x.side==='ALLY').map(x=>({source:x.source,hp:x.hp,maxHp:x.maxHp})),bossTerminal:cp(last.actors.find(x=>x.source===spec.boss)),meter,audit,logCardCounts:count,wallSeconds:(Date.now()-wall)/1000};
 row.finalBattleHpRatio=row.finalBattleHp.reduce((s,x)=>s+x.hp,0)/row.finalBattleHp.reduce((s,x)=>s+x.maxHp,0);data.rows.push(row);console.log(JSON.stringify({boss:spec.boss,c:spec.constellation||0,policy:spec.policy,outcome:row.outcome,inputs:n,rounds:row.rounds,hp:+row.finalBattleHpRatio.toFixed(4),minHp:audit.minHp,enemyAttempts:audit.enemyAttempts,enemyHpDamage:audit.enemyHpDamage,enemyShieldDamage:audit.enemyShieldDamage,heal:meter.heal,revives:count.FB_REVIVED||0,seconds:row.wallSeconds}));
 }catch(e){data.errors.push({...spec,message:e.message,stack:e.stack});console.log(JSON.stringify(data.errors.at(-1)));}
 fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');
}
data.afterInputs=Object.fromEntries(inputFiles.map(f=>[f,hash(ROOT+'/'+f)]));data.inputDrift=Object.keys(inputs).filter(f=>inputs[f]!==data.afterInputs[f]);fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({out,rows:data.rows.length,errors:data.errors.length,inputDrift:data.inputDrift}));if(data.errors.length)process.exitCode=1;

/* v0.14.4 two-day boss rematches (재료 재도전). Once the story fight is behind the player, Andrius and Dvalin come
 * back as Lv.15 and Lv.18 fights: stronger, worth more experience, and paying 영웅의 경험 books on top of the
 * essence/core drops that break the +10 limit. Story fights and the first field challenge keep their numbers.
 * The rematch opens a few levels below its level, because entering spends the 48-hour admission even on a loss.
 * Load after runtime_formations.js. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
if(!P.materialChallengeReason)throw Error('runtime_enhancement.js must be loaded first');
// hp/atk/def multiply the story profile (runtime_mond_boss_balance.js) after the formation offset.
// 0.15.2 balance check (runtime_balance_v0152.js): at the recommended level both rematches were lost every time (Andrius
// grows stronger each round, Dvalin's ruins fall after eight rounds) and only maxed +12 parties beat Dvalin. Now a party
// at the recommended level wins most fights, and broken-through gear wins them comfortably.
const REMATCH={
 BOSS_ANDRIUS:{level:25,minLevel:22,hp:2.2,atk:1.8,def:1.35,books:{MAT_CHAR_EXP_HERO:2}},
 BOSS_DVALIN:{level:28,minLevel:25,hp:1.65,atk:1.85,def:1.6,books:{MAT_CHAR_EXP_HERO:3}}
};
api.bossRematch=copy(REMATCH);
const old=Object.fromEntries(['materialChallengeReason','startBattle','finishBattle','validateSave'].map(k=>[k,P[k]]));
P.bossRematchInfo=function(boss){const R=REMATCH[boss];return R?{boss,...copy(R),xp:120+25*R.level,mora:250+60*R.level}:null;};
P.materialChallengeReason=function(boss){
 const base=old.materialChallengeReason.call(this,boss);if(base)return base;
 const R=REMATCH[boss];if(R&&(Number(this.s.global.PLAYER_LEVEL_STATE)||1)<R.minLevel)return '재료 재도전은 권장 Lv. '+R.level+' 전투입니다. 주인공 Lv. '+R.minLevel+'부터 도전할 수 있습니다.';
 return '';
};
P.startBattle=function(group,origin='EXPLICIT',...rest){
 const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime;
 if(!b||b===before||b.rematch||!String(origin).startsWith('MATERIAL_CHALLENGE:'))return out;
 const boss=b.actors.find(a=>a.side==='ENEMY'&&REMATCH[a.source]);if(!boss)return out;
 const R=REMATCH[boss.source];
 boss.maxHp=Math.round(boss.maxHp*R.hp);boss.hp=boss.maxHp;boss.atk=Math.round(boss.atk*R.atk);boss.def=Math.round(boss.def*R.def);boss.level=R.level;
 b.rematch={version:1,boss:boss.source,level:R.level};
 const r=b.mondBalance?.rewards;
 if(r&&!b.storyConfig?.noRewards){const xp=120+25*R.level,mora=250+60*R.level;r.xp=xp;r.mora=mora;r.parts=[{source:boss.source,level:R.level,grade:'보스',xp,mora}];}
 return out;
};
P.finishBattle=function(victory){
 const b=this.s.runtime,m=b?.rematch?copy(b.rematch):null,noRewards=!!b?.storyConfig?.noRewards,result=old.finishBattle.call(this,victory);
 if(!m||!result||typeof result!=='object')return result;
 result.rematch={boss:m.boss,level:m.level};
 if(victory&&!noRewards){const books=REMATCH[m.boss].books;result.loot={...(result.loot||{})};for(const [id,n]of Object.entries(books)){this.giveItem(id,n);result.loot[id]=(result.loot[id]||0)+n;}}
 const key=result.battleId||result.id;this.s.combatReceipts[key]=copy(result);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(result);
 const log=this.s.log.findLast(x=>x.battleId===key);if(log)Object.assign(log,copy(result));
 return result;
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,m=out.runtime?.rematch;
 if(m&&(m.version!==1||!REMATCH[m.boss]||m.level!==REMATCH[m.boss].level))fail('REMATCH_SAVE','보스 재도전 기록이 올바르지 않습니다.');
 const d=out.bossRealAdmissions;if(d!==undefined&&(!d||typeof d!=='object'||Array.isArray(d)||Object.entries(d).some(([boss,day])=>!(Object.hasOwn(api.enhancementConfig.bosses,boss)||/^FARM_(TARTAGLIA|AZHDAHA)$/.test(boss))||!Number.isSafeInteger(day)||day<0)))fail('REMATCH_SAVE','보스 입장 기록이 올바르지 않습니다.');
 return out;
};
// v0.14.5: now that the game reads real time, the two-day bosses open once per real day per boss (reset at
// midnight, Korean time). The server's action clock decides online. Entering still counts, win or lose, and
// the old in-game 48-hour records are simply no longer read.
const DAY=86400000,KST=9*3600000,priorApply=P.apply;
P.bossRealNow=function(){return Number(this.actionStartedAt??Date.now());};
P.bossRealDay=function(now=this.bossRealNow()){return Math.floor((now+KST)/DAY);};
P.bossAdmission=function(boss){
 const now=this.bossRealNow(),today=this.bossRealDay(now),used=this.s.bossRealAdmissions?.[boss]===today,left=used?Math.max(1,Math.ceil(((today+1)*DAY-KST-now)/60000)):0;
 return {boss,remainingMinutes:left,realDay:today,reason:used?'이 보스는 하루에 한 번(현실 시간, 한국 시간 자정에 초기화) 입장할 수 있습니다. '+Math.floor(left/60)+'시간 '+(left%60)+'분 남음.':''};
};
P.recordBossAdmission=function(boss){if(!api.enhancementConfig.bosses[boss])return;(this.s.bossRealAdmissions??={})[boss]=this.bossRealDay();};
// The Liyue farming rematches (Tartaglia's artifacts, Azhdaha's crystals) follow the same real-day rule.
const FARM_KEY=kind=>'FARM_'+kind,priorFarmReason=P.liyueArtifactFarmReason,priorFarmStart=P.startLiyueArtifactFarm;
if(priorFarmReason&&priorFarmStart){
 P.liyueArtifactFarmReason=function(kind){
  const base=priorFarmReason.call(this,kind);if(base&&!/게임 내 48시간/.test(base))return base;
  const now=this.bossRealNow(),today=this.bossRealDay(now);if(this.s.bossRealAdmissions?.[FARM_KEY(kind)]!==today)return '';
  const left=Math.max(1,Math.ceil(((today+1)*DAY-KST-now)/60000));return '이 보스는 하루에 한 번(현실 시간, 한국 시간 자정에 초기화) 파밍 입장할 수 있습니다. '+Math.floor(left/60)+'시간 '+(left%60)+'분 남음.';
 };
 P.startLiyueArtifactFarm=function(kind){
  const why=this.liyueArtifactFarmReason(kind);if(why)fail('LIYUE_FARM',why);
  const cd=this.s.liyueArtifactFarm?.cooldowns;if(cd)cd[kind]=0; // the old in-game 48-hour record is no longer read
  const out=priorFarmStart.call(this,kind);(this.s.bossRealAdmissions??={})[FARM_KEY(kind)]=this.bossRealDay();return out;
 };
}
// A story retry restores a pre-battle snapshot; keep today's admissions instead of clearing them.
P.apply=function(a){
 if(a?.type!=='STORY_RETRY')return priorApply.call(this,a);
 const keep={...(this.s.bossRealAdmissions||{})},out=priorApply.call(this,a);
 if(Object.keys(keep).length){this.s.bossRealAdmissions??={};for(const [boss,day]of Object.entries(keep))this.s.bossRealAdmissions[boss]=Math.max(day,this.s.bossRealAdmissions[boss]??0);}
 return out;
};
})(globalThis);

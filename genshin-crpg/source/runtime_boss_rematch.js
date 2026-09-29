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
const REMATCH={
 BOSS_ANDRIUS:{level:15,minLevel:13,hp:3.4,atk:2.6,def:1.6,books:{MAT_CHAR_EXP_HERO:2}},
 BOSS_DVALIN:{level:18,minLevel:16,hp:2.2,atk:2.2,def:1.8,books:{MAT_CHAR_EXP_HERO:3}}
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
 return out;
};
})(globalThis);

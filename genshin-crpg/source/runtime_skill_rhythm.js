/* v0.14.4 skill rhythm and 공명 각성.
 * Companions no longer share one cooldown pair. Each elemental skill (E) and burst (Q) repeats on its own rhythm,
 * counted in the character's own turns and read from the original kit: E 2/3/4 for a short/medium/long skill
 * cooldown, Q 3/4/5 for a 40/60/70-80 energy burst. A slower card hits, heals and shields harder when it lands
 * (this card's own damage, heals and shields only; fields and summons it leaves behind keep their numbers).
 * 공명 각성: a companion holding their exclusive weapon may awaken it when casting the burst — 30% plus 2% per
 * enhancement of that weapon. The awakened burst deals 1.5x damage and heals/shields 1.3x, and the battle log marks
 * it so the screen can show the character's art. Numbers are CRPG rules. Load after runtime_exclusive_weapons.js and
 * runtime_gear_traits.js (the SIGNATURE trait only comes from exclusive weapons). */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.skillRhythmVersion)return;
const copy=x=>JSON.parse(JSON.stringify(x));
// [E, Q] rhythm in the character's own turns.
const RHYTHM={
 MOND_ALBEDO:[2,3],MOND_BARBARA:[4,6],MOND_BENNETT:[2,5],MOND_VENTI:[2,4],MOND_DIONA:[2,5],MOND_DAHLIA:[3,4],MOND_DILUC:[3,3],
 MOND_AMBER:[3,3],MOND_JEAN:[2,5],MOND_KAEYA:[2,4],MOND_KLEE:[3,4],MOND_MIKA:[3,5],MOND_MONA:[3,4],MOND_NOELLE:[4,4],
 MOND_FISCHL:[4,4],MOND_LISA:[2,5],MOND_RAZOR:[2,5],MOND_ROSARIA:[2,4],MOND_SUCROSE:[3,5],MOND_EULA:[2,5],
 LIYUE_BAIZHU:[3,5],LIYUE_BEIDOU:[2,5],LIYUE_QIQI:[4,5],LIYUE_NINGGUANG:[3,3],LIYUE_KEQING:[2,3],LIYUE_GAMING:[2,4],
 LIYUE_GANYU:[3,4],LIYUE_XINGQIU:[4,5],LIYUE_HUTAO:[3,4],LIYUE_XIANGLING:[3,5],LIYUE_XIANYUN:[3,5],LIYUE_LANYAN:[3,4],
 LIYUE_XIAO:[2,5],LIYUE_SHENHE:[3,5],LIYUE_XINYAN:[3,4],LIYUE_TARTAGLIA:[3,4],LIYUE_YANFEI:[2,5],LIYUE_YELAN:[3,5],
 LIYUE_YUNJIN:[2,4],LIYUE_YAOYAO:[3,5],LIYUE_ZHONGLI:[2,3],LIYUE_CHONGYUN:[3,3],LIYUE_ZIBAI:[3,4]
};
const POWER={E:{2:1,3:1.3,4:1.6},Q:{3:1,4:1.25,5:1.5,6:1.5}};
const AWAKEN={base:.3,perEnhance:.02,damage:1.5,support:1.3};
api.skillRhythm={version:1,rhythm:copy(RHYTHM),power:copy(POWER),awaken:copy(AWAKEN)};
const slot=c=>c&&c.owner&&RHYTHM[c.owner]?(c.id===c.owner+'_E'?'E':c.id===c.owner+'_Q'?'Q':null):null;
const old=Object.fromEntries(['cardDefinition','executeCard','combatDamageMultiplier','heal','shield'].map(k=>[k,P[k]]));
P.cardDefinition=function(r,enemy=false){
 const c=old.cardDefinition.call(this,r,enemy),s=!enemy&&slot(c);
 if(s)c.cooldown=RHYTHM[c.owner][s==='E'?0:1];
 return c;
};
P.skillRhythm=function(id){const R=RHYTHM[id];return R?{e:R[0],q:R[1],ePower:POWER.E[R[0]],qPower:POWER.Q[R[1]]}:null;};
// The exclusive weapon a companion is holding (its enhancement raises the awakening chance).
P.resonanceWeapon=function(owner){return this.s.inventory.find(i=>i.equipped&&i.owner===owner&&i.equip==='EQ_EX_'+owner)||null;};
// A fighter or a character id. 0.15.3: a fighter brought from another adventurer's journey (다인 모드) carries its own
// chance (resonanceSnapshot), worked out from that journey's weapon.
P.resonanceChance=function(x){if(x&&typeof x==='object'){if(Number.isFinite(x.resonanceSnapshot))return Math.max(0,Math.min(.9,x.resonanceSnapshot));x=x.source;}const w=this.resonanceWeapon(x);return w?Math.min(.9,AWAKEN.base+AWAKEN.perEnhance*(Number(w.enhance)||0)):0;};
P.executeCard=function(a,c,...rest){
 const b=this.s.runtime,s=b&&a?.side==='ALLY'&&slot(c);if(!s)return old.executeCard.call(this,a,c,...rest);
 const R=RHYTHM[c.owner],power=s==='E'?POWER.E[R[0]]:POWER.Q[R[1]];let dmg=power,support=power;
 if(s==='Q'&&Number(a.traits?.SIGNATURE||0)>0){
  const chance=this.resonanceChance(a);
  if(chance>0&&this.random()<chance){dmg*=AWAKEN.damage;support*=AWAKEN.support;
   b.log.push({actor:a.name,actorId:a.id,card:c.id,cardName:c.name,resonance:true,text:a.name+' · 공명 각성 — 원소폭발이 한층 강해졌다.',round:b.round,actionSequence:b.actionSequence||0});
   b.resonanceCount=(b.resonanceCount||0)+1;}
 }
 if(dmg===1&&support===1)return old.executeCard.call(this,a,c,...rest);
 const prev=this._rhythm;this._rhythm={actor:a.id,dmg,support};
 try{return old.executeCard.call(this,a,c,...rest);}finally{this._rhythm=prev;}
};
P.combatDamageMultiplier=function(a,t,e,o={}){
 let n=old.combatDamageMultiplier.call(this,a,t,e,o);const r=this._rhythm;
 if(r&&a?.id===r.actor&&t?.side!==a.side)n*=r.dmg;
 return n;
};
P.heal=function(t,amount,...rest){const r=this._rhythm;return old.heal.call(this,t,r&&t?.side==='ALLY'?amount*r.support:amount,...rest);};
P.shield=function(t,value,...rest){const r=this._rhythm;return old.shield.call(this,t,r&&t?.side==='ALLY'?value*r.support:value,...rest);};
P.skillRhythmVersion=1;
})(globalThis);

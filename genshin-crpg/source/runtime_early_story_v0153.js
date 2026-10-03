/* 0.15.3 early story fights (user: 「전 컨텐츠 한번씩 해보면서 뭔가 막히는게 있나? 싶은게 있으면 해결하면 돼」).
 * The 이세계 route opens with a story hilichurl patrol of three to five (party-banded, so each has double health) against
 * the protagonist and Amber, and an AI-played Lv.1 and Lv.2 party lost it even with the starter kit; a defeat there sends
 * a brand-new player off to grind before the story has begun. The Traveler's temple waves already shrink with the party
 * size (runtime_journey.js), so story patrols now shrink the same way: health ×0.2/0.3/0.425/1 and attack
 * ×0.35/0.6/0.85/1 for one to four allies, and at most one more hilichurl than there are allies (the K branch fights the
 * gate patrol alone). Which ones stay follows the field rule (limitFieldBattle: elites first, then different kinds).
 * Random patrols and other fights keep their numbers. Load before runtime_starter_kit_v0153.js so the kit is worn
 * before the battle is built. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.earlyStoryV0153)return;P.earlyStoryV0153=true;
const HP=[.2,.3,.425,1],ATK=[.35,.6,.85,1],GROUPS=new Set(['EG_MOND_HILI_PATROL']);
const old={startBattle:P.startBattle};
P.startBattle=function(group,origin='EXPLICIT',options={}){
 const result=old.startBattle.call(this,group,origin,options),b=this.s.runtime;
 if(!b||b.opening?.state!=='PENDING'||b.balanceProfile||!String(origin).startsWith('STORY:')||!GROUPS.has(group))return result;
 const n=Math.max(1,Math.min(4,b.actors.filter(a=>a.side==='ALLY'&&a.hp>0).length));
 this.limitFieldBattle(b,{version:1,kind:'STORY_PATROL',party:n,maxEnemies:n+1,recommendedLevel:2});
 for(const a of b.actors.filter(a=>a.side==='ENEMY')){
  const before=a.maxHp;a.hp=a.maxHp=Math.max(1,Math.round(before*HP[n-1]));a.atk=Math.max(1,Math.round(a.atk*ATK[n-1]));
  for(const sh of a.shields||[])sh.value=Math.round(sh.value*a.maxHp/before);
 }
 return result;
};
api.earlyStoryV0153={groups:[...GROUPS],hp:[...HP],atk:[...ATK]};
})(typeof globalThis!=='undefined'?globalThis:this);

/* Conversation journals contain commands, never client-authored saves or rewards. */
(function(root){
'use strict';
const P=root.CRPGRuntime.Runtime.prototype;
P.previewStoryRead=function(node,type='STORY_NEXT',params={node}){
 const before=this.s,n=type==='STORY_CHOICE'?this.storyChoices().find(x=>x[4]===node):this.storyNode();
 if(!['STORY_NEXT','STORY_CHOICE','STORY_NAME'].includes(type)||before.global.SCREEN_MODE!=='STORY'||before.runtime&&!before.runtime.interlude||before.lifeJob||before.worldJob||before.battlePreparation||before.storyJourney||before.storyBreak||!n||n[4]!==node||!['DIALOGUE','NARRATION','CHOICE','INPUT_TEXT'].includes(n[5]))return null;
 if(type==='STORY_NAME'&&(n[5]!=='INPUT_TEXT'||params.name!==before.global.PLAYER_NAME))return null;
 try{
  const result=this.action(type,type==='STORY_NAME'?{name:params.name}:{node}),state=this.s;
  // Server randomness is private. Battle resolution and random rewards remain boundaries.
  // Deterministic dialogue flags, costs and choices are replayed and validated atomically.
  if(state.global.PRNG_STATE!==before.global.PRNG_STATE||!!state.runtime!==!!before.runtime||state.battlePreparation||state.lifeJob||state.worldJob)return null;
  if(before.runtime&&JSON.stringify(before.runtime)!==JSON.stringify(state.runtime))return null;
  const boundary=state.global.SCREEN_MODE!=='STORY'||!!state.storyJourney||!!state.storyBreak||state.storyContext?.entry!==before.storyContext?.entry;
  return {state,result,boundary};
 }catch{return null;}finally{this.s=before;}
};
})(globalThis);
/* 0.16.48 비경 피로 (user, 2026-10-16: 「제일 중요한건? 어떤 비경을 가더라도, 효율적 측면에서 반드시 돌아가거나 요리를 이용해서 회복을
 * 해야한다는거야. 그게 있어야 어떤것이든 수요가 존재할 수 있으니까」, choosing 「비경 피로」).
 * Healers have their burst ready at the start of every fight and nothing caps healing below max HP, so a healing or
 * shielding party never had to rest (0–8% lost a run in most domains). Every domain fight leaves each party member who
 * fought in it one 피로 (max 4).
 * 0.16.49 (user: 「쉬운 재료 갖다가 요리 두개 양산해서 쓰면 60레벨로 그냥 다 해먹을 수 있을거 아니야?」, 「HP%가 닳으면 … 요리로 차는 HP랑
 * 어떻게 비교할건데?」, 「방어력이나 공격력같은것에 비경들에만 영향을 미치게 하는게 낫지 않을까」 → chose 「비경 안 공격력·방어력」 and
 * 「레벨에 맞는 요리만」): 피로 no longer touches HP. Each 피로 takes 10% off the member's ATK and DEF in a domain fight only
 * (it adds up: 1–4 → −10 · 20 · 30 · 40%); fields, bosses and ley lines are not affected. An inn stay clears all 피로. A recovery
 * dish clears 피로 only when its ingredients are hard enough for the eater's level — see foodRarity below — so easy dishes
 * made in bulk do nothing for a high-level party.
 * A defeat outside the story no longer heals for free: the party stands up at 30% HP in the safe town and rests at the inn
 * there or eats. Abyss, raid, co-op and story fights are left as they were. It sits at the end of runtime_reading.js, the
 * last engine file, so it wraps the battle and shop rules outermost and the engine file list stays the one the older engine
 * comparisons check. Only a domain fight carries the marker (fatigueRevision); other fights look exactly as before. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.fatigueVersion)return;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const PLAYER='PLAYER_CUSTOM',PER=.15,MAX=4,RECOVER_HP=.3,REVISION=2;
// A dish's rarity: each raw ingredient of its recipe (a processed one counts as what it is made from) scores by the easiest
// way to get it — 0 when a shop sells it for under 200 Mora or one try at the best reachable place gives 1 or more; 1 when one
// try gives at least ½ (사과, 일몰 열매, 죽순, 연꽃받침, 절운고추); 2 when it gives fewer (송이버섯, 금어초, 솔방울) or only a 200+ Mora
// shop has it. Easy ingredients add nothing, however many a dish needs.
// The eater's level asks for a rarity: Lv20 or lower 0, Lv21–40 1, Lv41 and up 2. A dish under that clears nothing; one at it
// clears 1, and every 2 more clear 1 more (up to 4). A dish with no recipe (only sold) scores by its grade.
const GRADE_RARITY={'일반':0,'고급':1,'희귀':2,'전설':4},NEED=[[20,0],[40,1],[Infinity,2]],RARE_PRICE=200;
const needFor=level=>NEED.find(([top])=>(Number(level)||1)<=top)[1];
const tableCache=new WeakMap();
function rarityTable(rt){
 const key=rt.tables['17_RECIPE_DB'];let c=tableCache.get(key);if(c)return c;
 // Places the map can reach (from 몬드성 along open paths): a region not in the game yet does not make a food common.
 const reach=new Set(['MAP_MOND_CITY']),edges=[...rt.tables['47_MAP_EDGE_DB'].values()].filter(e=>e[8]==='Y'&&e[11]==='ACTIVE');
 for(let grew=true;grew;){grew=false;for(const e of edges)if(reach.has(e[1])&&!reach.has(e[2])&&rt.tables['32_MAP_DB'].has(e[2])){reach.add(e[2]);grew=true;}}
 const field={},shop={};
 for(const map of reach)for(const kind of ['GATHER','HUNT','FISH']){let pool=[];try{pool=rt.lifePool(kind,map)||[];}catch{}const total=pool.reduce((n,p)=>n+(Number(p.weight)||0),0);if(!total)continue;
  for(const p of pool){const y=(Number(p.weight)||0)/total*((Number(p.min)||1)+(Number(p.max)||Number(p.min)||1))/2;field[p.item]=Math.max(field[p.item]||0,y);}}
 for(const row of rt.tables['19_SHOP_STOCK_DB'].values()){if(row[2]!=='ITEM'||row[8]==='SYSTEM_DISABLED')continue;const price=Number(row[5]);if(Number.isFinite(price))shop[row[3]]=Math.min(shop[row[3]]??Infinity,price);}
 const made={};for(const row of rt.tables['17_RECIPE_DB'].values())if(row[2]==='ITEM'&&row[3])(made[row[3]]??=[]).push(row);
 c={field,shop,made,dish:{}};tableCache.set(key,c);return c;
}
const unitRarity=(t,id)=>{const r=[];if(t.field[id])r.push(t.field[id]>=1?0:t.field[id]>=.5?1:2);if(t.shop[id]!==undefined)r.push(t.shop[id]<RARE_PRICE?0:2);return r.length?Math.min(...r):null;};
const parts=row=>{const out=[];for(let i=0;i<5;i++){const id=row[5+i*2],n=Number(row[6+i*2]);if(id&&n>0)out.push([id,n]);}return out;};
function rarityOf(t,id,n,depth){
 const r=unitRarity(t,id);if(r!==null)return n*r;
 const proc=(t.made[id]||[]).find(x=>x[1]!=='요리');if(proc&&depth<4){const per=Number(proc[4])||1;return parts(proc).reduce((s,[i,q])=>s+rarityOf(t,i,q*n/per,depth+1),0);}
 return 0;
}
const old=Object.fromEntries(['startBattle','finishBattle','meal','buy','recoverParty','validateSave'].map(k=>[k,P[k]]));
const setHp=(r,id,hp)=>{if(id===PLAYER)r.s.global.PLAYER_HP_CURRENT=hp;else if(r.s.chars?.[id])r.s.chars[id].hp=hp;};
const levelOf=(r,id)=>id===PLAYER?Number(r.s.global.PLAYER_LEVEL_STATE)||1:Number(r.s.chars?.[id]?.level)||1;
const own=(r,a)=>a?.side==='ALLY'&&!a.coop&&a.control!=='GUEST'&&(a.source===PLAYER||!!r.s.chars?.[a.source]);
const domainFight=b=>!!(b?.growthDomain&&!b.coop&&!b.storyConfig&&!b.abyss&&!b.raid);
P.fatigueStacks=function(id){return Math.max(0,Math.min(MAX,Math.floor(Number(this.s.fatigue?.stacks?.[id])||0)));};
P.setFatigue=function(id,n){n=Math.max(0,Math.min(MAX,Math.floor(n)));if(!n&&!this.s.fatigue)return;const f=this.s.fatigue??={version:1,stacks:{}};if(n)f.stacks[id]=n;else delete f.stacks[id];};
P.fatigueView=function(){const party=(this.s.party||[]).filter(p=>p.active).map(p=>p.source).filter(Boolean);return {perStack:PER,max:MAX,members:party.map(id=>({id,stacks:this.fatigueStacks(id),statRatio:1-PER*this.fatigueStacks(id)})).filter(x=>x.stacks)};};
// What a dish would do to an eater's 피로 (the quick meal shows 「피로 3→1」).
P.fatigueMealCap=function(id,item){const n=this.fatigueStacks(id),clear=n?Math.min(n,this.foodFatigueClear(item,id)):0;return {clear,left:n-clear};};
// A tired member fights a domain with lower ATK and DEF.
P.startBattle=function(group,origin,...rest){
 const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime;
 if(!b||b===before||!domainFight(b))return out;
 b.fatigueRevision=REVISION;
 for(const a of b.actors||[]){if(!own(this,a))continue;const n=this.fatigueStacks(a.source);if(!n)continue;const k=1-PER*n;a.fatigue=n;a.atk=Math.max(1,Math.round((Number(a.atk)||0)*k));a.def=Math.max(0,Math.round((Number(a.def)||0)*k));}
 return out;
};
// Each member who fought in a domain comes out one 피로 more tired (a fight started by 0.16.48 keeps that version's mark).
P.finishBattle=function(victory,...rest){
 const b=this.s.runtime,domain=!!(b&&[1,REVISION].includes(b.fatigueRevision)&&b.growthDomain),ids=domain?[...new Set(b.actors.filter(a=>own(this,a)).map(a=>a.source))]:[];
 const out=old.finishBattle.call(this,victory,...rest);
 if(!domain||!ids.length)return out;
 const added=[];for(const id of ids){const n=this.fatigueStacks(id);if(n<MAX){this.setFatigue(id,n+1);added.push(id);}}
 const info={added,stacks:Object.fromEntries(ids.map(id=>[id,this.fatigueStacks(id)])),perStack:PER,max:MAX};
 if(out&&typeof out==='object'){out.fatigue=info;const key=out.battleId||out.id;if(key&&this.s.combatReceipts?.[key])this.s.combatReceipts[key].fatigue=copy(info);try{const last=JSON.parse(this.s.global.LAST_BATTLE_RESULT_JSON||'null');if(last&&(last.battleId||last.id)===key){last.fatigue=copy(info);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(last);}}catch{}}
 return out;
};
P.foodRarity=function(item){const t=rarityTable(this);if(item in t.dish)return t.dish[item];const rec=(t.made[item]||[]).find(r=>r[1]==='요리');return t.dish[item]=rec?parts(rec).reduce((s,[i,q])=>s+rarityOf(t,i,q,0),0):(GRADE_RARITY[this.tables['14_ITEM_DB']?.get(item)?.[3]]??0);};
P.foodFatigueNeed=function(owner=PLAYER){return needFor(levelOf(this,owner));};
P.foodFatigueClear=function(item,owner=PLAYER){let spec=null;try{spec=this.foodSpec(item,{});}catch{}if(!spec?.heal)return 0;const r=this.foodRarity(item),need=this.foodFatigueNeed(owner);return r<need?0:Math.min(MAX,1+Math.floor((r-need)/2));};
// A recovery dish eases 피로 when it is hard enough for the eater's level. A tired eater at full HP may still eat such a dish
// (the meal rule refuses full HP): the HP is lowered by 1 for the check and the dish fills it again.
P.meal=function(meals,...rest){
 const lifted=[];for(const m of Array.isArray(meals)?meals:[]){const id=m?.owner||PLAYER;let a=null;try{a=this.economyOwner(id);}catch{}if(a&&a.hp>0&&a.hp>=a.maxHp&&this.fatigueStacks(id)&&this.foodFatigueClear(m?.item,id)>0&&!lifted.some(x=>x.id===id)){lifted.push({id,hp:a.hp});setHp(this,id,a.maxHp-1);}}
 let out;try{out=old.meal.call(this,meals,...rest);}catch(e){for(const x of lifted)setHp(this,x.id,x.hp);throw e;}
 for(const m of out?.meals||[]){const before=this.fatigueStacks(m.owner);if(!before)continue;const n=this.foodFatigueClear(m.item,m.owner);this.setFatigue(m.owner,before-n);m.fatigueCleared=before-this.fatigueStacks(m.owner);m.fatigueLeft=this.fatigueStacks(m.owner);}
 return out;
};
// An inn stay clears every 피로 of the party it heals.
P.buy=function(id,qty,...rest){
 const row=this.tables['19_SHOP_STOCK_DB']?.get(id),inn=!!row&&row[2]==='SERVICE'&&row[3]==='SERVICE_INN_REST_8H',party=inn?(this.s.party||[]).filter(p=>p.active).map(p=>p.source):[];
 const out=old.buy.call(this,id,qty,...rest);
 if(inn)for(const pid of party)this.setFatigue(pid,0);
 return out;
};
// A defeat outside the story: back on your feet at 30% HP, in the safe town — rest or eat there.
P.recoverParty=function(retreat=false,...rest){
 const out=old.recoverParty.call(this,retreat,...rest);
 if(retreat&&this.s.global.SCREEN_MODE==='LOCATION'&&!this.s.runtime){for(const p of (this.s.party||[]).filter(x=>x.active)){const a=p.source===PLAYER?this.player():this.character(p.source);setHp(this,p.source,Math.max(1,Math.ceil((Number(a?.maxHp)||1)*RECOVER_HP)));}if(out&&typeof out==='object')out.hpRatio=RECOVER_HP;}
 return out;
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,f=out.fatigue;
 if(f!==undefined&&(!f||typeof f!=='object'||f.version!==1||!f.stacks||typeof f.stacks!=='object'||Array.isArray(f.stacks)||Object.entries(f.stacks).some(([id,n])=>!(id===PLAYER||out.chars?.[id])||!Number.isInteger(n)||n<1||n>MAX)))fail('FATIGUE_SAVE','비경 피로 기록이 올바르지 않습니다.');
 const b=out.runtime;if(b?.fatigueRevision!==undefined&&![1,REVISION].includes(b.fatigueRevision))fail('FATIGUE_SAVE','비경 피로 전투 기록이 올바르지 않습니다.');
 for(const a of b?.actors||[])if(a.fatigue!==undefined&&!(Number.isInteger(a.fatigue)&&a.fatigue>=1&&a.fatigue<=MAX))fail('FATIGUE_SAVE','비경 피로 전투 기록이 올바르지 않습니다.');
 return out;
};
P.fatigueVersion=REVISION;
api.fatigueV01648={version:REVISION,perStack:PER,max:MAX,stats:['atk','def'],need:NEED.map(([top,n])=>({upToLevel:Number.isFinite(top)?top:60,rarity:n})),rarePrice:RARE_PRICE,gradeRarity:copy(GRADE_RARITY),recoverHp:RECOVER_HP};
})(globalThis);

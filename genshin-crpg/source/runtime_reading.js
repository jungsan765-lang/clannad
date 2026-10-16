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
 * 0.16.52 (user: 「비경 피로도 시간 지나면 줄어들 수 있게 하자」): 피로 also eases by itself, 1 every 30 minutes of real time (the
 * server's action clock, as the ley lines use), so a party that comes back later finds it gone. The record keeps, for each
 * member, the time the next 1 started counting (s.fatigue version 2); a save from before starts counting at its next action.
 * A defeat outside the story no longer heals for free: the party stands up at 30% HP in the safe town and rests at the inn
 * there or eats. Abyss, raid, co-op and story fights are left as they were. It sits at the end of runtime_reading.js, the
 * last engine file, so it wraps the battle and shop rules outermost and the engine file list stays the one the older engine
 * comparisons check. Only a domain fight carries the marker (fatigueRevision); other fights look exactly as before. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.fatigueVersion)return;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const PLAYER='PLAYER_CUSTOM',PER=.15,MAX=4,RECOVER_HP=.3,REVISION=2,DECAY_MS=30*60000;
// A dish's rarity: each ingredient of its recipe (a processed one counts as what it is made from) scores by how hard it is
// to get — 0 for anything a shop sells under 200 Mora or one try at a reachable place gives 1 or more of; 1 when one try gives
// at least ½ (사과, 일몰 열매, 죽순, 연꽃받침, 절운고추 …); 2 when it gives fewer (송이버섯, 금어초, 솔방울 …). Easy ingredients add
// nothing, however many a dish needs. The list is fixed here so the server and every screen agree; tests/test_fatigue_v01648.cjs
// recomputes it from the gathering pools and the shops and fails when they drift apart.
// The eater's level asks for a rarity: Lv20 or lower 0, Lv21–40 1, Lv41 and up 2. A dish under that clears nothing; one at it
// clears 1, and every 2 more clear 1 more (up to 4). A dish with no recipe (only sold) scores by its grade.
const RARE={ING_APPLE:1,ING_SUNSETTIA:1,ING_LOTUS_HEAD:1,ING_BAMBOO_SHOOT:1,MAT_LIYUE_JUEYUN_CHILI:1,MAT_LIYUE_GLAZE_LILY:1,MAT_LIYUE_STARCONCH:1,
 ING_MATSUTAKE:2,ING_SNAPDRAGON:2,ING_PINECONE:2,ING_JAM:2,ING_CALLA_LILY:2,ING_LAMP_GRASS:2,MAT_LIYUE_NOCTILUCOUS_JADE:2};
const GRADE_RARITY={'일반':0,'고급':1,'희귀':2,'전설':4},NEED=[[20,0],[40,1],[Infinity,2]];
const needFor=level=>NEED.find(([top])=>(Number(level)||1)<=top)[1];
const tableCache=new WeakMap();
// Ingredients come from 48_RECIPE_INGREDIENT_DB, the table the cooking itself uses (recipeCost); the columns of 17_RECIPE_DB
// are not filled the same way on every screen.
function recipeTable(rt){
 const key=rt.tables['48_RECIPE_INGREDIENT_DB'];let c=tableCache.get(key);if(c)return c;
 const made={},parts={};for(const row of rt.tables['17_RECIPE_DB'].values())if(row[2]==='ITEM'&&row[3])(made[row[3]]??=[]).push(row);
 for(const i of [...key.values()].sort((a,b)=>a[2]-b[2]))if(i[3]&&Number(i[4])>0)(parts[i[1]]??=[]).push([i[3],Number(i[4])]);
 c={made,parts,dish:{}};tableCache.set(key,c);return c;
}
function rarityOf(t,id,n,depth){
 if(RARE[id]!==undefined)return n*RARE[id];
 const proc=(t.made[id]||[]).find(x=>x[1]!=='요리');if(proc&&depth<4){const per=Number(proc[4])||1;return (t.parts[proc[0]]||[]).reduce((s,[i,q])=>s+rarityOf(t,i,q*n/per,depth+1),0);}
 return 0;
}
const old=Object.fromEntries(['apply','startBattle','finishBattle','meal','buy','recoverParty','validateSave'].map(k=>[k,P[k]]));
const setHp=(r,id,hp)=>{if(id===PLAYER)r.s.global.PLAYER_HP_CURRENT=hp;else if(r.s.chars?.[id])r.s.chars[id].hp=hp;};
const levelOf=(r,id)=>id===PLAYER?Number(r.s.global.PLAYER_LEVEL_STATE)||1:Number(r.s.chars?.[id]?.level)||1;
const own=(r,a)=>a?.side==='ALLY'&&!a.coop&&a.control!=='GUEST'&&(a.source===PLAYER||!!r.s.chars?.[a.source]);
const domainFight=b=>!!(b?.growthDomain&&!b.coop&&!b.storyConfig&&!b.abyss&&!b.raid);
P.fatigueNow=function(){return Number(this.actionStartedAt??Date.now());};
// What a member has now, after the 30-minute easing (a record without a start time has not started counting).
const stored=(r,id)=>Math.max(0,Math.min(MAX,Math.floor(Number(r.s.fatigue?.stacks?.[id])||0)));
const eased=(r,id,now=r.fatigueNow())=>{const n=stored(r,id),at=Number(r.s.fatigue?.at?.[id]);if(!n||!Number.isFinite(at))return {n,at:Number.isFinite(at)?at:null};const k=Math.max(0,Math.floor((now-at)/DECAY_MS));return {n:Math.max(0,n-k),at:at+k*DECAY_MS};};
P.fatigueStacks=function(id){return eased(this,id).n;};
// Minutes until a member's next 1 eases (null when there is nothing to ease).
P.fatigueNextEase=function(id){const e=eased(this,id);if(!e.n)return null;const now=this.fatigueNow(),at=e.at??now;return Math.max(1,Math.ceil((at+DECAY_MS-now)/60000));};
P.setFatigue=function(id,n){n=Math.max(0,Math.min(MAX,Math.floor(n)));if(!n&&!this.s.fatigue)return;const now=this.fatigueNow(),e=eased(this,id,now);const f=this.s.fatigue??={version:2,stacks:{},at:{}};if(f.version!==2){f.version=2;f.at={};}f.at??={};
 if(n){f.stacks[id]=n;f.at[id]=e.n&&e.at!==null?e.at:now;}else{delete f.stacks[id];delete f.at[id];}};
// After every action the record is brought up to date (eased 1s removed, an old record starts its clock).
P.apply=function(a,...rest){const out=old.apply.call(this,a,...rest);const f=this.s.fatigue;if(f&&typeof f==='object'){const now=this.fatigueNow();if(f.version!==2){f.version=2;f.at={};for(const id of Object.keys(f.stacks||{}))f.at[id]=now;}else for(const id of Object.keys(f.stacks||{})){const e=eased(this,id,now);if(e.n!==stored(this,id)){if(e.n){f.stacks[id]=e.n;f.at[id]=e.at;}else{delete f.stacks[id];delete f.at[id];}}else if(!Number.isFinite(Number(f.at?.[id])))(f.at??={})[id]=now;}}return out;};
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
P.foodRarity=function(item){const t=recipeTable(this);if(item in t.dish)return t.dish[item];const rec=(t.made[item]||[]).find(r=>r[1]==='요리');return t.dish[item]=rec?(t.parts[rec[0]]||[]).reduce((s,[i,q])=>s+rarityOf(t,i,q,0),0):(GRADE_RARITY[this.tables['14_ITEM_DB']?.get(item)?.[3]]??0);};
P.foodFatigueNeed=function(owner=PLAYER){return needFor(levelOf(this,owner));};
// For the screens: how rare one ingredient is (0 · 1 · 2), and what a dish clears in each level band.
P.ingredientRarity=function(id){return rarityOf(recipeTable(this),id,1,0);};
P.foodFatigueBands=function(item){let spec=null;try{spec=this.foodSpec(item,{});}catch{}if(!spec?.heal)return null;const r=this.foodRarity(item);return NEED.map(([top,need],i)=>({from:i?NEED[i-1][0]+1:1,upTo:Number.isFinite(top)?top:60,need,clear:r<need?0:Math.min(MAX,1+Math.floor((r-need)/2))}));};
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
 if(f!==undefined&&(!f||typeof f!=='object'||![1,2].includes(f.version)||f.version===2&&(!f.at||typeof f.at!=='object'||Array.isArray(f.at)||Object.entries(f.at).some(([id,t])=>!Object.hasOwn(f.stacks,id)||!Number.isSafeInteger(t)||t<0))||!f.stacks||typeof f.stacks!=='object'||Array.isArray(f.stacks)||Object.entries(f.stacks).some(([id,n])=>!(id===PLAYER||out.chars?.[id])||!Number.isInteger(n)||n<1||n>MAX)))fail('FATIGUE_SAVE','비경 피로 기록이 올바르지 않습니다.');
 const b=out.runtime;if(b?.fatigueRevision!==undefined&&![1,REVISION].includes(b.fatigueRevision))fail('FATIGUE_SAVE','비경 피로 전투 기록이 올바르지 않습니다.');
 for(const a of b?.actors||[])if(a.fatigue!==undefined&&!(Number.isInteger(a.fatigue)&&a.fatigue>=1&&a.fatigue<=MAX))fail('FATIGUE_SAVE','비경 피로 전투 기록이 올바르지 않습니다.');
 return out;
};
P.fatigueVersion=REVISION;
api.fatigueV01648={version:REVISION,perStack:PER,max:MAX,easeMinutes:DECAY_MS/60000,stats:['atk','def'],need:NEED.map(([top,n])=>({upToLevel:Number.isFinite(top)?top:60,rarity:n})),rareIngredients:copy(RARE),gradeRarity:copy(GRADE_RARITY),recoverHp:RECOVER_HP};
})(globalThis);
/* 0.16.51 비경 단계 난이도 (user, 2026-10-16: 「비경 도는것에 대해 좀 밸런스를 맞춰보는게 좋아보여. 저레벨부터 고레벨까지 전체적으로
 * 훑어보고 적당한 선을 지정하고 그게 이 보상에 맞는 수준이 맞는지까지」). The line, measured at the stage's own level with the
 * usual growth (crafted weapons +0/+3/+6/+9, talents at 65% of the cap), full HP and no 피로: every 4★ party wins, a run costs a
 * 4★ party 15–45% HP on average and a 5★ party 5–30%. Lv5 stages are the first steps and stay gentle. The stages outside the
 * line get their enemies' HP and ATK scaled at the start of a new fight (a fight already saved keeps its enemies); the
 * measurements and the reasons are in docs/PATCH_0.16.51_KO.md. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.domainTuneVersion)return;
const TUNE={
 // too easy (a run cost the 4★ parties under 12%)
 'VALLEY_OF_REMEMBRANCE:15':[1.5,2.0],'RIDGE_WATCH:30':[1.6,1.9],
 'LIANSHAN_FORMULA:30':[2.0,2.5],'LIANSHAN_FORMULA:35':[2.2,3.2],'LIANSHAN_FORMULA:40':[2.0,2.7],'LIANSHAN_FORMULA:45':[1.5,1.8],'LIANSHAN_FORMULA:50':[1.4,1.7],
 'TAISHAN_MANSION:30':[1.8,2.2],'TAISHAN_MANSION:35':[2.0,2.5],
 // too hard (4★ parties lost)
 'FORSAKEN_RIFT:20':[0.75,0.6],'FORSAKEN_RIFT:25':[0.8,0.7],'PEAK_OF_VINDAGNYR:20':[0.8,0.7],'TAISHAN_MANSION:60':[0.9,0.85],'LOST_VALLEY:60':[0.75,0.6]
};
const old=P.startBattle;
P.startBattle=function(group,origin,...rest){
 const before=this.s.runtime,out=old.call(this,group,origin,...rest),b=this.s.runtime;
 const t=b&&b!==before&&b.growthDomain&&!b.coop&&!b.storyConfig?TUNE[b.growthDomain.id]:null;if(!t)return out;
 const [hp,atk]=t;
 for(const a of b.actors.filter(x=>x.side==='ENEMY')){a.maxHp=Math.max(1,Math.round(a.maxHp*hp));a.hp=a.maxHp;a.atk=Math.max(1,Math.round(a.atk*atk));for(const s of a.shields||[])if(Number.isFinite(s.value)){s.value=Math.round(s.value*hp);if(Number.isFinite(s.initialValue))s.initialValue=Math.round(s.initialValue*hp);}}
 return out;
};
P.domainTuneVersion=1;
api.domainTuneV01651={version:1,stages:JSON.parse(JSON.stringify(TUNE))};
})(globalThis);

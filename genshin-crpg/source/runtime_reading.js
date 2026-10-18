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
/* 0.16.53 보스 장기전 (user, 2026-10-16: 「필드보스 일일보스는 좀 라운드를 길게 끌게 하자. HP같은걸 10배로 늘리거나 해서. 드발린은...
 * 땅 무너지는 속도를 늦추거나」). A field boss or daily boss fight started from now has its boss HP multiplied and its boss
 * ATK lowered, so the fight lasts several times as many rounds (and brings the 조작 minigames that many more times) while the
 * damage a party takes over the whole fight stays about where it was. 드발린's ground falls one step every TERRAIN_EVERY rounds
 * instead of every 2 (the fight's own terrainEvery). Summons, the story fights and fights already saved are as they were.
 * The measurements are in docs/PATCH_0.16.53_KO.md. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.bossLengthVersion)return;
// Boss HP ×3, boss ATK and the ground it spoils ×0.45: about as hard as before, three times as long (measured: the same 4★
// parties win and lose). 유적 뱀 was already the longest, so ×2; 0.16.54's boss pass took away its armour's and 고대 바위 용
// 도마뱀's scales' wall against every blow (they only take some off now), and the fights got short again: both ×4.
// 물의 정령 falls when its forms are beaten, not by HP: 8 → 20 forms.
// The daily bosses were measured the same way (docs/data/balance_v01627/daily/final_cases.json): the same share of those
// parties wins with 안드리우스 ×0.35, 타르탈리아 ×0.34 (its third phase hits hardest and now lasts three times as long) and 야타용왕 ×0.75 (its big hits
// were what beat a party, not the length).
// 0.16.55 (user: 「적 공격력도 전체적으로 잘 체크해봐」): at the boss's own level the 4★ parties ended 무상의 뇌전 74–88% and 유적의 뱀 75–85% whole;
// 무상의 뇌전 ×0.55 and 유적의 뱀 ×0.75 leave them 61–78% and 45–65%, every one of five saves still a win. The others stay: a little more and
// the healer stops keeping up, so the same parties lose outright (×0.5–0.6 already beat 무상의 바람·무상의 얼음·무상의 바위·얼음 나무 in some saves).
// 0.16.57 (user: 「무상의 뇌전같은 다른 무상 애들은 왜 핵 닫히는게 없노?」): 무상의 뇌전·바위 now keep their core shut while they wind up
// (runtime_field_bosses.js fieldBossCore), so their fights spend about a third of their rounds unable to hurt them: HP ×2 instead of ×3
// keeps them as long as before. 무상의 얼음 keeps ×3 — its 20% ice wall became the shell over the core, which shortened it enough.
// 0.16.59 (user, 2026-10-18: 「후반 레벨대로 갈수록 5성이 필요하게끔 할거야 … 4성 풀돌이나 5성 두개는 가지고 있게 될거야」): the late field
// bosses (무상의 바위 45, 원암 48, 유적의 뱀 56) hit harder — a same-level 4★ party without constellations no longer wins, 4★ C6 and
// 5★ do — and 폭염 나무 (38, mid) a little softer, so a 4★ party wins it with real damage instead of losing two fights in three.
const LENGTH={hp:3,atk:.45},BY_BOSS={FB_ELECTRO_HYPOSTASIS:{hp:2,atk:.55},FB_GEO_HYPOSTASIS:{hp:2,atk:.75},FB_RUIN_SERPENT:{hp:4,atk:1},FB_PRIMO_GEOVISHAP:{hp:4,atk:.55},FB_PYRO_REGISVINE:{atk:.41},FB_OCEANID:{hp:1,forms:20},BOSS_ANDRIUS:{atk:.35},LIYUE_TARTAGLIA_FARM:{atk:.34},LIYUE_AZHDAHA_FARM:{atk:.75}},TERRAIN_EVERY=6,RAGE_EVERY=2;
const old=Object.fromEntries(['startBattle','validateSave','fbSummon','fbStartRevival','fbRevivalExpired','shield','addHazard','prepareAndriusRound','enemyIntel'].map(k=>[k,P[k]]));
// Only the boss's own repeat fight (the field boss's route, the daily challenge), the same scope as its challenge profile.
const isBossFight=b=>!!b&&!b.coopStory&&!b.storyConfig&&!b.abyss&&!b.raid&&(!!b.fieldBoss||String(b.origin||'').startsWith('MATERIAL_CHALLENGE:'));
const ownFight=(a,b)=>{const o=api.growthV01522?.bossChallengeOrigin?.(a.source);return !!o&&o===b.origin;};
P.startBattle=function(group,origin,...rest){
 const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime;
 if(!b||b===before||!isBossFight(b)||b.bossLength)return out;
 const bosses=b.actors.filter(x=>x.side==='ENEMY'&&!x.fbSummon&&(x.grade==='보스'||x.fb)&&ownFight(x,b));if(!bosses.length)return out;
 const key=b.fieldBoss?.boss||String(b.origin).slice('MATERIAL_CHALLENGE:'.length),k={...LENGTH,...(BY_BOSS[key]||{})};
 // A number the operator set exactly (admin.html 밸런스) is the fight's number: that part is not lengthened (×1).
 const set=a=>api.adminBalance?.profileOf?.(this)?.config?.enemies?.[a.source]||{};
 if(bosses.some(a=>set(a).hp!==undefined))k.hp=1;if(bosses.some(a=>set(a).atk!==undefined))k.atk=1;
 b.bossLength={version:1,hp:k.hp,atk:k.atk};
 for(const a of bosses){if(k.hp!==1){a.maxHp=Math.max(1,Math.round(a.maxHp*k.hp));a.hp=a.maxHp;}if(k.atk!==1)a.atk=Math.max(1,Math.round(a.atk*k.atk));}
 // What the boss brought in at the start (물의 정령's first forms) hits from its lowered ATK, as what comes later does.
 if(k.atk!==1)for(const s of b.actors.filter(x=>x.side==='ENEMY'&&x.fbSummon&&x.atk>0)){const owner=b.actors.find(o=>o.id===s.fbSummon.owner);let spec=null;try{spec=owner?.fb?this.fieldBossSummonSpec(b,s.source):null;}catch{}if(spec&&Number.isFinite(spec.atk))s.atk=Math.round(owner.atk*spec.atk);}
 if(k.forms&&b.fieldBoss&&b.fieldBoss.target>0){b.fieldBoss.target=k.forms;b.bossLength.forms=k.forms;}
 if(b.terrain!==null&&b.terrain!==undefined&&b.actors.some(a=>a.source==='BOSS_DVALIN'))b.terrainEvery=TERRAIN_EVERY;
 if(b.actors.some(a=>a.source==='BOSS_ANDRIUS'))b.rageEvery=RAGE_EVERY;
 // The opening's turn order was drawn with the old HP: draw it again.
 if(out&&Array.isArray(out.order)&&this.combatOrderView)out.order=this.combatOrderView();
 return out;
};
// 안드리우스's rage (ATK ×1.10 every round from round 2, no cap) is the fight's clock: run over twice as many rounds it wiped
// the parties that used to win. In a long fight it builds every RAGE_EVERY rounds instead.
if(old.prepareAndriusRound)P.prepareAndriusRound=function(...args){
 const b=this.s.runtime,every=b?.rageEvery;if(!every)return old.prepareAndriusRound.apply(this,args);
 const seen=(b.actors||[]).filter(a=>a.source==='BOSS_ANDRIUS'&&a.andrius).map(a=>[a,a.andrius.lastRageRound,a.andrius.rageStacks,a.atk]);
 const out=old.prepareAndriusRound.apply(this,args);
 for(const [a,last,stacks,atk] of seen){if(a.andrius.rageStacks===stacks)continue;let n=0;for(let r=last+1;r<=a.andrius.lastRageRound;r++)if(r>=2&&r%every===0)n++;a.atk=atk*Math.pow(1.10,n);a.andrius.rageStacks=stacks+n;}
 return out;
};
if(old.enemyIntel)P.enemyIntel=function(id,...rest){
 const info=old.enemyIntel.call(this,id,...rest),every=this.s.runtime?.rageEvery,a=info&&every?this.combatActor?.(id):null;if(a?.source!=='BOSS_ANDRIUS')return info;
 const c=(info.cards||[]).find(x=>x.id==='ECARD_ANDRIUS_PASSIVE');
 if(c){c.coefficient=String(c.coefficient||'').replace('매 라운드',every+'라운드마다');c.description=String(c.description||'').replace('2라운드 시작부터 매 라운드 시작마다',every+'라운드마다');}
 info.cues=[...(info.cues||[]),{kind:'warning',text:'분노 '+(a.andrius?.rageStacks||0)+' · '+every+'라운드마다 공격력 ×1.10',detail:'상한 없음'}];
 return info;
};
// What the fight measures against the boss's max HP stays the size it was: a summon sized by the boss (현암 기둥, 프리즘) and
// 무상의 바람's floating core (18% of max HP to break in 2 rounds). Scaling them too made the core unbreakable, so the boss
// revived at 40% again and again.
P.fbSummon=function(b,boss,id,...rest){const a=old.fbSummon.call(this,b,boss,id,...rest),k=b?.bossLength?.hp;if(a&&k&&k!==1){let spec=null;try{spec=this.fieldBossSummonSpec(b,id);}catch{}if(spec&&spec.hp<=1){a.maxHp=Math.max(1,Math.round(a.maxHp/k));a.hp=Math.min(a.hp,a.maxHp);}}return a;};
P.fbStartRevival=function(t,...rest){const out=old.fbStartRevival.call(this,t,...rest),k=this.s.runtime?.bossLength?.hp,r=t?.fb?.revival;if(k&&k!==1&&r&&Number.isFinite(r.core))r.core=Math.max(1,Math.round(r.core/k));return out;};
// A boss's own shields (얼음 장벽, 꽃잎 껍질 …) are a share of its max HP: they keep their old size, or the larger HP made them
// too thick to break before they came back.
P.shield=function(t,amount,...rest){const k=this.s.runtime?.bossLength?.hp;if(k&&k!==1&&t?.side==='ENEMY'&&!t.fbSummon&&(t.grade==='보스'||t.fb)&&Number.isFinite(amount)){amount=amount/k;const o=rest[2];if(o&&typeof o==='object'&&Number.isFinite(o.initialValue))rest[2]={...o,initialValue:Math.round(o.initialValue/k)};}return old.shield.call(this,t,amount,...rest);};
// The ground a boss or its summons spoil (냉기 지형, 침수 …) hits a share of each fighter's max HP every round, not the boss's ATK:
// it is lowered like the boss's ATK, or the three times longer fight wore a party down by the ground alone.
P.addHazard=function(h,...rest){const b=this.s.runtime,k=b?.bossLength?.atk;if(k&&k!==1&&h&&typeof h==='object'){const src=(b.actors||[]).find(a=>a.id===h.source);if(src?.side==='ENEMY')h={...h,power:(Number(h.power)||.06)*k};}return old.addHazard.call(this,h,...rest);};
// A failed revival gives back what it gave before (40% or 50% of the original max HP), not that share of the larger one.
P.fbRevivalExpired=function(b,boss,...rest){const before=boss?.maxHp,out=old.fbRevivalExpired.call(this,b,boss,...rest),k=b?.bossLength?.hp;if(k&&k!==1&&boss&&boss.hp>0&&boss.maxHp===before)boss.hp=Math.max(1,Math.round(boss.hp/k));return out;};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,b=out.runtime;
 if(b?.bossLength!==undefined&&!(b.bossLength&&b.bossLength.version===1&&Number.isFinite(b.bossLength.hp)&&b.bossLength.hp>=1&&b.bossLength.hp<=20&&Number.isFinite(b.bossLength.atk)&&b.bossLength.atk>0&&b.bossLength.atk<=1))throw new api.RuleError('BOSS_LENGTH_SAVE','보스 전투 기록이 올바르지 않습니다.');
 if(b?.terrainEvery!==undefined&&!(Number.isInteger(b.terrainEvery)&&b.terrainEvery>=2&&b.terrainEvery<=20))throw new api.RuleError('BOSS_LENGTH_SAVE','드발린 지형 기록이 올바르지 않습니다.');
 if(b?.rageEvery!==undefined&&!(Number.isInteger(b.rageEvery)&&b.rageEvery>=1&&b.rageEvery<=10&&b.bossLength))throw new api.RuleError('BOSS_LENGTH_SAVE','안드리우스 분노 기록이 올바르지 않습니다.');
 return out;
};
// The operator's balance list (admin.html) shows a boss's numbers before this layer: it says what a new repeat fight multiplies.
if(api.adminBalance?.catalog){const catalog=api.adminBalance.catalog;api.adminBalance.catalog=function(r,...rest){
 const out=catalog.call(this,r,...rest);
 for(const e of out?.enemies||[]){const o=api.growthV01522?.bossChallengeOrigin?.(e.id);if(!o)continue;const k={...LENGTH,...(BY_BOSS[api.fieldBosses?.bosses?.[e.id]?e.id:o.slice('MATERIAL_CHALLENGE:'.length)]||{})};
  e.baselineHint=String(e.baselineHint||'')+' 새 반복 전투는 장기전이라 여기에 HP ×'+k.hp+' · 공격력 ×'+k.atk+'을 곱합니다(HP·공격력을 직접 넣으면 그 값 그대로).';}
 return out;
};}
P.bossLengthVersion=1;
api.bossLengthV01653={version:1,hp:LENGTH.hp,atk:LENGTH.atk,byBoss:JSON.parse(JSON.stringify(BY_BOSS)),terrainEvery:TERRAIN_EVERY,rageEvery:RAGE_EVERY};
})(globalThis);
// 0.16.57 (user: 「전초부터 도전은 근데 뭐야? 일부러 둔거야?」, 「안드리우스는 체력이 왜이렇게 낮지? 일부러 이렇게 한거?」; asked, answered
// 「없애고 일일 보스만」): the first upload's boss routes for 안드리우스 and 야타용왕 — a boss without the daily boss's strength (안드리우스
// 11,482 HP against 60,282) and an optional 전초전, sharing the one daily boss a day — are gone. Their arenas hold the daily boss alone, as
// in the original. With no route to win first, the daily boss now also opens with the story: 안드리우스 when 몬드 본편 is done, 야타용왕
// with 리월 본편 3장 (a past route win still opens it). A route fight already going ends as it began; a half-done route is put away.
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.retiredBossRoutesV01657)return;
const RETIRED=new Set(['BRT_ANDRIUS','BRT_AZHDAHA']),old=Object.fromEntries(['placeCatalog','placeBossReason','materialChallengeReason','liyueArtifactUnlocked','liyueArtifactFarmReason','validateSave'].map(k=>[k,P[k]]));
if(old.placeCatalog)P.placeCatalog=function(...a){return old.placeCatalog.apply(this,a).filter(e=>!(e.kind==='BOSS'&&RETIRED.has(e.route)));};
if(old.placeBossReason)P.placeBossReason=function(id,...a){if(RETIRED.has(id))return '이 도전은 「일일 보스 · 토벌」로 바뀌었습니다.';return old.placeBossReason.call(this,id,...a);};
if(old.materialChallengeReason)P.materialChallengeReason=function(boss,...a){const why=old.materialChallengeReason.call(this,boss,...a);if(boss==='BOSS_ANDRIUS'&&why==='본편 또는 현장 도전에서 이 보스를 먼저 클리어해야 합니다.'){if(!this.growthStoryGate?.(2)?.ready)return '몬드 본편을 마치면 열립니다.';/* 0.16.62 (초보 점검): the 「clear it first」 answer came before the level check (runtime_boss_rematch.js), so a Lv10 party could walk into the Lv25 fight and lose the day's try */const R=api.bossRematch?.[boss];return R&&(Number(this.s.global.PLAYER_LEVEL_STATE)||1)<R.minLevel?'일일 보스 토벌은 권장 Lv. '+R.level+' 전투입니다. 주인공 Lv. '+R.minLevel+'부터 도전할 수 있습니다.':'';}return why;};
if(old.liyueArtifactUnlocked)P.liyueArtifactUnlocked=function(kind,...a){return old.liyueArtifactUnlocked.call(this,kind,...a)||kind==='AZHDAHA'&&!!this.growthStoryGate?.(5)?.ready;};
if(old.liyueArtifactFarmReason)P.liyueArtifactFarmReason=function(kind,...a){const why=old.liyueArtifactFarmReason.call(this,kind,...a);return why==='야타용왕을 먼저 클리어해야 합니다.'?'리월 본편 3장을 마치면 열립니다.':why;};
P.validateSave=function(s,...a){
 if(s&&!s.runtime){if(RETIRED.has(s.bossRouteProgress?.route))delete s.bossRouteProgress;const g=s.global||{};if(RETIRED.has(g.ACTIVE_BOSS_ROUTE_ID)){g.ACTIVE_BOSS_ROUTE_ID='';g.BOSS_ROUTE_STEP=0;}
  const v=s.placeVisit;if(v&&typeof v.place==='string'&&v.place.startsWith('BOSS:')&&RETIRED.has(v.place.slice(5))){s.placeVisit=null;if(g.SCREEN_MODE==='BOSS_INTRO')g.SCREEN_MODE='LOCATION';}}
 return old.validateSave.call(this,s,...a);
};
P.retiredBossRoutesV01657=true;
api.retiredBossRoutesV01657=[...RETIRED];
})(globalThis);

// 0.16.59: one card, one AI turn or one system action at a time carries an id (this._actId; nested calls keep the outer one). It is
// set here, after every other runtime file, so it wraps the joint attack of runtime_combat_v0148.js too. runtime_field_bosses.js
// gives a revival guard raised inside a card that card's id, and keeps the rest of the card off it (「막 생겨났다」).
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.actIdV01659)return;
let depth=0;
for(const m of ['executeCard','aiTurn','executeCombatSystem'])if(typeof P[m]==='function'){const old=P[m];P[m]=function(...args){const b=this.s.runtime;if(!depth++)this._actId=b?(b.round+':'+(b.actionSequence||0)+':'+(b.log?.length||0)+':'+(this._actSerial=(this._actSerial||0)+1)):null;try{return old.apply(this,args);}finally{if(!--depth)this._actId=null;}};}
P.actIdV01659=true;
})(globalThis);

/* 0.16.59 (user, 2026-10-17: 「저번에 원석 3배라고 했던거, 다른부분에서는 오르지 않았더라. 신의 눈동자같은거말이야 그것도 충분히 캘 수
 * 있게 하자」) paid a found oculus like a plain chest and tripled the offerings.
 * 0.16.65 (user, 2026-10-18: 「왜 눈동자를 먹을때 원석이 나오는겨? … 원석은 공양 할때만 받는거야」): as in the original, 원석 come only from
 * offering at the statue. The same total moves into the offerings, by how many oculi each takes: 몬드 (2·4·6 of 12) 150 · 300 · 450,
 * 리월 (4·5·7 of 16) 370 · 460 · 640 — 900 and 1,470 in all, as before (runtime_offerings_v01415.js pays the first part, this the rest).
 * Ledger s.oculusPrimogems {version:2, paid:{MOND,LIYUE}}: what this has paid for a region. A save that was paid for found oculi under
 * 0.16.59 (version 1) counts those payments, so its next offerings pay only what is still owed — nothing is paid twice or taken back. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.oculusPrimogemsV01659)return;
const fail=(c,m)=>{throw new api.RuleError(c,m);};
const FOUND_V1={MOND:60,LIYUE:75},OFFER={TIER_1:150,TIER_2:300,TIER_FINAL:450,GEO_TIER_1:370,GEO_TIER_2:460,GEO_TIER_FINAL:640},BASE=api.offeringPrimogems||{};
const extra=id=>Math.max(0,(OFFER[id]||0)-(Number(BASE[id])||0)),int=n=>Number.isInteger(n)&&n>=0,region=id=>String(id).startsWith('GEO_')?'LIYUE':'MOND';
const found=s=>({MOND:Object.keys(s?.exploration?.oculi||{}).length,LIYUE:Object.keys(s?.geoOculi?.receipts||{}).length});
const offered=s=>[...(s?.exploration?.tiers||[]),...(s?.geoOculi?.tiers||[])].map(t=>t?.id).filter(id=>Object.hasOwn(OFFER,id));
const owed=s=>{const t={MOND:0,LIYUE:0};for(const id of offered(s))t[region(id)]+=extra(id);return t;};
const paidOf=L=>{if(!L)return {MOND:0,LIYUE:0};if(L.version===2)return {MOND:L.paid.MOND,LIYUE:L.paid.LIYUE};const p={MOND:(L.found?.MOND||0)*FOUND_V1.MOND,LIYUE:(L.found?.LIYUE||0)*FOUND_V1.LIYUE};for(const [id,n] of Object.entries(L.offer||{}))p[region(id)]+=n;return p;};
function settle(s){
 if(!s?.global)return {found:0,offer:0};const L=s.oculusPrimogems,due=owed(s),paid=paidOf(L);let o=0;
 for(const k of ['MOND','LIYUE']){const n=due[k]-paid[k];if(n>0){o+=n;paid[k]+=n;}}
 if(o||L?.version===1)s.oculusPrimogems={version:2,paid};if(o)s.global.PRIMOGEM=(Number(s.global.PRIMOGEM)||0)+o;return {found:0,offer:o};
}
const old={apply:P.apply,validateSave:P.validateSave,oculusExchangeEntry:P.oculusExchangeEntry,geoExchangeEntry:P.geoExchangeEntry};
P.apply=function(a,...rest){
 const out=old.apply.call(this,a,...rest),paid=settle(this.s);
 if(out&&typeof out==='object'&&paid.offer){out.primogem=(Number(out.primogem)||0)+paid.offer;if(out.reward&&typeof out.reward==='object')out.reward={...out.reward,primogem:(Number(out.reward.primogem)||0)+paid.offer};}
 return out;
};
P.validateSave=function(s,...rest){
 const out=old.validateSave.call(this,s,...rest),L=out?.oculusPrimogems;
 if(L!==undefined){const have=found(out),tiers=new Set(offered(out)),due=owed(out);let bad=!L||typeof L!=='object'||Array.isArray(L);
  if(!bad&&L.version===1)bad=!L.found||!L.offer||typeof L.offer!=='object'||Array.isArray(L.offer)||['MOND','LIYUE'].some(k=>!int(L.found[k])||L.found[k]>have[k])||Object.entries(L.offer).some(([id,n])=>!tiers.has(id)||!int(n)||n>extra(id));
  else if(!bad)bad=L.version!==2||!L.paid||['MOND','LIYUE'].some(k=>!int(L.paid[k])||L.paid[k]>have[k]*FOUND_V1[k]+due[k]);
  if(bad)fail('OCULUS_PRIMOGEM_SAVE','신의 눈동자 원석 기록이 손상되었습니다.');}
 settle(out);return out;
};
// the offering shows what it will really pay (a save already paid for found oculi gets only what is still owed)
const withPrimo=(rt,e)=>{if(!e||!Object.hasOwn(OFFER,e.id))return e;const k=region(e.id),more=Math.max(0,owed(rt.s)[k]+extra(e.id)-paidOf(rt.s?.oculusPrimogems)[k]);return {...e,reward:{...e.reward,primogem:(Number(BASE[e.id])||0)+more}};};
if(old.oculusExchangeEntry)P.oculusExchangeEntry=function(...a){return withPrimo(this,old.oculusExchangeEntry.apply(this,a));};
if(old.geoExchangeEntry)P.geoExchangeEntry=function(...a){return withPrimo(this,old.geoExchangeEntry.apply(this,a));};
api.oculusPrimogems={version:2,find:{MOND:0,LIYUE:0},offer:{...OFFER}};
P.oculusPrimogemsV01659=true;
})(globalThis);
// 0.16.63 오류 찾기 2차 (user, 2026-10-18: 「오류나 버그 있는지도 잘 체크해보고」): requests the screens never send, and one they do.
//  - 지금은 물러나서 더 준비하기 in the very first battle's preparation (the tutorial's, with Amber) said yes and then failed with
//    「첫 전투의 준비 또는 재도전 기록이 없습니다.」 — the tutorial needs that preparation, so the button says why instead.
//  - a move without a way, tools that are not item names, a daily boss or a Liyue farm named 「constructor」 or given as a list:
//    refused with the game's words before they reach a table (they came back as 「47_MAP_EDGE_DB: undefined」 and the like).
(function(root){
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.requestGuardsV01663)return;
const old={actionReason:P.actionReason,apply:P.apply},fail=(c,m)=>{throw new api.RuleError(c,m);};
const own=(o,k)=>typeof k==='string'&&!!o&&Object.prototype.hasOwnProperty.call(o,k);
function guard(rt,type,a){
 a=a&&typeof a==='object'?a:{};
 if(type==='PREP_LEAVE'){const t=rt.s?.tutorialV2,p=rt.s?.battlePreparation;if(t?.intro&&p&&p.group===t.intro.group&&p.node===t.intro.node)return '첫 전투는 물러날 수 없습니다. 준비를 마치고 시작해 주세요.';}
 if(type==='MOVE'&&!(typeof a.edge==='string'&&rt.tables['47_MAP_EDGE_DB']?.has(a.edge)))return '갈 곳을 골라 주세요.';
 if(type==='TOOL_PREPARE'&&a.items!==undefined&&!(Array.isArray(a.items)&&a.items.every(x=>typeof x==='string')))return '준비할 도구를 골라 주세요.';
 if(type==='MOND_MATERIAL_CHALLENGE'&&!own(api.enhancementConfig?.bosses,a.boss))return '몬드의 일일 보스는 안드리우스와 드발린입니다.';
 if(type==='LIYUE_ARTIFACT_CHALLENGE'&&!(typeof a.kind==='string'&&/^[A-Z][A-Z_]*$/.test(a.kind)))return '반복 도전할 보스를 골라 주세요.';
 return '';
}
P.actionReason=function(type,a={},...rest){return guard(this,type,a)||old.actionReason.call(this,type,a,...rest);};
P.apply=function(a,...rest){const why=guard(this,a?.type,a?.params??a);if(why)fail('ACTION_LOCK',why);return old.apply.call(this,a,...rest);};
P.requestGuardsV01663=true;
})(globalThis);
// 0.16.64 (user, 2026-10-18, reading the 초보 구간 표): 「일단 권장레벨 표시만 하자」, 「경험치 책으로 돌려주고, 5레벨까지는 사냥 경험치로
// 충분하니까 최대한 케서린 임무를 유도하는 방향으로 하자」.
(function(root){
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.beginnerV01664)return;
const old=Object.fromEntries(['finishBattle','validateSave','mainStoryEntries','storyChapterEntries'].map(k=>[k,P[k]]));
const fail=(c,m)=>{throw new api.RuleError(c,m);},int=n=>Number.isSafeInteger(n)&&n>=0;
// ---- 넘친 경험치 → 경험치 책 (runtime_growth_v01522.js addXp calls this with what the level cap would have thrown away) ----
// The books' own values (영웅의 경험 1,000 · 모험가의 경험 250 · 방랑자의 경험 50), largest first; under 50 waits for the next time.
const SPILL_BOOKS=[['MAT_CHAR_EXP_HERO',1000],['MAT_CHAR_EXP_ADVENTURER',250],['MAT_CHAR_EXP_WANDERER',50]];
P.spillXp=function(xp){
 if(!this.s||!int(xp)||!xp)return {};let left=(Number(this.s.xpSpill)||0)+xp;const got={};
 for(const [id,value] of SPILL_BOOKS){const n=Math.floor(left/value);if(n>0&&this.tables['14_ITEM_DB']?.has(id)){this.giveItem(id,n);got[id]=n;left-=n*value;}}
 this.s.xpSpill=left;if(Object.keys(got).length){const t=(this._xpSpillGot??={});for(const [id,n] of Object.entries(got))t[id]=(t[id]||0)+n;}return got;
};
// A won fight's result lists the books among its loot.
P.finishBattle=function(win,...rest){
 this._xpSpillGot=null;const b=this.s?.runtime,out=old.finishBattle.call(this,win,...rest),got=this._xpSpillGot;this._xpSpillGot=null;
 if(got&&out&&typeof out==='object'){out.loot=out.loot&&typeof out.loot==='object'?out.loot:{};for(const [id,n] of Object.entries(got))out.loot[id]=(out.loot[id]||0)+n;out.xpBooks={...got};
  if(b?.id&&this.s.combatReceipts?.[b.id])this.s.combatReceipts[b.id]=JSON.parse(JSON.stringify(out));if(b)this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(out);}
 return out;
};
P.validateSave=function(s,...rest){const out=old.validateSave.call(this,s,...rest)||s;if(out?.xpSpill!==undefined&&!(int(out.xpSpill)&&out.xpSpill<50))fail('XP_SPILL_SAVE','넘친 경험치 기록이 올바르지 않습니다.');return out;};
// ---- 권장 레벨: the fixed levels of the places a main chapter's scenes are set in (리월 본편 1장 · 권장 Lv. 32~42) ----
const levelsByIndex=new WeakMap();
P.storyRecommendedLevel=function(quest){
 let index=null;try{index=this.storyIndex();}catch{return null;}if(!index?.nodes)return null;
 let byQuest=levelsByIndex.get(index);if(!byQuest){byQuest=new Map();levelsByIndex.set(index,byQuest);}
 if(!byQuest.has(quest)){let min=Infinity,max=-Infinity;const seen=new Set();
  for(const n of index.nodes.values()){if(n?.[1]!==quest||!n[8]||seen.has(n[8]))continue;seen.add(n[8]);const m=this.tables['32_MAP_DB']?.get(n[8]),a=Number(m?.[6]),z=Number(m?.[7]);if(a>0&&a===z){min=Math.min(min,a);max=Math.max(max,a);}}
  byQuest.set(quest,Number.isFinite(min)?{min,max,text:'권장 Lv. '+(min===max?min:min+'~'+max)}:null);}
 const r=byQuest.get(quest);return r?{...r}:null;
};
const withLevel=rt=>e=>{const quest=e?.quest||e?.id;const r=quest?rt.storyRecommendedLevel(quest):null;return r?{...e,recommended:r}:e;};
P.mainStoryEntries=function(...a){return (old.mainStoryEntries.apply(this,a)||[]).map(withLevel(this));};
if(old.storyChapterEntries)P.storyChapterEntries=function(...a){return (old.storyChapterEntries.apply(this,a)||[]).map(withLevel(this));};
// ---- 캐서린에게: free play never forces a trip (test_growth_v01522, test_tutorial_v01523); the 할 일 row's button and a short
// Amber hint beside it (app_tasks_v0167.js) point at 의뢰 접수 연습 instead.
P.beginnerV01664=true;
})(globalThis);
// 0.16.66 운영자 이벤트 (user, 2026-10-18: 「중반 재료 벽을 오히려 이벤트같은곳에서 뿌려주면 되겠지. 한번 운영자 이벤트 아이디어좀 생각해서
// 만들어봐」; battles, travel and cooking stay as they are — the events give more reason to go out). The operator opens an event for
// some days (server/op-events-v01666.mjs); the account server hands the open ones to the engine with each action (env.OP_EVENTS →
// r.opServerEvents; the browser shows them from /events through root.CRPGOpEventsList). Four kinds:
//  - LEY_DOUBLE 지맥 보상 2배: a ley line blossom pays twice, three times a Korean day.
//  - DOMAIN_SUPPLY 비경 보급: the day's doubled material domain wins go from three to six.
//  - BOSS_DOUBLE 강적 토벌 보상 2배: a field boss or daily boss win pays its items and Mora twice, three times a day.
//  - FESTIVAL 축제 교환: wins, gathering, region events and commissions give 「축제 증표」, traded for growth materials (each with a limit).
// The save keeps s.opEvent {v:1, day, uses:{LEY_DOUBLE,BOSS_DOUBLE}, fest:{id,tokens,earned,bought}}; the tokens of an event end with it.
(function(root){
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.opEventsV01666)return;
const old=Object.fromEntries(['finishBattle','apply','actionReason','validateSave','growthDomainRewards'].map(k=>[k,P[k]]));
const fail=(c,m)=>{throw new api.RuleError(c,m);},int=n=>Number.isSafeInteger(n)&&n>=0,own=(o,k)=>typeof k==='string'&&Object.prototype.hasOwnProperty.call(o,k);
const DAY=86400000,KST=9*3600000,dayOf=t=>Math.floor((Number(t)+KST)/DAY);
const KINDS={
 LEY_DOUBLE:{name:'지맥 보상 2배',text:'지맥의 꽃 보상을 하루 3번까지 두 배로 받습니다.',daily:3},
 DOMAIN_SUPPLY:{name:'비경 보급',text:'돌파·특성 비경의 재료 2배가 하루 3판에서 6판으로 늘어납니다.',daily:6},
 BOSS_DOUBLE:{name:'강적 토벌 보상 2배',text:'필드 보스·일일 보스를 이기면 보상을 하루 3번까지 두 배로 받습니다.',daily:3},
 FESTIVAL:{name:'축제 교환',text:'전투에서 이기고, 채집하고, 지역 사건과 의뢰를 마치면 「축제 증표」를 받습니다. 교환소에서 성장 재료로 바꿉니다.'}
};
const TOKENS={win:2,life:1,event:5,commission:5};
const ELEMENTS=['PYRO','HYDRO','ANEMO','ELECTRO','CRYO','GEO','DENDRO','NEUTRAL'],BOOKS=['FREEDOM','RESISTANCE','BALLAD','PROSPERITY','DILIGENCE','GOLD'];
const SHOP=[
 {key:'GEM_2',pick:'element',cost:20,limit:10,item:c=>'GROWTH_GEM_'+c+'_2'},
 {key:'GEM_3',pick:'element',cost:60,limit:4,item:c=>'GROWTH_GEM_'+c+'_3'},
 {key:'BOOK_2',pick:'book',cost:20,limit:10,item:c=>'GROWTH_BOOK_'+c+'_2'},
 {key:'BOOK_3',pick:'book',cost:60,limit:4,item:c=>'GROWTH_BOOK_'+c+'_3'},
 {key:'BOSS',pick:'boss',cost:80,limit:2,item:c=>c},
 {key:'HERO',cost:15,limit:20,item:()=>'MAT_CHAR_EXP_HERO'},
 {key:'MORA',cost:10,limit:20,mora:5000}
];
const SHOP_BY=new Map(SHOP.map(x=>[x.key,x]));
const nowOf=rt=>Number(rt.actionStartedAt??Date.now());
P.opEvents=function(){
 const list=Array.isArray(this.opServerEvents)?this.opServerEvents:Array.isArray(root.CRPGOpEventsList)?root.CRPGOpEventsList:[],t=nowOf(this);
 return list.filter(e=>e&&own(KINDS,e.kind)&&typeof e.id==='string'&&Number(e.startsAt)<=t&&t<Number(e.endsAt)).map(e=>({id:e.id,kind:e.kind,startsAt:Number(e.startsAt),endsAt:Number(e.endsAt),...KINDS[e.kind]}));
};
P.opEvent=function(kind){return this.opEvents().find(e=>e.kind===kind)||null;};
// today's record (a new Korean day starts the counts again)
function rec(rt){const s=rt.s,day=dayOf(nowOf(rt));let o=s.opEvent;if(!o||o.v!==1)o=s.opEvent={v:1,day,uses:{}};if(o.day!==day){o.day=day;o.uses={};}return o;}
P.opEventUsesLeft=function(kind){const e=this.opEvent(kind);if(!e||!e.daily)return 0;const o=this.s?.opEvent,day=dayOf(nowOf(this)),used=o?.v===1&&o.day===day?Number(o.uses?.[kind])||0:0;return Math.max(0,e.daily-used);};
const take=(rt,kind)=>{const o=rec(rt);o.uses[kind]=(Number(o.uses[kind])||0)+1;return o.uses[kind];};
// ---- 축제 교환 ----
function fest(rt,create){const e=rt.opEvent('FESTIVAL');if(!e)return null;const o=create?rec(rt):rt.s?.opEvent;if(!o)return {id:e.id,tokens:0,earned:0,bought:{}};if(!o.fest||o.fest.id!==e.id){if(!create)return {id:e.id,tokens:0,earned:0,bought:{}};o.fest={id:e.id,tokens:0,earned:0,bought:{}};}return o.fest;}
function earn(rt,n){if(!(n>0))return 0;const f=fest(rt,true);if(!f)return 0;f.tokens+=n;f.earned+=n;return n;}
P.festivalShop=function(){
 const f=fest(this,false);if(!f)return null;const items=this.tables['14_ITEM_DB'];
 const choices={element:ELEMENTS.filter(e=>items.has('GROWTH_GEM_'+e+'_2')),book:BOOKS.filter(k=>items.has('GROWTH_BOOK_'+k+'_2')),boss:[...items.keys()].filter(id=>/^MAT_FB_/.test(id))};
 return {event:f.id,tokens:f.tokens,earned:f.earned,earn:{...TOKENS},items:SHOP.map(x=>({key:x.key,pick:x.pick||null,choices:x.pick?choices[x.pick]:null,cost:x.cost,limit:x.limit,bought:Number(f.bought[x.key])||0,mora:x.mora||0,item:x.pick?null:x.item?.()||null}))};
};
function exchangeReason(rt,a){
 if(rt.s?.runtime)return '전투를 마친 뒤 교환해 주세요.';const e=rt.opEvent('FESTIVAL');if(!e)return '열린 축제 교환이 없습니다.';if(a?.event!==e.id)return '이벤트가 바뀌었습니다. 다시 열어 주세요.';
 const x=typeof a?.item==='string'&&SHOP_BY.get(a.item);if(!x)return '교환할 물건을 골라 주세요.';const shop=rt.festivalShop(),row=shop.items.find(i=>i.key===x.key);
 if(x.pick&&!(typeof a.choice==='string'&&row.choices.includes(a.choice)))return '받을 종류를 골라 주세요.';
 const n=a.n===undefined?1:a.n;if(!Number.isSafeInteger(n)||n<1)return '교환할 수량을 골라 주세요.';if(row.bought+n>x.limit)return '이번 이벤트에서 더 바꿀 수 없습니다.';if(shop.tokens<x.cost*n)return '축제 증표가 모자랍니다.';
 return '';
}
P.actionReason=function(type,a={},...rest){if(type==='EVENT_EXCHANGE')return exchangeReason(this,a);return old.actionReason.call(this,type,a,...rest);};
// ---- 비경 보급: the doubled material wins of the day go to six ----
P.growthDomainRewards=function(d,element,...rest){
 const out=old.growthDomainRewards.call(this,d,element,...rest);if(!out||out.bonus||!d||d.kind==='EXP'||!this.opEvent('DOMAIN_SUPPLY'))return out;
 const day=rest[0]??dayOf(nowOf(this)),wins=this.s?.domainDaily?.day===day?Number(this.s.domainDaily.wins)||0:0;if(wins<3||wins>=6)return out;
 const items={};for(const [id,n] of Object.entries(out.items||{}))items[id]=n*2;return {...out,items,bonus:true,opEvent:'DOMAIN_SUPPLY'};
};
// ---- results: 2배 and tokens ----
const NOT_DOUBLED=id=>/^MAT_CHAR_EXP_/.test(id);// books from the level cap (spillXp) are not a reward of the fight
P.finishBattle=function(victory,...rest){
 const b=this.s?.runtime,out=old.finishBattle.call(this,victory,...rest);if(!out||typeof out!=='object'||!b||!victory||b.storyConfig?.noRewards)return out;
 const tags=[];let changed=false;
 if(out.leyLine?.claimed&&this.opEvent('LEY_DOUBLE')&&this.opEventUsesLeft('LEY_DOUBLE')>0){
  const books=out.leyLine.books||{};out.loot=out.loot&&typeof out.loot==='object'?out.loot:{};for(const [id,n] of Object.entries(books)){this.giveItem(id,n);out.loot[id]=(out.loot[id]||0)+n;}
  const mora=Number(out.leyLine.mora)||0;if(mora){this.s.global.MORA+=mora;out.mora=(Number(out.mora)||0)+mora;}
  const used=take(this,'LEY_DOUBLE');tags.push({kind:'LEY_DOUBLE',name:KINDS.LEY_DOUBLE.name,used,limit:KINDS.LEY_DOUBLE.daily});changed=true;}
 const boss=!!(b.fieldBoss||b.twinBoss||b.rematch||String(b.origin||'').startsWith('MATERIAL_CHALLENGE:'));
 if(boss&&this.opEvent('BOSS_DOUBLE')&&this.opEventUsesLeft('BOSS_DOUBLE')>0){
  const spill=out.xpBooks||{},extra={};for(const [id,n] of Object.entries(out.loot||{})){const real=n-(Number(spill[id])||0);if(real>0&&!NOT_DOUBLED(id)&&this.tables['14_ITEM_DB'].has(id))extra[id]=real;}
  const mora=Number(out.mora)||0;if(Object.keys(extra).length||mora>0){for(const [id,n] of Object.entries(extra)){this.giveItem(id,n);out.loot[id]+=n;}if(mora){this.s.global.MORA+=mora;out.mora=mora*2;}
   const used=take(this,'BOSS_DOUBLE');tags.push({kind:'BOSS_DOUBLE',name:KINDS.BOSS_DOUBLE.name,used,limit:KINDS.BOSS_DOUBLE.daily});changed=true;}}
 if(out.domain?.bonus&&this.opEvent('DOMAIN_SUPPLY')){const wins=Number(this.s.domainDaily?.wins)||0;if(wins>3&&wins<=6){tags.push({kind:'DOMAIN_SUPPLY',name:KINDS.DOMAIN_SUPPLY.name,used:wins,limit:6});changed=true;}}
 const got=earn(this,TOKENS.win);if(got){out.festivalTokens=(Number(out.festivalTokens)||0)+got;changed=true;}
 if(changed){if(tags.length)out.opEvents=tags;const key=out.battleId||out.id||b.id;if(key&&this.s.combatReceipts?.[key])this.s.combatReceipts[key]=JSON.parse(JSON.stringify(out));this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(out);}
 return out;
};
// ---- tokens for gathering, region events and commissions (counted from the save before and after the action) ----
function counts(rt){const s=rt.s;if(!s)return null;let life=0,commissions=0;try{const st=rt.achievementStats?.(false);for(const n of Object.values(st?.life||{}))life+=Number(n)||0;}catch{}
 for(const [id,q] of Object.entries(s.quests||{}))if(q?.claimed){let c=false;try{c=rt.isCommission?.(id);}catch{}if(c)commissions++;}
 return {life,events:Number(s.regionEvents?.count)||0,commissions};}
P.apply=function(a,...rest){
 if(a?.type==='EVENT_EXCHANGE'){const why=exchangeReason(this,a);if(why)fail('EVENT_EXCHANGE',why);
  const x=SHOP_BY.get(a.item),n=a.n===undefined?1:a.n,f=fest(this,true),got={};f.tokens-=x.cost*n;f.bought[x.key]=(Number(f.bought[x.key])||0)+n;
  if(x.mora){this.s.global.MORA+=x.mora*n;}else{const id=x.item(a.choice);this.giveItem(id,n);got[id]=n;}
  return {type:'EVENT_EXCHANGE',event:f.id,item:x.key,choice:a.choice||null,n,items:got,mora:x.mora?x.mora*n:0,tokens:f.tokens};}
 const fe=this.s?.runtime?null:this.opEvent('FESTIVAL'),before=fe?counts(this):null,out=old.apply.call(this,a,...rest);
 if(fe&&before&&this.s&&!this.s.runtime){const after=counts(this),n=Math.max(0,after.life-before.life)*TOKENS.life+Math.max(0,after.events-before.events)*TOKENS.event+Math.max(0,after.commissions-before.commissions)*TOKENS.commission;
  const got=earn(this,n);if(got&&out&&typeof out==='object')out.festivalTokens=(Number(out.festivalTokens)||0)+got;}
 return out;
};
P.validateSave=function(s,...rest){
 const out=old.validateSave.call(this,s,...rest)||s,o=out?.opEvent;
 if(o!==undefined){const bad=!o||typeof o!=='object'||Array.isArray(o)||o.v!==1||!Number.isSafeInteger(o.day)||!o.uses||typeof o.uses!=='object'||Array.isArray(o.uses)
  ||Object.entries(o.uses).some(([k,n])=>!own(KINDS,k)||!int(n)||n>(KINDS[k].daily||0))
  ||(o.fest!==undefined&&(!o.fest||typeof o.fest.id!=='string'||!int(o.fest.tokens)||!int(o.fest.earned)||o.fest.tokens>o.fest.earned||!o.fest.bought||typeof o.fest.bought!=='object'||Object.entries(o.fest.bought).some(([k,n])=>!SHOP_BY.has(k)||!int(n)||n>SHOP_BY.get(k).limit)));
  if(bad)fail('OP_EVENT_SAVE','이벤트 기록이 올바르지 않습니다.');}
 return out;
};
api.opEventsV01666={version:1,kinds:JSON.parse(JSON.stringify(KINDS)),tokens:{...TOKENS},shop:SHOP.map(x=>({key:x.key,pick:x.pick||null,cost:x.cost,limit:x.limit,mora:x.mora||0}))};
P.opEventsV01666=true;
})(globalThis);

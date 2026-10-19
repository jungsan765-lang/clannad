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
 * comparisons check. Only a domain fight carries the marker (fatigueRevision); other fights look exactly as before.
 * 0.16.68 (user: 「피로도 시스템 -4 말고 -10이 최대로 하자. 회복속도도 조금 늘리고 음식효과도 그만큼 늘려. 너무 왔다갔다 한다.」): 피로 goes up
 * to 10 in smaller steps, so four domain runs no longer send the party straight back to town. Each 피로 takes 6% off ATK and
 * DEF (10 → −60%, the same most as 4 × 15% before); 1 eases every 10 minutes instead of 30 (0.6% a minute, was 0.5%); a dish
 * clears 2.5 times as much (1 · 2 · 3 · 4 → 3 · 5 · 8 · 10). A 피로 already held stays the same number. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.fatigueVersion)return;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const PLAYER='PLAYER_CUSTOM',PER=.06,MAX=10,RECOVER_HP=.3,REVISION=2,DECAY_MS=10*60000,STEP=2.5;
// A dish's rarity: each ingredient of its recipe (a processed one counts as what it is made from) scores by how hard it is
// to get — 0 for anything a shop sells under 200 Mora or one try at a reachable place gives 1 or more of; 1 when one try gives
// at least ½ (사과, 일몰 열매, 죽순, 연꽃받침, 절운고추 …); 2 when it gives fewer (송이버섯, 금어초, 솔방울 …). Easy ingredients add
// nothing, however many a dish needs. The list is fixed here so the server and every screen agree; tests/test_fatigue_v01648.cjs
// recomputes it from the gathering pools and the shops and fails when they drift apart.
// The eater's level asks for a rarity: Lv20 or lower 0, Lv21–40 1, Lv41 and up 2. A dish under that clears nothing; one at it
// clears 3, and every 2 more clear more (3 · 5 · 8 · 10, up to 10; 0.16.68, was 1 · 2 · 3 · 4). A dish with no recipe (only sold)
// scores by its grade.
const RARE={ING_APPLE:1,ING_SUNSETTIA:1,ING_LOTUS_HEAD:1,ING_BAMBOO_SHOOT:1,MAT_LIYUE_JUEYUN_CHILI:1,MAT_LIYUE_GLAZE_LILY:1,MAT_LIYUE_STARCONCH:1,
 ING_MATSUTAKE:2,ING_SNAPDRAGON:2,ING_PINECONE:2,ING_JAM:2,ING_CALLA_LILY:2,ING_LAMP_GRASS:2,MAT_LIYUE_NOCTILUCOUS_JADE:2};
const GRADE_RARITY={'일반':0,'고급':1,'희귀':2,'전설':4},NEED=[[20,0],[40,1],[Infinity,2]];
const needFor=level=>NEED.find(([top])=>(Number(level)||1)<=top)[1];
const clearFor=(rarity,need)=>rarity<need?0:Math.min(MAX,Math.ceil(STEP*(1+Math.floor((rarity-need)/2))));
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
P.foodFatigueBands=function(item){let spec=null;try{spec=this.foodSpec(item,{});}catch{}if(!spec?.heal)return null;const r=this.foodRarity(item);return NEED.map(([top,need],i)=>({from:i?NEED[i-1][0]+1:1,upTo:Number.isFinite(top)?top:60,need,clear:clearFor(r,need)}));};
P.foodFatigueClear=function(item,owner=PLAYER){let spec=null;try{spec=this.foodSpec(item,{});}catch{}if(!spec?.heal)return 0;return clearFor(this.foodRarity(item),this.foodFatigueNeed(owner));};
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
api.fatigueV01648={version:REVISION,perStack:PER,max:MAX,easeMinutes:DECAY_MS/60000,clearStep:STEP,stats:['atk','def'],need:NEED.map(([top,n])=>({upToLevel:Number.isFinite(top)?top:60,rarity:n})),rareIngredients:copy(RARE),gradeRarity:copy(GRADE_RARITY),recoverHp:RECOVER_HP};
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
 {key:'MORA',cost:10,limit:20,mora:5000},
 // 0.16.67 (user: 「원석 좀 팍팍 뿌려」)
 {key:'PRIMO',cost:120,limit:5,primogem:160}
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
 return {event:f.id,tokens:f.tokens,earned:f.earned,earn:{...TOKENS},items:SHOP.map(x=>({key:x.key,pick:x.pick||null,choices:x.pick?choices[x.pick]:null,cost:x.cost,limit:x.limit,bought:Number(f.bought[x.key])||0,mora:x.mora||0,primogem:x.primogem||0,item:x.pick?null:x.item?.()||null}))};
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
  if(x.mora){this.s.global.MORA+=x.mora*n;}else if(x.primogem){this.s.global.PRIMOGEM=(Number(this.s.global.PRIMOGEM)||0)+x.primogem*n;}else{const id=x.item(a.choice);this.giveItem(id,n);got[id]=n;}
  return {type:'EVENT_EXCHANGE',event:f.id,item:x.key,choice:a.choice||null,n,items:got,mora:x.mora?x.mora*n:0,primogem:x.primogem?x.primogem*n:0,tokens:f.tokens};}
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
api.opEventsV01666={version:1,kinds:JSON.parse(JSON.stringify(KINDS)),tokens:{...TOKENS},shop:SHOP.map(x=>({key:x.key,pick:x.pick||null,cost:x.cost,limit:x.limit,mora:x.mora||0,primogem:x.primogem||0}))};
P.opEventsV01666=true;
})(globalThis);
// 0.16.67 정기 축제 (user, 2026-10-18: 「정기 이벤트 만드는것도 나쁘지 않긴 하겠네. 크리스마스라던가 추석 설날 이럴때」; answers: 마지막 보상은
// 「4성 한 명 고르기」, 열리는 날은 「날짜에 저절로」; 「설날 추석은 아예 한국식으로다가 축제를 바꿔도 되잖아? 스토리도 조금 추가하고」; 「주인공쪽에서
// 리월 캐릭터들한테 알려주는 그런걸로 … 여행자쪽은 새로운 세계로 갑작스레 이동해서 이세계인과 같이 스토리가 연결되게」). Three festivals open by
// the Korean calendar (server/festivals-v01667.mjs; the operator can move or switch one off): 눈꽃 축제 (Christmas, Mond), 설날 and 추석
// (Liyue). The server hands an open one to the engine with each action in the same list as the operator's events ({kind:'SEASON'}).
// A festival lasts about two weeks and opens a new day of things for seven days; a missed day can be done later while it runs:
//  - 매일 도전: one fight a day (enemies at the protagonist's level) with a day's rule, and three stars (40 points each).
//  - 미니게임: 눈싸움 / 윷놀이 / 송편 빚기, a stage a day. The page plays it and sends what was pressed; the engine plays it again from the
//    same seed and gives the score (40 / 80 / 120 points by tier).
//  - 이동 과제: 선물 배달 / 세배 돌기 (go to the place and press) / 차례상 (bring what the day asks for to 왕생당), two a day, 60 points each.
//  - 축제 이야기 (설날·추석): four parts opened on days 1, 3, 5 and 7 — the first one for each route (the same meeting seen from both
//    sides), the other three the same on both (user: 「중간부터는 아예 같은 길로」); 원석 160 and 100 points each; the words are in
//    source/app_feststory_v01667.js, made from tools/editorial/festival_k/*.md through the story workbench).
//  - 점수 보상: reached points pay by themselves; the last one is a 4★ of the festival's region the player picks (a constellation if
//    already joined), still open seven days after the end.
// 축제 교환 (opEventsV01666) runs with every festival. The save keeps s.festival for the current festival only.
(function(root){
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.festivalV01667)return;
const old=Object.fromEntries(['apply','actionReason','validateSave','finishBattle','startBattle','combatStat','growthEncounterLevel'].map(k=>[k,P[k]]));
const fail=(c,m)=>{throw new api.RuleError(c,m);},int=n=>Number.isSafeInteger(n)&&n>=0,own=(o,k)=>typeof k==='string'&&Object.prototype.hasOwnProperty.call(o,k),copy=x=>JSON.parse(JSON.stringify(x));
const DAY=86400000,CLAIM_DAYS=7,DAYS=7;
const nowOf=rt=>Number(rt.actionStartedAt??Date.now());
const rng=seed=>{let a=(Number(seed)>>>0)||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
const EL={PYRO:'불',HYDRO:'물',ANEMO:'바람',ELECTRO:'번개',CRYO:'얼음',GEO:'바위',DENDRO:'풀'};
// ---------- the three festivals ----------
const MOND4=['MOND_AMBER','MOND_KAEYA','MOND_LISA','MOND_BARBARA','MOND_NOELLE','MOND_FISCHL','MOND_BENNETT','MOND_RAZOR','MOND_SUCROSE','MOND_DIONA','MOND_ROSARIA','MOND_MIKA','MOND_DAHLIA'];
const LIYUE4=['LIYUE_XIANGLING','LIYUE_XINGQIU','LIYUE_CHONGYUN','LIYUE_BEIDOU','LIYUE_NINGGUANG','LIYUE_XINYAN','LIYUE_YANFEI','LIYUE_YUNJIN','LIYUE_YAOYAO','LIYUE_GAMING','LIYUE_LANYAN'];
// a day's fight: [name, group, rule, the second and third stars]
//  rule: enemyHp/enemyAtk/enemyDef % up, enemySpd up, allyAtk % up, aura = the element every enemy starts with
//  stars: ['ROUNDS',n] in n rounds · ['NO_KO'] nobody down · ['ELEMENT','불'] with a companion of the element · ['PARTY',n] n or fewer · ['HP',50] half the HP left
const XMAS_FIGHTS=[
 ['눈밭의 슬라임','EG_MOND_SLIME_SMALL',{},[['ROUNDS',6],['NO_KO']]],
 ['선물 도둑','EG_TREASURE_PATROL',{enemySpd:10},[['ROUNDS',6],['PARTY',3]]],
 ['눈보라','EG_DRAGON_CRYO',{aura:'얼음',enemyHp:20},[['ELEMENT','불'],['ROUNDS',7]]],
 ['츄츄족 눈사람','EG_MOND_HILI_PATROL',{allyAtk:25,enemyHp:60},[['ROUNDS',6],['NO_KO']]],
 ['얼음 방패','EG_DRAGON_MITA',{enemyDef:40},[['ELEMENT','바위'],['ROUNDS',8]]],
 ['한밤의 순찰','EG_MOND_HILI_ELITE',{enemyAtk:20},[['HP',50],['ROUNDS',7]]],
 ['겨울밤의 우인단','EG_FATUI_ELITE',{enemyHp:30,enemyAtk:15},[['NO_KO'],['ROUNDS',8]]]
];
const SEOLLAL_FIGHTS=[
 ['복주머니 도둑','EG_TREASURE_PATROL',{},[['ROUNDS',6],['NO_KO']]],
 ['돌담 츄츄족','EG_LIYUE_HILI_ROCK',{enemyDef:30},[['ELEMENT','바위'],['ROUNDS',7]]],
 ['새해 첫 바다','EG_LIYUE_VISHAP',{enemySpd:10},[['ROUNDS',6],['PARTY',3]]],
 ['연날리기 언덕','EG_MOND_HILI_PATROL',{allyAtk:25,enemyHp:60},[['ROUNDS',6],['HP',50]]],
 ['멈춘 유적','EG_LIYUE_RUIN',{aura:'물',enemyHp:20},[['ELEMENT','번개'],['ROUNDS',7]]],
 ['세뱃돈을 노리는 자','EG_FATUI_PATROL',{enemyAtk:20},[['NO_KO'],['ROUNDS',7]]],
 ['정월의 그림자','EG_CHASM_HUSK',{enemyHp:30,enemyAtk:15},[['NO_KO'],['ROUNDS',8]]]
];
const CHUSEOK_FIGHTS=[
 ['밤 따는 날','EG_LIYUE_HILI_ROCK',{},[['ROUNDS',6],['NO_KO']]],
 ['들판의 도둑','EG_TREASURE_PATROL',{enemySpd:10},[['ROUNDS',6],['PARTY',3]]],
 ['달빛 물가','EG_LIYUE_VISHAP',{aura:'물',enemyHp:20},[['ELEMENT','얼음'],['ROUNDS',7]]],
 ['풍년의 들','EG_MOND_SLIME_SMALL',{allyAtk:25,enemyHp:80},[['ROUNDS',5],['HP',50]]],
 ['단단한 손님','EG_LIYUE_RUIN',{enemyDef:40},[['ELEMENT','바위'],['ROUNDS',8]]],
 ['보름달 밤의 순찰','EG_FATUI_PATROL',{enemyAtk:20},[['HP',50],['ROUNDS',7]]],
 ['한가위의 그림자','EG_CHASM_HUSK',{enemyHp:30,enemyAtk:15},[['NO_KO'],['ROUNDS',8]]]
];
// 이동 과제, two a day: [map, who, words when done, Mora]
const GIFTS=[
 [['MAP_MOND_CITY','캐서린','캐서린에게 선물을 전했습니다.',2000],['MAP_MOND_SPRINGVALE','샘물 마을 사냥꾼','샘물 마을 사냥꾼에게 선물을 전했습니다.',2000]],
 [['MAP_MOND_PLAINS','정찰 기사','성 밖 정찰 기사에게 선물을 전했습니다.',2000],['MAP_CRPG_CIDER_BANK','낚시꾼','시드르 호숫가 낚시꾼에게 선물을 전했습니다.',2000]],
 [['MAP_MOND_FOREST','숲의 나무꾼','속삭임의 숲 나무꾼에게 선물을 전했습니다.',3000],['MAP_MOND_WINDRISE','음유시인','바람이 시작되는 곳의 음유시인에게 선물을 전했습니다.',3000]],
 [['MAP_MOND_DAWN_WINERY','와이너리 일꾼','다운 와이너리 일꾼에게 선물을 전했습니다.',3000],['MAP_CRPG_STARFELL_LAKE','호숫가 여행자','별이 떨어지는 호숫가의 여행자에게 선물을 전했습니다.',3000]],
 [['MAP_MOND_WOLVENDOM','레이저','울프 영지의 레이저에게 선물을 전했습니다.',4000],['MAP_CRPG_FALCON_COAST','해안의 어부','매의 해안 어부에게 선물을 전했습니다.',4000]],
 [['MAP_CRPG_DRAGONSPINE_CAMP','알베도','설산 탐사 야영지의 알베도에게 선물을 전했습니다.',5000],['MAP_CRPG_STORMBEARER_MOUNTAINS','산지기','바람맞이 산 산지기에게 선물을 전했습니다.',5000]],
 [['MAP_CRPG_MOND_QUARRY','광부','몬드 동쪽 광산 광부에게 선물을 전했습니다.',5000],['MAP_MOND_CITY','진','진 단장에게 마지막 선물을 전했습니다.',5000]]
];
const SEBAE=[
 [['MAP_LY_DETAIL_CHIHU','향릉','만민당의 향릉에게 세배했습니다. 세뱃돈을 받았습니다.',3000],['MAP_LY_DETAIL_WHARF','북두','부두의 북두에게 세배했습니다. 세뱃돈을 받았습니다.',3000]],
 [['MAP_LY_DETAIL_FEIYUN','행추','비운 상회의 행추에게 세배했습니다. 세뱃돈을 받았습니다.',4000],['MAP_LY_DETAIL_NORTH_GATE','호두','왕생당의 호두에게 세배했습니다. 세뱃돈을 받았습니다.',4000]],
 [['MAP_LY_DETAIL_YUJING','옥경대 비서','옥경대 비서에게 세배했습니다. 세뱃돈을 받았습니다.',4000],['MAP_LY_DETAIL_WANGSHU','망서 객잔 지배인','망서 객잔 지배인에게 세배했습니다. 세뱃돈을 받았습니다.',4000]],
 [['MAP_LIYUE_QINGCE','요요','경책 산장의 요요에게 세배했습니다. 세뱃돈을 받았습니다.',5000],['MAP_LY_DETAIL_SHIMEN','석문 상인','석문 상인에게 세배했습니다. 세뱃돈을 받았습니다.',5000]],
 [['MAP_LIYUE_PLAINS','수레꾼','평야 길의 수레꾼에게 세배했습니다. 세뱃돈을 받았습니다.',5000],['MAP_LY_DETAIL_TIANHENG','중운','천형산의 중운에게 세배했습니다. 세뱃돈을 받았습니다.',5000]],
 [['MAP_LY_DETAIL_MINGYUN','명온 마을 광부','명온 마을 광부에게 세배했습니다. 세뱃돈을 받았습니다.',6000],['MAP_LIYUE_JUEYUN','절운간 순례자','절운간 순례자에게 세배했습니다. 세뱃돈을 받았습니다.',6000]],
 [['MAP_LY_DETAIL_CHIHU','운근','화유다관의 운근에게 세배했습니다. 세뱃돈을 받았습니다.',8000],['MAP_LIYUE_HARBOR','종려','종려에게 세배했습니다. 세뱃돈은… 다음에 주겠다고 합니다.',0]]
];
// 차례상: what a day asks for, brought to 왕생당 (리월항 · 북쪽 진입로)
const CHARYE_AT='MAP_LY_DETAIL_NORTH_GATE';
const CHARYE=[
 [['과일',{ING_APPLE:5},2000],['밥',{ING_RICE:3},2000]],
 [['생선',{ING_FISH:3},3000],['고기',{ING_RAW_MEAT:3},3000]],
 [['탕국 재료',{ING_RADISH:3},3000],['나물 대신 버섯',{ING_MUSHROOM:4},3000]],
 [['꽃',{MAT_LIYUE_QINGXIN:3},4000],['연꽃받침',{ING_LOTUS_HEAD:3},4000]],
 [['떡 대신 찐빵',{FOOD_RICE_BUNS:1},4000],['달걀',{FOOD_JADEVEIN_TEA_EGGS:1},4000]],
 [['생선구이',{FOOD_MOND_GRILLED_FISH:1},5000],['고기볶음',{FOOD_STIR_FRIED_FILET:1},5000]],
 [['전 대신 전병',{FOOD_QINGXIN_FLOWER_CAKE:1},6000],['탕국 대신 무 수프',{FOOD_RADISH_SOUP:1},6000]]
];
const FESTIVALS={
 XMAS:{name:'눈꽃 축제',sub:'크리스마스',region:'MOND',four:MOND4,fights:XMAS_FIGHTS,game:'SNOWBALL',gameName:'눈싸움',task:'GIFT',taskName:'선물 배달',story:0},
 SEOLLAL:{name:'설날',sub:'새해 첫날',region:'LIYUE',four:LIYUE4,fights:SEOLLAL_FIGHTS,game:'YUT',gameName:'윷놀이',task:'SEBAE',taskName:'세배 돌기',story:4},
 CHUSEOK:{name:'추석',sub:'한가위',region:'LIYUE',four:LIYUE4,fights:CHUSEOK_FIGHTS,game:'SONGPYEON',gameName:'송편 빚기',task:'CHARYE',taskName:'차례상 차리기',story:4}
};
// 원석 generously (user, 2026-10-18: 「이 게임 자체가 원석을 현질로 살 수 있는게 없는데 원석 좀 팍팍 뿌려」): a festival with a story pays about
// 4,260 원석 in all (2,500 from the points, 160 a part, 20 a new star, minigame star and travel task).
const STORY_DAYS=[1,3,5,7],STORY_REWARD={points:100,primogem:160};
const POINTS={star:40,tier:[0,40,80,120],task:60},PRIMO={star:20,tier:20,task:20};
// reached points pay by themselves; the last is the 4★ pick
const MILESTONES=[
 {at:150,primogem:200},{at:300,primogem:200,mora:30000},{at:500,primogem:200,items:{MAT_CHAR_EXP_HERO:5}},{at:700,primogem:300},{at:900,primogem:300,mora:50000},
 {at:1100,primogem:300,items:{MAT_CHAR_EXP_HERO:8}},{at:1300,primogem:400},{at:1500,primogem:600},{at:1800,pick:true}
];
const PICK=MILESTONES.length-1;
// ---------- which festival is open (the server's list) ----------
function listOf(rt){return Array.isArray(rt.opServerEvents)?rt.opServerEvents:Array.isArray(root.CRPGOpEventsList)?root.CRPGOpEventsList:[];}
// the open one, or one ended at most seven days ago (its pick is still open); a festival day counts from its start (Korean midnight)
P.festivalNow=function(){
 const t=nowOf(this);
 for(const e of listOf(this)){
  if(!e||e.kind!=='SEASON'||typeof e.id!=='string'||!/^FES_[A-Z0-9_]{1,40}$/.test(e.id)||!own(FESTIVALS,e.festival))continue;
  const start=Number(e.startsAt),end=Number(e.endsAt);if(!Number.isFinite(start)||!Number.isFinite(end)||t<start||t>=end+CLAIM_DAYS*DAY)continue;
  const open=t<end,day=e.allDays?DAYS:Math.max(1,Math.min(DAYS,Math.floor((t-start)/DAY)+1));
  return {id:e.id,key:e.festival,...FESTIVALS[e.festival],startsAt:start,endsAt:end,open,day,test:!!e.test};
 }
 return null;
};
function rec(rt,f){let o=rt.s.festival;if(!o||o.v!==1||o.id!==f.id)o=rt.s.festival={v:1,id:f.id,key:f.key,points:0,got:[],picked:null,story:[],stars:{},games:{},tasks:{}};return o;}
const peek=(rt,f)=>{const o=rt.s?.festival;return o?.v===1&&o.id===f.id?o:null;};
// ---------- the fights ----------
function fight(f,day){const x=f.fights[day-1];if(!x)return null;const [name,group,rule,more]=x;return {day,name,group,rule,stars:[['WIN'],...more]};}
const RULE_TEXT=r=>[r.aura?'적이 '+r.aura+' 원소를 두르고 시작':'',r.enemyHp?'적 HP +'+r.enemyHp+'%':'',r.enemyAtk?'적 공격력 +'+r.enemyAtk+'%':'',r.enemyDef?'적 방어력 +'+r.enemyDef+'%':'',r.enemySpd?'적 속도 +'+r.enemySpd:'',r.allyAtk?'아군 공격력 +'+r.allyAtk+'%':''].filter(Boolean);
const STAR_TEXT=([k,v])=>k==='WIN'?'이기기':k==='ROUNDS'?v+'라운드 안에 이기기':k==='NO_KO'?'아무도 쓰러지지 않고 이기기':k==='ELEMENT'?v+' 원소 동료와 함께 이기기':k==='PARTY'?v+'명 이하로 이기기':k==='HP'?'HP를 절반 넘게 남기고 이기기':k;
const fightLevel=rt=>Math.max(5,Math.min(60,Number(rt.s.global.PLAYER_LEVEL_STATE)||1));
function allyElement(rt,a){
 if(a.source==='PLAYER_CUSTOM'){const k=rt.constellationKey?.('PLAYER_CUSTOM');return k==='TRAVELER_GEO'?'바위':k==='TRAVELER_ANEMO'?'바람':null;}
 const tag=String(rt.tables['07_CHAR_DB']?.get(a.source)?.[3]||'');return Object.values(EL).find(e=>tag.includes('['+e+']'))||null;
}
function starsOf(rt,b,ch){
 const allies=b.actors.filter(a=>a.side==='ALLY'&&(a.source==='PLAYER_CUSTOM'||rt.tables['07_CHAR_DB']?.has(a.source))),hp=allies.reduce((n,a)=>n+Math.max(0,Number(a.hp)||0),0),max=allies.reduce((n,a)=>n+(Number(a.maxHp)||0),0);
 return ch.stars.map(([k,v])=>k==='WIN'?true:k==='ROUNDS'?Number(b.round)<=v:k==='NO_KO'?allies.every(a=>a.hp>0):k==='ELEMENT'?allies.some(a=>a.source!=='PLAYER_CUSTOM'&&allyElement(rt,a)===v):k==='PARTY'?allies.length<=v:k==='HP'?max>0&&hp*2>max:false);
}
P.growthEncounterLevel=function(origin,...rest){if(String(origin).startsWith('FESTIVAL:')){const n=Number(String(origin).split(':')[3]);if(Number.isInteger(n)&&n>=1&&n<=60)return n;}return old.growthEncounterLevel.call(this,origin,...rest);};
P.startBattle=function(group,origin='EXPLICIT',...rest){
 const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime,ch=this._festivalFight;
 if(ch&&b&&b!==before){
  b.festival={id:ch.id,day:ch.day,level:ch.level,rule:copy(ch.rule)};const r=ch.rule;
  for(const a of [...b.actors,...(b.enemyReserve||[])].filter(x=>x.side==='ENEMY')){
   if(r.enemyHp){const prev=a.maxHp;a.maxHp=a.hp=Math.max(1,Math.round(a.maxHp*(1+r.enemyHp/100)));for(const s of a.shields||[]){s.value=Math.round(s.value*a.maxHp/prev);if(s.initialValue)s.initialValue=Math.round(s.initialValue*a.maxHp/prev);}}
   if(r.aura)a.aura=r.aura;
  }
 }
 return out;
};
P.combatStat=function(a,key){
 const n=old.combatStat.call(this,a,key),r=this.s?.runtime?.festival?.rule;if(!r||!a)return n;
 if(a.side==='ENEMY'){if(key==='atk'&&r.enemyAtk)return n*(1+r.enemyAtk/100);if(key==='def'&&r.enemyDef)return n*(1+r.enemyDef/100);if(key==='spd'&&r.enemySpd)return n+r.enemySpd;}
 else if(a.side==='ALLY'&&key==='atk'&&r.allyAtk)return n*(1+r.allyAtk/100);
 return n;
};
// ---------- the minigames: the same rules here and on the page ----------
// 눈싸움: behind your snow wall, stand up to throw at whoever pops up from the five forts, and duck when one winds up to throw back.
// (user: 「이벤트 퀄리티좀 높여봐. 좀 재밌게」) Three kinds pop up: a friend (100, more in a row), a gift box (250, never throws) and
// 진 단장 (do not hit her: −150, and the run of hits ends). Five hits in a row light 「눈꽃 피버」: for five seconds every hit counts twice.
const SNOW={ms:45000,lanes:5,flight:380,incoming:600,stun:900,cooldown:300,hit:100,combo:20,hurt:50,gift:250,jean:250,fever:5000,feverAt:5};
// 0.16.68 (user: 「사람 나오는 줄을 두 줄로 하고, 나올 경우의 수도 두배가 되는 대신 느리게. 또는 1일째나 2일째에는 한 줄로 하고 3일째부터 두
// 줄로」, 「적 공격속도를 좀 낮춰봐」): from day 3 a near row of five more places (lanes 5–9); on those days friends stay up longer, come a little
// less often and throw less. Their snowballs take 0.6 s to land (0.45 s before). After 「이번엔 … 너무 쉬워졌는데? 살짝만 난이도 더 어렵게」 the middle
// of the two tries: day 7 has 16 throws in 45 s (19 at first, 12 at the easiest), 2.7 s between them (2.2 / 3.3).
const snowRows=day=>day>=3?2:1,snowLanes=day=>SNOW.lanes*snowRows(day);
function snowPlan(seed,day){
 // 0.16.68 (user: 「눈싸움 7일째 난이도가;; 너무 빨라서 그냥 다처맞아」): the days grow harder more gently. Day 7 had a 「!」 up 60% of
 // the time and friends up 1.29 s; now about 37% and 1.57 s (the old day 3–4). Day 1 is about the same.
 const two=snowRows(day)>1,lanes=snowLanes(day),r=rng(seed),pops=[];let t=1500;const gap=[900-30*day,1600-45*day].map(x=>x*(two?1.05:1)),up=[1400-25*day,2200-40*day].map(x=>x*(two?1.2:1)),pThrow=two?.33+.025*day:.35+.03*day,pGift=.1,pJean=.07+.01*day;
 while(t<SNOW.ms-1500){
  const busy=new Set(pops.filter(p=>p.down>t).map(p=>p.lane));const free=[...Array(lanes).keys()].filter(l=>!busy.has(l));
  if(free.length){const lane=free[Math.floor(r()*free.length)],dur=Math.round(up[0]+r()*(up[1]-up[0])),roll=r(),kind=roll<pGift?'gift':roll<pGift+pJean?'jean':'friend',p={lane,up:t,down:t+dur,kind};
   if(kind==='friend'&&r()<pThrow&&dur>900){p.throwAt=t+400+Math.round(r()*(dur-700));}pops.push(p);}
  t+=Math.round(gap[0]+r()*(gap[1]-gap[0]));
 }
 return pops;
}
// until: only what has happened by then (the page draws the game from this, so what it shows is what the engine counts)
function snowPlay(seed,day,inputs,until=Infinity){
 const pops=snowPlan(seed,day),hitBy=new Map(),log=[];let standing=false,stun=-1,last=-1e9,score=0,combo=0,hits=0,hurt=0,gifts=0,jeans=0,bestCombo=0,fevers=0,feverUntil=-1;
 const evs=[];for(const [i,x] of inputs.entries())evs.push({t:x.t,k:0,i,x});for(const p of pops)if(p.throwAt!==undefined)evs.push({t:p.throwAt+SNOW.incoming,k:1,p});
 evs.sort((a,b)=>a.t-b.t||a.k-b.k);const flying=[];
 // 0.16.68: the balls land in the order they arrive (the last one thrown went first before, so with nothing in between the hit
 // moved from the first ball to the second when it landed and the page showed the chest hit twice: user, 「보물상자 연속공격하면 두번 칠 수 있는 버그」)
 const land=t=>{for(const f of flying.filter(x=>x.at<=t).sort((a,b)=>a.at-b.at)){flying.splice(flying.indexOf(f),1);const p=pops.find(q=>q.lane===f.lane&&q.up<=f.at&&f.at<(hitBy.get(q)??q.down));
  if(!p||hitBy.has(p)){combo=0;log.push({t:f.at,k:'miss',lane:f.lane});continue;}
  hitBy.set(p,f.at);
  if(p.kind==='jean'){jeans++;combo=0;feverUntil=-1;score=Math.max(0,score-SNOW.jean);log.push({t:f.at,k:'jean',lane:f.lane,n:-SNOW.jean});continue;}
  const fever=f.at<feverUntil;hits++;combo++;bestCombo=Math.max(bestCombo,combo);
  let n=p.kind==='gift'?SNOW.gift:SNOW.hit+SNOW.combo*Math.min(5,combo-1);if(fever)n*=2;if(p.kind==='gift')gifts++;score+=n;
  log.push({t:f.at,k:p.kind==='gift'?'gift':'hit',lane:f.lane,n,combo,fever});
  if(!fever&&combo>=SNOW.feverAt&&combo%SNOW.feverAt===0){feverUntil=f.at+SNOW.fever;fevers++;log.push({t:f.at,k:'fever',until:feverUntil});}}};
 for(const e of evs){
  if(e.t>until)break;land(e.t);
  if(e.k===1){const p=e.p;if((hitBy.get(p)??Infinity)<=p.throwAt)continue;if(standing){hurt++;combo=0;feverUntil=-1;score=Math.max(0,score-SNOW.hurt);stun=e.t+SNOW.stun;log.push({t:e.t,k:'hurt',lane:p.lane});}else log.push({t:e.t,k:'block',lane:p.lane});continue;}
  const x=e.x;if(x.a==='h')standing=false;else if(x.a==='s')standing=true;
  else if(x.a==='t'){if(!standing||e.t<stun||e.t-last<SNOW.cooldown)continue;last=e.t;flying.push({lane:x.lane,at:e.t+SNOW.flight,from:e.t});log.push({t:e.t,k:'throw',lane:x.lane});}
 }
 land(until);
 const worth=pops.reduce((n,p)=>n+(p.kind==='gift'?SNOW.gift:p.kind==='friend'?SNOW.hit:0),0)*2;
 return {score,hits,hurt,gifts,jeans,bestCombo,fevers,combo,fever:feverUntil,standing,stun,flying:flying.map(f=>({...f})),hitBy:pops.map(p=>hitBy.get(p)??null),log,pops:pops.length,tiers:[Math.round(worth*.2),Math.round(worth*.38),Math.round(worth*.55)]};
}
// 윷놀이: two (later three) pieces each against a Liyue friend. 도 개 걸 윷 모 and 빽도; 윷·모 and a catch throw again; a piece that stops on a
// corner or the middle takes the short way. Stations: 0 참먹이, 1–19 round the edge (5, 10, 15 the corners), 20–24 from 5 through the
// middle (22) to 15, 25–28 from 10 through the middle to 참먹이.
const YUT_OUT=[-1,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,'END'],YUT_A=[5,20,21,22,23,24,15,16,17,18,19,'END'],YUT_B=[10,25,26,22,27,28,'END'],YUT_C=[22,27,28,'END'];
const ROUTES={O:YUT_OUT,A:YUT_A,B:YUT_B,C:YUT_C};
const YUT_NAMES={'-1':'빽도',1:'도',2:'개',3:'걸',4:'윷',5:'모'};
const YUT_FOES=['LIYUE_XINGQIU','LIYUE_XIANGLING','LIYUE_CHONGYUN','LIYUE_BEIDOU','LIYUE_HUTAO','LIYUE_GAMING','LIYUE_ZHONGLI'];
function yutThrow(r){let flat=0,marked=false;for(let i=0;i<4;i++){const f=r()<.5;if(f){flat++;if(i===0)marked=true;}}return flat===0?5:flat===4?4:flat===1?(marked?-1:1):flat;}
const station=p=>p.home?'HOME':ROUTES[p.r][p.i];
function yutCreate(seed,day){const n=day<=3?2:3;return {seed,day,n,r:rng(seed),turn:0,throws:[],phase:'THROW',pieces:[0,1].map(()=>Array.from({length:n},()=>({r:'O',i:0,home:false}))),log:[],moves:0,winner:null};}
// where a piece goes with v (null if it cannot move)
function yutDest(p,v){
 if(p.home)return null;
 if(v<0){if(p.r==='O'&&p.i===0)return null;if(p.r==='O')return {r:'O',i:p.i-1,home:false};if(p.i===0)return null;
  if(p.r==='C')return p.i===1?{r:'B',i:3,home:false}:{r:'C',i:p.i-1,home:false};
  if(p.i===1)return {r:'O',i:p.r==='A'?5:10,home:false};return {r:p.r,i:p.i-1,home:false};}
 let r=p.r,i=p.i;const at=ROUTES[r][i];if(at===5&&r==='O'){r='A';i=0;}else if(at===10&&r==='O'){r='B';i=0;}else if(at===22&&r!=='C'){r='C';i=0;}
 const j=i+v,route=ROUTES[r];if(j>=route.length-1)return {r,i:route.length-1,home:true};return {r,i:j,home:false};
}
function yutLegal(g){
 const side=g.turn,out=[];if(g.phase!=='MOVE')return out;
 for(let k=0;k<g.throws.length;k++){const v=g.throws[k],seen=new Set();
  for(let i=0;i<g.n;i++){const p=g.pieces[side][i];if(p.home)continue;const st=station(p),key=st===-1?'S'+i:String(st);if(st!==-1&&seen.has(key))continue;seen.add(key);if(st===-1&&v<0)continue;if(st===-1&&[...seen].some(x=>x.startsWith('S')&&x!=='S'+i))continue;
   const d=yutDest(p,v);if(d)out.push({k,p:i,v,to:d.home?'HOME':ROUTES[d.r][d.i]});}}
 return out;
}
function yutRoll(g){for(let guard=0;guard<20;guard++){const v=yutThrow(g.r);g.throws.push(v);g.log.push({side:g.turn,throw:v});if(v<4)break;}g.phase='MOVE';yutSettle(g);}
function yutSettle(g){
 // throws no piece can use are dropped; with none left the turn passes
 while(g.phase==='MOVE'&&g.throws.length&&!yutLegal(g).length)g.throws.shift();
 if(g.phase==='MOVE'&&!g.throws.length){g.turn=1-g.turn;g.phase='THROW';}
}
function yutPlay(g,k,pi){
 const side=g.turn,legal=yutLegal(g).find(m=>m.k===k&&m.p===pi);if(!legal)return false;
 const v=g.throws.splice(k,1)[0],p=g.pieces[side][pi],st=station(p),group=st===-1?[p]:g.pieces[side].filter(q=>!q.home&&station(q)===st),d=yutDest(p,v);
 for(const q of group)Object.assign(q,d);g.moves++;
 let caught=0;if(!d.home){const at=ROUTES[d.r][d.i];for(const q of g.pieces[1-side])if(!q.home&&station(q)===at){Object.assign(q,{r:'O',i:0,home:false});caught++;}}
 g.log.push({side,move:v,piece:pi,to:d.home?'HOME':ROUTES[d.r][d.i],caught});
 if(g.pieces[side].every(q=>q.home)){g.winner=side;g.phase='DONE';return true;}
 if(caught){g.phase='THROW';g.extra=true;return true;}
 yutSettle(g);return true;
}
// the friend's choice: catch, bring a piece home, join own pieces, else the furthest move (early days choose more plainly)
const progress=(p)=>p.home?99:p.r==='O'?p.i:p.r==='A'?5+p.i*1.2:p.r==='B'?10+p.i*1.6:12+p.i*1.6;
function yutBotPick(g){
 const moves=yutLegal(g);if(!moves.length)return null;const side=g.turn,smart=g.day>=4;
 let best=null,bestScore=-1e9;
 for(const m of moves){const p=g.pieces[side][m.p],d=yutDest(p,m.v);let s=0;
  if(m.to==='HOME')s+=80;else{if(g.pieces[1-side].some(q=>!q.home&&station(q)===m.to))s+=100;if(g.pieces[side].some((q,i)=>i!==m.p&&!q.home&&station(q)===m.to))s+=smart?15:5;
   s+=progress(d)-progress(p);if(smart&&g.pieces[1-side].some(q=>!q.home&&station(q)!==-1&&[1,2,3].some(v=>{const e=yutDest(q,v);return e&&!e.home&&ROUTES[e.r][e.i]===m.to;})))s-=25;}
  if(m.v<0)s-=10;s-=m.k*.01;if(s>bestScore){bestScore=s;best=m;}}
 return best;
}
function yutScore(seed,day,decisions){
 const g=yutCreate(seed,day);g.autoRoll=true;let d=0;
 for(let guard=0;guard<3000&&g.phase!=='DONE';guard++){
  if(g.phase==='THROW'){yutRoll(g);continue;}
  if(g.turn===1){const m=yutBotPick(g);if(!m){g.throws=[];yutSettle(g);continue;}yutPlay(g,m.k,m.p);continue;}
  if(d>=decisions.length)return null;const [k,p]=decisions[d++]||[];if(!yutPlay(g,k,p))return null;
 }
 if(g.phase!=='DONE'||d!==decisions.length)return null;
 // a finished game is ★, a piece home ★★, a win ★★★
 const home=g.pieces[0].filter(q=>q.home).length,score=g.winner===0?1000+100*g.pieces[1].filter(q=>!q.home).length:100+home*200;
 return {score,won:g.winner===0,home,tiers:[100,300,1000]};
}
// 송편 빚기: for each of eight songpyeon three presses (떼기 · 소 넣기 · 빚기) as the marker crosses the gold mark. Each one is ordered with a
// filling (깨 · 콩 · 밤): at 소 넣기 the press is the filling's button, and the wrong filling spoils that step. Three perfects make a pretty
// one (+30).
const SONG={count:8,steps:3,pause:450,start:1200,perfect:100,good:60,pretty:30,fillings:['깨','콩','밤']};
function songPlan(seed,day){const r=rng(seed),out=[];for(let i=0;i<SONG.count*SONG.steps;i++)out.push({period:Math.round((1600-70*day)*(.85+r()*.3)),zone:+(0.2+r()*0.6).toFixed(3),w:+(0.17-0.011*day).toFixed(4)});return out;}
function songOrders(seed){const r=rng((Number(seed)>>>0)^0x5f3759df),out=[];for(let i=0;i<SONG.count;i++)out.push(Math.floor(r()*SONG.fillings.length));return out;}
const tri=x=>{const f=x-Math.floor(x);return 1-Math.abs(1-2*f);};
// input: {p: the 24 press times (null = too late), f: the 8 fillings chosen}
function songPlay(seed,day,input){
 const plan=songPlan(seed,day),orders=songOrders(seed),presses=input?.p,fill=input?.f;
 if(!Array.isArray(presses)||presses.length!==plan.length||!Array.isArray(fill)||fill.length!==SONG.count||fill.some(x=>x!==null&&!(Number.isInteger(x)&&x>=0&&x<SONG.fillings.length)))return null;
 let t=SONG.start,score=0;const marks=[];
 for(let i=0;i<plan.length;i++){const s=plan[i],at=presses[i],limit=t+3*s.period;
  if(at===null){marks.push(0);t=limit+SONG.pause;continue;}
  if(!Number.isFinite(at)||at<t||at>limit)return null;
  const pos=tri((at-t)/s.period),off=Math.abs(pos-s.zone);let m=off<=s.w*.45?2:off<=s.w?1:0;
  if(i%3===1&&fill[Math.floor(i/3)]!==orders[Math.floor(i/3)])m=0;
  marks.push(m);score+=m===2?SONG.perfect:m===1?SONG.good:0;t=at+SONG.pause;}
 const pretty=[];for(let i=0;i<SONG.count;i++){const ms=marks.slice(i*3,i*3+3),sum=ms.reduce((n,m)=>n+(m===2?100:m===1?60:0),0);pretty.push(sum>=270?2:sum>=150?1:0);if(ms.every(m=>m===2))score+=SONG.pretty;}
 return {score,marks,pretty,orders,end:t,tiers:[900,1500,2000]};
}
const GAMES={SNOWBALL:{ms:SNOW.ms},YUT:{ms:20000},SONGPYEON:{ms:8000}};
function gameResult(job,input){
 if(job.game==='SNOWBALL'){if(!Array.isArray(input)||input.length>900)return null;let prev=-1;for(const x of input){if(!x||!Number.isFinite(x.t)||x.t<prev||x.t<0||x.t>SNOW.ms||!['h','s','t'].includes(x.a)||(x.a==='t'&&!(Number.isInteger(x.lane)&&x.lane>=0&&x.lane<snowLanes(job.day))))return null;prev=x.t;}return snowPlay(job.seed,job.day,input);}
 if(job.game==='YUT'){if(!Array.isArray(input)||input.length>600||input.some(x=>!Array.isArray(x)||x.length!==2||!x.every(Number.isInteger)))return null;return yutScore(job.seed,job.day,input);}
 if(job.game==='SONGPYEON')return songPlay(job.seed,job.day,input);
 return null;
}
const tierOf=(res)=>res.score>=res.tiers[2]?3:res.score>=res.tiers[1]?2:res.score>=res.tiers[0]?1:0;
// ---------- the view ----------
function taskList(f,day){if(f.task==='GIFT')return GIFTS[day-1].map(([map,who,text,mora])=>({map,who,text,mora}));if(f.task==='SEBAE')return SEBAE[day-1].map(([map,who,text,mora])=>({map,who,text,mora}));
 return CHARYE[day-1].map(([what,items,mora])=>({map:CHARYE_AT,who:'차례상',what,items,mora,text:'차례상에 '+what+(/[가-힣]$/.test(what)&&(what.charCodeAt(what.length-1)-0xac00)%28?'을':'를')+' 올렸습니다.'}));}
const mapName=(rt,id)=>{try{return String(rt.tables['32_MAP_DB'].get(id)?.[2]||id);}catch{return id;}};
P.festivalView=function(){
 const f=this.festivalNow();if(!f)return null;const o=peek(this,f)||{points:0,got:[],picked:null,story:[],stars:{},games:{},tasks:{}},route=this.s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER'?'TRV':'ISK',map=this.s.global.CURRENT_MAP_ID;
 const days=[];for(let d=1;d<=DAYS;d++){const ch=fight(f,d),tasks=taskList(f,d);
  days.push({day:d,open:d<=f.day,fight:{name:ch.name,group:ch.group,rule:RULE_TEXT(ch.rule),stars:ch.stars.map(STAR_TEXT),got:(o.stars[d]||[0,0,0]).map(Boolean),level:fightLevel(this)},
   game:{tier:Number(o.games[d]?.tier)||0,best:Number(o.games[d]?.best)||0,foe:f.game==='YUT'?YUT_FOES[d-1]:null},
   tasks:tasks.map((x,i)=>({...x,place:mapName(this,x.map),here:x.map===map,done:!!o.tasks[d]?.[i],has:x.items?Object.entries(x.items).map(([id,n])=>({id,n,have:this.itemCount(id)})):null}))});}
 return {id:f.id,key:f.key,name:f.name,sub:f.sub,region:f.region,open:f.open,day:f.day,startsAt:f.startsAt,endsAt:f.endsAt,test:f.test,route,
  game:f.game,gameName:f.gameName,task:f.task,taskName:f.taskName,points:o.points,
  story:f.story?STORY_DAYS.map((d,i)=>({part:i+1,open:d<=f.day,day:d,done:o.story.includes(i+1),chain:i===0?'EVT_'+f.key+'_'+route+'_1':'EVT_'+f.key+'_'+(i+1)})):[],storyReward:{...STORY_REWARD},
  milestones:MILESTONES.map((m,i)=>({...copy(m),got:o.got.includes(i)})),picked:o.picked,pickable:o.points>=MILESTONES[PICK].at&&!o.picked,
  four:f.four.filter(id=>this.tables['07_CHAR_DB']?.has(id)).map(id=>({id,owned:!!this.premiumOwns?.(id)})),days,points_:copy(POINTS),primo:copy(PRIMO)};
};
// ---------- the actions ----------
function blocked(rt){
 const s=rt.s;if(s.runtime||s.battlePreparation)return '진행 중인 전투를 먼저 마쳐 주세요.';
 if(s.tutorialV2?.intro||s.tutorialV2?.loan)return '튜토리얼을 마친 뒤에 할 수 있습니다.';return '';
}
function festReason(rt,type,a){
 const f=rt.festivalNow();if(!f)return '지금 열린 축제가 없습니다.';if(a?.festival!==f.id)return '축제가 바뀌었습니다. 다시 열어 주세요.';
 if(type==='FESTIVAL_PICK'){const o=peek(rt,f);if(!o||o.points<MILESTONES[PICK].at)return '축제 점수 '+MILESTONES[PICK].at+'점을 모으면 고를 수 있습니다.';if(o.picked)return '이미 골랐습니다.';
  if(!(typeof a.char==='string'&&f.four.includes(a.char)&&rt.tables['07_CHAR_DB']?.has(a.char)))return '함께할 동료를 골라 주세요.';return blocked(rt);}
 if(!f.open)return '축제가 끝났습니다.';const why=blocked(rt);if(why)return why;
 const day=a.day;if(type!=='FESTIVAL_STORY'&&type!=='FESTIVAL_GAME_FINISH'){if(!Number.isInteger(day)||day<1||day>DAYS)return '날을 골라 주세요.';if(day>f.day)return day+'일째에 열립니다.';}
 const o=peek(rt,f);
 if(type==='FESTIVAL_FIGHT'){if(rt.s.global.SCREEN_MODE==='STORY')return '이야기를 마친 뒤에 도전해 주세요.';if(['AWAIT_NEXT','IN_BATTLE','RETRY'].includes(rt.s.bossRouteProgress?.phase))return '진행 중인 보스 루트를 마치거나 이탈해 주세요.';
  if(rt.s.lifeJob)return '채집·낚시를 마친 뒤에 도전해 주세요.';if(!(rt.s.party||[]).some(p=>p.active))return '편성에 사람이 없습니다.';if((o?.stars[day]||[]).every(Boolean)&&(o?.stars[day]||[]).length===3)return '이미 별 셋을 모두 받았습니다.';return '';}
 if(type==='FESTIVAL_GAME_START')return '';
 if(type==='FESTIVAL_GAME_FINISH'){const job=rt.s.festivalGame;if(!job||job.festival!==f.id||job.id!==a.job)return '미니게임을 다시 시작해 주세요.';return '';}
 if(type==='FESTIVAL_TASK'){const list=taskList(f,day),n=a.n;if(!Number.isInteger(n)||!list[n])return '과제를 골라 주세요.';if(o?.tasks[day]?.[n])return '이미 마친 과제입니다.';const x=list[n];
  if(rt.s.global.CURRENT_MAP_ID!==x.map)return mapName(rt,x.map)+'에서 할 수 있습니다.';
  if(x.items)for(const [id,k] of Object.entries(x.items))if(rt.itemCount(id)<k)return (rt.tables['14_ITEM_DB'].get(id)?.[1]||id)+' '+k+'개가 필요합니다.';return '';}
 if(type==='FESTIVAL_STORY'){const part=a.part;if(!f.story)return '이 축제에는 이야기가 없습니다.';if(!Number.isInteger(part)||part<1||part>f.story)return '이야기를 골라 주세요.';
  if(STORY_DAYS[part-1]>f.day)return STORY_DAYS[part-1]+'일째에 열립니다.';if(part>1&&!o?.story.includes(part-1))return '앞 이야기를 먼저 봐 주세요.';if(o?.story.includes(part))return '이미 본 이야기입니다. (다시 보기는 보상 없이 볼 수 있습니다)';return '';}
 return '';
}
const TYPES=new Set(['FESTIVAL_FIGHT','FESTIVAL_GAME_START','FESTIVAL_GAME_FINISH','FESTIVAL_TASK','FESTIVAL_STORY','FESTIVAL_PICK']);
P.actionReason=function(type,a={},...rest){if(TYPES.has(type))return festReason(this,type,a);return old.actionReason.call(this,type,a,...rest);};
// points, and the milestones they reach (paid at once)
function addPoints(rt,o,n){
 o.points+=n;const paid=[];
 for(let i=0;i<MILESTONES.length;i++){const m=MILESTONES[i];if(i===PICK||o.got.includes(i)||o.points<m.at)continue;o.got.push(i);
  if(m.primogem)rt.s.global.PRIMOGEM=(Number(rt.s.global.PRIMOGEM)||0)+m.primogem;if(m.mora)rt.s.global.MORA+=m.mora;for(const [id,k] of Object.entries(m.items||{}))rt.giveItem(id,k);paid.push({at:m.at,...copy(m)});}
 o.got.sort((a,b)=>a-b);return paid;
}
const givePrimo=(rt,n)=>{if(n>0)rt.s.global.PRIMOGEM=(Number(rt.s.global.PRIMOGEM)||0)+n;return n;};
function take(rt,id,n){for(const row of rt.s.inventory){if(n<=0)break;if(row.item!==id||row.equip)continue;const k=Math.min(n,row.quantity);row.quantity-=k;n-=k;}rt.s.inventory=rt.s.inventory.filter(x=>x.equip||x.quantity>0);}
P.apply=function(a,...rest){
 if(!a||!TYPES.has(a.type))return old.apply.call(this,a,...rest);
 const why=festReason(this,a.type,a);if(why)fail(a.type,why);const f=this.festivalNow(),o=rec(this,f);
 if(a.type==='FESTIVAL_FIGHT'){
  const ch=fight(f,a.day),level=fightLevel(this);this.s.placeVisit=null;this._festivalFight={id:f.id,day:a.day,level,rule:ch.rule};
  try{return this.startBattle(ch.group,'FESTIVAL:'+f.key+':'+a.day+':'+level);}finally{this._festivalFight=null;}
 }
 if(a.type==='FESTIVAL_GAME_START'){
  const t=nowOf(this),seed=(Math.floor(this.random()*4294967295)>>>0)||7,id='FG'+t.toString(36)+seed.toString(36);
  this.s.festivalGame={id,festival:f.id,game:f.game,day:a.day,seed,at:t};
  return {type:a.type,job:copy(this.s.festivalGame),foe:f.game==='YUT'?YUT_FOES[a.day-1]:null};
 }
 if(a.type==='FESTIVAL_GAME_FINISH'){
  const job=this.s.festivalGame,res=gameResult(job,a.input);this.s.festivalGame=null;
  if(!res)fail(a.type,'미니게임 기록이 맞지 않습니다. 다시 해 주세요.');
  const min=job.game==='SNOWBALL'?SNOW.ms*.9:job.game==='SONGPYEON'?Math.max(GAMES.SONGPYEON.ms,res.end*.9):GAMES.YUT.ms;
  if(nowOf(this)-job.at<min)fail(a.type,'미니게임을 끝까지 해 주세요.');
  const was=o.games[job.day]||{tier:0,best:0},tier=tierOf(res),gain=Math.max(0,POINTS.tier[tier]-POINTS.tier[was.tier]);
  o.games[job.day]={tier:Math.max(was.tier,tier),best:Math.max(was.best,res.score)};const primogem=givePrimo(this,Math.max(0,tier-was.tier)*PRIMO.tier),paid=gain?addPoints(this,o,gain):[];
  return {type:a.type,game:job.game,day:job.day,score:res.score,tier,best:o.games[job.day].best,points:gain,primogem,total:o.points,milestones:paid,detail:{tiers:res.tiers,hits:res.hits,hurt:res.hurt,gifts:res.gifts,jeans:res.jeans,bestCombo:res.bestCombo,fevers:res.fevers,won:res.won,home:res.home,pretty:res.pretty}};
 }
 if(a.type==='FESTIVAL_TASK'){
  const x=taskList(f,a.day)[a.n];for(const [id,k] of Object.entries(x.items||{}))take(this,id,k);if(x.mora)this.s.global.MORA+=x.mora;
  (o.tasks[a.day]??=[0,0])[a.n]=1;const primogem=givePrimo(this,PRIMO.task),paid=addPoints(this,o,POINTS.task);
  return {type:a.type,day:a.day,n:a.n,text:x.text,mora:x.mora,primogem,points:POINTS.task,total:o.points,milestones:paid};
 }
 if(a.type==='FESTIVAL_STORY'){
  o.story.push(a.part);o.story.sort((x,y)=>x-y);this.s.global.PRIMOGEM=(Number(this.s.global.PRIMOGEM)||0)+STORY_REWARD.primogem;const paid=addPoints(this,o,STORY_REWARD.points);
  return {type:a.type,part:a.part,primogem:STORY_REWARD.primogem,points:STORY_REWARD.points,total:o.points,milestones:paid};
 }
 if(a.type==='FESTIVAL_PICK'){
  const got=this.wishGrant({kind:'char',id:a.char,rarity:4});o.picked=a.char;if(!o.got.includes(PICK)){o.got.push(PICK);o.got.sort((x,y)=>x-y);}
  return {type:a.type,char:a.char,joined:!!got?.joined,stella:!!got?.stella,glitter:Number(got?.glitter)||0};
 }
};
// a won festival fight: its stars, 40 points each new one
P.finishBattle=function(victory,...rest){
 const b=this.s?.runtime,fb=b?.festival?copy(b.festival):null,stars=fb&&victory&&b?(()=>{const f=FESTIVALS[String(b.origin).split(':')[1]];const ch=f&&fight(f,fb.day);return ch?starsOf(this,b,ch):null;})():null;
 const out=old.finishBattle.call(this,victory,...rest);if(!fb||!out||typeof out!=='object')return out;
 const f=this.festivalNow();
 if(f&&f.id===fb.id&&stars){const o=rec(this,f),was=o.stars[fb.day]||[0,0,0],now=was.map((x,i)=>x||stars[i]?1:0),gain=now.filter((x,i)=>x&&!was[i]).length*POINTS.star;o.stars[fb.day]=now;
  const primogem=givePrimo(this,gain/POINTS.star*PRIMO.star),paid=gain?addPoints(this,o,gain):[];out.festival={day:fb.day,stars:stars.map(x=>x?1:0),got:now,points:gain,primogem,total:o.points,milestones:paid};}
 else if(fb)out.festival={day:fb.day,stars:null,points:0};
 const key=out.battleId||out.id||b?.id;if(key&&this.s.combatReceipts?.[key])this.s.combatReceipts[key]=copy(out);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(out);
 return out;
};
P.validateSave=function(s,...rest){
 const out=old.validateSave.call(this,s,...rest)||s,o=out?.festival,g=out?.festivalGame;
 if(o!==undefined&&o!==null){const bad=typeof o!=='object'||Array.isArray(o)||o.v!==1||typeof o.id!=='string'||!/^FES_[A-Z0-9_]{1,40}$/.test(o.id)||!own(FESTIVALS,o.key)||!int(o.points)||o.points>5000
  ||!Array.isArray(o.got)||o.got.some(i=>!Number.isInteger(i)||i<0||i>=MILESTONES.length)||new Set(o.got).size!==o.got.length||o.got.some(i=>o.points<MILESTONES[i].at)
  ||(o.picked!==null&&!(typeof o.picked==='string'&&FESTIVALS[o.key].four.includes(o.picked)))||!Array.isArray(o.story)||o.story.some(p=>!Number.isInteger(p)||p<1||p>4)
  ||[o.stars,o.games,o.tasks].some(m=>!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).some(d=>!/^[1-7]$/.test(d)))
  ||Object.values(o.stars).some(x=>!Array.isArray(x)||x.length!==3||x.some(v=>v!==0&&v!==1))||Object.values(o.tasks).some(x=>!Array.isArray(x)||x.length!==2||x.some(v=>v!==0&&v!==1))
  ||Object.values(o.games).some(x=>!x||!Number.isInteger(x.tier)||x.tier<0||x.tier>3||!int(x.best));
  if(bad)fail('FESTIVAL_SAVE','축제 기록이 올바르지 않습니다.');}
 if(g!==undefined&&g!==null){if(typeof g!=='object'||typeof g.id!=='string'||!GAMES[g.game]||!Number.isInteger(g.day)||g.day<1||g.day>DAYS||!int(g.seed)||!Number.isFinite(g.at))fail('FESTIVAL_SAVE','축제 기록이 올바르지 않습니다.');}
 return out;
};
api.festivalV01667={version:1,festivals:copy(Object.fromEntries(Object.entries(FESTIVALS).map(([k,f])=>[k,{name:f.name,sub:f.sub,region:f.region,game:f.game,gameName:f.gameName,task:f.task,taskName:f.taskName,story:f.story,four:f.four}]))),
 milestones:copy(MILESTONES),points:copy(POINTS),primo:copy(PRIMO),storyReward:copy(STORY_REWARD),storyDays:STORY_DAYS.slice(),
 snow:{rules:{...SNOW},plan:snowPlan,play:snowPlay,rows:snowRows,lanes:snowLanes},yut:{names:{...YUT_NAMES},foes:YUT_FOES.slice(),routes:copy(ROUTES),create:yutCreate,legal:yutLegal,roll:yutRoll,settle:yutSettle,play:yutPlay,score:yutScore,dest:yutDest,station,bot:yutBotPick},
 song:{rules:{...SONG,fillings:SONG.fillings.slice()},plan:songPlan,orders:songOrders,play:songPlay,tri}};
P.festivalV01667=true;
})(globalThis);
/* 0.16.68 이야기 분위기 (user's workbench note, 2026-10-19: 「여기서 천천히 설명을 진행하면서 분위기를 조성 … 화면 전체를 어둡게 하거나
 * 테두리에 효과같은걸 얹어가면서」): the look a manuscript gives its lines (`@mood 어둠`, tools/editorial/compile_main_story_k.cjs), read by
 * the story screen (app_storymood_v01668.js). It changes nothing in the story itself. */
(function(root){
'use strict';
const P=root.CRPGRuntime.Runtime.prototype;if(P.storyMood)return;
P.storyMood=function(id){if(!id)return '';try{return this.storyIndex()?.storyMoods?.[String(id)]||'';}catch{return '';}};
})(globalThis);

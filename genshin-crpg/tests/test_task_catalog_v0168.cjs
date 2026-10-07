'use strict';
// Verify the objective DATA against the installed game's actual places, pools, recipes and rarity.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'source/runtime_task_catalog_v0168.js'),'utf8'),ctx);
const catalog=JSON.parse(JSON.stringify(ctx.CRPGTaskCatalogV0168));
const {fresh,c}=require('./helpers_v011.cjs'),r=fresh();
const rows=[...catalog.daily,...catalog.weekly,...catalog.chains],by=new Map(rows.map(t=>[t.id,t]));
assert.deepEqual(catalog.stats,{daily:8,weekly:20,chains:240,families:24});
assert.equal(by.size,rows.length,'every stable task and commission ID is unique');
assert.equal(catalog.families.length,24);
const kinds=new Set(['win','ley','domain','boss','abyss','gather','mine','fish','hunt','cook','forge','life']);
const elements=new Set(['PYRO','HYDRO','CRYO','ELECTRO','ANEMO','GEO','DENDRO','PHYSICAL']);
const domainSites=r.growthDomainSites(),leyLevels=new Set([6,15,30,45,60]);
const materialKinds={gather:'GATHER',mine:'MINE',fish:'FISH',hunt:'HUNT'};
const maps=r.rows('32_MAP_DB').filter(x=>x[1]==='몬드'||x[1]==='리월');
const regionalIds=new Set(maps.map(x=>x[0]));
const encounterFoes=map=>r.rows('34_MAP_ENCOUNTER_POOL').filter(x=>x[1]===map&&x[5]).flatMap(x=>{
 const g=r.tables['33_ENCOUNTER_GROUP_DB'].get(x[5]);
 return g?[7,10,13,16,19].map(i=>g[i]).filter(Boolean):[];
});
const allFoes=new Set(maps.flatMap(x=>encounterFoes(x[0])));
for(const s of domainSites)for(const level of s.levels)for(const element of ['NEUTRAL','PYRO','HYDRO','CRYO','ELECTRO','ANEMO','GEO','DENDRO']){
 const d={key:s.key,kind:s.kind,region:s.region,map:s.map,level,id:s.key+':'+level};
 for(const enemy of r.growthDomainFoes(d,element))allFoes.add(enemy.id);
}
for(const t of rows){
 const at=t.id;assert(kinds.has(t.kind),at+': supported successful action');
 assert(Number.isInteger(t.goal)&&t.goal>0,at+': positive goal');
 assert(Number.isInteger(t.minLevel)&&t.minLevel>=1&&t.minLevel<=60,at+': current level cap');
 assert(t.name&&t.name.length<100,at+': concise factual name');
 for(const map of t.filter.maps||[])assert(regionalIds.has(map),at+': an installed Mond/Liyue map '+map);
 for(const enemy of t.filter.enemies||[]){
  assert(r.tables['09_MONSTER_DB'].has(enemy),at+': a registered monster '+enemy);
  assert(t.kind==='boss'?!!c.CRPGRuntime.fieldBosses.bosses[enemy]:allFoes.has(enemy),at+': a currently reachable enemy '+enemy);
 }
 if(t.kind==='win'&&t.filter.maps){
  assert(t.filter.maps.some(map=>r.row('32_MAP_DB',map)[8]==='Y'&&encounterFoes(map).length),at+': at least one repeatable travel encounter');
  if(t.filter.enemies)assert(t.filter.maps.some(map=>encounterFoes(map).some(id=>t.filter.enemies.includes(id))),at+': enemy appears at required map');
 }
 if(materialKinds[t.kind]){
  const kind=materialKinds[t.kind],eligible=t.filter.maps||maps.map(x=>x[0]);
  for(const item of t.filter.resources||[]){
   assert(r.tables['14_ITEM_DB'].has(item),at+': exact registered resource '+item);
   assert(eligible.some(map=>r.lifePool(kind,map).some(x=>x.item===item)),at+': resource can be obtained by required action/map '+item);
  }
 }
 if(t.kind==='cook'||t.kind==='forge')for(const recipe of t.filter.recipes||[]){
  const q=r.tables['17_RECIPE_DB'].get(recipe);assert(q,at+': actual recipe '+recipe);
  assert(t.kind==='cook'?q[1]==='요리':q[2]==='EQUIP',at+': successful craft has required type');
  assert(!/이나즈마|수메르|폰타인|나타|노드크라이|스네즈나야/.test(String(q[18])),at+': no future-region recipe unlock');
 }
 if(t.kind==='domain'&&t.filter.domainTypes){
  assert(t.filter.domainTypes.every(x=>['TALENT','ASCENSION','EXP'].includes(x)),at+': actual current domain kind');
  assert(domainSites.some(s=>t.filter.domainTypes.includes(s.kind)&&(!t.filter.maps||t.filter.maps.includes(s.map))&&s.levels.some(l=>!t.filter.minStage||l>=t.filter.minStage)),at+': selected difficulty exists at required site');
 }
 if(t.kind==='ley'&&t.filter.leyTypes){
  assert(t.filter.leyTypes.every(x=>['REVELATION','WEALTH'].includes(x)),at+': actual blossom kind');
  if(t.filter.minStage)assert(leyLevels.has(t.filter.minStage),at+': selected blossom level exists');
  if(t.filter.maps)assert(t.filter.maps.every(m=>c.CRPGRuntime.leyLines.sites.some(s=>s.map===m)),at+': real blossom ground');
 }
 if(t.kind==='abyss'&&t.filter.stages)assert(t.filter.stages.every(n=>Number.isInteger(n)&&n>=1&&n<=12),at+': actual Abyss floors');
 const party=t.filter.party;
 if(party){
  assert.equal(party.full,true,at+': fixed four participants');
  if(party.mono)assert(['ANEMO','GEO'].includes(party.mono),at+': only reachable protagonist mono element');
  for(const element of [...party.elements||[],...Object.keys(party.elementCounts||{})])assert(elements.has(element),at+': normalized element');
  if(party.elementCounts){assert.equal(Object.values(party.elementCounts).reduce((a,b)=>a+b,0),4);assert(party.elementCounts.ANEMO===2||party.elementCounts.GEO===2);}
  for(const id of party.companions||[]){
   assert(r.tables['07_CHAR_DB'].has(id),at+': actual companion '+id);
   assert(/^(MOND|LIYUE)_/.test(id),at+': presently available regional companion');
   if(party.companionRarity)assert.equal(r.rarityOf(id),4,at+': named companion is actually 4-star');
  }
  assert((party.companions||[]).length<=3,at+': fixed hero leaves three companion slots');
 }
 if(t.tier){
  assert(Object.keys(t.reward).every(k=>['mora','primogem'].includes(k)),at+': commission grants only explicit cash/finite Primogems');
  assert.equal(t.rewardScale,'absolute',at+': cash reward is not multiplied by character level');
  assert(Number.isSafeInteger(t.reward.mora)&&t.reward.mora>=0,at+': nonnegative fixed cash');
  assert((t.reward.mora||0)+(t.reward.primogem||0)>0,at+': meaningful reward');
 }else{
  assert(Array.isArray(t.reward.moraByLevel),at+': recurring cash uses assignment-time level brackets');
  assert(t.reward.moraByLevel.every(x=>Number.isSafeInteger(x.mora)&&x.mora>=0),at+': whole cash brackets');
 }
 if(t.id.startsWith('D_')&&['domain','ley'].includes(t.kind)){
  assert.equal(t.minLevel,1,at+': no objective-imposed character level');
  assert(!t.filter.minStage&&!t.filter.stages&&!t.filter.party,at+': any actually open farming stage/party qualifies');
 }
 if(t.id==='D_V168_APPLE'){assert.deepEqual(t.filter,{});assert.equal(t.goal,3);assert.equal(t.countMode,'actions');}

}
for(const family of catalog.families){
 const list=catalog.chains.filter(t=>t.family===family.id);assert.equal(list.length,10);
 const signatures=new Set(list.map(t=>JSON.stringify([t.kind,t.goal,t.filter])));assert.equal(signatures.size,10,family.id+': ten different objectives');
 for(let i=0;i<list.length;i++){
  const t=list[i];assert.equal(t.id,'Q_TASK_'+family.id+'_'+String(i+1).padStart(2,'0'));
  assert.equal(t.predecessor,i?list[i-1].id:'',t.id+': exactly the immediately previous claim unlocks it');
  assert.equal(t.tier,i+1);assert.equal(t.map,family.map);assert(regionalIds.has(t.map));
  assert(t.description.includes('수락 이후'));const legacy=catalog.legacyChains.find(q=>q.id===t.id);assert.equal(legacy.reward.mora,125+25*i);assert.equal(legacy.reward.primogem||0,[0,0,0,20,30,40,60,80,120,300][i]);
  const installed=r.row('22_QUEST_DB',t.id),definition=JSON.parse(installed[10]),reward=JSON.parse(installed[11]);
  assert.deepEqual(reward,t.reward,t.id+': installed commission preserves the existing Mora/Primogem reward fields');
  assert.equal(definition.conditions.unclaimed,true,t.id+': normal claimed state permanently closes this commission');
  assert(!definition.repeat&&!definition.daily&&!definition.weekly,t.id+': no recurring commission flag');
 }
}
assert.equal(catalog.chains.reduce((n,t)=>n+t.reward.mora,0),2618700);
assert.equal(catalog.chains.reduce((n,t)=>n+(t.reward.primogem||0),0),17625);
assert.equal(catalog.notes.commissionMora,2618700);assert.equal(catalog.notes.commissionPrimogems,17625);
assert.equal(catalog.notes.commissionRewardSchedule,'PER_OBJECTIVE_ABSOLUTE');assert.equal(catalog.notes.commissionRepeatable,false);
assert.equal(catalog.notes.totalDailyCandidates,catalog.daily.length+4);assert.equal(catalog.notes.totalWeeklyCandidates,catalog.weekly.length+4);
assert(catalog.chains.filter(t=>t.reward.mora===0&&t.reward.primogem>=80).length>=15,'several demanding objectives prioritize Primogems over cash');
assert(new Set(catalog.chains.map(t=>JSON.stringify(t.reward))).size>100,'rewards distinguish actual objectives instead of repeating a tier formula');
assert.deepEqual(catalog.daily.map(t=>t.id),['D_V168_HILI','D_V168_PYRO_HYDRO','D_V168_REVELATION15','D_V168_WEALTH30','D_V168_TALENT15','D_V168_ASCENSION40','D_V168_APPLE','D_V168_STEAK']);
assert.equal(catalog.daily.filter(t=>t.dynamicElements).length,1,'one daily objective is assigned from owned elements');
assert.deepEqual(catalog.daily.reduce((slots,t)=>(slots[t.slot]=(slots[t.slot]||0)+1,slots),{}),{win:2,ley:2,domain:2,life:2});
assert.deepEqual([...new Set(catalog.chains.map(t=>t.kind))].sort(),[...kinds].filter(k=>k!=='life').sort(),'all eleven action kinds have one-time commissions');
for(const [key,prefix]of [['daily','D_V168_'],['weekly','W_V168_']])for(const t of catalog[key]){assert(t.id.startsWith(prefix));assert(t.short.length<=8);}
assert(catalog.weekly.some(t=>t.goal>=150)||catalog.legacyWeekly.some(t=>t.goal>=150),'the weekly board has a substantial victory target');
assert(catalog.weekly.some(t=>t.kind==='forge')&&catalog.weekly.some(t=>t.kind==='fish')&&catalog.weekly.some(t=>t.kind==='mine'),'weekly goals include distinct noncombat work');
assert.equal(catalog.notes.dailySlots,4);assert.equal(catalog.notes.weeklySlots,20);assert.equal(catalog.notes.dailyPrimogems,20);assert.equal(catalog.notes.weeklyAllPrimogems,200);
console.log('PASS 보존한 0.16.8/0.16.9 기본 카탈로그 의뢰240개: 실제 목표/장소/재료/선행 조건, 보상 차등, 기존 보상 정의 보존, 일일4/주간최대20');

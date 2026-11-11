'use strict';
// Observational audit. Synthetic ownership/level/equipment is declared per scenario;
// uses the checked-out runtime. Baseline observations were 0.15.22; 0.15.23 settles AI stalemates. No pass thresholds.
const {fresh,R,db,c,fs,root}=require('../tests/helpers_v011.cjs');
const path=require('node:path');
const api=c.CRPGRuntime, G=api.growthV01522, cp=x=>JSON.parse(JSON.stringify(x));
const OUT=path.join(root,'evidence/balance-audit-v01522');fs.mkdirSync(OUT,{recursive:true});
const PLAYER='PLAYER_CUSTOM', SEEDS=[717,9031,4242,1729,20261];
const TEAMS={basic:['MOND_AMBER','MOND_KAEYA','MOND_NOELLE'],attack:['MOND_FISCHL','LIYUE_XIANGLING','MOND_LISA'],heal:['MOND_FISCHL','LIYUE_XIANGLING','MOND_BARBARA'],bennett:['MOND_FISCHL','LIYUE_XIANGLING','MOND_BENNETT'],five:['MOND_DILUC','LIYUE_XINGQIU','MOND_JEAN'],shield:['MOND_NOELLE','MOND_DIONA','MOND_BENNETT']};
const WEAPONS={starter:{'한손검':'EQ_SWORD_COOL_STEEL','양손검':'EQ_CLAYMORE_DEBATE','장병기':'EQ_POLEARM_BLACK_TASSEL','활':'EQ_BOW_SLINGSHOT','법구':'EQ_CATALYST_MAGIC_GUIDE'},craft:{'한손검':'EQ_SWORD_RANCOUR','양손검':'EQ_CLAYMORE_WHITEBLIND','장병기':'EQ_POLEARM_CRESCENT','활':'EQ_BOW_CRESCENT','법구':'EQ_CATALYST_MAPPA'}};
function write(name,data){fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({stage:name,rows:Array.isArray(data)?data.length:Object.keys(data).length,file:path.join(OUT,name+'.json')}));}
function flags(r){for(const k of ['FLAG_TRV_ANEMO_UNLOCKED','FLAG_TRV_MON_CH1_CLEAR','FLAG_TRV_MON_CH2_CLEAR','FLAG_ISK_M03_CLEAR','FLAG_ISK_M05_CLEAR','FLAG_ACCESS_REGION_LIYUE'])r.s.flags[k]=true;for(const route of ['TRV','ISK'])for(const region of ['MOND','LIYUE'])for(let n=1;n<=4;n++){const id=`Q_${route}_${region}_0${n}`;if(r.tables['22_QUEST_DB'].has(id))r.questState(id).claimed=true;}}
function setup({level=10,team='basic',gear='craft',enhance=3,talent='mid',route='ROUTE_ISEKAI',map='MAP_MOND_CITY',formation=null,saveId}={}){
 const r=fresh(map,route),ids=Array.isArray(team)?team:TEAMS[team];if(saveId)r.s.global.SAVE_ID=saveId;flags(r);
 r.s.inventory=[];r.s.global.MORA=0;const owned={};r.s.party=r.s.party.map((p,i)=>i?{slot:'PARTY_'+(i+1),active:false}:p);
 for(const [i,id]of [PLAYER,...ids].entries()){
  const l=Array.isArray(level)?level[i]:level;
  if(id===PLAYER){r.s.global.PLAYER_LEVEL_STATE=l;r.s.global.PLAYER_XP_STATE=0;}
  else {r.s.chars[id].level=l;r.s.chars[id].xp=0;owned[id]={state:'JOINED'};r.s.party[i]={slot:'PARTY_'+(i+1),type:'CHAR',source:id,control:'AI',active:true,tactic:'균형'};}
  r.s.ascensions[id]=G.phaseFor(l);
 }
 r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(owned);
 for(const id of [PLAYER,...ids]){
  const level=r.growth(id).level,cap=r.growth(id).talentCap,t=talent==='cap'?cap:talent==='mid'?Math.max(1,Math.floor(cap*.65)):Number(talent)||1;
  (r.s.talents??={})[id]={na:Math.min(t,cap),e:Math.min(t,cap),q:Math.min(t,cap)};
  if(gear==='none')continue;
  const type=r.equipmentProficiencies(id)[0],weapon=WEAPONS[gear==='starter'||level<3?'starter':'craft'][type];
  const equips=[weapon,gear==='starter'?'EQ_ARMOR_TRAVEL_COAT':'EQ_ARMOR_REINFORCED_LEATHER'];
  if(gear!=='starter')equips.push('EQ_ACC_HEALER_BROOCH');
  for(const eq of equips){if(!eq)throw Error('weapon '+id+' '+type);if(Number(r.row('16_EQUIP_DB',eq)[19]||1)>level)continue;const slot=r.giveEquipment(eq);r.action('EQUIP',{slot,owner:id});const inv=r.s.inventory.find(x=>x.slot===slot);inv.enhance=enhance;if(enhance>10)inv.enhancementCap=12;}
 }
 if(formation)r.action('FORMATION_SET',{formation});r.recalculate();heal(r);return r;
}
function heal(r){r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;for(const p of r.s.party.filter(p=>p.active&&p.source!==PLAYER))r.s.chars[p.source].hp=r.character(p.source).maxHp;}
function observe(r){const old=r.finishBattle;r.finishBattle=function(win){const b=this.s.runtime;if(b){this._auditLast={rounds:b.round,win,actors:cp(b.actors.map(a=>({id:a.id,source:a.source,side:a.side,level:a.level,hp:a.hp,maxHp:a.maxHp,atk:a.atk,def:a.def,grade:a.grade}))),log:cp(b.log),objective:cp(b.liyueObjective||null),defeatReason:b.defeatReason};}return old.call(this,win);};}
function play(r,policy='skills'){
 if(r.s.runtime&&r.combatOpening?.())r.action('COMBAT_BEGIN');
 for(let n=0;r.s.runtime&&n<400;n++){
  const b=r.s.runtime;if(b.liyueInterlude){r.action('LIYUE_INTERLUDE_ACK');continue;}
  if(b.interlude){r.action('STORY_NEXT',{node:r.storyActiveNodeId()});continue;}
  const cards=r.combatCards().filter(x=>!x.reason),enemies=b.actors.filter(x=>x.side==='ENEMY'&&x.hp>0);
  let card=cards.find(x=>x.id==='SYS_MOND_WIND_ROUTE');
  if(!card&&b.subduedPending)card=cards.find(x=>x.id===b.storyConfig?.orb_action?.id);
  if(!card&&policy==='skills')card=cards.find(x=>/PLAYER_(?:TRAVELER_ANEMO|ISEKAI)_Q$/.test(x.id));
  if(!card&&policy==='skills')card=cards.find(x=>x.id==='PLAYER_TRAVELER_ANEMO_E');
  if(!card)card=cards.find(x=>x.id==='PLAYER_BASIC_ATTACK');
  if(!card)card=cards.find(x=>x.id==='PLAYER_BASIC_GUARD');
  if(!card){r.autoUntilPlayer();continue;}
  const targets=card.targets||[],t=targets.map(x=>enemies.find(e=>e.id===x.id)||x).sort((a,b)=>(a.hp??Infinity)-(b.hp??Infinity))[0];
  r.action('COMBAT',{card:card.id,...(t?{target:t.id}:{}),...(card.id==='PLAYER_TRAVELER_ANEMO_E'?{branch:'HOLD'}:{})});
 }
 if(r.s.runtime)return {victory:false,stalled:true,rounds:r.s.runtime.round};
 const x=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'{}'),s=r._auditLast,allies=s?.actors.filter(a=>a.side==='ALLY')||[];
 return {victory:!!x.victory,rounds:x.rounds,defeatReason:s?.defeatReason,hpBeforeReward:allies.reduce((n,a)=>n+Math.max(0,a.hp),0),maxHp:allies.reduce((n,a)=>n+a.maxHp,0),deaths:allies.filter(a=>a.hp<=0).length,xp:x.xp,mora:x.mora,loot:x.loot,domain:x.domain,events:s?.log.length};
}
function battle(o,{group,map,domain,element='NEUTRAL',origin='EXPLICIT'},seed=717,policy='skills'){
 const r=setup({...o,map:map||o.map||'MAP_MOND_CITY'});r.s.global.PRNG_STATE=seed;r.s.domainDaily={day:G.dayOf(Date.now()),wins:3};observe(r);
 if(domain)r.action('DOMAIN_START',{domain,element});else r.startBattle(group,origin);
 const initial=r.s.runtime.actors.map(a=>({source:a.source,side:a.side,level:a.level,hp:a.maxHp,atk:a.atk,def:a.def,grade:a.grade}));
 let result;try{result=play(r,policy);}catch(e){result={victory:false,error:e.code||e.name,message:e.message,rounds:r.s.runtime?.round,actors:r.s.runtime?.actors.map(a=>({id:a.id,source:a.source,side:a.side,hp:a.hp,maxHp:a.maxHp})),tail:r.s.runtime?.log.slice(-15)};}return {profile:o,group,domain,map,element,seed,policy,initial,result};
}
function summarize(rows){const wins=rows.filter(x=>x.result.victory);return {n:rows.length,wins:wins.length,rounds:rows.reduce((n,x)=>n+x.result.rounds,0)/rows.length,winRounds:wins.length?wins.reduce((n,x)=>n+x.result.rounds,0)/wins.length:null,hpRatio:wins.length?wins.reduce((n,x)=>n+x.result.hpBeforeReward/x.result.maxHp,0)/wins.length:0,deaths:rows.reduce((n,x)=>n+(x.result.deaths||0),0)/rows.length};}
function statics(){const r=setup({level:60}),xp=[];let total=0;for(let l=1;l<=60;l++){xp.push({level:l,toNext:G.xpNext(l),total});total+=G.xpNext(l);}const phases=[];
 for(const id of [PLAYER,'MOND_AMBER','MOND_DILUC'])for(let p=0;p<6;p++){const l=G.caps[p];if(id===PLAYER)r.s.global.PLAYER_LEVEL_STATE=l;else{r.s.chars[id].level=l;const owned=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON);owned[id]={state:'JOINED'};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(owned);}r.s.ascensions[id]=p;phases.push({id,phase:p,cost:r.ascensionInfo(id).cost});}
 const members=[];for(const map of ['MAP_MOND_CITY','MAP_LIYUE_HARBOR'])for(const d of r.growthDomainEntries(map))for(const e of d.kind==='ASCENSION'?['NEUTRAL','PYRO','HYDRO','ANEMO','ELECTRO','CRYO','GEO','DENDRO']:['NEUTRAL']){const id=r.growthDomainGroup(d,e);delete r.s.domainDaily;const bonus=r.growthDomainRewards(d,e);r.s.domainDaily={day:G.dayOf(Date.now()),wins:3};members.push({...d,element:e,group:id,members:r.rows('49_ENCOUNTER_MEMBER_DB').filter(x=>x[1]===id).map(x=>({monster:x[3],min:x[4],max:x[5],grade:r.row('09_MONSTER_DB',x[3])[3]})),bonus,base:r.growthDomainRewards(d,e)});}
 const usedMaterials=new Set(phases.flatMap(p=>Object.keys(p.cost.items)));for(const id of ['MAT_SLIME_SECRETIONS','MAT_SLIME_CONCENTRATE'])usedMaterials.add(id);
 const drops=r.rows('20_LOOT_TABLE').filter(x=>usedMaterials.has(x[2])).map(x=>({id:x[0],monster:x[1],item:x[2],min:x[3],max:x[4],chance:x[5],condition:x[6]}));
 const levels=[1,5,10,20,30,40,50,55,60].map(l=>{const a=setup({level:l});return {level:l,stats:[a.player(),...TEAMS.basic.map(id=>a.character(id))].map(x=>({source:x.source,maxHp:x.maxHp,atk:x.atk,def:x.def,spd:x.spd})),phase:G.phaseFor(l)};});
 write('static',{xp,phases,domains:members,drops,levels,talentCurve:api.premiumV0148.talent,fieldBossLimit:api.fieldBossLimits||null});}
function domains(){const rows=[];for(const [map,levels]of [['MAP_MOND_CITY',[5,10,20,30]],['MAP_LIYUE_HARBOR',[30,40,50,60]]])for(const level of levels)for(const kind of ['EXP','ASCENSION','TALENT','GEAR'])for(const seed of SEEDS.slice(0,3)){
 rows.push(battle({level,team:'basic',gear:level<10?'starter':'craft',enhance:level<10?0:level<30?3:6,talent:'mid'},{map,domain:kind+':'+level},seed));
 }write('domains',rows);console.log(JSON.stringify(rows.filter(x=>x.seed===717).map(x=>({map:x.map,domain:x.domain,result:x.result}))))}
function fields(){const rows=[],r=setup();for(const [map,level]of Object.entries(api.growthRegionData.maps)){
 const candidates=r.rows('33_ENCOUNTER_GROUP_DB').filter(x=>x[0].startsWith('EG_MOND_LOCAL_'+map.slice(4)+'_')||x[0].startsWith('EG_LIYUE_LOCAL_'+map.slice(4)+'_'));
 if(!candidates.length)continue;
 for(const group of candidates.map(x=>x[0]))for(const seed of [717,4242])rows.push(battle({level,team:'basic',enhance:level<10?0:level<30?3:6,talent:'mid'},{group,map,origin:'RANDOM'},seed));
 }write('fields',rows);console.log(JSON.stringify({summary:summarize(rows),losses:rows.filter(x=>!x.result.victory).map(x=>[x.map,x.group,x.seed,x.result.rounds])}));}
function bosses(){const rows=[];for(const [boss,level]of Object.entries(api.growthRegionData.bosses)){
 if(/OSIAL/.test(boss))continue;const group={'BOSS_ISK_L03_GOLDEN':'EG_ISK_L03_GOLDEN'}[boss]||'EG_'+boss;if(!setup().tables['33_ENCOUNTER_GROUP_DB'].has(group))continue;
 const map=api.fieldBosses.bosses[boss]?.map||{BOSS_DVALIN:'MAP_STORMTERROR_LAIR',BOSS_ANDRIUS:'MAP_WOLF_ARENA',BOSS_TARTAGLIA:'MAP_LIYUE_GOLDEN_HOUSE',BOSS_ISK_L03_GOLDEN:'MAP_LIYUE_GOLDEN_HOUSE',BOSS_AZHDAHA:'MAP_AZHDAHA_DOMAIN'}[boss];
 for(const team of ['basic','heal','bennett','five'])for(const offset of [0,5])for(const seed of SEEDS.slice(0,3)){const lv=Math.min(60,level+offset);rows.push({...battle({level:lv,team,enhance:lv<30?3:6,talent:'mid',formation:'DOUBLE_LINE'},{group,map},seed),boss});}
 console.log(JSON.stringify({boss,summary:Object.fromEntries(['basic','heal','bennett','five'].map(t=>[t,summarize(rows.filter(x=>x.boss===boss&&x.profile.team===t&&x.profile.level===level))]))}));
 }write('bosses',rows);}
function characters(){const rows=[],r=setup(),ids=[...api.wishV01411.pools.FOUR,...api.wishV01411.pools.STANDARD5,...api.wishV01411.pools.LIMITED5];
 for(const level of [10,30,60])for(const id of ids){const others=id==='MOND_AMBER'?['MOND_KAEYA','MOND_NOELLE']:id==='MOND_NOELLE'?['MOND_KAEYA','MOND_AMBER']:['MOND_AMBER','MOND_NOELLE'];const team=[...others,id];for(const seed of [717,4242])rows.push({...battle({level,team,enhance:3,talent:'mid'},{map:level<=30?'MAP_MOND_CITY':'MAP_LIYUE_HARBOR',domain:'GEAR:'+level},seed),tested:id});}write('characters',rows);}
function healing(){const rows=[];for(const level of [20,40,60])for(const team of ['attack','heal','bennett','shield','five'])for(const talent of [1,'mid','cap'])for(const seed of [717,4242]){rows.push(battle({level,team,talent,enhance:6},{map:level===20?'MAP_MOND_CITY':'MAP_LIYUE_MOUNTAINS',domain:'GEAR:'+level},seed));}write('healing',rows);}
function wish(){const template=fresh(),samples=[];for(let seed=1;seed<=500;seed++){const r=Object.create(template);r.s=cp(template.s);r.s.global.PRNG_STATE=(seed*2654435761)>>>0;r.s.global.SAVE_ID='AUDIT-WISH-'+seed;r.actionStartedAt=1791259200000+seed*1001;const got=[];for(let i=0;i<2;i++){const roll=r.wishRoll('STANDARD',10);r.s.wish=roll.state;for(const x of roll.results)if(x.kind==='char')got.push(x);}const ids=[...new Set(got.map(x=>x.id))];samples.push({seed,ids,unique:ids.length,five:got.filter(x=>x.rarity===5).length,healer:ids.some(x=>['MOND_BARBARA','MOND_BENNETT','MOND_DIONA','MOND_NOELLE','MOND_JEAN','LIYUE_QIQI','LIYUE_YAOYAO','MOND_MIKA'].includes(x)),liyueOnly:ids.length>0&&ids.every(x=>x.startsWith('LIYUE_'))});}write('wish',samples);console.log(JSON.stringify({uniqueHistogram:samples.reduce((n,s)=>(n[s.unique]=(n[s.unique]||0)+1,n),{}),healer:samples.filter(x=>x.healer).length,liyueOnly:samples.filter(x=>x.liyueOnly).length}));}
function parties(){const rows=[];for(const level of [5,10,20,30,40,60])for(const n of [0,1,2,3])for(const seed of [717,4242])rows.push(battle({level,team:TEAMS.basic.slice(0,n),gear:level<10?'starter':'craft',enhance:level<10?0:level<30?3:6,talent:'mid'},{map:level<=30?'MAP_MOND_CITY':'MAP_LIYUE_HARBOR',domain:'GEAR:'+level},seed));write('party-count',rows);}
function singles(){const template=fresh(),rows=[];for(let seed=1;seed<=500;seed++){const r=Object.create(template);r.s=cp(template.s);r.s.global.PRNG_STATE=(seed*2654435761)>>>0;r.s.global.SAVE_ID='AUDIT-WISH-'+seed;r.actionStartedAt=1791259200000+seed*1001;const ids=[];for(let i=0;i<20;i++){const x=r.wishRoll('STANDARD',1);r.s.wish=x.state;for(const c of x.results)if(c.kind==='char')ids.push(c.id);}rows.push({seed,ids:[...new Set(ids)]});}write('wish-singles',rows);console.log(JSON.stringify({noCharacter:rows.filter(x=>!x.ids.length).length,samples:rows.length}));}
function lootEligibility(){const rows=[];for(const [map,group,origin]of [['MAP_MOND_CITY',null,'DOMAIN'],['MAP_MOND_CITY',null,'DOMAIN_GEAR'],['MAP_MOND_PLAINS','EG_MOND_HILI_ELITE','ELITE:AUDIT'],['MAP_LIYUE_HARBOR',null,'DOMAIN_GEAR'],['MAP_LIYUE_PLAINS','EG_LIYUE_RUIN','RANDOM']]){const r=setup({level:30,map});if(!group)r.action('DOMAIN_START',{domain:(origin==='DOMAIN'?'TALENT:':'GEAR:')+30});else r.startBattle(group,origin);const b=r.s.runtime;for(const a of b.actors.filter(x=>x.side==='ENEMY')){const m=r.row('09_MONSTER_DB',a.source);for(const d of r.combatRows('20_LOOT_TABLE').filter(x=>x[0]===m[14]&&(!x[1]||x[1]===a.source||r.mondLootSourceMatches?.(b,a,x))))rows.push({map,group:b.group,origin:b.origin,monster:a.source,item:d[2],condition:d[6],chance:d[5],allowed:!b.storyConfig&&(['','없음','일반 슬라임 희귀 드랍','일반 슬라임 매우 희귀'].includes(d[6]||'')||r.mondLootConditionAllowed?.(b,a,d)||r.liyueLootConditionAllowed?.(b,a,d))});}}write('loot-eligibility',rows);}
const runners={static:statics,domains,fields,bosses,characters,healing,wish,parties,singles,loot:lootEligibility};
if(require.main===module){for(const s of process.argv.slice(2).length?process.argv.slice(2):['static','domains','wish']){if(!runners[s])throw Error(s);runners[s]();}}
module.exports={setup,observe,play,battle,summarize,write,flags,heal,TEAMS,SEEDS,OUT,G,api,PLAYER};


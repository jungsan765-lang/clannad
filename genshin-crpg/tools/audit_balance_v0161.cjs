'use strict';
// Actual native combat + shipped presentation frames. Synthetic ownership/gear is explicit.
// No monster HP edits, forced wins, speed skips, or VM CPU time as player time.
const {setup,observe,heal,G,api,PLAYER,TEAMS}=require('./audit_balance_v01522.cjs');
const {c,vm,fs,root}=require('../tests/helpers_v011.cjs');
const path=require('node:path');
const REFERENCE_TEAM=['MOND_AMBER','MOND_KAEYA','MOND_LISA'];
vm.runInContext(fs.readFileSync(path.join(root,'source/presentation.js'),'utf8'),c);
function policy(r){
 if(r.s.runtime&&r.combatOpening?.())r.action('COMBAT_BEGIN');
 for(let n=0;r.s.runtime&&n<400;n++){
  const b=r.s.runtime;
  if(b.liyueInterlude){r.action('LIYUE_INTERLUDE_ACK');continue;}
  if(b.interlude){r.action('STORY_NEXT',{node:r.storyActiveNodeId()});continue;}
  const cards=r.combatCards().filter(x=>!x.reason),enemies=b.actors.filter(a=>a.side==='ENEMY'&&a.hp>0);
  let card=cards.find(x=>x.id==='SYS_MOND_WIND_ROUTE');
  if(!card&&b.subduedPending)card=cards.find(x=>x.id===b.storyConfig?.orb_action?.id);
  if(!card)card=cards.find(x=>/PLAYER_(?:TRAVELER_ANEMO|ISEKAI)_Q$/.test(x.id));
  if(!card)card=cards.find(x=>x.id==='PLAYER_TRAVELER_ANEMO_E');
  if(!card&&enemies.some(a=>a.hp>a.maxHp*.8))card=cards.find(x=>x.id==='PLAYER_ISEKAI_E');
  if(!card)card=cards.find(x=>x.id==='PLAYER_BASIC_ATTACK')||cards.find(x=>x.id==='PLAYER_BASIC_GUARD');
  if(!card){r.autoUntilPlayer();continue;}
  const targets=card.targets||[],eligible=targets.map(t=>enemies.find(e=>e.id===t.id)||t).sort((a,b)=>(a.hp??Infinity)-(b.hp??Infinity));
  const t=eligible[0];r.action('COMBAT',{card:card.id,...(t?{target:t.id}:{}),...(card.id==='PLAYER_TRAVELER_ANEMO_E'?{branch:'HOLD'}:{})});
 }
 const b=r.s.runtime,x=b?{victory:false,stalled:true,rounds:b.round}:JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'{}'),end=r._auditLast||b;
 const allies=end?.actors.filter(a=>a.side==='ALLY')||[];
 return {...x,hpRatio:allies.reduce((n,a)=>n+Math.max(0,a.hp),0)/allies.reduce((n,a)=>n+a.maxHp,0),deaths:allies.filter(a=>a.hp<=0).length};
}
function measure({level,domain,element='NEUTRAL',route='ROUTE_TRAVELER',seed=717,team=REFERENCE_TEAM,group,map,kind,tier,gear,enhance,talent='mid',origin,constellations=0,earningXp=false,storyNode,storyLeaf,saveId}={}){
 const spec=domain&&api.growthV01522.domains[domain.split(':')[0]],r=setup({level,route,team,map:map||spec?.map,gear:gear||(level<10?'starter':'craft'),enhance:enhance??(level<10?0:level<30?3:6),talent,saveId});
 Object.assign(r.tutorialState().done,{combatAttack:true,combatGuard:true,combatSkill:true,combatBurst:true});
 if(earningXp){for(const id of [PLAYER,...(Array.isArray(team)?team:TEAMS[team])]){const g=r.growth(id);if(g.max&&!g.final)r.s.ascensions[id]=g.phase+1;const cap=r.growth(id).talentCap,t=talent==='cap'?cap:talent==='mid'?Math.max(1,Math.floor(cap*.65)):Number(talent)||1;r.s.talents[id]={na:Math.min(t,cap),e:Math.min(t,cap),q:Math.min(t,cap)};}r.recalculate();heal(r);}
 if(constellations)r.s.constellations=Object.fromEntries((Array.isArray(team)?team:TEAMS[team]).map(id=>[id,constellations]));
 if(storyNode){if(storyLeaf)r.s.flags.FLAG_ISK_L01_LEAF=storyLeaf;r.storySetCursor(storyNode);}
 r.s.global.PRNG_STATE=seed;r.s.domainDaily={day:G.dayOf(r.leyLineNow()),wins:3};
 observe(r);const action=r.action;let presentationMs=0,playerInputs=0;
 r.action=function(type,args){const before=c.CRPGPresentation.snapshot(this.s),out=action.call(this,type,args);
  for(const f of c.CRPGPresentation.actionFrames(c.CRPGPresentation.delta(before,this.s)))presentationMs+=f.kind==='action'?460+(f.attemptCount>1?520:650):1400;
  if(type==='COMBAT')playerInputs++;return out;
 };
 if(domain)r.action('DOMAIN_START',{domain,element});else if(kind){
  let hour=r.leyLineHour();while(!api.leyLines.sitesAt(hour).some(x=>x.map===map&&x.kind===kind))hour++;
  r.actionStartedAt=hour*3600000+60000;const id=api.leyLines.route(kind,map);
  r.action('PLACE_ENTER',{place:'BOSS:'+id,mode:'BOSS'});r.action('BOSS_ROUTE',{route:id,entry:'DIRECT',tier});
 }else r.startBattle(group,origin||(storyNode?'STORY:'+storyNode:/^(EG_BOSS_|EG_FB_|EG_ISK_)/.test(group)?'EXPLICIT':'RANDOM'),...(storyNode?[{confirmed:true,companions:Array.isArray(team)?team:TEAMS[team]}]:[]));
 const initial=r.s.runtime.actors.filter(a=>a.side==='ENEMY').map(a=>({source:a.source,grade:a.grade,level:a.level,hp:a.maxHp,atk:a.atk,def:a.def}));
 const initialAllies=r.s.runtime.actors.filter(a=>a.side==='ALLY').map(a=>({source:a.source,guest:!!a.coop,level:a.level,hp:a.maxHp,atk:a.atk,def:a.def}));
 const expectedRewards=r.mondRewardPlan(r.s.runtime),result=policy(r),end=r._auditLast||r.s.runtime;
 const deluge=storyNode?end.log.filter(x=>x.card==='OSIAL_DELUGE'&&(Object.hasOwn(x,'damage')||x.miss)).map(x=>({round:x.round,target:x.targetId,damage:x.damage??0,absorbed:x.absorbed??0,maxHp:x.maxHp,critical:!!x.critical,reaction:x.reaction,miss:!!x.miss})):undefined;
 // 2x label is internal rate 1. Inputs (3 s) and receipt/re-entry (6 s) are declared model assumptions.
 return {level,domain,element,route,seed,team,group,map:map||spec?.map,kind,tier,gear:gear||(level<10?'starter':'craft'),enhance:enhance??(level<10?0:level<30?3:6),talent,constellations,earningXp,storyNode,phases:Object.fromEntries([PLAYER,...(Array.isArray(team)?team:TEAMS[team])].map(id=>[id,r.growthPhase(id)])),initial,initialAllies,expectedRewards,result,objective:end?.objective||end?.liyueObjective,deluge,presentationMs,playerInputs,cycleSeconds:presentationMs/1000+3*playerInputs+6};
}
// Current EXP sites have a stage every five levels. Calibrate each actual stage.
function recommendedDomain(level){const ds=Object.entries(G.domains).filter(([,d])=>d.kind==='EXP').flatMap(([key,d])=>d.levels.filter(n=>n<=level+5).map(n=>({id:key+':'+n,level:n}))).sort((a,b)=>b.level-a.level);return ds[0].id;}

if(require.main===module){
 const out=process.env.CRPG_BALANCE_OUT||path.join(root,'evidence/v0161/balance-samples.json');fs.mkdirSync(path.dirname(out),{recursive:true});
 const modes=process.argv.filter(x=>['--rarity','--ceiling','--ley','--osial'].includes(x));if(modes.length>1)throw Error('Choose one audit mode');
 if(modes.length){
  const rows=[],mode=modes[0],teams={story4:REFERENCE_TEAM,support4:['MOND_FISCHL','LIYUE_XIANGLING','MOND_BARBARA'],standard5:['MOND_DILUC','MOND_MONA','MOND_JEAN'],limited5:['LIYUE_HUTAO','LIYUE_YELAN','LIYUE_ZHONGLI']};
  const save=()=>fs.writeFileSync(out,JSON.stringify({version:require('../package.json').version,mode,teams,timingAssumptions:{displaySpeed:2,inputSeconds:3,reentrySeconds:6},rows},null,2));
  const collect=(name,options,seeds=[717,4242,9031])=>{const batch=seeds.map(seed=>({name,...measure({...options,seed})}));rows.push(...batch);save();console.log(JSON.stringify({name,battle:options.domain||options.group||options.kind,map:options.map,level:options.level,route:options.route,tier:options.tier,wins:batch.filter(x=>x.result.victory).length,samples:batch.length,seconds:batch.reduce((n,x)=>n+x.cycleSeconds,0)/batch.length,rounds:batch.reduce((n,x)=>n+x.result.rounds,0)/batch.length}));};
  if(mode==='--osial')for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
   const storyNode=route==='ROUTE_TRAVELER'?'TRV_LY4_OSIAL_COMBAT':'ISK_L04_K1_040',group=route==='ROUTE_TRAVELER'?'EG_BOSS_OSIAL':'EG_ISK_L04_OSIAL';
   for(const [name,level,enhance,talent]of [['support4',55,6,'mid'],['support4',58,10,8],['support4',60,10,8],['story4',60,10,8],['standard5',60,10,8],['limited5',60,10,8]])collect(name,{route,storyNode,storyLeaf:'K1',group,map:'MAP_OSIAL_BATTLE',level,enhance,talent,team:teams[name]});
  }
  else if(mode==='--ley')for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI'])for(const tier of [1,2,3,4,5]){const level=api.leyLines.tiers[tier-1].minLevel;collect('domain',{route,level,domain:recommendedDomain(level)},[717]);for(const site of api.leyLines.sites)collect('ley',{route,level,map:site.map,kind:'REVELATION',tier},[717]);}
  else{
   const scenarios=mode==='--ceiling'?[{level:60,domain:'LIANSHAN_FORMULA:60'},{level:60,group:'EG_BOSS_TARTAGLIA',map:'MAP_LIYUE_GOLDEN_HOUSE'},{level:60,group:'EG_BOSS_AZHDAHA',map:'MAP_AZHDAHA_DOMAIN'}]:[
    ...[30,50,60].flatMap(level=>[{level,domain:recommendedDomain(level)},{level,domain:'TAISHAN_MANSION:'+level},{level,domain:'LIANSHAN_FORMULA:'+level}]),
    {level:50,group:'EG_BOSS_TARTAGLIA',map:'MAP_LIYUE_GOLDEN_HOUSE',enhance:10,talent:8},{level:60,group:'EG_BOSS_AZHDAHA',map:'MAP_AZHDAHA_DOMAIN',enhance:10,talent:8}];
   for(const scenario of scenarios)for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI'])for(const [name,team]of Object.entries(teams)){if(mode==='--ceiling'&&name==='story4')continue;collect(name,{...scenario,route,team,...(mode==='--ceiling'?{enhance:12,talent:10,constellations:6}:{})});}
  }
 }else{
 const rows=[],levels=process.argv.includes('--all-levels')?Array.from({length:59},(_,i)=>i+1):[1,4,5,9,10,14,15,19,20,24,25,29,30,34,35,39,40,44,45,49,50,54,55,59];
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI'])for(const level of levels){
  for(const seed of [717,4242,9031])rows.push(measure({level,domain:recommendedDomain(level),route,seed,earningXp:true}));
  fs.writeFileSync(out,JSON.stringify({version:require('../package.json').version,party:[PLAYER,...REFERENCE_TEAM],timingAssumptions:{displaySpeed:2,inputSeconds:3,reentrySeconds:6},rows},null,2));
  console.log(JSON.stringify({route,level,seconds:+(rows.slice(-3).reduce((n,x)=>n+x.cycleSeconds,0)/3).toFixed(2),wins:rows.slice(-3).filter(x=>x.result.victory).length}));
 }
 }
}
module.exports={measure,policy,recommendedDomain,REFERENCE_TEAM};

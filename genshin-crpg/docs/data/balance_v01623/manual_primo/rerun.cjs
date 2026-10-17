'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../../../..'),H=require(ROOT+'/tools/audit_protagonist_v01618.cjs'),env=H.load(ROOT),FB=env.api.fieldBosses,cp=x=>JSON.parse(JSON.stringify(x)),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const data={scope:'Two declared same-level48 GeoTraveler + Noelle/Barbara/Fischl C0 diagnostic fights using public protagonist actions only. Local QA DB, +6 crafted gear, 65% talent cap, no artifacts; ownership/story access/fullHP/funding granted. No enemy/action/roll/companion-control changes. One seed; not all-boss difficulty proof.',fingerprint:env.fingerprint,fieldBossSourceSHA256:hash(ROOT+'/source/runtime_field_bosses.js'),rawDbSHA256:hash(ROOT+'/content/db.json'),rows:[]};
for(const policy of ['NO_GEO_E','TIMED_GEO_E']){
 const r=H.setup(env,{level:48,route:'ROUTE_TRAVELER',team:['MOND_NOELLE','MOND_BARBARA','MOND_FISCHL'],seed:717,map:'MAP_LIYUE_PLAINS',enhance:6});
 r.action('PLACE_ENTER',{place:'EVT_CRPG_STATUE_GEO',mode:'TALK'});r.action('TRAVELER_RESONATE',{element:'GEO'});r.action('PLACE_LEAVE');
 r.s.global.CURRENT_MAP_ID=FB.bosses.FB_PRIMO_GEOVISHAP.map;
 const route=FB.route('FB_PRIMO_GEOVISHAP');r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT'});
 let last;const finish=r.finishBattle;r.finishBattle=function(victory){last={victory,round:this.s.runtime.round,actors:cp(this.s.runtime.actors),log:cp(this.s.runtime.log)};return finish.call(this,victory);};
 const initial=cp(r.s.runtime.actors.map(a=>({source:a.source,level:a.level,hp:a.hp,maxHp:a.maxHp,atk:a.atk,def:a.def,control:a.control})));r.action('COMBAT_BEGIN');const actions=[];
 for(let n=0;r.s.runtime&&n<50;n++){
  const b=r.s.runtime,boss=b.actors.find(a=>a.source==='FB_PRIMO_GEOVISHAP'),cards=r.combatCards().filter(c=>!c.reason);let card;
  if(policy==='TIMED_GEO_E'&&b.fieldBoss.telegraph?.move==='BEAM')card=cards.find(c=>c.id==='PLAYER_TRAVELER_GEO_E');
  if(policy==='TIMED_GEO_E'&&boss.fb.beamReflected&&boss.fb.exposedUntil>=b.round)card??=cards.find(c=>c.id==='PLAYER_TRAVELER_GEO_Q')||cards.find(c=>c.id==='PLAYER_TRAVELER_GEO_E');
  if(policy==='NO_GEO_E')card??=cards.find(c=>c.id==='PLAYER_TRAVELER_GEO_Q');
  card??=cards.find(c=>c.id==='PLAYER_BASIC_ATTACK')||cards.find(c=>c.id==='PLAYER_BASIC_GUARD');assert(card,'Legal action needed');
  const args={card:card.id,...(card.targets.find(t=>t.id===boss.id)?{target:boss.id}:{})};actions.push({round:b.round,telegraph:b.fieldBoss.telegraph?.move||null,shieldCount:b.actors.filter(a=>a.side==='ALLY'&&a.hp>0&&a.shields.some(s=>s.value>0)).length,exposedUntil:boss.fb.exposedUntil,args:cp(args)});r.action('COMBAT',args);
 }
 const b=r.s.runtime,trace=last?.log||b.log,actors=last?.actors||b.actors;
 const row={policy,initial,state:b?'INPUT_LIMIT':last.victory?'WIN':'DEFEAT',round:last?.round||b.round,actions,reflections:trace.filter(x=>x.card==='FB_BEAM_REFLECT'),beamPreparations:trace.filter(x=>x.card==='FB_BEAM_READY'),geoE:trace.filter(x=>x.card==='PLAYER_TRAVELER_GEO_E'),party:actors.filter(a=>a.side==='ALLY').map(a=>({source:a.source,hp:a.hp,maxHp:a.maxHp,control:a.control})),boss:actors.find(a=>a.source==='FB_PRIMO_GEOVISHAP'),log:trace};data.rows.push(row);console.log(JSON.stringify({policy,state:row.state,round:row.round,reflections:row.reflections.length,geoE:row.geoE.length,inputs:actions.length,bossHp:row.boss.hp}));
}
assert.equal(data.fieldBossSourceSHA256,hash(ROOT+'/source/runtime_field_bosses.js'));assert.equal(data.rawDbSHA256,hash(ROOT+'/content/db.json'));
fs.writeFileSync(process.argv[2]||path.join(__dirname,'v01623-primo-public-probe.json'),JSON.stringify(data,null,2)+'\n');

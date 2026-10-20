'use strict';
// Native encounters, legal equipment and public inputs. Party ownership/levels/gear
// are fixtures; no actor range, airborne state, AI, dice or enemy stats are replaced.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const H=require('../tools/audit_protagonist_v01618.cjs');
const arg=k=>{const i=process.argv.indexOf(k);return i<0?undefined:process.argv[i+1];};
const root=path.resolve(arg('--root')||path.join(__dirname,'..')),env=H.load(root),checks=[];
function test(name,fn){try{checks.push({name,ok:true,evidence:fn()});console.log('PASS '+name);}catch(e){checks.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
function fixture(weapon,{air=false,ground=false}={}){
 const boss='FB_ANEMO_HYPOSTASIS',r=H.setup(env,{level:18,team:['MOND_AMBER','MOND_FISCHL','MOND_BARBARA'],route:'ROUTE_ISEKAI',map:ground?'MAP_MOND_PLAINS':env.api.fieldBosses.bosses[boss].map,enhance:3,talent:2,seed:717});
 const slot=r.giveEquipment(weapon);r.action('EQUIP',{slot,owner:'PLAYER_CUSTOM'});
 const equipment=r.s.inventory.find(x=>x.slot===slot);equipment.enhance=3;r.recalculate();
 if(ground)r.startBattle('EG_MOND_HILI_PATROL','RANDOM');
 else {const route=env.api.fieldBosses.route(boss);r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT'});}
 r.action('COMBAT_BEGIN');
 if(air){for(let n=0;n<12&&r.s.runtime&&!r.s.runtime.actors.some(x=>x.side==='ENEMY'&&x.airborne);n++)r.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});assert(r.s.runtime,'native fight still active');assert(r.s.runtime.actors.some(x=>x.side==='ENEMY'&&x.airborne),'native rise creates airborne target');}
 assert.equal(r.s.runtime.phase,'WAIT_PLAYER');return r;
}
function execute(r,id,{target}={}){
 const b=r.s.runtime,a=r.combatActor(),card=r.combatCards().find(c=>c.id===id);assert(card,'card exists');assert.equal(card.reason,'','card available');
 target??=card.targets.find(t=>b.actors.some(x=>x.id===t.id&&x.side==='ENEMY'&&x.hp>0));assert(target,'advertised enemy target');
 const round=b.round,sequence=b.actionSequence,result=r.action('COMBAT',{card:id,target:target.id});assert.equal(result.ok,true);
 assert(result.result.events.some(x=>x.actorId===a.id&&x.card===id),'native execution logs selected card');
 const packet=result.result.events.find(x=>x.actorId===a.id&&x.targetId===target.id&&(Object.hasOwn(x,'damage')||x.miss));
 if(id==='PLAYER_BASIC_ATTACK')assert(packet,'basic attack produces a native hit or miss attempt');
 return {actorRange:a.range,cardRange:r.actorCards(a).find(c=>c.id===id).range,target:target.id,round,sequence,packet:packet?{damage:packet.damage??0,miss:!!packet.miss,hpBefore:packet.hpBefore,hpAfter:packet.hpAfter}:null,finished:result.result.finished,roundAfter:result.result.round};
}

test('Bow basic attack reaches its publicly advertised airborne target',()=>{
 const r=fixture('EQ_BOW_CRESCENT',{air:true}),a=r.combatActor();assert.equal(a.range,'원거리');assert.equal(r.actorCards(a).find(c=>c.id==='PLAYER_BASIC_ATTACK').range,'근접');
 const evidence=execute(r,'PLAYER_BASIC_ATTACK');assert.equal(evidence.target,'FB_ANEMO_HYPOSTASIS#1');return evidence;
});
test('Melee basic attack still rejects an airborne target without consuming the turn',()=>{
 const r=fixture('EQ_SWORD_RANCOUR',{air:true}),a=r.combatActor(),t=r.s.runtime.actors.find(x=>x.side==='ENEMY'&&x.airborne),card=r.combatCards().find(c=>c.id==='PLAYER_BASIC_ATTACK');
 assert.equal(a.range,'근접');assert(!card.targets.some(x=>x.id===t.id),'air target excluded from public basic targets');const before=r.serialize();
 assert.throws(()=>r.action('COMBAT',{card:card.id,target:t.id}),e=>e.code==='TARGET'||e.code==='CARD');assert.equal(r.serialize(),before,'failed public input rolls back state/PRNG');
 return{actorRange:a.range,airborne:true,targets:card.targets.map(x=>x.id),unchanged:true};
});
for(const weapon of ['EQ_BOW_CRESCENT','EQ_SWORD_RANCOUR'])test(weapon+' ground basic attack remains executable',()=>execute(fixture(weapon,{ground:true}),'PLAYER_BASIC_ATTACK'));
test('A nonbasic whole-field skill retains its card range for a melee actor',()=>{
 const r=fixture('EQ_SWORD_RANCOUR',{air:true}),a=r.combatActor(),c=r.actorCards(a).find(c=>c.id==='PLAYER_ISEKAI_E');assert.equal(a.range,'근접');assert.equal(c.range,'전장');
 const evidence=execute(r,c.id);assert(r.s.runtime.actors.find(x=>x.id===evidence.target).statuses.some(x=>x.id==='STATUS_ISEKAI_EXPOSED'),'native whole-field skill effect reaches airborne target');return evidence;
});

const report={root,fingerprint:env.fingerprint,sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'source/runtime_combat.js'))).digest('hex'),dbSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'content/db.json'))).digest('hex'),assumptions:'Native fixed four-person opening and public boss entry/guards/COMBAT; fixture ownership, equal Lv18 legal growth and craft+3 only. No altered actor range/airborne/AI/rolls/enemy stats.',checks,total:checks.length,passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length};
if(arg('--out')||process.argv[2]&&!process.argv[2].startsWith('--')){const out=path.resolve(arg('--out')||process.argv[2]);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}

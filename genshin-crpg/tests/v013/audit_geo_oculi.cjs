const assert=require('assert/strict'),h=require('../helpers_v011.cjs'),{fresh,R,db,c,advance}=h,fs=require('fs');let r=fresh('MAP_LIYUE_HARBOR');r.s.flags.FLAG_ACCESS_REGION_LIYUE=true;r.s.flags.FLAG_TRV_MON_CH2_CLEAR=true;r.s.global.MORA=10000;while(r.s.global.PLAYER_LEVEL_STATE<6)r.addXp('PLAYER_CUSTOM',r.growth().remaining);r.die=()=>100;const points=c.CRPGWorldContent.geoOculi,report={points:[],moves:[],buys:[]};
const cp=x=>JSON.parse(JSON.stringify(x));function noEnc(){r.die=()=>100;r.s.global.ENCOUNTER_COOLDOWN=1;}
function move(target){if(r.s.placeVisit)r.action('PLACE_LEAVE');const start=r.s.global.CURRENT_MAP_ID,q=[[start,[]]],seen=new Set([start]);let path;while(q.length){const [map,route]=q.shift();if(map===target){path=route;break;}for(const edge of r.rows('47_MAP_EDGE_DB').filter(e=>e[1]===map&&e[8]==='Y'&&e[11]==='ACTIVE')){const f=Object.create(r);f.s={...r.s,global:{...r.s.global,CURRENT_MAP_ID:map}};if(f.edgeReason(edge)||seen.has(edge[2]))continue;seen.add(edge[2]);q.push([edge[2],[...route,edge[0]]]);}}assert(path,'No reachable path '+start+' → '+target);for(const edge of path){noEnc();r.action('MOVE',{edge});report.moves.push(edge);}}
function buy(place,stock,quantity){r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place});const before=r.s.global.MORA;r.action('BUY',{stock,quantity});report.buys.push({stock,quantity,cost:before-r.s.global.MORA});r.action('PLACE_LEAVE');}
try{
 for(const [stock,quantity]of [['STK_CRPG_LIYUE_TRPG_ROPE',1],['STK_CRPG_LIYUE_TRPG_TORCH',1],['STK_LIYUE_TOOL_001',1],['STK_LIYUE_FOOD_001',4],['STK_LIYUE_FOOD_002',2]])buy('EVT_SCHEDULE_MRC_LIYUE_GENERAL',stock,quantity);
 buy('EVT_SCHEDULE_MRC_LIYUE_EQUIP','STK_LIYUE_MAT_001',3);
 move('MAP_MOND_CITY');buy('EVT_SCHEDULE_MRC_MOND_EQUIP','STK_CRPG_V011_MOND_EQUIP_ORE_IRON',4);r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE'});r.action('COMMISSION_ACCEPT',{quest:'Q_LIYUE_EXP_PLAINS_CARAVAN'});r.action('PLACE_LEAVE');
 move('MAP_LIYUE_PLAINS');r.action('QUEST_CHOICE',{quest:'Q_LIYUE_EXP_PLAINS_CARAVAN',choice:'careful'});r.action('CLAIM_QUEST',{quest:'Q_LIYUE_EXP_PLAINS_CARAVAN'});
 // One real visit satisfies the character alternative without granting any characters.
 move('MAP_CRPG_LIYUE_BANK');
 for(const p of points){const out={id:p.id,map:p.map};report.points.push(out);try{move(p.map);r.s.global.WORLD_TIME=p.requirements.timeWindow?'20:00':'12:00';if(p.place)r.action('PLACE_ENTER',{place:p.place});assert.equal(r.worldRequirement(p),'');
 for(let n=0;n<p.steps.length+1&&!r.s.geoOculi.receipts[p.id];n++){
 const step=r.oculusStep(p.id),before=r.itemCount('KEY_CRPG_GEOCULUS');assert(step);const args={kind:'OCULUS',point:p.id,...(step.options?{answer:step.answer}:{}),...(step.sequence?{sequence:step.sequence}:{})};r.action('WORLD_WORK_START',args);
 if(r.s.worldJob){const j=cp(r.s.worldJob);let early;try{r.action('WORLD_WORK_FINISH',{job:j.id});}catch(e){early=e;}assert(early,'early timed finish rejected');r=new R(db,JSON.parse(r.serialize()));advance(j.duration);r.action('WORLD_WORK_FINISH',{job:j.id});}
 if(r.s.runtime){const battleId=r.s.runtime.id,origin=r.s.runtime.origin;r=new R(db,JSON.parse(r.serialize()));assert.equal(r.s.runtime.id,battleId);r.action('COMBAT_BEGIN',{battle:battleId});if(r.s.runtime){r.finishBattle(true);r.action('MENU',{screen:'LOCATION'});}out.simulatedVictory=origin;}
 assert(r.itemCount('KEY_CRPG_GEOCULUS')===before||r.itemCount('KEY_CRPG_GEOCULUS')===before+1);r=new R(db,JSON.parse(r.serialize()));
 }
 assert(r.s.geoOculi.receipts[p.id]);const before=r.serialize();assert.throws(()=>r.action('WORLD_WORK_START',{kind:'OCULUS',point:p.id}));assert.equal(r.serialize(),before);out.ok=true;out.total=r.itemCount('KEY_CRPG_GEOCULUS');console.log('PASS '+p.id);
 }catch(e){out.error={message:e.message,code:e.code,stack:e.stack};console.log('FAIL '+p.id+' '+e.message);continue;}}
 report.summary=r.geoOculusSummary();report.finalOfferReason=r.geoOfferReason('GEO_TIER_1');fs.writeFileSync('/tmp/audit_geo_oculi_final_save.json',r.serialize());
}catch(e){report.setupError={message:e.message,code:e.code,stack:e.stack};console.log('SETUP FAIL '+e.message);}
fs.writeFileSync('/tmp/audit_geo_oculi_results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.points.filter(p=>p.ok).length,total:points.length,summary:report.summary,setup:report.setupError?.message}));

if(report.setupError||report.points.filter(p=>p.ok).length!==points.length)process.exitCode=1;

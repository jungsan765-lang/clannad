'use strict';
const reviewOutputDir=process.env.CRPG_AUDIT_OUT||require('node:path').join(require('node:os').tmpdir(),'crpg-reaction-healer-review','chasm_gap');require('node:fs').mkdirSync(reviewOutputDir,{recursive:true});
const fs=require('fs'),path=require('path');const {env,cp}=require('../dendro/probe.cjs'),E=env(),H=require('../helpers/audit_protagonist_v01618.cjs');
const out={fingerprint:E.fingerprint,notes:'Read-only public action witnesses. Initial declared ownership/free-journey flags only. Natural seed search selects encounter illustrations, not unbiased win-rate samples.',moves:[],talents:[],seeds:[],firstByTemplate:{}};
for(const [map,edge] of [['MAP_LY_DETAIL_LINGJU','EDGE_LY_DETAIL_036_A'],['MAP_LY_DETAIL_CHASM_GATE','EDGE_LY_DETAIL_037_A'],['MAP_LY_DETAIL_CHASM_RIM','EDGE_LY_DETAIL_038_A'],['MAP_CHASM_SURFACE','EDGE_CHASM_SURFACE_TO_DEEP']]){
 const r=H.setup(E,{level:25,map,team:['MOND_DILUC','LIYUE_GANYU','MOND_JEAN'],route:'ROUTE_TRAVELER',gear:'craft',enhance:3,talent:2,seed:717});
 try{const reason=r.actionReason('MOVE',{edge});const result=r.action('MOVE',{edge});out.moves.push({map,edge,reason,result:cp(result),destination:r.s.global.CURRENT_MAP_ID,destinationLevel:r.row('32_MAP_DB',r.s.global.CURRENT_MAP_ID)[6],startedCombat:!!r.s.runtime});}catch(e){out.moves.push({map,edge,code:e.code,message:e.message});}
}
for(const t of [2,4]){const r=H.setup(E,{level:25,map:'MAP_CHASM_DEEP',team:['MOND_DILUC','LIYUE_GANYU','MOND_JEAN'],route:'ROUTE_TRAVELER',gear:'craft',enhance:3,talent:t,seed:717});r.s.constellations={PLAYER_CUSTOM:3,MOND_DILUC:2,LIYUE_GANYU:0,MOND_JEAN:2};out.talents.push({base:t,actors:['PLAYER_CUSTOM','MOND_DILUC','LIYUE_GANYU','MOND_JEAN'].map(id=>({id,cons:r.constellationLevel(id),growth:r.growth(id),levels:r.talentLevels(id),eMultiplier:r.premiumTalentMultiplier(id,'e')}))});}
for(let seed=1;seed<=100;seed++){
 const r=H.setup(E,{level:25,map:'MAP_CHASM_DEEP',team:['MOND_DILUC','LIYUE_GANYU','MOND_JEAN'],route:'ROUTE_TRAVELER',gear:'craft',enhance:3,talent:2,seed});let waits=0;
 while(!r.s.runtime&&waits<2000){r.action('WAIT',{minutes:60});waits++;}
 if(!r.s.runtime){out.seeds.push({seed,waits,none:true});continue;}
 const b=r.s.runtime,entry=r.liyueAreaThreat('MAP_CHASM_DEEP').entries.find(x=>x.group===b.group),enemies=cp(b.actors.filter(a=>a.side==='ENEMY').map(a=>({source:a.source,level:a.level,hp:a.hp,maxHp:a.maxHp,atk:a.atk,def:a.def,variant:a.variant}))),row={seed,waits,group:b.group,template:entry?.template,enemies};out.seeds.push(row);out.firstByTemplate[row.template]??=row;
 if(enemies.length===2&&enemies[0]?.source==='MON_HUSK_STANDARD')out.twoHusks??=row;
 if(enemies.length===2&&enemies[0]?.source==='MON_HUSK_STANDARD'&&enemies[0].maxHp===70569)out.rareTwoHusks??=row;
 if(enemies.length===2&&enemies[0]?.source==='MON_HUSK_STANDARD'&&enemies[0].maxHp===70569&&enemies[0].variant?.affixes.includes('SWIFT')&&enemies[0].variant?.affixes.includes('CORROSIVE'))out.exactAffixTwoHusks??=row;
 if(Object.keys(out.firstByTemplate).length>=4&&out.rareTwoHusks)break;
 fs.writeFileSync(require('node:path').join(reviewOutputDir,'routes_and_seeds.json'),JSON.stringify(out,null,2));
}
fs.writeFileSync(require('node:path').join(reviewOutputDir,'routes_and_seeds.json'),JSON.stringify(out,null,2));console.log(JSON.stringify({moves:out.moves,found:Object.fromEntries(Object.entries(out.firstByTemplate).map(([k,r])=>[k,r.seed])),two:out.twoHusks?.seed,rare:out.rareTwoHusks?.seed,exact:out.exactAffixTwoHusks?.seed,searched:out.seeds.length},null,2));

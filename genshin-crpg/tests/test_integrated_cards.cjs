'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),vm=require('vm'),path=require('path'),base=path.resolve(__dirname,'..');
const ctx=vm.createContext({console});
for(const file of ['source/runtime.js','source/runtime_extensions.js','source/runtime_story.js','source/runtime_nodes.js','source/runtime_events.js','source/runtime_combat.js','source/runtime_mond_cards.js','source/runtime_economy.js','source/runtime_passives.js']) vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),ctx,{filename:file});
const db=JSON.parse(fs.readFileSync(path.join(base,'content/db.json'))),R=ctx.CRPGRuntime.Runtime;
const r=new R(db);r.newGame({name:'확장 연동 검증',route:'ROUTE_TRAVELER',seed:972441,saveId:'INTEGRATED-CARDS'});
Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'HUB',STORY_CURSOR_NODE_ID:'HUB',SCREEN_MODE:'LOCATION',CURRENT_MAP_ID:'MAP_STORMTERROR_LAIR',PLAYER_BASE_HP:100000});r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;
r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify({MOND_EULA:{state:'JOINED'},MOND_ROSARIA:{state:'JOINED'}});
for(const [i,id] of ['MOND_EULA','MOND_ROSARIA'].entries()){r.s.chars[id].level=20;r.s.chars[id].hp=r.character(id).maxHp;r.action('PARTY',{char:id,slot:i+2});}
r.giveItem('TRPG_TACTICAL_LEVITATOR',1);r.action('TOOL_PREPARE',{items:['TRPG_TACTICAL_LEVITATOR']});r.action('BOSS_ROUTE',{route:'BRT_DVALIN',entry:'DIRECT'});r.action('COMBAT',{card:'TOOL:TRPG_TACTICAL_LEVITATOR'});
for(const id of ['MOND_EULA_Q','MOND_ROSARIA_Q']) assert(r.s.runtime.log.some(e=>e.card===id),id+' must execute through actual allied AI');
const resumed=new R(db,JSON.parse(r.serialize()));
for(let i=0;i<3&&r.s.runtime;i++){assert.equal(JSON.stringify(r.action('COMBAT',{card:'PLAYER_BASIC_GUARD'})),JSON.stringify(resumed.action('COMBAT',{card:'PLAYER_BASIC_GUARD'})));assert.equal(r.serialize(),resumed.serialize());}
console.log(JSON.stringify({ok:true,publicActions:['PARTY','TOOL_PREPARE','BOSS_ROUTE','COMBAT'],aiCards:['MOND_EULA_Q','MOND_ROSARIA_Q'],identicalResume:true,loadOrder:'all nine modules'},null,2));

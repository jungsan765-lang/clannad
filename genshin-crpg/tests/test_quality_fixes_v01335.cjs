'use strict';
const assert=require('node:assert/strict'),h=require('./helpers_v011.cjs'),{fresh,R,db}=h,fs=h.fs,path=h.path,results=[];
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
function guild(r){r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});}
test('field commission puzzle lives on location and reward requires Katheryne',()=>{
 const r=fresh();guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_MOND_EXP_PLAINS_CART'});r.action('PLACE_LEAVE');r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';
 const entry=r.commissionFieldEntries().find(q=>q.row[0]==='Q_MOND_EXP_PLAINS_CART');assert(entry?.puzzle);const before=r.s.global.WORLD_TIME;
 let out=r.action('COMMISSION_PUZZLE',{quest:'Q_MOND_EXP_PLAINS_CART',answer:1}).result;assert.equal(out.correct,false);assert.equal(r.s.quests.Q_MOND_EXP_PLAINS_CART.node,'INVESTIGATE');assert.notEqual(r.s.global.WORLD_TIME,before);
 out=r.action('COMMISSION_PUZZLE',{quest:'Q_MOND_EXP_PLAINS_CART',answer:0}).result;assert.equal(out.correct,true);assert.equal(r.s.quests.Q_MOND_EXP_PLAINS_CART.node,'READY_TO_CLAIM');
 const snapshot=r.serialize();assert.throws(()=>r.action('CLAIM_QUEST',{quest:'Q_MOND_EXP_PLAINS_CART'}),e=>/몬드의 캐서린/.test(e.message));assert.equal(r.serialize(),snapshot);
 guild(r);const mora=r.s.global.MORA;r.action('CLAIM_QUEST',{quest:'Q_MOND_EXP_PLAINS_CART'});assert(r.s.global.MORA>mora);assert.equal(r.s.global.SCREEN_MODE,'DIALOGUE');assert(r.currentPlace()?.valid);assert.equal(r.currentPlace()?.entity,'NPC_MOND_KATHERYNE');
});
test('field quest view includes all accepted exploration objectives at their actual map',()=>{
 const r=fresh();r.s.global.PLAYER_LEVEL_STATE=2;r.s.global.PLAYER_XP_STATE=0;r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_MOND_EXP_FOREST_CACHE'});r.action('PLACE_LEAVE');r.s.global.CURRENT_MAP_ID='MAP_MOND_FOREST';const q=r.commissionFieldEntries().find(q=>q.row[0]==='Q_MOND_EXP_FOREST_CACHE');assert(q);assert(q.puzzle);assert.match(q.puzzle.prompt,/보관함/);
});
test('Barbara legend output has full clinic scene instead of terse summary',()=>{
 const r=fresh('MAP_MOND_CITY');const row=r.storyIndex().nodes.get('ROUTE_TRAVELER:LEG_MOND_BARBARA_N022');assert(row);assert.match(r.storyDisplayText(row),/노래를 시작했는데/);assert.match(r.storyDisplayText(row),/웃는 얼굴/);
});
test('Eula legend restores the vengeance mannerism repeatedly',()=>{
 const r=fresh('MAP_MOND_CITY');for(const id of ['LEG_MOND_EULA_N003','LEG_MOND_EULA_N021','LEG_MOND_EULA_N026']){const row=r.storyIndex().nodes.get('ROUTE_TRAVELER:'+id);assert(row,id);assert.match(r.storyDisplayText(row),/원한/);}
 assert.match(r.storyDisplayText(r.storyIndex().nodes.get('ROUTE_TRAVELER:LEG_MOND_EULA_N026')),/기억해두겠어/);
});
test('regional report gate does not accept a Mond commission at Liyue Katheryne',()=>{const r=fresh();guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_MOND_EXP_PLAINS_CART'});r.action('PLACE_LEAVE');r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';r.action('COMMISSION_PUZZLE',{quest:'Q_MOND_EXP_PLAINS_CART',answer:0});r.s.global.CURRENT_MAP_ID='MAP_LIYUE_HARBOR';r.action('PLACE_ENTER',{place:'EVT_CRPG_LIYUE_GUILD',mode:'TALK'});assert.match(r.actionReason('CLAIM_QUEST',{quest:'Q_MOND_EXP_PLAINS_CART'}),/몬드의 캐서린/);});
test('UI routes field actions to main screen and reports at Katheryne',()=>{
 const src=fs.readFileSync(path.join(h.root,'source/app_quality_fixes.js'),'utf8');for(const s of ['현재 장소의 의뢰','임무 목록에서는 진행 상황만 확인','캐서린에게 보고','COMMISSION_PUZZLE'])assert(src.includes(s),s);
});
fs.writeFileSync(path.join(h.root,'reports/quality-fixes-v01335.json'),JSON.stringify({total:results.length,passed:results.filter(x=>x.ok).length,results},null,2));if(results.some(x=>!x.ok))process.exitCode=1;

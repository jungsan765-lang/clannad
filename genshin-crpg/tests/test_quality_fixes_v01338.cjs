'use strict';
const assert=require('node:assert/strict'),h=require('./helpers_v011.cjs'),{fresh,R,db}=h,results=[];
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
function prepHarbor(r){
 const l=r.ensureLiyue();l.activeQuest='Q_ISK_LIYUE_01';l.accepts.Q_ISK_LIYUE_01={saveId:r.s.global.SAVE_ID,route:r.s.global.STORY_ROUTE_ID,entry:'TEST',leaf:'NONE',parent:'B',day:r.s.global.WORLD_DAY,turn:r.s.global.TURN};
 r.s.global.CURRENT_MAP_ID='MAP_LIYUE_HARBOR';r.s.global.WORLD_TIME='12:00';r.s.global.STORY_WAITING=true;r.s.global.STORY_MENU_POLICY='';delete r.s.storyContext;delete r.s.storyJourney;delete r.s.storyBreak;
}
test('Liyue Harbor facilities unlock after first story arrival but side stories stay gated',()=>{
 const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');prepHarbor(r);
 const before=r.actionReason('PLACE_ENTER',{place:'EVT_CRPG_LIYUE_GUILD',mode:'TALK'});assert.match(before,/허가된 본편 구역/);
 r.noteLiyueHarborAccess('TEST_ARRIVAL');
 assert.equal(r.liyueHarborFacilitiesOpen(),true);
 const after=r.actionReason('PLACE_ENTER',{place:'EVT_CRPG_LIYUE_GUILD',mode:'TALK'});assert.equal(after,'');
 const legend=r.storyEntries().find(e=>e.kind==='LEGEND'&&e.definition?.REGION==='리월'&&e.definition?.CHAR_ID!=='LIYUE_ZHONGLI');assert(legend);
 assert.notEqual(r.actionReason('LEGEND_REGISTER',{quest:legend.id}),'');
});
test('once Harbor was reached, normal return edges into Harbor are no longer story-blocked',()=>{
 const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');prepHarbor(r);r.noteLiyueHarborAccess('TEST_ARRIVAL');
 r.s.global.CURRENT_MAP_ID='MAP_LIYUE_PLAINS';
 const edge=r.row('47_MAP_EDGE_DB','EDGE_LIYUE_PLAINS_TO_HARBOR');assert.equal(r.edgeReason(edge),'');
});
test('old save already standing in Harbor receives the facility access receipt on load',()=>{
 const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');prepHarbor(r);delete r.s.liyue.harborAccessReceipt;
 const loaded=new R(db,JSON.parse(JSON.stringify(r.s)));
 assert.equal(loaded.liyueHarborFacilitiesOpen(),true);
 assert.equal(loaded.s.liyue.harborAccessReceipt.source,'SAVE_MIGRATION');
});
require('fs').writeFileSync(require('path').join(__dirname,'../reports/quality-fixes-v01338.json'),JSON.stringify({total:results.length,passed:results.filter(x=>x.ok).length,results},null,2));
if(results.some(x=>!x.ok))process.exitCode=1;

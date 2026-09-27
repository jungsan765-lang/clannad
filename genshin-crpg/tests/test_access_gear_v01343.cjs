'use strict';
const assert=require('node:assert/strict'),{fresh,R,db}=require('./helpers_v011.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
let r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');
const equipment=['EQ_BOW_SLINGSHOT','EQ_SWORD_HARBINGER','EQ_CLAYMORE_DEBATE','EQ_POLEARM_BLACK_TASSEL','EQ_CATALYST_TTDS','EQ_ARMOR_TRAVEL_COAT'];
for(const id of equipment){
 const slot=r.giveEquipment(id),before=r.serialize(),sourceNodes=JSON.stringify(r.db['57_MOND_STORY_SCENE_DB']);
 const preview=r.equipmentPreview(slot,'PLAYER_CUSTOM');assert.equal(preview.reason,'',id);assert(preview.after.atk>0,id);
 assert.equal(r.serialize(),before,'preview cannot consume resources or mutate the save');assert.equal(JSON.stringify(r.db['57_MOND_STORY_SCENE_DB']),sourceNodes);
 r.action('EQUIP',{slot,owner:'PLAYER_CUSTOM'});assert.equal(r.player().atk,preview.after.atk);assert.equal(r.player().maxHp,preview.after.maxHp);
 r=new R(db,JSON.parse(r.serialize()));assert(r.s.inventory.find(i=>i.slot===slot).equipped,id);
}
console.log('PASS six early weapons/armor: pure comparison, actual equip stats, autosave reload');
// Previews and store comparisons re-use expanded content, not only the raw DB.
let expanded=r.db,save=JSON.parse(r.serialize()),count=expanded['57_MOND_STORY_SCENE_DB'].length;
for(let n=0;n<3;n++){const clone=new R(expanded,save);clone.storyIndex();assert.equal(clone.db['57_MOND_STORY_SCENE_DB'].length,count);expanded=clone.db;}
assert.equal(r.shopEquipmentPreview('EQ_BOW_SLINGSHOT','PLAYER_CUSTOM').reason,'');
for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
 r=fresh('MAP_MOND_CITY',route);r.unlockCharacter('MOND_AMBER');r.action('PARTY',{char:'MOND_AMBER',slot:2});const slot=r.giveEquipment('EQ_BOW_SLINGSHOT');
 const preview=r.equipmentPreview(slot,'MOND_AMBER');assert.equal(preview.reason,'');r.action('EQUIP',{slot,owner:'MOND_AMBER'});assert.equal(r.character('MOND_AMBER').atk,preview.after.atk);
 if(route==='ROUTE_TRAVELER'){assert.equal(r.equipmentPreview(slot,'PLAYER_CUSTOM').code,'PROFICIENCY');assert.throws(()=>r.action('EQUIP',{slot,owner:'PLAYER_CUSTOM'}));}
}
console.log('PASS expanded DB reconstruction, shop comparison, Amber and route weapon restrictions');
r=fresh();r.localTest=true;r.s.operatorModified=true;r.s.serverAdmin=true;
assert.match(r.actionReason('OPERATOR_DEBUG'),/권한/);assert.throws(()=>r.action('OPERATOR_DEBUG',{op:'mora',value:999999}));assert.throws(()=>r.apply({type:'OPERATOR_DEBUG',op:'heal'}));
let restored=new R(db,copy(r.s));assert.throws(()=>restored.action('OPERATOR_DEBUG',{op:'heal'}));
restored.serverAdmin=true;restored.action('OPERATOR_DEBUG',{op:'mora',value:4567});assert.equal(restored.s.global.MORA,4567);
restored=new R(db,JSON.parse(restored.serialize()));assert.throws(()=>restored.action('OPERATOR_DEBUG',{op:'heal'}));
console.log('PASS legacy local test/save flags cannot grant operator access; trusted admin is not serialized');

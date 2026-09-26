'use strict';
const assert=require('node:assert/strict'),{c,db,R,fresh,fs,root}=require('./helpers_v011.cjs');
c.CRPGRelationships.install(c.CRPGRuntime,{events:c.CRPGRelationships.catalogFromDB(db),activities:c.CRPGRelationships.activitiesFromDB(db),preferences:{adultModeEnabled:false}});
const results=[];function test(name,fn){try{fn();results.push({name,pass:true});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:e.stack});console.error('FAIL',name,e);process.exitCode=1;}}
const cp=x=>JSON.parse(JSON.stringify(x));
function restore(r){return new R(db,JSON.parse(r.serialize()));}
function finish(r){for(let n=0;n<160&&r.s.storyContext;n++){
 if(r.s.storyJourney){const target=r.s.storyJourney.target;if(r.s.global.CURRENT_MAP_ID===target)r.action('JOURNEY_RESUME');else{const e=r.navigationRoute(target)?.edges[0];assert(e,'route to '+target);r.action('MOVE',{edge:e[0]});}continue;}
 const choices=r.storyChoices();if(choices.length)r.action('STORY_CHOICE',{node:choices[0][4]});else r.action('STORY_NEXT',{node:r.storyNode()[4]});
 }assert(!r.s.storyContext,'story returned');return r;}
function field(mission='reed',stage=1,seed=12){const r=fresh('MAP_LY_DETAIL_DIHUA','ROUTE_ISEKAI');const place=c.CRPGLiyueRework.placements.find(x=>x.mission===mission),node='R39_FIELD_'+place.anchor;r.storySetCursor(node);r.s.global.PRNG_STATE=seed;r.prepareStory();r.s.liyueField.stage=stage;r.s.liyueField.steps=Array.from({length:stage},(_,i)=>({stage:i}));r.s.global.CURRENT_MAP_ID=r.liyueFieldView().target;return r;}
function combat(r,guard=false){r.action('LIYUE_FIELD_BATTLE');r=restore(r);r.action('COMBAT_BEGIN');for(let i=0;r.s.runtime&&i<240;i++){const enemy=r.s.runtime.actors.find(a=>a.side==='ENEMY'&&a.hp>0);r.action('COMBAT',{card:guard||!enemy?'PLAYER_BASIC_GUARD':'PLAYER_BASIC_ATTACK',...(guard||!enemy?{}:{target:enemy.id})});if(i===1)r=restore(r);}assert(!r.s.runtime,'battle terminates');return r;}
test('all companions gain exactly 1% ATK/DEF per heart, capped at 5%, no HP or persistent base mutation',()=>{
 let r=fresh();for(const row of r.rows('04_CHAR_DB').filter(x=>r.tables['07_CHAR_DB'].has(x[1]))){const before=cp(r.s.chars[row[1]]);r.relation(row[0]).BOND_SCORE=0;const base=r.character(row[1]);for(const h of [1,2,3,4,5,6]){r.relation(row[0]).BOND_SCORE=h*20;const a=r.character(row[1]);assert.equal(a.atk,Math.round(base.atk*(1+Math.min(h,5)/100)*100)/100);assert.equal(a.def,Math.round(base.def*(1+Math.min(h,5)/100)*100)/100);assert.equal(a.maxHp,base.maxHp);}assert.deepEqual(cp(r.s.chars[row[1]]),before);}
 r=restore(r);assert(r.character('MOND_VENTI').bondBonusPercent===5);
});
test('investigation, wrong order, save reload and duplicate action preserve objective progress',()=>{
 let r=field('reed',0);assert.throws(()=>r.action('LIYUE_FIELD_ANSWER',{answer:1}));for(const c of r.liyueFieldView().step.clues)r.action('LIYUE_FIELD_INSPECT',{clue:c.id});r.action('LIYUE_FIELD_ANSWER',{answer:0});assert(!r.s.liyueField.done);r=restore(r);const g=r.s.global,a={id:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1),revision:g.SAVE_REVISION,type:'LIYUE_FIELD_ANSWER',answer:1};r.transact(a);const save=r.serialize();r.transact(a);assert.equal(r.serialize(),save);assert(r.s.liyueField.done);assert.throws(()=>r.action('LIYUE_FIELD_BATTLE'));
 r=field('reed',2);r.action('LIYUE_FIELD_ANSWER',{answer:0});assert.equal(r.s.liyueField.sequence.length,0);r.action('LIYUE_FIELD_ANSWER',{answer:1});r=restore(r);assert.equal(r.s.liyueField.sequence.length,1);r.action('LIYUE_FIELD_ANSWER',{answer:2});r.action('LIYUE_FIELD_ANSWER',{answer:0});assert(r.s.liyueField.done);
 const bad=cp(r.s);bad.liyueField.leaf='AA2';assert.throws(()=>new R(db,bad));
});
test('structure is a durable combat target, never attacks or attaches an aura',()=>{
 let r=field('minlin',1);r.action('LIYUE_FIELD_BATTLE');const b=r.s.runtime,t=b.actors.find(a=>a.fieldStructure);assert(t&&t.hp>0&&t.atk===0);r.action('COMBAT_BEGIN');for(let i=0;i<3;i++)r.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});assert.equal(t.hp,t.maxHp);assert(!b.log.some(l=>l.actor===t.name&&l.damage));r=restore(r);for(let i=0;r.s.runtime&&i<150;i++)r.action('COMBAT',{card:'PLAYER_BASIC_ATTACK',target:r.s.runtime.actors.find(a=>a.fieldStructure).id});assert(r.s.liyueField.done);assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).xp,0);
});
test('post-Dvalin party clears field encounters; level-6 solo loses under the same combat pressure',()=>{
 for(const [mission,stage]of [['reed',1],['guyun',1],['experiment',1]])for(const seed of [12,441,1987])for(const party of [false,true]){let r=field(mission,stage,seed);r.s.global.PLAYER_LEVEL_STATE=6;r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;
 if(party)for(const [i,id]of ['MOND_AMBER','MOND_KAEYA','MOND_BARBARA'].entries()){r.unlockCharacter(id);r.s.chars[id].level=6;r.s.chars[id].hp=r.character(id).maxHp;r.action('PARTY',{char:id,slot:i+2});}
 r=combat(r);assert.equal(r.s.liyueField.done,party,mission+' seed '+seed+' party '+party);if(party&&['ESCORT','DEFEND'].includes(r.liyueFieldView().step.kind))assert(r.s.liyueField.steps.at(-1).integrity>0);}
 let r=field('guyun',1);r.s.global.PLAYER_LEVEL_STATE=6;r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;r=combat(r,true);assert(!r.s.liyueField.done);assert.equal(r.s.liyueField.stage,1);r=restore(r);assert(r.s.liyueField.feedback.includes('다시 도전'));
});
test('Venti Isekai legend registers at the tavern and H01-H05 use native affection/daily/save systems',()=>{
 let r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');r.unlockCharacter('MOND_VENTI');r.action('PLACE_ENTER',{place:'EVT_CRPG_ANGELS_SHARE',mode:'TALK'});r.action('LEGEND_REGISTER',{quest:'LEG_ISK_MOND_VENTI'});r.action('PLACE_LEAVE');r.action('LEGEND_ENTER',{quest:'LEG_ISK_MOND_VENTI'});r=finish(r);assert(r.storyDone('Q_LEG_ISK_MOND_VENTI'));assert.equal(r.storyBond('PROFILE_MOND_VENTI'),10);
 for(let h=1;h<=5;h++){const id='AFF_ISK_MOND_VENTI_H0'+h;r.changeBond('PROFILE_MOND_VENTI',h*20-r.storyBond('PROFILE_MOND_VENTI'));if(h===3||h===5){r.action('WAIT',{minutes:1440});const a=r.relationshipActivityEntries().find(x=>x.profileId==='PROFILE_MOND_VENTI'&&!x.reason);assert(a,'available daily');r.action('RELATION_ACTIVITY',{activityId:a.id});}r.action('AFFECTION_ENTER',{event:id});r=restore(r);r=finish(r);assert(r.storyDone(id));assert.equal(r.relation('PROFILE_MOND_VENTI').events['H0'+h],'COMPLETE');}
 assert.equal(r.s.storyReturnStack.length,0);assert.equal(JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON).MOND_VENTI.state,'JOINED');
});
test('Zhongli has an actual introduction contact for both routes and five native affection stages',()=>{
 for(const route of ['ROUTE_ISEKAI','ROUTE_TRAVELER']){const r=fresh('MAP_LIYUE_HARBOR',route),d=r.storyEntries().find(e=>e.definition.CHAR_ID==='LIYUE_ZHONGLI'&&e.kind==='LEGEND').definition;assert(r.legendIntroductionPlaces(d).some(p=>p.id==='EVT_CRPG_LIYUE_WANGSHENG'));assert.equal([...r.storyIndex().affections.values()].filter(a=>a.ROUTE_SCOPE===route&&a.PROFILE_ID===d.PROFILE_ID&&/H0[1-5]$/.test(a.id)).length,5);}
});
fs.mkdirSync(root+'/reports/liyue_rework',{recursive:true});fs.writeFileSync(root+'/reports/liyue_rework/mechanics.json',JSON.stringify({tests:results,passed:results.filter(x=>x.pass).length,total:results.length},null,2));

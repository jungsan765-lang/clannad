'use strict';
// 0.15.19 편성 (the user's 2026-10-05 list): a companion is changed by pressing them and picking from pictures, not bare
// names; 장비 변경 sits above 편성 해제 (0.15.17); the 캐릭터 screen lists every character; changing the party never
// strips anyone's gear.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {fresh,root}=require('./helpers_v011.cjs');
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
// A copy out of the VM's arrays, so assert.deepEqual compares plain values.
const worn=(r,id)=>JSON.parse(JSON.stringify(r.s.inventory.filter(i=>i.equipped&&i.owner===id).map(i=>i.equip).sort()));
function world(){const r=fresh();for(const id of ['MOND_AMBER','MOND_KAEYA','MOND_LISA'])r.adminApply({op:'recruit',char:id});return r;}

check('gear stays with a companion who leaves the party, by removal or by replacement, and after a reload',()=>{
 const r=world();r.action('PARTY',{char:'MOND_AMBER',slot:2});const bow=r.giveEquipment('EQ_BOW_SLINGSHOT');r.action('EQUIP',{slot:bow,owner:'MOND_AMBER'});
 const atk=r.character('MOND_AMBER').atk;
 r.action('PARTY_REMOVE',{slot:2});assert.deepEqual(worn(r,'MOND_AMBER'),['EQ_BOW_SLINGSHOT'],'removed: the bow stays on Amber');
 assert.equal(r.character('MOND_AMBER').atk,atk,'and still counts in her numbers');
 r.action('PARTY',{char:'MOND_AMBER',slot:2});r.action('PARTY_REPLACE',{char:'MOND_KAEYA',slot:2});
 assert.deepEqual(worn(r,'MOND_AMBER'),['EQ_BOW_SLINGSHOT'],'replaced: the bow stays on Amber');
 const again=new (r.constructor)(r.db,JSON.parse(JSON.stringify(r.s)));assert.deepEqual(worn(again,'MOND_AMBER'),['EQ_BOW_SLINGSHOT'],'a reload keeps it');
 return {atk};
});

check('anyone the player has can be equipped; gear moves from a benched owner to whoever takes it',()=>{
 const r=world();const sword=r.giveEquipment('EQ_SWORD_COOL_STEEL');
 assert.equal(r.gearTargetReason('MOND_KAEYA'),'');r.action('EQUIP',{slot:sword,owner:'MOND_KAEYA'});assert.deepEqual(worn(r,'MOND_KAEYA'),['EQ_SWORD_COOL_STEEL'],'Kaeya is on the bench and equips');
 const preview=r.equipmentPreview(sword,'PLAYER_CUSTOM');assert.equal(preview.displacedOwner,'MOND_KAEYA','the comparison names the bench owner');
 r.action('EQUIP',{slot:sword,owner:'PLAYER_CUSTOM'});assert.deepEqual(worn(r,'MOND_KAEYA'),[]);assert.deepEqual(worn(r,'PLAYER_CUSTOM').includes('EQ_SWORD_COOL_STEEL'),true);
 assert.notEqual(r.gearTargetReason('LIYUE_ZHONGLI'),'','a character the player does not have cannot be equipped');
 return {};
});

check('gear comes off only a character the player no longer has; food and books still go to the party',()=>{
 const r=world();const bow=r.giveEquipment('EQ_BOW_SLINGSHOT');r.action('EQUIP',{slot:bow,owner:'MOND_AMBER'});
 const own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON);delete own.MOND_AMBER;r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);
 r.releaseInactiveEquipment();assert.deepEqual(worn(r,'MOND_AMBER'),[],'Amber left the roster: her bow goes back to the bag');
 assert.equal(r.s.inventory.find(i=>i.slot===bow).owner,'공용');
 assert.match(r.partyTargetReason('MOND_KAEYA'),/현재 활성 파티/,'consumables keep the party rule (books open to the bench with the growth rework)');
 return {};
});

check('편성 screen: pictures to pick from, an empty slot invites one in, a companion already placed trades places',()=>{
 const party=src('app_party.js');
 assert(party.includes('function pickCompanion(n,current){')&&party.includes("actorPortrait(x.id,'member-pick-face')"),'picture tiles');
 assert(party.includes("const type=x.active?'PARTY_SWAP':current?'PARTY_REPLACE':'PARTY',params=x.active?{from:x.slot,to:n}:{char:x.id,slot:n}"),'swap, replace or add');
 assert(party.includes("why=game.actionReason(type,params)")&&party.includes('if(why)b.title=why;'),'a locked tile says why');
 assert(party.includes("add.className='empty-slot member-add'")&&party.includes("el('strong','','동료 넣기')"),'empty slot');
 assert(party.includes("who=button('',swap?()=>pickCompanion(n,id):"),'pressing a companion opens the picker');
 assert(!party.includes("new Option('동료를 선택하세요','')"),'the bare-name list is gone');
 assert(party.includes('function confirmPartyRemoval(id,run){run();}'),'no gear warning: nothing comes off');
 assert(!/가방으로 돌아/.test(party+src('app_party_v01411.js')+src('app_gear.js')+src('app_equipment.js')),'no screen says gear goes back to the bag');
 const css=src('shell.css');assert(/\.member-pick-grid\{display:grid/.test(css));
 return {};
});

check('캐릭터 screen: the party in battle order, then everyone else marked 대기, and a long list starts at the top',()=>{
 const gear=src('app_gear.js'),shell=src('app_shell.js'),css=src('shell.css');
 assert(gear.includes('const bench=game.ownedActors().filter(a=>!party.includes(a.id))')&&gear.includes('for(const id of bench)grid.append(memberCard(id,true));'));
 assert(gear.includes("if(bench)copy.append(el('small','gear-bench-note','대기 중 · 편성에 넣으면 이 장비 그대로 싸웁니다'));"));
 assert(shell.includes("if(c.dataset.bench){b.classList.add('bench');b.append(mk('small','shell-roster-bench','대기'));}"));
 assert(css.includes('body.teyvat .shell-col-roster{justify-content:flex-start}')&&css.includes('body.teyvat .shell-col-roster>.shell-roster{margin-block:auto}'),'centred with auto margins, so the top of a long list stays reachable');
 return {};
});

const out=path.join(root,'reports','test_v01519.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(results,null,2));
console.log(JSON.stringify({ok:results.every(r=>r.ok),checks:results.length}));

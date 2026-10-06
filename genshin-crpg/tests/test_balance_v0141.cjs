'use strict';
const assert=require('node:assert/strict'),{fixture,run}=require('./helpers_balance_v0141.cjs'),{c,fs,root}=require('./helpers_v011.cjs');
const results=[];
// v0.14.4: a prepared party also picks a formation and roles (연계 진형 with one 연계 담당 gives its synergy).
function prepare(r){r.action('FORMATION_SET',{formation:'DOUBLE_LINE'});r.action('PARTY_TACTIC',{slot:2,tactic:'연계우선'});return r;}
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
check('Dvalin: geared 4/4/3/3 loses, prepared level 28 party wins, five seeds each',()=>{const out=[];for(const seed of [717,718,719,720,721])for(const low of [true,false]){const x=run(prepare(fixture(low?[4,4,3,3]:[28,28,28,28],['MOND_AMBER','MOND_LISA','MOND_KAEYA'],low?3:6)),'EG_BOSS_DVALIN',seed);assert.equal(x.result.victory,!low,JSON.stringify({seed,low,result:x.result}));out.push({seed,levels:low?'4/4/3/3':'28/28/28/28',enhance:low?3:6,victory:x.result.victory,rounds:x.result.rounds});}return out;});
const cases=[
 ['FB_ANEMO_HYPOSTASIS',['MOND_AMBER','MOND_LISA','MOND_BENNETT']],
 ['FB_ELECTRO_HYPOSTASIS',['MOND_KLEE','MOND_NOELLE','MOND_BENNETT'],null,'EQ_LY_ARMOR_THUNDERWARD'],
 ['FB_CRYO_REGISVINE',['MOND_AMBER','MOND_LISA','MOND_BENNETT']],
 ['FB_CRYO_HYPOSTASIS',['MOND_AMBER','MOND_LISA','MOND_BENNETT']],
 ['FB_GEO_HYPOSTASIS',['MOND_NOELLE','MOND_BENNETT','MOND_LISA'],'EQ_CLAYMORE_WHITEBLIND'],
 ['FB_PYRO_REGISVINE',['MOND_KAEYA','MOND_BARBARA','MOND_LISA'],'EQ_CLAYMORE_WHITEBLIND','EQ_LY_ARMOR_JADEFLAME'],
 ['FB_OCEANID',['MOND_AMBER','MOND_LISA','MOND_BENNETT']],
 ['FB_PRIMO_GEOVISHAP',['MOND_NOELLE','MOND_DIONA','MOND_BENNETT']],
 ['FB_RUIN_SERPENT',['MOND_NOELLE','MOND_DIONA','MOND_BENNETT'],'EQ_CLAYMORE_WHITEBLIND']
];
// v0.14.4: every field boss has its own level (Mond 10-13, Liyue 14-20). The reference is a party at that level with
// the best gear it can hold, the companions' exclusive weapons, the boss's counters and a chosen formation.
const {fixture:geared}=require('./helpers_abyss.cjs'),{artifacts,equip:wear}=require('./helpers_abyss_artifacts.cjs'),FB=c.CRPGRuntime.fieldBosses,enhFor=lv=>lv>=18?10:lv>=15?9:lv>=13?8:7;
for(const [id,team,weapon,armor]of cases)check(id+': a prepared party at the boss level can win',()=>{const lv=FB.bosses[id].level,enh=enhFor(lv),r=geared(lv,team,enh);if(lv>=15)artifacts(r,r.abyssParty());for(const m of team)wear(r,m,'EQ_EX_'+m,enh);const put=(eq,owner)=>{const slot=r.giveEquipment(eq);r.action('EQUIP',{slot,owner});r.s.inventory.find(x=>x.slot===slot).enhance=Math.min(enh,10);};if(weapon)put(weapon,'PLAYER_CUSTOM');if(armor)for(const owner of ['PLAYER_CUSTOM',...team])put(armor,owner);prepare(r);r.s.global.CURRENT_MAP_ID=FB.bosses[id].map;r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;for(const owner of team)r.s.chars[owner].hp=r.character(owner).maxHp;const x=run(r,'EG_'+id,717);assert.equal(x.result.victory,true,JSON.stringify(x.result));return{team,weapon,armor,level:lv,enhance:enh,seed:717,rounds:x.result.rounds,stats:x.stats};});
for(const kind of ['ESCORT','DEFEND'])check('Liyue '+kind+': native level 6 solo fails; regional-level equipped party survives',()=>{const found=Object.entries(c.CRPGLocalStory.episodes).find(([,e])=>e.steps.some(s=>s.kind===kind));assert(found,kind);const [anchor,e]=found,out=[];for(const team of [[],['MOND_AMBER','MOND_KAEYA','MOND_BARBARA']]){const r=fixture(team.length?[48,48,48,48]:[6,6,6,6],team,8);r.storySetCursor('R39_FIELD_'+anchor);r.prepareStory();const f=r.s.liyueField,stage=e.steps.findIndex(s=>s.kind===kind);f.stage=stage;f.steps=e.steps.slice(0,stage).map((_,i)=>({stage:i}));r.s.global.CURRENT_MAP_ID=r.liyueFieldView().target;r.s.global.PRNG_STATE=717;r.action('LIYUE_FIELD_BATTLE');r.action('COMBAT_BEGIN');for(let i=0;i<120&&r.s.runtime;i++){const at=r.combatCards().find(x=>x.id==='PLAYER_BASIC_ATTACK'&&!x.reason);r.action('COMBAT',at?{card:at.id,target:at.targets[0].id}:{card:'PLAYER_BASIC_GUARD'});}assert(!r.s.runtime);const result=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);assert.equal(result.victory,!!team.length);out.push({anchor,team,level:6,enhance:3,seed:717,victory:result.victory,rounds:result.rounds});}return out;});
fs.mkdirSync(root+'/reports/local-v0141',{recursive:true});fs.writeFileSync(root+'/reports/local-v0141/balance.json',JSON.stringify({method:'Synthetic legal ownership, levels and enhancement; native engine stats/damage, deterministic AI. Reachability tested separately. Samples are not exhaustive balance guarantees.',results},null,2)+'\n');

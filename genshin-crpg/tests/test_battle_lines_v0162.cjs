'use strict';
// 0.16.2 · lines during the story's boss fights (user: 「드발린 스토리상에서 전투도중에 대사가 있다거나 … 오셀전까지 그런게 있으면
// 추가하면 좋기도 하겠다」). runtime_battle_lines_v0162.js logs them; presentation.js turns each into its own beat.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fresh,c,root,vm}=require('./helpers_v011.cjs');
// The playback summary (presentation.js) is loaded by the page and the server engine; load it here too.
vm.runInContext(fs.readFileSync(path.join(root,'source/presentation.js'),'utf8'),c,{filename:'presentation.js'});
const api=c.CRPGRuntime,cp=x=>JSON.parse(JSON.stringify(x));
let count=0;function check(name,fn){fn();count++;console.log('PASS '+name);}
// A story fight with its own scene config starts only from that scene (runtime_combat.js startBattle): stand there first.
function fight(group,origin){
 const cfg=fresh('MAP_MOND_CITY').combatStoryConfig(group),r=cfg?fresh(cfg.map_id,cfg.route||'ROUTE_ISEKAI'):fresh('MAP_MOND_CITY');r.adminApply({op:'level',target:'ALL',value:60});
 if(cfg){Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:cfg.node_id,STORY_CURSOR_NODE_ID:cfg.node_id,CURRENT_MAP_ID:cfg.map_id});const orb=cfg.orb_action;if(orb){r.giveItem(orb.requires_item,1);r.s.flags[orb.requires_flag]=true;}r.startBattle(group,'STORY:'+cfg.node_id,{confirmed:true,companions:[]});}
 else r.startBattle(group,'EXPLICIT');
 const b=r.s.runtime;if(!cfg||!origin.startsWith('STORY:'))b.origin=origin;
 for(const a of b.actors){a.maxHp=a.hp=Math.max(a.maxHp,99999);}
 return r;
}
const lines=r=>r.s.runtime?r.s.runtime.log.filter(e=>e.battleLine):[];
function turn(r){const b=r.s.runtime;if(b.phase!=='WAIT_PLAYER')return;const guard=r.combatCards().find(c=>/GUARD/.test(c.id)&&!c.reason);if(guard)r.action('COMBAT',{card:guard.id});}
check('Dvalin speaks as the story fight opens, once at 70 % and once at 35 %; never twice',()=>{
 for(const group of ['EG_BOSS_DVALIN','EG_ISK_M04_K_DVALIN']){
  const r=fight(group,'STORY:TEST');r.action('COMBAT_BEGIN');
  assert.deepEqual([...new Set(lines(r).map(e=>e.battleLine.split(':')[0]))],['start'],group+' opens with its lines');
  const boss=()=>r.s.runtime.actors.find(a=>a.source==='BOSS_DVALIN');
  boss().hp=Math.floor(boss().maxHp*.65);turn(r);assert(lines(r).some(e=>e.battleLine.startsWith('hp70')),group+' 70 %');
  boss().hp=Math.floor(boss().maxHp*.3);turn(r);assert(lines(r).some(e=>e.battleLine.startsWith('hp35')),group+' 35 %');
  const n=lines(r).length;turn(r);turn(r);assert.equal(lines(r).length,n,'each set once');
  for(const e of lines(r))assert(e.speaker&&e.text&&Number.isInteger(e.round),'speaker, text and round');
 }
});
check('Osial (both routes) speaks by round while the formation charges; the Golden House Tartaglia by his health',()=>{
 for(const group of ['EG_BOSS_OSIAL','EG_ISK_L04_OSIAL']){
  const r=fight(group,'STORY:TEST');r.action('COMBAT_BEGIN');assert(lines(r).some(e=>e.battleLine.startsWith('start')),group);
  for(let i=0;i<40&&r.s.runtime&&r.s.runtime.round<8;i++)turn(r);
  if(r.s.runtime)for(const id of ['round3','round5','round7'])assert(lines(r).some(e=>e.battleLine.startsWith(id)),group+' '+id);
 }
 const r=fight('EG_ISK_L03_GOLDEN','STORY:TEST');r.action('COMBAT_BEGIN');const boss=()=>r.s.runtime.actors.find(a=>a.source==='BOSS_ISK_L03_GOLDEN');
 assert(lines(r).some(e=>e.battleLine.startsWith('start')));boss().hp=Math.floor(boss().maxHp*.5);turn(r);assert(lines(r).some(e=>e.battleLine.startsWith('hp60')));
});
check('a rematch or any fight that is not the story stays silent, and the isekai AA/AB/B Dvalin keep their own interludes',()=>{
 for(const [group,origin] of [['EG_BOSS_DVALIN','BOSS:REMATCH'],['EG_BOSS_DVALIN','EXPLICIT'],['EG_MOND_HILI_PATROL','STORY:TEST'],['EG_ISK_M04_AA_DVALIN','STORY:TEST']]){
  const r=fight(group,origin);r.action('COMBAT_BEGIN');turn(r);assert.equal(lines(r).length,0,group+' '+origin);
 }
});
check('each line is its own playback beat (never folded into a blow) and reaches a co-op guest',()=>{
 const r=fight('EG_BOSS_DVALIN','STORY:TEST'),P=c.CRPGPresentation;const snap=P.snapshot(r.s);r.action('COMBAT_BEGIN');turn(r);
 const frames=P.actionFrames(P.delta(snap,r.s)),said=frames.filter(f=>f.kind==='line');
 assert(said.length>=2);for(const f of said){assert(f.speaker&&f.label);assert.equal(f.targets.length,0);}
 assert(frames.indexOf(said[0])<frames.findIndex(f=>f.kind==='action'),'the opening lines come before the first blow');
 const fx=r.coopFx(r.s.runtime.log),kept=fx.entries.filter(e=>e.battleLine);assert(kept.length>=2&&kept.every(e=>e.speaker&&e.text&&e.face));
});
check('the voices follow the voice bible: 「자네」/하게체 only for 류운차풍진군, Paimon never names herself, Tartaglia never says 친구',()=>{
 for(const sets of Object.values(api.battleLines.lines))for(const set of sets)for(const l of set.lines){
  if(l.speaker!=='류운차풍진군')assert(!/자네|하게[.!]|게나[.!]|하네[.!]/.test(l.text),l.speaker+': '+l.text);
  if(l.speaker==='페이몬')assert(!/페이몬(은|이|는|도)/.test(l.text),l.text);
  if(l.speaker==='타르탈리아')assert(!/친구/.test(l.text),l.text);
  assert(l.text.length<=60,'one breath: '+l.text);
 }
 const src=fs.readFileSync(path.join(root,'source/index.html'),'utf8'),scripts=[...src.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
 assert(scripts.indexOf('runtime_battle_lines_v0162.js')>scripts.indexOf('runtime_liyue_combat.js')&&scripts.includes('app_battle_lines_v0162.js'));
 assert(fs.readFileSync(path.join(root,'tools/build.py'),'utf8').includes("'runtime_battle_lines_v0162.js'"));
});
console.log(JSON.stringify({total:count,passed:count}));

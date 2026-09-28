'use strict';
// v0.14.0 story/text cleanup: player-facing text carries no work notes, the protagonist speaks in lines
// (not "~한다" narration), and Isekai Liyue plays line by line with portraits like Mond.
const assert=require('node:assert/strict'),h=require('../tests/helpers_v011.cjs'),results=[];
h.vm.runInContext(h.fs.readFileSync(h.path.join(h.root,'source/readable_text.js'),'utf8'),h.c,{filename:'readable_text.js'});
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const r=h.fresh(),T=h.c.CRPGText,status=id=>r.tables['13_STATUS_EFFECT_DB']?.get(id)?.[1];
const show=v=>T.readable(String(v??''),{name:'모험가',resolve:status});
const NOTE=/\bCE_\d|TRPG|CRPG|환산|폴백|원작 효과|재검증|미구현|_DB\b|EQUIP_ID|LEVEL>=|초자연 능력 또는 서사 기술/;
const story=r.rows('55_MAIN_STORY_DB').concat(r.rows('57_MOND_STORY_SCENE_DB')).filter(x=>x[18]==='ACTIVE');
const shown=x=>!['META','NOTE','CONDITIONAL','CHOICE_GROUP'].includes(x[5]);
const text=x=>String((x[5]==='CHOICE'?x[10]:x[9])||'');
function cells(table,cols,filter=()=>true){const out=[];for(const row of r.rows(table))if(row&&row[0]&&filter(row))for(const i of cols){const v=show(row[i]);if(NOTE.test(v))out.push(row[0]+'['+i+'] '+v.slice(0,120));}return out;}

test('battle cards of the playable cast describe the skill, not how it was designed',()=>{
 assert.deepEqual(cells('08_SKILL_CARD_DB',[7,16],row=>/^(MOND_|LIYUE_|PLAYER_)/.test(row[0])),[]);
 for(const row of r.rows('08_SKILL_CARD_DB'))if(/^(MOND_|LIYUE_|PLAYER_)/.test(row[0]))assert.doesNotMatch(String(row[16]||''),/비전투 패시브|폭딜|평타|잡몹|딜러/,row[0]);
 assert.match(r.row('08_SKILL_CARD_DB','PLAYER_BASIC_GUARD')[16],/절반/);
});

test('enemy intel, bag, equipment, status and shop text has no internal notes or IDs',()=>{
 assert.deepEqual(cells('12_ENEMY_CARD_DB',[7,13,17]),[]);
 assert.deepEqual(cells('14_ITEM_DB',[5,6,7,11,12,13,17]),[]);
 assert.deepEqual(cells('16_EQUIP_DB',[9,11,29,31]),[]);
 assert.deepEqual(cells('13_STATUS_EFFECT_DB',[1,3]),[]);
 assert.deepEqual(cells('18_MERCHANT_DB',[1,3,6]),[]);
 // Bosses met in Mond and Liyue read their phase conditions in words, not as flags.
 const bosses=/^(BOSS_TARTAGLIA|BOSS_ISK_L03_GOLDEN|BOSS_OSIAL|BOSS_ISK_L04_OSIAL|BOSS_AZHDAHA)$/;
 const coded=r.rows('12_ENEMY_CARD_DB').filter(x=>bosses.test(x[1])).flatMap(x=>[7,13,17].map(i=>[x[0]+'['+i+']',show(x[i])])).filter(([,v])=>/[A-Z]{2,}_?[A-Z]*\s*(=|<|>)|\bAND\b|[A-Z]{3,}_[A-Z_]{3,}/.test(v));
 assert.deepEqual(coded,[]);
});

test('displayed story lines carry no work notes',()=>{
 const bad=story.filter(x=>shown(x)&&/\bCE_\d|_DB\b|TRPG|CRPG|FLAG_[A-Z]/.test(text(x))).map(x=>x[0]+':'+x[4]);
 assert.deepEqual(bad,[]);
});

test('protagonist choices are spoken lines, not narrated actions',()=>{
 // A narrated action ends in a plain present-tense verb ("상자를 옮긴다."); spoken lines end in speech endings.
 const bad=story.filter(x=>x[5]==='CHOICE'&&/(한다|간다|본다|든다|준다|는다|넨다|민다|핀다)[.!]?$/.test(text(x).trim())).map(x=>x[0]+':'+x[4]+' '+text(x));
 assert.deepEqual(bad,[]);
});

test('Isekai Liyue plays line by line with speaker portraits and restored reply choices',()=>{
 const liyue=story.filter(x=>x[0]==='ROUTE_ISEKAI'&&/^Q_ISK_LIYUE_0[1-4]$/.test(x[1]));
 const named=['각청','호두','북두','알베도','응광','종려','타르탈리아','류운차풍진군','다이루크','케이아','운근','감우','소'];
 const missing=liyue.filter(x=>x[5]==='DIALOGUE'&&named.includes(x[7])&&!String(x[6]).startsWith('PROFILE_')).map(x=>x[4]);
 assert.deepEqual(missing,[]);
 for(const q of ['Q_ISK_LIYUE_01','Q_ISK_LIYUE_02','Q_ISK_LIYUE_03','Q_ISK_LIYUE_04']){
  const rows=liyue.filter(x=>x[1]===q);
  assert(rows.filter(x=>x[5]==='CHOICE').length>=60,q+' reply choices');
  assert(rows.filter(x=>x[5]==='DIALOGUE'&&String(x[6]).startsWith('PROFILE_')).length>=60,q+' portrait lines');
 }
 // The v0.13.39 condensed prose stand-ins for single replies are no longer on any path.
 const reachable=new Set(story.filter(x=>x[0]==='ROUTE_ISEKAI').flatMap(x=>String(x[13]||'').split(/[;,|\s]+/)));
 assert.deepEqual([...reachable].filter(n=>n.startsWith('R39_PROSE')),[]);
});

test('first-person narration calls the narrator 나, not 자신',()=>{
 const row=id=>story.find(x=>x[0]==='ROUTE_ISEKAI'&&x[4]===id);
 assert.match(row('ISK_L02_AA2_080')[9],/내가 본 참사/);
 assert.match(row('ISK_L01_K_157')[9],/나는 우선 내가 실제로 본 것/);
 assert.match(row('ISK_M04_AB_125')[9],/나는 먼저 내 이름을/);
 assert.doesNotMatch(row('ISK_L04_AB1_086')[9],/것은 아니다\.|·/);
});

test('Isekai statue card reads as a scene, with one short help line',()=>{
 const src=h.fs.readFileSync(h.path.join(h.root,'source/app_traveler_geo.js'),'utf8');
 assert.match(src,/이세계인은 신상과 공명할 수 없습니다/);
 const shownText=[...src.matchAll(/'([^'\n]*[가-힣][^'\n]*)'/g)].map(m=>m[1]);
 assert(shownText.length>=5);
 assert.deepEqual(shownText.filter(s=>/CRPG|TRPG|환산/.test(s)),[]);
});

h.fs.mkdirSync(h.path.join(h.root,'reports/story_cleanup_v0140'),{recursive:true});
h.fs.writeFileSync(h.path.join(h.root,'reports/story_cleanup_v0140/runtime-tests.json'),JSON.stringify({version:'0.14.0',results},null,2)+'\n');

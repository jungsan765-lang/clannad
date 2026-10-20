'use strict';
// Read-only checks on the fully composed content, not a traversal or prose review.
const assert=require('node:assert/strict');
const {fs,path,vm,root,c,db,R,fresh}=require('./helpers_v011.cjs');
const builtOption=process.argv.indexOf('--built');
if(builtOption>=0)assert(process.argv[builtOption+1],'--built requires a build directory');
const builtDir=builtOption<0?null:path.resolve(process.argv[builtOption+1]);
const g=fresh();g.installMarketContent();
const index=g.storyIndex(),nodes=[...index.nodes.values()],defs=[...index.legends.values(),...index.affections.values()];
const tests=[];
function check(name,fn){fn();tests.push(name);console.log('PASS '+name);}

check('composed story destinations and definition references resolve within the same route',()=>{
 const groups=new Set(nodes.filter(n=>n[14]).map(n=>n[0]+':'+n[14]));
 for(const n of nodes){
  const next=String(n[13]||'');
  if(next&&!['END','PAUSE','HUB'].includes(next)&&!next.startsWith('SCREEN:')&&!next.startsWith('RETURN:')){
   const group=next.match(/^(?:CHOICE|CONDITION)_GROUP:(.+)$/)?.[1];
   assert(group?groups.has(n[0]+':'+group):index.nodes.has(n[0]+':'+next),'missing destination from '+n[4]+': '+next);
  }
  if(n[8]&&n[8]!=='NONE')assert(g.tables['32_MAP_DB'].has(n[8]),'missing map at '+n[4]);
 }
 for(const d of defs){
  assert(index.nodes.has(d.ROUTE_SCOPE+':'+d.ENTRY_NODE_ID),'missing entry '+d.id);
  assert(g.tables['04_CHAR_DB'].has(d.PROFILE_ID),'missing profile '+d.id);
  assert(g.tables['32_MAP_DB'].has(d.MAP_ID),'missing definition map '+d.id);
 }
});

check('composed story conditions and effects parse and their effect references exist',()=>{
 function inspect(e,node){
  if(e.effects)e.effects.forEach(x=>inspect(x,node));
  let valid=true;
  if(['UNLOCK_CARD','JOIN_ACCEPTED','COMPANION_ELIGIBLE','UNLOCK_CARD_ONCE'].includes(e.type))valid=g.tables['07_CHAR_DB'].has(e.id);
  else if(['COMPLETE_LEGEND','LEGEND_ACCEPT_AND_PAY','COMPLETE_AFFECTION'].includes(e.type))valid=!!g.storyDefinition(e.id);
  else if(e.type==='START_FIXED_COMBAT')valid=g.tables['33_ENCOUNTER_GROUP_DB'].has(e.id);
  else if(e.type==='ADD_HEART'&&e.profile)valid=g.tables['04_CHAR_DB'].has(e.profile);
  else if(e.type==='EVENT')valid=g.tables['51_EVENT_DB'].has(e.id)||g.liyueDefinitions().has(e.id);
  assert(valid,'missing effect reference at '+node[4]+': '+e.raw);
 }
 for(const node of nodes){c.CRPGRuntime.StoryParser.parseCondition(node[11]);c.CRPGRuntime.StoryParser.parseEffects(node[12]).forEach(e=>inspect(e,node));}
});

const INTERNAL=/\b(?:TODO|FIXME|QA|NaN|undefined|null|placeholder)\b|테스트용|검증판|미구현|연결 준비|작성 전|정식 구현|수동 검증|회귀 검사|개발 검증|\b(?:FLAG_|PROFILE_|EQ_|NODE_|EVT_)[A-Z0-9_]+/;
let guardedGreetings=0;
check('displayed composed story text and choice labels contain no internal markers',()=>{
 const hidden=new Set(['META','NOTE','EFFECT','CONDITION','CONDITIONAL','CHOICE_GROUP']);
 const placeholders=new Set(['PLAYER_NAME','STARTER_BOW_PRICE','STARTER_COAT_PRICE','STARTER_KIT_COST','STARTER_KIT_REMAINING_MORA']);
 for(const node of nodes){
  if(hidden.has(node[5]))continue;
  let text;
  try{text=g.storyDisplayText(node);}catch(e){assert.equal(e.code,'GREETING_DATA','unexpected text failure at '+node[4]);guardedGreetings++;text=node[9];}
  const visible=String(text||'')+' '+String(node[10]||'');
  assert.doesNotMatch(visible,INTERNAL,node[4]);
  const expanded=visible.replace(/\{(\w+)\}/g,(_,key)=>{assert(placeholders.has(key),'unsupported display placeholder '+key+' at '+node[4]);return '표시값';});
  assert.doesNotMatch(expanded,/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/,node[4]);
 }
});

check('all item and equipment detail text has no internal markers or raw IDs after DOM formatting',()=>{
 const text=require('../source/readable_text.js');
 const displayed=value=>text.readable(value,{name:g.s.global.PLAYER_NAME,resolve:id=>g.tables['13_STATUS_EFFECT_DB'].get(id)?.[1]||g.tables['07_CHAR_DB'].get(id)?.[1]});
 const presenter=require('../source/inventory_presenter.js').create(g.db,JSON.parse(fs.readFileSync(path.join(root,'content/asset-manifest.json'),'utf8')));
 for(const [table,key]of [['14_ITEM_DB','item'],['16_EQUIP_DB','equip']])for(const row of g.rows(table)){
  const detail=presenter.itemDetail({[key]:row[0],quantity:1,slot:'boundary',enhance:0});
  const visible=[detail.name,detail.description,detail.effect,detail.growthText,...(detail.fields||[]).flatMap(f=>[f.label,f.value])].filter(v=>typeof v==='string').map(displayed).join(' ');
  assert.doesNotMatch(visible,INTERNAL,row[0]);
  assert.doesNotMatch(visible,/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/,row[0]);
 }
});

if(builtDir)check('every named story profile resolves to this release art, including both Katheryne references',()=>{
 // Use the shipped manifest: build.py supplies deliberate aliases absent from
 // the source manifest, including the story's KSR key for the supplied KTH art.
 const manifest=JSON.parse(fs.readFileSync(path.join(builtDir,'asset-manifest.json'),'utf8'));
 assert.equal(manifest.appVersion,JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,'build version must match the tested source');
 const files=Object.fromEntries(Object.values(manifest.assets).map(a=>[a.file_name,a.url]));
 const context=vm.createContext({game:g,showArt:true,MANIFEST:manifest,ASSETS:files});
 const app=fs.readFileSync(path.join(builtDir,'app.js'),'utf8');
 for(const fn of ['assetPath','portraitFor']){const source=app.split('\n').find(s=>s.startsWith('function '+fn+'('));assert(source,fn);vm.runInContext(source,context);}
 const portrait=id=>vm.runInContext('portraitFor('+JSON.stringify(id)+')',context);
 const speakers=new Set(nodes.filter(n=>n[5]==='DIALOGUE'&&String(n[6]).startsWith('PROFILE_')).map(n=>n[6]));
 for(const id of speakers){const src=portrait(id);assert(src,'missing portrait '+id);assert(fs.existsSync(path.join(builtDir,src)),'unshipped portrait '+src);}
 assert.equal(portrait('PROFILE_MOND_KATHERYNE'),portrait('NPC_MOND_KATHERYNE'));
 assert.equal(portrait('PROFILE_MOND_KATHERYNE'),'assets/mond_kth_1.webp');
 context.showArt=false;assert.equal(portrait('PROFILE_MOND_KATHERYNE'),null);
});

if(builtDir)check('every shipped manifest media reference and every story-map background exists',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(builtDir,'asset-manifest.json'),'utf8'));
 const visit=(value,at)=>{
  if(value&&typeof value==='object')for(const [key,entry]of Object.entries(value))visit(entry,at+'.'+key);
  else if(typeof value==='string'&&/^(assets|audio)\//.test(value)&&/\.(png|webp|jpe?g|gif|mp3|ogg|mp4|wav)$/.test(value))assert(fs.existsSync(path.join(builtDir,value)),'missing '+at+': '+value);
 };
 visit(manifest,'manifest');
 const maps=new Set(nodes.map(n=>n[8]).filter(id=>id&&id!=='NONE'));
 for(const id of maps)assert(manifest.maps[id]?.url,'missing story-map background '+id);
});

check('event-only recruitment rejects new entries while retaining already joined saves',()=>{
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
  const r=fresh('MAP_LIYUE_MOUNTAINS',route),d=[...r.storyIndex().legends.values()].find(d=>d.CHAR_ID==='LIYUE_ZIBAI'&&d.ROUTE_SCOPE===route);
  assert.equal(d.STATUS,'EVENT_ONLY');
  for(const [type,payload]of [['LEGEND_REGISTER',{quest:d.id}],['LEGEND_ENTER',{quest:d.id}],['ZIBAI_RETURN_CHECK',{step:0}]]){
   const before=r.serialize();assert.throws(()=>r.action(type,payload),type+' entered a closed story');assert.equal(r.serialize(),before,'rejected '+type+' changed state');
  }
  r.adminApply({op:'recruit',char:'LIYUE_ZIBAI'});
  const restored=new R(db,JSON.parse(r.serialize()));
  assert.equal(JSON.parse(restored.s.global.COMPANION_ELIGIBILITY_JSON).LIYUE_ZIBAI.state,'JOINED');
 }
});
console.log(JSON.stringify({passed:tests.length,builtDir,nodes:nodes.length,legends:index.legends.size,affections:index.affections.size,guardedGreetings,scope:'Static composed-content and synthetic boundary checks; no full story traversal, prose review or browser interaction.'}));

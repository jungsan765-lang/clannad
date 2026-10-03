'use strict';
// 0.15.6 (user, with screenshots): 「각 시설 준비 제작이 안돼 … 전용무기에도 같은 문제」, 「별도 확인 필요나 좌표 아님 등등
// 저건 뭔 말인지 모르겠는데 … 맵도 작게 만들고」, 「글 깨지는것도 잘 해주고」, 「이세계인 2돌파하니까 그냥 Q스킬 무한으로
// 쓰던데」, 「장비 아직도 렉 있어」, 「장비 좋은거랑 자기 전무를 맨 위로」.
const assert=require('node:assert/strict'),{R,db,fresh,c,fs,path,vm,root}=require('./helpers_v011.cjs');
const results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const party=(g,ids)=>{for(const [i,id]of ids.entries()){g.unlockCharacter(id);g.action('PARTY',{char:id,slot:i+2});}return g;};
function battle(g){g.startBattle('EG_MOND_HILI_PATROL','EXPLICIT');if(g.s.runtime?.opening?.state==='PENDING')g.beginCombat(g.s.runtime.id);return g.s.runtime;}
const actor=(g,id)=>g.s.runtime.actors.find(a=>a.source===id&&a.side==='ALLY');

check('constellation cooldown cuts take one turn whatever the node; a cut never leaves an element burst at 1 or raises a cooldown',()=>{
 const g=party(fresh('MAP_MOND_CITY','ROUTE_ISEKAI'),['MOND_AMBER']);battle(g);const a=actor(g,'PLAYER_CUSTOM');g.s.constellations={PLAYER_CUSTOM:2};
 const fx=g.consFx(a).find(x=>x.t==='cd');assert.equal(fx.n,2,'n stays the node (battle log names it)');assert.equal(fx.cut,1,'the cut is the effect’s own');
 const after=v=>{a.cooldowns.PLAYER_ISEKAI_Q=v;g.consAfterCast(a,'PLAYER_ISEKAI_Q','q',{});return a.cooldowns.PLAYER_ISEKAI_Q;};
 assert.equal(after(3),2,'이세계인 C2: 3 → 2 (was 1: back every turn)');assert.equal(after(2),2,'a burst is not left at 1');assert.equal(after(1),1,'never raised');
 const cut=(char,level,card,base)=>{const h=party(fresh(),[char]);battle(h);const x=actor(h,char);h.s.constellations={[char]:level};x.cooldowns[card]=base;h.consAfterCast(x,card,card.endsWith('_Q')?'q':'e',{});return x.cooldowns[card];};
 const out={kaeyaC6:cut('MOND_KAEYA',6,'MOND_KAEYA_Q',4),mikaC4:cut('MOND_MIKA',4,'MOND_MIKA_Q',5),dilucC6:cut('MOND_DILUC',6,'MOND_DILUC_E',3),xiaoC2:cut('LIYUE_XIAO',2,'LIYUE_XIAO_Q',5)};
 assert.deepEqual(out,{kaeyaC6:3,mikaC4:4,dilucC6:2,xiaoC2:4},'each “1턴 줄어든다” takes exactly one turn');
 // 중운 C2 cuts the whole party's skills (teamCast) by the same one turn.
 const chongyun=party(fresh(),['LIYUE_CHONGYUN']);battle(chongyun);chongyun.s.constellations={LIYUE_CHONGYUN:2};
 const tc=chongyun.consFx(actor(chongyun,'LIYUE_CHONGYUN')).find(x=>x.t==='teamCast');assert.equal(tc.cut,1);assert.equal(tc.n,2);
 return out;
});

check('in battle the 이세계인 burst comes back every third turn, and every other turn at C2 (it was every turn)',()=>{
 const cycle=level=>{const g=party(fresh('MAP_MOND_CITY','ROUTE_ISEKAI'),['MOND_AMBER']);g.s.constellations={PLAYER_CUSTOM:level};battle(g);
  for(const x of g.s.runtime.actors)if(x.side==='ENEMY'){x.hp=x.maxHp=1e6;x.atk=1;}
  const seen=[];for(let turn=0;turn<7&&g.s.runtime&&g.s.runtime.phase==='WAIT_PLAYER';turn++){const q=g.combatCards().find(x=>x.id==='PLAYER_ISEKAI_Q');seen.push(q&&!q.reason?'Q':'-');
   if(q&&!q.reason)g.combatAction('PLAYER_ISEKAI_Q',q.targets?.[0]?.id);else g.combatAction('PLAYER_BASIC_GUARD');}
  return seen.join('');};
 const c0=cycle(0),c2=cycle(2);assert.equal(c0,'Q--Q--Q');assert.equal(c2,'Q-Q-Q-Q');return {c0,c2};
});

check('equipment previews: the same numbers as a whole new runtime, the save untouched, quick with a bag full of wish gear',()=>{
 const g=fresh(),swords=[...g.tables['16_EQUIP_DB'].values()].filter(e=>e[2]==='한손검').map(e=>e[0]);
 for(let i=0;i<40;i++)g.giveEquipment(swords[i%swords.length]);
 const slots=g.s.inventory.filter(i=>i.equip&&!i.equipped&&g.row('16_EQUIP_DB',i.equip)[2]==='한손검').map(i=>i.slot),before=g.serialize();
 const keys=['maxHp','atk','def','crit','critDmg','spd','hit','eva','resist'];
 for(const slot of slots.slice(0,4)){const p=g.equipmentPreview(slot,'PLAYER_CUSTOM'),ref=new R(g.db,JSON.parse(JSON.stringify(g.s)));ref.equip(slot,'PLAYER_CUSTOM');const want=ref.player();
  assert.equal(p.reason,'');for(const k of keys)assert.equal(p.after[k],want[k],k+' after equipping '+slot);}
 const t=performance.now();for(const slot of slots)g.equipmentPreview(slot,'PLAYER_CUSTOM');const ms=performance.now()-t;
 assert(ms<2000,'previews for '+slots.length+' swords took '+Math.round(ms)+' ms (a new runtime each took about 0.3 s)');
 const shop=g.shopEquipmentPreview('EQ_SWORD_COOL_STEEL','PLAYER_CUSTOM'),sref=new R(g.db,JSON.parse(JSON.stringify(g.s)));sref.equip(sref.giveEquipment('EQ_SWORD_COOL_STEEL'),'PLAYER_CUSTOM');
 assert.equal(shop.reason,'');for(const k of keys)assert.equal(shop.after[k],sref.player()[k],'shop preview '+k);
 assert.equal(g.serialize(),before,'previews never touch the save');
 assert(!/new api\.Runtime\(/.test(src('runtime_party.js'))&&!/new api\.Runtime\(/.test(src('runtime_market.js')),'no whole runtime per preview');
 return {items:slots.length,ms:Math.round(ms)};
});

// The shipped picker and bag (app_gear.js, inventory_presenter.js) on a small stand-in for the page, as in test_gear_ui_v01343.cjs.
class Element{
 constructor(tag,cls='',text=''){Object.assign(this,{tag,className:cls,textContent:text,children:[],dataset:{},style:{},attributes:{},classList:{add(){},toggle(){}}});}
 append(...nodes){this.children.push(...nodes);}prepend(...nodes){this.children.unshift(...nodes);}setAttribute(k,v){this.attributes[k]=v;}querySelector(){return null;}
}
const walk=n=>n instanceof Element?[n,...n.children.flatMap(walk)]:[];
check('the gear picker shows the character’s own exclusive weapon first, then the best pieces; the bag shows equipment best first',()=>{
 const r=party(fresh(),['MOND_AMBER']),queue=[],modals=[];
 const mine=r.giveEquipment('EQ_EX_MOND_AMBER');for(const id of ['EQ_BOW_SLINGSHOT','EQ_CRPG_TRAINING_BOW','EQ_BOW_FAVONIUS','EQ_BOW_SACRIFICIAL','EQ_BOW_HAMAYUMI','EQ_BOW_RUST'])r.giveEquipment(id);
 Object.assign(c,{game:r,busy:false,MANIFEST:{},presenterDB:null,itemPresenter:null,window:{addEventListener(){},matchMedia:()=>({matches:true})},
  el:(...a)=>new Element(...a),button:(label,fn,disabled=false)=>Object.assign(new Element('button','',label),{onclick:fn,disabled}),
  actionButton:(label)=>new Element('button','',label),meter(){},actorPortrait:()=>new Element('img'),itemGlyph:()=>new Element('span'),
  fmt:x=>String(x),safeName:(table,id)=>r.row(table,id)[1],
  ownerName:id=>id==='PLAYER_CUSTOM'?r.s.global.PLAYER_NAME:r.character(id).name,itemCategory:i=>r.row('16_EQUIP_DB',i.equip)[2]==='방어구'?'ARMOR':'WEAPON',
  sidebar:()=>new Element('aside'),reward(){},render(){},queueMicrotask:fn=>queue.push(fn),
  document:{addEventListener(){},getElementById:()=>({close(){}}),querySelectorAll:()=>[]},showModal:(title,content)=>modals.push({title,content})});
 const draw=()=>{c.growthScreen(new Element('section'));while(queue.length)queue.shift()();};
 c.act=(type,params)=>{const out=r.action(type,params);draw();return out;};
 for(const file of ['inventory_presenter.js','app_tiers.js','app_gear.js'])vm.runInContext(src(file),c,{filename:file});
 c.window.openGear(mine,'MOND_AMBER');assert.equal(modals.length,1);
 const rows=walk(modals[0].content).filter(x=>/^gear-option( blocked)?$/.test(x.className)),names=rows.map(x=>walk(x).find(y=>y.tag==='strong')?.textContent||'');
 const P=c.CRPGInventoryPresenter.create(r.db,{}),rank=slot=>P.itemDetail(r.s.inventory.find(i=>i.slot===slot)).tier.rank;
 assert.match(names[0],/정찰 기사의 신호궁/,'her own exclusive weapon on top: '+names.join(', '));
 assert(walk(rows[0]).some(x=>/전용 무기/.test(String(x.textContent))),'marked 전용 무기');
 const open=rows.slice(1).filter(x=>!/blocked/.test(x.className)).map(x=>walk(x).find(y=>y.tag==='strong').textContent);
 const ranks=open.map(n=>P.itemDetail(r.s.inventory.find(i=>i.equip&&r.row('16_EQUIP_DB',i.equip)[1]===n.replace(/\s*\+\d+$/,''))).tier.rank);
 assert.deepEqual(ranks,[...ranks].sort((x,y)=>y-x),'then by star grade: '+open.join(', '));
 // The bag: within each group, star grade first, then enhancement.
 r.s.inventory.find(i=>i.equip==='EQ_BOW_RUST').enhance=6;
 const entries=P.inventoryEntries(r.s),group=entries.find(x=>x.kind==='EQUIPMENT'&&x.equipmentCategory==='WEAPON')?.group,weapons=entries.filter(d=>d.kind==='EQUIPMENT'&&d.group===group);
 assert(weapons.length>=6);
 for(let i=1;i<weapons.length;i++){const a=weapons[i-1],b=weapons[i];assert(a.tier.rank>b.tier.rank||a.tier.rank===b.tier.rank&&a.enhance>=b.enhance,'bag order at '+a.name+' / '+b.name);}
 return {picker:names,bag:weapons.map(w=>w.name+' '+w.tier.rank+'★ +'+w.enhance)};
});

check('the Liyue map shows no mapper notes and lists its areas in a window; the map keeps its room; workshop buttons are kept',()=>{
 const catalog=c.CRPGRuntime.liyueAreaCatalog;assert(catalog?.areas?.length>=20);
 const modals=[],chosen=[],tools=new Element('div','terrain-shortcuts');
 const section={querySelector:sel=>sel==='.terrain-shortcuts'?tools:null};
 const ctx=vm.createContext({console,CRPGRuntime:{liyueAreaCatalog:catalog},CRPGTerrainMap:{points:{}},el:(...a)=>new Element(...a),
  button:(label,fn)=>Object.assign(new Element('button','',label),{onclick:fn}),showModal:(title,content)=>modals.push({title,content}),
  document:{getElementById:()=>({close(){modals.push('closed');}}),querySelector:()=>null},drawLocation(){},
  game:{view:()=>({map:['MAP_LY_DETAIL_DIHUA','리월']}),s:{global:{CURRENT_MAP_ID:'MAP_LY_DETAIL_DIHUA'}},liyueArea:()=>null},
  NavigationUI:{card:()=>({querySelector:()=>null}),draw:()=>section,choose:id=>chosen.push(id)}});
 vm.runInContext(src('app_liyue_areas.js'),ctx,{filename:'app_liyue_areas.js'});
 for(const a of catalog.areas)assert.equal(ctx.CRPGTerrainMap.points[a.id].length,3,'no caption on '+a.id);
 ctx.NavigationUI.draw.call(ctx.NavigationUI);const open=tools.children.find(x=>/세부 지역 찾기/.test(x.textContent));assert(open,'the list opens from the map tools');
 open.onclick();assert.equal(modals[0].title,'리월 세부 지역 · '+catalog.areas.length+'곳');
 const places=walk(modals[0].content).filter(x=>x.className==='liyue-browse-place');assert.equal(places.length,catalog.areas.length);
 places[0].onclick();assert.equal(chosen[0],places[0].dataset.areaId);assert(modals.includes('closed'),'picking an area closes the window and shows it on the map');
 const shown=walk(modals[0].content).map(x=>String(x.textContent||'')).join(' ');assert(!/좌표|수직 층|별도 확인|표현하지 않음/.test(shown),'no mapper notes in the list');
 for(const a of catalog.areas)for(const k of ['name','zone','feature','description','observe'])assert(!/좌표|수직 층|별도 확인|표현하지 않음/.test(String(a[k]||'')),a.id+'.'+k+' is for players');
 const area=src('app_liyue_areas.js');assert(!/shown\.anchor|a\.anchor\]/.test(area)&&!/liyue-coordinate-detail/.test(area),'the mapper’s note box is gone');
 const css=src('shell.css');assert(/#journey-map>\.terrain-layout\{min-height:clamp\(/.test(css)&&/#journey-map\{overflow-y:auto/.test(css),'the map keeps a minimum height and the panel scrolls');
 const forge=src('app_forge_v0148.js');assert(/item\.actionNodes\?\?=item\.actions\(\)/.test(forge)&&/foot\.append\(\.\.\.item\.actionNodes\)/.test(forge),'workshop buttons are taken once and kept with the item');
 assert(!/detail:\(\)=>\{const copy=row\.querySelector/.test(forge),'a piece’s next step is kept with the item too');
 return {areas:catalog.areas.length};
});

const out=path.join(root,'reports/v0156');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'tests.json'),JSON.stringify({version:'0.15.6',total:results.length,passed:results.filter(r=>r.ok).length,results},null,2)+'\n');
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));

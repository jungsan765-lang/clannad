'use strict';
// Run the shipped picker against the real engine. Record DOM output and the
// intermediate busy render to cover the acquisition-guide / bag entry path.
const assert=require('node:assert/strict'),{fresh,c,fs,path,vm,root}=require('./helpers_v011.cjs');
class Element{
 constructor(tag,cls='',text=''){Object.assign(this,{tag,className:cls,textContent:text,children:[],dataset:{},style:{},attributes:{},classList:{add(){},toggle(){}}});}
 append(...nodes){this.children.push(...nodes);}setAttribute(k,v){this.attributes[k]=v;}querySelector(){return null;}
}
const walk=n=>n instanceof Element?[n,...n.children.flatMap(walk)]:[],queue=[],modals=[];
// 0.15.3: a new journey already holds the starter sword, and the acquisition guide points at it, so the guide path
// starts from that piece; a save without a pending guide falls back to a new bow.
const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI'),slot=r.s.equipmentGuide?.pendingAcquired?.slot||r.giveEquipment('EQ_BOW_SLINGSHOT');
Object.assign(c,{game:r,busy:false,MANIFEST:{},presenterDB:null,itemPresenter:null,window:{addEventListener(){},matchMedia:()=>({matches:true})},
 el:(...a)=>new Element(...a),button:(label,fn,disabled=false)=>Object.assign(new Element('button','',label),{onclick:fn,disabled}),
 actionButton:(label)=>new Element('button','',label),meter(){},actorPortrait:()=>new Element('img'),itemGlyph:()=>new Element('span'),
 fmt:x=>String(x),safeName:(table,id)=>r.row(table,id)[1],
 ownerName:id=>id==='PLAYER_CUSTOM'?r.s.global.PLAYER_NAME:r.character(id).name,itemCategory:i=>r.row('16_EQUIP_DB',i.equip)[2]==='방어구'?'ARMOR':'WEAPON',
 sidebar:()=>new Element('aside'),reward(){},render(){},queueMicrotask:fn=>queue.push(fn),
 document:{addEventListener(){},getElementById:()=>({close(){}}),querySelectorAll:()=>[]},showModal:(title,content)=>modals.push({title,content})});
function draw(){c.growthScreen(new Element('section'));while(queue.length)queue.shift()();}
c.act=(type,params)=>{c.busy=true;const result=r.action(type,params);draw();if(type==='MENU')assert.equal(modals.length,0,'busy render must not freeze a disabled picker');c.busy=false;draw();return result;};
// v0.14.4: app_gear.js marks item tiers with app_tiers.js (loaded between them in index.html).
for(const file of ['inventory_presenter.js','app_tiers.js','app_gear.js'])vm.runInContext(fs.readFileSync(path.join(root,'source',file),'utf8'),c,{filename:file});
c.window.openGear(slot);assert.equal(modals.length,1);const equip=walk(modals[0].content).find(x=>x.tag==='button'&&x.textContent==='장착');assert(equip);assert.equal(equip.disabled,false);equip.onclick();
assert.equal(r.s.inventory.find(i=>i.slot===slot).equipped,true);assert.equal(r.s.inventory.find(i=>i.slot===slot).owner,'PLAYER_CUSTOM');
console.log('PASS actual acquisition/bag → gear picker → enabled equip button → native EQUIP');

// 0.16.7 (user: 「캐릭터마다 경험치 책 사용을 만들어두는게 좋아보인다. 오른쪽에꺼 지우고.」): books are used from each character's own
// row — 1개 · 레벨 업 ×n · 최대 ×n — not from a quantity window. Drive the shipped row.
r.giveItem('MAT_CHAR_EXP_WANDERER',20);assert.equal(typeof c.bookDialog,'undefined','the book window is gone');
let row=c.window.bookRow('PLAYER_CUSTOM');const one=walk(row).find(x=>x.tag==='button'&&x.textContent==='1개');assert(one);assert.equal(one.disabled,false);
const count=r.itemCount('MAT_CHAR_EXP_WANDERER');one.onclick();assert.equal(r.itemCount('MAT_CHAR_EXP_WANDERER'),count-1);
row=c.window.bookRow('PLAYER_CUSTOM');const more=walk(row).find(x=>x.tag==='button'&&/^(레벨 업|최대) ×\d+$/.test(x.textContent));assert(more,'a button for several at once');const n=Number(more.textContent.match(/\d+$/)[0]),before=r.itemCount('MAT_CHAR_EXP_WANDERER');more.onclick();assert.equal(r.itemCount('MAT_CHAR_EXP_WANDERER'),before-n);
console.log('PASS book row: one book, then several at once, each through native USE_ITEM');
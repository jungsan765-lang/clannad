'use strict';
// Display-only regressions: the isekai Osial encounter reuses its canonical art,
// and the field boss screen states the same half-day reset as the runtime.
const assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const {fresh,fs,root,c}=require('./helpers_v011.cjs');
const read=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const g=fresh(),manifest=JSON.parse(fs.readFileSync(path.join(root,'content/asset-manifest.json'),'utf8'));
g.installMarketContent();
const assets=Object.fromEntries(Object.entries(manifest.assets).filter(([,a])=>a.content_rating==='GENERAL').map(([id,a])=>[id,{url:'assets/'+a.file_name.replace(/\.[^.]+$/,'.webp')}]));
const files=Object.fromEntries(Object.values(manifest.assets).filter(a=>a.content_rating==='GENERAL').map(a=>[a.file_name,'assets/'+a.file_name.replace(/\.[^.]+$/,'.webp')]));
const app=read('app.js'),context=vm.createContext({game:g,showArt:true,MANIFEST:{assets},ASSETS:files});
for(const fn of ['assetPath','portraitFor','enemyPortraitFor']){const line=app.split('\n').find(s=>s.startsWith('function '+fn+'('));assert(line,fn);vm.runInContext(line,context);}
const portrait=id=>vm.runInContext('enemyPortraitFor('+JSON.stringify(id)+')',context);
assert.equal(g.tables['09_MONSTER_DB'].get('BOSS_ISK_L04_OSIAL')[15],0,'keep the encounter data and combat rules unchanged');
assert.equal(portrait('BOSS_ISK_L04_OSIAL'),portrait('BOSS_OSIAL'));
assert.equal(portrait('BOSS_ISK_L04_OSIAL'),'assets/enemy_19.webp');
assert(fs.existsSync(path.join(root,portrait('BOSS_ISK_L04_OSIAL'))),'the canonical image is shipped locally');
assert.equal(portrait('MON_SLIME'),'assets/enemy_1.webp','existing enemy art wins');
assert.equal(portrait('FB_ANEMO_HYPOSTASIS'),null,'an enemy without a verified image does not borrow unrelated art');
assert.equal(portrait('UNKNOWN_ENEMY'),null);
const before=g.serialize();portrait('BOSS_ISK_L04_OSIAL');assert.equal(g.serialize(),before,'art lookup is read-only');
console.log('PASS existing enemy art and exact Osial encounter alias, without state changes');
const oz=vm.runInContext("portraitFor('ENTITY_OZ')",context);assert.equal(oz,'assets/summons/summon_oz.webp');assert(fs.existsSync(path.join(root,oz)));
assert(vm.runInContext("portraitFor('ENTITY_PAIMON')",context),'Paimon keeps her registered art');
context.showArt=false;assert.equal(vm.runInContext("portraitFor('ENTITY_OZ')",context),null,'the art option disables the fallback too');
console.log('PASS Oz dialogue uses his existing picture and respects the art option');

class Node{constructor(tag,cls='',text=''){this.tag=tag;this.className=cls;this.text=String(text);this.children=[];}append(...x){this.children.push(...x);}prepend(...x){this.children.unshift(...x);}setAttribute(){}querySelector(){return null;}querySelectorAll(){return [];}get textContent(){return this.text+this.children.map(x=>x?.textContent??String(x)).join('');}}
const el=(...a)=>new Node(...a);
const fieldContext=vm.createContext({game:g,el,boss(){},combat(){},CRPGRuntime:c.CRPGRuntime});
vm.runInContext(read('app_field_bosses.js'),fieldContext);
const id='FB_ANEMO_HYPOSTASIS',route=c.CRPGRuntime.fieldBosses.route(id);
g.currentPlace=()=>({valid:true,entry:{kind:'BOSS',route}});
function renderAt(hour,wins){
 g.actionStartedAt=Date.UTC(2026,9,3,hour-9,30);
 g.s.fieldBossWindow={window:g.fieldBossWindow(),wins};
 const save=g.serialize(),node=el('section');fieldContext.box=node;vm.runInContext('boss(box)',fieldContext);
 assert.equal(g.serialize(),save,'opening boss information must not change progress');
 const walk=n=>[n,...n.children.filter(x=>x instanceof Node).flatMap(walk)];
 return walk(node).find(n=>n.className.startsWith('field-boss-daily')).textContent;
}
assert.match(renderAt(9,3),/이번 시간대 필드 보스 토벌 3\/3 · 한국 시간 12:00에 다시 도전/);
assert.match(renderAt(18,3),/이번 시간대 필드 보스 토벌 3\/3 · 한국 시간 00:00에 다시 도전/);
assert.match(renderAt(9,1),/이번 시간대 필드 보스 토벌 1\/3 · 2번 남음/);
console.log('PASS rendered field boss limits use the actual noon/midnight runtime boundary');

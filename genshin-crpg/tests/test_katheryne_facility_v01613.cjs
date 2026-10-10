'use strict';
// Runs the real facility renderer, public action button and compact-label pass against town entries.
// This deterministic DOM model verifies ordering/bindings; it does not substitute for browser sizing.
const assert=require('node:assert/strict');
const {fresh,fs,path,root,vm}=require('./helpers_v011.cjs');
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
class Node{
 constructor(tag='div',cls='',text=''){Object.assign(this,{tagName:tag.toUpperCase(),nodeType:1,className:cls,dataset:{},attrs:{},childNodes:[],parentElement:null,_text:String(text),hidden:false});}
 get children(){return this.childNodes;}get classList(){const n=this,parts=()=>n.className.split(/\s+/).filter(Boolean);return {contains:x=>parts().includes(x),add:(...xs)=>n.className=[...new Set([...parts(),...xs])].join(' '),remove:(...xs)=>n.className=parts().filter(x=>!xs.includes(x)).join(' '),toggle:(x,on)=>{const yes=on===undefined?!parts().includes(x):!!on;if(yes)n.classList.add(x);else n.classList.remove(x);return yes;}};}
 get textContent(){return this._text+this.childNodes.map(n=>n.textContent).join('');}set textContent(v){this.childNodes=[];this._text=String(v??'');}
 append(...nodes){for(const n of nodes){n.remove?.();this.childNodes.push(n);n.parentElement=this;}}remove(){if(this.parentElement)this.parentElement.childNodes.splice(this.parentElement.childNodes.indexOf(this),1);this.parentElement=null;}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
 matches(s){return s.split(',').some(x=>{const m=x.trim().match(/^([\w-]*)([.\w-]*)$/);return !!m&&(!m[1]||this.tagName===m[1].toUpperCase())&&m[2].split('.').slice(1).every(c=>this.classList.contains(c));});}
 querySelectorAll(s){if(s.startsWith(':scope>'))return this.children.filter(n=>n.matches(s.slice(7)));const parts=s.trim().split(/\s+/),out=[];const match=n=>{let i=parts.length-1;if(!n.matches(parts[i]))return false;for(n=n.parentElement;--i>=0;){while(n&&!n.matches(parts[i]))n=n.parentElement;if(!n)return false;n=n.parentElement;}return true;};const walk=n=>{for(const k of n.children){if(match(k))out.push(k);walk(k);}};walk(this);return out;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 click(){if(!this.disabled)this.onclick?.();}
}
function screen(map,block=false){
 const game=fresh(map);game.s.global.SCREEN_MODE='LOCATION';
 if(block){const old=game.placeAvailability;game.placeAvailability=function(entry,...args){return entry.entity?.endsWith('_KATHERYNE')?'시설을 이용할 수 없습니다.':old.call(this,entry,...args);};}
 const entries=game.placeEntries(),before=JSON.stringify(entries);game.placeEntries=()=>entries;
 const body=new Node('body'),left=new Node('section','shell-loc-left'),calls=[];body.dataset.shellScreen='LOCATION';body.append(left);
 const context={console,game,busy:false,el:(...a)=>new Node(...a),button:(label,fn,disabled=false)=>Object.assign(new Node('button','',label),{onclick:fn,disabled}),act:(type,params)=>{calls.push({type,params});return game.action(type,params);},isInn:e=>!!e.merchant&&game.rows('19_SHOP_STOCK_DB').some(r=>r[1]===e.merchant&&r[3]==='SERVICE_INN_REST_8H'),placeName:e=>e.name.replace(/\(시스템\)/g,'').trim(),mainObjective(){},lifePanel(){},bossProgressControls(){},levelLabel:()=>'',render(){},document:{body,createElement:t=>new Node(t),querySelector:s=>body.querySelector(s),addEventListener(){}},requestAnimationFrame:fn=>fn(),addEventListener(){},setTimeout,clearTimeout};context.window=context;vm.createContext(context);
 const adv=src('app_adventure.js'),rev=src('app_revision.js');
 vm.runInContext(rev.slice(rev.indexOf('function actionButton('),rev.indexOf('function xpMeter(')),context);
 vm.runInContext(adv.slice(adv.indexOf('function isGuildReception('),adv.indexOf('function recoveryCard(')),context);
 vm.runInContext(adv.slice(adv.indexOf('drawLocation=function('),adv.indexOf('function materialSources(')),context);
 context.drawLocation(left,{map:game.tables['32_MAP_DB'].get(map)});
 const grid=left.querySelector('.location-places');for(const tile of grid.children)tile.classList.add('shell-place-tile');
 vm.runInContext(src('app_mainscreen_v0167.js'),context);context.CRPGMainScreen.arrange();
 return {game,entries,before,left,grid,context,calls};
}
for(const [map,guild]of [['MAP_MOND_CITY','EVT_SCHEDULE_NPC_MOND_KATHERYNE'],['MAP_LIYUE_HARBOR','EVT_CRPG_LIYUE_GUILD']]){
 check(map+' 캐서린이 첫 시설이며 다른 시설의 순서는 유지된다',()=>{
  const p=screen(map),ids=p.grid.children.map(n=>n.querySelector('button').crpgAction.params.place);
  assert.equal(ids[0],guild);assert.deepEqual(ids.slice(1),Array.from(p.entries.filter(e=>e.id!==guild),e=>e.id));assert.equal(JSON.stringify(p.entries),p.before,'renderer must not mutate the catalog');
  assert.equal(p.grid.children.filter(n=>n.classList.contains('place-entry-guild')).length,1);assert(p.grid.children[0].querySelector('h3').textContent.includes('캐서린'));
 });
 check(map+' 기존 방문 버튼은 그대로 길드 시설에 들어간다',()=>{
  const p=screen(map),button=p.grid.children[0].querySelector('button');assert.equal(button.disabled,false);assert.equal(button.crpgAction.type,'PLACE_ENTER');button.click();assert.equal(p.calls.length,1);assert.equal(p.game.s.placeVisit.place,guild);assert(p.game.atGuild());
 });
 check(map+' 작은 시설 칸에도 캐서린 이름을 표시하고 중복하지 않는다',()=>{
  const p=screen(map),guild=p.grid.children[0];assert.equal(guild.querySelector('.place-entry-short').textContent,'캐서린');assert(guild.querySelector('.place-entry-kind').textContent.includes('의뢰 접수'));
  for(const tile of p.grid.children.slice(1)){const expected=tile.querySelector('.place-entry-kind').textContent.replace(/^(몬드|리월)\s*·\s*/,'').trim();assert.equal(tile.querySelector('.place-entry-short').textContent,expected);}
  p.context.CRPGMainScreen.arrange();assert.equal(guild.querySelectorAll('.place-entry-short').length,1);
 });
}
check('잠긴 캐서린의 원래 사유와 비활성 방문 버튼을 보존한다',()=>{
 const p=screen('MAP_MOND_CITY',true),tile=p.grid.children[0],button=tile.querySelector('button');assert(button.disabled);assert.equal(button.getAttribute('data-reason'),'시설을 이용할 수 없습니다.');assert.equal(tile.querySelector('.choice-note').textContent,'시설을 이용할 수 없습니다.');button.click();assert.equal(p.calls.length,0);assert(!p.game.s.placeVisit);
});
check('캐서린과 같은 이름을 가진 다른 시설은 길드 강조 대상이 아니다',()=>{
 const p=screen('MAP_MOND_CITY');assert.equal(p.context.isGuildReception({name:'캐서린 기념품',entity:'SERVICE_OTHER'}),false);assert.equal(p.context.isGuildReception({entity:'NPC_MOND_KATHERYNE'}),true);assert.equal(p.context.isGuildReception({entity:'NPC_LIYUE_KATHERYNE'}),true);
});
console.log(passed+' facility checks passed');

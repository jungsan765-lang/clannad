/* 0.16.2 생활 (the user: 「채집이랑 채광같은 시스템들 다시 만들어」). Each activity of a place has a card (what it is, the tries
 * left today, pictures of what can come out, one button), and gathering, mining and hunting open a scene of the place
 * (rules: runtime_life_v0162.js; the window itself: lifeWindow in app_life.js, which fishing uses too).
 *  - 채집: glowing plants; a press picks one.
 *  - 채광: ore veins; each press cracks one, the last blow shatters it and the ore flies to the tally.
 *  - 사냥: animals run across; a press near one catches it (Space/Enter on the field aims at the nearest).
 * The press log goes to the server once, at the end (LIFE_FINISH), and the usual reward window shows what came home.
 * Load after app_life_v01522.js. */
(function(){
'use strict';
const RULES=()=>CRPGRuntime.lifeScene;
const VERB={GATHER:'채집하기',MINE:'채광하기',HUNT:'사냥하기',FISH:'낚시하기'};
const DONE={GATHER:'모두 모았다!',MINE:'모두 캤다!',HUNT:'모두 잡았다!'};
// Real wildlife pictures can be mapped here later (item id → picture path); until then an animal runs as its meat or fowl.
const WILDLIFE={};
const SND=n=>{try{window.CRPGSound?.play(n);}catch{}};
const tenth=v=>Math.round(v*10)/10;
const reduced=()=>document.documentElement.classList.contains('reduce-motion');
const tier=id=>{try{return Math.max(1,Math.min(5,Number(itemPresenter.itemDetail({item:id,quantity:1})?.tier?.rank)||1));}catch{return 1;}};
const restart=(node,cls)=>{node.classList.remove(cls);void node.offsetWidth;node.classList.add(cls);};
function itemTile(id,cls='life-item'){const t=el('span',cls+' tier-'+tier(id)),name=lifeItemName(id);t.title=name;t.setAttribute('aria-label',name);t.append(lifeIcon(id));return t;}

// ---------- the place's card ----------
function card(entry){
 const kind=entry.kind,c=el('article','life-card kind-'+kind.toLowerCase());c.dataset.kind=kind;
 const head=el('div','life-card-head'),left=el('span','life-chip'+(entry.remaining?'':' out'));
 left.append(el('small','','오늘'),el('b','',entry.remaining+'/'+entry.limit));left.setAttribute('aria-label','오늘 남은 횟수 '+entry.remaining+'/'+entry.limit);
 head.append(el('strong','life-card-name',LIFE_NAMES[kind]||entry.label),left,el('span','life-chip time',entry.seconds+'초'));
 const items=el('div','life-card-items');for(const x of [...entry.pool].sort((a,b)=>b.weight-a.weight).slice(0,4))items.append(itemTile(x.item));
 c.append(head,items);
 let need=null;
 if(kind==='FISH'){
  const gear=el('div','life-card-gear');
  for(const id of ['TRPG_FISHING_ROD',CRPGRuntime.lifeCatalog.bait]){const n=game.itemCount(id),t=itemTile(id,'life-item small');t.classList.toggle('lack',!n);t.append(el('b','life-item-count','×'+n));gear.append(t);if(!n&&!need)need=id;}
  c.append(gear);
 }
 const go=actionButton(VERB[kind]||entry.label,'LIFE_START',{kind},true);go.classList.add('life-go');
 const why=!entry.remaining?'내일 다시':need==='TRPG_FISHING_ROD'?'낚싯대 필요':need?'미끼 필요':go.dataset.reason||'';
 if(why)c.append(el('small','life-card-why',why));
 c.append(go);
 if(need){const where=el('div','life-card-where');materialSources(where,need);if(where.children.length)c.append(where);}
 return c;
}
lifePanel=function(parent){const entries=game.lifeEntries();if(!entries.length)return;const box=el('section','life-cards');box.setAttribute('aria-label','생활');for(const e of entries)box.append(card(e));parent.append(box);};

// ---------- the scene ----------
let S=null;
// Scene time runs on the page's steady clock from where the server's clock stood when the scene opened.
const now=s=>Math.max(0,s.base+(performance.now()-s.p0));
function open(job){
 const scene=game.lifeScene(job),back=el('button','','돌아가기');back.type='button';
 const win=lifeWindow(job,back),s=S={id:job.id,job,scene,win,back,inputs:[],done:new Set(),taps:scene.nodes.map(()=>0),parts:[],tally:new Map(),ripples:[],ripple:0,lastAt:-1,base:Math.max(0,lifeClockNow()-job.startedAt),p0:performance.now(),ended:null,elapsed:0,sendAt:0,sending:false,failed:false,raf:0,guide:null};
 win.stage.classList.add('life-field');
 // One slot per kind of item in the scene, shown once the first one arrives.
 for(const item of new Set(scene.nodes.map(n=>n.item))){const slot=itemTile(item,'life-tally-slot'),count=el('b','','×0');slot.append(count);win.tally.append(slot);s.tally.set(item,{slot,count,n:0});}
 if(job.kind==='HUNT')buildHunt(s);else buildNodes(s);
 s.end=el('div','life-end');s.end.setAttribute('role','status');s.end.setAttribute('aria-live','polite');win.stage.append(s.end);
 back.onclick=()=>finish(s,'back');
 win.wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(s,'back');}});
 // The first-use lesson (app_tutorial.js) points at the first thing to press until something is collected.
 if(game.tutorialDirective?.()?.id==='life'+job.kind){s.guide=job.kind==='HUNT'?win.stage:s.parts[0]?.node||null;s.guide?.setAttribute('data-life-guide','');}
 document.body.append(win.wrap);requestAnimationFrame(()=>win.wrap.classList.add('open'));
 (job.kind==='HUNT'?win.stage:s.parts[0]?.node)?.focus({preventScroll:true});
 s.raf=requestAnimationFrame(()=>loop(s));
}
function buildNodes(s){
 const mine=s.job.kind==='MINE';
 for(const n of s.scene.nodes){
  const node=el('div','life-node '+(mine?'vein':'plant')+' tier-'+tier(n.item));node.style.left=n.x+'%';node.style.top=n.y+'%';node.style.setProperty('--d',(-(n.i*0.53)%2.4).toFixed(2)+'s');
  node.setAttribute('role','button');node.tabIndex=0;node.setAttribute('aria-label',lifeItemName(n.item)+' ×'+n.n);
  const fly=lifeIcon(n.item,'life-flyer');node.append(lifeIcon(n.item,'life-node-icon'),el('span','life-plus','+'+n.n),fly);
  let pips=null;
  if(mine){
   node.append(el('i','life-crack'));
   for(let k=0;k<6;k++){const shard=el('i','life-shard');shard.style.setProperty('--a',(k*60+n.i*23)+'deg');node.append(shard);}
   for(let k=0;k<3;k++){const bit=el('i','life-bit');bit.style.setProperty('--a',(k*120+30+n.i*11)+'deg');node.append(bit);}
   pips=el('span','life-pips');for(let k=0;k<n.hits;k++)pips.append(el('i'));node.append(pips);
  }
  const press=()=>hit(s,n.i);
  node.addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();press();});
  node.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();press();}});
  // A lesson's Enter (app_tutorial.js clicks its target) or an assistive click arrives as a click without a pointer.
  node.addEventListener('click',e=>{if(e.detail===0)press();});
  s.parts.push({node,pips,fly,n});s.win.stage.append(node);
 }
}
function buildHunt(s){
 const field=s.win.stage;field.tabIndex=0;field.setAttribute('role','application');field.setAttribute('aria-label','사냥터');
 for(const a of s.scene.nodes){
  const node=el('div','life-node life-animal from-'+a.from.toLowerCase()+' tier-'+tier(a.item)+' away'),beast=el('span','life-beast'),fly=lifeIcon(a.item,'life-flyer');
  let pic;if(WILDLIFE[a.item]){pic=el('img','life-node-icon wild');pic.src=WILDLIFE[a.item];pic.alt='';pic.draggable=false;}else pic=lifeIcon(a.item,'life-node-icon');
  beast.append(pic);node.append(el('i','life-dust'),beast,el('span','life-plus','+'+a.n),fly);node.setAttribute('aria-hidden','true');
  s.parts.push({node,fly,n:a,shown:false});field.append(node);
 }
 for(let k=0;k<4;k++){const r=el('i','life-ripple');field.append(r);s.ripples.push(r);}
 field.addEventListener('pointerdown',e=>{
  if(e.button>0||S!==s)return;e.preventDefault();const b=field.getBoundingClientRect();if(!b.width||!b.height)return;
  shoot(s,tenth(Math.max(0,Math.min(100,(e.clientX-b.left)/b.width*100))),tenth(Math.max(0,Math.min(100,(e.clientY-b.top)/b.height*100))));
 });
 field.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat&&e.target===field){e.preventDefault();aim(s);}});
 field.addEventListener('click',e=>{if(e.detail===0&&e.target===field)aim(s);});
}
// ---------- presses ----------
function hit(s,i){
 if(S!==s||s.ended||s.done.has(i))return;const at=Math.floor(now(s));if(at>=s.scene.limit){finish(s,'time');return;}
 const mine=s.job.kind==='MINE',part=s.parts[i],rules=RULES();
 if(mine&&s.lastAt>=0&&at-s.lastAt<rules.mineGap)return; // the last blow still rings
 if(s.inputs.length>=rules.maxInputs)return;
 s.inputs.push({at,node:i});s.lastAt=at;
 if(mine){
  const taps=++s.taps[i];[...part.pips.children].forEach((p,k)=>p.classList.toggle('on',k<taps));
  part.node.dataset.crack=String(Math.min(3,Math.ceil(taps/part.n.hits*3)));restart(part.node,'struck');SND('hit');
  if(taps<part.n.hits)return;SND('rock');
 }else SND('item_receive');
 collect(s,i);
}
function shoot(s,x,y){
 if(S!==s||s.ended)return;const at=Math.floor(now(s));if(at>=s.scene.limit){finish(s,'time');return;}
 const rules=RULES(),i=rules.huntTarget(s.scene,s.done,x,y,at),ring=s.ripples[s.ripple++%s.ripples.length];
 ring.style.left=x+'%';ring.style.top=y+'%';ring.classList.toggle('hit',i>=0);restart(ring,'go');SND('bow_hit');
 // A miss changes nothing on the server, so only catches are sent.
 if(i<0||s.inputs.length>=rules.maxInputs)return;
 s.inputs.push({at,node:i,x,y});s.lastAt=at;
 const part=s.parts[i],p=rules.animalAt(part.n,at);if(p){part.node.style.left=p.x+'%';part.node.style.top=p.y+'%';}
 collect(s,i);
}
// Keyboard: shoot at the animal nearest the middle of the field.
function aim(s){
 const t=now(s);let best=null;
 for(const part of s.parts){if(s.done.has(part.n.i))continue;const p=RULES().animalAt(part.n,t);if(p&&p.x>=0&&p.x<=100&&(!best||Math.abs(p.x-50)<Math.abs(best.x-50)))best=p;}
 if(best)shoot(s,tenth(best.x),tenth(best.y));
}
function collect(s,i){
 const part=s.parts[i],n=part.n,kind=s.job.kind,t=s.tally.get(n.item);s.done.add(i);
 part.node.classList.add(kind==='MINE'?'broken':kind==='HUNT'?'caught':'picked');part.node.setAttribute('aria-disabled','true');part.node.tabIndex=-1;
 // The tally counts it at once; the item flies into its slot, which bumps on arrival.
 t.n+=n.n;t.count.textContent='×'+t.n;t.slot.classList.add('got');const from=part.fly.getBoundingClientRect(),to=t.slot.getBoundingClientRect();
 part.fly.style.setProperty('--fx',Math.round(to.left+to.width/2-from.left-from.width/2)+'px');part.fly.style.setProperty('--fy',Math.round(to.top+to.height/2-from.top-from.height/2)+'px');part.node.classList.add('fly');
 setTimeout(()=>{if(S!==s)return;restart(t.slot,'bump');if(kind!=='GATHER')SND('item_receive');},reduced()?0:560);
 if(s.guide)dropGuide(s);
 if(s.done.size===s.scene.nodes.length)finish(s,'done');
}
// The lesson's veil goes at once, so the very next press already reaches the rest of the scene.
function dropGuide(s){s.guide?.removeAttribute('data-life-guide');s.guide=null;try{removeTutorialSpotlight();scheduleTutorial();}catch{}}
// ---------- the clock, the run of the animals, and the end ----------
function loop(s){
 if(S!==s)return;
 // The job ended elsewhere (another device, a reload of the save): close.
 if(!game||game.s.lifeJob?.id!==s.id){if(!s.sending)teardown();else s.raf=requestAnimationFrame(()=>loop(s));return;}
 if(!s.ended){
  const t=now(s);s.win.clock(s.scene.limit-t,s.scene.limit);
  // A hunt ends once the last animal has run off.
  if(s.job.kind==='HUNT'){run(s,t);if(s.parts.every(p=>s.done.has(p.n.i)||t>p.n.start+p.n.duration))finish(s,'gone');}
  if(t>=s.scene.limit)finish(s,'time');
 }
 if(s.ended&&!s.sending&&!s.failed&&performance.now()>=s.sendAt&&!busy)send(s);
 s.raf=requestAnimationFrame(()=>loop(s));
}
function run(s,t){
 for(const part of s.parts){
  if(s.done.has(part.n.i))continue;const p=RULES().animalAt(part.n,t),shown=!!p;
  if(shown!==part.shown){part.shown=shown;part.node.classList.toggle('away',!shown);}
  if(p){part.node.style.left=p.x+'%';part.node.style.top=p.y+'%';}
 }
}
function finish(s,why){
 if(S!==s||s.ended)return;
 s.ended=why;s.elapsed=Math.min(s.scene.limit,Math.max(s.lastAt,Math.floor(now(s))));
 s.win.wrap.classList.add('ended');s.back.disabled=true;s.win.clock(s.scene.limit-s.elapsed,s.scene.limit);
 const label=why==='done'?DONE[s.job.kind]:why==='gone'?'사냥 끝':why==='time'?'시간 종료':'';
 if(label){s.end.textContent=label;s.end.classList.add('show');}
 if(s.guide)dropGuide(s);
 s.sendAt=performance.now()+(why==='done'?900:why==='back'?0:600);
}
// app_av.js plays an animal or bird sound for every finished hunt or gathering; a scene that brought nothing home stays
// quiet (0.16.2).
let quietUntil=0;
if(typeof GameAudio!=='undefined'&&GameAudio?.play&&!GameAudio.lifeQuietV0162){const prior=GameAudio.play;GameAudio.play=function(name,...rest){if(performance.now()<quietUntil&&['hunt_pig','birds'].includes(name))return;return prior.call(this,name,...rest);};GameAudio.lifeQuietV0162=true;}
async function send(s){
 s.sending=true;let r;if(!s.done.size)quietUntil=performance.now()+3000;
 try{r=await act('LIFE_FINISH',{job:s.job.id,inputs:s.inputs,elapsed:s.elapsed});}catch(e){r={ok:false,error:e?.message};}
 if(S!==s)return; // settled: the job and its window are gone, the reward window shows the rest
 if(r===undefined){s.sending=false;return;} // another action was still running; the next frame tries again
 if(r?.ok&&!game?.s.lifeJob){teardown();return;}
 s.failed=true;s.end.replaceChildren(el('span','life-end-why',String(r?.error||'저장하지 못했습니다.')));
 const again=el('button','life-end-btn primary','다시 시도');again.type='button';again.onclick=()=>{s.failed=false;s.sending=false;s.end.classList.remove('failed');s.end.textContent='';};
 const quit=actionButton('그만두기','LIFE_CANCEL');quit.classList.add('life-end-btn');
 s.end.append(again,quit);s.end.classList.add('show','failed');again.focus({preventScroll:true});
}
function teardown(){const s=S;if(!s)return;S=null;cancelAnimationFrame(s.raf);s.guide?.removeAttribute('data-life-guide');s.win.wrap.remove();}

const priorLifeUI=updateLifeUI;
updateLifeUI=function(){
 const job=game?.s.lifeJob;
 if(!job?.scene){teardown();return priorLifeUI();}
 clearTimeout(lifeUITimer);document.getElementById('life-work-status')?.remove();
 if(S?.id===job.id&&S.win.wrap.isConnected)return;
 teardown();open(job);
};
const priorRestore=restoreUIState;
restoreUIState=function(...args){teardown();return priorRestore.apply(this,args);};
})();

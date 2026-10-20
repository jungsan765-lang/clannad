/* Travel objectives, local discoveries and timed work. */
const literalStoryTextIndexes=new WeakSet();
function bindLiteralStoryText(){
 const ids=CRPGText.literalProtagonistNodes,ix=game?.storyIndex?.();if(!ids||!ix||literalStoryTextIndexes.has(ix))return;
 let registered=0;const route=game.s.global.STORY_ROUTE_ID;
 for(const id of ids){const row=ix.nodes.get(route+':'+id)||ix.nodes.get('ROUTE_ISEKAI:'+id)||ix.nodes.get('ROUTE_TRAVELER:'+id);if(row&&CRPGText.registerLiteralProtagonist(id,game.storyDisplayText?.(row)??row[9]))registered++;}
 if(registered===ids.length)literalStoryTextIndexes.add(ix);
}
const journeyDisplayText=displayText;
displayText=function(value){
 bindLiteralStoryText();
 const name=game?.s.global.PLAYER_NAME||'',last=Array.from(name).pop()||'',code=last.charCodeAt(0),tail=code>=0xac00&&code<=0xd7a3?(code-0xac00)%28:null;
 const consonant=tail!==null?tail!==0:/[013678lmn]$/i.test(last),rieul=tail===8||/[178l]$/i.test(last);
 const pairs={'은':['은','는'],'는':['은','는'],'이':['이','가'],'가':['이','가'],'을':['을','를'],'를':['을','를'],'과':['과','와'],'와':['과','와'],'이야':['이야','야'],'야':['이야','야'],'이라고':['이라고','라고'],'라고':['이라고','라고'],'이라는':['이라는','라는'],'라는':['이라는','라는'],'으로':['으로','로'],'로':['으로','로']};
 const text=String(value||'').replace(/\{PLAYER_NAME\}(이라고|라고|이라는|라는|으로|이야|은|는|이|가|을|를|과|와|야|로)(?=$|[\s,.!?…'"”’」]|[가-힣])/g,(_,p)=>name+pairs[p][p==='으로'||p==='로'?(!consonant||rieul?1:0):consonant?0:1]);
 return CRPGText.readable(journeyDisplayText(text),{name,resolve:id=>game?.tables['13_STATUS_EFFECT_DB']?.get(id)?.[1]});
};
const journeyMainObjective=mainObjective;
mainObjective=function(parent){const j=game.s.storyJourney,b=game.s.storyBreak;if(!j&&!b){journeyMainObjective(parent);return;}const c=el('section','main-objective journey-objective');c.append(el('small','eyebrow',game.s.storyContext?'개인 이야기 · 다음 여정':'메인 임무 · 다음 여정'),el('h2','',j?'이야기의 목적지로':b.title));
 if(j){c.append(el('p','',mapName(j.target)+'에서 다음 이야기가 이어집니다.'));if(j.scripted){if(game.s.global.CURRENT_MAP_ID!==j.from){c.append(el('p','choice-note','안내 이동의 출발 장소 · '+mapName(j.from)));travelGuide(c,j.from);}else c.append(actionButton('안내에 따라 이동'+(j.minutes?' · '+j.minutes+'분':''),'STORY_SCRIPTED_TRAVEL',{},true));}else if(j.special&&game.s.global.CURRENT_MAP_ID!==j.target)c.append(actionButton('드발린의 등에 올라 폐허로 이동','STORY_RIDE',{},true));else travelGuide(c,j.target);if(game.s.global.CURRENT_MAP_ID===j.target)c.append(actionButton('도착 · 이야기 계속','JOURNEY_RESUME',{},true));}
 else{c.append(el('p','',b.prompt||'주변을 여행하거나 다음 장면을 준비하세요.'),el('p','muted','다음 장면 · '+mapName(b.map)));if(game.s.global.CURRENT_MAP_ID!==b.map)travelGuide(c,b.map);c.append(actionButton('준비를 마치고 이야기 계속','JOURNEY_RESUME',{},true));}
 c.append(el('small','muted','편성·장비·의뢰·생활 활동을 진행할 수 있습니다.'));parent.append(c);
};
const journeyStory=story;
story=function(p,v){if(game.s.storyJourney||game.s.storyBreak){mainObjective(p);p.append(actionButton('메인 화면에서 이동·준비','MENU',{screen:'LOCATION'}));return;}journeyStory(p,v);};
function discoveryCards(parent){
 // 0.16.32: oculi that answer the 「공명」 are found with the corner mark and its catch game, not with this list of clues.
 const points=game.oculusEntries().filter(p=>(p.method!=='HIDDEN'||game.oculusProgress(p.id)>0)&&!game.resonancePoint?.(p.id));if(!points.length)return;const section=el('section','world-discoveries');section.append(el('h2','','주변의 작은 단서'));
 // 0.16.32 (user: 「자리는 많은데 굳이 한곳에 몰아써서 짤리고」): the list holds a short card (name, clue, 살펴보기); the clue's steps open
 // in a window of their own, where they always fit.
 for(const p of points){const brief=el('section','card discovery-card discovery-brief'),head=el('div','discovery-head');head.append(el('h3','',p.title),button('살펴보기',()=>{const full=discoveryCard(p);if(!full)return;full.addEventListener('click',e=>{if(e.target.closest?.('button'))setTimeout(()=>{if(game.s.worldJob)document.getElementById('modal')?.close();},350);},true);showModal(p.title,full);},false,true));brief.append(head,el('p','',p.clue));if(p.reason)brief.append(el('p','choice-note',p.reason));section.append(brief);}
 parent.append(section);
}
function discoveryCard(p){
 {const c=el('section','card discovery-card');c.append(el('p','',p.clue),...(p.context?[el('p','discovery-context',p.context)]:[]));if(p.reason)c.append(el('p','choice-note',p.reason));const step=p.step;if(!step)return c;
 if(step.cost?.items){const required=el('p','discovery-cost','교환 재료 · ');Object.entries(step.cost.items).forEach(([id,n],i)=>{if(i)required.append(' · ');required.append(el('span',game.itemCount(id)<n?'lack':'',safeName('14_ITEM_DB',id)+' '+n+'개 (보유 '+game.itemCount(id)+')'));});c.append(required,el('small','muted','건네기 버튼을 눌렀을 때만 재료를 소비합니다. 준비해서 나중에 돌아와도 됩니다.'));} const args={kind:'OCULUS',point:p.id};
 if(step.options){for(const [i,label]of step.options.entries())c.append(actionButton(label,'WORLD_WORK_START',{...args,answer:i}));}
 else if(step.sequence){let seq=[];const input=el('div','row'),answer=el('p','sequence-input','선택한 순서: —');const labels=step.sequenceLabels||{LEAF:'잎',TREE:'나무',SKY:'하늘'};for(const [id,label]of Object.entries(labels))input.append(button(label,()=>{if(seq.length<3){seq.push(id);answer.textContent='선택한 순서: '+seq.map(s=>labels[s]).join(' → ');}}));input.append(button('지우기',()=>{seq=[];answer.textContent='선택한 순서: —';}));c.append(answer,input,button('풍경 울리기',()=>act('WORLD_WORK_START',{...args,sequence:seq}),busy||!!p.reason,true));}
 else{const button=actionButton(step.label+(step.duration?' · '+step.duration/1000+'초':''),'WORLD_WORK_START',args);button.disabled=button.disabled||!!p.reason;c.append(button);}
 return c;}
}
const journeyLocation=drawLocation;
drawLocation=function(p,v){journeyLocation(p,v);if(game.needsRecovery())return;const m=CRPGWorldContent.newMaps.find(m=>m.id===v.map[0]);if(m){p.prepend(el('p','map-breadcrumb','몬드 / '+(m.theme.startsWith('DRAGONSPINE')?'드래곤 스파인 / ':'')+m.name));p.append(el('p','muted map-description',m.description));}discoveryCards(p);};
const journeyShop=shop;
shop=function(p,v){journeyShop(p,v);discoveryCards(p);};
const journeyCommissionCard=commissionCard;
commissionCard=function(parent,q,guild=false){if(q.row[0]!==CRPGWorldContent.letterCommission.quest||!q.accepted||q.state?.claimed||q.state?.node==='READY_TO_CLAIM'){journeyCommissionCard(parent,q,guild);return;}
 const c=el('section','card commission-card'),stage=game.letterStage();c.append(el('small','eyebrow','진행 중 · 성문 우편물'),el('h3','',q.row[1]),el('p','','편지 수집 → 주소 정리 → 캐서린에게 전달'));if(stage){c.append(el('p','',stage.label+(stage.duration?' · '+stage.duration/1000+'초':'')),actionButton(stage.label,'WORLD_WORK_START',{kind:'COMMISSION',quest:q.row[0]},true));if(stage.requiresPlace&&!game.atGuild()){const k=game.placeCatalog().find(e=>e.entity==='NPC_MOND_KATHERYNE');if(k)c.append(actionButton('캐서린에게 찾아가기','PLACE_ENTER',{place:k.id}));}}rewardPreview(c,q.reward);parent.append(c);
};
const journeyBattlePrepare=battlePrepare;
battlePrepare=function(p){journeyBattlePrepare(p);if(!game.s.battlePreparation)return;/* 0.16.63: not in the tutorial's first battle, which cannot be left (runtime_reading.js) */{const intro=game.s.tutorialV2?.intro;if(!(intro&&game.s.battlePreparation.group===intro.group&&game.s.battlePreparation.node===intro.node))p.append(actionButton('지금은 물러나서 더 준비하기','PREP_LEAVE'));}/* Boss advice is intentionally omitted; technical status remains in the boss panel. */};
let worldUITimer=null;
function updateWorldUI(){
 clearTimeout(worldUITimer);document.getElementById('world-work-status')?.remove();const job=game?.s.worldJob;if(!job)return;
 const box=el('section','life-work-status world-work-status');box.id='world-work-status';box.setAttribute('role','status');const bar=el('progress'),label=el('span');bar.max=job.duration;bar.setAttribute('aria-label',job.label+' 진행');box.append(el('strong','',job.label),bar,label,actionButton('작업 취소','WORLD_WORK_CANCEL'));document.querySelector('.content')?.prepend(box);
 const tick=()=>{if(!game?.s.worldJob||game.s.worldJob.id!==job.id)return;const elapsed=Math.max(0,(globalThis.CRPGOnline?.active?CRPGOnline.now():Date.now())-job.startedAt);bar.value=Math.min(elapsed,job.duration);label.textContent=Math.max(0,Math.ceil((job.duration-elapsed)/1000))+'초 남음';if(elapsed>=job.duration&&!busy){act('WORLD_WORK_FINISH',{job:job.id});return;}worldUITimer=setTimeout(tick,100);};tick();
}
const journeyRender=render;
render=function(){journeyRender();updateWorldUI();};
// 0.16.32 신의 눈동자 「공명」 (TODO 4-6): the corner of the map glows when oculi are left in this region, stronger the closer the
// nearest is (runtime_geo_oculi.js resonanceView; where is never said). Here, the mark is a button: a short game where the
// oculus floats about and is caught with three touches within ten seconds; then it is collected (OCULUS_RESONANCE).
const RESONANCE_WORDS=['희미한 공명','공명이 느껴진다','공명이 강해진다','여기서 울린다!'];
function resonanceIcon(item){const path=typeof MANIFEST!=='undefined'?MANIFEST.itemIcons?.icons?.[item]?.path:null;if(path){const i=el('img','resonance-icon');i.src=path;i.alt='';i.draggable=false;return i;}return el('span','resonance-icon mark','◈');}
function resonanceMark(){
 const frame=document.querySelector('.shell-loc-main .terrain-frame');if(!frame||!game||game.s.runtime||game.s.placeVisit)return;
 frame.querySelector('.resonance-mark')?.remove();
 let v=null;try{v=game.resonanceView?.();}catch{}if(!v)return;
 const here=v.level===3,mark=el(here?'button':'div','resonance-mark lv'+v.level);if(here){mark.type='button';mark.onclick=()=>catchGame(v);}
 mark.title='신의 눈동자 공명 · '+RESONANCE_WORDS[v.level]+' · 이 지역에 남은 눈동자 '+v.left+'개'+(here?' · 눌러서 잡기':' · 가까이 갈수록 강해집니다');mark.setAttribute('aria-label',mark.title);
 // 0.16.39 (user: 「눈동자 저거 뭐야...」 — it sat over the map's corner, on the names and the travel bar): one chip in the map's
 // own button row that says what it is — 「신의 눈동자 · 공명이 강해진다」, and 「신의 눈동자 잡기」 when it is right here.
 const words=el('span','resonance-words');words.append(el('b','resonance-name','신의 눈동자'),el('small','',here?'잡기':RESONANCE_WORDS[v.level]));
 mark.append(resonanceIcon(v.item),words);
 const bar=frame.querySelector(':scope>.terrain-controls');(bar||frame).append(mark);
 // drawn before the map's button row: it moves there on the next frame
 if(!bar)requestAnimationFrame(()=>{const later=frame.querySelector(':scope>.terrain-controls');if(later&&mark.isConnected&&mark.parentElement!==later)later.append(mark);});
}
function catchGame(v){
 if(game.actionReason('OCULUS_RESONANCE',{point:v.point})){window.CRPGShell?.toast?.(game.actionReason('OCULUS_RESONANCE',{point:v.point}));return;}
 const box=el('div','resonance-game'),field=el('div','resonance-field'),orb=el('button','resonance-orb'),dots=el('div','resonance-dots'),bar=el('div','resonance-time'),fill=el('i');
 orb.type='button';orb.setAttribute('aria-label','눈동자 잡기');orb.append(resonanceIcon(v.item));bar.append(fill);
 // 0.16.41 (user: 「눈동자 시스템 좋긴 한데 리월은 좀 더 난이도 있게 해주고」): in Liyue the oculus hides among the rocks — a smaller
 // light, five touches in the same ten seconds, and it jumps away sooner (0.65 s instead of 0.9 s). Mondstadt stays as it was.
 const hard=document.body.dataset.region==='liyue'||/^MAP_(LY|LIYUE)/.test(String(game?.s?.global?.CURRENT_MAP_ID||''));
 const NEED=hard?5:3,TIME=10000,JUMP=hard?650:900;let hits=0,over=false,start=performance.now(),move=0;if(hard)box.classList.add('hard');
 const drawDots=()=>{dots.replaceChildren(...Array.from({length:NEED},(_,i)=>el('span',i<hits?'on':'')));};
 const place=()=>{const size=orb.offsetWidth||54,w=field.clientWidth-size,h=field.clientHeight-size;orb.style.left=Math.max(0,Math.random()*w)+'px';orb.style.top=Math.max(0,Math.random()*h)+'px';};
 const end=async win=>{if(over)return;over=true;clearInterval(move);
  if(!win){box.classList.add('missed');box.querySelector('.resonance-note').textContent='눈동자가 바람에 흩어졌다 · 다시 해 보세요';const again=button('다시',()=>{document.getElementById('modal')?.close();catchGame(game.resonanceView?.()||v);},false,true);box.append(again);try{window.CRPGSound?.play('error');}catch{}return;}
  try{window.CRPGSound?.play('chest_reward');}catch{}document.getElementById('modal')?.close();await act('OCULUS_RESONANCE',{point:v.point});};
 orb.onclick=()=>{if(over)return;hits++;drawDots();try{window.CRPGSound?.play('tab');}catch{}if(hits>=NEED){end(true);return;}place();};
 field.append(orb);box.append(el('p','resonance-note',v.title||(hard?'눈동자가 바위 틈을 옮겨 다니며 숨는다':'눈동자가 바람을 타고 떠다닌다')),field,dots,bar);drawDots();
 showModal('신의 눈동자 · 공명',box);requestAnimationFrame(place);
 move=setInterval(()=>{if(over)return;const t=performance.now()-start;fill.style.width=Math.max(0,100-t/TIME*100)+'%';if(t>=TIME){end(false);return;}if(Math.floor(t/JUMP)!==Math.floor((t-60)/JUMP))place();},60);
 document.getElementById('modal')?.addEventListener('close',()=>{if(!over){over=true;clearInterval(move);}},{once:true});
 try{window.CRPGSound?.play('chest_appear');}catch{}
}
{const prior=render;render=function(...args){const out=prior.apply(this,args);try{requestAnimationFrame(resonanceMark);}catch(e){console.warn('resonance',e);}return out;};}

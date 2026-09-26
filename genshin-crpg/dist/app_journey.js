/* Travel objectives, local discoveries and timed work. */
const journeyDisplayText=displayText;
displayText=function(value){
 const name=game?.s.global.PLAYER_NAME||'',last=Array.from(name).pop()||'',code=last.charCodeAt(0),tail=code>=0xac00&&code<=0xd7a3?(code-0xac00)%28:null;
 const consonant=tail!==null?tail!==0:/[013678lmn]$/i.test(last),rieul=tail===8||/[178l]$/i.test(last);
 const pairs={'은':['은','는'],'는':['은','는'],'이':['이','가'],'가':['이','가'],'을':['을','를'],'를':['을','를'],'과':['과','와'],'와':['과','와'],'이야':['이야','야'],'야':['이야','야'],'이라는':['이라는','라는'],'라는':['이라는','라는'],'으로':['으로','로'],'로':['으로','로']};
 const text=String(value||'').replace(/\{PLAYER_NAME\}(이라는|라는|으로|이야|은|는|이|가|을|를|과|와|야|로)(?=$|[\s,.!?…'"”’」]|[가-힣])/g,(_,p)=>name+pairs[p][p==='으로'||p==='로'?(!consonant||rieul?1:0):consonant?0:1]);
 return journeyDisplayText(text);
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
 const points=game.oculusEntries().filter(p=>p.method!=='HIDDEN'||game.oculusProgress(p.id)>0);if(!points.length)return;const section=el('section','world-discoveries');section.append(el('h2','','주변의 작은 단서'));
 for(const p of points){const c=el('section','card discovery-card');c.append(el('h3','',p.title),el('p','',p.clue),...(p.context?[el('p','discovery-context',p.context)]:[]));if(p.reason)c.append(el('p','choice-note',p.reason));const step=p.step;if(!step)continue;
 if(step.cost?.items){const required=Object.entries(step.cost.items).map(([id,n])=>safeName('14_ITEM_DB',id)+' '+n+'개 (보유 '+game.itemCount(id)+')').join(' · ');c.append(el('p','discovery-cost','교환 재료 · '+required),el('small','muted','건네기 버튼을 눌렀을 때만 재료를 소비합니다. 준비해서 나중에 돌아와도 됩니다.'));} const args={kind:'OCULUS',point:p.id};
 if(step.options){for(const [i,label]of step.options.entries())c.append(actionButton(label,'WORLD_WORK_START',{...args,answer:i}));}
 else if(step.sequence){let seq=[];const input=el('div','row'),answer=el('p','sequence-input','선택한 순서: —');const labels=step.sequenceLabels||{LEAF:'잎',TREE:'나무',SKY:'하늘'};for(const [id,label]of Object.entries(labels))input.append(button(label,()=>{if(seq.length<3){seq.push(id);answer.textContent='선택한 순서: '+seq.map(s=>labels[s]).join(' → ');}}));input.append(button('지우기',()=>{seq=[];answer.textContent='선택한 순서: —';}));c.append(answer,input,button('풍경 울리기',()=>act('WORLD_WORK_START',{...args,sequence:seq}),busy||!!p.reason,true));}
 else{const button=actionButton(step.label+(step.duration?' · '+step.duration/1000+'초':''),'WORLD_WORK_START',args);button.disabled=button.disabled||!!p.reason;c.append(button);}
 section.append(c);
 }parent.append(section);
}
const journeyLocation=drawLocation;
drawLocation=function(p,v){journeyLocation(p,v);if(game.needsRecovery())return;const m=CRPGWorldContent.newMaps.find(m=>m.id===v.map[0]);if(m){p.prepend(el('p','map-breadcrumb','몬드 / '+(m.theme.startsWith('DRAGONSPINE')?'드래곤 스파인 / ':'')+m.name));p.append(el('p','muted',m.description));}discoveryCards(p);};
const journeyShop=shop;
shop=function(p,v){journeyShop(p,v);discoveryCards(p);};
const journeyCommissionCard=commissionCard;
commissionCard=function(parent,q,guild=false){if(q.row[0]!==CRPGWorldContent.letterCommission.quest||!q.accepted||q.state?.claimed||q.state?.node==='READY_TO_CLAIM'){journeyCommissionCard(parent,q,guild);return;}
 const c=el('section','card commission-card'),stage=game.letterStage();c.append(el('small','eyebrow','진행 중 · 성문 우편물'),el('h3','',q.row[1]),el('p','','편지 수집 → 주소 정리 → 캐서린에게 전달'));if(stage){c.append(el('p','',stage.label+(stage.duration?' · '+stage.duration/1000+'초':'')),actionButton(stage.label,'WORLD_WORK_START',{kind:'COMMISSION',quest:q.row[0]},true));if(stage.requiresPlace&&!game.atGuild()){const k=game.placeCatalog().find(e=>e.entity==='NPC_MOND_KATHERYNE');if(k)c.append(actionButton('캐서린에게 찾아가기','PLACE_ENTER',{place:k.id}));}}rewardPreview(c,q.reward);parent.append(c);
};
const journeyDialogue=dialogue;
dialogue=function(p,v){journeyDialogue(p,v);if(!game.atGuild())return;const w=game.s.worldProgress,c=el('section','card guild-training');c.append(el('h2','','주인공 무술 숙련 '+w.mastery+' / 2'),el('p','','기본공격 피해 단계당 +30% · 필요한 레벨 '+(3+w.mastery*2)));if(w.mastery<2)c.append(el('p','',100*(w.mastery+1)+' 모라 · 철광석 '+3*(w.mastery+1)+'개'),actionButton('다음 무술 숙련 배우기','MASTERY',{},true));p.append(c);
};
const journeyBattlePrepare=battlePrepare;
battlePrepare=function(p){journeyBattlePrepare(p);if(!game.s.battlePreparation)return;p.append(actionButton('지금은 물러나서 더 준비하기','PREP_LEAVE'));/* Boss advice is intentionally omitted; technical status remains in the boss panel. */};
let worldUITimer=null;
function updateWorldUI(){
 clearTimeout(worldUITimer);document.getElementById('world-work-status')?.remove();const job=game?.s.worldJob;if(!job)return;
 const box=el('section','life-work-status world-work-status');box.id='world-work-status';box.setAttribute('role','status');const bar=el('progress'),label=el('span');bar.max=job.duration;bar.setAttribute('aria-label',job.label+' 진행');box.append(el('strong','',job.label),bar,label,actionButton('작업 취소','WORLD_WORK_CANCEL'));document.querySelector('.content')?.prepend(box);
 const tick=()=>{if(!game?.s.worldJob||game.s.worldJob.id!==job.id)return;const elapsed=Math.max(0,Date.now()-job.startedAt);bar.value=Math.min(elapsed,job.duration);label.textContent=Math.max(0,Math.ceil((job.duration-elapsed)/1000))+'초 남음';if(elapsed>=job.duration&&!busy){act('WORLD_WORK_FINISH',{job:job.id});return;}worldUITimer=setTimeout(tick,100);};tick();
}
const journeyRender=render;
render=function(){journeyRender();updateWorldUI();};

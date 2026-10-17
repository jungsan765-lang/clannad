/* 0.15.22's three-press window, now only for a job saved with its `minigame` before 0.16.2 (new jobs are resource scenes,
 * app_life_v0162.js). Input log stays local until settlement; rewards are computed again by the server. */
(function(){
'use strict';
const prior=updateLifeUI;let session;
updateLifeUI=function(){
 const j=game?.s.lifeJob;if(!j?.minigame){session=null;return prior();}
 clearTimeout(lifeUITimer);document.getElementById('life-work-status')?.remove();
 if(session?.id!==j.id)session={id:j.id,inputs:[],finishing:false};const s=session;
 const now=()=>Math.max(0,Math.floor((globalThis.CRPGOnline?.active?CRPGOnline.now():Date.now())-j.startedAt));
 const box=el('section','life-mini');box.id='life-work-status';box.setAttribute('aria-label','생활 미니게임');
 const title=el('h2','',''),help=el('p',''),track=el('div','life-mini-track'),zone=el('i','life-mini-zone'),cursor=el('i','life-mini-cursor'),result=el('p',''),buttons=el('div','life-mini-buttons');track.append(zone,cursor);
 let round=-1;
 for(let i=0;i<(j.kind==='GATHER'?4:1);i++){const b=button(j.kind==='GATHER'?String(i+1):j.kind==='MINE'?'내려치기':'겨누고 놓기',()=>{
  // The press's own moment picks its round: a press just after a window closed no longer lands in it (it froze the loop).
  const at=now(),r=Math.floor((at-500)/3000);if(r<0||r>2||at-(500+3000*r)>=2800||s.inputs.some(x=>x.round===r))return;s.inputs.push({round:r,at,choice:i});draw();});b.dataset.choice=i;buttons.append(b);}
 box.append(title,help,track,buttons,result,actionButton('작업 취소','LIFE_CANCEL'));document.querySelector('.content')?.prepend(box);
 function draw(){if(!box.isConnected||game?.s.lifeJob?.id!==j.id)return;const at=now();round=Math.floor((at-500)/3000);const offset=at-(500+3000*round),active=round>=0&&round<3&&offset<2800,done=s.inputs.some(x=>x.round===round);
 title.textContent=({GATHER:'채집',MINE:'채광',HUNT:'사냥'})[j.kind]+' · '+Math.max(1,Math.min(3,round+1))+' / 3';help.textContent=j.kind==='GATHER'?'이번에 찾을 묶음: '+(active?CRPGRuntime.lifeMinigame.target(j.minigame.seed,round)+1:'준비 중')+'번 · 같은 번호를 눌러 주세요.':'표시가 금색 구간에 들어오면 눌러 주세요.';
 track.hidden=j.kind==='GATHER';cursor.style.left=Math.min(100,Math.max(0,offset/2800*100))+'%';
 for(const b of buttons.children)b.disabled=!active||done||busy||s.finishing;
 let outcome;try{outcome=CRPGRuntime.lifeMinigame.simulate(j,s.inputs,Math.min(at,j.duration));}catch{outcome={hits:0};}result.textContent=outcome.hits+'회 성공 · 2회 이상 성공하면 채취 · '+Math.max(0,Math.ceil((j.duration-at)/1000))+'초';
 if(at>=j.duration&&!busy&&!s.finishing){s.finishing=true;act('LIFE_FINISH',{job:j.id,inputs:s.inputs,elapsed:j.duration}).then(r=>{if(!r?.ok){s.finishing=false;lifeUITimer=setTimeout(draw,500);}});return;}lifeUITimer=setTimeout(draw,35);
 }draw();
};
})();

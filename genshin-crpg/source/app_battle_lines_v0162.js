/* 0.16.2: a line spoken during a story fight (runtime_battle_lines_v0162.js) shows as a subtitle with the speaker's face when
   the playback reaches it, like the original's boss fights (user: 「드발린 스토리상에서 전투도중에 대사가 있다거나 … 그런거
   괜찮은거같던데」). The fight does not wait: the line holds for its beat and fades. */
(function(){
'use strict';
if(typeof GameEffects==='undefined')return;
let node=null,timer=0;
const speed=()=>{try{return Number(typeof settings!=='undefined'&&settings.combatSpeed)||1;}catch{return 1;}};
function face(id){
 try{if(!id)return null;const src=String(id).startsWith('PROFILE_')?(typeof portraitFor==='function'?portraitFor(id):null):(typeof MANIFEST!=='undefined'?MANIFEST:{}).uiAssets?.avatars?.[id]?.path;
  if(!src)return null;const img=document.createElement('img');img.className='battle-line-face';img.src=src;img.alt='';img.draggable=false;img.decoding='async';return img;}catch{return null;}
}
function hide(){clearTimeout(timer);const n=node;node=null;if(!n)return;n.classList.add('leaving');setTimeout(()=>n.remove(),260);}
function show(frame){
 hide();const box=document.createElement('div');box.className='battle-line';box.setAttribute('role','status');box.setAttribute('aria-live','polite');
 const pic=face(frame.face);if(pic)box.append(pic);else box.classList.add('no-face');
 const copy=document.createElement('div'),who=document.createElement('b'),what=document.createElement('span');copy.className='battle-line-copy';who.textContent=frame.speaker||'';what.textContent=frame.label||'';copy.append(who,what);box.append(copy);
 // Above the playback band when it is there.
 const dock=document.querySelector('.combat-playback');if(dock){const r=dock.getBoundingClientRect();if(r.height)box.style.bottom=Math.max(10,Math.round(innerHeight-r.top+10))+'px';}
 document.body.append(box);node=box;timer=setTimeout(hide,Math.round(1400/speed())+900);
}
const priorShow=GameEffects.show;
GameEffects.show=function(event,...rest){if(event?.kind==='line'){show(event);return;}return priorShow.call(this,event,...rest);};
const priorCancel=GameEffects.cancel;
GameEffects.cancel=function(...args){hide();return priorCancel.apply(this,args);};
window.CRPGBattleLines={show,hide};
})();

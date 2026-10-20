/* 0.16.68 이야기 분위기와 강조 (the user's workbench notes, 2026-10-19: at the dead in 서풍 매의 사당 「여기서 천천히 설명을 진행하면서
 * 분위기를 조성. 브금이나 화면 전체를 어둡게 하거나 테두리에 효과같은걸 얹어가면서」, and lines written with **…** for weight).
 * - A line the manuscript marks `@mood 어둠` (Runtime#storyMood) dims the place behind the story and sinks its edges, breathing slowly.
 * - **…** in a story line is shown in bold; everywhere else (history, choices, the line above the choices) the marks are simply left out.
 * - 0.16.68 (user: 「드발린 나오는 장면에서 흔들리는 연출 하면 더 좋을 것 같아」): a line written after `@shake` (Runtime#storyFx 「흔들림」)
 *   shakes the place behind the story and the speaker's picture once, as the ground does when Dvalin passes or lands; the
 *   dialogue box stays still so the words can be read. Not with 「동작 줄이기」 (prefers-reduced-motion).
 * The look only: the words and the story's rules are the manuscript's. */
(function(){
'use strict';
if(typeof story!=='function'||typeof displayText!=='function')return;
const plain=displayText;
displayText=function(value){return String(plain(value)).replace(/\*\*/g,'');};
const style=document.createElement('style');style.id='story-mood-v01668';
style.textContent=
 'body.teyvat.story-mood-dark[data-mode=story] .world-backdrop.shell-lit{filter:brightness(.42) saturate(.5);transition:filter 1.6s ease}'+
 'body.teyvat.story-mood-dark[data-mode=story] .world-backdrop:after{background:linear-gradient(180deg,rgba(4,5,9,.9) 0,rgba(4,5,9,.35) 18%,rgba(4,5,9,.3) 55%,rgba(4,5,9,.92) 100%),radial-gradient(ellipse at 50% 42%,transparent 22%,rgba(2,3,6,.88) 100%);animation:storyMoodBreath 7s ease-in-out infinite}'+
 'body.teyvat.story-mood-dark[data-mode=story] .shell-story-figure .portrait-frame img{filter:brightness(.78) saturate(.8) drop-shadow(0 16px 40px rgba(0,0,0,.55))}'+
 '@keyframes storyMoodBreath{0%,100%{opacity:1}50%{opacity:.84}}'+
 '.story strong.story-strong{font-weight:800;color:#fff3d6;letter-spacing:.01em}'+
 '@media (prefers-reduced-motion:reduce){body.story-mood-dark .world-backdrop:after{animation:none}}'+
 '@keyframes storyShake{0%{translate:0 0}10%{translate:-11px 6px}20%{translate:10px -7px}30%{translate:-9px -4px}40%{translate:8px 6px}52%{translate:-6px 3px}64%{translate:5px -3px}76%{translate:-3px 2px}88%{translate:2px -1px}100%{translate:0 0}}'+
 '@media (prefers-reduced-motion:no-preference){body.teyvat.story-shake[data-mode=story] .world-backdrop{animation:shellDrift 46s ease-in-out infinite alternate,storyShake .85s cubic-bezier(.36,.07,.19,.97) 1}'+
 'body.teyvat.story-shake[data-mode=story] .shell-story-figure{animation:storyShake .85s cubic-bezier(.36,.07,.19,.97) 1}}';
document.head.append(style);
// the bold parts of the raw line, put back on the shown text (which displayText has already cleaned of the marks)
function bold(el,raw){
 const phrases=[...String(raw||'').matchAll(/\*\*(.+?)\*\*/g)].map(m=>displayText(m[1])).filter(Boolean);if(!phrases.length)return;
 const text=el.textContent,parts=[];let i=0;
 for(const ph of phrases){const at=text.indexOf(ph,i);if(at<0)continue;if(at>i)parts.push(text.slice(i,at));const s=document.createElement('strong');s.className='story-strong';s.textContent=ph;parts.push(s);i=at+ph.length;}
 if(!parts.length)return;if(i<text.length)parts.push(text.slice(i));el.replaceChildren(...parts);
}
let shaken=null,shakeTimer=0;
const before=story;
story=function(p,v){
 before(p,v);
 try{
  const n=v?.node,id=v?.choices?.length?v.choices[0]?.[4]:n?.[4],mood=(id&&game?.storyMood?.(id))||'';
  document.body.classList.toggle('story-mood-dark',mood==='어둠');
  // once per line: a screen drawn again for the same line does not shake again
  const fx=(id&&game?.storyFx?.(id))||'';if(fx==='흔들림'&&id!==shaken){shaken=id;document.body.classList.remove('story-shake');void document.body.offsetWidth;document.body.classList.add('story-shake');clearTimeout(shakeTimer);shakeTimer=setTimeout(()=>document.body.classList.remove('story-shake'),900);}
  if(n&&!v.choices?.length){const raw=game.storyDisplayText?.(n)??n[9];for(const el of p.querySelectorAll('p.story:not(.shell-recall)'))bold(el,raw);}
 }catch{}
};
})();
